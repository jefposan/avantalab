import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createReservationSyncFixture} from './helpers/reservation-sync-fixture.mjs';
const root=resolve(import.meta.dirname,'../..'),mock=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export {}');
 if(s==='./management-access')return mock('export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code});}}');
 if(s==='./mercadolivre-sales')return mock('export async function processSaleNotifications(){throw Error("Não usado neste teste")};export async function syncOrder(){throw Error("Não usado neste teste")}');
 if(s==='./mercadolivre-management')return mock('export async function loadConnection(db,company,id){return db.connection(company,id)};export async function mlRequest(db,c,...args){return db.network(c,...args)};export async function saveListing(db,c,item){return db.saveRemoteListing(c,item)};export async function estimateMercadoLivreListingTypeFee(){return {fee:19.8,percent:10}};export async function recordPublishedListing(){throw Error("Consulta antiga proibida")}');
 const p=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);return next(s,c);
}});
const {deliverStockJob}=await import('../../app/modules/marketplaces/services/inventory-worker.ts');
const {readMercadoLivreEditor,saveMercadoLivreEditor}=await import('../../app/modules/marketplaces/services/mercadolivre-editor.ts');hook.deregister();
const deliver=async f=>{for(const job of await f.jobs())if(job.state==='pending')await deliverStockJob(f.api,job);};
const available=f=>[...f.remotes.values()].map(r=>r.available_quantity);
const reserveData=async(f,w=f.online,q=1)=>({productId:f.product,warehouseId:w,revision:(await f.balance(w)).revision,quantity:q,buyer:'Cliente do teste',note:''});
test('SQL → fila oficial → worker real → quatro contas: reserva 3→2, cancelamento 2→3, estoque e venda sem dupla baixa',async()=>{
 const f=await createReservationSyncFixture();try{
  await deliver(f);assert((await f.jobs()).every(j=>j.state==='synced'));
  const r=await f.reserve('reserve',await reserveData(f));assert.equal((await f.balance(f.online)).quantity,2);assert.equal((await f.balance(f.online)).reservedQuantity,1);
  assert((await f.jobs()).every(j=>j.desired_quantity===2&&!j.allow_increase&&j.state==='pending'));await deliver(f);assert.deepEqual(available(f),[2,2,2,2]);assert((await f.jobs()).every(j=>j.state==='synced'));assert([...f.remotes.values()].every(r=>r.status==='active'));
  await f.reserve('cancel',{reservationId:r.reservationId,reservationRevision:1});assert.equal((await f.balance(f.online)).quantity,3);assert.equal((await f.balance(f.online)).reservedQuantity,0);assert((await f.jobs()).every(j=>j.desired_quantity===3&&j.allow_increase));
  await f.db.query('select marketplace_enqueue_stock($1,$2,false)',[f.company,f.product]);assert((await f.jobs()).every(j=>j.allow_increase),'leitura não revoga reposição da mesma revisão');await deliver(f);assert.deepEqual(available(f),[3,3,3,3]);
  const r2=await f.reserve('reserve',await reserveData(f));await deliver(f);const before=available(f);await f.reserve('sell',{reservationId:r2.reservationId,reservationRevision:1,unitPriceCents:18900,soldOn:'2026-11-14'});await deliver(f);assert.deepEqual(available(f),before);assert.equal((await f.balance(f.online)).quantity,2);assert.equal((await f.balance(f.online)).reservedQuantity,0);assert.equal((await f.db.query('select count(*)::int n from marketplace_direct_sales')).rows[0].n,1);
  await f.warehouse('add',{productId:f.product,warehouseId:f.online,revision:(await f.balance(f.online)).revision,quantity:2});await deliver(f);assert.deepEqual(available(f),[4,4,4,4]);
  const writes=f.calls.length,offline=await f.reserve('reserve',await reserveData(f,f.offline));await deliver(f);assert.equal(f.calls.length,writes,'reserva offline não envia aos marketplaces');await f.reserve('cancel',{reservationId:offline.reservationId,reservationRevision:1});assert.equal((await f.balance(f.offline)).quantity,1);assert.equal(f.calls.length,writes);
 }finally{await f.db.close();}
});
test('reserva total pausa os anúncios; cancelar restaura só pausas do sistema, com confirmação e sem repetir reposição',async()=>{
 const f=await createReservationSyncFixture();try{
  const r=await f.reserve('reserve',await reserveData(f,f.online,3));await deliver(f);assert.deepEqual(available(f),[0,0,0,0]);assert([...f.remotes.values()].every(r=>r.status==='paused'));assert((await f.jobs()).every(j=>j.state==='synced'));
  const key=crypto.randomUUID(),payload={reservationId:r.reservationId,reservationRevision:1};await f.reserve('cancel',payload,key);await f.reserve('cancel',payload,key);await deliver(f);assert.deepEqual(available(f),[3,3,3,3]);assert([...f.remotes.values()].every(r=>r.status==='active'));assert.equal((await f.balance(f.online)).quantity,3);
 }finally{await f.db.close();}
});
test('reserva permanece bloqueada com falha/200 ignorado, repete só pendência e não aplica job antigo após cancelar',async()=>{
 const f=await createReservationSyncFixture();try{
  const account=[...f.connections.keys()][0];f.ignored.add(account);const r=await f.reserve('reserve',await reserveData(f));const old=(await f.jobs()).find(j=>j.link_id===f.connections.get(account).link);await deliver(f);
  assert.equal(f.remotes.get(account).available_quantity,3);assert.equal((await f.jobs()).filter(j=>j.state==='pending').length,1);assert.equal((await f.balance(f.online)).reservedQuantity,1);
  f.ignored.clear();await deliver(f);assert.deepEqual(available(f),[2,2,2,2]);
  await f.reserve('cancel',{reservationId:r.reservationId,reservationRevision:1});await deliverStockJob(f.api,old);assert((await f.jobs()).every(j=>j.desired_quantity===3&&j.state==='pending'));await deliver(f);assert.deepEqual(available(f),[3,3,3,3]);
 }finally{await f.db.close();}
});
test('editor real altera preço de cada conta, confirma por releitura e preserva estoque, anúncio ativo e referência local',async()=>{
 const f=await createReservationSyncFixture();try{
  const before=await f.db.query('select price_cents,stock_quantity from marketplace_products where id=$1',[f.product]);
  for(const [i,c] of [...f.connections.values()].entries()){
   const e=await readMercadoLivreEditor(f.api,c,c.listing);assert(e.fields.price.editable);assert(!e.fields.stock.editable,'saldo vinculado só muda pelo estoque central');
   const price=180+i;const result=await saveMercadoLivreEditor(f.api,c,f.actor,{id:c.listing,revision:e.revision,requestKey:crypto.randomUUID(),changes:{price}});assert.equal(result.listing.price,price);assert.equal(result.listing.status,'active');
   const sent=f.calls.filter(x=>x.connectionId===c.id&&x.method==='PUT');assert.deepEqual(sent.map(x=>x.body),[{price}]);
  }
  assert.deepEqual([...f.remotes.values()].map(r=>r.price),[180,181,182,183]);assert.deepEqual(available(f),[3,3,3,3]);assert.deepEqual((await f.db.query('select price_cents,stock_quantity from marketplace_products where id=$1',[f.product])).rows,before.rows);
  const c=[...f.connections.values()][0];f.ignored.add(c.id);const e=await readMercadoLivreEditor(f.api,c,c.listing);await assert.rejects(saveMercadoLivreEditor(f.api,c,f.actor,{id:c.listing,revision:e.revision,requestKey:crypto.randomUUID(),changes:{price:150}}),e=>e.code==='edit_uncertain');assert.equal(f.remotes.get(c.id).price,180);assert.equal((await f.db.query("select count(*)::int n from marketplace_listing_actions where status='uncertain'")).rows[0].n,1);
 }finally{await f.db.close();}
});
