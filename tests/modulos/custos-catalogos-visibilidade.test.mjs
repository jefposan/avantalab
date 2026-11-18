import test from 'node:test';
import assert from 'node:assert/strict';
import { produtosParaCadastro, produtosParaTabelas } from '../../app/custos/catalogos-visibilidade.ts';
const catalogos = [{id:'principal',ativo:false},{id:'local',ativo:true},{id:'teste',ativo:false}];
const produtos = [
  {id:'externo',nome:'Bioplastia Capilar',catalogo_id:'principal'},
  {id:'local',nome:'BIOPLASTIA CAPILAR',catalogo_id:'local'},
  {id:'servico',catalogo_id:'teste'},
  {id:'excluido',catalogo_id:'local',excluido_em:'2026-11-18'},
  {id:'outroPerfil',catalogo_id:'alheio'},
];
test('cadastro administra todos ou um catálogo, inclusive desativados, sem incluir excluídos', () => {
  assert.deepEqual(produtosParaCadastro(produtos,catalogos).map(x=>x.id),['externo','local','servico']);
  assert.deepEqual(produtosParaCadastro(produtos,catalogos,'principal').map(x=>x.id),['externo']);
  assert.deepEqual(produtosParaCadastro(produtos,catalogos,'inexistente'),[]);
});
test('tabelas exibem somente destinos locais ativos, nunca apenas AvantaVendas', () => {
  const antes=JSON.stringify(produtos);
  assert.deepEqual(produtosParaTabelas(produtos,catalogos).map(x=>x.id),['local']);
  assert.deepEqual(produtosParaTabelas(produtos,catalogos.map(x=>({...x,ativo:false}))),[]);
  assert.deepEqual(produtosParaTabelas(produtos,catalogos.map(x=>({...x,ativo:true}))).map(x=>x.id),['externo','local','servico']);
  assert.equal(JSON.stringify(produtos),antes);
});
