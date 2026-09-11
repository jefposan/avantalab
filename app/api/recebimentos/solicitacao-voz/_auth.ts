import type { SupabaseClient, User } from '@supabase/supabase-js';
import { assinaturaEmpresaLiberada, clientesServidor, usuarioDaRequisicao } from '../_lib';
import type { ModoVozCampo } from '@/app/recebimentos/voice/types';

export async function contextoVozCampo(request: Request, empresaId: string, modo: ModoVozCampo): Promise<{
  admin: SupabaseClient;
  user: User;
} | null> {
  const clientes = clientesServidor();
  if (!clientes || !empresaId || !['recebimentos', 'servicos'].includes(modo)) return null;
  const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
  if (!user || !await assinaturaEmpresaLiberada(empresaId)) return null;
  let consulta = clientes.admin
    .from('recebimentos_colaboradores')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', user.id)
    .eq('ativo', true);
  consulta = modo === 'recebimentos'
    ? consulta.eq('pode_recebimentos', true)
    : consulta.or('pode_servicos.eq.true,pode_agendamentos.eq.true');
  const { data, error } = await consulta.maybeSingle();
  if (error || !data) return null;
  return { admin: clientes.admin, user };
}
