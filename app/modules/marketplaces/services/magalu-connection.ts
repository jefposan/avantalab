import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';
import { createMagaluAuthorization, magaluBrowserHash, type MagaluConfiguration } from './magalu-oauth';
import { sealMarketplaceSecret } from './secret-vault';

export async function startMagaluConnection(db: SupabaseClient, companyId: string, actorId: string, configuration: MagaluConfiguration) {
  const { data, error } = await db.from('marketplace_oauth_pending').select('id').eq('empresa_id', companyId).eq('provider', 'magalu')
    .eq('started_by', actorId).is('consumed_at', null).gt('expires_at', new Date().toISOString()).limit(10);
  if (error) throw new MarketplaceError(503, 'database', 'A preparação da conexão Magalu ainda não foi ativada no banco.');
  if ((data || []).length >= 10) throw new MarketplaceError(429, 'oauth_limit', 'Há autorizações pendentes. Aguarde alguns minutos antes de tentar novamente.');
  const authorization = createMagaluAuthorization(configuration);
  const saved = await db.from('marketplace_oauth_pending').insert({ empresa_id: companyId, provider: 'magalu', state: authorization.state,
    verifier_sealed: sealMarketplaceSecret(JSON.stringify(authorization.intent)), browser_binding_hash: magaluBrowserHash(authorization.browserBinding),
    started_by: actorId, expires_at: authorization.expiresAt });
  if (saved.error) throw new MarketplaceError(503, 'database', 'Não foi possível preparar a conexão Magalu. Confira a migração do banco.');
  return authorization;
}

export async function revalidateMagaluAccess(db: SupabaseClient, companyId: string, actorId: string) {
  if (!uuidIsValid(companyId) || !uuidIsValid(actorId)) throw new Error('Solicitação inválida.');
  const [member, installation] = await Promise.all([
    db.from('usuarios_empresa').select('id').eq('empresa_id', companyId).eq('user_id', actorId).eq('status', 'ativo').in('perfil', ['gestor_master', 'administrador']).limit(1).maybeSingle(),
    db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', companyId).eq('modulo_id', 'marketplaces').maybeSingle(),
  ]);
  if (member.error || installation.error || !member.data || !installation.data?.ativo
    || (installation.data.expira_em && (!Number.isFinite(Date.parse(installation.data.expira_em)) || Date.parse(installation.data.expira_em) <= Date.now()))) throw new Error('Seu acesso mudou durante a conexão. Entre novamente e tente conectar.');
}
