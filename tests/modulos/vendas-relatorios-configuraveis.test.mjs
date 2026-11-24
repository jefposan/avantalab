import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {buildCommercialReport,freshReportFilters,validateReportFilters,REPORT_TYPES} from '../../app/vendas/lib/report-builder.mjs';
import {buildReportExcel,buildReportPdf,formatReportCell} from '../../app/vendas/lib/report-export.ts';
import {PDFDocument} from 'pdf-lib';
const operation=(patch={})=>({id:'2026/1',type:'pedido',client:'Cliente Alfa',customerId:'client-a',createdAt:'2026-10-02T23:00:00Z',invoicedAt:'2026-11-24T14:00:00Z',status:'Faturado',total:100,order:{orderDate:'2026-10-02',seller:'Vendedor 1',paymentMethod:'pix',commercialTotals:{orderDiscount:10,freight:20},lines:[{catalogItemId:'p1',sku:'P1',name:'Produto de teste',kind:'produto',unit:'un',quantity:2,unitPrice:50,unitDiscount:5,cost:22}]},...patch});
const base={operations:[operation(),operation({id:'2026/2',client:'Cliente Beta',customerId:'client-b',status:'Cancelado'}),operation({id:'2026/3',client:'Cliente Gama',customerId:'client-c',status:'Devolvido'})]};
const build=(id,patch={})=>buildCommercialReport({id,...base,...patch});
test('seis relatórios comuns de Vendas e filtro por faturamento distinto da data do pedido',()=>{
 assert.equal(REPORT_TYPES.filter(r=>r.area==='sales').length,6);
 const filters={...freshReportFilters(),from:'2026-11-24',to:'2026-11-24'};
 assert.equal(build('billing',{filters}).rows.length,1);
 assert.equal(build('orders',{filters}).rows.length,0);
 assert.equal(build('orders').rows.length,3);
 assert.equal(build('billing').totals.value,100);
});
test('produtos por cliente aplica desconto global, separa unidade, exclui cancelados e não mistura frete',()=>{
 const result=build('client-products');assert.equal(result.rows.length,1);assert.equal(result.rows[0].quantity,2);assert.equal(result.totals.value,80);assert.equal(result.rows[0].client,'Cliente Alfa');
 const two=build('client-products',{operations:[operation(),operation({customerId:'client-b',client:'Cliente Beta'})]});assert.equal(two.rows.length,2);
 const filtered=build('client-products',{filters:{...freshReportFilters(),clients:['client-b']}});assert.equal(filtered.rows.length,0);
});
test('custos não aparecem nem escondidos em linhas, totais ou colunas sem permissão',()=>{
 assert.throws(()=>build('product-margin'),/custos/);
 const doc=build('products');assert.doesNotMatch(JSON.stringify(doc),/"cost"|"margin"|"profit"/);
 const allowed=build('product-margin',{canViewCosts:true});assert.equal(allowed.rows[0].cost,44);assert.equal(allowed.rows[0].margin,36);
 assert.throws(()=>build('receivables'),/financeiros/);
});
test('seleções múltiplas combinam filtros e ordenação sem reduzir o universo antes dos totais',()=>{
 const operations=Array.from({length:125},(_,i)=>operation({id:'Pedido '+i,total:i+1}));
 const doc=build('orders',{operations,filters:{...freshReportFilters(),sort:'value-desc',sellers:['Vendedor 1'],methods:['pix']}});assert.equal(doc.rows.length,125);assert.equal(doc.rows[0].value,125);assert.equal(doc.totals.value,7875);
 const cols=build('orders',{filters:{...freshReportFilters(),columns:['order','value']}});assert.deepEqual(Object.keys(cols.rows[0]),['order','value']);
});
test('datas inválidas e intervalo invertido são recusados sem apagar filtros',()=>{
 for(const from of ['2026-02-30','2026-13-01','abc'])assert.ok(validateReportFilters({...freshReportFilters(),from}));
 const f={...freshReportFilters(),from:'2026-12-01',to:'2026-11-01'};assert.throws(()=>build('orders',{filters:f}),/inicial/);assert.equal(f.from,'2026-12-01');
});
test('Em aberto também inclui atrasado/parcial e não inclui quitação/estorno',()=>{
 const receivables=[{id:'r1',value:100,received:0,reversed:0,refunded:0,dueDate:'2026-01-01',orderDate:'2026-01-01'},{id:'r2',value:100,received:30,reversed:0,refunded:0,dueDate:'2027-01-01',orderDate:'2026-01-01'},{id:'r3',value:100,received:100,reversed:0,refunded:0,dueDate:'2026-01-01',orderDate:'2026-01-01'}];
 const result=build('receivables',{canViewFinancial:true,receivables,filters:{...freshReportFilters(),statuses:['Em aberto']}});assert.equal(result.rows.length,2);assert.equal(result.totals.balance,170);
});
test('PDF paginado e Excel completo preservam o mesmo conjunto de dados, moeda e texto literal',async()=>{
 const doc=build('orders',{operations:Array.from({length:180},(_,i)=>operation({id:'Pedido '+i,client:i===0?'=HYPERLINK("bad")':'Cliente de nome comprido com acentuação e detalhes '+i}))});
 const company={name:'Empresa Demonstração',document:'00.000.000/0001-00',color:'#003e73'};
 const workbook=await buildReportExcel(doc,company,['01/11/2026 a 24/11/2026']);
 const sheet=workbook.getWorksheet('Relatório');assert.equal(sheet.rowCount,187);assert.equal(sheet.getCell('C7').value,'=HYPERLINK("bad")');assert.equal(sheet.getCell('C7').type,3);assert.equal(sheet.getCell('G7').value,100);assert.match(sheet.getCell('G7').numFmt,/R\$/);assert.equal(sheet.getCell('A6').fill.fgColor.argb,'FF003E73');assert.ok(sheet.views[0].state==='frozen');
 const bytes=await buildReportPdf(doc,company,['01/11/2026 a 24/11/2026']);const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);assert.equal(pdf.getTitle(),'Pedidos');
 await mkdir('/private/tmp/avanta-relatorios-qa',{recursive:true});await writeFile('/private/tmp/avanta-relatorios-qa/pedidos.pdf',bytes);await writeFile('/private/tmp/avanta-relatorios-qa/pedidos.xlsx',new Uint8Array(await workbook.xlsx.writeBuffer()));
 assert.equal(formatReportCell('2026-11-24','date'),'24/11/2026');assert.match(formatReportCell(1234.5,'currency'),/1\.234,50/);
});


test('estoque usa saldo físico real do catálogo e exclui serviços e itens sem controle',()=>{
 const doc=build('stock',{catalog:[{sku:'P1',name:'Produto',category:'Produto acabado',trackStock:true,current:12,reserved:3,available:9,unit:'un',cost:7},{sku:'S1',name:'Serviço',category:'Serviço',trackStock:false,current:0}]});
 assert.equal(doc.rows.length,1);assert.equal(doc.rows[0].physical,12);assert.equal(doc.rows[0].available,9);assert.equal(doc.rows[0].cost,undefined);
});
