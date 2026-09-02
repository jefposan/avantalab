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

test('novo pedido e novo pagamento abrem o comprovante sem aviso redundante', () => {
  const inicioPedido = aplicacao.indexOf('async function finalizarPedidoCliente()');
  const fimPedido = aplicacao.indexOf('function abrirEditarPedido(', inicioPedido);
  const fluxoPedido = aplicacao.slice(inicioPedido, fimPedido);
  const inicioPagamento = aplicacao.indexOf('async function confirmarPagamentoCliente()');
  const fimPagamento = aplicacao.indexOf('function abrirEditarPagamentoCliente(', inicioPagamento);
  const fluxoPagamento = aplicacao.slice(inicioPagamento, fimPagamento);

  assert.match(fluxoPedido, /abrirPedidoCliente\(salvo\.id\);/);
  assert.match(fluxoPagamento, /abrirPagamentoClienteDetalhe\(salvo\.id\);/);
  assert.doesNotMatch(fluxoPedido, /Pedido registrado\. O comprovante está pronto para compartilhar\./);
  assert.doesNotMatch(fluxoPagamento, /Recebimento confirmado\. Saldo conferido com o servidor\./);
  assert.match(fluxoPedido, /toast\(traduzErro\(error\)\)/);
  assert.match(fluxoPagamento, /toast\(traduzErro\(error\)\)/);
});

test('pedido e pagamento exibem confirmação antes da sincronização financeira', () => {
  const inicioPedido = aplicacao.indexOf('async function finalizarPedidoCliente()');
  const fimPedido = aplicacao.indexOf('function abrirEditarPedido(', inicioPedido);
  const fluxoPedido = aplicacao.slice(inicioPedido, fimPedido);
  const inicioPagamento = aplicacao.indexOf('async function confirmarPagamentoCliente()');
  const fimPagamento = aplicacao.indexOf('function listaPagamentosPaginaHtml(', inicioPagamento);
  const fluxoPagamento = aplicacao.slice(inicioPagamento, fimPagamento);

  assert.ok(fluxoPedido.indexOf("textContent = 'Confirmando...'") < fluxoPedido.indexOf('await saldoFinanceiroConfirmadoCliente('));
  assert.ok(fluxoPagamento.indexOf("textContent = 'Confirmando...'") < fluxoPagamento.indexOf('await saldoFinanceiroConfirmadoCliente('));
  assert.match(fluxoPedido, /if \(!rascunho \|\| pedidoClienteSalvando\) return;/);
  assert.match(fluxoPagamento, /if \(!rascunho \|\| pagamentoClienteSalvando\) return;/);
  assert.match(fluxoPedido, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(fluxoPagamento, /setAttribute\('aria-busy', 'true'\)/);
});

test('aviso rápido permanece acessível acima das camadas modais', () => {
  assert.match(aplicacao, /el\.setAttribute\('role', dados\.tipo === 'erro' \? 'alert' : 'status'\)/);
  assert.match(aplicacao, /el\.setAttribute\('aria-live', dados\.tipo === 'erro' \? 'assertive' : 'polite'\)/);
  assert.match(aplicacao, /el\.setAttribute\('aria-atomic', 'true'\)/);
  assert.match(estilos, /\.toast \{[\s\S]*z-index: calc\(var\(--vendas-layer-modal\) \+ 40\);/);
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
