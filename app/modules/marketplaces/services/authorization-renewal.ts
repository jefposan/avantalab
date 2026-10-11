import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';
import { createMercadoLivreOAuthState, createPkceVerifier } from './mercadolivre-oauth';
import { openMarketplaceSecret, sealMarketplaceSecret, type SealedMarketplaceSecret } from './secret-vault';

export type RenewalIntent = { purpose: 'renewal'; verifier: string; connectionId: string; sellerReference: string };
export type PendingAuthorization = { id: string; empresa_id: string; started_by: string; expires_at: string; consumed_at: string | null; verifier_sealed: SealedMarketplaceSecret };
const unavailable = () => new MarketplaceError(410, 'renewal_unavailable', 'Solicitação indisponível, expirada ou já utilizada. Peça um novo link ao administrador.');
export function authorizationIntent(value: string): RenewalIntent | { purpose: 'connection'; verifier: string } {
  if (/^[A-Za-z0-9_-]{43,128}$/.test(value)) return { purpose: 'connection', verifier: value };
  const intent = JSON.parse(value) as RenewalIntent;
  if (intent?.purpose !== 'renewal' || !uuidIsValid(intent.connectionId) || !/^[0-9]{1,24}$/.test(intent.sellerReference) || !/^[A-Za-z0-9_-]{43,128}$/.test(intent.verifier)) throw unavailable();
  return intent;
}

/** Revalida acesso do solicitante e conta alvo, também quando o titular usa o link sem sessão AvantaLab. */
export async function renewalContext(db: SupabaseClient, pending: PendingAuthorization, intent: RenewalIntent) {
  if (!Number.isFinite(Date.parse(pending.expires_at)) || Date.parse(pending.expires_at) <= Date.now()) throw unavailable();
  const [member, installation, account] = await Promise.all([
    db.from('usuarios_empresa').select('id').eq('empresa_id', pending.empresa_id).eq('user_id', pending.started_by).eq('status', 'ativo').in('perfil', ['gestor_master', 'administrador']).limit(1).maybeSingle(),
    db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', pending.empresa_id).eq('modulo_id', 'marketplaces').maybeSingle(),
    db.from('marketplace_connections').select('id,seller_reference,seller_name,status,token_sealed,refresh_lock_until').eq('id', intent.connectionId).eq('empresa_id', pending.empresa_id).eq('provider', 'mercado_livre').eq('seller_reference', intent.sellerReference).in('status', ['connected', 'expired', 'attention']).maybeSingle(),
  ]);
  if (member.error || installation.error || account.error) throw new MarketplaceError(503, 'database', 'Não foi possível validar a solicitação. Tente novamente.');
  if (!member.data || !installation.data?.ativo || (installation.data.expira_em && Date.parse(installation.data.expira_em) <= Date.now()) || !account.data) throw unavailable();
  return account.data;
}

export async function createAuthorizationRenewal(db: SupabaseClient, companyId: string, actorId: string, connectionId: unknown, origin: string) {
  if (!uuidIsValid(connectionId)) throw new MarketplaceError(400, 'invalid_connection', 'Conta inválida.');
  const { data: account, error } = await db.from('marketplace_connections').select('id,seller_reference,seller_name').eq('id', connectionId).eq('empresa_id', companyId).eq('provider', 'mercado_livre').in('status', ['connected', 'expired', 'attention']).maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar a conta.');
  if (!account || !/^[0-9]{1,24}$/.test(account.seller_reference || '')) throw new MarketplaceError(404, 'connection_not_found', 'Conta não encontrada nesta empresa.');
  const { data: active, error: countError } = await db.from('marketplace_oauth_pending').select('id').eq('empresa_id', companyId).eq('started_by', actorId).is('consumed_at', null).gt('expires_at', new Date().toISOString()).limit(20);
  if (countError) throw new MarketplaceError(503, 'database', 'Não foi possível preparar a solicitação.');
  if ((active || []).length >= 20) throw new MarketplaceError(429, 'renewal_limit', 'Há muitas autorizações pendentes. Cancele as anteriores ou aguarde sua expiração.');
  const state = createMercadoLivreOAuthState();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const intent: RenewalIntent = { purpose: 'renewal', verifier: createPkceVerifier(), connectionId, sellerReference: account.seller_reference };
  const { error: saveError } = await db.from('marketplace_oauth_pending').insert({ empresa_id: companyId, provider: 'mercado_livre', state, started_by: actorId, expires_at: expiresAt, verifier_sealed: sealMarketplaceSecret(JSON.stringify(intent)) });
  if (saveError) throw new MarketplaceError(503, 'database', 'Não foi possível criar a solicitação.');
  const link = new URL('/marketplaces/renovar', origin);
  // Fragmento não chega aos logs HTTP, previews de mensagens ou cabeçalho Referer.
  link.hash = new URLSearchParams({ solicitacao: state }).toString();
  return { link: link.toString(), requestId: state, expiresAt, sellerName: account.seller_name || account.seller_reference };
}

export async function readAuthorizationRenewal(db: SupabaseClient, state: unknown) {
  if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw unavailable();
  const { data: pending, error } = await db.from('marketplace_oauth_pending').select('*').eq('state', state).eq('provider', 'mercado_livre').is('consumed_at', null).maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar a solicitação.');
  if (!pending) throw unavailable();
  const intent = authorizationIntent(openMarketplaceSecret(pending.verifier_sealed));
  if (intent.purpose !== 'renewal') throw unavailable();
  const account = await renewalContext(db, pending, intent);
  return { pending: pending as PendingAuthorization, intent, account };
}

export async function completeAuthorizationRenewal(db: SupabaseClient, pending: PendingAuthorization, intent: RenewalIntent, credentials: { sellerReference: string; accessToken: string; refreshToken: string; scopes: string[]; expiresAt: string | null }) {
  if (credentials.sellerReference !== intent.sellerReference) throw new MarketplaceError(409, 'renewal_seller_mismatch', 'Foi autorizada outra conta do Mercado Livre. A conta selecionada foi preservada. Peça um novo link e entre na conta correta.');
  const account = await renewalContext(db, pending, intent);
  let update = db.from('marketplace_connections').update({ status: 'connected', token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: credentials.accessToken, refreshToken: credentials.refreshToken })), token_key_version: 1, scopes: credentials.scopes, expires_at: credentials.expiresAt, last_checked_at: new Date().toISOString(), last_error_code: null, updated_at: new Date().toISOString() })
    .eq('id', intent.connectionId).eq('empresa_id', pending.empresa_id).eq('provider', 'mercado_livre').eq('seller_reference', intent.sellerReference).eq('status', account.status)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${new Date().toISOString()}`);
  // Não sobrescrever uma renovação de token concorrente nem uma desconexão feita durante o consentimento.
  update = account.token_sealed ? update.filter('token_sealed', 'eq', JSON.stringify(account.token_sealed)) : update.is('token_sealed', null);
  const { data, error } = await update.select('id').maybeSingle();
  if (error || !data) throw new MarketplaceError(409, 'renewal_changed', 'A conexão mudou durante a autorização. Peça um novo link e tente novamente; nenhum histórico foi removido.');
}
