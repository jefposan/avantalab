import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {removalNeedsDeletion} from '../../app/modules/marketplaces/product-removal.ts';
const require=createRequire(import.meta.url);
test('Anunciados relê após exclusão explícita, respeita empresa e aguarda edição/cópia em andamento',()=>{
 const text=readFileSync('app/marketplaces/Anunciados.tsx','utf8'),source=ts.createSourceFile('Anunciados.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),effects=[];
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect')effects.push(node.arguments[0]);ts.forEachChild(node,visit);};visit(source);
 const context={companyId:'company',PRODUCT_LISTINGS_REMOVED:'removed',MARKETPLACE_ACCOUNT_SYNCED:'synced',CATALOG_CONTENT_CHANGED:'catalog',listingRemovalVersion:0,appliedRemovalVersion:{current:0},expanded:'editing',acting:false,syncing:false,copyingListing:null,loadListRef:{current:()=>reads++},setListingRemovalVersion:fn=>context.listingRemovalVersion=fn(context.listingRemovalVersion)};
 let reads=0;const handlers=new Map();context.window={addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name)};
 const compile=node=>vm.runInNewContext('('+ts.transpileModule(node.getText(source),{}).outputText.replace(/;\s*$/,'')+')',context);
 const cleanup=compile(effects.find(e=>e.getText(source).includes('window.addEventListener(PRODUCT_LISTINGS_REMOVED')))();
 handlers.get('removed')({detail:{companyId:'other'}});assert.equal(context.listingRemovalVersion,0);
 handlers.get('removed')({detail:{companyId:'company'}});const apply=compile(effects.find(e=>e.getText(source).includes('appliedRemovalVersion.current===listingRemovalVersion')));
 apply();assert.equal(reads,0);context.expanded='';context.acting=true;apply();assert.equal(reads,0);context.acting=false;context.copyingListing={id:'copy'};apply();assert.equal(reads,0);
 context.copyingListing=null;context.syncing=true;apply();assert.equal(reads,0);context.syncing=false;apply();assert.equal(reads,1);apply();assert.equal(reads,1);
 handlers.get('synced')({detail:{companyId:'other'}});apply();assert.equal(reads,1);handlers.get('synced')({detail:{companyId:'company'}});apply();assert.equal(reads,2);context.expanded='editing';handlers.get('catalog')({detail:{companyId:'company'}});apply();assert.equal(reads,2);context.expanded='';apply();assert.equal(reads,3);cleanup();assert.equal(handlers.size,0);
});
for(const failure of [null,'second-account','final-check'])test(`excluir somente anúncios preserva cadastro e confere todas as contas: ${failure||'sucesso'}`,async()=>{
 const values=[],refs=[],calls=[],notifications=[],outcomes=[];let cursor=0,rc=0,reviewCount=0;
 const deleted=new Set(),targets=['one','two'].map((id,i)=>({id,connection_id:'account'+i,provider:'mercado_livre',provider_listing_id:'MLB'+i}));
 const exported={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductRemoval.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,AbortController,setTimeout,clearTimeout,crypto:{randomUUID:()=>crypto.randomUUID()},require(name){
  if(name==='react')return {useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){return refs[rc++]??={current:initial};},useEffect(){}};
  if(name==='react/jsx-runtime')return require(name);
  if(name.includes('BotaoAcaoCompacto'))return {default:'button'};
  if(name.endsWith('product-removal'))return {removalNeedsDeletion};
  if(name.endsWith('product-stock-events'))return {notifyProductStockChanged:c=>notifications.push(['stock',c]),notifyProductListingsRemoved:c=>notifications.push(['listings',c])};
  if(name.endsWith('.css'))return {default:{}};
  throw Error(name);
 }});
 const request=async(_url,options)=>{
  const input=JSON.parse(options.body);calls.push(input);
  if(input.action==='review'){
   reviewCount++;return {result:{product:{id:'product',name:'Produto preservado',revision:4},mode:'archived',targets,blockers:[],discoveryBlockers:[],discoveryKey:'scope',workBlocked:false,proofs:targets.map(t=>({linkId:t.id,connectionId:t.connection_id,listingId:t.provider_listing_id,status:deleted.has(t.provider_listing_id)&&!(failure==='final-check'&&reviewCount>1)?'deleted':'active'}))}};
  }
  assert.equal(input.action,'delete_listing','nunca pode chamar remove do cadastro');
  assert.equal(input.acknowledged,true);assert.equal(input.revision,4);assert.equal(input.discoveryKey,'scope');
  if(failure==='second-account'&&input.connectionId==='account1')throw Error('Conta indisponível');
  deleted.add(input.listingId);return {result:{listingId:input.listingId,status:'deleted'}};
 };
 const render=()=>{cursor=rc=0;return exported.default({companyId:'company',productId:'product',preserveProduct:true,request,onRemoved:()=>outcomes.push('PRODUCT_REMOVED'),onListingsRemoved:()=>outcomes.push('LISTINGS_REMOVED')});};
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 let tree=render();const button=name=>all(tree).find(n=>n.type==='button'&&n.props.children===name);
 await button('Excluir anúncios').props.onClick();await new Promise(r=>setImmediate(r));tree=render();
 assert.equal(button('Confirmar exclusão dos anúncios').props.disabled,true,'exige confirmação explícita');
 all(tree).find(n=>n.type==='input').props.onChange({target:{checked:true}});tree=render();assert.equal(button('Confirmar exclusão dos anúncios').props.disabled,false);
 await button('Confirmar exclusão dos anúncios').props.onClick();await new Promise(r=>setImmediate(r));tree=render();
 assert.equal(calls.some(c=>c.action==='remove'),false);assert.equal(outcomes.includes('PRODUCT_REMOVED'),false);
 if(!failure){assert.deepEqual(outcomes,['LISTINGS_REMOVED']);assert.equal(deleted.size,2);assert.equal(reviewCount,2);assert.ok(all(tree).some(n=>n.props?.role==='status'&&/Cadastro, saldos/.test(n.props.children)));}
 else {assert.deepEqual(outcomes,[]);assert.ok(all(tree).some(n=>n.props?.role==='alert'));}
 assert.ok(notifications.some(([kind,company])=>kind==='listings'&&company==='company'),'atualiza Anunciados inclusive quando outra conta falha após exclusão parcial');
});
