import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {scrollMarketplacePageTop} from '../../app/marketplaces/scroll-panel-row.ts';

test('paginação alinha card real do estoque sob cabeçalho/seletor; PWA respeita topbar, foco e movimento reduzido',()=>{
 const previous={window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 try{
  for(const mobile of [false,true])for(const reduced of [false,true]){
   const frames=[],calls=[],focus=[],canceled=[];
   globalThis.requestAnimationFrame=fn=>{frames.push(fn);return 7;};globalThis.cancelAnimationFrame=id=>canceled.push(id);
   globalThis.window={scrollY:1000,matchMedia:()=>({matches:reduced}),scrollTo:v=>calls.push(v)};
   const card={getBoundingClientRect:()=>({top:400}),querySelector:()=>({focus:v=>focus.push(v)}),closest:selector=>selector==='main' ? (mobile?null:{querySelector:s=>({getBoundingClientRect:()=>({bottom:s==='header'?80:190})})}) : (mobile?{firstElementChild:{getBoundingClientRect:()=>({bottom:120})}}:null)};
   const list={isConnected:true,closest:()=>card};
   const cancel=scrollMarketplacePageTop(list);assert.equal(calls.length,0,'espera o DOM atualizado');frames.shift()();
   assert.deepEqual(calls,[{top:1400-(mobile?120:190)-8,behavior:reduced?'instant':'smooth'}]);assert.deepEqual(focus,[{preventScroll:true}]);
   cancel();assert.deepEqual(canceled,[7]);
   list.isConnected=false;scrollMarketplacePageTop(list);frames.shift()();assert.equal(calls.length,1,'lista desmontada não move a página');
  }
 }finally{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

for(const [file,name,mobile] of [['Anunciados.tsx','changeListingPage',false],['ProductsStock.tsx','changeProductPage',false],['consulta/MarketplaceMobileApp.tsx','changeCatalogPage',true]]){
 test(`${file}: Próxima/Anterior trocam página e só rolam após carregamento solicitado, sem rolagem automática`,()=>{
  const text=readFileSync('app/marketplaces/'+file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let handler,effect;
  function walk(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)handler=node;if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[0]?.getText(source).includes('return scrollMarketplacePageTop('))effect=node.arguments[0];ts.forEachChild(node,walk);}walk(source);
  assert.ok(handler);assert.ok(effect);
  const pending={current:false},scrolls=[],context={page:1,catalogPage:1,total:60,catalogTotal:60,loading:false,catalogPending:false,busy:false,syncing:false,acting:false,pricedProductsOpen:true,pageScrollRequested:pending,catalogPageScrollRequested:pending,panel:{current:'web-card'},catalogCard:{current:'pwa-card'},scrollMarketplacePageTop:target=>{scrolls.push(target);return()=>{};},setLoading:value=>context.loading=value,setDetailId(){},setExpanded(){},setCopyingListing(){},setCopyTargetId(){},Math};
  context.setPage=value=>{context.page=value;};context.setCatalogPage=value=>{context.catalogPage=value;context.catalogPending=true;};
  const compile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const change=runInNewContext(compile(handler.getText(source))+`;${name}`,context),settled=runInNewContext('('+compile(effect.getText(source)).replace(/;\s*$/,'')+')',context);
  settled();assert.equal(scrolls.length,0,'primeira carga não rola');
  change(2);assert.equal(mobile?context.catalogPage:context.page,2);assert.equal(pending.current,true);settled();assert.equal(scrolls.length,0,'não rola antes do resultado');
  context.loading=false;context.catalogPending=false;settled();assert.deepEqual(scrolls,[mobile?'pwa-card':'web-card']);assert.equal(pending.current,false);
  settled();assert.equal(scrolls.length,1,'refresh sem paginação não rola');
  context.total=0;context.catalogTotal=0;change(1);assert.equal(mobile?context.catalogPage:context.page,1,'Anterior funciona mesmo após falha sem total');
  context.loading=false;context.catalogPending=false;settled();assert.equal(scrolls.length,2);
  change(0);assert.equal(pending.current,false,'não navega antes da primeira página');
  assert.ok(text.includes(`${name}(${mobile?'catalogPage':'page'} - 1)`));assert.ok(text.includes(`${name}(${mobile?'catalogPage':'page'} + 1)`));
 });
}
