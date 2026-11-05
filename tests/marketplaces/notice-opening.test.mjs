import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchMarketplaceNoticeOpening,reportMarketplaceNoticeOpening,NOTICE_OPENING_RESULT,NOTICE_OPENING_CANCEL} from '../../app/marketplaces/notice-opening.ts';

function fixture(run, origin){
 const old={window:globalThis.window,MutationObserver:globalThis.MutationObserver,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const frames=new Map(),timers=new Map(),listeners=new Map(),calls=[];let id=0,mutate,disconnected=false,top=400,expanded=false,details=false;
 const row={dataset:{marketplaceDetail:'product:warehouse:p'},querySelector:selector=>selector==='button[aria-expanded]'?{}:selector==='[data-product-scroll]'?(details?{}:null):(expanded?{}:null),getBoundingClientRect:()=>({top}),closest:()=>({querySelector:selector=>selector==='header'?{getBoundingClientRect:()=>({bottom:80})}:null})};
 const page={isConnected:true,querySelectorAll:()=>[row]};
 try{
  globalThis.window={innerHeight:800,scrollY:0,matchMedia:()=>({matches:false}),scrollTo:()=>{},dispatchEvent:e=>{listeners.get(e.type)?.(e);return true;},addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
  globalThis.MutationObserver=class{constructor(fn){mutate=fn;}observe(){}disconnect(){disconnected=true;}};
  globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=n=>frames.delete(n);
  globalThis.setTimeout=(fn,ms)=>{assert.equal(ms,25000);timers.set(++id,fn);return id;};globalThis.clearTimeout=n=>timers.delete(n);
  const cancel=watchMarketplaceNoticeOpening(page,{key:'n',provider:'mercado_livre',panel:'stock',productId:'p',origin},()=>calls.push('ready'),()=>calls.push('failed'));
  const flush=()=>{for(const [key,fn]of [...frames]){frames.delete(key);fn();}};
  run({calls,cancel,flush,mutate:()=>mutate(),timers,listeners,frames,row,page,connected:()=>!disconnected,layout:(t,e,d)=>{top=t;expanded=e;details=d;}});
 }finally{Object.assign(globalThis,old);}
}
test('Ver no estoque conclui por resultado da tentativa, independente de expansão e rolagem',()=>fixture(f=>{
 f.layout(1100,false,false);f.flush();assert.deepEqual(f.calls,[]);
 f.layout(40,false,false);f.mutate();f.flush();assert.deepEqual(f.calls,[]);
 f.layout(180,false,false);f.listeners.get('scroll')();f.flush();assert.deepEqual(f.calls,[]);
 reportMarketplaceNoticeOpening('n');assert.deepEqual(f.calls,['ready']);assert.equal(f.timers.size,0);
},'announced'));
test('pendência conclui por montagem confirmada, sem prender loading ao alinhamento',()=>fixture(f=>{
 f.flush();assert.deepEqual(f.calls,[]);f.layout(268,true,true);f.mutate();f.flush();assert.deepEqual(f.calls,[]);
 f.layout(88,true,false);f.mutate();f.flush();assert.deepEqual(f.calls,[]);
 f.layout(268,true,true);reportMarketplaceNoticeOpening('n');assert.deepEqual(f.calls,['ready']);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);assert.equal(f.connected(),false);
 f.mutate();f.flush();assert.deepEqual(f.calls,['ready']);
}));
test('tempo excedido libera espera e permite recuperação; cancelamento ignora retorno antigo',()=>{
 fixture(f=>{[...f.timers.values()][0]();assert.deepEqual(f.calls,['failed']);assert.equal(f.frames.size,0);assert.equal(f.connected(),false);});
 fixture(f=>{f.cancel();f.layout(88,true,true);f.mutate();f.flush();assert.deepEqual(f.calls,[]);assert.equal(f.timers.size,0);});
});
test('outra tentativa e ficha antiga não encerram loading; falha explícita libera sem esperar timeout',()=>fixture(f=>{
 f.layout(88,true,true);f.row.dataset.marketplaceDetail='product:warehouse:other';f.flush();assert.deepEqual(f.calls,[]);
 f.row.dataset.marketplaceDetail='product:warehouse:p';f.layout(88,false,true);f.mutate();f.flush();assert.deepEqual(f.calls,[]);
 reportMarketplaceNoticeOpening('old');assert.deepEqual(f.calls,[]);
 reportMarketplaceNoticeOpening('n','Produto removido');assert.deepEqual(f.calls,['failed']);assert.equal(f.timers.size,0);
}));
test('timeout emite cancelamento da tentativa e resultados tardios são ignorados',()=>fixture(f=>{
 let canceled;f.listeners.set(NOTICE_OPENING_CANCEL,e=>{canceled=e.detail.key;});
 [...f.timers.values()][0]();assert.equal(canceled,'n');reportMarketplaceNoticeOpening('n');assert.deepEqual(f.calls,['failed']);
}));
test('integração usa loading oficial com leve escurecimento e recuperação sem pesquisa externa',()=>{
 const client=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');assert.match(client,/<CarregamentoDadosModulo ativo=\{noticeOpening\} escurecerFundo/);assert.match(client,/watchMarketplaceNoticeOpening\(page,target/);assert.match(client,/setNoticeNavigation\(undefined\);setNoticeOpening\(true\)/);assert.match(client,/Tentar novamente/);
 const watcher=readFileSync('app/marketplaces/notice-opening.ts','utf8');assert.doesNotMatch(watcher,/fetch\(|marketplaceClientRequest|scrollTo\(/);
 const loading=readFileSync('app/components/CarregamentoDadosModulo.tsx','utf8');assert.match(loading,/data-av-navigation-loading=\{escurecerFundo \? '' : undefined\}/);
 const lock=readFileSync('app/components/WebPopupScrollLock.tsx','utf8');assert.match(lock,/\.fixed\.inset-0:not\(\[data-av-navigation-loading\]\)/);
 assert.match(loading,/onCancelar&&<BotaoAcaoCompacto/);assert.match(client,/onCancelar=\{cancelNoticeOpening\}/);
 const stock=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
 assert.match(stock,/noticeProduct,props.noticeTarget\?\.key\]/);assert.match(stock,/AbortSignal\.any\(\[current.signal,AbortSignal.timeout\(20_000\)\]\)/);
 assert.match(stock,/data-marketplace-notice-result=\{noticeResult\?\.key\}/);assert.match(stock,/current.signal.aborted \|\| !active.current \|\| generation.current!==revision/);
 assert.match(stock,/if\(openNotice\)noticeOpeningPending.current=false/);
 assert.match(stock,/window.addEventListener\(NOTICE_OPENING_CANCEL,cancel\)/);
});
test('resultado persistido no DOM libera loading sem frames e sem aceitar outra tentativa',()=>fixture(f=>{
 const node={dataset:{marketplaceNoticeResult:'old'},querySelectorAll:()=>[f.row]};
 f.page.querySelectorAll=()=>[node];f.mutate();assert.deepEqual(f.calls,[]);
 node.dataset.marketplaceNoticeResult='n';f.layout(5000,false,false);f.mutate();assert.deepEqual(f.calls,['ready']);assert.equal(f.timers.size,0);
}));
