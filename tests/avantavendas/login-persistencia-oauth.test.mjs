import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const fonte = readFileSync(resolve(import.meta.dirname, '../../app/avantavendas/sistema/app.js'), 'utf8');
const chave = (sufixo) => `avantalab.vendas_mobile.${sufixo}`;
const agora = Date.parse('2026-10-07T15:00:00Z');
const pausa = () => new Promise((resolver) => setImmediate(resolver));
function pendente() {
  let resolver;
  const promessa = new Promise((resolvePromise) => { resolver = resolvePromise; });
  return { promessa, resolver };
}
function armazenamento(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (nome) => dados.get(nome) ?? null,
    setItem: (nome, valor) => dados.set(nome, String(valor)),
    removeItem: (nome) => dados.delete(nome),
  };
}
function trecho(inicio, fim) {
  const indice = fonte.indexOf(inicio);
  const ultimo = fonte.indexOf(fim, indice);
  assert.ok(indice >= 0 && ultimo > indice, inicio);
  return fonte.slice(indice, ultimo);
}

function fluxo({ nativo = true, local = armazenamento(), sessao = armazenamento(), marcado = true, usuarioConectado = false } = {}) {
  const eventos = [];
  const telas = [];
  const avisos = [];
  const temporizadores = [];
  let conectado = usuarioConectado;
  let relogio = agora;
  let cargas = 0;
  let saidas = 0;
  const listeners = {};
  const Browser = {
    addListener: async (nome, callback) => { listeners[nome] = callback; return { remove: async () => {} }; },
    open: async () => eventos.push('navegador-aberto'),
    close: async () => { eventos.push('navegador-fechado'); listeners.browserFinished?.(); },
  };
  const App = {
    addListener: async (nome, callback) => { listeners[nome] = callback; return { remove: async () => {} }; },
    getLaunchUrl: async () => null,
  };
  const banco = {
    signIn: async () => { conectado = true; eventos.push('senha-confirmada'); },
    signInPhone: async () => { conectado = true; eventos.push('telefone-confirmado'); },
    iniciarOAuthNativo: async () => 'https://provedor.test/authorize',
    signInWithGoogle: async () => eventos.push('google-web'),
    signInWithApple: async () => eventos.push('apple-web'),
    setSession: async () => { conectado = true; eventos.push('sessao-confirmada'); },
    exchangeCodeForSession: async () => { conectado = true; eventos.push('codigo-confirmado'); },
    hasSession: async () => conectado,
    currentUser: async () => ({ id: 'teste', email: 'teste@example.com' }),
    signOut: async () => { conectado = false; saidas++; },
  };
  const contexto = vm.createContext({
    URL, URLSearchParams, Promise, console,
    Date: class extends Date { static now() { return relogio; } },
    localStorage: local, sessionStorage: sessao,
    HTMLElement: class {},
    window: {
      VendasDb: banco, location: { origin: 'https://vendas.test', search: '' },
      Capacitor: { isNativePlatform: () => nativo, Plugins: { Browser, App } },
      requestAnimationFrame: (acao) => acao(),
      setTimeout: (acao) => { temporizadores.push(acao); return temporizadores.length; },
      clearTimeout: () => {},
    },
    document: {
      getElementById: () => marcado === null ? null : { checked: marcado },
      activeElement: null,
    },
    navigator: { onLine: true },
    state: { autenticado: false, usuarioSemAcesso: false, usuario: {} },
    valor: (id) => id === 'loginContato' ? 'teste@example.com' : 'senha-apenas-em-memoria',
    emailValido: () => true,
    render: () => {
      const tipo = vm.runInContext("carregandoBackend || loginSocialPendente || preparandoRecursosSala ? 'preparacao' : state.autenticado ? 'sala' : 'login'", contexto);
      telas.push(tipo);
    },
    prepararAlturaPreparacao: () => {}, liberarAlturaPreparacao: () => {},
    atualizarProgressoPreparacao: () => {}, traduzErro: () => 'Não foi possível concluir. Tente novamente.',
    abrirAvisoAcessoVendas: (...mensagem) => avisos.push(mensagem), toast: (...mensagem) => avisos.push(mensagem),
    prepararSelecaoSistemaAntesDosDadosVendas: async () => { contexto.state.autenticado = true; return false; },
    carregarSistemaVendasCompleto: async () => { cargas++; eventos.push('sala-carregada'); contexto.state.autenticado = true; },
    restaurarAcessoOfflineVendas: () => false,
    comLimiteDeTempo: (promessa) => promessa,
    setTimeout: (acao, prazo) => { relogio += prazo; queueMicrotask(acao); },
  });
  vm.runInContext(trecho('const STORAGE_KEY =', 'const HOJE ='), contexto);
  vm.runInContext(`let loginSocialPendente = '';
    let provedorOAuthNativoPendente = '';
    let appVendasInicializado = true;
    let concluindoOAuthNativoVendas = false;
    let processandoRetornoOAuthNativoVendas = false;
    let retornoOAuthNativoConcluidoVendas = false;
    let revisaoLoginSocialVendas = 0;
    let conclusaoAcessoVendas = null;
    let assinaturaPersistenciaSessaoVendas = null;
    let preparoOAuthNativoVendas = null;
    let listenersOAuthNativoVendas = [];
    let carregandoBackend = false;
    let preparandoRecursosSala = false;
    let backendAtivo = true;
    let buscaAplicada = '';
    let erroAcessoVendas = '';
    let loginTipo = 'email';
    let loginRascunho = { contato: '', senha: '', lembrar: true };`, contexto);
  vm.runInContext(trecho('function lerLoginSocialPendenteVendas()', 'let recuperacaoSenhaVendas ='), contexto);
  vm.runInContext(trecho('function cancelarLoginSocialVendas()', 'function reconstruirSalaAposRotacao()'), contexto);
  vm.runInContext(trecho('async function entrarSistema(event)', 'function adicionarBotoesGoogle()'), contexto);
  vm.runInContext(trecho('async function inicializarApp()', 'function renderConteudo()'), contexto);
  return {
    contexto, banco, Browser, listeners, local, sessao, eventos, telas, avisos, temporizadores,
    get cargas() { return cargas; }, get saidas() { return saidas; },
    async iniciar(provedor = 'google') { await contexto.prepararOAuthNativoVendas(); await contexto.entrarComProvedorSocialVendas(provedor); },
    reiniciarTelas() { telas.length = 0; },
    async executarTimers() { while (temporizadores.length) { temporizadores.shift()(); await pausa(); } },
  };
}

for (const provedor of ['google', 'apple']) {
  test(`${provedor}: browserFinished durante callback não cancela nem limpa lembrar-me`, async () => {
    const f = fluxo();
    await f.iniciar(provedor);
    const retorno = pendente();
    f.banco.setSession = async () => { await retorno.promessa; await f.banco.signIn(); };
    f.reiniciarTelas();
    const processando = f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback#access_token=teste&refresh_token=teste');
    f.listeners.browserFinished();
    await f.executarTimers();
    assert.ok(Number(f.local.getItem(chave('lembrar_conectado_ate'))) > agora);
    assert.ok(!f.telas.includes('login'));
    retorno.resolver();
    await processando;
    assert.equal(f.cargas, 1);
    assert.ok(!f.telas.includes('login'));
  });

  test(`${provedor}: sem checkbox visível mantém a escolha lembrada`, async () => {
    const f = fluxo({ marcado: null });
    await f.iniciar(provedor);
    assert.equal(f.local.getItem(chave('lembrar')), '1');
    assert.ok(Number(f.local.getItem(chave('lembrar_conectado_ate'))) > agora);
  });
}

test('senha lembrada sobrevive à reabertura sem guardar a senha', async () => {
  const f = fluxo();
  await f.contexto.entrarSistema({ preventDefault() {} });
  const reaberto = fluxo({ local: f.local, usuarioConectado: true });
  await reaberto.contexto.inicializarApp();
  assert.equal(reaberto.saidas, 0);
  assert.equal(reaberto.cargas, 1);
  assert.equal(f.local.getItem(chave('login_contato')), 'teste@example.com');
  assert.equal(f.local.getItem(chave('senha')), null);
});

test('sessão não lembrada termina em uma nova sessão do navegador/app', async () => {
  const f = fluxo({ marcado: false });
  await f.contexto.entrarSistema({ preventDefault() {} });
  const reaberto = fluxo({ local: f.local, usuarioConectado: true });
  await reaberto.contexto.inicializarApp();
  assert.equal(reaberto.saidas, 1);
  assert.equal(reaberto.cargas, 0);
});

test('30 dias vencidos não são ressuscitados como sessão legada', () => {
  const f = fluxo({ local: armazenamento({ [chave('lembrar')]: '1', [chave('lembrar_conectado_ate')]: String(agora - 1000) }) });
  assert.equal(f.contexto.deveEncerrarSessaoSalvaVendas(), true);
});

test('abertura nativa enquanto provedor autoriza não expira em dez segundos', async () => {
  const f = fluxo();
  await f.iniciar();
  f.reiniciarTelas();
  await f.contexto.inicializarApp();
  assert.equal(vm.runInContext('loginSocialPendente', f.contexto), 'google');
  assert.ok(!f.telas.includes('login'));
});

test('callbacks duplicados não trocam o mesmo código nem carregam duas vezes', async () => {
  const f = fluxo();
  await f.iniciar();
  let trocas = 0;
  const troca = pendente();
  f.banco.exchangeCodeForSession = async () => { trocas++; await troca.promessa; await f.banco.signIn(); };
  const callback = 'br.com.avantalab.vendas://auth/callback?code=teste';
  const primeiro = f.contexto.processarRetornoOAuthNativoVendas(callback);
  const segundo = f.contexto.processarRetornoOAuthNativoVendas(callback);
  troca.resolver();
  await Promise.all([primeiro, segundo]);
  await f.contexto.processarRetornoOAuthNativoVendas(callback);
  assert.equal(trocas, 1);
  assert.equal(f.cargas, 1);
});

test('falha ao preparar dados não apaga a preferência após sessão confirmada', async () => {
  const f = fluxo();
  await f.iniciar();
  f.contexto.prepararSelecaoSistemaAntesDosDadosVendas = async () => { throw new Error('rede indisponível'); };
  await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback?code=teste');
  assert.ok(Number(f.local.getItem(chave('lembrar_conectado_ate'))) > agora);
});

test('cancelar antes de receber URL do provedor impede abertura tardia', async () => {
  const f = fluxo();
  await f.contexto.prepararOAuthNativoVendas();
  const autorizacao = pendente();
  f.banco.iniciarOAuthNativo = () => autorizacao.promessa;
  const iniciando = f.contexto.entrarComProvedorSocialVendas('google');
  f.contexto.cancelarLoginSocialVendas();
  autorizacao.resolver('https://provedor.test/authorize');
  await iniciando;
  assert.ok(!f.eventos.includes('navegador-aberto'));
  assert.equal(vm.runInContext('loginSocialPendente', f.contexto), '');
});

test('callback com esquema de outro aplicativo é ignorado', async () => {
  const f = fluxo();
  assert.equal(await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.app://auth/callback?code=teste'), false);
  assert.equal(f.cargas, 0);
});

for (const provedor of ['google', 'apple']) {
  for (const lembrar of [true, false]) {
    test(`${provedor}: reabertura respeita lembrar-me ${lembrar ? 'marcado' : 'desmarcado'}`, async () => {
      const f = fluxo({ marcado: lembrar });
      await f.iniciar(provedor);
      await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback?code=teste');
      assert.equal(f.local.getItem(chave('oauth_temporario_ate')), null);
      const reaberto = fluxo({ local: f.local, usuarioConectado: true });
      await reaberto.contexto.inicializarApp();
      assert.equal(reaberto.saidas, lembrar ? 0 : 1);
      assert.equal(reaberto.cargas, lembrar ? 1 : 0);
    });
  }

  test(`${provedor}: Web/PWA volta ao Vendas sem abrir navegador nativo`, async () => {
    const f = fluxo({ nativo: false });
    await f.iniciar(provedor);
    assert.ok(f.eventos.includes(`${provedor}-web`));
    assert.ok(!f.eventos.includes('navegador-aberto'));
    const reaberto = fluxo({ nativo: false, local: f.local, sessao: f.sessao, usuarioConectado: true });
    vm.runInContext('loginSocialPendente = lerLoginSocialPendenteVendas()', reaberto.contexto);
    await reaberto.contexto.inicializarApp();
    assert.equal(reaberto.cargas, 1);
    assert.ok(!reaberto.telas.includes('login'));
    assert.equal(vm.runInContext('loginSocialPendente', reaberto.contexto), '');
  });
}

test('abertura fria confirma retorno e depois inicializa uma única vez', async () => {
  const f = fluxo();
  await f.iniciar();
  vm.runInContext('appVendasInicializado = false', f.contexto);
  await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback?code=teste');
  assert.equal(f.cargas, 0);
  vm.runInContext('appVendasInicializado = true', f.contexto);
  await f.contexto.inicializarApp();
  assert.equal(f.cargas, 1);
  assert.ok(!f.telas.includes('login'));
});

test('fechar navegador sem callback volta ao login e permite outra tentativa', async () => {
  const f = fluxo();
  await f.iniciar();
  f.listeners.browserFinished();
  await f.executarTimers();
  assert.equal(vm.runInContext('loginSocialPendente', f.contexto), '');
  assert.equal(f.telas.at(-1), 'login');
  assert.equal(f.local.getItem(chave('lembrar_conectado_ate')), null);
  await f.iniciar('apple');
  assert.equal(vm.runInContext('loginSocialPendente', f.contexto), 'apple');
});

test('fechamento antes do deep link não cancela callback que chegou em seguida', async () => {
  const f = fluxo();
  await f.iniciar();
  f.listeners.browserFinished();
  const resposta = pendente();
  f.banco.exchangeCodeForSession = async () => { await resposta.promessa; await f.banco.signIn(); };
  const retorno = f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback?code=teste');
  await f.executarTimers();
  assert.ok(!f.telas.includes('login'));
  resposta.resolver();
  await retorno;
  assert.equal(f.cargas, 1);
});

test('callback tardio de tentativa cancelada não autentica o usuário', async () => {
  const f = fluxo();
  await f.iniciar();
  f.contexto.cancelarLoginSocialVendas();
  const processado = await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback?code=teste');
  assert.equal(processado, false);
  assert.equal(f.cargas, 0);
  assert.ok(!f.eventos.includes('codigo-confirmado'));
});

test('intenção social vencida é limpa mesmo que sessionStorage tenha provedor', () => {
  const f = fluxo({
    local: armazenamento({ [chave('login_social_pendente')]: 'google', [chave('login_social_pendente_ate')]: String(agora - 1) }),
    sessao: armazenamento({ [chave('login_social_pendente')]: 'google' }),
  });
  assert.equal(f.contexto.lerLoginSocialPendenteVendas(), '');
  assert.equal(f.sessao.getItem(chave('login_social_pendente')), null);
});

test('callback inválido limpa preparação e permite login social novamente', async () => {
  const f = fluxo();
  await f.iniciar();
  await f.contexto.processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback');
  assert.equal(f.telas.at(-1), 'login');
  assert.equal(f.cargas, 0);
  assert.equal(f.avisos.length, 1);
  await f.iniciar('apple');
  assert.equal(vm.runInContext('loginSocialPendente', f.contexto), 'apple');
});

test('credencial inválida não cria uma sessão persistente nem salva senha', async () => {
  const f = fluxo();
  f.banco.signIn = async () => { throw new Error('Invalid credentials'); };
  await f.contexto.entrarSistema({ preventDefault() {} });
  assert.equal(f.local.getItem(chave('lembrar_conectado_ate')), null);
  assert.equal(f.telas.at(-1), 'login');
  assert.equal(f.cargas, 0);
});

test('renovação de token estende lembrar-me sem consultas dentro do evento SDK', () => {
  const f = fluxo({ local: armazenamento({ [chave('lembrar')]: '1', [chave('lembrar_conectado_ate')]: String(agora + 1000) }) });
  let eventos;
  let assinaturas = 0;
  f.banco.client = { auth: { onAuthStateChange: (callback) => {
    eventos = callback;
    assinaturas++;
    return { data: { subscription: { unsubscribe() {} } } };
  } } };
  f.contexto.assinarPersistenciaSessaoVendas();
  f.contexto.assinarPersistenciaSessaoVendas();
  assert.equal(assinaturas, 1);
  assert.equal(eventos('TOKEN_REFRESHED', {}), undefined);
  assert.equal(Number(f.local.getItem(chave('lembrar_conectado_ate'))), agora + 30 * 24 * 60 * 60 * 1000);
  eventos('SIGNED_OUT', null);
  assert.equal(f.local.getItem(chave('lembrar_conectado_ate')), null);
  assert.equal(f.local.getItem(chave('lembrar')), '1');
});

test('listeners nativos não acumulam e podem ser removidos antes de nova preparação', async () => {
  const f = fluxo();
  let adicionados = 0;
  let removidos = 0;
  f.contexto.window.Capacitor.Plugins.App.addListener = async () => {
    adicionados++;
    return { remove: async () => { removidos++; } };
  };
  f.Browser.addListener = async () => {
    adicionados++;
    return { remove: async () => { removidos++; } };
  };
  await Promise.all([f.contexto.prepararOAuthNativoVendas(), f.contexto.prepararOAuthNativoVendas()]);
  assert.equal(adicionados, 2);
  f.contexto.removerListenersOAuthNativoVendas();
  await pausa();
  assert.equal(removidos, 2);
  await f.contexto.prepararOAuthNativoVendas();
  assert.equal(adicionados, 4);
});
