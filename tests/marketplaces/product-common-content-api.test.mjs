import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const data=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const access=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='manage'||id!=='company'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.commonDb,empresaId:id,usuario:{id:'actor'}}}`;
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export {}');if(s==='next/server')return data('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return data(access);
 if(s==='./local-products')return data(`export async function getLocalProduct(db,company,id){if(id!=='product'||company!=='company')throw Object.assign(Error('Produto não encontrado'),{status:404});return {id,name:'Produto'}}`);
 if(s==='./mercadolivre-management')return data(`export async function loadConnection(db,company,conn){if(company!=='company')throw Error('Empresa incorreta');return {id:conn,empresa_id:company}}`);
 if(s==='./mercadolivre-editor')return data(`export async function readCommonMercadoLivreEditor(db,connection,id){return structuredClone(db.editors.get(connection.id+':'+id))};export async function saveCommonMercadoLivreEditor(db,connection,actor,input){db.writes.push({conn:connection.id,actor,input});Object.assign(db.editors.get(connection.id+':'+input.id).values,input.changes);return {listing:{id:input.id}}}`);
 if(s==='./listing-content'&&c.parentURL?.includes('/services/'))return data(`export async function readListingContent(db,company,conn,id){return structuredClone(db.contents.get(conn+':'+id))};export async function previewListingContent(db,company,conn,input){db.previews.push(conn);if(db.rejectPreview===conn)throw Object.assign(Error('Validação recusada'),{status:400})};export async function saveListingContent(db,company,conn,actor,input){db.writes.push({conn,actor,input});return {success:true}}`);
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {GET,POST,PATCH}=await import('../../app/api/modulos/marketplaces/produtos/qualidade/route.ts');hook.deregister();
function fixture(){
 const db={links:[],contents:new Map(),editors:new Map(),writes:[],previews:[],rejectPreview:'',from(table){assert.equal(table,'marketplace_product_links');const q={select(){return q},eq(){return q},order(){return q},limit(){return q},then(resolve){resolve({data:db.links,error:null})}};return q}};
 for(const [conn,id,price]of [['a','MLB123456',100],['b','MLB654321',200]]){db.links.push({id:conn,provider:'mercado_livre',connection_id:conn,provider_listing_id:id,status:'active'});db.contents.set(`${conn}:${id}`,{id,connectionId:conn,kind:'attributes',revision:`rev-${conn}`,title:'Produto',affectedIds:[id],reason:'',maxPictures:6,pictures:[{id:'pict-A1',url:''}],attributes:[{id:'TEXT',name:'Texto',type:'string',value:conn,valueId:null,editable:true,reason:'',required:false,maxLength:50,options:[],units:[]}]});db.editors.set(`${conn}:${id}`,{id,provider:'mercado_livre',revision:`rev-${conn}`,values:{title:'Título original',description:'Descrição',listingType:'gold_special',price,stock:2},fields:Object.fromEntries(['title','description','listingType','price','stock'].map(f=>[f,{editable:true,maxLength:100}])),listingTypes:[{id:'gold_special',name:'Clássico'}]});}
 globalThis.commonDb=db;return db;
}
const common={empresaId:'company',productId:'product',kind:'attributes',sourceConnectionId:'a',sourceId:'MLB123456'};
const req=(method='GET',extra={},token='manager')=>new Request('http://local/'+(method==='GET'?'?'+new URLSearchParams({...common,...extra}):''),{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify({...common,...extra})})});
test('gestão/empresa/produto isolados; leitura não altera anúncios e revisão valida todos antes da escrita',async()=>{
 const db=fixture();assert.equal((await GET(req('GET',{},'viewer'))).status,403);assert.equal((await GET(req('GET',{productId:'other'}))).status,404);let response=await GET(req());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const editor=await response.json();assert.equal(editor.different,true);assert.equal(editor.affectedIds.length,2);assert.equal(db.writes.length,0);
 db.rejectPreview='b';response=await POST(req('POST',{revision:editor.revision,values:{TEXT:'Único'}}));assert.equal(response.status,400);assert.deepEqual(db.previews,['a','b']);assert.equal(db.writes.length,0);
});
test('revisão revalida vínculos e alcance de UP; destino alheio e preço são rejeitados',async()=>{
 let db=fixture(),editor=await(await GET(req())).json();db.links.pop();assert.equal((await POST(req('POST',{revision:editor.revision,values:{TEXT:'Único'}}))).status,409);assert.equal(db.writes.length,0);
 db=fixture();db.contents.get('a:MLB123456').affectedIds.push('MLB999999');assert.equal((await GET(req())).status,409);
 db=fixture();editor=await(await GET(req('GET',{kind:'details'}))).json();assert.equal((await POST(req('POST',{kind:'details',revision:editor.revision,values:{price:99}}))).status,400);assert.equal(db.writes.length,0);
});
test('aplica somente dados comuns confirmados, sem preço/saldo; mudança entre revisão e envio bloqueia',async()=>{
 const db=fixture(),editor=await(await GET(req('GET',{kind:'details'}))).json();const review=await(await POST(req('POST',{kind:'details',revision:editor.revision,values:{TITLE:'Título único'}}))).json();assert.equal(review.parts.length,2);assert.equal(db.writes.length,0);
 const payload={kind:'details',values:{TITLE:'Título único'},scopeHash:review.scopeHash,target:review.parts[0],confirmation:'product',requestKey:crypto.randomUUID()};assert.equal((await PATCH(req('PATCH',{...payload,confirmation:'wrong'}))).status,400);assert.equal(db.writes.length,0);
 assert.equal((await PATCH(req('PATCH',payload))).status,200);assert.deepEqual(db.writes[0].input.changes,{title:'Título único'});assert.equal(db.editors.get('a:MLB123456').values.price,100);assert.equal(db.editors.get('b:MLB654321').values.price,200);assert.equal(db.editors.get('a:MLB123456').values.stock,2);
 db.links.pop();assert.equal((await PATCH(req('PATCH',{...payload,target:review.parts[1],requestKey:crypto.randomUUID()}))).status,409);assert.equal(db.writes.length,1);
});
test('plataforma não homologada nunca é ignorada para aparentar aplicação em todas as contas',async()=>{const db=fixture();db.links[1].provider='magalu';assert.equal((await GET(req())).status,409);assert.equal(db.writes.length,0);});
test('revisão completa expõe valores por conta só após autorização e sem escrita',async()=>{const db=fixture();assert.equal((await GET(req('GET',{includeTargets:'true'},'viewer'))).status,403);const plain=await(await GET(req())).json();assert.equal(plain.reviewTargets,undefined);const complete=await(await GET(req('GET',{kind:'details',includeTargets:'true'}))).json();assert.equal(complete.reviewTargets.length,2);assert.deepEqual(complete.reviewTargets.map(t=>t.details.values.price),[100,200]);assert.equal(db.writes.length,0);});
test('IA não pode substituir campo que passou a ter valor em qualquer conta',async()=>{const db=fixture();const editor=await(await GET(req())).json();const response=await POST(req('POST',{onlyMissing:true,revision:editor.revision,values:{TEXT:'IA'}}));assert.equal(response.status,409);assert.equal(db.writes.length,0);assert.equal(db.previews.length,0);});

test('rascunho permite preparo com restrição, mas revisão isola destino bloqueado e PATCH mantém proteção',async()=>{
 const db=fixture();db.contents.get('a:MLB123456').reason='Conteúdo controlado pelo catálogo do ML.';
 const editor=await(await GET(req('GET',{localDraft:'true'}))).json();assert.equal(editor.reason,'');assert.equal(editor.restrictions[0].id,'MLB123456');assert.match(editor.restrictions[0].message,/catálogo/);assert.equal(editor.attributes[0].editable,true);assert.equal(db.writes.length,0);
 const review=await(await POST(req('POST',{localDraft:true,revision:editor.revision,values:{TEXT:'Novo texto'}}))).json();assert.deepEqual(review.parts.map(p=>p.id),['MLB654321']);assert.equal(review.blocked[0].id,'MLB123456');assert.match(review.blocked[0].message,/catálogo/);assert.equal(db.writes.length,0);
 db.contents.get('a:MLB123456').affectedIds.push('MLB999999');
 const draft=await(await GET(req('GET',{localDraft:'true'}))).json();assert.ok(draft.restrictions.some(r=>/fora deste produto/.test(r.message)));
 const fake={connectionId:'a',id:'MLB123456',revision:'rev-a',affectedIds:['MLB123456','MLB999999']};
 assert.equal((await PATCH(req('PATCH',{localDraft:true,scopeHash:draft.scopeHash,target:fake,values:{TEXT:'Novo'},confirmation:'product',requestKey:crypto.randomUUID()}))).status,409);assert.equal(db.writes.length,0);
});
test('rascunho não autoriza preço, estoque ou campo protegido; restrição de título não bloqueia destino elegível',async()=>{
 const db=fixture();db.editors.get('a:MLB123456').fields.title={editable:false,reason:'Nome de catálogo controlado pelo ML',maxLength:100};
 const editor=await(await GET(req('GET',{kind:'details',localDraft:'true'}))).json();assert.equal(editor.attributes.find(a=>a.id==='TITLE').editable,true);assert.ok(editor.restrictions.some(r=>/catálogo/.test(r.message)));
 for(const field of ['price','stock','EAN'])assert.equal((await POST(req('POST',{kind:'details',localDraft:true,revision:editor.revision,values:{[field]:'10'}}))).status,400);
 const review=await(await POST(req('POST',{kind:'details',localDraft:true,revision:editor.revision,values:{TITLE:'Novo título'}}))).json();assert.deepEqual(review.parts.map(p=>p.id),['MLB654321']);assert.match(review.blocked[0].message,/catálogo/);assert.equal(db.writes.length,0);
});
test('fotos por conta: valida só destinos elegíveis, preserva capa/galeria e impede destino bloqueado ou alheio',async()=>{
 const db=fixture();db.contents.get('a:MLB123456').reason='Conteúdo controlado pelo catálogo';db.contents.get('b:MLB654321').pictures=[{id:'cover-b',url:''},{id:'manual-b',url:''}];
 const e=await(await GET(req('GET',{kind:'pictures',localDraft:'true'}))).json();const command={kind:'pictures',localDraft:true,appendPictures:true,pictureTargets:['b:MLB654321'],revision:e.revision,values:['new-photo']};
 const response=await POST(req('POST',command));assert.equal(response.status,200);const checked=await response.json();assert.deepEqual(checked.parts.map(p=>p.id),['MLB654321']);assert.equal(checked.blocked.length,0);assert.deepEqual(db.previews,['b']);assert.equal(db.writes.length,0);
 const apply={...command,target:checked.parts[0],scopeHash:e.scopeHash,confirmation:'product',requestKey:crypto.randomUUID()};assert.equal((await PATCH(req('PATCH',apply))).status,200);assert.equal(db.writes.length,1);assert.deepEqual(db.writes[0].input.values,['cover-b','manual-b','new-photo']);
 assert.equal((await POST(req('POST',{...command,pictureTargets:['a:MLB123456']}))).status,409);assert.equal((await POST(req('POST',{...command,pictureTargets:['other:MLB777777']}))).status,409);assert.equal(db.writes.length,1);
 db.contents.get('b:MLB654321').revision='changed';assert.equal((await PATCH(req('PATCH',{...apply,requestKey:crypto.randomUUID()}))).status,409);assert.equal(db.writes.length,1);
});
test('fotos por conta não ignoram alcance externo nem selecionam metade de um grupo compartilhado',async()=>{
 const db=fixture();const a=db.contents.get('a:MLB123456');a.affectedIds.push('MLB999999');const e=await(await GET(req('GET',{kind:'pictures',localDraft:'true'}))).json();const cmd={kind:'pictures',localDraft:true,appendPictures:true,pictureTargets:['a:MLB123456'],revision:e.revision,values:['new-photo']};assert.equal((await POST(req('POST',cmd))).status,409);assert.equal(db.writes.length,0);assert.equal(db.previews.length,0);
});
