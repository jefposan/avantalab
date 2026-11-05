import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);}});
const model=await import('../../app/marketplaces/product-listing-review.ts');
const {pictureAccountPermissions}=await import('../../app/modules/marketplaces/picture-account-permissions.ts');
const {commonAttributeRules}=await import('../../app/modules/marketplaces/product-common-content.ts');
const {contentAttributes,listingContextFields}=await import('../../app/modules/marketplaces/listing-content.ts');hook.deregister();
const {reviewSectionBlock}=await import('../../app/marketplaces/review-quality-goals.ts');
const rule=(id,extra={})=>({id,name:id,type:'string',value:'',valueId:null,editable:true,reason:'',required:false,maxLength:100,options:[],units:[],...extra});
const photo={id:'photo-123',url:'https://http2.mlstatic.com/a.jpg'};
const source={companyId:'company',productId:'product',sourceConnectionId:'a',sourceId:'MLB123456'};
function editors(){
 const result={};
 for(const kind of ['details','attributes','pictures']){
  const attributes=kind==='details'?[rule('TITLE',{value:'Produto'}),rule('DESCRIPTION',{type:'text',maxLength:50000}),rule('LISTING_TYPE',{type:'list',value:'Clássico',valueId:'gold_special',options:[{id:'gold_special',name:'Clássico'}]})]:[rule('COLOR'),rule('POWER',{type:'number_unit',units:['W']}),rule('GTIN',{value:'123',editable:false,reason:'Identidade preservada'})];
  const targets=['a','b'].map((connectionId,index)=>({connectionId,id:index?'MLB654321':source.sourceId,revision:`r-${connectionId}`,affectedIds:[index?'MLB654321':source.sourceId],...(kind==='details'?{details:{values:{title:'Produto',description:'',listingType:'gold_special',price:100+index*50,stock:2},fields:{title:{editable:true},description:{editable:true},listingType:{editable:true}},listingTypes:[{id:'gold_special',name:'Clássico'}]}}:{content:{attributes:structuredClone(attributes),pictures:[photo],reason:'',maxPictures:6,contextFields:[{id:'price',name:'Preço por conta',value:String(100+index*50)}]}})}));
  result[kind]={...source,productId:'product',id:source.sourceId,connectionId:'a',scopeHash:'scope',revision:'rev',kind:kind==='details'?'attributes':kind,title:'Produto',attributes,pictures:[photo],maxPictures:6,affectedIds:targets.map(t=>t.id),destinations:['a','b'],reviewTargets:targets,different:false,restrictions:[]};
 }
 return result;
}
function fixture({blockedKind,conflictKind,failAt,externalAfterFirst=false,scopeMismatch=false}={}){
 const initial=editors(),live=structuredClone(initial),calls=[],progress=[];let writes=0;
 const request=async(path,body,signal,method)=>{
  assert.ok(signal);calls.push({path,body,method});
  if(!body){const kind=new URLSearchParams(path.split('?')[1]).get('kind'),current=structuredClone(live[kind]);if(conflictKind===kind)current.revision='external';if(scopeMismatch)current.scopeHash='different';return current;}
  if(method!=='PATCH')return {scopeHash:'scope',parts:structuredClone(live[body.kind].reviewTargets).map(t=>({...t,content:undefined,details:undefined})),blocked:body.kind===blockedKind?[{connectionId:'b',id:'MLB654321',message:'Bloqueado no catálogo'}]:[]};
  assert.equal(body.confirmation,'product');assert.ok(body.requestKey);assert.equal(body.values.price,undefined);assert.equal(body.values.stock,undefined);writes++;
  if(writes===failAt)throw Error('Resultado incerto');
  // A revisão global muda pela nossa escrita, mas a próxima seção é preservada.
  for(const kind of ['details','attributes','pictures'])live[kind].revision=`own-${writes}`;
  if(externalAfterFirst)live.attributes.reviewTargets[0].content.attributes[0].value='Valor externo';
  return {success:true};
 };
 const draft=model.initialReviewDraft(initial);draft.details.DESCRIPTION='Descrição confirmada';draft.attributes.COLOR='Preto';
 return {initial,draft,calls,progress,request,writes:()=>writes,publish:()=>model.publishListingReview(source,initial,draft,request,r=>progress.push(r))};
}
test('preenchimento é local, responde ao rascunho válido e não usa nem altera a nota do ML',()=>{
 const e=editors(),d=model.initialReviewDraft(e),before=model.draftCoverage(e,d);
 d.attributes.COLOR='Preto';d.attributes.POWER='1200 W';d.details.DESCRIPTION='Descrição';
 const after=model.draftCoverage(e,d);assert.ok(after.score>before.score);assert.equal(after.score,100);assert.equal(e.attributes.attributes.find(a=>a.id==='COLOR').value,'');
 d.attributes.POWER='potente';assert.ok(model.draftCoverage(e,d).score<100);assert.match(model.validateReviewDraft(e,d)['attributes:POWER'],/número e unidade/);
 d.details.TITLE='';assert.match(model.validateReviewDraft(e,d)['details:TITLE'],/não podem ser apagados/);
 d.attributes.GTIN='alterado';assert.ok(!Object.hasOwn(model.reviewChanges(e,d).find(c=>c.kind==='attributes').values,'GTIN'));
});
test('IA só completa vazios editáveis; preserva preenchimento manual, identidade e fotos reorganizadas',()=>{
 const e=editors(),d=model.initialReviewDraft(e);d.attributes.COLOR='Manual';d.pictures=[photo,{id:'photo-456',url:'https://http2.mlstatic.com/b.jpg'}];
 const proposal={suggestions:[{field:'COLOR',value:'Outro'},{field:'POWER',value:'1200 W'},{field:'GTIN',value:'999'},{field:'UNKNOWN',value:'inventado'}],description:'Descrição comprovada',pictures:[photo],pending:[]};
 const result=model.mergeAIReview(e,d,proposal);assert.equal(result.draft.attributes.COLOR,'Manual');assert.equal(result.draft.attributes.POWER,'1200 W');assert.equal(result.draft.attributes.GTIN,'123');assert.equal(result.draft.details.DESCRIPTION,'Descrição comprovada');assert.deepEqual(result.draft.pictures,d.pictures);assert.equal(result.draft.attributes.UNKNOWN,undefined);
 d.details.DESCRIPTION='Manual';assert.equal(model.mergeAIReview(e,d,proposal).draft.details.DESCRIPTION,'Manual');
});
test('abrir a revisão não iguala valores/fotos diferentes sem alteração explícita',()=>{const e=editors();for(const k of ['details','attributes','pictures'])e[k].different=true;e.pictures.reviewTargets[1].content.pictures=[{id:'photo-456',url:'https://http2.mlstatic.com/b.jpg'}];assert.deepEqual(model.reviewChanges(e,model.initialReviewDraft(e)),[]);});
test('recuperação conserva Premium, campos digitados e fotos novas sobre a leitura atual, sem enviar nada',()=>{
 const old=editors(),draft=model.initialReviewDraft(old),current=structuredClone(old);
 for(const e of [old,current])e.details.attributes.find(a=>a.id==='LISTING_TYPE').options.push({id:'gold_pro',name:'Premium'});
 draft.details.LISTING_TYPE='gold_pro';draft.attributes.POWER='100 W';draft.pictures.push({id:'photo-456',url:'https://http2.mlstatic.com/new.jpg'});
 current.attributes.attributes.find(a=>a.id==='COLOR').value='Preto';current.attributes.reviewTargets[0].content.attributes.find(a=>a.id==='COLOR').value='Preto';
 const recovered=model.recoverReviewDraft(old,draft,current);
 assert.equal(recovered.draft.details.LISTING_TYPE,'gold_pro');assert.equal(recovered.draft.attributes.POWER,'100 W');assert.equal(recovered.draft.attributes.COLOR,'Preto');assert.equal(recovered.draft.pictures.length,2);assert.deepEqual(recovered.blocked,[]);
 assert.equal(model.initialReviewDraft(old).details.LISTING_TYPE,'gold_special');assert.equal(current.pictures.pictures.length,1);
});
test('recuperação informa mudança externa no campo e mantém bloqueios de permissão e de alcance',()=>{
 const old=editors(),draft=model.initialReviewDraft(old),current=structuredClone(old);draft.details.DESCRIPTION='Minha descrição';draft.attributes.POWER='100 W';
 current.details.attributes.find(a=>a.id==='DESCRIPTION').value='Descrição externa';current.details.reviewTargets[1].details.values.description='Descrição externa';
 current.attributes.attributes.find(a=>a.id==='POWER').editable=false;current.attributes.attributes.find(a=>a.id==='POWER').reason='Catálogo';current.pictures.scopeHash='outro alcance';
 const recovered=model.recoverReviewDraft(old,draft,current);assert.equal(recovered.draft.details.DESCRIPTION,'Minha descrição');assert.equal(recovered.draft.attributes.POWER,'100 W');assert.ok(recovered.notes.some(n=>n.includes('Descrição externa')));assert.ok(recovered.blocked.some(n=>n.includes('Catálogo')));assert.ok(recovered.blocked.some(n=>n.includes('vinculados mudaram')));
});
test('campos vazios/protegidos e exclusivos de outra conta/fora do esquema permanecem visíveis sem liberar escrita',()=>{
 const common=commonAttributeRules([{attributes:[rule('A')]},{attributes:[rule('A'),rule('B')]}]);assert.equal(common.length,2);assert.equal(common.find(a=>a.id==='B').editable,false);
 const attributes=contentAttributes([{id:'EMPTY',value_type:'string',tags:{}}],[{id:'LEGACY',name:'Legado',value_name:'Preservar'}]);assert.equal(attributes[0].value,'');assert.equal(attributes[1].editable,false);assert.equal(attributes[1].value,'Preservar');
 assert.equal(contentAttributes([{id:'EMPTY',value_type:'string',tags:{}}],[{id:'EMPTY'}])[0].value,'');
 const multi=contentAttributes([{id:'MULTI',value_type:'list',tags:{multivalued:true}},{id:'OLD',value_type:'list',values:[],tags:{}}],[{id:'MULTI',values:[{name:'A'},{name:'B'}]},{id:'OLD',value_id:'historico'}]);assert.equal(multi[0].value,'A · B');assert.equal(multi[0].editable,false);assert.equal(multi[1].value,'historico');
 const fields=listingContextFields({price:150,available_quantity:0,shipping:{free_shipping:false},sale_terms:[{id:'WARRANTY_TIME',name:'Garantia',value_name:'3 meses'}],variations:[{id:1,available_quantity:2,attribute_combinations:[{name:'Cor',value_name:'Preto'}]}]});
 assert.equal(fields.find(f=>f.id==='available_quantity').value,'0');assert.equal(fields.find(f=>f.id==='free_shipping').value,'Não');assert.equal(fields.find(f=>f.id==='term:WARRANTY_TIME').value,'3 meses');assert.match(fields.find(f=>f.id==='variation:1').value,/Preto/);assert.equal(fields.find(f=>f.id==='category_id').value,'');
});
test('valida todas as seções e destinos antes da primeira escrita, sem publicar em restrição ou conflito',async()=>{
 for(const options of [{blockedKind:'attributes'},{conflictKind:'attributes'},{scopeMismatch:true}]){const f=fixture(options);await assert.rejects(f.publish());assert.equal(f.writes(),0);}
 const f=fixture();await f.publish();const firstWrite=f.calls.findIndex(c=>c.method==='PATCH');assert.equal(f.calls.slice(0,firstWrite).filter(c=>c.body&&c.method!=='PATCH').length,2);assert.equal(f.writes(),4);assert.ok(f.progress.at(-1).every(r=>r.status==='confirmed'));assert.equal(new Set(f.calls.filter(c=>c.method==='PATCH').map(c=>c.body.requestKey)).size,4);
});
test('falha/resultado incerto interrompe próximos destinos e seções, preservando confirmações sem retry',async()=>{
 const f=fixture({failAt:2});await assert.rejects(f.publish(),/interrompida/);assert.equal(f.writes(),2);assert.deepEqual(f.progress.at(-1).map(r=>r.status),['confirmed','failed']);assert.equal(f.calls.some(c=>c.method==='PATCH'&&c.body.kind==='attributes'),false);
 const first=fixture({failAt:1});await assert.rejects(first.publish());assert.equal(first.writes(),1);assert.equal(first.progress.at(-1)[1].status,'not_sent');
});
test('revisão global pode mudar por escrita própria, mas alteração externa na próxima seção interrompe envio',async()=>{
 const f=fixture({externalAfterFirst:true});await assert.rejects(f.publish(),/próxima seção mudaram/);assert.equal(f.writes(),2);assert.equal(f.progress.at(-1).length,2);
});
test('baseline das informações ignora taxas e saldos de consulta, mas preserva o conteúdo e permissões de cada destino',()=>{
 const e=editors(),current=structuredClone(e);current.details.reviewTargets[0].details.values.price=300;current.details.reviewTargets[0].details.values.stock=7;current.details.reviewTargets[0].details.listingTypes[0].fee=20;
 assert.equal(model.sectionBaseline(e.details,'details'),model.sectionBaseline(current.details,'details'));
 current.details.reviewTargets[1].details.fields.listingType.editable=false;assert.notEqual(model.sectionBaseline(e.details,'details'),model.sectionBaseline(current.details,'details'));
});
test('releitura exige contexto completo e mesmos vínculos nas três seções',async()=>{
 const f=fixture();const loaded=await model.readReviewEditors(source,f.request,AbortSignal.timeout(1000));assert.equal(loaded.attributes.productId,'product');assert.equal(f.writes(),0);
 await assert.rejects(model.readReviewSection(source,'attributes',async()=>({...editors().attributes,productId:'outro'}),AbortSignal.timeout(1000)),/contexto completo/);
 await assert.rejects(model.readReviewEditors(source,async path=>{const kind=new URLSearchParams(path.split('?')[1]).get('kind');return {...editors()[kind],scopeHash:kind==='details'?'outro':'scope'};},AbortSignal.timeout(1000)),/vínculos mudaram/);
});
test('campos controlados pelo catálogo são visíveis mas não editáveis, e não simulam 100% de melhoria',async()=>{
 const e=editors();for(const k of ['attributes','pictures'])for(const t of e[k].reviewTargets)t.content.reason='Conteúdo definido pelo catálogo';for(const t of e.details.reviewTargets)for(const field of ['title','description','listingType'])t.details.fields[field]={editable:false,reason:'Campo definido pelo catálogo'};
 const loaded=await model.readReviewEditors(source,async path=>structuredClone(e[new URLSearchParams(path.split('?')[1]).get('kind')]),AbortSignal.timeout(1000));
 assert.ok(loaded.attributes.attributes.every(a=>!a.editable));assert.ok(loaded.details.attributes.every(a=>!a.editable));assert.match(loaded.pictures.reason,/catálogo/);assert.equal(model.draftCoverage(loaded,model.initialReviewDraft(loaded)).score,null);
});
function renderReviewMarkup(allListings=false){
 const file=readFileSync('app/marketplaces/ProductListingReview.tsx','utf8'),ast=ts.createSourceFile('Review.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ProductListingReview');
 const e=editors(),d=model.initialReviewDraft(e),queue=[e,d,false,'','','',{},false,null,null,null,[],[],false,0,'attributes',0,'',[],allListings?editors().details.reviewTargets.map(t=>({target:{connection_id:t.connectionId,provider_listing_id:t.id,provider:'mercado_livre'},editor:{values:{price:100},fields:{price:{editable:true}}},error:''})):[],'100,00',false],exports={};let index=0;
 const styles=new Proxy({},{get:(_,key)=>String(key)}),require=createRequire(import.meta.url);
 vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace('export default','export'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,...model,moedaDigitadaParaNumero:()=>100,formatarMoeda:n=>`R$ ${n}`,priceReviewErrors:()=>[],CampoMoeda:({id,value,disabled})=>React.createElement('input',{id,value,disabled,readOnly:true}),reviewSectionBlock,pictureAccountPermissions,RECOMMENDED_PRODUCT_PICTURES:3,ProductPhotoInput:()=>React.createElement('button',{},'Adicionar fotos do computador'),ReviewQualityObjectives:()=>React.createElement('section',{},'O que o Mercado Livre recomenda'),useId:()=>':review:',useState:()=>[queue[index++],()=>{}],useRef:()=>({current:null}),useEffect:()=>{},accountDisplayName:a=>a?.seller_name||'Conta',styles,market:styles,quality:styles,CardExpandidoModal:({children})=>React.createElement('main',{},children),ModalConfirmacao:()=>null,BotaoAcaoCompacto:({children,disabled,onClick,...props})=>React.createElement('button',{disabled,onClick,'aria-label':props['aria-label']},children),MarketplaceSelect:({label,value})=>React.createElement('label',{},label,React.createElement('input',{value,readOnly:true})),ProductThumbnail:({url,name})=>React.createElement('img',{src:url,alt:name}),QualityGauge:({label,score})=>React.createElement('span',{'aria-label':label},score),QualitySummary:()=>React.createElement('span',{},'Nota real indisponível'),CarregamentoDadosModulo:()=>null});
 const html=renderToStaticMarkup(React.createElement(exports.ProductListingReview,{source,allListings,focusSection:'attributes',accounts:[{id:'a',seller_name:'Conta A'},{id:'b',seller_name:'Conta B'}],dark:false,brand:'#003e73',request(){throw Error('Sem rede no render');},onClose(){},onBusy(){},onSaved(){}}));
 return html;
}
test('render completo reúne formulário e resumo, IA no topo, campos protegidos e confirmação separada',()=>{
 const html=renderReviewMarkup();
 assert.match(html,/Ficha técnica editável/);assert.match(html,/<dt>GTIN<\/dt>/);assert.doesNotMatch(html,/<input[^>]+value="123"/);assert.match(html,/Dados preservados e detalhes por conta/);assert.match(html,/Adicionar fotos do computador/);assert.match(html,/Preenchimento do rascunho/);assert.match(html,/não é a nota do ML/);assert.match(html,/Última nota real/);assert.match(html,/Conta A/);assert.match(html,/Conta B/);assert.match(html,/Publicar alterações/);assert.ok(html.indexOf('Completar com IA')<html.indexOf('Informações do anúncio'));assert.match(html,/summaryFloat/);
});
test('cabeçalho da revisão permanece visível enquanto o conteúdo do popup rola',()=>{
 const css=readFileSync('app/marketplaces/product-listing-review.module.css','utf8');
 assert.match(css,/\.header\{position:sticky;top:-24px;/);
 assert.match(css,/\.header\{top:-16px;margin:-16px 0 20px;padding:16px 0 12px;flex-wrap:wrap;/);
});

test('editor de todos abre preço, informações, fotos e ficha técnica juntos, fora dos editores por conta',()=>{
 const html=renderReviewMarkup(true);assert.match(html,/Editar todos os anúncios/);assert.match(html,/Mesmo preço em todas as contas/);assert.match(html,/Informações editáveis/);assert.match(html,/Ficha técnica editável/);assert.match(html,/Fotos do produto/);assert.doesNotMatch(html,/Editar outros campos|O que o Mercado Livre recomenda/);assert.match(html,/<button[^>]*disabled=""[^>]*>Publicar alterações<\/button>/);
 assert.doesNotMatch(html,/<section[^>]*hidden=""[^>]*aria-label="(?:Informações|Fotos|Ficha)/);
 const page=readFileSync('app/marketplaces/Anunciados.tsx','utf8'),individual=readFileSync('app/marketplaces/ListingEditor.tsx','utf8');assert.match(page,/announcedSharedStockActions[\s\S]*Editar todos os anúncios/);assert.match(page,/<ProductListingReview allListings/);assert.doesNotMatch(individual,/Editar preços de todas as contas|ProductListingPrices/);
});
function unifiedFixture(options={}){
 const f=fixture(options),rows=f.initial.details.reviewTargets.map((t,i)=>({target:{connection_id:t.connectionId,provider_listing_id:t.id,provider:'mercado_livre'},editor:{provider:'mercado_livre',id:t.id,revision:'price-'+i,currency:'BRL',values:{price:100+i*50},fields:{price:{editable:true,min:.01,max:1000}}},error:''})),events=[],progress=[];let writes=0;
 const request=async(path,body,signal,method)=>{
  events.push({path,body,method});
  if(path.startsWith('anunciados/editar')){
   const index=rows.findIndex(row=>row.target.provider_listing_id===(body?.id||new URLSearchParams(path.split('?')[1]).get('id')));
   if(method==='PATCH'){writes++;if(options.priceFailure===writes)throw Error('Preço sem confirmação');return {listing:{id:rows[index].target.provider_listing_id,currency:'BRL',price:125},pending:options.pricePending===writes};}
   const editor=structuredClone(rows[index].editor);if(options.priceBlocked===index+1)editor.fields.price={editable:false,reason:'Automatização ativa'};return editor;
  }
  const result=await f.request(path,body,signal,method);if(!body&&writes)result.revision+='-price-update';return result;
 };
 return {...f,events,progress,priceWrites:()=>writes,publish:(onlyPrice=false,selection=rows)=>model.publishListingReview(source,f.initial,onlyPrice?model.initialReviewDraft(f.initial):f.draft,request,r=>progress.push(r),{reviews:selection,price:125})};
}
test('edição única valida conteúdo e preço de todos antes de escrever e mantém revisões após o próprio preço',async()=>{
 const f=unifiedFixture();await f.publish();assert.equal(f.priceWrites(),2);assert.equal(f.writes(),4);
 const first=f.events.findIndex(c=>c.method==='PATCH');assert.equal(f.events.slice(0,first).filter(c=>c.body&&c.method!=='PATCH').length,2);assert.equal(f.events.slice(0,first).filter(c=>c.path.startsWith('anunciados/editar')).length,2);
 assert.equal(f.progress.at(-1).filter(r=>r.kind==='price'&&r.status==='confirmed').length,2);assert.ok(f.progress.at(-1).every(r=>r.status==='confirmed'));
});
test('bloqueio em conteúdo ou preço impede toda escrita; falha parcial de preço interrompe o conteúdo',async()=>{
 for(const options of [{blockedKind:'attributes'},{priceBlocked:2}]){const f=unifiedFixture(options);await assert.rejects(f.publish());assert.equal(f.priceWrites(),0);assert.equal(f.writes(),0);}
 for(const options of [{priceFailure:2},{pricePending:2}]){const f=unifiedFixture(options);await assert.rejects(f.publish(),/interrompido/);assert.equal(f.priceWrites(),2);assert.equal(f.writes(),0);assert.ok(f.progress.at(-1).some(r=>r.kind==='price'&&r.status==='confirmed'));assert.ok(f.progress.at(-1).some(r=>r.kind==='details'&&r.status==='not_sent'));}
});
test('preço sozinho usa a mesma confirmação e exige exatamente todos os destinos oficiais',async()=>{
 const f=unifiedFixture();await f.publish(true);assert.equal(f.priceWrites(),2);assert.equal(f.writes(),0);assert.equal(f.progress.at(-1).length,2);
 const missing=unifiedFixture();await assert.rejects(missing.publish(true,[]));assert.equal(missing.priceWrites(),0);
});
