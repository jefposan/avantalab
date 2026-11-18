import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const codigo=readFileSync('app/custos/CustosWorkspace.tsx','utf8');
const css=readFileSync('app/custos/custos.module.css','utf8');
test('Voltar precede Novo serviço e usa a navegação protegida para Catálogos',()=>{
  assert.match(codigo,/onVoltarCatalogos=\{\(\) => abrirAba\('catalogos'\)\}/);
  const lista=codigo.split("if (modo === 'lista') return <>")[1].split('title="Atualizar listas de preços"')[0];
  assert.ok(lista.indexOf('onClick={onVoltarCatalogos}')<lista.indexOf("iniciar('servico')"));
  assert.match(lista,/disabled=\{salvando \|\| processandoLote\} onClick=\{onVoltarCatalogos\}/);
});
test('apenas a tabela fica na área rolável oficial, sem ocultar acesso por teclado',()=>{
  const lista=codigo.split("if (modo === 'lista') return <>")[1];
  assert.match(lista,/DetalhesRolaveis cabecalhoId=\{cabecalhoListaId\} rotulo="Lista de produtos e serviços"/);
  assert.ok(lista.indexOf('styles.catalogListTools')<lista.indexOf('<DetalhesRolaveis'));
  assert.match(css,/\.productsPage>\.panel\{[^}]*min-height:0/);
  assert.match(css,/\.productsPage \.productsScroll\{[^}]*scrollbar-width:none/);
  assert.match(css,/\.productsScroll::-webkit-scrollbar[^}]*display:none/);
  assert.match(readFileSync('app/components/DetalhesRolaveis.tsx','utf8'),/tabIndex=\{0\}/);
});
