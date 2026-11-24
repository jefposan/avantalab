import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadPublicLanding,readPublicSource} from './public-landing-harness.mjs';
const shared=loadPublicLanding(readPublicSource('app/components/AvantaLandingPage.tsx')).AvantaLandingPage;
const home=loadPublicLanding(readPublicSource('app/page.tsx'),{shared});
const laboratory=loadPublicLanding(readPublicSource('app/laboratorio-de-marcas/page.tsx'),{shared});
const finance=loadPublicLanding(readPublicSource('app/gestao-financeira/page.tsx'),{shared});
test('rotas públicas exportam somente página e metadados, sem componente compartilhado no contrato do Next',()=>{
 for(const file of ['app/page.tsx','app/gestao-financeira/page.tsx','app/laboratorio-de-marcas/page.tsx']){
  const ast=ts.createSourceFile(file,readPublicSource(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const node of ast.statements){
   if(!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
   if(node.modifiers.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))continue;
   assert.ok(ts.isVariableStatement(node)&&node.declarationList.declarations.every(d=>d.name.getText(ast)==='metadata'),`export incompatível com página: ${file}`);
  }
 }
});
test('início abre Gestão e Laboratório mantém rota própria, conteúdo e metadados coerentes',()=>{
 const inicio=home.default(),lab=laboratory.default(),gestao=finance.default();
 for(const pagina of [inicio,lab,gestao])assert.equal(pagina.type,shared);
 assert.equal(lab.props.contexto,'laboratorio');assert.equal(gestao.props.contexto,'gestao');
 assert.equal(home.metadata.alternates.canonical,'https://avantalab.com.br');
 assert.equal(finance.metadata.alternates.canonical,home.metadata.alternates.canonical);
 assert.equal(laboratory.metadata.alternates.canonical,'https://avantalab.com.br/laboratorio-de-marcas');
 for(const pagina of [home,finance,laboratory])assert.equal(pagina.metadata.openGraph.url,pagina.metadata.alternates.canonical);
 const a=renderToStaticMarkup(React.createElement(shared,inicio.props)),b=renderToStaticMarkup(React.createElement(shared,lab.props)),c=renderToStaticMarkup(React.createElement(shared,gestao.props));
 assert.match(a,/Números claros para a empresa/);assert.equal(a,c);assert.notEqual(a,b);
 assert.match(b,/Laboratório de Marcas/);assert.doesNotMatch(b,/Números claros para a empresa/);
 assert.match(b,/'?https:\/\/avantalab.com.br\/laboratorio-de-marcas/);
 for(const html of [a,b,c]){assert.match(html,/application\/ld\+json/);assert.match(html,/Pular para o conteúdo/);}
});

test('seletor apresenta Gestão à esquerda e Laboratório à direita, com apenas o contexto atual selecionado',()=>{
 const Header=loadPublicLanding(readPublicSource('app/components/LandingHeader.tsx')).default;
 for(const contexto of ['gestao','laboratorio']){
  const html=renderToStaticMarkup(React.createElement(Header,{contexto}));
  const seletor=html.match(/<div class="contextSwitcher"[^>]*>(.*?)<\/div>/)?.[1];assert.ok(seletor);
  const links=[...seletor.matchAll(/<a ([^>]+)>([^<]+)<\/a>/g)];
  assert.deepEqual(links.map(l=>l[2]),['Gestão Financeira','Laboratório de Marcas']);
  assert.match(links[0][1],/href="\/"/);assert.match(links[1][1],/href="\/laboratorio-de-marcas"/);
  assert.equal(links.filter(l=>l[1].includes('aria-current="page"')).length,1);
  assert.match(links[contexto==='gestao'?0:1][1],/aria-current="page"/);
 }
});
