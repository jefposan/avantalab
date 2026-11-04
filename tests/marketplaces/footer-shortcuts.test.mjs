import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {scrollToMarketplacePanel} from '../../app/marketplaces/scroll-panel-row.ts';

function fixture({hidden=true,inert=false,disabled=false}={}){
 const frames=[],scrolls=[];let clicks=0,focused=0;
 const title={focus(){focused++;}},content={hidden};
 const button={disabled,click(){clicks++;content.hidden=false;}};
 const card={isConnected:true,closest:s=>s==='[inert]'&&inert?{}:null,querySelector:s=>s==='h2'?title:button,getBoundingClientRect:()=>({top:250})};
 content.parentElement=card;
 return{content,frames,scrolls,get clicks(){return clicks;},get focused(){return focused;},doc:{getElementById:id=>['sales-content','announced-content','warehouses-content','sales-report-content'].includes(id)?content:null},win:{scrollY:10,matchMedia:()=>({matches:true}),scrollTo:value=>scrolls.push(value)}};
}
test('atalhos abrem somente o card fechado, focam e alinham sem alternar filtros',()=>{
 const original={document:globalThis.document,window:globalThis.window,raf:globalThis.requestAnimationFrame};
 try{
  for(const id of ['sales-content','announced-content','warehouses-content','sales-report-content'])for(const hidden of [true,false]){
   const f=fixture({hidden});globalThis.document=f.doc;globalThis.window=f.win;globalThis.requestAnimationFrame=fn=>f.frames.push(fn);
   scrollToMarketplacePanel(id);f.frames.splice(0).forEach(fn=>fn());
   assert.equal(f.clicks,hidden?1:0);assert.equal(f.focused,1);assert.deepEqual(f.scrolls,[{top:252,behavior:'instant'}]);
   scrollToMarketplacePanel(id);f.frames.splice(0).forEach(fn=>fn());
   assert.equal(f.content.hidden,false);assert.equal(f.clicks,hidden?1:0,'clicar novamente nunca recolhe');assert.equal(f.focused,2);
  }
  for(const options of [{disabled:true},{inert:true}]){
   const f=fixture(options);globalThis.document=f.doc;globalThis.window=f.win;globalThis.requestAnimationFrame=fn=>f.frames.push(fn);
   scrollToMarketplacePanel('announced-content');f.frames.forEach(fn=>fn());assert.equal(f.clicks,0);assert.equal(f.scrolls.length,0);
  }
  const f=fixture();globalThis.document=f.doc;scrollToMarketplacePanel('unexpected');assert.equal(f.clicks,0);
 }finally{globalThis.document=original.document;globalThis.window=original.window;globalThis.requestAnimationFrame=original.raf;}
});
test('pesquisa sempre expande Produtos cadastrados, inclusive se já aberto, sem alternância',()=>{
 const source=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
 const handler=source.slice(source.indexOf('  useImperativeHandle('),source.indexOf('  function changeSearch('));
 for(const initial of [false,true]){
  let expanded=initial,focus=0,scroll=0,handle;const frames=[];
  vm.runInNewContext(handler,{props:{searchRef:{}},searchRef:{},useImperativeHandle:(_,create)=>{handle=create();},setExpanded:value=>{assert.equal(value,true);expanded=value;},requestAnimationFrame:fn=>frames.push(fn),searchInput:{current:{focus(){focus++;}}},panel:{current:{}},scrollMarketplaceRow(){scroll++;}});
  handle.focusSearch();frames.splice(0).forEach(fn=>fn());assert.equal(expanded,true);
  handle.focusSearch();frames.splice(0).forEach(fn=>fn());assert.equal(expanded,true);assert.equal(focus,2);assert.equal(scroll,2);
 }
});
test('quatro atalhos à esquerda, pesquisa à direita e mesma escala com alvos acessíveis',()=>{
 const component=readFileSync('app/marketplaces/ProductSearchShortcut.tsx','utf8'),css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 assert.match(component,/<nav[\s\S]*?marketplaceShortcutLinks[\s\S]*?label:'Vendas'[\s\S]*?label:'Anunciados'[\s\S]*?label:'Estoque'[\s\S]*?label:'Resultados'/);
 assert.match(component,/aria-label="Pesquisar produtos cadastrados"/);assert.match(component,/observeSearchShortcutFooter\(navigation.current\)/);
 assert.match(css,/height:33\.6px/);assert.match(css,/width:148px;min-width:44px;min-height:44px/);
 assert.match(css,/\.marketplaceShortcuts \{[^}]*justify-content:space-between/);
 assert.match(css,/@media\(max-width:900px\)[^\n]*width:48px;min-height:48px/);
 assert.match(css,/\.shortcutFace > span \{ display:none; \}/);
 assert.doesNotMatch(component,/fetch\(|marketplaceClientRequest|refresh/);
 assert.match(component,/data-product-focus-navigation/);assert.match(css,/\.marketplaceShortcuts \{[^}]*z-index:4100/);
});
test('atalhos recolhem antes de navegar; modal, carregamento ou escrita impedem descarte',()=>{
 const source=readFileSync('app/marketplaces/ProductSearchShortcut.tsx','utf8');
 const handler=source.slice(source.indexOf('  function navigate('),source.indexOf('  return <nav'));
 for(const blocked of ['none','modal','busy']){
  const order=[],frames=[];let navigate;
  vm.runInNewContext(ts.transpileModule(`${handler};globalThis.run=navigate`,{}).outputText,{navigation:{current:{ownerDocument:{querySelector:()=>blocked==='modal'?{}:null}}},recolherProdutoEmFoco:()=>{order.push('collapse');return blocked!=='busy';},requestAnimationFrame:fn=>frames.push(fn),globalThis:{set run(value){navigate=value;}}});
  navigate(()=>order.push('action'));assert.ok(!order.includes('action'));frames.forEach(fn=>fn());
  assert.deepEqual(order,blocked==='none'?['collapse','action']:blocked==='busy'?['collapse']:[]);
 }
});
test('Preparar anúncio libera foco e recolhe antes de abrir Novo anúncio no quadro seguinte',()=>{
 const source=readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),handler=source.slice(source.indexOf('  function prepareFromProduct('),source.indexOf('  const registeredActions='));
 for(const blocked of [false,true]){
  const order=[],frames=[];let prepare;
  vm.runInNewContext(ts.transpileModule(`${handler};globalThis.run=prepareFromProduct`,{}).outputText,{busy:false,mutationInFlight:{current:blocked},panel:{current:{ownerDocument:{}}},recolherProdutoEmFoco:()=>{order.push('release');return true;},setDetailId:value=>{assert.equal(value,'');order.push('collapse');},requestAnimationFrame:fn=>frames.push(fn),props:{onPrepare:(id,account)=>{assert.equal(id,'p');assert.equal(account,'a');order.push('prepare');}},globalThis:{set run(value){prepare=value;}}});
  prepare('p','a');assert.ok(!order.includes('prepare'));frames.forEach(fn=>fn());assert.deepEqual(order,blocked?[]:['release','collapse','prepare']);
 }
 assert.match(source,/props=\{\{\.\.\.props,onPrepare:prepareFromProduct\}\}/);
});
