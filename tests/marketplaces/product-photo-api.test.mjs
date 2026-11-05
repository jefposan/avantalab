import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
  if(specifier.endsWith('/management-access'))return {url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({code:e.code||'failed'},{status:e.status||503})};export async function authorizeMarketplace(req,id,permission){if(req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Sem permissão');if(permission!=='manage')throw Error('Permissão errada');return {db:globalThis.photoApiDb,empresaId:id,usuario:{id:'actor'}}}`),shortCircuit:true};
  if(specifier.endsWith('/local-products'))return {url:'data:text/javascript,export async function recoverLocalProductPictures(db,company,actor,id){return globalThis.recoverApiPhoto(db,company,actor,id)}',shortCircuit:true};
  const file=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);return next(specifier,context);
}});
const {POST}=await import('../../app/api/modulos/marketplaces/produtos/fotos/route.ts');hooks.deregister();
const company='00000000-0000-4000-8000-000000000001';
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`);
const request=(body={},role='manager')=>new Request('http://localhost/api/modulos/marketplaces/produtos/fotos',{method:'POST',headers:{authorization:'Bearer '+role,'content-type':'application/json'},body:JSON.stringify({empresaId:company,...body})});
test('recuperação em lote exige gestão, limita empresa/fotos vazias, usa cursor e informa pendências',async()=>{
  const filters={};let selected=0;globalThis.photoApiDb={from(table){selected++;assert.equal(table,'marketplace_products');const q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},order(k){assert.equal(k,'id');return q},limit(n){assert.equal(n,5);return q},gt(k,v){filters.cursor=v;return q},then(done){done({data:ids.map(id=>({id})),error:null});}};return q;}};
  let count=0;const statuses=['recovered','recovered','preserved','no_photos','unavailable'];globalThis.recoverApiPhoto=async(db,c,actor,id)=>{assert.equal(db,globalThis.photoApiDb);assert.equal(c,company);assert.equal(actor,'actor');assert.equal(id,ids[count]);return {status:statuses[count++]};};
  assert.equal((await POST(request({},'reader'))).status,403);assert.equal(selected,0);
  assert.equal((await POST(request({cursor:'outro'}))).status,400);assert.equal(selected,0);
  const result=await POST(request({cursor:ids[0],productId:'não pode escolher outro cadastro'}));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(filters,{empresa_id:company,archived_at:null,pictures:'[]',cursor:ids[0]});assert.deepEqual(await result.json(),{recovered:2,preserved:1,no_photos:1,unavailable:1,nextCursor:ids[4]});
  delete globalThis.photoApiDb;delete globalThis.recoverApiPhoto;
});
