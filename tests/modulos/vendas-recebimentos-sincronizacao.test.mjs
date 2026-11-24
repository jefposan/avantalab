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
  const destination={postMessage:message=>calls.push(message.ok?'success':'failure')};
  const context={exports:{},event:{data:{type:'workflow',target}},COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE:'workflow',requestId:'request',responseType:'response',empresaId:'company',token:'session',origemPrototipo:'origin',URLSearchParams,activeCompanyRef:{current:'company'},iframeRef:{current:{contentWindow:destination}},destination,
    createCommercialOrderWorkflowRequest:value=>value,
    fetch:async()=>({ok:true,json:async()=>({ok:true,order:{fiscalDraftId:'draft',stockIntegrated:true}})}),
    fail:()=>calls.push('failure'),carregarRecebimentos:async()=>{calls.push('financial-start');await financial.promise;calls.push('snapshot');},
    carregarDocumentosFiscais:()=>{calls.push('fiscal');return fiscal.promise;},carregarCatalogo:async()=>calls.push('catalog'),carregarEstoque:async()=>calls.push('stock')};
  vm.runInNewContext(compile(`exports.run=async()=>{${branch}};`),context);
  const running=context.exports.run();
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(calls,['financial-start']);
  financial.resolve();await new Promise(r=>setImmediate(r));
  assert.deepEqual(calls,['financial-start','snapshot','success','fiscal','catalog','stock']);
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
