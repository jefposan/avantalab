import { COBRANCA_ATIVA, assinaturaVigente, type EstadoAcesso } from './cobranca';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS, type PlanoComercial } from './planos-comerciais';
import type { SupabaseClient } from '@supabase/supabase-js';

export function planoAplicavelParaLimites(estado: EstadoAcesso | null): PlanoComercial | null {
  if (!COBRANCA_ATIVA || !estado) return null;
  const plano = normalizarPlanoComercial(estado.plano);
  if (estado.tipoPerfil === 'pessoal') {
    return plano === 'pessoal_premium' && assinaturaVigente(estado) ? 'pessoal_premium' : 'free';
  }
  if (!assinaturaVigente(estado)) return null;
  return plano === 'business_pro' ? 'business_pro' : 'business';
}

export async function validarLimiteDeUsuarios(
  db: SupabaseClient,
  empresaId: string,
  estado: EstadoAcesso | null,
): Promise<{ permitido: true } | { permitido: false; mensagem: string }> {
  const plano = planoAplicavelParaLimites(estado);
  if (!plano) return { permitido: true };
  const { count, error } = await db
    .from('usuarios_empresa')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    // Funcionários do Controle de Ponto usam um vínculo técnico próprio e não
    // têm acesso à Gestão; portanto não consomem a franquia de usuários.
    .neq('perfil', 'funcionario_ponto');
  if (error) throw error;
  const limite = PLANOS_COMERCIAIS[plano].limites.usuarios;
  if ((count || 0) < limite) return { permitido: true };
  const sugestao = plano === 'free' ? 'Pessoal Premium' : plano === 'pessoal_premium' ? 'Business' : 'Business Pro';
  return { permitido: false, mensagem: `Este plano permite até ${limite} ${limite === 1 ? 'usuário' : 'usuários'}. Faça upgrade para o ${sugestao} para adicionar mais pessoas.` };
}
