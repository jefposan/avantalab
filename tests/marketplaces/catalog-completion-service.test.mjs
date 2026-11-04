import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),data=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export{}');
 if(s==='./management-access')return data('export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}');
 if(s==='./local-products')return data('export async function getLocalProduct(db,c,id){if(c!=="company"||id!=="product")throw Error("Outro produto");return structuredClone(db.product)}');
 if(s==='./mercadolivre-management')return data('export async function loadConnection(db,c,id){if(c!=="company"||id!=="account")throw Error("Outra conta");return {id,seller_reference:"123",empresa_id:c}};export async function mlRequest(db,c,path){db.reads.push(path);return structuredClone(db.items.get(path.split("/")[2]))}');
 if(s==='./mercadolivre-catalog')return data('export async function identifyMercadoLivreCatalog(db,c,input){db.queries.push(input);return structuredClone(db.catalog)}');
 if(s==='./listing-content'&&c.parentURL?.includes('/services/'))return data(`export async function readListingContent(db,c,conn,id,kind){return {id,kind,revision:'r'.repeat(64),affectedIds:db.scope||[id],reason:db.contentBlock||'',maxPictures:12,pictures:db.items.get(id).pictures,attributes:[{id:'TEXT',name:'Texto',type:'string',value:db.text,editable:true,valueId:null,maxLength:50,options:[],units:[]}]}};export async function saveListingContent(db,c,conn,actor,input){if(db.failWrite)throw Error('Resposta incerta');db.writes.push(input);if(input.kind==='pictures')db.items.get(input.id).pictures=input.values.map(id=>({id,url:'https://http2.mlstatic.com/'+id+'.jpg'}));else db.text=input.values.TEXT;return {success:true}}`);
 if(s==='./mercadolivre-editor')return data(`export async function readCommonMercadoLivreEditor(db,c,id){return {id,revision:'r'.repeat(64),fields:{description:{editable:true},title:{editable:true,maxLength:60}},values:{description:db.description,title:db.title||"Manual"}}};export async function saveCommonMercadoLivreEditor(db,c,a,input){if(db.failWrite)throw Error('Resposta incerta');db.writes.push(input);if(input.changes.description!==undefined)db.description=input.changes.description;if(input.changes.title!==undefined)db.title=input.changes.title;return {listing:{id:input.id}}}`);
 const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {completeCatalogStep,resumeCatalogCompletion}=await import('../../app/modules/marketplaces/services/catalog-completion.ts');const {previewFullCatalog,confirmFullCatalog}=await import('../../app/modules/marketplaces/services/catalog-full.ts');hooks.deregister();
function fixture(){
 const item={id:'MLB123456',seller_id:123,catalog_listing:false,status:'active',condition:'new',title:'Liquidificador',attributes:[{id:'GTIN',value_name:'7896347195829'}],pictures:[{id:'manual-cover',url:'https://manual.com/capa.jpg'}],variations:[]};
 const db={product:{id:'product',name:'Liquidificador',ean:'7896347195829',revision:1,attributes:[],pictures:['https://manual.com/capa.jpg'],description:'',publication_form:{},catalog_product_id:''},job:{empresa_id:'company',product_id:'product',actor_id:'actor',state:'pending',progress:{}},items:new Map([['MLB123456',item],['MLB654321',{...structuredClone(item),id:'MLB654321',catalog_listing:true}]]),queries:[],reads:[],writes:[],local:[],text:'',description:'',failWrite:false,
 catalog:{status:'found',product:{id:'MLB999',name:'Liquidificador',description:'Descrição do catálogo',raw:{attributes:[{id:'GTIN',value_name:'7896347195829'},{id:'TEXT',name:'Texto',value_name:'Oficial'}],pictures:[{id:'photo-catalog',secure_url:'https://http2.mlstatic.com/photo-catalog.jpg'}]}}},
 async rpc(name,args){if(name==='marketplace_catalog_completion_claim'){if(db.job.state!=='pending')return {data:null};db.job.state='processing';db.job.lease_owner=args.p_owner;return {data:structuredClone(db.job)}}if(name==='marketplace_catalog_apply_full_local'){db.local.push(args);db.product.revision++;return{data:true}}if(name==='marketplace_catalog_complete_local'){db.local.push(args);return{data:true}}throw Error(name);},
 from(table){let update=null;const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},gt(){return q},order(){return q},limit(){return q},update(v){update=v;return q},then(done){
  if(table==='marketplace_connections')return Promise.resolve({data:[{id:'account'}]}).then(done);
  if(table==='marketplace_product_links')return Promise.resolve({data:[{connection_id:'account',provider_listing_id:'MLB123456',status:'active'},{connection_id:'account',provider_listing_id:'MLB654321',status:'active'}]}).then(done);
  assert.equal(table,'marketplace_catalog_completion');assert.ok(filters.some(([k,v])=>k==='empresa_id'&&v==='company'));assert.ok(filters.some(([k,v])=>k==='lease_owner'&&v===db.job.lease_owner));Object.assign(db.job,structuredClone(update));return Promise.resolve({data:[{product_id:'product'}]}).then(done);
 }};return q;}
 };return db;
}
async function drain(db){for(let i=0;i<30;i++){const result=await completeCatalogStep(db,'company');if(!result.worked)return;}throw Error('Fila não terminou');}
test('sincronizações seguintes preservam a galeria personalizada sem readicionar fotos removidas',async()=>{
 const db=fixture();db.job.photo_policy='custom';await drain(db);assert.deepEqual(db.local[0].p_data.pictures,[]);assert.ok(!db.writes.some(w=>w.kind==='pictures'));assert.equal(db.items.get('MLB123456').pictures[0].id,'manual-cover');
});
test('padrão e personalização enviam somente fotos escolhidas, com a capa na primeira posição',async()=>{
 for(const photoMode of ['catalog','custom']){const db=fixture();db.job.progress={full:true,expectedRevision:1,source:{id:'MLB999',name:'Oficial',ean:db.product.ean,description:'Descrição',attributes:[],photoMode,pictures:[{id:'photo-second',url:'https://http2.mlstatic.com/segunda.jpg'},{id:'photo-first',url:'https://http2.mlstatic.com/primeira.jpg'}]}};await drain(db);assert.deepEqual(db.writes.find(w=>w.kind==='pictures').values,['photo-second','photo-first']);assert.equal(db.items.get('MLB654321').pictures[0].id,'manual-cover');}
});
test('confirmação aceita seleção própria conhecida e rejeita fotos arbitrárias ou duplicadas',async()=>{
 const db=fixture(),preview=await previewFullCatalog(db,'company','product');let saved;db.rpc=async(name,args)=>{assert.equal(name,'marketplace_catalog_confirm_full');saved=args;return{error:null}};
 const body={productId:'product',revision:1,fingerprint:preview.fingerprint,confirm:true,photoMode:'custom',photos:[{id:'photo-catalog',url:'https://http2.mlstatic.com/photo-catalog.jpg'}]};await confirmFullCatalog(db,'company','actor',body);assert.equal(saved.p_source.photoMode,'custom');assert.equal(saved.p_source.pictures.length,1);
 saved=null;await assert.rejects(confirmFullCatalog(db,'company','actor',{...body,photos:[{id:'arbitrary-photo',url:'https://http2.mlstatic.com/forjada.jpg'}]}),/Adicione novamente/);assert.equal(saved,null);
 await assert.rejects(confirmFullCatalog(db,'company','actor',{...body,photos:[...body.photos,...body.photos]}),/repetidas/);await assert.rejects(confirmFullCatalog(db,'company','actor',{...body,photos:[]}),/1 e 12/);
 await confirmFullCatalog(db,'company','actor',{...body,photoMode:'catalog',photos:[{id:'forjada'}]});assert.equal(saved.p_source.photoMode,'catalog');assert.equal(saved.p_source.pictures[0].id,'photo-catalog');
});
test('cron delega a seleção à função que confere permissão; ator antigo não bloqueia outra empresa',async()=>{
 let called=false;const result=await resumeCatalogCompletion({from(){throw Error('Não deve fixar a primeira empresa por ator antigo');},async rpc(name,args){called=true;assert.equal(name,'marketplace_catalog_completion_claim');assert.equal(args.p_company,null);assert.equal(args.p_full_capable,true);return{data:null};}});assert.equal(called,true);assert.equal(result.worked,false);
});
test('detalhe sem GTIN usa prova da busca exata tanto no complemento quanto na prévia completa',async()=>{
 const db=fixture();db.catalog.product.raw.attributes=db.catalog.product.raw.attributes.filter(a=>a.id!=='GTIN');db.catalog.identifierEvidence={ean:db.product.ean,productId:db.catalog.product.id};
 const preview=await previewFullCatalog(db,'company','product');assert.equal(preview.source.ean,db.product.ean);await drain(db);assert.equal(db.job.state,'completed');assert.equal(db.local.length,1);assert.equal(db.writes.length,3);
});
test('prévia não grava; confirmação usa somente ficha relida no servidor e rejeita revisão/ficha antiga',async()=>{
 const db=fixture(),preview=await previewFullCatalog(db,'company','product');assert.equal(db.local.length,0);assert.equal(db.writes.length,0);assert.equal(preview.pictures[0].url,'https://http2.mlstatic.com/photo-catalog.jpg');
 const rpc=db.rpc;let queued;db.rpc=async(name,args)=>{if(name!=='marketplace_catalog_confirm_full')return rpc(name,args);queued=args;return{error:null};};
 await assert.rejects(confirmFullCatalog(db,'company','actor',{productId:'product',revision:1,fingerprint:preview.fingerprint}),/Confira a prévia/);assert.equal(queued,undefined);
 await confirmFullCatalog(db,'company','actor',{productId:'product',revision:1,fingerprint:preview.fingerprint,confirm:true,source:{name:'Injetado'},price:1});assert.equal(queued.p_source.name,'Liquidificador');assert.equal(queued.p_actor,'actor');assert.equal(queued.p_source.price,undefined);
 queued=undefined;db.product.revision++;await assert.rejects(confirmFullCatalog(db,'company','actor',{productId:'product',revision:1,fingerprint:preview.fingerprint,confirm:true}),/cadastro ou a ficha mudou/);assert.equal(queued,undefined);
 db.product.revision=1;db.catalog.product.description='Ficha atualizada';await assert.rejects(confirmFullCatalog(db,'company','actor',{productId:'product',revision:1,fingerprint:preview.fingerprint,confirm:true}),/cadastro ou a ficha mudou/);assert.equal(queued,undefined);
});
test('ficha completa só substitui após confirmação; capa do catálogo primeiro, dados comerciais e anúncio de catálogo protegidos',async()=>{
 const db=fixture();db.text='Texto manual';db.description='Descrição manual';db.product.description='Descrição manual';
 db.job.progress={full:true,expectedRevision:1,source:{id:'MLB999',name:'Liquidificador oficial',ean:db.product.ean,description:'Descrição oficial',attributes:[{id:'TEXT',name:'Texto',value:'Oficial'}],pictures:[{id:'photo-catalog',url:'https://http2.mlstatic.com/photo-catalog.jpg'}]}};
 await drain(db);assert.equal(db.job.state,'completed');assert.equal(db.local.length,1);assert.equal(db.local[0].p_data,undefined);
 assert.deepEqual(db.writes.find(w=>w.kind==='pictures').values,['photo-catalog','manual-cover']);assert.equal(db.text,'Oficial');assert.equal(db.description,'Descrição oficial');assert.equal(db.title,'Liquidificador oficial');assert.ok(db.writes.every(w=>w.id==='MLB123456'));assert.equal(db.items.get('MLB654321').pictures[0].id,'manual-cover');assert.ok(db.writes.every(w=>!Object.keys(w.changes||{}).some(k=>['price','stock','listingType'].includes(k))));
});
test('confirmação antiga e edição durante a fila interrompem a substituição',async()=>{
 const db=fixture();db.job.progress={full:true,expectedRevision:0,source:{id:'MLB999',name:'Produto',ean:db.product.ean,description:'Catálogo',pictures:[],attributes:[]}};await drain(db);assert.equal(db.local.length,0);assert.equal(db.writes.length,0);assert.match(db.job.issue,/cadastro mudou/);
 const next=fixture();next.job.progress={full:true,expectedRevision:1,source:{id:'MLB999',name:'Produto',ean:next.product.ean,description:'Catálogo',pictures:[],attributes:[]}};await completeCatalogStep(next,'company');next.product.revision++;await drain(next);assert.equal(next.writes.length,0);assert.match(next.job.issue,/cadastro mudou/);
});
test('complementa cadastro e campos vazios do anúncio próprio; catálogo, dados comerciais e capa preservados',async()=>{
 const db=fixture();await drain(db);assert.equal(db.job.state,'completed');assert.equal(db.local.length,1);assert.equal(db.local[0].p_data.pictures[0],'https://http2.mlstatic.com/photo-catalog.jpg');
 assert.equal(db.writes.length,3);assert.ok(db.writes.every(w=>w.id==='MLB123456'));const photos=db.writes.find(w=>w.kind==='pictures');assert.deepEqual(photos.values,['manual-cover','photo-catalog']);assert.deepEqual(db.writes.find(w=>w.kind==='attributes').values,{TEXT:'Oficial'});assert.deepEqual(db.writes.find(w=>w.changes).changes,{description:'Descrição do catálogo'});
 assert.equal(db.items.get('MLB654321').pictures.length,1);assert.ok(db.writes.every(w=>!JSON.stringify(w).includes('price')&&!JSON.stringify(w).includes('stock')));await drain(db);assert.equal(db.writes.length,3);
});
test('valores já preenchidos no anúncio nunca são reenviados nem sobrescritos',async()=>{const db=fixture();db.text='Texto manual';db.description='Minha descrição';db.items.get('MLB123456').pictures.push({id:'photo-catalog',url:'https://http2.mlstatic.com/photo-catalog.jpg'});await drain(db);assert.equal(db.writes.length,0);assert.equal(db.text,'Texto manual');assert.equal(db.description,'Minha descrição');});
test('EAN/variante ambíguos não geram gravação local ou remota',async()=>{
 for(const change of [db=>db.catalog.status='choose',db=>db.catalog.product.raw.attributes[0].value_name='7896006214007',db=>db.product.attributes=[{id:'VOLTAGE',name:'Voltagem',value:'220 V'}]]){const db=fixture();change(db);await drain(db);assert.equal(db.local.length,0);assert.equal(db.writes.length,0);assert.equal(db.job.state,'skipped');}
});
test('resposta incerta interrompe e mantém conferência obrigatória, sem reenvio ou próximas seções',async()=>{const db=fixture();await completeCatalogStep(db,'company');db.failWrite=true;await completeCatalogStep(db,'company');assert.equal(db.job.state,'review_required');assert.match(db.job.issue,/nenhum reenvio/);await drain(db);assert.equal(db.writes.length,0);});
test('anúncio próprio com EAN divergente e alcance externo permanecem preservados',async()=>{let db=fixture();await completeCatalogStep(db,'company');db.items.get('MLB123456').attributes[0].value_name='7896006214007';await drain(db);assert.equal(db.writes.length,0);assert.match(db.job.progress.notes.join(' '),/EAN do anúncio/);});

test('dados locais divergentes não são substituídos pela versão do catálogo no anúncio vazio',async()=>{const db=fixture();db.product.description='Descrição que escrevi';db.product.attributes=[{id:'TEXT',name:'Texto',value:'Meu valor'}];await drain(db);assert.equal(db.writes.length,1);assert.equal(db.writes[0].kind,'pictures');assert.equal(db.product.description,'Descrição que escrevi');assert.equal(db.product.attributes[0].value,'Meu valor');});
test('alcance externo bloqueia antes de qualquer envio; anúncio excluído não vira pendência',async()=>{let db=fixture();db.scope=['MLB123456','MLB999999'];await drain(db);assert.equal(db.writes.length,0);assert.equal(db.job.state,'skipped');assert.match(db.job.issue,/fora dos vínculos/);db=fixture();db.items.get('MLB123456').status='closed';await drain(db);assert.equal(db.writes.length,0);assert.equal(db.job.issue,null);assert.ok(!db.job.progress.notes?.length);});
