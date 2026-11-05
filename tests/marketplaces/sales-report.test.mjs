import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSalesReport, reportPeriod, reportTotal, toggleReportMonth } from '../../app/modules/marketplaces/sales-report.ts';
const line=(overrides={})=>({date:'2026-10-10T12:00:00Z',provider:'mercado_livre',accountId:'a',warehouseId:'unassigned',gross:12345,units:2,status:'paid',currency:'BRL',...overrides});
const filters={provider:'',accountId:'',warehouseId:''};
test('agrega em centavos e não duplica o total entre meses',()=>{
 const months=aggregateSalesReport([line(),line({gross:55,date:'2026-09-20'})],2026,filters);
 assert.equal(months.length,12);assert.equal(months[9].gross,12345);assert.equal(months[8].gross,55);
 assert.deepEqual(reportTotal(months),{month:0,gross:12400,orders:2,units:4,missingGross:0,pendingCosts:2});
});
test('exclui canceladas, devolvidas, pagamentos pendentes, outra moeda e ano',()=>{
 const rows=['cancelled','partially_refunded','payment_required','payment_in_process','partially_paid','invalid'].map(status=>line({status}));
 rows.push(line({currency:'USD'}),line({date:'2025-01-01'}),line({status:'confirmed'}));
 assert.equal(reportTotal(aggregateSalesReport(rows,2026,filters)).orders,0);
});
test('separa origem histórica desconhecida e estoque real das vendas diretas',()=>{
 const rows=[line(),line({provider:'direct',accountId:'',warehouseId:'stock-a',status:'confirmed',gross:300})];
 assert.equal(reportTotal(aggregateSalesReport(rows,2026,{...filters,warehouseId:'stock-a'})).gross,300);
 assert.equal(reportTotal(aggregateSalesReport(rows,2026,{...filters,warehouseId:'unassigned'})).gross,12345);
 assert.equal(reportTotal(aggregateSalesReport(rows,2026,{...filters,provider:'direct'})).orders,1);
 assert.equal(reportTotal(aggregateSalesReport(rows,2026,{...filters,accountId:'a'})).orders,1);
});
test('custos ausentes permanecem pendentes e bruto ausente não se torna zero confirmado',()=>{
 const total=reportTotal(aggregateSalesReport([line({gross:null}),line({gross:0})],2026,filters));
 assert.equal(total.gross,0);assert.equal(total.missingGross,1);assert.equal(total.pendingCosts,2);
});
test('competência usa São Paulo, incluindo virada do mês/ano; data civil direta não desloca',()=>{
 assert.deepEqual(reportPeriod('2026-01-01T01:00:00Z'),{year:2025,month:12});
 assert.deepEqual(reportPeriod('2026-11-01T02:00:00Z'),{year:2026,month:10});
 assert.deepEqual(reportPeriod('2026-01-01'),{year:2026,month:1});
 assert.equal(reportPeriod('2026-02-30'),null);assert.equal(reportPeriod('invalid'),null);
});
test('mês alterna composição e retorno ao acumulado anual',()=>{
 assert.equal(toggleReportMonth(null,10),10);assert.equal(toggleReportMonth(10,9),9);assert.equal(toggleReportMonth(10,10),null);
});
