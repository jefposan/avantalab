import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);

test('Gestão Mobile expõe o único cliente proprietário da sessão', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(
    mobile,
    /var db = supabaseGlobal\.createClient[\s\S]*?window\.__AVANTALAB_MOBILE_SUPABASE_CLIENT__ = db;/,
  );
});

test('pontes React reutilizam o cliente da Gestão Mobile nativa', async () => {
  const cliente = await readFile(new URL('app/lib/supabase.ts', raiz), 'utf8');

  assert.match(cliente, /function clienteCompartilhadoDaGestaoNativa\(\)/);
  assert.match(cliente, /__AVANTALAB_MOBILE_SUPABASE_CLIENT__/);
  assert.match(
    cliente,
    /export const supabase = executandoNaGestaoMobilePrincipal\(\)[\s\S]*?clienteCompartilhadoDaGestaoNativa\(\)[\s\S]*?: createClient\(supabaseUrl, supabaseAnonKey\);/,
  );
  assert.doesNotMatch(cliente, /autoRefreshToken:\s*false/);
  assert.doesNotMatch(cliente, /lock:\s*async/);
});

test('proxy da tela principal delega chamadas para a instância já autenticada', async () => {
  const janelaAnterior = globalThis.window;
  const urlAnterior = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveAnterior = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clienteMobile = {
    auth: { origem: 'sessao-principal' },
    from(tabela) {
      return { tabela, mesmoCliente: this === clienteMobile };
    },
  };

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://teste.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-teste';
  globalThis.window = {
    location: { pathname: '/mobile' },
    __AVANTALAB_MOBILE_SUPABASE_CLIENT__: clienteMobile,
  };

  try {
    const { supabase } = await import(`../../app/lib/supabase.ts?teste=${Date.now()}`);
    assert.equal(supabase.auth, clienteMobile.auth);
    assert.deepEqual(supabase.from('empresas'), {
      tabela: 'empresas',
      mesmoCliente: true,
    });
  } finally {
    if (janelaAnterior === undefined) delete globalThis.window;
    else globalThis.window = janelaAnterior;
    if (urlAnterior === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlAnterior;
    if (chaveAnterior === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = chaveAnterior;
  }
});
