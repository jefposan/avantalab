import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const app = readFileSync(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8');

test('troca de perfil limpa dados visíveis e invalida respostas do perfil anterior', () => {
  const inicioTroca = app.indexOf('function prepararTrocaContaVendas(contaId)');
  const fimTroca = app.indexOf('\nfunction salvarNomeEmpresaComprovantes()', inicioTroca);
  const troca = app.slice(inicioTroca, fimTroca);

  assert.ok(inicioTroca >= 0 && fimTroca > inicioTroca, 'A preparação de troca de perfil deve existir.');
  for (const campo of [
    'state.produtos = [];',
    'state.clientes = [];',
    'state.vendas = [];',
    'state.pagamentos = [];',
    'state.conteudosVendas = [];',
    'state.divulgacaoPastas = [];',
    'state.divulgacaoMateriais = [];',
  ]) assert.ok(troca.includes(campo), `A troca deve limpar ${campo}.`);
  assert.match(troca, /conteudosSecundariosCarregados = false/);
  assert.match(troca, /revisaoContaVendasAtiva \+= 1/);
  assert.match(app, /function contextoContaVendasPermaneceAtual\(revisao, contaId\)/);
  assert.match(app, /if \(!contextoContaVendasPermaneceAtual\(revisaoContaAoIniciar, contaAoIniciar\)\) return;/);
  assert.match(app, /async function atualizarCatalogoPublicadoAutomaticamente\(\)[\s\S]*contextoContaVendasPermaneceAtual\(revisaoContaAoIniciar, contaAoIniciar\)/);
  assert.match(app, /window\.VendasDb\.definirContaAtiva\(contaId\);\s*prepararTrocaContaVendas\(contaId\);\s*await carregarDadosBackend/s);
});

test('pedido gerado do consignado permite selecionar uma data passada ou atual', () => {
  const inicioAbertura = app.indexOf('function abrirConversaoConsignado(');
  const fimAbertura = app.indexOf('\nfunction confirmarExclusaoPedido', inicioAbertura);
  const abertura = app.slice(inicioAbertura, fimAbertura);
  const inicioGeracao = app.indexOf('async function gerarPedidoDoConsignado(');
  const fimGeracao = app.indexOf('\nfunction dataComprovante', inicioGeracao);
  const geracao = app.slice(inicioGeracao, fimGeracao);

  assert.match(abertura, /dataPedido: isoData\(new Date\(\)\)/);
  assert.match(abertura, /campoDataCentralizado\('consignadoPedidoData', conversaoConsignadoRascunho\.dataPedido, 'Data do pedido'\)/);
  assert.match(geracao, /const dataPedido = String\(document\.getElementById\('consignadoPedidoData'\)\?\.value/);
  assert.match(geracao, /dataEhFutura\(dataPedido\)/);
  assert.match(geracao, /criado_em: new Date\(`\$\{dataPedido\}T12:00:00`\)\.toISOString\(\)/);
});
