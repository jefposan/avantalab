import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const draftId='10000000-0000-4000-8000-000000000001';

test('Abrir emissão fiscal abre a preparação na confirmação, sem segundo clique',()=>{
 const start=source.indexOf('      const prepared = parseFiscalPrepareResponse(event.data);');
 const end=source.indexOf('      const validated = parseFiscalValidateResponse(event.data);',start);
 const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const outcome of ['created','reused','failed','mismatch']){
  const opened=[];let drafts=[{id:draftId,events:[]}];
  const prepared={requestId:'prepare:synthetic',ok:outcome!=='failed',message:'Falha simulada',emission:{draftId:outcome==='mismatch'?'outro':draftId,emissionId:'emission:synthetic',environment:'producao',state:'draft',version:1,reused:outcome==='reused'}};
  const pending=new Map([[prepared.requestId,{draftId,timer:1}]]);
  const run=new Function('event','parseFiscalPrepareResponse','pendingFiscalPrepareRef','window','setFiscalPrepareState','setToast','setFiscalDraftRecords','setFiscalResumeId','setView',code);
  run({data:{}},()=>prepared,{current:pending},{clearTimeout(){}},()=>{},()=>{},update=>{drafts=update(drafts);},id=>opened.push(['draft',id]),view=>opened.push(['view',view]));
  assert.equal(pending.size,0);
  if(['created','reused'].includes(outcome)){
   assert.equal(drafts[0].emissionId,'emission:synthetic');
   assert.deepEqual(opened,[['draft',draftId],['view','fiscal']]);
  }else assert.deepEqual(opened,[],'não abre preparação em falha ou resposta de outro documento');
 }
});

test('pedido ainda sem retrato fiscal abre a preparação após persistência confirmada',()=>{
 const start=source.indexOf('      channel.port1.onmessage = (event) => {',source.indexOf('  const preparePersistedFiscalEmission'));
 const end=source.indexOf('\n      window.parent.postMessage',start);
 const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const ok of [true,false]){
  const opened=[];const channel={port1:{close(){}}};
  const run=new Function('channel','window','timer','requestId','STANDALONE_FISCAL_SAVE_RESPONSE_TYPE','draft','setFiscalPrepareState','setFiscalDraftRecords','setFiscalResumeId','setView','setToast',code);
  run(channel,{clearTimeout(){}},1,'save:synthetic','saved',{id:'origin'},()=>{},()=>{},id=>opened.push(id),view=>opened.push(view),()=>{});
  channel.port1.onmessage({data:{type:'saved',requestId:'save:synthetic',ok,draftId}});
  assert.deepEqual(opened,ok?[draftId,'fiscal']:[]);
 }
});
