import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const trecho = fonte.slice(fonte.indexOf('async function carregarDadosBackend('), fonte.indexOf('async function carregarConteudosSecundariosVendas('));
function ambiente() {
  const avisos = []; let tentativas = 0;
  const ctx = vm.createContext({
    revisaoDadosOperacionais: 0, revisaoContaVendasAtiva: 0, requisicaoCarregamentoBackendVendas: 0,
    contaVendasDoContextoAtual: () => 'conta', contextoContaVendasPermaneceAtual: () => true,
    carregandoBackend: false, contextoAberturaVendas: null, state: { autenticado: true, acessoVendas: {} },
    console: { error() {} }, traduzErro: (e) => e.message, toast: (e) => avisos.push(e),
    erroTemporarioPersistencia: (e) => e.code === 'AVANTA_TIMEOUT',
    erroSessaoExpiradaVendas: (e) => /sessão expirada/.test(e.message),
    sincronizacaoRetomadaAguardandoTela: false, contaLeituraPendenteVendas: '',
    agendarTentativaRedeVendas: () => { tentativas++; }, atualizarAcoesCabecalhoSistemaVendas() {},
    render() {}, podeAplicarDadosRetomadaVendas: () => true, liberarAlturaPreparacao() {},
    provedorOAuthNativoPendente: '', limparLoginSocialPendenteVendas() {},
    comLimiteDeTempo: (p) => p, window: { VendasDb: { loadAll: async () => { throw Object.assign(new Error('demorou'), { code: 'AVANTA_TIMEOUT' }); } } },
  });
  vm.runInContext(trecho, ctx);
  return { ctx, avisos, tentativas: () => tentativas };
}
test('demora de leitura em segundo plano mantém sessão/dados, sinaliza pendência e tenta depois sem erro vermelho', async () => {
  const { ctx, avisos, tentativas } = ambiente();
  ctx.state.produtos = [{ id: 'preservado' }];
  await ctx.carregarDadosBackend(false, true, true, true);
  assert.equal(ctx.state.autenticado, true);
  assert.equal(ctx.state.produtos[0].id, 'preservado');
  assert.equal(ctx.contaLeituraPendenteVendas, 'conta');
  assert.equal(tentativas(), 1);
  assert.equal(avisos.length, 0);
});
test('primeira carga e ação explícita continuam mostrando falhas reais', async () => {
  const { ctx, avisos } = ambiente();
  await ctx.carregarDadosBackend(false, true, true);
  assert.deepEqual(avisos, ['demorou']);
  const falha = ambiente(); falha.ctx.window.VendasDb.loadAll = async () => { throw new Error('Acesso negado'); };
  await falha.ctx.carregarDadosBackend(false, true, true, true);
  assert.deepEqual(falha.avisos, ['Acesso negado']);
});
test('erro de consulta substituída não vaza para o aviso de uma consulta nova', async () => {
  const { ctx, avisos } = ambiente();
  let rejeitar;
  ctx.window.VendasDb.loadAll = () => new Promise((_, reject) => { rejeitar = reject; });
  const antiga = ctx.carregarDadosBackend(false, true, true);
  ctx.window.VendasDb.loadAll = async () => { throw new Error('erro da atual'); };
  await ctx.carregarDadosBackend(false, true, true);
  rejeitar(new Error('erro obsoleto')); await antiga;
  assert.deepEqual(avisos, ['erro da atual']);
  assert.equal(ctx.state.erroBackend, undefined);
});
test('autorização negada nunca vira apenas pendência, mesmo quando a conexão também está indisponível', async () => {
  const { ctx, avisos, tentativas } = ambiente();
  ctx.erroTemporarioPersistencia = () => true;
  ctx.window.VendasDb.loadAll = async () => { throw Object.assign(new Error('Acesso negado'), { status: 403 }); };
  await ctx.carregarDadosBackend(false, true, true, true);
  assert.deepEqual(avisos, ['Acesso negado']);
  assert.equal(tentativas(), 0);
});
test('temporizador termina tanto no sucesso como no erro e mantém rejeição da operação', async () => {
  let limpos = 0;
  const ctx = vm.createContext({ window: { setTimeout: () => 1, clearTimeout: () => { limpos++; } } });
  vm.runInContext(fonte.slice(fonte.indexOf('function comLimiteDeTempo('), fonte.indexOf('function contaVendasDoContextoAtual(')), ctx);
  assert.equal(await ctx.comLimiteDeTempo(Promise.resolve(42)), 42);
  await assert.rejects(ctx.comLimiteDeTempo(Promise.reject(new Error('falhou'))), /falhou/);
  assert.equal(limpos, 2);
});
test('atualização automática de vínculo usa retomada e temporizador não afeta gravações', () => {
  const vinculo = fonte.slice(fonte.indexOf('async function atualizarVinculoAprovadoAutomaticamente('), fonte.indexOf('async function atualizarVinculoAprovadoAutomaticamente(') + 1800);
  assert.match(vinculo, /carregarDadosBackend\(false, false, true, true\)/);
  assert.doesNotMatch(trecho, /state\.erroBackend/);
  const salvar = fonte.slice(fonte.indexOf('async function finalizarPedidoCliente('), fonte.indexOf('function abrirEditarPedido('));
  assert.match(salvar, /toast\(traduzErro\(error\)/);
});
