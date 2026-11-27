import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source=readFileSync('app/vendas/VendasIntegrado.tsx','utf8');
const compile=code=>ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
const branch=source.slice(source.indexOf('          if (event.data.type === COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE) {'),source.indexOf('          if (event.data.type === COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE) {'));

for(const target of ['faturado','cancelado','devolvido','restaurar','estornar_faturamento'])test(`${target}: parcelas confirmadas chegam antes do sucesso, sem aguardar fiscal/estoque`,async()=>{
  const calls=[],financial=deferred(),fiscal=deferred();
  const destination={postMessage:message=>calls.push(message.indicatorsOnly?'indicators':message.ok?'success':'failure')};
  const context={exports:{},event:{data:{type:'workflow',target}},COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE:'workflow',requestId:'request',responseType:'response',empresaId:'company',token:'session',origemPrototipo:'origin',URLSearchParams,activeCompanyRef:{current:'company'},iframeRef:{current:{contentWindow:destination}},destination,
    createCommercialOrderWorkflowRequest:value=>value,
    fetch:async()=>({ok:true,json:async()=>({ok:true,order:{fiscalDraftId:'draft',stockIntegrated:true}})}),
    fail:()=>calls.push('failure'),carregarRecebimentos:async()=>{calls.push('financial-start');await financial.promise;calls.push('snapshot');},
    carregarDocumentosFiscais:()=>{calls.push('fiscal');return fiscal.promise;},carregarCatalogo:async()=>calls.push('catalog'),carregarEstoque:async()=>calls.push('stock')};
  vm.runInNewContext(compile(`exports.run=async()=>{${branch}};`),context);
  const running=context.exports.run();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(calls,['indicators','financial-start']);
  financial.resolve();await new Promise(r=>setImmediate(r));
  assert.deepEqual(calls,['indicators','financial-start','snapshot','success','fiscal','catalog','stock']);
  fiscal.resolve();await running;
});

test('consulta anterior não sobrescreve snapshot novo nem falha apaga lista atualizada',async()=>{
  const loader=source.slice(source.indexOf('  const carregarRecebimentos = useCallback('),source.indexOf('  const carregarEstoque = useCallback('));
  const requests=[],messages=[],destination={postMessage:value=>messages.push(value)};
  const context={exports:{},useCallback:fn=>fn,iframeRef:{current:{contentWindow:destination}},UUID_PATTERN:/^company$/,recebimentosGenerationRef:{current:0},activeCompanyRef:{current:'company'},origemPrototipo:'origin',RECEIVABLE_SNAPSHOT_TYPE:'snapshot',supabase:{auth:{getSession:async()=>({data:{session:{access_token:'session'}}})}},fetchCommercialPages:()=>{const d=deferred();requests.push(d);return d.promise;}};
  vm.runInNewContext(compile(loader+'\nexports.load=carregarRecebimentos;'),context);
  const old=context.exports.load('company');await new Promise(r=>setImmediate(r));
  const latest=context.exports.load('company');await new Promise(r=>setImmediate(r));
  requests[1].resolve([{id:'new-installment'}]);await latest;
  requests[0].resolve([]);await old;
  assert.equal(messages.length,1);
  assert.equal(messages[0].records[0].id,'new-installment');
  const failing=context.exports.load('company');await new Promise(r=>setImmediate(r));
  const newest=context.exports.load('company');await new Promise(r=>setImmediate(r));
  requests[3].resolve([{id:'confirmed-installment'}]);await newest;
  requests[2].reject(new Error('offline'));await failing;
  assert.equal(messages.length,2);
  assert.equal(messages[1].records[0].id,'confirmed-installment');
});

test('indicadores aplicam o retrato confirmado sem liberar a operação ou aguardar consultas',()=>{
 const child=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 const start=child.indexOf('        if(commercial.ok&&commercial.indicatorsOnly){');
 const code=child.slice(start,child.indexOf('        window.clearTimeout(pending.timer);',start));
 for(const [status,stockStatus] of [['faturado','baixado'],['em_separacao','reservado']]){
  let records=[{id:'2026/1',status:'Em separação',persistence:{version:1},order:{stockState:'Sem movimentação'},events:[]}];
  const context={exports:{},commercial:{ok:true,indicatorsOnly:true,customerId:'client',order:{status,stockStatus,operationId:'op',version:2,stockIntegrated:true}},pending:{recordId:'2026/1'},setCreated:fn=>records=fn(records)};
  vm.runInNewContext(compile('exports.apply=()=>{'+code+'};'),context);context.exports.apply();
  assert.equal(records[0].status,status==='faturado'?'Faturado':'Em separação');assert.equal(records[0].order.stockState,stockStatus==='baixado'?'Baixado':'Reservado');assert.equal(records[0].events.length,0);
  records[0].persistence.version=3;const current=records[0];context.exports.apply();assert.equal(records[0],current,'resposta antiga não regride uma versão já confirmada');
 }
});
test('atualizar catálogo após estoque preserva a interface e ignora retorno de outro perfil',async()=>{
 const start=source.indexOf('  const carregarCatalogo = useCallback(');
 const end=source.indexOf('\n  useEffect(',start);
 assert.ok(start>=0&&end>start);
 const response=deferred(),catalogs=[];
 const context={exports:{},URLSearchParams,AbortSignal,useCallback:fn=>fn,catalogoGenerationRef:{current:0},
  activeCompanyRef:{current:'company'},supabase:{auth:{getSession:async()=>({data:{session:{access_token:'session'}}})}},
  fetch:()=>response.promise,setCatalogo:value=>catalogs.push(value),setErroCatalogo(){}};
 vm.runInNewContext(compile(source.slice(start,end)+'\nexports.refresh=carregarCatalogo;'),context);
 const running=context.exports.refresh('company',true);await new Promise(setImmediate);assert.deepEqual(catalogs,[],'não limpa o catálogo durante a consulta');
 response.resolve({ok:true,json:async()=>({catalogo:{items:['new']}})});await running;assert.equal(catalogs.length,1);
 context.activeCompanyRef.current='other';await context.exports.refresh('company',true);assert.equal(catalogs.length,1);
});
