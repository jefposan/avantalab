import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { observeSearchShortcutFooter } from '../../app/marketplaces/search-shortcut-footer.ts';

test('rodapé é último elemento de fluxo e a reserva do atalho fica no conteúdo, não após ele',()=>{
  const css=postcss.parse(readFileSync('app/marketplaces/marketplaces.module.css','utf8'));
  const rules=selector=>{const values={};css.walkRules(rule=>{if(rule.selector===selector&&!rule.parent.type.includes('atrule'))rule.walkDecls(d=>values[d.prop]=d.value);});return values;};
  assert.equal(rules('.page').display,'flex');assert.equal(rules('.page')['flex-direction'],'column');assert.equal(rules('.page')['padding-bottom'],'0');
  assert.equal(rules('.page > .content').flex,'1 0 auto');
  assert.equal(rules('.page > footer')['margin-top'],'0');
  assert.equal(rules('.page:has(.productSearchShortcut) > .content')['padding-bottom'],'100px');
  assert.notEqual(rules('.page:has(.productSearchShortcut)')['padding-bottom'],'100px');
  const source=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');
  assert.match(source,/<\/div>\s*<RodapeAvanta darkMode=\{effectiveDark\} \/>\s*<\/main>/);
  assert.doesNotMatch(readFileSync('app/components/RodapeAvanta.tsx','utf8'),/position:\s*(fixed|absolute|sticky)/);
});

function fixture(){
  let top=950,id=0;const listeners={},frames=new Map(),style=new Map(),observed=[];let disconnected=false,canceled=0;
  const footer={getBoundingClientRect:()=>({top})};
  const page={querySelector:selector=>{assert.equal(selector,':scope > footer');return footer;}};
  const view={innerHeight:800,requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(n){frames.delete(n);canceled++;},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:(name,fn)=>{assert.equal(listeners[name],fn);delete listeners[name];},ResizeObserver:class{constructor(fn){this.fn=fn;}observe(el){observed.push(el);}disconnect(){disconnected=true;}}};
  const button={closest:()=>page,ownerDocument:{defaultView:view},style:{setProperty:(name,value)=>style.set(name,value),removeProperty:name=>style.delete(name)}};
  return{button,view,style,listeners,frames,observed,setTop(value){top=value;},flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},get disconnected(){return disconnected;},get canceled(){return canceled;}};
}
test('atalho sobe só quando rodapé entra na tela e volta ao afastamento original ao sair',()=>{
  const f=fixture(),cleanup=observeSearchShortcutFooter(f.button);
  assert.equal(f.style.get('--marketplace-footer-visible'),'0px');assert.equal(f.observed.length,2);
  f.setTop(760);f.listeners.scroll();f.listeners.scroll();assert.equal(f.frames.size,1);f.flush();
  assert.equal(f.style.get('--marketplace-footer-visible'),'40px');
  f.setTop(700);f.listeners.scroll();f.flush();assert.equal(f.style.get('--marketplace-footer-visible'),'100px');
  f.setTop(900);f.listeners.scroll();f.flush();assert.equal(f.style.get('--marketplace-footer-visible'),'0px');
  cleanup();assert.equal(f.disconnected,true);assert.equal(Object.keys(f.listeners).length,0);assert.equal(f.style.size,0);
});
test('redimensionamento e ausência de ResizeObserver têm fallback; desmontagem cancela quadro pendente',()=>{
  const f=fixture();delete f.view.ResizeObserver;const cleanup=observeSearchShortcutFooter(f.button);
  f.setTop(699.5);f.listeners.resize();f.flush();assert.equal(f.style.get('--marketplace-footer-visible'),'101px');
  f.listeners.scroll();cleanup();assert.equal(f.canceled,1);assert.equal(f.frames.size,0);
  assert.doesNotThrow(()=>observeSearchShortcutFooter({closest:()=>null,ownerDocument:{defaultView:null}})());
});
