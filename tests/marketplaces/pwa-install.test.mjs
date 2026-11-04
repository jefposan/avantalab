import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {plataformaInstalacaoPwa} from '../../app/hooks/useInstalacaoPwa.ts';
const require=createRequire(import.meta.url);
function controller({ua='Android Chrome',platform='Linux',touch=1,standalone=false}={}){
 const states=[],refs=[],effects=[],events=new Map(),changes=new Set();let cursor=0,refCursor=0,first=true;
 const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(initial){return refs[refCursor++]??={current:initial};},useEffect(fn){if(first)effects.push(fn);},useCallback:fn=>fn};
 const exports={},display={matches:standalone,addEventListener:(_,fn)=>changes.add(fn),removeEventListener:(_,fn)=>changes.delete(fn)};
 const window={matchMedia:()=>display,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name)=>events.delete(name)};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/hooks/useInstalacaoPwa.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,window,navigator:{userAgent:ua,platform,maxTouchPoints:touch},setTimeout,clearTimeout,requestAnimationFrame(fn){fn();return 1;},cancelAnimationFrame(){},Error,Promise,require:name=>name==='react'?hooks:require(name)});
 const render=()=>{cursor=refCursor=0;const value=exports.default();first=false;return value;};
 render();const cleanup=effects.map(fn=>fn());return{render,events,display,changes,states,cleanup:()=>cleanup.forEach(fn=>fn())};
}
test('instalação identifica iPhone, iPad desktop, Android e computador sem adivinhar instalação',()=>{
 assert.equal(plataformaInstalacaoPwa('iPhone','iPhone',1),'ios');
 assert.equal(plataformaInstalacaoPwa('Macintosh','MacIntel',5),'ios');
 assert.equal(plataformaInstalacaoPwa('Android Chrome','Linux',1),'android');
 assert.equal(plataformaInstalacaoPwa('Macintosh','MacIntel',0),'desktop');
 const app=controller({standalone:true});assert.equal(app.render().installed,true);app.cleanup();
});
test('sem prompt mostra instruções, não chama APIs inexistentes nem exige login',async()=>{
 const app=controller({ua:'iPhone',platform:'iPhone'});let state=app.render();assert.equal(state.ready,true);assert.equal(state.platform,'ios');
 await state.install();state=app.render();assert.equal(state.instructions,true);assert.equal(state.installed,false);assert.equal(state.busy,false);
 state.closeInstructions();assert.equal(app.render().instructions,false);app.cleanup();assert.equal(app.events.size,0);assert.equal(app.changes.size,0);
});
test('prompt capturado durante preparo só abre por clique, bloqueia repetição e cancelar não declara instalado',async()=>{
 const app=controller();let calls=0,prevented=0,resolve;
 app.events.get('beforeinstallprompt')({preventDefault(){prevented++;},prompt(){calls++;return Promise.resolve();},userChoice:new Promise(done=>resolve=done)});
 assert.equal(calls,0);assert.equal(prevented,1);
 const first=app.render().install();await app.render().install();assert.equal(calls,1);assert.equal(app.render().busy,true);
 resolve({outcome:'dismissed'});await first;let state=app.render();assert.equal(state.busy,false);assert.equal(state.installed,false);assert.equal(state.message,'');
 await state.install();assert.equal(app.render().instructions,true,'prompt consumido não pode ser reutilizado');app.cleanup();
});
test('aceite solicita instalação; somente appinstalled confirma e falha recupera instruções',async()=>{
 const app=controller();
 app.events.get('beforeinstallprompt')({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});
 await app.render().install();let state=app.render();assert.equal(state.installed,false);assert.match(state.message,/solicitada/);
 app.events.get('appinstalled')();assert.equal(app.render().installed,true);app.cleanup();
 const failed=controller();failed.events.get('beforeinstallprompt')({preventDefault(){},prompt(){throw Error('nativo');},userChoice:Promise.resolve({outcome:'dismissed'})});
 await failed.render().install();state=failed.render();assert.equal(state.busy,false);assert.equal(state.instructions,true);assert.match(state.error,/instruções/);failed.cleanup();
});
test('resposta depois de sair não muda estado nem retém listeners',async()=>{
 const app=controller();let resolve;
 app.events.get('beforeinstallprompt')({preventDefault(){},prompt:async()=>{},userChoice:new Promise(done=>resolve=done)});
 const pending=app.render().install();app.cleanup();const before=JSON.stringify(app.states);resolve({outcome:'accepted'});await pending;
 assert.equal(JSON.stringify(app.states),before);assert.equal(app.events.size,0);
});
test('botão fica abaixo do card de login, fora do form e preserva manifesto/worker do AvantaPreços',()=>{
 const source=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8'),component=readFileSync('app/components/InstalarPwa.tsx','utf8');
 assert.match(source,/const instalacaoPwa=useInstalacaoPwa\(\)/);
 const guest=source.slice(source.indexOf("if (access === 'guest')"),source.indexOf("if (access === 'no-company')"));
 assert.match(guest,/<\/form>\s*<\/div><InstalarPwa nome="AvantaPreços" estado=\{instalacaoPwa\}/);
 assert.match(component,/estado.ready\|\|estado.installed/);assert.match(component,/Adicionar à Tela de Início/);assert.match(component,/Abrir como App da Web/);assert.match(component,/Instalar app/);assert.match(component,/aria-expanded/);assert.match(component,/e.key==='Escape'/);
 assert.match(source,/register\('\/marketplaces\/consulta\/sw.js', \{ scope: '\/marketplaces\/consulta' \}/);
 assert.doesNotMatch(component,/fetch\(|signIn|localStorage|Notification\.requestPermission|clipboard/);
});
