import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {changedProductListingFields,proposedListingChanges,seedListingValues,productListingUrl} from '../../app/modules/marketplaces/product-listing-update.ts';
const require=createRequire(import.meta.url);
const product={id:'product',empresa_id:'company',name:'Máquina de costura',description:'Descrição nova',price_cents:30000,ean:null,pictures:[],category_id:'',links:[{id:'a',connection_id:'accountA',provider:'mercado_livre',provider_listing_id:'MLB1',title:'Máquina',source_snapshot:{}},{id:'b',connection_id:'accountB',provider:'mercado_livre',provider_listing_id:'MLB2',title:'Máquina',source_snapshot:{}}]};
test('detecta apenas dados alterados; editar estoque não prepara preço, nem envia referência implicitamente',()=>{
 assert.deepEqual(changedProductListingFields(product,{action:'update',name:product.name,price:300,ean:'',pictures:[],categoryId:''}),[]);
 assert.deepEqual(changedProductListingFields(product,{price:320,quantity:9}),['price_cents']);
 assert.deepEqual(changedProductListingFields(product,{quantity:9,internalNotes:'x'}),[]);
 assert.deepEqual(proposedListingChanges(product,['price_cents'],'price',false),{});
 assert.deepEqual(proposedListingChanges(product,['price_cents'],'price',true),{price:300});
 assert.deepEqual(proposedListingChanges(product,['name','description','price_cents'],'data',true),{title:product.name,description:product.description});
});
test('sugestão respeita permissões do marketplace, mantém campos remotos e não altera editor original',()=>{
 const editor={values:{title:'Original',description:'Texto original',price:200,stock:10,listingType:'gold_special'},fields:{title:{editable:false,reason:'Título de catálogo não editável'},description:{editable:true},price:{editable:true}}};
 const seeded=seedListingValues(editor,{title:'Novo',description:'Texto novo',price:300});
 assert.equal(seeded.values.title,'Original');assert.equal(seeded.values.description,'Texto novo');assert.equal(seeded.values.stock,10);assert.equal(seeded.values.price,300);assert.match(seeded.notice,/catálogo/);
 assert.equal(editor.values.description,'Texto original');assert.equal(editor.values.price,200);
});
test('link do anúncio aceita somente HTTPS do provedor, sem credenciais ou domínio semelhante',()=>{
 for(const url of ['javascript:alert(1)','http://www.mercadolivre.com.br','https://mercadolivre.com.br.evil.test','https://login:password@www.mercadolivre.com.br'])assert.equal(productListingUrl({provider:'mercado_livre',source_snapshot:{permalink:url}}),null);
 assert.equal(productListingUrl({provider:'mercado_livre',source_snapshot:{permalink:'https://produto.mercadolivre.com.br/MLB-123'}}),'https://produto.mercadolivre.com.br/MLB-123');
 assert.equal(productListingUrl({provider:'magalu',source_snapshot:{permalink:'https://www.magazineluiza.com.br/produto/p/123'}}),'https://www.magazineluiza.com.br/produto/p/123');
});
function harness({noLinks=false,closedAds=false,failed=false}={}){
 const values=[],refs=[],effects=[],exports={},calls=[],closed=[],notices=[];let cursor=0,rc=0,first=true;
 const hooks={useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){const i=rc++;return refs[i]??={current:initial};},useEffect(fn){if(first)effects.push(fn);}};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductListingUpdate.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,AbortController,AbortSignal,URLSearchParams,setTimeout,clearTimeout,require(name){
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return require(name);
  if(name.includes('ModalConfirmacao'))return {default:'confirm'};if(name.includes('CardExpandidoModal'))return {default:'dialog'};if(name.includes('BotaoAcaoCompacto'))return {default:'button'};if(name.includes('ListingEditor'))return {default:'editor'};
  if(name.includes('product-listing-update')&&!name.endsWith('.css'))return {proposedListingChanges,productListingUrl};
  if(name.includes('account-identification'))return {accountDisplayName:a=>a?.seller_name||'Conta'};
  if(name.includes('formatters'))return {formatarMoeda:v=>'R$ '+v};if(name.includes('product-stock-events'))return {notifyProductStockChanged(){}};
  if(name.endsWith('.css'))return {default:new Proxy({},{get:(_,k)=>k})};throw Error(name);
 }});
 const request=async(path,body,signal,method)=>{calls.push({path,body,method});if(failed)throw Error('Consulta indisponível');if(path.startsWith('produtos?'))return {product:{...product,links:noLinks?[]:closedAds?product.links.map(l=>({...l,status:'closed'})):product.links}};return {listing:{id:new URLSearchParams(path.split('?')[1]).get('id'),title:'Máquina',price:200,stock:1,permalink:'https://produto.mercadolivre.com.br/MLB-1',substatus:[]}};};
 const render=()=>{cursor=0;rc=0;const t=exports.default({companyId:'company',change:{id:'change',productId:'product',fields:['price_cents']},accounts:[{id:'accountA',seller_name:'Conta A'},{id:'accountB',seller_name:'Conta B'}],request,brand:'#003e73',dark:false,onClose:()=>closed.push(true),onBusyChange(){},onUpdated:()=>notices.push(true)});first=false;return t;};
 return {render,calls,closed,notices,async start(){render();effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));return render();}};
}
const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
test('após salvar: pergunta primeiro; Somente cadastro não faz PATCH nem consulta anúncios remotos',async()=>{
 const h=harness();const tree=await h.start(),question=all(tree).find(n=>n.type==='confirm');assert.equal(question.props.aberto,true);assert.equal(question.props.textoCancelar,'Somente cadastro');question.props.aoCancelar();assert.equal(h.closed.length,1);assert.equal(h.calls.length,1);assert.equal(h.calls[0].body,undefined);
});
test('nenhum anúncio fecha silenciosamente; falha de consulta preserva aviso de cadastro salvo e oferece recuperação',async()=>{
 const empty=harness({noLinks:true});await empty.start();assert.equal(empty.closed.length,1);
 const closed=harness({closedAds:true});await closed.start();assert.equal(closed.closed.length,1);
 const bad=harness({failed:true}),tree=await bad.start();assert.equal(bad.closed.length,0);assert.ok(all(tree).some(n=>n.props?.role==='alert'));assert.ok(all(tree).some(n=>n.props?.children==='Tentar novamente'));assert.equal(bad.calls.length,1);
});
test('produto expandido recupera permalink do cache da mesma empresa/conta e falha de link não esconde cadastro',async()=>{
 const exports={},queries=[];let fail=false;
 vm.runInNewContext(ts.transpileModule(readFileSync('app/modules/marketplaces/services/local-products.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require(name){
  if(name==='server-only')return {};
  if(name.includes('management-access'))return {MarketplaceError:class extends Error{constructor(_status,_code,message){super(message);}}};
  if(name.includes('listing-model'))return {uuidIsValid:()=>true,objectValue:x=>x&&typeof x==='object'?x:{}};
  if(name.includes('product-listing-update'))return {productListingUrl};
  if(name.includes('warehouses'))return {productAllocations:async()=>new Map()};return {};
 }});
 const db={from(table){const q={table,eqs:[]};queries.push(q);return {select(){return this;},eq(...args){q.eqs.push(args);return this;},is(){return this;},in(...args){q.eqs.push(args);return this;},async maybeSingle(){return {data:product};},then(resolve){return Promise.resolve(table==='marketplace_product_links'?{data:[{...product.links[0],source_snapshot:{condition:'new'}}]}:fail?{error:Error('cache indisponível')}:{data:[{connection_id:'accountA',provider_listing_id:'MLB1',provider:'mercado_livre',url:'https://produto.mercadolivre.com.br/MLB-1'}]}).then(resolve);}};}};
 let result=await exports.getLocalProductPresentation(db,'company','product');assert.equal(result.links[0].source_snapshot.permalink,'https://produto.mercadolivre.com.br/MLB-1');assert.equal(result.links[0].source_snapshot.condition,'new');
 const query=queries.find(q=>q.table==='marketplace_listings');assert.deepEqual(query.eqs[0],['empresa_id','company']);assert.equal(query.eqs.some(([k,ids])=>k==='connection_id'&&ids.includes('accountA')),true);
 fail=true;result=await exports.getLocalProductPresentation(db,'company','product');assert.equal(result.id,'product');assert.equal(result.links.length,1);
});
test('escolhe conta sem filtro da lista, preço é opt-in, confirmado e pendente ficam distintos',async()=>{
 const h=harness();let tree=await h.start();all(tree).find(n=>n.type==='confirm').props.aoConfirmar();tree=h.render();
 let buttons=all(tree).filter(n=>n.type==='button'&&[].concat(n.props.children).join('')==='Revisar preço');assert.equal(buttons.length,2);
 await buttons[1].props.onClick();await new Promise(r=>setImmediate(r));tree=h.render();let editor=all(tree).find(n=>n.type==='editor');
 assert.equal(editor.props.accountId,'accountB');assert.deepEqual(editor.props.suggestedChanges,{});assert.ok(h.calls[1].path.includes('connectionId=accountB'));
 editor.props.onClose();tree=h.render();all(tree).find(n=>n.type==='input').props.onChange({target:{checked:true}});tree=h.render();
 await all(tree).filter(n=>n.type==='button'&&[].concat(n.props.children).join('')==='Revisar preço')[0].props.onClick();await new Promise(r=>setImmediate(r));tree=h.render();editor=all(tree).find(n=>n.type==='editor');assert.equal(editor.props.suggestedChanges.price,300);
 editor.props.onSaved({id:'MLB1'},true);tree=h.render();assert.ok(all(tree).some(n=>n.type==='editor'));all(tree).find(n=>n.type==='editor').props.onClose();tree=h.render();assert.ok(all(tree).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('aguardando confirmação')));
 await all(tree).filter(n=>n.type==='button'&&[].concat(n.props.children).join('')==='Revisar preço')[1].props.onClick();await new Promise(r=>setImmediate(r));tree=h.render();all(tree).find(n=>n.type==='editor').props.onSaved({id:'MLB2'},false);tree=h.render();assert.equal(all(tree).some(n=>n.type==='editor'),false);assert.ok(all(tree).some(n=>n.props?.children==='Alterações confirmadas pelo marketplace.'));
 assert.equal(h.calls.some(c=>c.method==='PATCH'||c.body),false,'A revisão nunca envia alterações sozinha');
});
test('edição local bem-sucedida agenda pergunta; editor remoto continua auditado e valida identificação da resposta',()=>{
 const stock=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');assert.match(stock,/await request\(command.action[\s\S]+?if\(active.current&&previousProduct&&listingFields.length\)setListingUpdate/);assert.match(stock,/<ProductListingUpdate/);
 const editor=readFileSync('app/marketplaces/ListingEditor.tsx','utf8');assert.match(editor,/seedListingValues\(result,suggestedChanges\)/);assert.match(editor,/result.listing\?\.id!==itemId/);assert.match(editor,/request\('anunciados\/editar',[\s\S]+?'PATCH'/);
 const linked=readFileSync('app/marketplaces/ProductLinkedListings.tsx','utf8');assert.match(linked,/Abrir anúncio no marketplace/);assert.match(linked,/noopener noreferrer/);
});
