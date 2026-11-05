import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
const read=path=>readFileSync('app/'+path,'utf8');
const registryExports={};
vm.runInNewContext(ts.transpileModule(read('lib/modulos-registro.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:registryExports,require(name){if(name==='./planos-comerciais')return{VALOR_MODULO_AVULSO_MENSAL:1};throw Error('Importação inesperada: '+name);}});
const REGISTRO_MODULOS=Array.from(registryExports.REGISTRO_MODULOS);
const clients={projetos:'projetos/ProjetosClient.tsx',custos:'custos/CustosClient.tsx',recebimentos_presencial:'recebimentos/RecebimentosPaginaClient.tsx',vendas:'vendas/VendasIntegrado.tsx',marketplaces:'marketplaces/MarketplacesClient.tsx'};
test('todo módulo Web de página própria reutiliza o rodapé oficial; novos módulos precisam declarar cobertura',()=>{
 for(const module of REGISTRO_MODULOS.filter(m=>m.superficies.includes('web')&&m.navegacao.modo==='pagina_total')){
  assert.ok(clients[module.id],`Declarar cliente e cobertura de rodapé para ${module.id}`);
  const source=read(clients[module.id]);
  assert.match(source,/import RodapeAvanta from '@\/app\/components\/RodapeAvanta'/,module.id);
  assert.match(source,/<RodapeAvanta(?:\s|\/>)/,module.id);
 }
});
test('módulos integrados mantêm rodapé da Gestão; Marketplaces informa seu próprio tema e não copia marcação',()=>{
 assert.deepEqual(REGISTRO_MODULOS.filter(m=>m.navegacao.modo==='integrado').map(m=>m.id),['ponto','vendas_mobile']);
 const host=read('gestao/page.tsx');assert.match(host,/<footer/);assert.match(host,/v\{APP_VERSION\}/);
 const market=read(clients.marketplaces);assert.match(market,/<RodapeAvanta darkMode=\{effectiveDark\} \/>/);
 assert.doesNotMatch(market,/<footer|Todos os direitos reservados|instagram\.com\/avanta\.lab/);
 assert.ok(market.lastIndexOf('<RodapeAvanta')>market.lastIndexOf('<ModalConfirmacao'));
});
test('rodapé oficial renderiza marca, versão, direitos e links legais em claro e escuro, sem posição fixa',()=>{
 const exports={};
 vm.runInNewContext(ts.transpileModule(read('components/RodapeAvanta.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Date,require(name){
  if(name==='react/jsx-runtime')return jsx;
  if(name==='next/link')return{default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
  if(name==='@/app/lib/version')return{APP_VERSION:'VERSAO-DO-MODULO'};
  throw Error('Importação inesperada: '+name);
 }});
 for(const darkMode of [false,true]){
  const html=renderToStaticMarkup(React.createElement(exports.default,{darkMode}));
  assert.match(html,/<footer/);assert.match(html,/vVERSAO-DO-MODULO/);assert.match(html,/Todos os direitos reservados/);
  assert.match(html,/aria-label="Informações legais"/);assert.match(html,/href="\/termos"/);assert.match(html,/href="\/privacidade"/);
  assert.match(html,/https:\/\/www\.instagram\.com\/avanta\.lab/);assert.match(html,darkMode?/bg-slate-900/:/bg-white/);
  assert.doesNotMatch(html,/\bfixed\b|\bsticky\b/);
 }
});
