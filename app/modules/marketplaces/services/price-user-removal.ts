import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';

/** Remove o acesso dedicado, nunca a identidade referenciada pela base da empresa. */
export async function removePriceUser(db: SupabaseClient, company: string, id: unknown, managerId: string) {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'invalid_user', 'Usuário inválido.');
  const { data: target, error } = await db.from('marketplace_price_users').select('id,user_id').eq('id', id).eq('empresa_id', company).maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar este acesso.');
  if (!target) throw new MarketplaceError(404, 'not_found', 'Usuário não encontrado nesta empresa.');
  if (target.user_id === managerId) throw new MarketplaceError(409, 'shared_access', 'Este acesso não é um login exclusivo do AvantaPreços.');

  const [identity, memberships, dedicated] = await Promise.all([
    db.auth.admin.getUserById(target.user_id),
    db.from('usuarios_empresa').select('id').eq('user_id', target.user_id).limit(1),
    db.from('marketplace_price_users').select('id,empresa_id').eq('user_id', target.user_id),
  ]);
  if (identity.error || memberships.error || dedicated.error || !identity.data.user) throw new MarketplaceError(503, 'access_check', 'Não foi possível verificar o acesso antes da exclusão.');
  const user = identity.data.user;
  if (user.app_metadata?.restricted_app !== 'avantaprecos' || user.app_metadata?.empresa_id !== company || memberships.data?.length || dedicated.data?.some(row => row.id !== target.id)) {
    throw new MarketplaceError(409, 'shared_access', 'Este login possui outros vínculos e não pode ser excluído como acesso exclusivo do AvantaPreços. Nenhum dado foi alterado.');
  }

  const now = new Date().toISOString();
  // Primeiro revoga o vínculo: até tokens emitidos anteriormente deixam de operar.
  const disabled = await db.from('marketplace_price_users').update({ ativo: false, updated_at: now }).eq('id', target.id).eq('empresa_id', company);
  if (disabled.error) throw new MarketplaceError(503, 'access_disable', 'Não foi possível bloquear o acesso. Tente novamente.');
  // A identidade técnica fica para autoria/auditoria; sem autenticação nem login reutilizável.
  const blocked = await db.auth.admin.updateUserById(target.user_id, {
    ban_duration: '876000h',
    user_metadata: { ...user.user_metadata, login: '' },
  });
  if (blocked.error) throw new MarketplaceError(503, 'access_cleanup', 'O acesso ao perfil foi bloqueado, mas a exclusão não foi concluída. Tente excluir novamente. Os dados do perfil foram preservados.');
  const directory = await db.from('usuarios_contas').update({ login: null, atualizado_em: now }).eq('user_id', target.user_id);
  if (directory.error) throw new MarketplaceError(503, 'access_cleanup', 'O acesso está bloqueado, mas o login ainda não foi liberado. Tente excluir novamente. Os dados do perfil foram preservados.');
  const removed = await db.from('marketplace_price_users').delete().eq('id', target.id).eq('empresa_id', company).eq('user_id', target.user_id);
  if (removed.error) throw new MarketplaceError(503, 'access_cleanup', 'O acesso está bloqueado, mas a retirada da lista não foi concluída. Tente excluir novamente. Os dados do perfil foram preservados.');
  return { success: true, message: 'Acesso excluído. Produtos, estoque, consultas, lotes e histórico permanecem neste perfil.' };
}
