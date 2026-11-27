import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {receivableStatus,receivableBalance,normalizeSearch} from '../../app/vendas/lib/domain.mjs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const view=source.slice(source.indexOf('function ReceivablesView('));
const filter=view.match(/const filtered = rows\.filter\([^\n]+/)[0];
const records=[['futuro','2026-12-10',0,0],['hoje','2026-11-24',0,0],['atrasado','2026-10-01',0,0],['parcial','2026-10-01',40,0],['quitado','2026-10-01',100,0],['estornado','2026-10-01',0,100]].map(([id,dueDate,received,reversed])=>({id,dueDate,received,reversed,value:100,refunded:0,client:'Cliente',origin:'Pedido 1',method:'PIX'}));
const rowsCode=view.match(/const rows = records\.map\([^\n]+/)[0];
const state={records,receivableStatus,receivableBalance,normalizeSearch,today:'2026-11-24',Math};vm.runInNewContext(rowsCode+'\nresult=rows;',state);const rows=state.result;
const run=(statusFilter,query='')=>{const context={rows,statusFilter,normalizedQuery:normalizeSearch(query),normalizeSearch};vm.runInNewContext(filter+'\nresult=filtered.map(row=>row.record.id);',context);return Array.from(context.result);};
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
