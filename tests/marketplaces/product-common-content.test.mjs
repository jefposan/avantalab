import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);}});
const {commonAttributeRules,detailAttributeRules,commonDetailChanges,commonTargetValues}=await import('../../app/modules/marketplaces/product-common-content.ts');
const {commonProductRequest}=await import('../../app/marketplaces/common-product-request.ts');hook.deregister();
const rule=(id,extra={})=>({id,name:id,type:'string',value:'Original',valueId:null,editable:true,reason:'',required:false,maxLength:60,options:[],units:[],...extra});
const details=(price=100)=>({provider:'mercado_livre',id:'MLB123456',revision:'r',currency:'BRL',values:{title:'Produto original',description:'Descrição original',listingType:'gold_special',price,stock:2},fields:Object.fromEntries(['title','description','listingType','price','stock'].map(k=>[k,{editable:true,maxLength:100}])),listingTypes:[{id:'gold_special',name:'Clássico'}]});
test('regras comuns intersectam permissões, opções e unidades sem liberar identidade protegida',()=>{
 const a={attributes:[rule('GTIN',{editable:false,reason:'Identidade protegida'}),rule('TEXT'),rule('ONLY'),rule('LIST',{type:'list',options:[{id:'a',name:'A'},{id:'b',name:'B'}]}),rule('POWER',{type:'number_unit',units:['W','kW']})]};
 const b={attributes:[rule('GTIN',{editable:false,reason:'Identidade protegida'}),rule('TEXT',{maxLength:20}),rule('LIST',{type:'list',options:[{id:'b',name:'B'}]}),rule('POWER',{type:'number_unit',units:['W']})]};
 const common=commonAttributeRules([a,b]);assert.equal(common.find(a=>a.id==='GTIN').editable,false);assert.equal(common.find(a=>a.id==='ONLY').editable,false);assert.equal(common.find(a=>a.id==='TEXT').maxLength,20);assert.deepEqual(common.find(a=>a.id==='LIST').options,[{id:'b',name:'B'}]);assert.deepEqual(common.find(a=>a.id==='POWER').units,['W']);
});
test('dados únicos nunca incluem preço ou saldo e respeitam bloqueios de qualquer conta',()=>{
 const a=details(100),b=details(250);assert.equal(commonDetailChanges(a,{TITLE:a.values.title}),null);
 assert.deepEqual(commonDetailChanges(b,{TITLE:'Novo título',DESCRIPTION:'Nova descrição'}),{title:'Novo título',description:'Nova descrição'});
 for(const key of ['price','stock','EAN','connectionId'])assert.throws(()=>commonDetailChanges(a,{[key]:'1'}));
 b.fields.title={editable:false,reason:'Título fixo'};assert.equal(detailAttributeRules([a,b]).find(r=>r.id==='TITLE').editable,false);assert.throws(()=>commonDetailChanges(b,{TITLE:'Outro'}),/Título fixo/);
 assert.equal(b.values.price,250);assert.equal(b.values.stock,2);
 const target={details:a};assert.equal(commonTargetValues(target,'details',{DESCRIPTION:'Descrição original'}),null);
});
function clientFixture({fail=false,abort=false}={}){
 const controller=new AbortController(),calls=[],progress=[];const editor={productId:'product',id:'MLB123456',connectionId:'a',scopeHash:'scope',revision:'r'};
 const parts=[{id:'MLB123456',connectionId:'a',revision:'ra',affectedIds:['MLB123456']},{id:'MLB654321',connectionId:'b',revision:'rb',affectedIds:['MLB654321']}];
 const request=async(path,body,signal,method)=>{calls.push({path,body,method});if(!body)return editor;if(method!=='PATCH')return {scopeHash:'scope',parts};assert.equal(body.values.price,undefined);assert.equal(body.values.stock,undefined);if(fail&&body.target.connectionId==='a')throw Error('Recusa simulada');if(abort)controller.abort();return {success:true};};
 const client=commonProductRequest({companyId:'company',productId:'product',kind:'details',sourceConnectionId:'a',sourceId:'MLB123456',request,onProgress:r=>progress.push(r)});
 return {client,calls,progress,controller};
}
test('cliente revisa todos antes de enviar, confirma cada destino uma vez e preserva valores individuais',async()=>{
 const f=clientFixture();await f.client('anunciados/qualidade/conteudo?x');const result=await f.client('anunciados/qualidade/conteudo',{revision:'r',values:{TITLE:'Novo título'}},undefined,'PATCH');assert.equal(result.success,true);
 assert.equal(f.calls[1].method,undefined);assert.equal(f.calls[2].method,'PATCH');assert.equal(f.calls[3].method,'PATCH');assert.notEqual(f.calls[2].body.requestKey,f.calls[3].body.requestKey);assert.ok(f.progress.at(-1).every(r=>r.status==='confirmed'));
});
test('falha parcial e cancelamento não repetem envio nem produzem sucesso geral',async()=>{
 for(const mode of [{fail:true},{abort:true}]){const f=clientFixture(mode);await f.client('anunciados/qualidade/conteudo?x');await assert.rejects(f.client('anunciados/qualidade/conteudo',{revision:'r',values:{TITLE:'Novo'}},f.controller.signal,'PATCH'),/incompleta/);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,mode.abort?1:2);assert.equal(f.progress.at(-1)[mode.abort?1:0].status,mode.abort?'not_sent':'failed');}
});
test('qualidade antecede cadastro e não é duplicada na seção de vínculos',()=>{
 const source=readFileSync(resolve(root,'app/marketplaces/ProductsStock.tsx'),'utf8');assert.ok(source.indexOf('<ProductQuality')<source.indexOf('aria-label="Cadastro do produto"'));assert.match(source,/<ProductLinkedListings showQuality=\{false\}/);
 const component=readFileSync(resolve(root,'app/marketplaces/ProductQuality.tsx'),'utf8');assert.match(component,/<ProductListingReview source=/);assert.match(component,/onBusy=\{onBusy\}/);assert.doesNotMatch(component,/<ListingContentEditor/);
});
test('destino restrito aparece no resultado e não impede envio único ao destino elegível',async()=>{
 const calls=[],progress=[];const editor={productId:'product',id:'MLB123456',connectionId:'a',scopeHash:'scope',revision:'r'};
 const client=commonProductRequest({companyId:'company',productId:'product',kind:'attributes',sourceConnectionId:'a',sourceId:'MLB123456',onProgress:r=>progress.push(r),request:async(path,body,signal,method)=>{
  calls.push({path,body,method});if(!body){assert.match(path,/localDraft=true/);return editor;}
  if(method!=='PATCH'){assert.equal(body.localDraft,true);return {scopeHash:'scope',parts:[{connectionId:'b',id:'MLB654321',revision:'rb',affectedIds:['MLB654321']}],blocked:[{connectionId:'a',id:'MLB123456',message:'Catálogo do ML'}]};}
  assert.equal(body.target.id,'MLB654321');return {success:true};
 }});
 await client('anunciados/qualidade/conteudo?x');await assert.rejects(client('anunciados/qualidade/conteudo',{revision:'r',values:{TEXT:'Novo'}},undefined,'PATCH'),e=>e.code==='common_partial');assert.equal(calls.filter(c=>c.method==='PATCH').length,1);assert.deepEqual(progress.at(-1).map(r=>r.status),['not_sent','confirmed']);assert.match(progress.at(-1)[0].message,/Catálogo/);
});
