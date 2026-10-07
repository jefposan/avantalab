// Auditoria visual com Google/Apple e plugins simulados. Não acessa contas reais.
// Executar: node scripts/auditar-login-vendas-navegador.mjs
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const raiz = resolve(import.meta.dirname, '..');
const perfil = mkdtempSync(join(tmpdir(), 'avanta-login-auditoria-'));
const pausinha = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const pagina = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="app"></div><script>
  window.__auditoria = { conectado: false, eventos: {}, aberturas: 0 };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => new URLSearchParams(location.search).get('plataforma'), Plugins: {
    App: { addListener: async (nome, callback) => { __auditoria.eventos[nome] = callback; return { remove: async () => {} }; }, getLaunchUrl: async () => null },
    Browser: { addListener: async (nome, callback) => { __auditoria.eventos[nome] = callback; return { remove: async () => {} }; }, open: async () => { __auditoria.aberturas++; }, close: async () => { __auditoria.eventos.browserFinished?.(); } }
  } };
  window.VendasDb = {
    client: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
    hasSession: async () => __auditoria.conectado,
    currentUser: async () => ({ id: 'auditoria-local', email: 'auditoria@example.com' }),
    iniciarOAuthNativo: async () => 'https://provedor-simulado.invalid/authorize',
    signOut: async () => { __auditoria.conectado = false; }
  };
  localStorage.clear(); sessionStorage.clear();
  </script><script src="/app.js"></script></body></html>`;
const servidor = createServer((pedido, resposta) => {
  const caminho = new URL(pedido.url, 'http://localhost').pathname;
  if (caminho === '/') {
    resposta.setHeader('Content-Type', 'text/html; charset=utf-8'); resposta.end(pagina); return;
  }
  const arquivo = caminho === '/app.js' ? 'app/avantavendas/sistema/app.js' : caminho === '/styles.css' ? 'app/avantavendas/sistema/styles.css' : null;
  if (!arquivo) { resposta.writeHead(404); resposta.end(); return; }
  resposta.setHeader('Content-Type', `${caminho.endsWith('.js') ? 'text/javascript' : 'text/css'}; charset=utf-8`);
  resposta.end(readFileSync(resolve(raiz, arquivo)));
});
await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
const porta = servidor.address().port;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  `--user-data-dir=${perfil}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
try {
  let navegadorWs;
  let logs = '';
  chrome.stderr.on('data', (dados) => { logs += dados; navegadorWs = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1]; });
  for (let i = 0; i < 100 && !navegadorWs; i++) await pausinha(100);
  assert.ok(navegadorWs, 'Chrome não iniciou a auditoria isolada');
  ws = new WebSocket(navegadorWs);
  await new Promise((resolver, rejeitar) => { ws.onopen = resolver; ws.onerror = rejeitar; });
  let id = 0;
  const pendentes = new Map();
  const erros = [];
  ws.onmessage = ({ data }) => {
    const mensagem = JSON.parse(data);
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails.exception?.description || mensagem.params.exceptionDetails.text);
    if (mensagem.id) {
      const { resolver, rejeitar } = pendentes.get(mensagem.id);
      pendentes.delete(mensagem.id);
      if (mensagem.error) rejeitar(new Error(JSON.stringify(mensagem.error)));
      else resolver(mensagem.result);
    }
  };
  const chamar = (method, params = {}, sessionId) => new Promise((resolver, rejeitar) => {
    const identificador = ++id;
    pendentes.set(identificador, { resolver, rejeitar });
    ws.send(JSON.stringify({ id: identificador, method, params, sessionId }));
  });
  const { targetId } = await chamar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await chamar('Target.attachToTarget', { targetId, flatten: true });
  await chamar('Runtime.enable', {}, sessionId);
  await chamar('Page.enable', {}, sessionId);
  await chamar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
  const avaliar = async (expression) => {
    const resposta = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (resposta.exceptionDetails) throw new Error(resposta.exceptionDetails.exception?.description || resposta.exceptionDetails.text);
    return resposta.result.value;
  };
  for (const plataforma of ['android', 'ios']) {
    for (const provedor of ['google', 'apple']) {
      await chamar('Page.navigate', { url: `http://127.0.0.1:${porta}/?plataforma=${plataforma}` }, sessionId);
      let pronto = false;
      for (let i = 0; i < 60; i++) {
        await pausinha(100);
        pronto = await avaliar("Boolean(document.querySelector('.login-screen form'))").catch(() => false);
        if (pronto) break;
      }
      assert.ok(pronto, `O login real não foi renderizado: ${JSON.stringify(erros)}; ${await avaliar('document.body.innerText')}`);
      const resultado = await avaliar(`(async () => {
        const telas = [];
        const registrar = () => telas.push(document.querySelector('.login-screen form') ? 'login' : document.querySelector('.preparing-access-card') ? 'preparacao' : 'sala');
        document.getElementById('loginLembrar').checked = true;
        document.querySelector('.${provedor}-login-button').click();
        await new Promise(resolve => setTimeout(resolve, 25));
        const observador = new MutationObserver(registrar);
        observador.observe(document.getElementById('app'), { childList: true, subtree: true });
        let liberar;
        VendasDb.setSession = async () => { await new Promise(resolve => { liberar = resolve; }); __auditoria.conectado = true; };
        prepararSelecaoSistemaAntesDosDadosVendas = async () => { await new Promise(resolve => setTimeout(resolve, 50)); state.autenticado = true; return false; };
        carregarSistemaVendasCompleto = async () => { await new Promise(resolve => setTimeout(resolve, 50)); carregandoBackend = false; preparandoRecursosSala = false; document.getElementById('app').innerHTML = '<section id="sala-auditoria">Sala simulada: sessão confirmada</section>'; };
        const retorno = processarRetornoOAuthNativoVendas('br.com.avantalab.vendas://auth/callback#access_token=teste-local&refresh_token=teste-local');
        __auditoria.eventos.browserFinished();
        await new Promise(resolve => setTimeout(resolve, 100));
        const preparando = Boolean(document.querySelector('.preparing-access-card'));
        const lembrar = Number(localStorage.getItem('avantalab.vendas_mobile.lembrar_conectado_ate')) > Date.now();
        liberar(); await retorno;
        await new Promise(resolve => setTimeout(resolve, 0));
        observador.disconnect();
        return { preparando, lembrar, telas, aberturas: __auditoria.aberturas, sala: Boolean(document.getElementById('sala-auditoria')) };
      })()`);
      assert.equal(resultado.preparando, true);
      assert.equal(resultado.lembrar, true);
      assert.equal(resultado.sala, true);
      assert.equal(resultado.aberturas, 1);
      assert.ok(!resultado.telas.includes('login'));
      console.log(`${plataforma}/${provedor}: DOM real mantém preparação, sem flash do login; lembrar-me preservado.`);
    }
  }
  assert.deepEqual(erros, []);
  console.log('Auditoria Chrome concluída. Provedor e plugins simulados; não substitui teste no aparelho.');
} finally {
  ws?.close();
  chrome.kill();
  await new Promise((resolver) => servidor.close(resolver));
}
