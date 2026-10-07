import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const mobile = readFileSync('public/mobile-app.js', 'utf8');
function trecho(inicio, fim) { return mobile.slice(mobile.indexOf(inicio), mobile.indexOf(fim, mobile.indexOf(inicio))); }
function ambiente({ token = 'antigo', erroAuth = null, usuario = { id: 'usuario' }, status = 401, codigo = 'sessao_expirada' } = {}) {
  const chamadas = [];
  const state = { autenticado: true, pronto: true, empresa: { id: 'empresa' }, empresas: [], lancamentos: ['preservado'], sessaoDispositivoTimer: 1 };
  const ctx = vm.createContext({
    state, Promise, Error, console: { error() {} },
    window: { clearInterval() { chamadas.push('limpar-timer'); } },
    tokenSessao: async () => token,
    aguardarTokenSessaoAtualizadoMobile: async () => token,
    promessaMobileComPrazo: async (p) => p,
    db: { auth: { getUser: async () => ({ error: erroAuth, data: { user: usuario } }),
      signOut: async (opcoes) => chamadas.push(['logout', opcoes.scope]) } },
    limparSessaoLocalMobile() { chamadas.push('limpar-sessao'); },
    limparPreferenciaSessaoMobile() { chamadas.push('limpar-preferencia'); },
    cancelarJanelasMobile() { chamadas.push('fechar-janelas'); },
    abrirLoginAposFalhaSessaoMobile() { state.autenticado = false; state.pronto = true; chamadas.push('login'); },
    requisitarJsonMobileComRetry: async () => { chamadas.push(['cadastro', token]); return { resposta: { ok: status === 200, status }, json: { codigo, mensagem: 'erro', cadastro: {} } }; },
    render() { chamadas.push('render'); },
  });
  vm.runInContext(trecho('  var recuperacaoSessaoMobilePromise', '  function idDispositivoSessaoMobile'), ctx);
  vm.runInContext(trecho('  async function carregarCadastroPerfilMobile(', '  async function abrirEdicaoCadastroPerfilMobile('), ctx);
  return { ctx, state, chamadas };
}

test('session_not_found limpa somente a sessão local e abre login, sem nova tentativa com token antigo', async () => {
  const { ctx, state, chamadas } = ambiente({ usuario: null, erroAuth: { status: 403, code: 'session_not_found' } });
  assert.equal(await ctx.carregarCadastroPerfilMobile(), false);
  assert.equal(state.autenticado, false);
  assert.equal(state.empresa, null);
  assert.ok(state.mensagem.includes('dados foram preservados'));
  assert.equal(chamadas.filter(c => Array.isArray(c) && c[0] === 'cadastro').length, 1);
  assert.deepEqual(chamadas.filter(c => Array.isArray(c) && c[0] === 'logout'), [['logout', 'local']]);
});

test('403 de vínculo não encerra login nem repete a chamada de cadastro', async () => {
  const { ctx, state, chamadas } = ambiente({ status: 403, codigo: 'perfil_nao_autorizado' });
  assert.equal(await ctx.carregarCadastroPerfilMobile(), false);
  assert.equal(state.autenticado, true);
  assert.equal(state.cadastroPerfilErroCodigo, 'perfil_nao_autorizado');
  assert.deepEqual(state.lancamentos, ['preservado']);
  assert.equal(chamadas.filter(c => Array.isArray(c)).length, 1);
});

test('503 de serviço preserva autenticação, perfil e dados', async () => {
  const { ctx, state, chamadas } = ambiente({ status: 503 });
  assert.equal(await ctx.carregarCadastroPerfilMobile(), false);
  assert.equal(state.autenticado, true);
  assert.equal(state.empresa.id, 'empresa');
  assert.deepEqual(state.lancamentos, ['preservado']);
  assert.ok(!chamadas.includes('login'));
});

test('401 seguido de falha de rede na confirmação não força logout', async () => {
  const { ctx, state, chamadas } = ambiente({ usuario: null, erroAuth: { name: 'AuthRetryableFetchError', status: 0 } });
  assert.equal(await ctx.carregarCadastroPerfilMobile(), false);
  assert.equal(state.autenticado, true);
  assert.ok(!chamadas.includes('login'));
});

test('recuperações concorrentes compartilham a confirmação e encerramento local', async () => {
  const { ctx, chamadas } = ambiente({ usuario: null, erroAuth: { status: 403, code: 'session_not_found' } });
  await Promise.all([ctx.recuperarSessaoExpiradaMobile('antigo'), ctx.recuperarSessaoExpiradaMobile('antigo')]);
  assert.equal(chamadas.filter(c => Array.isArray(c) && c[0] === 'logout').length, 1);
});

test('token renovado nativamente é usado uma única vez, sem refresh concorrente', async () => {
  const { ctx, state, chamadas } = ambiente();
  ctx.aguardarTokenSessaoAtualizadoMobile = async () => 'novo';
  ctx.requisitarJsonMobileComRetry = async (_url, opcoes) => {
    chamadas.push(opcoes.headers.Authorization);
    return opcoes.headers.Authorization === 'Bearer novo'
      ? { resposta: { ok: true, status: 200 }, json: { cadastro: { nome: 'original' } } }
      : { resposta: { ok: false, status: 401 }, json: {} };
  };
  assert.equal(await ctx.carregarCadastroPerfilMobile(), true);
  assert.deepEqual(chamadas, ['Bearer antigo', 'Bearer novo']);
  assert.equal(state.autenticado, true);
  assert.equal(state.cadastroPerfilDados.nome, 'original');
});

test('resposta de perfil anterior não sobrescreve estado após a troca', async () => {
  const { ctx, state } = ambiente({ status: 200 });
  ctx.requisitarJsonMobileComRetry = async () => {
    state.empresa = { id: 'outra' };
    return { resposta: { ok: true }, json: { cadastro: { nome: 'anterior' } } };
  };
  assert.equal(await ctx.carregarCadastroPerfilMobile(), false);
  assert.equal(state.cadastroPerfilDados, null);
});

function ambienteSessao(opcoes = {}) {
  const a = ambiente(opcoes);
  Object.assign(a.ctx, {
    COBRANCA_ATIVA_MOBILE: true,
    idDispositivoSessaoMobile: () => 'aparelho',
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, ativa: true }) }),
  });
  a.ctx.requisitarJsonMobile = async () => {
    const resposta = await a.ctx.fetch();
    return { resposta, json: await resposta.json() };
  };
  vm.runInContext(trecho('  async function confirmarSessaoDispositivoMobile(', '  function iniciarControleSessaoDispositivoMobile('), a.ctx);
  return a;
}

test('política revogada bloqueia só o perfil, sem logout global ou local', async () => {
  const { ctx, state, chamadas } = ambienteSessao();
  ctx.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, ativa: false, codigo: 'perfil_em_outro_dispositivo' }) });
  assert.equal((await ctx.confirmarSessaoDispositivoMobile('verificar')).ativa, false);
  assert.equal(state.autenticado, true);
  assert.equal(state.cadastroPerfilErroCodigo, 'perfil_em_outro_dispositivo');
  assert.ok(!chamadas.some(c => Array.isArray(c) && c[0] === 'logout'));
});

test('política HTTP 503/JSON inválido nunca é apresentada como sessão confirmada', async () => {
  const { ctx, state, chamadas } = ambienteSessao();
  for (const resposta of [
    { ok: false, status: 503, json: async () => ({ mensagem: 'indisponível' }) },
    { ok: true, status: 200, json: async () => { throw new Error('JSON inválido'); } },
  ]) {
    ctx.fetch = async () => resposta;
    const r = await ctx.confirmarSessaoDispositivoMobile('verificar');
    assert.equal(r.ativa, false); assert.equal(r.temporaria, true);
    assert.equal(state.autenticado, true);
    assert.ok(!chamadas.includes('login'));
  }
});

test('401 na política recupera a sessão expirada em vez de liberar acesso', async () => {
  const { ctx, state } = ambienteSessao({ usuario: null, erroAuth: { code: 'session_not_found', status: 403 } });
  ctx.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  assert.equal((await ctx.confirmarSessaoDispositivoMobile('entrar')).ativa, false);
  assert.equal(state.autenticado, false);
});

test('verificação de política em outro perfil não modifica o perfil atual', async () => {
  const { ctx, state } = ambienteSessao();
  ctx.fetch = async () => {
    state.empresa = { id: 'outro' };
    return { ok: true, status: 200, json: async () => ({ ok: true, ativa: false }) };
  };
  const r = await ctx.confirmarSessaoDispositivoMobile('verificar');
  assert.equal(r.obsoleta, true);
  assert.equal(state.cadastroPerfilErro, undefined);
});
