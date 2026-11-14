import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketPricesFixture} from '../../app/modules/marketplaces/dev/market-prices-fixture.ts';
test('SQL real: média ML auditada usa todos os vendedores, preserva estoque/ficha e repete sem pesquisar nem gravar de novo',async()=>{
 const f=await createMarketPricesFixture();try{
  const before=await f.current(),e=f.scenario('ready'),key=crypto.randomUUID();assert(e.count>8);
  assert.equal((await f.command('claim',key,1)).claimed,true);assert.equal((await f.command('claim',key,1)).claimed,false);
  const r=await f.command('complete',key,1,e.offers,e),p=await f.current();assert.equal(r.status,'updated');assert.equal(r.price_cents,Math.round(e.mean*100));assert.equal(p.price_cents,r.price_cents);assert.equal(p.revision,2);assert.equal(p.stock_quantity,before.stock_quantity);assert.equal(p.name,before.name);assert.deepEqual(p.pictures,before.pictures);assert.equal(p.publication_form.custom,'preservado');
  assert.deepEqual((await f.snapshot()).research,e);assert.equal((await f.command('complete',key,1,e.offers,e)).price_cents,r.price_cents);assert.equal((await f.current()).revision,2);
  const rights=(await f.db.query("select has_function_privilege('anon','marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text)','execute') as anon,has_function_privilege('authenticated','marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text)','execute') as authenticated,has_function_privilege('service_role','marketplace_ml_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,jsonb,text)','execute') as service")).rows[0];assert.deepEqual(rights,{anon:false,authenticated:false,service:true});
 }finally{await f.db.close();}
});
test('SQL real: ausência, amostra insuficiente, pesquisa parcial e falha mantêm a referência e o recibo consultável',async()=>{
 for(const kind of ['empty','insufficient','partial','unavailable']){
  const f=await createMarketPricesFixture();try{const e=f.scenario(kind),key=crypto.randomUUID();await f.command('claim',key,1);const r=await f.command(kind==='unavailable'?'fail':'complete',key,1,[],e);assert.equal(r.status,kind==='unavailable'?'failed':'no_offers');assert.equal((await f.current()).price_cents,22000);assert.equal((await f.current()).revision,1);assert.deepEqual((await f.snapshot()).research,e);}finally{await f.db.close();}
 }
});
test('SQL real: recusa próprias contas, repetição de vendedor, fonte forjada, amostra única e recibo sem identidade',async()=>{
 const f=await createMarketPricesFixture();try{
  const e=f.scenario('ready'),key=crypto.randomUUID();await f.command('claim',key,1);
  const bad=[{...e,catalogId:null},{...e,count:null},{...e,offers:[e.offers[0]],count:1}, {...e,offers:e.offers.map((o,i)=>i===0?{...o,sellerId:'999'}:o)}, {...e,offers:e.offers.map((o,i)=>i===0?{...o,url:'https://evil.example'}:o)}, {...e,offers:e.offers.map((o,i)=>i===1?{...o,sellerId:e.offers[0].sellerId}:o)}];
  for(const receipt of bad)await assert.rejects(f.command('complete',key,1,receipt.offers,receipt));assert.equal((await f.current()).price_cents,22000);assert.equal((await f.current()).stock_quantity,3);
  await assert.rejects(f.command('complete',key,1,e.offers,{...e,provider:'openai'}));
 }finally{await f.db.close();}
});
test('SQL real: edição concorrente, perfil errado e ator sem acesso não sobrescrevem preço nem recebem recibo de outra empresa',async()=>{
 const f=await createMarketPricesFixture();try{
  const e=f.scenario('ready'),key=crypto.randomUUID();await f.command('claim',key,1);await f.db.exec('update marketplace_products set price_cents=19900,revision=2');assert.equal((await f.command('complete',key,1,e.offers,e)).status,'conflict');assert.equal((await f.current()).price_cents,19900);
  await assert.rejects(f.command('claim',crypto.randomUUID(),2,[],{},f.other),/Sem permissão/);await assert.rejects(f.command('claim',crypto.randomUUID(),2,[],{},f.company,crypto.randomUUID()),/Sem permissão/);
  await assert.rejects(f.command('claim',key,2),/dados diferentes/);
 }finally{await f.db.close();}
});
