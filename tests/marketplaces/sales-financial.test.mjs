import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateFreight,mlFees,mlSellerFreight,magaluFinancial,emptyFinancialMonths,mergeFinancial,sumFinancial} from '../../app/modules/marketplaces/sales-financial.ts';
test('ML calcula comissão por unidade, aceita zero real e rejeita campo ausente',()=>{
 assert.equal(mlFees({currency_id:'BRL',order_items:[{sale_fee:1.25,quantity:3},{sale_fee:0,quantity:1}]}),375);
 assert.equal(mlFees({currency_id:'BRL',order_items:[{quantity:1}]}),null);
 assert.equal(mlFees({currency_id:'USD',order_items:[{sale_fee:1,quantity:1}]}),null);
});
test('frete usa somente cost do vendedor certo e nunca gross_amount, receiver, save ou promoted_amount',()=>{
 const costs={gross_amount:99,receiver:{cost:40},senders:[{user_id:111,cost:4.12,save:20,promoted_amount:5},{user_id:222,cost:9}]};
 assert.equal(mlSellerFreight(costs,'111'),412);assert.equal(mlSellerFreight(costs,'333'),null);
 assert.equal(mlSellerFreight({senders:[{user_id:111,cost:0}]},'111'),0);
});
test('rateio de envio compartilhado não duplica nem perde centavos',()=>{
 const orders=[{id:'a',gross:10000},{id:'b',gross:20000},{id:'c',gross:30000}];
 const result=allocateFreight(1001,orders);assert.equal([...result.values()].reduce((a,b)=>a+b),1001);
 assert.deepEqual([...allocateFreight(1001,[...orders].reverse())],[...result]);
 assert.throws(()=>allocateFreight(100,[{id:'a',gross:0}]));
});
const transaction=(type,category,value,extra={})=>({type,category,value,normalizer:100,currency:'BRL',status:'concluded',...extra});
const report=transactions=>[{id:'r',external_id:'o',seller:{id:'seller'},transactions}];
test('Magalu separa custos/créditos, usa normalizer e ignora informativos e desconto já aplicado',()=>{
 const result=magaluFinancial(report([transaction('CREDIT','SALE',10000),transaction('DEBIT','COMMISSION',1000),transaction('DEBIT','FEES',100),transaction('DEBIT','SHIPPING_COST',800),transaction('CREDIT','MARKETPLACE',200,{subcategory:'SHIPPING_SUBSIDY'}),transaction('DEBIT','PROMOTION',100,{subcategory:'ABSOLUTE_DISCOUNT'}),{type:'INFORMATIVE',category:'TAXES'}]),'seller','o',10000);
 assert.deepEqual(result,{fees:1100,freight:600,net:8300,adjustments:0});
 const own=magaluFinancial(report([transaction('CREDIT','SALE',10000),transaction('CREDIT','SHIPPING_COST',500)]),'seller','o',10000);
 assert.equal(own.freight,-500);assert.equal(own.net,10500);
});
test('Magalu rejeita identidade, moeda, status ou relatórios incompletos sem fabricar líquido',()=>{
 assert.throws(()=>magaluFinancial(report([transaction('CREDIT','SALE',100)]),'other','o',100));
 assert.throws(()=>magaluFinancial(report([transaction('CREDIT','SALE',100,{currency:'USD'})]),'seller','o',100));
 assert.throws(()=>magaluFinancial([],'seller','o',100));
 assert.throws(()=>magaluFinancial(report([transaction('CREDIT','SALE',100,{status:'unknown'})]),'seller','o',100));
});
test('agregação mantém cobertura e valores separados por mês sem misturar anos',()=>{
 const a=emptyFinancialMonths(),b=emptyFinancialMonths();a[9].fees=100;a[9].feeOrders=1;b[9].fees=200;b[9].feeOrders=1;b[8].freight=300;
 const sum=sumFinancial(mergeFinancial(a,b));assert.equal(sum.fees,300);assert.equal(sum.feeOrders,2);assert.equal(sum.freight,300);assert.equal(sum.netOrders,0);
});
