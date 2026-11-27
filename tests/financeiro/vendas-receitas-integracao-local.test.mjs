import test from 'node:test';import assert from 'node:assert/strict';
import {projectLocalRevenue,mergeLocalRevenueEntries,mergeLocalRevenueTotals} from '../../app/vendas/lib/local-revenue-overlay.mjs';
const companyId='10000000-0000-4000-8000-000000000001';
const op=(id,status,total,date,type='pedido')=>({id,companyId,type,status,total,deliverySnapshot:{orderDate:date},createdAt:'2026-01-01T02:30:00Z'});
test('projeção da Gestão local: competência, centavos, exclusão de cancelados e empresa',()=>{
 const operations=[op('1','faturado',100.01,'2026-11-02'),op('2','faturado',50.02,'2026-11-30'),op('3','cancelado',999,'2026-11-03'),op('4','concluido',75,'2026-11-04','ordem_servico'),op('5','rascunho',555,'2026-11-05'),op('6','faturado',32,'2025-12-31'),op('7','faturado',5,'')];
 const entries=projectLocalRevenue({operations,companyId,year:2026,enabled:true});assert.equal(entries.length,1);assert.equal(entries[0].valor,225.03);assert.equal(entries[0].mes,'NOVEMBRO');assert.equal(entries[0].dia,30);assert.equal(entries[0].origem,'Venda Avantalab');
 assert.equal(projectLocalRevenue({operations,companyId,year:2025,enabled:true})[0].valor,37);
 assert.deepEqual(projectLocalRevenue({operations,companyId,year:2026,enabled:false}),[]);
 assert.throws(()=>projectLocalRevenue({operations:[{...operations[0],companyId:'outra'}],companyId,year:2026,enabled:true}));
 const previous=[{id:'manual',mes:'NOVEMBRO',valor:20,tipo_obs:null},{id:'anterior',mes:'NOVEMBRO',valor:10,tipo_obs:'vendas_servicos_sistema'}];
 const merged=mergeLocalRevenueEntries(previous,entries,companyId,2026);assert.equal(merged.length,2);assert.equal(merged.reduce((a,b)=>a+Number(b.valor),0),245.03);assert.equal(merged[0].id,'manual');
 const totals=mergeLocalRevenueTotals([{mes:'NOVEMBRO',valor:30}],previous.slice(1),entries);assert.equal(totals[0].valor,245.03);
 assert.equal(mergeLocalRevenueTotals(totals,entries,entries)[0].valor,245.03,'repetir não duplica');
 assert.deepEqual(mergeLocalRevenueEntries(previous,entries,companyId,2026,'outro-centro'),previous.slice(0,1),'receita sem centro não invade centro específico');
});
