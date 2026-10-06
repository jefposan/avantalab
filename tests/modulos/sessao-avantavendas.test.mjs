import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const raiz = resolve(import.meta.dirname, '../..');
const fonte = readFileSync(resolve(raiz, 'app/avantavendas/sistema/supabase-client.js'), 'utf8');

function criarBanco(auth) {
  const client = { auth };
  const window = {
    VENDAS_MOBILE_CONFIG: { supabaseUrl: 'https://teste.supabase.co', supabaseAnonKey: 'anon' },
    supabase: { createClient: () => client },
  };
  vm.runInNewContext(fonte, { window, console, URLSearchParams, setTimeout, clearTimeout });
  return window.VendasDb;
}

function criarBancoComFetch(fetch) {
  let opcoesCliente = null;
  const window = {
    VENDAS_MOBILE_CONFIG: { supabaseUrl: 'https://teste.supabase.co', supabaseAnonKey: 'anon' },
    fetch,
    setTimeout: (acao) => {
      queueMicrotask(acao);
      return 1;
    },
    clearTimeout: () => undefined,
    supabase: {
      createClient: (_url, _chave, opcoes) => {
        opcoesCliente = opcoes;
        return { auth: {} };
      },
    },
  };
  vm.runInNewContext(fonte, { window, console, URLSearchParams, AbortController, setTimeout, clearTimeout, queueMicrotask });
  return opcoesCliente.global.fetch;
}

test('sessão expirada é renovada antes de identificar o usuário', async () => {
  let renovacoes = 0;
  const usuario = { id: 'usuario-1' };
  const banco = criarBanco({
    getSession: async () => ({ data: { session: { expires_at: Math.floor(Date.now() / 1000) - 1 } }, error: null }),
    refreshSession: async () => {
      renovacoes += 1;
      return { data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600, user: usuario } }, error: null };
    },
    getUser: async () => ({ data: { user: usuario }, error: null }),
  });

  assert.deepEqual(await banco.currentUser(), usuario);
  assert.equal(renovacoes, 1);
});

test('consultas simultâneas compartilham uma única renovação de sessão', async () => {
  let renovacoes = 0;
  let concluirRenovacao;
  const usuario = { id: 'usuario-2' };
  const renovacao = new Promise((resolvePromise) => { concluirRenovacao = resolvePromise; });
  const banco = criarBanco({
    getSession: async () => ({ data: { session: { expires_at: Math.floor(Date.now() / 1000) - 1 } }, error: null }),
    refreshSession: async () => {
      renovacoes += 1;
      await renovacao;
      return { data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600, user: usuario } }, error: null };
    },
    getUser: async () => ({ data: { user: usuario }, error: null }),
  });

  const primeira = banco.currentUser();
  const segunda = banco.currentUser();
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
  assert.equal(renovacoes, 1);
  concluirRenovacao();
  assert.deepEqual(await Promise.all([primeira, segunda]), [usuario, usuario]);
});

test('falha de rede preserva a sessão local para a restauração offline', async () => {
  const banco = criarBanco({
    getSession: async () => ({ data: { session: { expires_at: Math.floor(Date.now() / 1000) - 1 } }, error: null }),
    refreshSession: async () => ({ data: { session: null }, error: new Error('Failed to fetch') }),
  });

  assert.equal(await banco.hasSession(), true);
});

test('token inválido não é tratado como uma sessão válida', async () => {
  const banco = criarBanco({
    getSession: async () => ({ data: { session: { expires_at: Math.floor(Date.now() / 1000) - 1 } }, error: null }),
    refreshSession: async () => ({ data: { session: null }, error: new Error('Invalid Refresh Token') }),
  });

  assert.equal(await banco.hasSession(), false);
});

test('gravação em rede lenta é abortada para a fila local assumir sem aguardar indefinidamente', async () => {
  let recebeuAbort = false;
  const fetchComPrazo = criarBancoComFetch((_entrada, opcoes) => new Promise((_resolver, rejeitar) => {
    opcoes.signal.addEventListener('abort', () => {
      recebeuAbort = true;
      const erro = new Error('aborted');
      erro.name = 'AbortError';
      rejeitar(erro);
    }, { once: true });
  }));

  await assert.rejects(
    () => fetchComPrazo('https://teste.supabase.co/rest/v1/vendas_mobile_pedidos', { method: 'POST' }),
    (erro) => erro?.code === 'AVANTAVENDAS_REDE_LENTA' && /conexão demorou/i.test(erro.message),
  );
  assert.equal(recebeuAbort, true);
});

test('leitura concluída antes do prazo preserva a resposta normal', async () => {
  let recebeuSinalDeCancelamento = false;
  const fetchComPrazo = criarBancoComFetch(async (_entrada, opcoes) => {
    recebeuSinalDeCancelamento = Boolean(opcoes.signal);
    return { ok: true };
  });

  const resposta = await fetchComPrazo('https://teste.supabase.co/rest/v1/vendas_mobile_pedidos', { method: 'GET' });
  assert.deepEqual(resposta, { ok: true });
  assert.equal(recebeuSinalDeCancelamento, true);
});
