import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadPublicLanding,readPublicSource} from './public-landing-harness.mjs';
const shared=loadPublicLanding(readPublicSource('app/components/AvantaLandingPage.tsx')).AvantaLandingPage;
const home=loadPublicLanding(readPublicSource('app/page.tsx'),{shared});
const finance=loadPublicLanding(readPublicSource('app/gestao-financeira/page.tsx'),{shared});
test('rotas públicas exportam somente página e metadados, sem componente compartilhado no contrato do Next',()=>{
 for(const file of ['app/page.tsx','app/gestao-financeira/page.tsx']){
  const ast=ts.createSourceFile(file,readPublicSource(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const node of ast.statements){
   if(!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
   if(node.modifiers.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))continue;
   assert.ok(ts.isVariableStatement(node)&&node.declarationList.declarations.every(d=>d.name.getText(ast)==='metadata'),`export incompatível com página: ${file}`);
  }
 }
});
test('Laboratório e Gestão reutilizam o componente real, preservando contexto, metadados e conteúdo distinto',()=>{
 const lab=home.default(),gestao=finance.default();assert.equal(lab.type,shared);assert.equal(gestao.type,shared);assert.equal(lab.props.contexto,undefined);assert.equal(gestao.props.contexto,'gestao');
 assert.equal(home.metadata.alternates.canonical,'https://avantalab.com.br');assert.equal(finance.metadata.alternates.canonical,'https://avantalab.com.br/gestao-financeira');
 assert.equal(home.metadata.openGraph.url,home.metadata.alternates.canonical);assert.equal(finance.metadata.openGraph.url,finance.metadata.alternates.canonical);
 const a=renderToStaticMarkup(React.createElement(shared,lab.props)),b=renderToStaticMarkup(React.createElement(shared,gestao.props));
 assert.match(a,/Laboratório de Marcas/);assert.match(b,/Números claros para a empresa/);assert.notEqual(a,b);assert.match(a,/application\/ld\+json/);assert.match(b,/application\/ld\+json/);assert.match(a,/Pular para o conteúdo/);assert.match(b,/Pular para o conteúdo/);
});
