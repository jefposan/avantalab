import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('app/marketplaces/usePreparationSummary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(contained=false,searchHeight=0){
 const attrs=new Map(),styles=new Map(),events=new Map(),frames=[];let effect,cleanup,observer,stopped=false;
 const state={top:300,bottom:2200,width:1440,height:900,heading:72,left:950,column:380};
 const heading={getBoundingClientRect:()=>({height:state.heading})};
 const rail={getBoundingClientRect:()=>({left:state.left,width:state.column})};
 const scrollerEvents=new Map();
 const scroller={querySelector:()=>searchHeight?{getBoundingClientRect:()=>({height:searchHeight})}:null,style:{setProperty:(k,v)=>styles.set(k,v)},clientHeight:650,addEventListener:(k,v)=>scrollerEvents.set(k,v),removeEventListener:k=>scrollerEvents.delete(k)};
 const area={closest:()=>contained?scroller:null,querySelector:()=>rail,getBoundingClientRect:()=>({top:state.top,bottom:state.bottom}),toggleAttribute:(k,on)=>on?attrs.set(k,true):attrs.delete(k),removeAttribute:k=>attrs.delete(k),style:{setProperty:(k,v)=>styles.set(k,v)}};
 const win={get innerWidth(){return state.width;},get innerHeight(){return state.height;},addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
 const exports={};vm.runInNewContext(source,{exports,window:win,document:{getElementById:()=>heading},getComputedStyle:()=>({getPropertyValue:()=> '180px'}),requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},ResizeObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){stopped=true;}},require:()=>({useRef:()=>({current:area}),useEffect:fn=>effect=fn})});
 exports.default('product');cleanup=effect();
 return{state,attrs,styles,events,scrollerEvents,update(){observer();frames.splice(0).forEach(fn=>fn());},cleanup(){cleanup();assert.equal(stopped,true);}};
}
test('prévia acompanha a área útil até o final sem criar scroll no formulário',()=>{
 const f=fixture();assert.equal(f.attrs.has('data-summary-floating'),false,'não cobre busca antes de a preparação chegar à área útil');
 f.state.top=-400;f.update();assert.equal(f.attrs.has('data-summary-floating'),true);assert.equal(f.styles.get('--preparation-content-top'),'264px');assert.equal(f.styles.get('--preparation-summary-height'),'612px');
 f.state.bottom=700;f.update();assert.equal(f.attrs.has('data-summary-floating'),true,'rodapé visível não empurra prévia sob o cabeçalho');
 f.state.heading=120;f.state.column=340;f.update();assert.equal(f.styles.get('--preparation-content-top'),'312px');assert.equal(f.styles.get('--preparation-summary-width'),'340px');
 f.state.bottom=400;f.update();assert.equal(f.attrs.has('data-summary-floating'),false,'prévia sai junto com a seção');
 f.cleanup();assert.equal(f.events.size,0);assert.equal(f.attrs.size,0);
});
test('telas estreitas e baixas mantêm a prévia no fluxo, sem sobrepor campos',()=>{
 const f=fixture();f.state.top=0;f.state.width=390;f.update();assert.equal(f.attrs.has('data-summary-floating'),false);
 f.state.width=1440;f.state.height=480;f.update();assert.equal(f.attrs.has('data-summary-floating'),false);
 f.state.height=900;f.update();assert.equal(f.attrs.has('data-summary-floating'),true);f.cleanup();
});

test('prévia permanece dentro da rolagem integral do anúncio, sem posição fixa sobre outros cards',()=>{
 const f=fixture(true);
 assert.equal(f.attrs.has('data-summary-contained'),true);
 assert.equal(f.attrs.has('data-summary-floating'),false);
 assert.equal(f.styles.get('--preparation-content-top'),'84px');
 assert.equal(f.styles.get('--preparation-summary-height'),'554px');
 f.state.top=-1000;f.state.bottom=100;f.update();
 assert.equal(f.attrs.has('data-summary-floating'),false);
 assert.equal(f.scrollerEvents.has('scroll'),true);
 f.cleanup();assert.equal(f.scrollerEvents.size,0);assert.equal(f.attrs.size,0);
});

test('pesquisa fixa reserva sua altura real e acompanha a quebra de linha',()=>{
 const f=fixture(true,108);
 assert.equal(f.styles.get('--preparation-search-height'),'108px');
 assert.equal(f.styles.get('--preparation-heading-height'),'72px');
 assert.equal(f.styles.get('--preparation-content-top'),'192px');
 assert.equal(f.styles.get('--preparation-summary-height'),'446px');
 assert.equal(f.attrs.has('data-summary-floating'),false);f.cleanup();
});
