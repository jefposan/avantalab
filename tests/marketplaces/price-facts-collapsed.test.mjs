import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSearchRenderFixture} from './price-search-render-harness.mjs';
const result={status:'found',ean:'7908103790527',product:{id:'demo',name:'Produto fictício',description:'',image:null,attributes:[{id:'MODEL',name:'Modelo',value:'Exemplo'}]},prices:{market:200,minimum:100,medium:140,ideal:180}};
test('características iniciam retraídas, seta abre/recolhe sem perder dados',()=>{
 const f=createSearchRenderFixture({resultDetailsOpen:true,result});
 assert.match(f.render().html,/id="product-facts-content" hidden=""/);
 assert.match(f.render().html,/aria-expanded="false"[^>]*aria-controls="product-facts-content"/);
 function walk(n){return Array.isArray(n)?n.flatMap(walk):n&&typeof n==='object'?[n,...walk(n.props?.children)]:[];}
 const toggle=()=>walk(f.render().tree).find(n=>n.props?.controlsId==='product-facts-content').props.onClick();
 toggle();assert.match(f.render().html,/id="product-facts-content"><dl>/);assert.match(f.render().html,/Exemplo/);
 toggle();assert.match(f.render().html,/id="product-facts-content" hidden=""/);
 const source=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
 assert.match(source,/setProductFactsExpanded\(false\);\},\[resultDetailsOpen,result\?\.product\?\.id,result\?\.localProductId,result\?\.historyId,result\?\.ean\]/);
});
test('Ler etiqueta não deriva fundo nem sombra da cor do perfil nos dois estilos',()=>{
 const css=readFileSync('app/marketplaces/consulta/marketplaces-mobile.module.css','utf8');
 const label=css.match(/\.scanActions \.labelScanButton\{([^}]+)\}/)[1];
 assert.match(label,/background:#003e73/);assert.doesNotMatch(label,/var\(--brand/);
 const fallback=readFileSync('app/marketplaces/price-label-reader.module.css','utf8').match(/\.trigger\{([^}]+)\}/)[1];
 assert.match(fallback,/background:#003e73/);assert.doesNotMatch(fallback,/var\(--brand/);
});

test('descrição aparece somente dentro de Características e antes dos atributos, inclusive sem atributos',()=>{
 for(const attributes of [result.product.attributes,undefined,[]]) {
  const f=createSearchRenderFixture({resultDetailsOpen:true,result:{...result,product:{...result.product,description:'Descrição completa exclusiva',attributes}}});
  const html=f.render().html;
  assert.match(html,/id="product-facts-content" hidden=""><p[^>]*>Descrição completa exclusiva<\/p><dl>/);
  assert.equal(html.split('Descrição completa exclusiva').length-1,1);
 }
});
