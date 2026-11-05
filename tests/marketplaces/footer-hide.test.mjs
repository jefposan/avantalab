import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const source=readFileSync('app/marketplaces/ProductSearchShortcut.tsx','utf8');
function fixture(hidden=false){
 const effects=[],changes=[],timers=[],cancelled=[],exports={};
 const react={useRef:()=>({current:null}),useState:()=>[hidden,value=>changes.push(value)],useEffect:fn=>effects.push(fn)};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:s=>s==='react'?react:s.endsWith('.module.css')?{default:new Proxy({},{get:(_,k)=>String(k)})}:s.includes('BotaoAcaoCompacto')?{default:({children,...props})=>React.createElement('button',{'aria-label':props['aria-label'],onClick:props.onClick},children)}:s.includes('/Icon')?{Icon:()=>null}:s.startsWith('.')||s.startsWith('@/')?{}:require(s),window:{setTimeout(fn,delay){timers.push({fn,delay});return 1},clearTimeout:id=>cancelled.push(id)}});
 return{tree:exports.default({onClick(){}}),effects,changes,timers,cancelled};
}
test('X inicia ocultação e o timer retorna em 30 segundos; desmontagem cancela retorno',()=>{
 const visible=fixture();const group=visible.tree.props.children[0];
 assert.equal(group.props.children[1].props['aria-label'],'Ocultar atalhos por 30 segundos');
 group.props.children[1].props.onClick();assert.deepEqual(visible.changes,[true]);
 const hidden=fixture(true),cleanup=hidden.effects[1]();assert.equal(hidden.timers[0].delay,30_000);
 hidden.timers[0].fn();assert.deepEqual(hidden.changes,[false]);cleanup();assert.deepEqual(hidden.cancelled,[1]);
});
test('atalhos ocultos ficam inertes e fora da acessibilidade; transição respeita movimento reduzido',()=>{
 const html=renderToStaticMarkup(fixture(true).tree);
 const tree=fixture(true).tree;
 assert.equal(tree.props.inert,undefined);
 assert.equal(tree.props.children[0].props.inert,true);
 assert.equal(tree.props.children[1].props.inert,undefined);
 assert.equal(tree.props.children[1].props['aria-label'],'Pesquisar produtos cadastrados');
 assert.match(html,/inert=""/);assert.match(html,/aria-hidden="true"/);
 assert.match(html,/data-temporarily-hidden="true"/);
 assert.doesNotMatch(renderToStaticMarkup(fixture().tree),/aria-hidden="true"|inert=""/);
 const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 assert.match(css,/data-temporarily-hidden="true"[^}]*translateX\(-100vw\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^\n]*marketplaceShortcutLinks[^\n]*transition:none/);
});
