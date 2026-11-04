import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  if(s.endsWith('.module.css'))return {url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:Actions}=await import('../../app/marketplaces/PriceToolsActions.tsx');
hook.deregister();
const props={brand:'#d60000',canManage:true,reading:false,canManageConnections:true,copyStatus:'idle',onCreate(){},onEdit(){},onSettings(){},onCopy(){}};
const render=(override={})=>renderToStaticMarkup(React.createElement(Actions,{...props,...override}));
test('quatro ações usam escala oficial e engrenagem com nome acessível',()=>{
  const html=render();assert.equal((html.match(/data-av-action="compact"/g)||[]).length,4);
  assert.match(html,/Criar Lote.*Editar Lotes.*Configurações do AvantaPreços.*Copiar link do AvantaPreços/s);
  assert.match(html,/aria-label="Configurações do AvantaPreços"/);assert.match(html,/<svg aria-hidden="true"/);
  assert.match(html,/--av-action-on-brand:#ffffff/);assert.match(render({brand:'#ffff00'}),/--av-action-on-brand:#000000/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.page \.priceToolsActions button\[data-av-action="compact"\] \{ min-height:44px;padding:6px 0; \}/);
});
test('restrições de lote e autorização da engrenagem preservadas',()=>{
  assert.equal((render({reading:true}).match(/disabled=""/g)||[]).length,2);
  assert.equal((render({canManage:false}).match(/disabled=""/g)||[]).length,1);
  const limited=render({canManageConnections:false});assert.doesNotMatch(limited,/Configurações do AvantaPreços/);
  assert.equal((limited.match(/data-av-action="compact"/g)||[]).length,3);
});
test('cópia mantém confirmação acessível, contraste e retorno de erro',()=>{
  assert.match(render({copyStatus:'copied'}),/--brand:#147a58;--av-action-on-brand:#ffffff/);
  assert.match(render({copyStatus:'copied'}),/aria-live="polite"[^>]*>.*Link copiado/s);
  assert.match(render({copyStatus:'error'}),/role="alert">Não foi possível copiar. Tente novamente./);
});
