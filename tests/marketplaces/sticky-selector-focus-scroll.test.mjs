import test from 'node:test';
import assert from 'node:assert/strict';
import { marketplaceSelectorBottom, scrollMarketplaceRow, scrollMarketplacePreparation } from '../../app/marketplaces/scroll-panel-row.ts';

function fixture(position='sticky',overflow='visible'){
 const html={position:'static',overflowY:'hidden'},body={position:'static',overflowY:overflow,parentElement:html};
 const main={position:'static',overflowY:'visible',parentElement:body};
 const doc={documentElement:html,defaultView:{getComputedStyle:node=>node}};
 const selector={position,parentElement:main,ownerDocument:doc,getBoundingClientRect:()=>({bottom:260})};
 const header={getBoundingClientRect:()=>({bottom:80})};
 main.querySelector=name=>name==='header'?header:selector;
 const row={closest:()=>main,getBoundingClientRect:()=>({top:1280})};
 return{html,body,main,selector,row};
}
test('preparar anúncio reserva toda a navegação mesmo durante bloqueio do carregamento e alinha o card',()=>{
 const previous=globalThis.window,calls=[];
 try {
  for(const height of [284,420]){
   const f=fixture('sticky','hidden');
   const title={closest:selector=>selector==='main'?f.main:f.row};
   globalThis.window={scrollY:0,getComputedStyle:()=>({getPropertyValue:()=>`${height}px`}),matchMedia:()=>({matches:false}),scrollTo:value=>calls.push(value)};
   scrollMarketplacePreparation(title);
   assert.deepEqual(calls.at(-1),{top:1280-height-8,behavior:'instant'});
  }
 }finally{globalThis.window=previous;}
});
test('barra sticky deixa de reservar 180px indevidos quando o foco bloqueia o body',()=>{
 const previous=globalThis.window,calls=[];
 try{
  globalThis.window={scrollY:0,matchMedia:()=>({matches:true}),scrollTo:value=>calls.push(value)};
  const f=fixture('sticky','hidden');scrollMarketplaceRow(f.row);
  assert.deepEqual(calls,[{top:1192,behavior:'instant'}]);
  assert.equal(1280-calls[0].top,88,'início da ficha fica 8px abaixo do cabeçalho de 80px, não em 268px');
 }finally{globalThis.window=previous;}
});
test('barra sticky da viewport continua reservada antes do foco e volta após recolher',()=>{
 const f=fixture();assert.equal(marketplaceSelectorBottom(f.selector),260);
 f.body.overflowY='hidden';assert.equal(marketplaceSelectorBottom(f.selector),0);
 f.body.overflowY='visible';assert.equal(marketplaceSelectorBottom(f.selector),260);
});
test('barra realmente fixa mantém espaço; ancestral scrollável não vira barra fixa da viewport',()=>{
 for(const overflow of ['hidden','auto','scroll','overlay']){
  const f=fixture('fixed',overflow);assert.equal(marketplaceSelectorBottom(f.selector),260);
  f.selector.position='sticky';assert.equal(marketplaceSelectorBottom(f.selector),0);
 }
 const f=fixture();f.main.overflowY='hidden';assert.equal(marketplaceSelectorBottom(f.selector),0);
 f.main.overflowY='clip';assert.equal(marketplaceSelectorBottom(f.selector),260,'clip não cria scroll container');
 assert.equal(marketplaceSelectorBottom(null),0);
});
