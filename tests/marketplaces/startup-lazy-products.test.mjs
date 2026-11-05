import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(path,'utf8');
function callback(path,name){
  const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)found=node.initializer.arguments[0];ts.forEachChild(node,visit);};visit(source);
  assert.ok(found,name);
  return ts.transpileModule(`(${found.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
}
const bind=(code,env)=>new Function('env',`with(env){return ${code};}`)(env);

test('Produtos cadastrados lê só o número exato, sem estoque obrigatório nem dependência da lista',async()=>{
  const requests=[],state={},env={companyId:'company',warehouseId:undefined,query:'',publicationFilter:'all',stockAccountId:'',confirmedCountScope:{current:''},confirmedCount:{current:null},countController:{current:null},countCallback:{current:null},active:{current:true},AbortController,AbortSignal,URLSearchParams,Number,JSON,
    setCountLoading:v=>state.loading=v,setCountFailed:v=>state.failed=v,setTotal:v=>state.total=v,
    request:async path=>{requests.push(path);return{total:150000};}};
  const count=bind(callback('app/marketplaces/ProductsStock.tsx','countProducts'),env);
  await count();assert.equal(state.total,150000);assert.equal(state.loading,false);
  const params=new URLSearchParams(requests[0].split('?')[1]);assert.equal(params.get('countOnly'),'1');assert.equal(params.has('warehouseId'),false);
  assert.equal(params.has('page'),false);assert.equal(env.confirmedCount.current,150000);
  env.request=async()=>{throw Error('offline');};await count();assert.equal(state.failed,true);assert.equal(state.loading,false);assert.equal(state.total,150000);
  let finish;env.request=()=>new Promise(resolve=>finish=resolve);const pending=count();env.countController.current.abort();finish({total:999999});await pending;assert.equal(state.total,150000);
  const api=read('app/modules/marketplaces/services/local-products.ts');
  const branch=api.slice(api.indexOf('  // Contagem independente:'),api.indexOf('  let query = scopePublication',api.indexOf('  // Contagem independente:')));
  assert.match(branch,/count:'exact',head:true/);assert.doesNotMatch(branch,/productAllocations|readProductInternalNotes|source_snapshot/);
});

test('lista pesada só inicia após expandir; rerender e recolher não repetem a mesma consulta',()=>{
  const path='app/marketplaces/ProductsStock.tsx',text=read(path),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getText(source).includes('loadedListKey.current===key'))effect=node.arguments[0];ts.forEachChild(node,visit);}visit(source);
  let loads=0;const env={props:{noticeTarget:undefined},detailId:'',creating:false,busy:false,listVisible:false,companyId:'company',warehouseId:undefined,publicationFilter:'all',stockAccountId:'',query:'',page:1,refreshKey:0,noticeProduct:'',loadedListKey:{current:''},JSON,productSearchDelay:()=>0,setTimeout:fn=>{fn();return 1;},clearTimeout(){},load:()=>loads++};
  const run=bind(ts.transpileModule(`(${effect.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,''),env);
  run();assert.equal(loads,0);env.listVisible=true;run();assert.equal(loads,1);run();assert.equal(loads,1);
  env.listVisible=false;env.refreshKey++;run();assert.equal(loads,1);env.listVisible=true;run();assert.equal(loads,2);
  env.noticeProduct='same-product';env.props.noticeTarget={key:'first'};run();assert.equal(loads,3);run();assert.equal(loads,3);
  env.props.noticeTarget={key:'second'};run();assert.equal(loads,4,'nova tentativa do mesmo produto relê o cadastro');
  assert.match(text,/const listVisible = warehouseId \? props.listVisible !== false : expanded/);
  assert.match(text,/page: String\(page\), skipCount:'1'/);
});

test('revalidar permissões preserva iframe do mesmo módulo/perfil; revogação e troca de perfil continuam efetivas',()=>{
  const code=callback('app/gestao/page.tsx','sincronizarModuloEmbutidoPelaUrl');
  const original={id:'marketplaces',nome:'Anúncios',href:'/marketplaces?empresaId=one&__avctx=visual'};let current=original;
  const env={window:{location:{origin:'https://avantalab.com.br',search:'?modulo=marketplaces'}},empresaId:'one',modulosLiberados:['marketplaces'],URL,URLSearchParams,encodeURIComponent,
    obterRegistroModulo:()=>({id:'marketplaces',nome:'Anúncios',navegacao:{modo:'pagina_total',rota:'/marketplaces'}}),setModuloEmbutido:v=>current=typeof v==='function'?v(current):v};
  const sync=bind(code,env);sync();sync();assert.equal(current,original,'não muda objeto/href/key após confirmar acesso');
  env.empresaId='two';sync();assert.equal(current.href,'/marketplaces?empresaId=two');
  env.modulosLiberados=[];sync();assert.equal(current,null,'concessão revogada fecha o módulo');
});

test('preparar anúncio alinha título após DOM e após preparar, sem refresh global de listas',()=>{
  const text=read('app/marketplaces/MarketplacesClient.tsx'),frames=[],calls=[];
  const title={isConnected:true,focus:()=>calls.push('focus')};
  const scroll=bind(callback('app/marketplaces/MarketplacesClient.tsx','scrollToNewListing'),{requestAnimationFrame:fn=>frames.push(fn),document:{getElementById:id=>id==='new-listing-title'?title:null},scrollMarketplacePreparation:el=>{assert.equal(el,title);calls.push('scroll');}});
  scroll();assert.equal(calls.length,0);frames.shift()();assert.deepEqual(calls,['focus','scroll']);
  const handled=callback('app/marketplaces/MarketplacesClient.tsx','handleCopyPrepared');assert.doesNotMatch(handled,/setRefreshKey/);
  assert.match(text,/onCopyHandled=\{handleCopyPrepared\}/);assert.match(text,/id="new-listing-title" tabIndex=\{-1\}/);
});
