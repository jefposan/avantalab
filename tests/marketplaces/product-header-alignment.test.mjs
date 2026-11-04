import test from 'node:test';
import assert from 'node:assert/strict';
import {keepExpandedProductHeaderVisible} from '../../app/marketplaces/scroll-panel-row.ts';

test('cabeçalho travado volta ao topo após mudança de layout, foco e viewport, preservando detalhes e limpeza',()=>{
 const previous={ResizeObserver:globalThis.ResizeObserver,MutationObserver:globalThis.MutationObserver};
 const observers=[],frames=new Map(),listeners=new Map(),calls=[];let frame=0,origin=700,navigation=80,modal=false;
 const add=(name,fn)=>listeners.set(name,fn),remove=name=>listeners.delete(name);
 const view={scrollY:200,visualViewport:{offsetTop:0,addEventListener:add,removeEventListener:remove},addEventListener:add,removeEventListener:remove,requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame;},cancelAnimationFrame:id=>frames.delete(id),scrollTo:options=>{calls.push(options);view.scrollY=options.top;}};
 const body={},main={querySelector:s=>s==='header'?{getBoundingClientRect:()=>({bottom:navigation})}:null};
 const doc={defaultView:view,body,documentElement:{},querySelector:()=>modal?{}:null,addEventListener:add,removeEventListener:remove};
 const header={isConnected:true,getBoundingClientRect:()=>({top:origin-view.scrollY})};
 const details={scrollTop:145};
 const row={isConnected:true,ownerDocument:doc,parentElement:body,querySelector:()=>header,closest:s=>s==='main'?main:null};
 const flush=()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());};
 try{
  globalThis.ResizeObserver=globalThis.MutationObserver=class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.stopped=true;}};
  const stop=keepExpandedProductHeaderVisible(row);assert.equal(header.getBoundingClientRect().top,88);assert.equal(calls[0].behavior,'instant');flush();
  origin+=180;observers[1].fn();flush();assert.equal(header.getBoundingClientRect().top,88,'conteúdo acima não esconde identificação');
  view.scrollY+=300;listeners.get('focusin')();flush();assert.equal(header.getBoundingClientRect().top,88,'foco do navegador não deixa cabeçalho oculto');
  navigation=160;listeners.get('resize')();flush();assert.equal(header.getBoundingClientRect().top,168,'reserva nova altura do menu');
  const count=calls.length;listeners.get('scroll')();flush();assert.equal(calls.length,count,'rolagem dos detalhes não reposiciona página alinhada');assert.equal(details.scrollTop,145);
  modal=true;origin+=100;observers[1].fn();flush();assert.equal(calls.length,count,'não disputa posicionamento com confirmação aberta');
  modal=false;observers[1].fn();flush();assert.equal(header.getBoundingClientRect().top,168);
  stop();assert.equal(frames.size,0);assert.equal(listeners.size,0);assert.ok(observers.every(o=>o.stopped));
  origin+=50;observers[0].fn();flush();assert.equal(header.getBoundingClientRect().top,218,'cleanup não interfere na navegação posterior');
 }finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
