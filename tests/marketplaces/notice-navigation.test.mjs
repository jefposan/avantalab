import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inventoryNoticeTarget} from '../../app/modules/marketplaces/notice-navigation.ts';
const notice={id:'notice',source:'stock',code:'stock_divergence',productId:'product',connectionId:'account',provider:'mercado_livre',listingId:'MLB1',orderId:'order'};
test('pendência de estoque abre produto exato; falta de saldo de uma venda também',()=>{
 assert.deepEqual(inventoryNoticeTarget(notice),{key:'notice',provider:'mercado_livre',connectionId:'account',panel:'stock',productId:'product'});
 assert.equal(inventoryNoticeTarget({...notice,source:'sale',code:'insufficient_stock'}).panel,'stock');
});
test('pedido e anúncio respeitam plataforma/conta e não escolhem item desconhecido',()=>{
 for(const provider of ['mercado_livre','magalu']){
  assert.deepEqual(inventoryNoticeTarget({...notice,provider,source:'sale',code:'order_quantity_changed'}),{key:'notice',provider,connectionId:'account',panel:'sale',orderId:'order'});
  assert.equal(inventoryNoticeTarget({...notice,provider,source:'account',productId:null,orderId:null}).panel,'listing');
  assert.equal(inventoryNoticeTarget({...notice,provider,source:'sale',code:'product_not_linked',productId:null}).panel,'listing');
 }
 assert.equal(inventoryNoticeTarget({...notice,source:'account',productId:null,connectionId:null}),null);
 assert.equal(inventoryNoticeTarget({...notice,source:'account',productId:null,listingId:null,orderId:null}),null);
});
test('aviso abre revisão, não modal de sincronização; navegação usa leitura autenticada e identificadores exatos',()=>{
 const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 const notices=read('app/marketplaces/InventoryNotices.tsx');
 assert.match(notices,/Conferir e ajustar/);assert.doesNotMatch(notices,/Conferir e sincronizar|StockSyncDialog|syncProduct/);
 const client=read('app/marketplaces/MarketplacesClient.tsx');
 assert.match(client,/localOnly:'1'/);assert.match(client,/s\.orderId===target\.orderId && s\.connectionId===target\.connectionId/);
 assert.match(client,/setSalesPeriod\(\{start:'',end:''\}\)/);
 const route=read('app/api/modulos/marketplaces/anunciados/route.ts');
 assert.match(route,/query\.eq\('provider_listing_id',listingId\.slice/);assert.match(route,/eq\('empresa_id', empresaId\)/);
 const products=read('app/marketplaces/ProductsStock.tsx');
 assert.match(products,/result\.product\?\.id !== noticeProduct \|\| result\.product\?\.empresa_id !== companyId/);
 assert.match(products,/Voltar à lista/);
});
