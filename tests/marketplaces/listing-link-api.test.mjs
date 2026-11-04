import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),account='11111111-1111-4111-8111-111111111111',id='MLB123456';
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const access=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,company,permission){if(company!=='company'||permission!=='manage'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.linkDb,empresaId:company}}`;
const accessUrl='data:text/javascript,'+encodeURIComponent(access);
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export {}');if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');if(s.endsWith('/management-access'))return {url:accessUrl,shortCircuit:true};
 if(s==='./mercadolivre-management')return mock(`import{MarketplaceError}from ${JSON.stringify(accessUrl)};export async function loadConnection(db,company,id){if(id!==${JSON.stringify(account)}||company!=='company')throw new MarketplaceError(404,'missing','Conta não encontrada');return {id,seller_reference:'123'}};export async function mlRequest(db,c,path,method='GET'){db.calls.push({path,method});if(method!=='GET')throw Error('Escrita proibida');return db.item};export function recordPublishedListing(){throw Error('Não salvar retrato')};export function synchronizeListings(){throw Error('Não sincronizar')}`);
 if(s==='./magalu-listings')return mock(`export async function loadMagaluConnection(){return {}};export async function readMagaluListing(db){db.calls.push({method:'GET',path:'magalu-read'});return {listing:db.item}};export function saveMagaluListing(){throw Error('Não salvar')};export function reconcileMagaluActions(){throw Error('Não conciliar')}`);
 if(s==='./listing-edit-adapters')return mock('export const listingEditAdapter=()=>({})');
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {GET}=await import('../../app/api/modulos/marketplaces/anunciados/link/route.ts');after(()=>hook.deregister());
function fixture(provider='mercado_livre'){
 const db={item:{id,seller_id:123,permalink:'https://produto.mercadolivre.com.br/MLB-123456-produto'},calls:[],from(table){assert.equal(table,'marketplace_connections');const filters={};const q={select(columns){assert.equal(columns,'provider');return q},eq(key,value){filters[key]=value;return q},async maybeSingle(){assert.equal(filters.empresa_id,'company');return {data:filters.id===account?{provider}:null,error:null}}};return q}};globalThis.linkDb=db;return db;
}
const req=(extra={},token='manager')=>new Request('http://local/?'+new URLSearchParams({empresaId:'company',connectionId:account,id,...extra}),{headers:{authorization:`Bearer ${token}`}});
test('rota de link autentica gestão, isola conta/empresa e usa somente GET sem gravar ou observar saldo',async()=>{
 const db=fixture();assert.equal((await GET(req({},'viewer'))).status,403);assert.equal((await GET(req({empresaId:'other'}))).status,403);assert.equal((await GET(req({connectionId:'22222222-2222-4222-8222-222222222222'}))).status,404);
 const response=await GET(req());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{id,connectionId:account,permalink:db.item.permalink});assert.deepEqual(db.calls,[{path:`/items/${id}`,method:'GET'}]);
});
test('não aceita anúncio alheio, identificador divergente, URL insegura ou ausente',async()=>{
 for(const [patch,status]of [[{seller_id:999},403],[{id:'MLB654321'},403],[{permalink:'http://mercadolivre.com.br'},404],[{permalink:'https://evil.example'},404],[{permalink:null},404]]){const db=fixture();Object.assign(db.item,patch);assert.equal((await GET(req())).status,status);assert.ok(db.calls.every(c=>c.method==='GET'));}
 const db=fixture();assert.equal((await GET(req({id:'inválido'}))).status,400);assert.equal(db.calls.length,0);
});
test('Magalu mantém leitura sem reconciliação/escrita e plataformas não homologadas são recusadas',async()=>{
 const db=fixture('magalu');db.item.permalink='https://www.magazineluiza.com.br/produto/p/123';assert.equal((await GET(req())).status,200);assert.deepEqual(db.calls,[{method:'GET',path:'magalu-read'}]);fixture('shopee');assert.equal((await GET(req())).status,501);
});
