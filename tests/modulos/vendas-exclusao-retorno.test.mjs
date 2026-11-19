import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/vendas/VendasIntegrado.tsx','utf8');
const constants=Object.fromEntries([...source.matchAll(/const (\w+TYPE) = '([^']+)'/g)].map(m=>[m[1],m[2]]));
for(const name of ['COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE','COMMERCIAL_SERVICE_WORKFLOW_RESPONSE_TYPE','COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE','COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE'])constants[name]=name;
const companyId='10000000-0000-4000-8000-000000000001',draftId='20000000-0000-4000-8000-000000000001';
function handler({ok=true,message='Bloqueado',token='sessao-teste',network=false}={}) {
 const body=source.match(/const responder = async \(\) => \{([\s\S]*?)\n      \};\n      void responder\(\);/)[1];
 const posted=[],calls=[],refreshed=[];
 const context={...constants,exports:{},URLSearchParams,UUID_PATTERN:/^[0-9a-f-]{36}$/i,requestIdValido:()=>true,
  empresaId:companyId,origemPrototipo:'https://avantalab.test',event:{data:{type:constants.FISCAL_DELETE_REQUEST_TYPE,requestId:'delete:1',draftId,expectedVersion:2}},
  iframeRef:{current:{contentWindow:{postMessage:(...args)=>posted.push(args)}}},supabase:{auth:{getSession:async()=>({data:{session:token?{access_token:token}:null}})}},
  fetch:async(url,options)=>{calls.push({url,options});if(network)throw Error('falha');return{ok,json:async()=>({ok,message})};},
  carregarDocumentosFiscais:async(...args)=>refreshed.push(args)};
 vm.runInNewContext(ts.transpileModule(`exports.run=async()=>{${body}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 return{context,posted,calls,refreshed,run:context.exports.run};
}
test('confirmação de excluir responde como exclusão e atualiza a lista autenticada',async()=>{
 const f=handler();await f.run();assert.equal(f.posted[0][0].type,constants.FISCAL_DELETE_RESPONSE_TYPE);assert.equal(f.posted[0][0].draftId,draftId);assert.equal(f.posted[0][0].ok,true);
 assert.equal(f.calls.length,1);assert.match(f.calls[0].url,new RegExp(`/drafts/${draftId}/delete\\?companyId=${companyId}`));
 assert.equal(f.calls[0].options.headers.Authorization,'Bearer sessao-teste');assert.deepEqual(JSON.parse(f.calls[0].options.body),{expectedVersion:2,confirmation:'EXCLUIR_RASCUNHO_NFE'});assert.equal(f.refreshed.length,1);
});
test('recusa fiscal mantém erro no canal de exclusão sem atualizar a lista',async()=>{
 const f=handler({ok:false,message:'Nota autorizada não pode ser excluída'});await f.run();assert.equal(f.posted[0][0].type,constants.FISCAL_DELETE_RESPONSE_TYPE);assert.equal(f.posted[0][0].ok,false);assert.match(f.posted[0][0].message,/autorizada/);assert.equal(f.refreshed.length,0);
});
test('sessão ausente e conexão interrompida respondem à confirmação correta',async()=>{
 for(const options of [{token:''},{network:true}]){const f=handler(options);await f.run();assert.equal(f.posted[0][0].type,constants.FISCAL_DELETE_RESPONSE_TYPE);assert.equal(f.posted[0][0].ok,false);assert.equal(f.refreshed.length,0);if(!options.token&&!options.network)assert.equal(f.calls.length,0);}
});
test('botão informa espera, bloqueia envio duplicado e libera após timeout',()=>{
 const ui=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 const body=ui.match(/const requestDraftDelete = \(draft: FiscalDraftRecord\) => \{([\s\S]*?)\n  \};/)[1];
 const sent=[],states=[],messages=[],pending=new Map();let timeout;
 const context={exports:{},pendingFiscalRequestsRef:{current:pending},fiscalBridgeOrigin:'https://avantalab.test',setDeletingDraftId:id=>states.push(id),setFiscalBridgeMessage:message=>messages.push(message),nextFiscalRequestId:()=> 'delete:1',remoteStatuses:{},window:{setTimeout:fn=>{timeout=fn;return 1;},parent:{postMessage:(...args)=>sent.push(args)}}};
 vm.runInNewContext(ts.transpileModule(`exports.click=(draft)=>{${body}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 context.exports.click({id:draftId});context.exports.click({id:draftId});assert.equal(sent.length,1);assert.equal(states[0],draftId);assert.equal(pending.size,1);
 timeout();assert.equal(pending.size,0);assert.equal(states.at(-1),'');assert.match(messages.at(-1),/Atualize a lista/);
 assert.match(ui,/deletingDraftId\?'Excluindo…':'Excluir rascunho'/);
});
test('retorno confirmado fecha a confirmação; recusa ou resposta alheia não fecham',()=>{
 const ui=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 const body=ui.match(/(if\(event.data\?\.type==='AVANTALAB_VENDAS_FISCAL_DELETE_RESPONSE_V1'\)\{[\s\S]*?)\n      const correctionResponse/)[1];
 for(const ok of [true,false]){const pending=new Map([['delete:1',{kind:'delete',timer:1,targetId:draftId}]]),closed=[],errors=[],states=[];
 const context={exports:{},pendingFiscalRequestsRef:{current:pending},window:{clearTimeout:()=>{}},setDeletingDraftId:id=>states.push(id),setCancelDraft:value=>closed.push(value),setIssueDraft:()=>{},setResultDraft:()=>{},setFiscalBridgeMessage:value=>errors.push(value)};
 vm.runInNewContext(ts.transpileModule(`exports.receive=(event)=>{${body}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 context.exports.receive({data:{type:constants.FISCAL_DELETE_RESPONSE_TYPE,requestId:'alheio',ok}});assert.equal(pending.size,1);assert.equal(closed.length,0);
 context.exports.receive({data:{type:constants.FISCAL_DELETE_RESPONSE_TYPE,requestId:'delete:1',ok,message:'Proteção fiscal'}});assert.equal(pending.size,0);assert.equal(states.at(-1),'');assert.equal(closed.length,ok?1:0);if(!ok)assert.equal(errors.at(-1),'Proteção fiscal');}
});
