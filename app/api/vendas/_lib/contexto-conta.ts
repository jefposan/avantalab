import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PapelContaVendas = 'proprietario' | 'administrador' | 'vendedor' | 'consulta';

export type ContextoContaVendas = {
  admin: SupabaseClient;
  userId: string;
  papel: PapelContaVendas;
  contaId: string;
};

export async function obterContextoContaVendas(request: Request, contaId: string): Promise<ContextoContaVendas | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !contaId) return null;

  const cliente = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: autenticacao, error: erroAutenticacao } = await cliente.auth.getUser(token);
  if (erroAutenticacao || !autenticacao.user) return null;

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vinculo, error: erroVinculo } = await admin
    .from('vendas_mobile_contas_usuarios')
    .select('papel')
    .eq('conta_id', contaId)
    .eq('user_id', autenticacao.user.id)
    .eq('status', 'ativo')
    .maybeSingle();
  if (erroVinculo || !vinculo?.papel) return null;

  return {
    admin,
    userId: autenticacao.user.id,
    papel: vinculo.papel as PapelContaVendas,
    contaId,
  };
}

export function podeGerirBackup(papel: PapelContaVendas) {
  return papel === 'proprietario' || papel === 'administrador';
}

