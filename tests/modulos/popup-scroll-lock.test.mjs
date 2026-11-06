import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync('app/components/WebPopupScrollLock.tsx','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({frame=null,mobile=false}={}){
 const html={style:{overflow:'clip',overscrollBehavior:'contain',scrollBehavior:'smooth'},clientWidth:980,classList:{values:new Set(),add(x){this.values.add(x);},remove(x){this.values.delete(x);}}};
 const body={style:{position:'relative',top:'2px',left:'3px',right:'4px',width:'98%',overflow:'auto',overscrollBehavior:'auto',paddingRight:'6px'}};
 const original={html:{...html.style},body:{...body.style}};const popups=[];const scrolls=[];let cleanup,observeOptions,disconnected=false,selector='';const listeners=new Map();let notify;
 const window={frameElement:frame,scrollY:430,scrollX:15,innerWidth:1000,getComputedStyle:el=>({display:el.display||'block',visibility:el.visibility||'visible',paddingRight:el.style?.paddingRight||'0'}),scrollTo:(...args)=>scrolls.push(args),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const document={documentElement:html,body,getElementById:id=>id==='mobile-root'&&mobile?{}:null,querySelectorAll:value=>{selector=value;return popups;}};
 class Observer{constructor(fn){notify=fn;}observe(_target,options){observeOptions=options;}disconnect(){disconnected=true;}}
 const sandbox={exports:{},require:()=>({useEffect:fn=>{cleanup=fn();}}),window,document,MutationObserver:Observer};vm.runInNewContext(js,sandbox);sandbox.exports.default();
 return {html,body,original,popups,scrolls,window,listeners,notify:()=>notify(),cleanup:()=>cleanup(),options:()=>observeOptions,disconnected:()=>disconnected,selector:()=>selector};
}
const popup=()=>({closest:()=>null,getClientRects:()=>[{}]});
function frame(){const attrs=new Map();return{getAttribute:key=>attrs.get(key),setAttribute:(key,value)=>attrs.set(key,value),hasAttribute:key=>attrs.has(key),removeAttribute:key=>attrs.delete(key),closest:()=>null,getClientRects:()=>[{}]};}

test('abrir trava o fundo sem salto; fechar restaura estilos e a posição horizontal/vertical',()=>{
 const f=frame(),h=harness({frame:f});assert.equal(h.scrolls.length,0);h.popups.push(popup());h.notify();
 assert.equal(h.body.style.position,'fixed');assert.equal(h.body.style.top,'-430px');assert.equal(h.body.style.paddingRight,'26px');assert.equal(h.html.style.overflow,'hidden');assert.equal(h.html.style.scrollBehavior,'auto');assert.equal(f.getAttribute('data-av-popup-scroll-lock'),'true');
 h.window.scrollY=0;h.notify();assert.equal(h.body.style.top,'-430px');assert.equal(h.body.style.paddingRight,'26px');
 h.popups.length=0;h.notify();assert.deepEqual(h.html.style,h.original.html);assert.deepEqual(h.body.style,h.original.body);assert.deepEqual(h.scrolls,[[15,430]]);assert.equal(f.hasAttribute('data-av-popup-scroll-lock'),false);h.cleanup();assert.equal(h.scrolls.length,1);
});

test('dois popups mantêm bloqueio até o último fechar; desmontar limpa marca e eventos',()=>{
 const f=frame(),h=harness({frame:f});h.popups.push(popup(),popup());h.notify();h.popups.pop();h.notify();assert.equal(h.body.style.position,'fixed');assert.equal(h.scrolls.length,0);
 h.cleanup();assert.equal(h.disconnected(),true);assert.equal(h.listeners.size,0);assert.equal(f.hasAttribute('data-av-popup-scroll-lock'),false);assert.deepEqual(h.body.style,h.original.body);
});

test('bloqueio atravessa dois iframes internos e é liberado após desmontagem do popup',()=>{
 const outerFrame=frame(),innerFrame=frame();const root=harness(),middle=harness({frame:outerFrame}),inner=harness({frame:innerFrame});
 inner.popups.push(popup());inner.notify();assert.equal(innerFrame.getAttribute('data-av-popup-scroll-lock'),'true');
 middle.popups.push(innerFrame);middle.notify();root.popups.push(outerFrame);root.notify();assert.equal(root.body.style.position,'fixed');assert.equal(middle.body.style.position,'fixed');assert.equal(inner.body.style.position,'fixed');
 inner.cleanup();middle.popups.length=0;middle.notify();root.popups.length=0;root.notify();assert.deepEqual(root.body.style,root.original.body);assert.deepEqual(middle.body.style,middle.original.body);
});

test('visibilidade, atributos e menus modais são observados; popups ocultos não bloqueiam',()=>{
 const h=harness(),el=popup();h.popups.push(el);el.visibility='hidden';h.notify();assert.equal(h.body.style.position,'relative');el.visibility='visible';el.closest=()=>({hidden:true});h.notify();assert.equal(h.body.style.position,'relative');el.closest=()=>null;el.getClientRects=()=>[];h.notify();assert.equal(h.body.style.position,'relative');el.getClientRects=()=>[{}];h.notify();assert.equal(h.body.style.position,'fixed');
 for(const attr of ['style','class','hidden','open','aria-hidden','aria-modal','data-av-popup-open','data-av-popup-scroll-lock'])assert.ok(h.options().attributeFilter.includes(attr));
 assert.match(h.selector(),/role="dialog"/);assert.match(h.selector(),/role="alertdialog"/);assert.match(h.selector(),/dialog\[open\]/);assert.match(h.selector(),/data-av-popup-open/);
});

test('controlador web preserva o comportamento próprio do aplicativo mobile',()=>{
 const h=harness({mobile:true});h.popups.push(popup());h.notify();assert.deepEqual(h.body.style,h.original.body);assert.equal(h.scrolls.length,0);h.cleanup();
});
