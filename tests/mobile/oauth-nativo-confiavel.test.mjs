import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { criarControladorOAuthMobile } from '../../app/mobile/oauth-nativo-controller.ts';

const tick = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function pendente() { let resolver; const promessa = new Promise(r => { resolver = r; }); return { promessa, resolver }; }
const retorno = 'br.com.avantalab.app://auth/callback#access_token=ficticio&refresh_token=ficticio';
function fluxo(o = {}) {
  let agora = 0, sequencia = 0, pronto = o.pronto !== false, aplicacoes = 0, trocas = 0;
  const timers = new Map(), eventos = [], estados = [], diagnosticos = [], aberturas = [];
  const usuario = { id: 'usuario-ficticio', user_metadata: {} };
  const timer = (cb, ms) => { const id = ++sequencia; timers.set(id, { cb, quando: agora + ms }); return id; };
  const limparTimer = id => timers.delete(id);
  const auth = {
    signOut: async () => {},
    signInWithOAuth: async pedido => { aberturas.push(pedido); return { data: { url: 'https://provedor.invalid/authorize' } }; },
    setSession: async () => {
      aplicacoes++;
      if (o.sessao) await o.sessao.promessa;
      const error = o.erro && (o.sempre || aplicacoes === 1) ? o.erro : null;
      return { data: { session: error ? null : { user: usuario } }, error };
    },
    exchangeCodeForSession: async () => { trocas++; return { data: { session: o.erro ? null : { user: usuario } }, error: o.erro }; },
  };
  const controlador = criarControladorOAuthMobile({
    cliente: () => pronto ? { auth } : undefined,
    abrir: async () => {}, fechar: async () => controlador.navegadorFechado(),
    emitir: e => { eventos.push(e); o.receber?.(e); }, estado: e => estados.push(e),
    diagnostico: (...d) => diagnosticos.push(d), timer, limparTimer,
  });
  return { controlador, eventos, estados, diagnosticos, timers, aberturas, usuario, auth, timer, limparTimer,
    get aplicacoes() { return aplicacoes; }, get trocas() { return trocas; },
    pronto() { pronto = true; },
    async avancar(ms) {
      const fim = agora + ms;
      for (let passos = 0; passos < 1000; passos++) {
        await tick();
        const proximo = [...timers].filter(([, t]) => t.quando <= fim).sort((a, b) => a[1].quando - b[1].quando)[0];
        if (!proximo) { agora = fim; await tick(); return; }
        agora = proximo[1].quando; timers.delete(proximo[0]); proximo[1].cb();
      }
      throw Error('Timers sem limite');
    },
  };
}

for (const provider of ['google', 'apple']) {
  test(`${provider}: uma confirmação, uma conclusão; fechamento antes/depois do callback não volta ao login`, async () => {
    const f = fluxo(); await f.controlador.iniciar(provider);
    f.controlador.navegadorFechado(); await f.avancar(3000);
    assert.equal(f.eventos.length, 0); assert.equal(f.controlador.emAndamento(), true);
    await f.controlador.receber(retorno); await f.avancar(10000);
    assert.equal(f.aplicacoes, 1); assert.deepEqual(f.eventos.map(e => e.status), ['concluido']);
    assert.equal(f.eventos[0].provider, provider); assert.equal(f.eventos[0].usuario.id, f.usuario.id);
    assert.ok(!JSON.stringify(f.eventos).includes('access_token'));
    assert.equal(f.aberturas[0].options.redirectTo, 'br.com.avantalab.app://auth/callback');
    assert.equal(f.aberturas[0].options.skipBrowserRedirect, true);
  });
  test(`${provider}: rede lenta mantém callback pendente mesmo após browserFinished`, async () => {
    const sessao = pendente(), f = fluxo({ sessao }); await f.controlador.iniciar(provider);
    const p = f.controlador.receber(retorno); await tick(); f.controlador.navegadorFechado(); await f.avancar(30000);
    assert.equal(f.eventos.length, 0); assert.equal(f.controlador.estado().etapa, 'callback');
    sessao.resolver(); await p;
    assert.deepEqual(f.eventos.map(e => e.status), ['concluido']); assert.equal(f.aplicacoes, 1);
  });
  test(`${provider}: cancelamento explícito invalida conclusão em voo e não sobrepõe outra autenticação`, async () => {
    const sessao = pendente(), f = fluxo({ sessao }); await f.controlador.iniciar(provider);
    const p = f.controlador.receber(retorno); await tick(); await f.controlador.cancelar();
    await assert.rejects(f.controlador.iniciar(provider), /anterior/);
    sessao.resolver(); await p;
    assert.deepEqual(f.eventos.map(e => e.status), ['cancelado']);
    await f.controlador.iniciar(provider); assert.equal(f.controlador.estado().etapa, 'social');
    await f.controlador.receber(retorno); assert.equal(f.aplicacoes, 1); // retorno consumido não reabre
    await f.controlador.receber(retorno.replaceAll('ficticio', 'nova-tentativa'));
    assert.equal(f.eventos.at(-1).status, 'concluido'); assert.equal(f.aplicacoes, 2);
  });
}
test('abertura a frio espera cliente sem perder callback nem emitir erro prematuro', async () => {
  const f = fluxo({ pronto: false }); const p = f.controlador.receber(retorno);
  await f.avancar(10000); assert.equal(f.eventos.length, 0); assert.equal(f.aplicacoes, 0);
  f.pronto(); await f.avancar(100); await p;
  assert.equal(f.eventos[0].status, 'concluido'); assert.equal(f.aplicacoes, 1); assert.equal(f.timers.size, 0);
});
test('cliente ausente termina com erro recuperável e não deixa timer infinito', async () => {
  const f = fluxo({ pronto: false }); const p = f.controlador.receber(retorno);
  await f.avancar(46000); await p;
  assert.deepEqual(f.eventos.map(e => e.status), ['erro']); assert.equal(f.timers.size, 0);
});
test('callback duplicado appUrlOpen/getLaunchUrl confirma somente uma vez', async () => {
  const sessao = pendente(), f = fluxo({ sessao });
  const p = f.controlador.receber(retorno); await f.controlador.receber(retorno); await tick();
  sessao.resolver(); await p; await f.controlador.receber(retorno);
  assert.equal(f.aplicacoes, 1); assert.equal(f.eventos.length, 1);
});
test('erro transitório concluído repete somente a etapa de sessão, automaticamente e no máximo duas vezes', async () => {
  for (const sempre of [false, true]) {
    const f = fluxo({ erro: { status: 503, message: 'temporario' }, sempre }); await f.controlador.receber(retorno);
    assert.equal(f.aplicacoes, 2); assert.equal(f.eventos.at(-1).status, sempre ? 'erro' : 'concluido');
  }
});
test('prazo excedido não duplica SDK pendurado nem permite outra escrita concorrente de sessão', async () => {
  const sessao = pendente(), f = fluxo({ sessao }); const p = f.controlador.receber(retorno);
  await f.avancar(46000); await p;
  assert.equal(f.aplicacoes, 1); assert.equal(f.eventos.at(-1).status, 'erro');
  await assert.rejects(f.controlador.iniciar('google'), /anterior/);
  sessao.resolver(); await tick();
  assert.equal(f.eventos.length, 1); // resultado tardio não conclui depois do erro
});
test('AuthSessionMissing e 401 são erro explícito, não cancelamento ou autorização', async () => {
  for (const erro of [{ message: 'Auth session missing!', status: 400 }, { status: 401 }]) {
    const f = fluxo({ erro, sempre: true }); await f.controlador.receber(retorno);
    assert.equal(f.aplicacoes, 1); assert.deepEqual(f.eventos.map(e => e.status), ['erro']);
    assert.ok(!JSON.stringify(f.eventos).includes('Auth session missing'));
  }
});
test('sem callback depois do fechamento: erro claro, nunca cancelamento inferido', async () => {
  const f = fluxo(); await f.controlador.iniciar('google'); f.controlador.navegadorFechado();
  await f.avancar(7900); assert.equal(f.eventos.length, 0); await f.avancar(100);
  assert.deepEqual(f.eventos.map(e => e.status), ['erro']); assert.match(f.eventos[0].mensagem, /sem confirmar/);
});
test('PKCE aceita code, deduplica e não repete código após resposta incerta', async () => {
  for (const erro of [null, { status: 503 }]) {
    const f = fluxo({ erro }); const url = 'br.com.avantalab.app://auth/callback?code=ficticio';
    await Promise.all([f.controlador.receber(url), f.controlador.receber(url)]);
    assert.equal(f.trocas, 1); assert.equal(f.aplicacoes, 0);
    assert.equal(f.eventos[0].status, erro ? 'erro' : 'concluido');
  }
});
test('URL externa, protocolo/host/path diferente e troca Vendas não fazem autenticação', async () => {
  const f = fluxo();
  for (const u of ['invalido', retorno.replace('br.com.avantalab.app:', 'https:'), retorno.replace('://auth/', '://outro/'), retorno.replace('/callback', '/outra'), 'br.com.avantalab.app://auth/callback?origem=vendas']) await f.controlador.receber(u);
  assert.equal(f.eventos.length, 0); assert.equal(f.aplicacoes, 0);
});
test('retorno incompleto é erro; access_denied explícito é cancelamento', async () => {
  const f = fluxo(); await f.controlador.receber('br.com.avantalab.app://auth/callback');
  assert.equal(f.eventos[0].status, 'erro');
  const g = fluxo(); await g.controlador.receber('br.com.avantalab.app://auth/callback#error=access_denied');
  assert.equal(g.eventos[0].status, 'cancelado');
});
test('cancelar enquanto listeners preparam impede abertura tardia do navegador', async () => {
  const preparo = pendente(), f = fluxo(); const p = f.controlador.iniciar('google', preparo.promessa);
  await f.controlador.cancelar(); preparo.resolver(); await p;
  assert.equal(f.aberturas.length, 0); assert.equal(f.eventos[0].status, 'cancelado');
});
test('sessão persistida depois de cancelar é encerrada localmente antes de permitir outra tentativa', async () => {
  const sessao = pendente(), f = fluxo({ sessao }); let saidas = 0;
  f.auth.signOut = async o => { assert.equal(o.scope, 'local'); saidas++; };
  const p = f.controlador.receber(retorno); await tick(); await f.controlador.cancelar();
  sessao.resolver(); await p; assert.equal(saidas, 1);
  assert.deepEqual(f.eventos.map(e => e.status), ['cancelado']);
});
test('inicialização de plugins pendurada termina em erro visível, não espera indefinida', async () => {
  const preparo = pendente(), f = fluxo(); const p = f.controlador.iniciar('google', preparo.promessa);
  await f.avancar(46000); await p;
  assert.equal(f.aberturas.length, 0); assert.equal(f.eventos[0].status, 'erro');
  preparo.resolver(); await tick(); assert.equal(f.aberturas.length, 0);
});

const mobile = readFileSync('public/mobile-app.js', 'utf8');
const ast = ts.createSourceFile('mobile.js', mobile, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const funcoes = new Map();
function visitar(n) { if (ts.isFunctionDeclaration(n) && n.name) funcoes.set(n.name.text, n.getText(ast)); ts.forEachChild(n, visitar); } visitar(ast);
function consumidor() {
  const telas = [], consultas = [], eventos = {};
  const state = { pronto: true, carregando: true, autenticado: false, loginAcao: 'google', tentativaLogin: 0, manterConectado: true };
  const ctx = vm.createContext({ state, console, Promise, URLSearchParams,
    db: { auth: { getSession: async () => ({ data: { session: null } }), setSession() { throw Error('Não repetir confirmação!'); } } },
    window: { location: { search: '' }, addEventListener: (e, cb) => { eventos[e] = cb; }, setInterval() {} },
    document: { addEventListener() {} }, navigator: {}, Image: class {},
    limparLoginSocialPendenteMobile() {}, registrarPreferenciaSessaoMobile() {}, limparPreferenciaSessaoMobile() {},
    sessaoPersistenteValidaMobile: () => false, atualizarProgressoAcessoMobile() {},
    carregarEmpresas: async () => { consultas.push('perfis'); state.empresa = { id: 'empresa' }; return true; },
    prepararSistemaInicialAntesDosDadosMobile: async () => { consultas.push('permissoes'); return false; },
    carregarDados: async () => { consultas.push('dados'); state.pronto = true; state.carregando = false; state.dashboardPerfilLiberado = state.empresa.id; state.paywallVerificado = true; ctx.render(); },
    exibirFalhaDeAcessoMobile: mensagem => { state.pronto = true; state.falhaAcesso = mensagem; ctx.render(); },
    mensagemErro: (erro, padrao) => erro?.message || padrao,
    prepararOrigemAcessoMobile() {}, configurarPullToRefresh() {}, posicionarCursorNoFimDoCampoMobile() {}, deveEncerrarSessaoSalvaMobile: () => false,
    promessaMobileComPrazo: p => p, ehLojaNativaMobile: () => true, ehFuncionarioPontoMobile: () => false,
    previaConfirmacaoCelular: false, somenteModulosNoAppNativo: () => false, deveExibirCadastroPerfilMobile: () => false,
    telaCarregandoMobile: () => 'preparacao', telaLogin: () => 'login', telaAvisoMobile: () => 'erro', telaApp: () => 'dashboard',
  });
  const selecao = funcoes.get('render');
  const a = selecao.indexOf('var telaAtual;'), b = selecao.indexOf('var bloquearCamadasProgressivas', a);
  ctx.render = () => {
    vm.runInContext('var preparacaoProgressiva = state.autenticado && (!state.pronto || state.aberturaProgressiva);' + selecao.slice(a, b), ctx);
    telas.push(ctx.telaAtual);
  };
  vm.runInContext(['processarRetornoOAuthNativoMobile', 'concluirLoginSocialNativoMobile', 'continuarLoginSocialNativoMobile', 'loginSocialMobileEmAndamento', 'iniciar'].map(n => funcoes.get(n)).join('\n'), ctx);
  return { ctx, state, telas, consultas };
}
test('consumidor real vai preparação → dashboard sem nova aplicação de sessão e autoriza antes de dados', async () => {
  const c = consumidor(), f = fluxo({ receber: e => c.ctx.processarRetornoOAuthNativoMobile(e) });
  await f.controlador.receber(retorno); await tick();
  assert.deepEqual(c.telas, ['preparacao', 'dashboard']); assert.deepEqual(c.consultas, ['perfis', 'permissoes', 'dados']);
  assert.equal(f.aplicacoes, 1); assert.equal(c.ctx.window.__avantalabAberturaOAuthMobile, false);
  c.ctx.processarRetornoOAuthNativoMobile(f.eventos[0]); await tick();
  assert.equal(c.consultas.length, 3);
});
test('inicialização antiga sem sessão não sobrescreve login social concluído', async () => {
  const c = consumidor(), sessao = pendente(); c.ctx.db.auth.getSession = () => sessao.promessa;
  const inicializar = c.ctx.iniciar(); await tick();
  c.ctx.processarRetornoOAuthNativoMobile({ status: 'concluido', tentativa: 1, usuario: { id: 'u' } }); await tick();
  sessao.resolver({ data: { session: null } }); await inicializar;
  assert.equal(c.state.autenticado, true); assert.equal(c.telas.at(-1), 'dashboard');
  assert.ok(!c.telas.includes('login'));
});
test('erro a frio não é apagado pelo inicializador; não consulta perfis/dados', async () => {
  const c = consumidor(); c.ctx.processarRetornoOAuthNativoMobile({ status: 'erro', tentativa: 1, mensagem: 'Falha recuperável' });
  await c.ctx.iniciar();
  assert.equal(c.telas.at(-1), 'erro'); assert.equal(c.state.falhaAcesso, 'Falha recuperável'); assert.equal(c.consultas.length, 0);
});
test('bootstrap real não recarrega nem checa versão durante OAuth; volta a funcionar depois', async () => {
  const pagina = readFileSync('app/mobile/page.tsx', 'utf8');
  const ast = ts.createSourceFile('page.tsx', pagina, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let bootstrap;
  function visitar(n) { if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'bootstrapCarregamento') bootstrap = n.initializer.templateSpans.reduce((s,p) => s + 'teste' + p.literal.text, n.initializer.head.text); ts.forEachChild(n, visitar); } visitar(ast);
  let agora = 100000, pendente = true, pedidos = 0, recargas = 0; const timers = [], intervalos = [], memoria = new Map();
  const ctx = vm.createContext({ Date: class extends Date { static now() { return agora; } }, console,
    sessionStorage: { getItem: k => memoria.get(k), setItem: (k,v) => memoria.set(k,v) },
    window: { location: { reload() { recargas++; } }, addEventListener() {}, fetch() {},
      __avantalabOAuthNativoMobileEmAndamento: () => pendente, __avantalabConcluirAcessoMobile: () => false,
      setTimeout: (cb,ms) => timers.push({ cb,ms }), setInterval: (cb,ms) => intervalos.push({ cb,ms }) },
    fetch: async () => { pedidos++; return { ok: true, json: async () => ({ versao: 'nova' }) }; },
    document: { hidden: false, addEventListener() {}, body: { appendChild() {} }, createElement: () => ({}),
      getElementById: id => id === 'mobile-root' ? { textContent: 'Preparando acesso', getAttribute: () => '1' } : null },
  }); vm.runInContext(bootstrap, ctx);
  agora += 60000; intervalos.find(i => i.ms === 2000).cb(); ctx.window.__avantalabVerificarVersaoMobile();
  assert.equal(ctx.window.__avantalabRecuperarAcessoMobile(), false); assert.equal(pedidos, 0); assert.equal(recargas, 0);
  pendente = false; assert.equal(ctx.window.__avantalabRecuperarAcessoMobile(), true);
  pendente = true; timers.find(i => i.ms === 700).cb(); assert.equal(recargas, 0);
  pendente = false; timers.find(i => i.ms === 700).cb(); assert.equal(recargas, 1);
});

function ponte({ nativo = true, abertura = null, clientePronto = true } = {}) {
  const f = fluxo(), ouvintes = {}, registros = [], diagnosticos = [], eventos = [], ref = { current: null };
  let efeito, limpar;
  const ctx = vm.createContext({ URL, Promise, console, setTimeout: f.timer, clearTimeout: f.limparTimer,
    exports: {}, sessionStorage: { setItem: (k,v) => diagnosticos.push(JSON.parse(v)) },
    window: { __AVANTALAB_MOBILE_SUPABASE_CLIENT__: clientePronto ? { auth: f.auth } : undefined,
      dispatchEvent: e => eventos.push(e.detail) },
    CustomEvent: class { constructor(tipo, init) { this.type = tipo; this.detail = init.detail; } },
    require: nome => {
      if (nome === 'react') return { useRef: () => ref, useEffect: cb => { efeito = cb; } };
      if (nome === '@capacitor/core') return { Capacitor: { isNativePlatform: () => nativo } };
      if (nome === './oauth-nativo-controller') return { criarControladorOAuthMobile };
      if (nome === '../lib/version') return { APP_VERSION: 'teste' };
      if (nome === '@capacitor/app') return { App: {
        addListener: async (nome, cb) => { registros.push(nome); ouvintes[nome] = cb; return { remove: async () => { if (ouvintes[nome] === cb) delete ouvintes[nome]; } }; },
        getLaunchUrl: async () => abertura ? { url: abertura } : null,
      } };
      if (nome === '@capacitor/browser') return { Browser: {
        addListener: async (nome, cb) => { registros.push(nome); ouvintes[nome] = cb; return { remove: async () => { if (ouvintes[nome] === cb) delete ouvintes[nome]; } }; },
        open: async () => { assert.ok(ouvintes.appUrlOpen); assert.ok(ouvintes.browserFinished); registros.push('abrir'); },
        close: async () => ouvintes.browserFinished?.(),
      } };
      throw Error(nome);
    },
  });
  const js = ts.transpileModule(readFileSync('app/mobile/OAuthNativoMobileBridge.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInContext(js, ctx);
  const montar = () => { ctx.exports.default(); limpar = efeito(); };
  montar();
  return { f, ctx, ouvintes, eventos, registros, diagnosticos, montar, novoRef: () => { ref.current = null; }, desmontar: () => limpar?.() };
}
test('ponte React real registra listeners antes de abrir Google e remove ao desmontar', async () => {
  const p = ponte(); await p.ctx.window.__avantalabAbrirOAuthNativoMobile('google');
  assert.deepEqual(p.registros, ['appUrlOpen', 'browserFinished', 'abrir']);
  p.desmontar(); await tick(); assert.equal(Object.keys(p.ouvintes).length, 0);
});
test('ponte React real a frio espera cliente, deduplica getLaunchUrl/appUrlOpen e não transporta tokens', async () => {
  const p = ponte({ abertura: retorno, clientePronto: false }); await tick();
  p.ouvintes.appUrlOpen({ url: retorno }); await p.f.avancar(5000);
  assert.equal(p.eventos.length, 0);
  p.ctx.window.__AVANTALAB_MOBILE_SUPABASE_CLIENT__ = { auth: p.f.auth };
  await p.f.avancar(100);
  assert.equal(p.eventos.length, 1); assert.equal(p.eventos[0].status, 'concluido'); assert.equal(p.f.aplicacoes, 1);
  assert.ok(!JSON.stringify(p.eventos).includes('access_token'));
  assert.ok(!JSON.stringify(p.diagnosticos).includes('ficticio'));
  assert.equal(p.diagnosticos.at(-1).versao, 'teste');
});
test('ciclo setup/cleanup/setup React não perde callback nem multiplica confirmação', async () => {
  const p = ponte({ abertura: retorno, clientePronto: false }); await tick();
  p.desmontar(); p.montar(); await tick();
  p.ctx.window.__AVANTALAB_MOBILE_SUPABASE_CLIENT__ = { auth: p.f.auth }; await p.f.avancar(100);
  assert.equal(p.eventos.length, 1); assert.equal(p.f.aplicacoes, 1);
});
test('Web/PWA não registram ponte, listeners ou login nativo', async () => {
  const p = ponte({ nativo: false }); await tick();
  assert.equal(p.registros.length, 0); assert.equal(p.ctx.window.__avantalabAbrirOAuthNativoMobile, undefined);
});
test('remontagem real preserva controlador único e retorno já em voo', async () => {
  const p = ponte({ abertura: retorno, clientePronto: false }); await tick();
  const dono = p.ctx.window.__avantalabControladorOAuthMobile;
  p.desmontar(); p.novoRef(); p.montar(); await tick();
  assert.equal(p.ctx.window.__avantalabControladorOAuthMobile, dono);
  p.ctx.window.__AVANTALAB_MOBILE_SUPABASE_CLIENT__ = { auth: p.f.auth }; await p.f.avancar(100);
  assert.equal(p.eventos.length, 1); assert.equal(p.f.aplicacoes, 1);
});
test('ponte ausente no Capacitor espera com limite e exibe erro, sem fallback OAuth Web', async () => {
  const c = consumidor(), f = fluxo(); let web = 0;
  c.state.carregando = false;
  Object.assign(c.ctx.window, { setTimeout: f.timer, clearTimeout: f.limparTimer });
  c.ctx.document.getElementById = () => null;
  c.ctx.salvarLoginSocialPendenteMobile = () => {};
  c.ctx.db.auth.signInWithOAuth = async () => { web++; };
  vm.runInContext(['entrarGoogle', 'abrirLoginSocialNativoMobile', 'promessaMobileComPrazo'].map(n => funcoes.get(n)).join('\n'), c.ctx);
  const p = c.ctx.entrarGoogle(); await f.avancar(46000); await p;
  assert.equal(web, 0); assert.equal(c.telas.at(-1), 'erro');
  assert.equal(c.ctx.window.__avantalabPonteOAuthMobilePendente, false);
});
test('SDK embarcado real confirma usuário uma vez; 503 isolado repete apenas a etapa sem segunda confirmação obrigatória', async () => {
  for (const falharPrimeira of [false, true]) {
    let pedidos = 0; const memoria = new Map();
    const ctx = vm.createContext({ console, URL, URLSearchParams, Headers, Request, Response, TextEncoder, TextDecoder,
      AbortController, setTimeout, clearTimeout, setInterval, clearInterval, atob, btoa, WebSocket: class {},
      fetch: async url => {
        assert.match(String(url), /^https:\/\/projeto\.invalid\/auth\/v1\/user/); pedidos++;
        const falha = falharPrimeira && pedidos === 1;
        return new Response(JSON.stringify(falha ? { message: 'Temporario' } : { id: 'usuario-ficticio', aud: 'authenticated' }), {
          status: falha ? 503 : 200, headers: { 'Content-Type': 'application/json' },
        });
      },
    }); vm.runInContext(readFileSync('public/mobile-supabase.js', 'utf8'), ctx);
    const cliente = ctx.supabase.createClient('https://projeto.invalid', 'chave-publica-ficticia', {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true,
        storage: { getItem: k => memoria.get(k), setItem: (k,v) => memoria.set(k,v), removeItem: k => memoria.delete(k) } },
    });
    const parte = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const token = [parte({ alg: 'HS256', typ: 'JWT' }), parte({ sub: 'usuario-ficticio', exp: Math.floor(Date.now() / 1000) + 3600 }), parte('assinatura-ficticia')].join('.');
    const eventos = [];
    const fluxo = criarControladorOAuthMobile({ cliente: () => cliente, abrir: async () => {}, fechar: async () => {}, estado() {}, diagnostico() {}, emitir: e => eventos.push(e), timer: setTimeout, limparTimer: clearTimeout });
    await fluxo.receber('br.com.avantalab.app://auth/callback#access_token=' + token + '&refresh_token=ficticio');
    assert.equal(pedidos, falharPrimeira ? 2 : 1); assert.equal(eventos[0].status, 'concluido');
    assert.equal((await cliente.auth.getSession()).data.session.user.id, 'usuario-ficticio');
  }
});
