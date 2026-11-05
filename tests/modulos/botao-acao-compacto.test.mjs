import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
import {corTextoSobreFundo} from '../../app/lib/cores-avanta.ts';
const file=new URL('../../app/components/BotaoAcaoCompacto.tsx',import.meta.url);
const hook=registerHooks({resolve(s,c,next){if(s.endsWith('.module.css'))return {url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};return next(s,c);},load(url,c,next){if(url===file.href)return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:Button}=await import(file.href);hook.deregister();
test('ação compacta mantém um botão nativo, variantes, disabled e aria sem submit implícito',()=>{
 for(const variante of ['primario','secundario','discreto','destrutivo']){
  const html=renderToStaticMarkup(React.createElement(Button,{variante,disabled:true,'aria-label':'Salvar teste'},'Salvar'));
  assert.equal((html.match(/<button /g)||[]).length,1);assert.match(html,/type="button"/);assert.match(html,/disabled=""/);assert.match(html,/data-av-action="compact"/);assert.match(html,/aria-label="Salvar teste"/);assert.doesNotMatch(html,/undefined/);
 }
 const html=renderToStaticMarkup(React.createElement(Button,{type:'submit',somenteIcone:true,'aria-label':'Fechar'},React.createElement('svg',{'aria-hidden':true,viewBox:'0 0 24 24'})));
 assert.match(html,/type="submit"/);assert.match(html,/class="face"><svg/);
 const css=readFileSync(new URL('../../app/components/BotaoAcaoCompacto.module.css',import.meta.url),'utf8');assert.match(css,/min-height:44px;min-width:44px/);assert.match(css,/min-height:32px/);assert.match(css,/\.face svg \{ display:block/);
});
test('cor do cabeçalho/ação mantém contraste AA em perfis claros, escuros e cinza',()=>{
 const lum=hex=>{const ch=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return ch[0]*.2126+ch[1]*.7152+ch[2]*.0722;};
 for(const bg of ['#003e73','#d00000','#ffffff','#000000','#ffff00','#808080','#00ff00','#ff00ff']){
  const fg=corTextoSobreFundo(bg),l1=lum(bg),l2=lum(fg);assert.ok((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)>=4.5,bg);
 }
 assert.equal(corTextoSobreFundo('#fff'),'#000000');assert.equal(corTextoSobreFundo('inválida'),'#ffffff');
});
