import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const ler = (arquivo) => readFileSync(resolve(raiz, arquivo), 'utf8');
const aplicacao = ler('app/avantavendas/sistema/app.js');
const cliente = ler('app/avantavendas/sistema/supabase-client.js');
const estilos = ler('app/avantavendas/sistema/styles.css');

test('confirmação financeira preserva a resposta gravada enquanto a leitura atualiza', () => {
  assert.match(aplicacao, /reconciliarFinanceiroCliente\(clienteId, confirmados = \{\}\)/);
  assert.match(aplicacao, /atualizarRegistroPersistido\(dados\.vendas \|\| \[\], confirmados\.pedido\)/);
  assert.match(aplicacao, /reconciliarFinanceiroCliente\(salvo\.cliente_id, \{ pedido: salvo \}\)/);
  assert.match(aplicacao, /reconciliarFinanceiroCliente\(pagamento\.cliente_id, \{ pagamento: salvo \}\)/);
  assert.match(aplicacao, /Math\.round\(Number\(valorA \|\| 0\) \* 100\)/);
});

test('pedido é confirmado obrigatoriamente no perfil ativo', () => {
  assert.match(cliente, /const contaId = contaAtivaId\(\);/);
  assert.match(cliente, /String\(data\.conta_id \|\| ''\) !== String\(contaId\)/);
  assert.match(cliente, /O pedido não foi confirmado no perfil de vendas ativo/);
});

test('aviso rápido permanece acessível acima das camadas modais', () => {
  assert.match(aplicacao, /el\.setAttribute\('role', 'alert'\)/);
  assert.match(aplicacao, /el\.setAttribute\('aria-live', 'assertive'\)/);
  assert.match(estilos, /\.toast \{[\s\S]*z-index: calc\(var\(--vendas-layer-modal\) \+ 30\);/);
});

test('troca de tema preserva a estrutura do menu inferior fixo', () => {
  const inicio = aplicacao.indexOf('function alternarTema(ativo)');
  const fim = aplicacao.indexOf('\n}\n', inicio) + 2;
  const funcao = aplicacao.slice(inicio, fim);
  assert.match(funcao, /classList\.toggle\('dark-theme', state\.temaEscuro\)/);
  assert.match(funcao, /salvarEstado\(\)/);
  assert.doesNotMatch(funcao, /render\(\)/);
  assert.match(estilos, /\.vendas-shell-active #app\.app-shell \{[\s\S]*overflow: clip;/);
});
