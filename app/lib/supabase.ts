import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type JanelaGestaoMobile = Window & {
  __AVANTALAB_MOBILE_SUPABASE_CLIENT__?: SupabaseClient;
};

function executandoNaGestaoMobilePrincipal() {
  if (typeof window === 'undefined') return false;
  try {
    // Subrotas como /mobile/ava possuem ciclo próprio e não carregam o cliente
    // imperativo de /mobile; somente a tela principal reutiliza a instância.
    return window.location.pathname === '/mobile';
  } catch {
    return false;
  }
}

function clienteCompartilhadoDaGestaoNativa() {
  // A Gestão Mobile imperativa é quem cria e administra a sessão persistida.
  // As pontes React acessam esse mesmo cliente apenas quando uma ação é
  // solicitada, evitando duas instâncias GoTrue sobre a mesma chave local.
  return new Proxy({} as SupabaseClient, {
    get(_alvo, propriedade) {
      const cliente = (window as JanelaGestaoMobile).__AVANTALAB_MOBILE_SUPABASE_CLIENT__;
      if (!cliente) {
        throw new Error('A sessão da Gestão Mobile ainda está sendo preparada.');
      }

      const valor = Reflect.get(cliente, propriedade, cliente);
      return typeof valor === 'function' ? valor.bind(cliente) : valor;
    },
  });
}

export const supabase = executandoNaGestaoMobilePrincipal()
  ? clienteCompartilhadoDaGestaoNativa()
  : createClient(supabaseUrl, supabaseAnonKey);
