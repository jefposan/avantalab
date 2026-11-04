import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='next/server')return{url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
 if(s.endsWith('/management-access'))return{url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}export function managementFailure(e){return Response.json({code:e.code,message:e.message},{status:e.status||503})}`),shortCircuit:true};
 if(s.endsWith('/services/warehouses'))return{url:'data:text/javascript,'+encodeURIComponent(`export async function warehouseContext(db,company,product){if(company!==globalThis.postCompany)throw Error('Empresa incorreta');return {warehousesReady:true,warehouses:[{id:'online',name:'Online',quantity:2},{id:'saldao',name:'SALDÃO',quantity:3}]}}`),shortCircuit:true};
 if(s.endsWith('/price-access'))return{url:'data:text/javascript,'+encodeURIComponent(`export async function authorizePriceConsultation(req,c){if(req.headers.get('authorization')!=='Bearer authorized')throw Object.assign(Error('Sessão'),{status:401});if(c!==globalThis.postCompany)throw Object.assign(Error('Negado'),{status:403});return{db:globalThis.postDb,empresaId:c,usuario:{id:'actor'}}}`),shortCircuit:true};
 const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {GET,POST}=await import('../../app/api/modulos/marketplaces/precos/post/route.ts');hooks.deregister();
test('API real: autorização, imagens privadas, recuperar por produto, idempotência e revisão sem tocar cadastro',async()=>{
 const company=crypto.randomUUID(),product=crypto.randomUUID(),key=crypto.randomUUID();globalThis.postCompany=company;
 const rows=[],files=new Map();let uploads=0;
 globalThis.postDb={from(table){const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},order(){return q},limit(){return q},async maybeSingle(){
  assert.equal(filters.empresa_id,company);
  if(table==='marketplace_products')return{data:filters.id===product?{id:product,name:'Produto'}:null};
  assert.equal(table,'marketplace_product_posts');return{data:rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)).at(-1)||null};
 }};return q;},storage:{from(bucket){assert.equal(bucket,'marketplace-product-posts');return{
 async upload(path,b,options){assert.equal(options.upsert,false);if(files.has(path))return{error:{statusCode:'409',message:'already exists'}};files.set(path,Buffer.from(b));uploads++;return{};},
 async download(path){return{data:new Blob([files.get(path)])};},
 async createSignedUrls(paths,ttl){assert.equal(ttl,300);assert.ok(paths.every(p=>p.startsWith(company+'/'+product+'/')));return{data:paths.map(p=>({signedUrl:'https://storage.example.invalid/'+p}))};}
 }}},async rpc(name,a){assert.equal(name,'marketplace_product_post_save');assert.equal(a.p_empresa,company);assert.equal(a.p_product,product);assert.equal(a.p_actor,'actor');const r={id:a.p_request,empresa_id:company,product_id:product,revision:a.p_revision+1,draft:a.p_draft,content_hash:a.p_hash,created_by:'actor',image_path:`${company}/${product}/${a.p_request}/post.png`,source_path:`${company}/${product}/${a.p_request}/source.jpg`};rows.push(r);return{data:r};}};
 const png=await sharp({create:{width:1080,height:1350,channels:3,background:'#fff'}}).png().toBuffer(),jpg=await sharp({create:{width:200,height:200,channels:3,background:'#fff'}}).jpeg().toBuffer();
 const draft={company:'Perfil',name:'Produto',description:'Texto salvo',voltage:'127 V',condition:'used',details:'Caixa aberta',priceCents:37800,originalPriceCents:54000,primaryColor:'#d60000'};
 const request=(overrides={},authorized=true)=>{const f=new FormData();for(const[k,v]of Object.entries({empresaId:company,productId:product,requestKey:key,revision:'0',draft:JSON.stringify(draft),...overrides}))f.set(k,v);f.set('image',new Blob([png],{type:'image/png'}),'post.png');f.set('source',new Blob([jpg],{type:'image/jpeg'}),'source.jpg');return new Request('http://local/api',{method:'POST',headers:{authorization:authorized?'Bearer authorized':''},body:f});};
 const get=()=>GET(new Request(`http://local/api?empresaId=${company}&productId=${product}`,{headers:{authorization:'Bearer authorized'}}));
 assert.equal((await POST(request({},false))).status,401);assert.equal((await POST(request({empresaId:crypto.randomUUID()}))).status,403);assert.equal(uploads,0);
 assert.equal((await get()).headers.get('cache-control'),'private, no-store');const context=await(await get()).json();assert.equal(context.post,null);assert.equal(context.stock.warehousesReady,true);assert.deepEqual(context.stock.warehouses.map(w=>w.quantity),[2,3]);
 assert.equal((await POST(request())).status,200);assert.equal(rows.length,1);assert.equal(uploads,2);assert.equal(rows[0].draft.image,undefined);
 assert.equal((await POST(request())).status,200);assert.equal(rows.length,1);assert.equal(uploads,2);
 let r=await(await get()).json();assert.equal(r.post.draft.description,'Texto salvo');assert.equal(r.post.revision,1);assert.equal(r.post.content_hash,undefined);
 assert.equal((await POST(request({requestKey:crypto.randomUUID()}))).status,409,'rascunho antigo não sobrescreve');assert.equal(uploads,2);
 assert.equal((await POST(request({requestKey:crypto.randomUUID(),revision:'1'}))).status,200);assert.equal(rows.length,2);
 assert.equal((await POST(request({requestKey:crypto.randomUUID(),revision:'2',draft:JSON.stringify({...draft,condition:'invented'})}))).status,400);assert.equal(uploads,4);
 assert.equal((await POST(request({productId:crypto.randomUUID()}))).status,404);
 for(const condition of ['refurbished','detailed']){
  assert.equal((await POST(request({requestKey:crypto.randomUUID(),revision:String(rows.length),draft:JSON.stringify({...draft,condition,details:'Pequena marca na embalagem'})}))).status,200);
  const saved=await(await get()).json();assert.equal(saved.post.draft.condition,condition);assert.equal(saved.post.draft.details,'Pequena marca na embalagem');
 }
 assert.equal((await POST(request({requestKey:crypto.randomUUID(),revision:String(rows.length),draft:JSON.stringify({...draft,condition:'detailed',details:''})}))).status,400);
 delete globalThis.postDb;delete globalThis.postCompany;
});
