import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validProductPictures} from '../../app/modules/marketplaces/product-photos.ts';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
  if(specifier.endsWith('/management-access')||specifier==='./management-access')return {url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.code=code;this.status=status}}',shortCircuit:true};
  if(specifier==='./mercadolivre-management')return {url:'data:text/javascript,export async function loadConnection(db,company,id){return globalThis.photoConnection(company,id)};export async function mlRequest(db,c,path){return globalThis.photoItem(c,path)}',shortCircuit:true};
  const file=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);return next(specifier,context);
}});
const {readImportedProductPictures}=await import('../../app/modules/marketplaces/services/imported-product-photos.ts');
const {recoverLocalProductPictures,importLocalListing}=await import('../../app/modules/marketplaces/services/local-products.ts');hooks.deregister();
const company='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',connection='00000000-0000-4000-8000-000000000003';
const link={connection_id:connection,provider:'mercado_livre',provider_listing_id:'MLB5324529993'};
const remote=()=>({id:link.provider_listing_id,seller_id:'123',pictures:[{secure_url:'https://http2.mlstatic.com/photo.jpg'}],attributes:[{id:'GTIN',value_name:'7908103790527'}]});
function source(){globalThis.photoConnection=async(c,v)=>{assert.equal(c,company);assert.equal(v,connection);return {seller_reference:'123'};};globalThis.photoItem=async(c,path)=>{assert.equal(path,'/items/'+link.provider_listing_id);return remote();};}
function database(pictures=[]){
  const db={current:{id,empresa_id:company,name:'Produto',ean:'7908103790527',pictures,revision:1},calls:[],rpcCalls:[],concurrent:false,from(table){const filters={};const q={select(){return q},eq(key,value){filters[key]=value;return q},is(){return q},order(){return q},async maybeSingle(){db.calls.push(table);assert.equal(filters.empresa_id,company);
    if(table==='marketplace_products'){assert.equal(filters.id,id);if(db.concurrent&&db.calls.filter(t=>t===table).length===2)db.current.pictures=['https://example.com/manual.jpg'];return {data:{...db.current},error:null};}
    if(table==='marketplace_listings')return {data:{...link,snapshot:{title:'Produto',ean:'7908103790527',price:200,stock:5,category:'MLB1',shipping:{mode:'me2'}}},error:null};
    if(table==='marketplace_publications')return {data:null,error:null};throw Error(table);
  },then(done){assert.equal(filters.empresa_id,company);assert.equal(filters.product_id,id);done({data:[link],error:null});}};return q;},async rpc(name,args){
    if(name==='marketplace_listing_catalog_import'){assert.equal(args.p_empresa,company);assert.equal(args.p_connection,connection);db.rpcCalls.push({...args,p_action:'import'});return {data:{product_id:id,created:false},error:null};}
    db.rpcCalls.push(args);assert.equal(name,'marketplace_product_command');assert.equal(args.p_empresa_id,company);
    assert.equal(args.p_action,'enrich');assert.deepEqual(Object.keys(args.p_data).sort(),['pictures','product_id','revision']);assert.equal(args.p_data.revision,db.current.revision);if(db.current.pictures.length===0)db.current.pictures=args.p_data.pictures;db.current.revision++;
    return {data:{product_id:id,created:false},error:null};}};return db;
}
test('URLs de foto são limitadas, sem credenciais/esquemas perigosos, e mantêm fotos manuais HTTPS',()=>{
  assert.deepEqual(validProductPictures(['javascript:bad','http://evil.example/a','https://user:secret@mlstatic.com/a','https://example.com/manual.jpg']),['https://example.com/manual.jpg']);
  assert.equal(validProductPictures(Array.from({length:30},(_,i)=>`https://http2.mlstatic.com/${i}.jpg`),true).length,12);
});
test('fotos salvas dispensam chamada externa; legado consulta apenas anúncio confirmado da própria conta',async()=>{
  source();let calls=0;const original=globalThis.photoItem;globalThis.photoItem=async(...v)=>{calls++;return original(...v);};
  assert.deepEqual(await readImportedProductPictures({},company,{...link,snapshot:{pictures:['https://http2.mlstatic.com/cached.jpg']}}),['https://http2.mlstatic.com/cached.jpg']);assert.equal(calls,0);
  assert.deepEqual(await readImportedProductPictures({},company,link,'7908103790527'),['https://http2.mlstatic.com/photo.jpg']);assert.equal(calls,1);
  assert.deepEqual(await readImportedProductPictures({},company,{...link,provider:'magalu'}),[]);assert.equal(calls,1);
});
test('anúncio de outra conta, EAN diferente e variações não fornecem fotos para o cadastro',async()=>{
  source();for(const patch of [{seller_id:'999'},{id:'MLB1234567'},{attributes:[{id:'GTIN',value_name:'7891129598607'}]},{variations:[{id:'x'}]}]){
    globalThis.photoItem=async()=>({...remote(),...patch});await assert.rejects(readImportedProductPictures({},company,link,'7908103790527'));
  }
});
test('recuperação preenche só fotos vazias com revisão; manuais e edição concorrente são preservadas',async()=>{
  source();const db=database();assert.equal((await recoverLocalProductPictures(db,company,'actor',id)).status,'recovered');assert.equal(db.rpcCalls.length,1);assert.deepEqual(db.current.pictures,['https://http2.mlstatic.com/photo.jpg']);
  const manual=database(['https://example.com/manual.jpg']);assert.equal((await recoverLocalProductPictures(manual,company,'actor',id)).status,'preserved');assert.equal(manual.rpcCalls.length,0);
  const racing=database();racing.concurrent=true;assert.equal((await recoverLocalProductPictures(racing,company,'actor',id)).status,'preserved');assert.equal(racing.rpcCalls.length,0);
  const failed=database();globalThis.photoItem=async()=>{throw Error('Rede');};assert.equal((await recoverLocalProductPictures(failed,company,'actor',id)).status,'unavailable');assert.equal(failed.rpcCalls.length,0);
});
test('reimportação recupera fotos dos cadastros legados sem duplicar produto ou substituir manuais',async()=>{
  source();const db=database();const result=await importLocalListing(db,company,'actor',connection,link.provider_listing_id);assert.equal(result.created,false);assert.equal(result.photosPending,false);assert.deepEqual(db.rpcCalls.map(c=>c.p_action),['import','enrich']);
  const manual=database(['https://example.com/manual.jpg']);await importLocalListing(manual,company,'actor',connection,link.provider_listing_id);assert.deepEqual(manual.rpcCalls.map(c=>c.p_action),['import']);assert.deepEqual(manual.current.pictures,['https://example.com/manual.jpg']);
});
