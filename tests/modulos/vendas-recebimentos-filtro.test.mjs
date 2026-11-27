import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {receivableStatus,receivableBalance,normalizeSearch} from '../../app/vendas/lib/domain.mjs';
import {paymentMethodKey} from '../../app/vendas/lib/payment-methods.mjs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const view=source.slice(source.indexOf('function ReceivablesView('));
const filter=view.match(/const filtered = rows\.filter\([^\n]+/)[0];
const records=[['futuro','2026-12-10',0,0],['hoje','2026-11-24',0,0],['atrasado','2026-10-01',0,0],['parcial','2026-10-01',40,0],['quitado','2026-10-01',100,0],['estornado','2026-10-01',0,100]].map(([id,dueDate,received,reversed])=>({id,dueDate,received,reversed,value:100,refunded:0,client:'Cliente',origin:'Pedido 1',method:'PIX'}));
const rowsCode=view.match(/const rows = records\.map\([^\n]+/)[0];
const state={records,receivableStatus,receivableBalance,normalizeSearch,today:'2026-11-24',Math};vm.runInNewContext(rowsCode+'\nresult=rows;',state);const rows=state.result;
const run=(statusFilter,query='',paymentFilter='Todas as formas')=>{const context={rows,statusFilter,paymentFilter,normalizedQuery:normalizeSearch(query),normalizeSearch,paymentMethodKey};vm.runInNewContext(filter+'\nresult=filtered.map(row=>row.record.id);',context);return Array.from(context.result);};
test('Em aberto inclui futuro, hoje, vencido e parcial; exclui quitado e estornado',()=>assert.deepEqual(run('Em aberto'),['futuro','hoje','atrasado','parcial']));
test('filtro específico e busca mantêm o recorte escolhido',()=>{assert.deepEqual(run('Atrasado'),['atrasado']);assert.deepEqual(run('Em aberto','parcial'),['parcial']);assert.equal(run('Todas as situações').length,5);});

test('estorno sai da lista e novo faturamento aparece aberto sem herdar situação antiga',()=>{
 const old=records.find(r=>r.id==='estornado');const next={...old,id:'nova-parcela',reversed:0,dueDate:'2026-12-10'};
 const pending={...old,id:'estorno-pendente',received:10,status:'cancelado'};
 const canceled={...next,id:'cancelada-servidor',status:'cancelado'};
 const context={records:[old,next,pending,canceled],receivableStatus,receivableBalance,normalizeSearch,today:'2026-11-24',Math};
 vm.runInNewContext(rowsCode+'\nresult=rows;',context);
 assert.deepEqual(Array.from(context.result,r=>[r.record.id,r.status]),[['nova-parcela','Em aberto'],['estorno-pendente','Estorno pendente']]);
 assert.ok(!view.slice(0,view.indexOf('type ReportId')).includes('<option>Estornado</option>'));
});


test('consignado convertido permanece visível com saldo disponível para pagamento, sem atraso',()=>{
 const record={...records[0],id:'convertido',method:'Consignado',status:'aberto',dueDate:'2020-01-01'};
 const context={records:[record],receivableStatus,receivableBalance,normalizeSearch,today:'2026-11-26',Math};
 vm.runInNewContext(rowsCode+'\nresult=rows;',context);
 assert.equal(context.result.length,1);
 assert.equal(context.result[0].status,'Consignado');
 assert.equal(context.result[0].balance,100);
 const runFilter=statusFilter=>{const state={rows:context.result,statusFilter,paymentFilter:'Todas as formas',normalizedQuery:'',normalizeSearch,paymentMethodKey};vm.runInNewContext(filter+'\nresult=filtered;',state);return state.result.length;};
 assert.equal(runFilter('Todas as situações'),1);
 assert.equal(runFilter('Consignado'),1);
 assert.equal(runFilter('Em aberto'),1);
 assert.equal(runFilter('Atrasado'),0);
});


test('forma de pagamento combina com situação e busca sem alterar os registros',()=>{
 const sample=[{...records[0],method:'PIX'}, {...records[2],method:'Boleto'}, {...records[3],method:'Cartão'}, {...records[0],id:'consignado',method:'Consignado'}];
 const context={records:sample,receivableStatus,receivableBalance,normalizeSearch,today:'2026-11-24',Math};
 vm.runInNewContext(rowsCode+'\nresult=rows;',context);
 const run=(statusFilter,paymentFilter,query='')=>{const state={rows:context.result,statusFilter,paymentFilter,normalizedQuery:normalizeSearch(query),normalizeSearch,paymentMethodKey};vm.runInNewContext(filter+'\nresult=filtered.map(r=>r.record.id);',state);return Array.from(state.result);};
 assert.deepEqual(run('Em aberto','boleto'),['atrasado']);
 assert.deepEqual(run('Atrasado','pix'),[]);
 assert.deepEqual(run('Em aberto','cartao','PARCIAL'),['parcial']);
 assert.deepEqual(run('Em aberto','consignado'),['consignado']);
 assert.deepEqual(run('Todas as situações','Todas as formas'),['futuro','atrasado','parcial','consignado']);
 assert.equal(sample[0].received,0);
});
