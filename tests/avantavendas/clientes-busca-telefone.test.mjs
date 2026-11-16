import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['normalizar', 'telefoneCorrespondeBusca', 'clientesFiltrados', 'clientesDisponiveisPedido', 'clientesFiltradosLancamento'];
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(ast)).join('\n');
function contexto() {
  const clientes = [
    { id: 'ana', nome: 'Ana Júlia', telefone: '+55 (11) 98765-4321', email: 'ana@teste.com' },
    { id: 'bia', nome: 'Bia', telefone: '21912345678' },
    { id: 'inativo', nome: 'Inativo', telefone: '(11) 98765-4321', ativo: false },
    { id: 'sem', nome: 'Sem telefone', telefone: null },
  ];
  const ctx = vm.createContext({ state: { clientes }, buscaAplicada: '', ordemAlfabetica: 'asc' });
  vm.runInContext(code, ctx);
  return ctx;
}
test('telefone completo ou parcial funciona com ou sem máscara nas duas buscas', () => {
  const ctx = contexto(), antes = JSON.stringify(ctx.state.clientes);
  for (const termo of ['987654321', '76543', '4321', '11 98765-4321', '+55 (11) 98765-4321', ' 98765.4321 ']) {
    ctx.buscaAplicada = termo;
    assert.ok(ctx.clientesFiltrados().some(c => c.id === 'ana'), termo);
    assert.deepEqual(Array.from(ctx.clientesFiltradosLancamento(termo), c => c.id), ['ana'], termo);
  }
  ctx.buscaAplicada = '(21) 91234-5678';
  assert.deepEqual(Array.from(ctx.clientesFiltrados(), c => c.id), ['bia']);
  assert.equal(JSON.stringify(ctx.state.clientes), antes);
});
test('preserva nome, e-mail, vazio, ordenação e não confunde texto misto com telefone', () => {
  const ctx = contexto();
  for (const termo of ['julia', 'ana@teste.com']) {
    ctx.buscaAplicada = termo;
    assert.deepEqual(Array.from(ctx.clientesFiltrados(), c => c.id), ['ana']);
  }
  for (const termo of ['xyz4321', '---', '()', '999999999999']) {
    ctx.buscaAplicada = termo;
    assert.equal(ctx.clientesFiltrados().length, 0);
    assert.equal(ctx.clientesFiltradosLancamento(termo).length, 0);
  }
  ctx.buscaAplicada = '   ';
  assert.equal(ctx.clientesFiltrados().length, 4);
  assert.equal(ctx.clientesFiltradosLancamento('').length, 3);
  ctx.buscaAplicada = '4321'; ctx.ordemAlfabetica = 'desc';
  assert.deepEqual(Array.from(ctx.clientesFiltrados(), c => c.id), ['ana', 'inativo']);
});

test('inativos ficam por último em ambas as ordens e podem ser pesquisados pelo status', () => {
  const ctx = contexto();
  ctx.state.clientes.push({ id: 'inativa-ana', nome: 'Ana Antiga', ativo: false });
  const antes = JSON.stringify(ctx.state.clientes);
  for (const ordem of ['asc', 'desc']) {
    ctx.ordemAlfabetica = ordem; ctx.buscaAplicada = '';
    assert.ok(ctx.clientesFiltrados().slice(0,3).every(c => c.ativo !== false));
    assert.ok(ctx.clientesFiltrados().slice(3).every(c => c.ativo === false));
    ctx.buscaAplicada = '  INATIVO  ';
    assert.equal(ctx.clientesFiltrados().length, 2);
    assert.ok(ctx.clientesFiltrados().every(c => c.ativo === false));
    ctx.buscaAplicada = 'inativo ana';
    assert.deepEqual(Array.from(ctx.clientesFiltrados(), c => c.id), ['inativa-ana']);
    ctx.buscaAplicada = 'inativos 4321';
    assert.deepEqual(Array.from(ctx.clientesFiltrados(), c => c.id), ['inativo']);
  }
  assert.equal(JSON.stringify(ctx.state.clientes), antes);
  assert.ok(ctx.clientesFiltradosLancamento('').every(c => c.ativo !== false));
});

test('filtros de pagamentos têm rótulos claros sem alterar seus identificadores', () => {
  assert.match(source, /botaoFiltroPagamentos\('debito', 'Com débito'\)/);
  assert.match(source, /botaoFiltroPagamentos\('credito', 'Com crédito'\)/);
});
