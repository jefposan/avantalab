import test from 'node:test';
import assert from 'node:assert/strict';
import {stockDivergence,syncTarget,listingStockAlertsEnabled} from '../../app/modules/marketplaces/stock-reconciliation.ts';
test('divergência depende de vínculos ativos ML; zero ativo exige pausa',()=>{
 const link=(reported_stock,status='active',provider='mercado_livre')=>({reported_stock,status,provider});
 assert.equal(stockDivergence(0,[link(0)]),'Pausa pendente');assert.equal(stockDivergence(0,[link(0,'paused')]),'');
 assert.equal(stockDivergence(0,[link(2)]),'Divergência');assert.equal(stockDivergence(0,[link(null)]),'Conferir saldos');
 assert.equal(stockDivergence(null,[link(2)]),'Saldo local não informado');assert.equal(stockDivergence(null,[link(2,'closed')]),'');
 assert.equal(stockDivergence(0,[link(2,'active','magalu')]),'Divergência');
});
test('importar escolhe exatamente uma origem elegível, nunca soma',()=>{
 const context={localQuantity:0,sources:[{id:'a',eligible:true,quantity:2},{id:'b',eligible:true,quantity:2},{id:'c',eligible:false,quantity:8}]};
 assert.equal(syncTarget(context,'listing_to_local','a'),2);assert.equal(syncTarget(context,'local_to_listings',''),0);assert.equal(syncTarget(context,'listing_to_local','c'),undefined);
});
test('anúncios fora de venda não exigem saldo; vínculo ativo ou estado desconhecido continua sendo conferido',()=>{
 for(const provider of ['mercado_livre','magalu'])for(const status of ['paused','inactive','closed','deleted','cancelled','canceled']){
  assert.equal(listingStockAlertsEnabled(status),false);
  for(const quantity of [null,0,3])assert.equal(stockDivergence(quantity,[{provider,status,reported_stock:10}]),'');
 }
 const paused={provider:'mercado_livre',status:'paused',reported_stock:99},active={provider:'magalu',status:'active',reported_stock:0};
 assert.equal(stockDivergence(0,[paused,active]),'Pausa pendente');assert.equal(stockDivergence(null,[paused,active]),'Saldo local não informado');
 assert.equal(listingStockAlertsEnabled('active'),true);assert.equal(listingStockAlertsEnabled(undefined),true);assert.equal(listingStockAlertsEnabled('unknown'),true);
 assert.equal(stockDivergence(null,[{...active,status:'unknown'}]),'Saldo local não informado');
});
