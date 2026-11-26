import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const codigo=readFileSync('app/custos/CustosWorkspace.tsx','utf8');
const css=readFileSync('app/custos/custos.module.css','utf8');
test('Voltar existe no editor, não na lista, e preserva a confirmação de mudanças pendentes',()=>{
  const lista=codigo.split("if (modo === 'lista') return <>")[1].split('title="Atualizar listas de preços"')[0];
  assert.doesNotMatch(lista,/onVoltarCatalogos|‹ Voltar/);
  assert.match(codigo,/title=\{rascunho.id \? 'Editar produto ou serviço' : 'Novo produto ou serviço'\} actions=\{<button[^>]*disabled=\{salvando\} onClick=\{voltarParaLista\}>‹ Voltar/);
  const start=codigo.indexOf('  const voltarParaLista ='),end=codigo.indexOf('  const selecionarProdutoNoEditor =',start);
  for(const pending of [false,true]){
    const actions=[],env={exports:{},possuiEdicaoPendente:pending,embeddedProduct:false,setConfirmarDescarte:value=>actions.push(['confirm',value]),setModo:value=>actions.push(['mode',value])};
    vm.runInNewContext(codigo.slice(start,end)+'exports.voltar=voltarParaLista;',env);env.exports.voltar();
    assert.deepEqual(actions,pending?[['confirm',true]]:[['mode','lista']]);
  }
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
