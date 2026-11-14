import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketPricesFixture} from '../../app/modules/marketplaces/dev/market-prices-fixture.ts';
import {summarizeMarketOffers} from '../../app/modules/marketplaces/market-price-research.ts';
function receipt(f,kind='double'){
 const ml=f.scenario(kind),url='https://loja.example/produto',origin={title:ml.productName,price:220,url,availability:'in_stock',checkedAt:new Date().toISOString(),method:'json_ld'};
 const offer={id:'web:loja.example',sellerId:'web:loja.example',seller:'loja.example',title:ml.productName,price:220,url,source:'openai_web_search',origin};
 return {...summarizeMarketOffers({...ml,provider:'ml_web_search'},[...ml.offers,offer]),mlResearch:ml,complement:{status:'completed',checkedAt:origin.checkedAt,accepted:1,message:'Conferida na origem'}};
}
test('SQL real: média combinada é gravada com recibo, idempotência e sem alterar estoque/ficha',async()=>{
 const f=await createMarketPricesFixture();try{const e=receipt(f),key=crypto.randomUUID(),before=await f.current();await f.command('claim',key,1);const r=await f.command('complete',key,1,e.offers,e);assert.equal(r.status,'updated');assert.equal(r.price_cents,20100);const after=await f.current();assert.equal(after.stock_quantity,before.stock_quantity);assert.equal(after.name,before.name);assert.deepEqual(after.pictures,before.pictures);assert.equal(after.publication_form.custom,'preservado');assert.deepEqual((await f.snapshot()).research,e);assert.equal((await f.command('complete',key,1,e.offers,e)).price_cents,20100);assert.equal((await f.current()).revision,2);}finally{await f.db.close();}
});
test('SQL real: amostra sem ofertas ML aceita somente a loja comprovada',async()=>{
 const f=await createMarketPricesFixture();try{const e=receipt(f,'empty'),key=crypto.randomUUID();e.catalogId=null;e.mlResearch.catalogId=null;await f.command('claim',key,1);assert.equal((await f.command('complete',key,1,e.offers,e)).price_cents,22000);}finally{await f.db.close();}
});
test('SQL real: recusa preço sem prova, origem diferente, ML forjado, duplicatas e complemento indevido',async()=>{
 const f=await createMarketPricesFixture();try{
  const key=crypto.randomUUID();await f.command('claim',key,1);
  const variants=[e=>{delete e.offers.at(-1).origin},e=>{e.offers.at(-1).origin.price=1},e=>{e.offers.at(-1).url='https://evil.example/produto'},e=>{e.offers[0].price=1},e=>{e.mlResearch.count=3},e=>{e.mlResearch.status='partial'},e=>{e.offers[1]=e.offers[0]},e=>{e.offers.at(-1).origin.availability='out_of_stock'},e=>{e.offers.at(-1).source='google_shopping'},e=>{e.offers.at(-1).sellerId='web:mercadolivre.com.br'}];
  for(const change of variants){const e=JSON.parse(JSON.stringify(receipt(f)));change(e);await assert.rejects(f.command('complete',key,1,e.offers,e));}
  assert.equal((await f.current()).revision,1);assert.equal((await f.current()).price_cents,22000);
 }finally{await f.db.close();}
});
