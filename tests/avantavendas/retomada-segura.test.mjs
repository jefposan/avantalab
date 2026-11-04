import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const app = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const banco = readFileSync(new URL('../../app/avantavendas/sistema/supabase-client.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const funcao = (nome) => {
  const no = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === nome);
  assert.ok(no, nome);
  return no.getText(ast);
};
const pausa = () => new Promise((resolver) => setImmediate(resolver));
const pendente = () => {
  let resolver;
  const promessa = new Promise((resolve) => { resolver = resolve; });
  return { promessa, resolver };
};
const armazenamento = () => {
  const dados = new Map();
  return { dados, getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor), removeItem: (chave) => dados.delete(chave) };
};

function clienteAuth() {
  const usuario = { id: 'jeff', email: 'teste@example.com' };
  let sessao = { user: usuario, access_token: 'token-1', expires_at: Math.floor(Date.now() / 1000) + 3600 };
  const contagem = { usuario: 0, renovacao: 0 };
  let evento;
  const auth = {
    getSession: async () => ({ data: { session: sessao } }),
    getUser: async () => { contagem.usuario++; return { data: { user: usuario } }; },
    refreshSession: async () => { contagem.renovacao++; return { data: { session: sessao } }; },
    onAuthStateChange: (callback) => { evento = callback; },
    signOut: async () => ({ error: null }),
  };
  const contexto = vm.createContext({
    window: { VENDAS_MOBILE_CONFIG: { supabaseUrl: 'https://teste.invalid', supabaseAnonKey: 'publica-teste' }, supabase: { createClient: () => ({ auth }) } },
    localStorage: armazenamento(), console, Date, URL, navigator: {},
  });
  vm.runInContext(banco, contexto);
  return { db: contexto.window.VendasDb, auth, usuario, contagem, emitir: (tipo, nova = sessao) => evento(tipo, nova), setSessao: (nova) => { sessao = nova; }, get sessao() { return sessao; } };
}

test('consultas concorrentes compartilham somente a confirmação em andamento, não autorização permanente', async () => {
  const f = clienteAuth();
  const leitura = pendente();
  f.auth.getUser = async () => { f.contagem.usuario++; return leitura.promessa; };
  const consultas = Array.from({ length: 8 }, () => f.db.currentUser());
  await pausa();
  assert.equal(f.contagem.usuario, 1);
  f.emitir('INITIAL_SESSION');
  leitura.resolver({ data: { user: f.usuario } });
  assert.deepEqual((await Promise.all(consultas)).map((user) => user.id), Array(8).fill('jeff'));
  await f.db.currentUser();
  assert.equal(f.contagem.usuario, 2);
  assert.equal(f.contagem.renovacao, 0);
});

test('retorno simultâneo com token vencido faz uma única renovação', async () => {
  const f = clienteAuth();
  f.setSessao({ ...f.sessao, expires_at: 1 });
  const renovar = pendente();
  f.auth.refreshSession = async () => { f.contagem.renovacao++; return renovar.promessa; };
  const consultas = [f.db.currentUser(), f.db.currentUser(), f.db.ensureSession()];
  await pausa();
  assert.equal(f.contagem.renovacao, 1);
  f.setSessao({ ...f.sessao, access_token: 'renovado', expires_at: Math.floor(Date.now() / 1000) + 3600 });
  renovar.resolver({ data: { session: f.sessao } });
  await Promise.all(consultas);
  assert.equal(f.contagem.usuario, 1);
});

for (const evento of ['SIGNED_OUT', 'USER_UPDATED', 'SIGNED_IN']) {
  test(`consulta anterior não pode autenticar depois de ${evento}`, async () => {
    const f = clienteAuth();
    const leitura = pendente();
    f.auth.getUser = async () => leitura.promessa;
    const consulta = f.db.currentUser();
    const rejeitada = assert.rejects(consulta, { code: 'AVANTAVENDAS_SESSAO_ALTERADA' });
    await pausa();
    f.emitir(evento, evento === 'SIGNED_OUT' ? null : { user: { id: 'outro-usuario' } });
    leitura.resolver({ data: { user: f.usuario } });
    await rejeitada;
  });
}

test('falha de rede não gira token válido; sessão realmente recusada continua inválida', async () => {
  const f = clienteAuth();
  f.auth.getUser = async () => ({ error: new Error('Failed to fetch'), data: {} });
  await assert.rejects(f.db.currentUser(), /fetch/);
  assert.equal(f.contagem.renovacao, 0);
  f.auth.getSession = async () => ({ error: new Error('Invalid refresh token'), data: {} });
  assert.equal(await f.db.currentUser(), null);
});

function fluxoRetomada(plataforma = 'web') {
  let agora = 100000;
  const chamadas = { sessao: 0, carga: 0, render: 0, outbox: 0, complementar: 0, renovar: 0, fechar: 0 };
  const timers = new Map();
  let proximo = 0;
  const contexto = vm.createContext({
    console, Promise, HTMLElement: class {},
    Date: class extends Date { static now() { return agora; } },
    state: { autenticado: true, acessoVendas: {}, usuario: { id: 'jeff' }, contaVendasAtiva: { id: 'bora' }, moduloVendasAtivo: true, aba: 'clientes', menuAberto: false, agendaItens: [], produtos: ['existente'] },
    backendAtivo: true, modoOfflineVendas: false, carregandoBackend: false, preparandoRecursosSala: false,
    loginSocialPendente: '', concluindoOAuthNativoVendas: false, processandoRetornoOAuthNativoVendas: false,
    revisaoContaVendasAtiva: 1, revisaoNavegacaoManual: 0, revisaoDadosOperacionais: 0,
    ultimaAtualizacaoRetomadaVendas: 0, retomadaVendasPendente: null, timerRetomadaVendas: null,
    sincronizacaoRetomadaAguardandoTela: false, mutacoesDadosEmAndamento: 0, arrasteCardsConfiguracoes: null,
    requisicaoCarregamentoBackendVendas: 0, contextoAberturaVendas: null, preferenciasServidorCarregadas: true,
    localStorage: armazenamento(), CONTEXTO_RETOMADA_VENDAS_PREFIXO: 'retomada:',
    navigator: { onLine: true }, document: { visibilityState: 'visible', activeElement: null, getElementById: () => null },
    window: {
      Capacitor: { getPlatform: () => plataforma },
      VendasDb: { ensureSession: async () => { chamadas.sessao++; return { user: { id: 'jeff' } }; }, contaAtivaId: () => contexto.state.contaVendasAtiva.id },
      setTimeout: (callback) => { const id = ++proximo; timers.set(id, callback); return id; },
      clearTimeout: (id) => timers.delete(id),
    },
    renovarSessaoPersistenteVendas: () => chamadas.renovar++,
    limparTentativaRedeVendas() {}, agendarTentativaRedeVendas() {}, limparAcessoOfflineVendas() {},
    atualizarAcoesCabecalhoSistemaVendas() {}, atualizarDisponibilidadeSolicitacaoVozVendas() {},
    reenviarPendenciasVendas: async () => chamadas.outbox++,
    atualizarIndicadoresSincronizacaoVendas: async () => {},
    agendarComplementosAcessoVendas: () => chamadas.complementar++,
    posicaoRolagemPrincipalVendas: () => 320, rolarConteudoPrincipalVendas() {},
    fecharSheet: () => chamadas.fechar++, render: () => chamadas.render++,
    carregarDadosBackend: async (...args) => { chamadas.carga++; assert.deepEqual(args, [false, true, true, true]); contexto.ultimaAtualizacaoRetomadaVendas = agora; },
    traduzErro: () => 'Não foi possível atualizar.', toast() {}, liberarAlturaPreparacao() {}, limparLoginSocialPendenteVendas() {},
    comLimiteDeTempo: (promessa) => promessa, normalizarAgendaItensServidor: (itens) => itens,
    inicializarPreferenciasVendasServidor: async () => {}, salvarCacheVendas: async () => {}, agendarAtualizacaoCatalogoPublicado() {},
    chaveCacheVendas: () => `${contexto.state.usuario.id}:${contexto.state.contaVendasAtiva.id}`,
  });
  for (const nome of ['contaVendasDoContextoAtual', 'contextoContaVendasPermaneceAtual', 'podeAplicarDadosRetomadaVendas', 'erroSessaoExpiradaVendas', 'invalidarSessaoRetomadaVendas', 'agendarRetomadaVendas', 'sincronizarAoReconectarVendas', 'chaveContextoRetomadaVendas', 'salvarContextoRetomadaVendas', 'restaurarContextoRetomadaVendas']) vm.runInContext(funcao(nome), contexto);
  return {
    contexto, chamadas, avancar: (ms) => { agora += ms; },
    usarCargaReal: () => vm.runInContext(funcao('carregarDadosBackend'), contexto),
    executarTimers: async () => { const lista = [...timers.values()]; timers.clear(); lista.forEach((acao) => acao()); await pausa(); },
  };
}

for (const plataforma of ['ios', 'android', 'web']) {
  test(`${plataforma}: eventos simultâneos retomam sem login, tela global de loading ou consultas repetidas`, async () => {
    const f = fluxoRetomada(plataforma);
    for (let i = 0; i < 5; i++) f.contexto.agendarRetomadaVendas();
    await f.executarTimers();
    assert.equal(f.chamadas.sessao, 1);
    assert.equal(f.chamadas.carga, 1);
    assert.equal(f.chamadas.render, 0);
    assert.equal(f.contexto.state.aba, 'clientes');
    await f.contexto.sincronizarAoReconectarVendas();
    assert.equal(f.chamadas.carga, 1);
    f.avancar(31000);
    await f.contexto.sincronizarAoReconectarVendas();
    assert.equal(f.chamadas.carga, 2);
  });
}

test('não inicia retomada escondido, durante OAuth, sem rede ou antes da autorização', async () => {
  const f = fluxoRetomada();
  for (const [objeto, chave, valor] of [[f.contexto.document, 'visibilityState', 'hidden'], [f.contexto, 'loginSocialPendente', 'google'], [f.contexto.navigator, 'onLine', false], [f.contexto.state, 'autenticado', false]]) {
    const antes = objeto[chave]; objeto[chave] = valor;
    await f.contexto.sincronizarAoReconectarVendas(); objeto[chave] = antes;
  }
  assert.equal(f.chamadas.sessao, 0);
});

test('formulário aberto adia atualização e outbox até a tela ficar disponível', async () => {
  const f = fluxoRetomada();
  f.contexto.document.getElementById = () => ({});
  await f.contexto.sincronizarAoReconectarVendas();
  assert.equal(f.chamadas.sessao, 1);
  assert.equal(f.chamadas.carga, 0);
  assert.equal(f.chamadas.outbox, 0);
  assert.equal(f.contexto.sincronizacaoRetomadaAguardandoTela, true);
  f.contexto.document.getElementById = () => null;
  await f.contexto.sincronizarAoReconectarVendas();
  assert.equal(f.chamadas.carga, 1);
});

test('logout/troca de perfil durante renovação descarta continuação antiga', async () => {
  const f = fluxoRetomada();
  const renovar = pendente();
  f.contexto.window.VendasDb.ensureSession = () => renovar.promessa;
  const tarefa = f.contexto.sincronizarAoReconectarVendas();
  f.contexto.revisaoContaVendasAtiva++;
  f.contexto.state.contaVendasAtiva = { id: 'pessoal' };
  renovar.resolver({ user: { id: 'jeff' } });
  await tarefa;
  assert.equal(f.chamadas.carga, 0);
  assert.equal(f.chamadas.outbox, 0);
});

test('sessão ausente volta ao login; conexão indisponível preserva sessão e tela', async () => {
  const f = fluxoRetomada();
  f.contexto.window.VendasDb.ensureSession = async () => { throw new Error('Network error'); };
  await f.contexto.sincronizarAoReconectarVendas();
  assert.equal(f.contexto.state.autenticado, true);
  assert.equal(f.chamadas.render, 0);
  f.contexto.window.VendasDb.ensureSession = async () => null;
  await f.contexto.sincronizarAoReconectarVendas();
  assert.equal(f.contexto.state.autenticado, false);
  assert.equal(f.chamadas.render, 1);
});

for (const causa of ['revogada', 'outro-usuario']) {
  test(`retomada com sessão ${causa} bloqueia tela anterior sem carregar dados`, async () => {
    const f = fluxoRetomada();
    f.contexto.window.VendasDb.ensureSession = async () => {
      if (causa === 'revogada') throw new Error('Invalid Refresh Token');
      return { user: { id: 'outro-usuario' } };
    };
    await f.contexto.sincronizarAoReconectarVendas();
    assert.equal(f.contexto.state.autenticado, false);
    assert.equal(f.chamadas.render, 1);
    assert.equal(f.chamadas.carga, 0);
  });
}

test('posição recuperada exige acesso, mesma conta, cache recente e não salva formulários/senhas', () => {
  const f = fluxoRetomada();
  f.contexto.salvarContextoRetomadaVendas();
  assert.equal(f.contexto.localStorage.dados.size, 1);
  const salvo = JSON.parse([...f.contexto.localStorage.dados.values()][0]);
  assert.deepEqual(Object.keys(salvo).sort(), ['aba', 'atualizadoEm', 'menuAberto', 'rolagem']);
  f.contexto.state.aba = 'dashboard';
  assert.equal(f.contexto.restaurarContextoRetomadaVendas().rolagem, 320);
  assert.equal(f.contexto.state.aba, 'clientes');
  f.contexto.state.contaVendasAtiva = { id: 'pessoal' };
  assert.equal(f.contexto.restaurarContextoRetomadaVendas(), null);
  f.contexto.state.contaVendasAtiva = { id: 'bora' };
  f.contexto.state.acessoVendas = null;
  assert.equal(f.contexto.restaurarContextoRetomadaVendas(), null);
  f.contexto.state.acessoVendas = {};
  f.avancar(7 * 3600000);
  assert.equal(f.contexto.restaurarContextoRetomadaVendas(), null);
});

for (const motivo of ['sheet', 'mutacao', 'perfil']) {
  test(`carga que chega depois de ${motivo} não sobrescreve os dados ou formulário`, async () => {
    const f = fluxoRetomada(); f.usarCargaReal();
    const leitura = pendente();
    f.contexto.window.VendasDb.loadAll = () => leitura.promessa;
    const tarefa = f.contexto.carregarDadosBackend(false, true, true, true);
    if (motivo === 'sheet') f.contexto.document.getElementById = () => ({});
    if (motivo === 'mutacao') f.contexto.revisaoDadosOperacionais++;
    if (motivo === 'perfil') { f.contexto.revisaoContaVendasAtiva++; f.contexto.state.contaVendasAtiva = { id: 'pessoal' }; }
    leitura.resolver({ user: { id: 'jeff' }, acesso: {}, contaVendasAtiva: { id: 'bora' }, produtos: ['antigo-servidor'] });
    await tarefa;
    assert.deepEqual(f.contexto.state.produtos, ['existente']);
  });
}

test('servidor que rejeita a sessão durante a carga invalida acesso mesmo com formulário aberto', async () => {
  const f = fluxoRetomada(); f.usarCargaReal();
  f.contexto.document.getElementById = () => ({});
  f.contexto.window.VendasDb.loadAll = async () => ({ user: null });
  await f.contexto.carregarDadosBackend(false, true, true, true);
  assert.equal(f.contexto.state.autenticado, false);
  assert.equal(f.contexto.state.acessoVendas, null);
  assert.ok(f.chamadas.fechar > 0);
});

test('notificações não participam da espera dos dados essenciais', () => {
  const carga = funcao('carregarDadosBackend');
  assert.doesNotMatch(carga, /estadoNotificacoes|registrarAtividadeAplicativo/);
  const complemento = funcao('agendarComplementosAcessoVendas');
  assert.match(complemento, /contextoValido\(\)/);
  assert.match(complemento, /Promise\.allSettled/);
  assert.match(complemento, /8000/);
  assert.doesNotMatch(funcao('carregarSistemaVendasCompleto'), /await prepararRecursosSalaBotoes|await recursosSala/);
});
