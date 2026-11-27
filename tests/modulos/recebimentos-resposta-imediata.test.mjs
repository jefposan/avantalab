import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {parseReceivableSnapshot,RECEIVABLE_SNAPSHOT_TYPE,RECEIVABLE_MOVE_REQUEST_TYPE,RECEIVABLE_MOVE_RESPONSE_TYPE} from '../../app/vendas/lib/commercial-receivable-bridge.mjs';
import {mergeConfirmedReceivables,applyConfirmedOperationPayment,reconcileConfirmedOperationSnapshot} from '../../app/vendas/lib/confirmed-receivable-snapshot.mjs';
const op='30000000-0000-4000-8000-000000000001',id='40000000-0000-4000-8000-000000000001';
const snapshot={ok:true,receivable:{id},operation:{id:op,version:3,payment:{method:'boleto',installments:1,firstDueDate:'2026-11-27'}},receivables:[{id,operationId:op,version:3,method:'boleto',original:100,received:0,refunded:0,balance:100}]};
const source=readFileSync('app/vendas/VendasIntegrado.tsx','utf8');const branch=source.slice(source.indexOf('      if(event.data?.type===RECEIVABLE_MOVE_REQUEST_TYPE){'),source.indexOf("      if (event.data?.type === STOCK_MOVE_REQUEST_TYPE)"));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};const flush=()=>new Promise(setImmediate);
function setup(payload=snapshot){
 const post=deferred(),messages=[],reloads=[];const destination={postMessage:m=>messages.push(m)};
 const context={exports:{},event:{data:{type:RECEIVABLE_MOVE_REQUEST_TYPE,requestId:'terms:request',operationType:'alterar_condicoes',receivableId:id}},RECEIVABLE_MOVE_REQUEST_TYPE,RECEIVABLE_MOVE_RESPONSE_TYPE,RECEIVABLE_SNAPSHOT_TYPE,parseReceivableSnapshot,URLSearchParams,empresaId:'company',origemPrototipo:'origin',requestIdValido:()=>true,iframeRef:{current:{contentWindow:destination}},activeCompanyRef:{current:'company'},recebimentosGenerationRef:{current:4},supabase:{auth:{getSession:async()=>({data:{session:{access_token:'session'}}})}},fetch:()=>post.promise,carregarRecebimentos:()=>{reloads.push('receivables');return new Promise(()=>{});},carregarOperacoes:()=>{reloads.push('orders');return new Promise(()=>{});}};
 vm.runInNewContext(ts.transpileModule('exports.run=()=>{'+branch+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 return {context,messages,reloads,start:async()=>{context.exports.run();await flush();},confirm:async()=>{post.resolve({ok:payload.ok,json:async()=>payload});await flush();}};
}
test('confirma após o POST sem esperar duas recargas; publica os dados antes de fechar o diálogo',async()=>{
 const f=setup();await f.start();assert.equal(f.messages.length,0,'não simula sucesso antes de o servidor confirmar');
 await f.confirm();assert.deepEqual(f.reloads,[]);assert.equal(f.messages.length,2);assert.equal(f.messages[0].scope,'operation');assert.equal(f.messages[0].records[0].method,'boleto');assert.equal(f.messages[1].ok,true);assert.equal(f.messages[1].type,RECEIVABLE_MOVE_RESPONSE_TYPE);assert.equal(f.context.recebimentosGenerationRef.current,5,'invalida consultas antigas');
});
test('erro do POST não altera dados nem anuncia sucesso; troca de empresa descarta retorno',async()=>{
 const fail=setup({ok:false,message:'Versão alterada'});await fail.start();await fail.confirm();assert.equal(fail.messages.length,1);assert.equal(fail.messages[0].ok,false);assert.deepEqual(fail.reloads,[]);
 const moved=setup();await moved.start();moved.context.activeCompanyRef.current='other';await moved.confirm();assert.equal(moved.messages.length,0);
});
test('compatibilidade com servidor anterior inicia as duas consultas em paralelo',async()=>{
 const f=setup({ok:true,receivable:{id}});await f.start();await f.confirm();assert.deepEqual(f.reloads,['receivables','orders']);assert.equal(f.messages.length,0,'não confirma enquanto os dados antigos não forem recarregados');
});
test('retratos parciais recusam linhas de outra operação e versões inválidas',()=>{
 const data={type:RECEIVABLE_SNAPSHOT_TYPE,ok:true,scope:'operation',operationId:op,operation:snapshot.operation,records:snapshot.receivables};
 assert.ok(parseReceivableSnapshot(data));assert.equal(parseReceivableSnapshot({...data,records:[{...data.records[0],operationId:'30000000-0000-4000-8000-000000000002'}]}),null);assert.equal(parseReceivableSnapshot({...data,operation:{...data.operation,version:0}}),null);assert.equal(parseReceivableSnapshot({...data,records:[]}),null);
});
test('atualiza somente a operação confirmada e não regride versões ou consultas iniciadas antes',()=>{
 const record={id,persistence:{operationId:op,version:2},method:'PIX'},other={id:'other',persistence:{operationId:'other',version:7},method:'PIX'},incoming={...record,persistence:{operationId:op,version:3},method:'Boleto'};
 const result=mergeConfirmedReceivables([record,other],[incoming],op);assert.equal(result[0].method,'Boleto');assert.equal(result[1],other);assert.equal(mergeConfirmedReceivables([other,record],[incoming],op)[0],other,'preserva a posição e as demais operações');assert.equal(mergeConfirmedReceivables(result,[record],op),result);
 const order={id:'2026/1',persistence:{operationId:op,version:2},order:{paymentMethod:'pix',total:100,stockState:'Baixado'}};
 const updated=applyConfirmedOperationPayment([order],snapshot.operation);assert.equal(updated[0].order.paymentMethod,'boleto');assert.equal(updated[0].order.stockState,'Baixado');assert.equal(updated[0].persistence.version,3);
 assert.equal(reconcileConfirmedOperationSnapshot([], [order], [snapshot.operation])[0].order.paymentMethod,'boleto','confirmação anterior à carga inicial permanece aplicada');
 assert.equal(reconcileConfirmedOperationSnapshot(updated,[order],[])[0],updated[0],'consulta tardia não regride pedido já confirmado');
});

test('ponte real da tela aplica confirmação parcial sem apagar outros recebimentos',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');const start=source.indexOf('      const receivableSnapshot=parseReceivableSnapshot(event.data);');const snippet=source.slice(start,source.indexOf('      const receivableMove=',start));
 let rows=[{id:'other',origin:'Pedido de outra operação',persistence:{operationId:'other',version:1}}],orders=[{id:'2026/18',persistence:{operationId:op,version:2},order:{paymentMethod:'pix',stockState:'Baixado'}}];
 const context={exports:{},event:{data:{type:RECEIVABLE_SNAPSHOT_TYPE,ok:true,scope:'operation',operationId:op,operation:snapshot.operation,records:snapshot.receivables}},parseReceivableSnapshot,paymentMethodLabel:value=>({boleto:'Boleto'})[value]||value,mergeConfirmedReceivables,applyConfirmedOperationPayment,confirmedPaymentsRef:{current:new Map()},setFinancialState(){},setToast(){},setReceivableRecords:value=>rows=typeof value==='function'?value(rows):value,setCreated:fn=>orders=fn(orders)};
 vm.runInNewContext(ts.transpileModule('exports.apply=()=>{'+snippet+'};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);context.exports.apply();
 assert.equal(rows.length,2);assert.equal(rows.find(r=>r.id===id).method,'Boleto');assert.equal(rows.find(r=>r.id===id).persistence.version,3);assert.equal(orders[0].order.paymentMethod,'boleto');assert.equal(orders[0].order.stockState,'Baixado');
});
