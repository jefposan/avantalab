import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const accessStub=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='manage'||id!=='company'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.contentDb,empresaId:id,usuario:{id:'actor'}}}`;
const accessUrl='data:text/javascript,'+encodeURIComponent(accessStub);
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
 if(s.endsWith('/management-access')||s==='./management-access')return {url:accessUrl,shortCircuit:true};
 if(s.endsWith('/mercadolivre-management')||s==='./mercadolivre-management')return {url:'data:text/javascript,'+encodeURIComponent(`import {MarketplaceError} from ${JSON.stringify(accessUrl)};export async function loadConnection(db,company,id){if(company!=='company'||id!=='account')throw new MarketplaceError(404,'account_not_found','Conta não encontrada');return {id,empresa_id:company,seller_reference:'123'}};export async function mlRequest(db,c,path,method='GET',body){return db.ml(path,method,body)};export async function saveListing(db,c,item){db.cached.push(item.id);return item};export async function uploadMercadoLivrePicture(db,c,bytes,mime){db.uploads++;return {id:'uploaded-photo-123',variations:[{secure_url:'https://http2.mlstatic.com/photo.jpg'}]}}`),shortCircuit:true};
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {GET,PATCH}=await import('../../app/api/modulos/marketplaces/anunciados/qualidade/conteudo/route.ts');
const {POST:upload}=await import('../../app/api/modulos/marketplaces/anunciados/qualidade/foto/route.ts');hooks.deregister();
const id='MLB123456',other='MLB654321',up='MLBU123456';
function fixture(shared=false){
 const original={id,seller_id:123,category_id:'MLB123',catalog_listing:false,status:'active',sub_status:[],last_updated:'first',title:'Produto',pictures:[{id:'pict-A1',secure_url:'https://http2.mlstatic.com/a.jpg'},{id:'pict-B2',secure_url:'https://http2.mlstatic.com/b.jpg'}],attributes:[{id:'BRAND',value_name:'Original'},{id:'TEXT',value_name:'Antes'},{id:'UNKNOWN',values:[{id:'k',name:'preservar'}]}],variations:[],...(shared?{user_product_id:up}:{})};
 const db={items:new Map([[id,structuredClone(original)],...(shared?[[other,{...structuredClone(original),id:other}]]:[])]),audits:[],cached:[],puts:[],uploads:0,apply:true,failAudit:false,scopeUnknown:false,
  async ml(path,method,body){
   if(method==='PUT'){assert.equal(path,`/items/${id}`);assert.ok(Object.keys(body).every(k=>['pictures','attributes'].includes(k)));db.puts.push(structuredClone(body));if(db.apply)for(const item of db.items.values()){if(body.pictures&&(item.catalog_listing!==true||db.mutateCatalog))item.pictures=body.pictures.map(p=>({...p,secure_url:'https://http2.mlstatic.com/a.jpg'}));if(body.attributes&&(item.catalog_listing!==true||db.mutateCatalog))item.attributes=structuredClone(body.attributes);item.last_updated='changed';}return {};}
   assert.equal(method,'GET');if(path.startsWith('/users/'))return {seller_id:123,paging:{total:db.scopeUnknown?3:db.items.size},results:[...db.items.keys()]};
   if(path.startsWith('/items/bulk?'))return [...db.items.values()].map(body=>({code:200,body:structuredClone(body)}));
   if(path.startsWith('/items/'))return structuredClone(db.items.get(path.split('/')[2]));
   if(path.endsWith('/attributes'))return [{id:'TEXT',name:'Texto',value_type:'string',tags:{}},{id:'BRAND',name:'Marca',value_type:'string',tags:{fixed:true}},{id:'GTIN',value_type:'string',tags:{}}];
   if(path.startsWith('/categories/'))return {settings:{max_pictures_per_item:6}};throw Error(path);
  },from(table){assert.equal(table,'marketplace_listing_actions');let operation='select',payload,filters=[];const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},insert(v){operation='insert';payload=v;return q;},update(v){operation='update';payload=v;return q;},then(resolve,reject){try{
   if(operation==='insert'){if(db.failAudit||payload.some(row=>db.audits.some(a=>a.request_key===row.request_key||a.provider_listing_id===row.provider_listing_id&&a.status==='requested')))return resolve({error:{code:'23505'},data:null});const saved=payload.map(row=>({...row,id:crypto.randomUUID(),status:'requested'}));db.audits.push(...saved);return resolve({data:saved.map(a=>({id:a.id})),error:null});}
   const found=db.audits.filter(r=>filters.every(f=>f(r)));if(operation==='update')found.forEach(r=>Object.assign(r,payload));resolve({data:structuredClone(found),error:null});
  }catch(e){reject(e);}}};return q;}
 };globalThis.contentDb=db;return db;
}
const get=(kind='attributes',params={},token='manager')=>new Request('http://local/?'+new URLSearchParams({empresaId:'company',connectionId:'account',id,kind,...params}),{headers:{authorization:`Bearer ${token}`}});
const patch=(editor,values,extra={})=>new Request('http://local/',{method:'PATCH',headers:{authorization:'Bearer manager','content-type':'application/json'},body:JSON.stringify({empresaId:'company',connectionId:'account',id,kind:editor.kind,revision:editor.revision,confirmation:id,affectedIds:editor.affectedIds,requestKey:crypto.randomUUID(),values,...extra})});
test('isolamento e edição de ficha preservam atributos, exigem auditoria e confirmação remota',async()=>{
 const db=fixture();assert.equal((await GET(get('attributes',{},'viewer'))).status,403);assert.equal((await GET(get('attributes',{connectionId:'other'}))).status,404);
 let res=await GET(get());assert.equal(res.headers.get('cache-control'),'no-store');let editor=await res.json();assert.equal(editor.reason,'');assert.equal(editor.attributes.find(a=>a.id==='BRAND').editable,false);
 assert.equal((await PATCH(patch(editor,{GTIN:'123'}))).status,400);assert.equal(db.puts.length,0);
 res=await PATCH(patch(editor,{TEXT:'Depois'}));assert.equal(res.status,200);assert.equal((await res.json()).success,true);assert.equal(db.puts.length,1);assert.equal(db.items.get(id).attributes.find(a=>a.id==='BRAND').value_name,'Original');assert.deepEqual(db.items.get(id).attributes.find(a=>a.id==='UNKNOWN').values,[{id:'k',name:'preservar'}]);assert.equal(db.audits[0].status,'succeeded');assert.deepEqual(db.cached,[id]);
});
test('UP confirma alcance completo e reserva todos os anúncios antes do PUT',async()=>{
 const db=fixture(true),editor=await(await GET(get('pictures'))).json();assert.deepEqual(editor.affectedIds,[id,other].sort());
 assert.equal(editor.maxPictures,6);assert.equal(editor.reason,'');
 const res=await PATCH(patch(editor,['pict-B2','pict-A1']));assert.equal(res.status,200);assert.equal(db.audits.length,2);assert.ok(db.audits.every(a=>a.status==='succeeded'));assert.ok([...db.items.values()].every(item=>item.pictures[0].id==='pict-B2'));
});
test('anúncio de outro vendedor e atributos compartilhados divergentes bloqueiam escrita',async()=>{
 let db=fixture(true);db.items.get(other).seller_id=999;let editor=await(await GET(get())).json();assert.match(editor.reason,/compartilham/);assert.equal((await PATCH(patch(editor,{TEXT:'Depois'}))).status,409);assert.equal(db.puts.length,0);
 db=fixture(true);db.items.get(other).attributes.find(a=>a.id==='BRAND').value_name='Diferente';editor=await(await GET(get())).json();assert.equal((await PATCH(patch(editor,{TEXT:'Depois'}))).status,400);assert.equal(db.puts.length,0);
});
test('catálogo, escopo incompleto, conflito de versão e reserva falha não enviam alterações',async()=>{
 let db=fixture();db.items.get(id).catalog_listing=true;let editor=await(await GET(get())).json();assert.match(editor.reason,/catálogo/);assert.equal((await PATCH(patch(editor,{TEXT:'Outro'}))).status,409);assert.equal(db.puts.length,0);
 db=fixture(true);db.scopeUnknown=true;editor=await(await GET(get())).json();assert.match(editor.reason,/compartilham/);assert.equal((await PATCH(patch(editor,{TEXT:'Outro'}))).status,409);assert.equal(db.puts.length,0);
 db=fixture();editor=await(await GET(get())).json();db.items.get(id).last_updated='externo';db.items.get(id).attributes.find(a=>a.id==='TEXT').value_name='Alteração externa';assert.equal((await PATCH(patch(editor,{TEXT:'Outro'}))).status,409);assert.equal(db.puts.length,0);
 db=fixture();editor=await(await GET(get())).json();db.failAudit=true;assert.equal((await PATCH(patch(editor,{TEXT:'Outro'}))).status,409);assert.equal(db.puts.length,0);
});
test('mudança apenas de last_updated não bloqueia conteúdo intacto; atributos, auditoria e confirmação continuam preservados',async()=>{
 const db=fixture(),editor=await(await GET(get())).json();db.items.get(id).last_updated='metadados atualizados pelo ML';
 const response=await PATCH(patch(editor,{TEXT:'Depois'}));assert.equal(response.status,200);assert.equal(db.puts.length,1);assert.equal(db.audits[0].status,'succeeded');assert.equal(db.items.get(id).attributes.find(a=>a.id==='BRAND').value_name,'Original');
});
test('resultado incerto preserva pendência, bloqueia reenvio e releitura só confirma dados efetivos',async()=>{
 const db=fixture(true),editor=await(await GET(get())).json();db.apply=false;
 let res=await PATCH(patch(editor,{TEXT:'Depois'}));assert.equal(res.status,409);assert.equal((await res.json()).code,'edit_uncertain');assert.equal(db.puts.length,1);assert.ok(db.audits.every(a=>a.status==='uncertain'));
 const fresh=await(await GET(get())).json();assert.ok(db.audits.every(a=>a.status==='uncertain'));assert.equal((await PATCH(patch(fresh,{TEXT:'Depois'}))).status,409);assert.equal(db.puts.length,1);
 for(const item of db.items.values())item.attributes.find(a=>a.id==='TEXT').value_name='Depois';await GET(get());assert.ok(db.audits.every(a=>a.status==='succeeded'));
});
test('fotos usadas em variações não podem ser removidas; upload valida conteúdo e não modifica anúncio',async()=>{
 const db=fixture();db.items.get(id).variations=[{id:1,picture_ids:['pict-B2']}];const editor=await(await GET(get('pictures'))).json();assert.equal((await PATCH(patch(editor,['pict-A1']))).status,400);assert.equal(db.puts.length,0);
 const send=body=>new Request('http://local/',{method:'POST',headers:{authorization:'Bearer manager','content-type':'application/json'},body:JSON.stringify({empresaId:'company',connectionId:'account',id,...body})});
 assert.equal((await upload(send({mime:'image/png',base64:Buffer.from('not a photo').toString('base64')}))).status,400);assert.equal(db.uploads,0);
 const valid=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);const response=await upload(send({mime:'image/png',base64:valid.toString('base64')}));assert.equal(response.status,200);assert.equal(db.uploads,1);assert.equal(db.puts.length,0);
});

 test('catálogo confirmado e informação ausente têm motivos distintos, sem liberar escrita',async()=>{
 let db=fixture();db.items.get(id).catalog_listing=true;let editor=await(await GET(get('pictures'))).json();assert.match(editor.reason,/catálogo confirmado pelo ML/);assert.ok(editor.reason.includes(id));assert.doesNotMatch(editor.reason,/sem permissão confirmada/);
 db=fixture();delete db.items.get(id).catalog_listing;editor=await(await GET(get('pictures'))).json();assert.match(editor.reason,/ML não informou/);assert.doesNotMatch(editor.reason,/catálogo confirmado/);assert.equal((await PATCH(patch(editor,['pict-B2','pict-A1']))).status,409);assert.equal(db.puts.length,0);
 });

test('foto WebP na revisão respeita bloqueio do anúncio antes de qualquer upload',async()=>{const db=fixture(),bytes=await sharp({create:{width:30,height:20,channels:3,background:'blue'}}).webp().toBuffer();const send=()=>new Request('http://local/',{method:'POST',headers:{authorization:'Bearer manager','content-type':'application/json'},body:JSON.stringify({empresaId:'company',connectionId:'account',id,mime:'image/webp',base64:bytes.toString('base64')})});db.items.get(id).catalog_listing=true;assert.equal((await upload(send())).status,409);assert.equal(db.uploads,0);db.items.get(id).catalog_listing=false;assert.equal((await upload(send())).status,200);assert.equal(db.uploads,1);assert.equal(db.puts.length,0);});

test('galeria própria é editável com par de catálogo; catálogo preservado e sem auditoria de envio fictício',async()=>{
 const db=fixture(true);db.items.get(other).catalog_listing=true;
 const before=structuredClone(db.items.get(other));
 const editor=await(await GET(get('pictures'))).json();assert.equal(editor.reason,'');assert.deepEqual(editor.affectedIds,[id]);
 const response=await PATCH(patch(editor,['pict-B2','pict-A1']));assert.equal(response.status,200);
 assert.equal(db.puts.length,1);assert.deepEqual(db.audits.map(a=>a.provider_listing_id),[id]);assert.ok(db.audits.every(a=>a.status==='succeeded'));
 assert.deepEqual(db.items.get(other).pictures,before.pictures);assert.deepEqual(db.items.get(other).attributes,before.attributes);
 const catalog=await(await GET(get('pictures',{id:other}))).json();assert.match(catalog.reason,/catálogo confirmado/);assert.deepEqual(catalog.affectedIds,[other]);
 assert.equal((await PATCH(patch(catalog,['pict-A1'],{id:other,confirmation:other}))).status,409);assert.equal(db.puts.length,1);
 // Campos editáveis do anúncio próprio também não alteram a ficha oficial.
 const attrs=await(await GET(get('attributes'))).json();assert.equal(attrs.reason,'');assert.deepEqual(attrs.affectedIds,[id]);
 assert.equal((await PATCH(patch(attrs,{TEXT:'Novo'}))).status,200);assert.deepEqual(db.items.get(other).attributes,before.attributes);
});
test('par de catálogo não dispensa alcance, confirmação de tipo ou preservação após o envio',async()=>{
 let db=fixture(true);delete db.items.get(other).catalog_listing;let editor=await(await GET(get('pictures'))).json();assert.match(editor.reason,/ML não informou/);assert.equal((await PATCH(patch(editor,['pict-B2','pict-A1']))).status,409);assert.equal(db.puts.length,0);
 db=fixture(true);db.items.get(other).catalog_listing=true;db.scopeUnknown=true;editor=await(await GET(get('pictures'))).json();assert.match(editor.reason,/conferir todos/);assert.equal((await PATCH(patch(editor,['pict-B2','pict-A1']))).status,409);
 db=fixture(true);db.items.get(other).catalog_listing=true;editor=await(await GET(get('pictures'))).json();db.items.get(other).pictures.push({id:'new-cat-photo'});assert.equal((await PATCH(patch(editor,['pict-B2','pict-A1']))).status,409);assert.equal(db.puts.length,0);
 db=fixture(true);db.items.get(other).catalog_listing=true;db.mutateCatalog=true;editor=await(await GET(get('pictures'))).json();assert.equal((await PATCH(patch(editor,['pict-B2','pict-A1']))).status,409);assert.ok(db.audits.every(a=>a.status==='uncertain'));
});
