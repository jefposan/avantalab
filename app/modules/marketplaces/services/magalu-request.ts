import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { objectValue, uuidIsValid } from './listing-model';
import { openMarketplaceSecret, sealMarketplaceSecret } from './secret-vault';
import { getMagaluOAuthConfiguration, magaluCatalogScopesGranted, MAGALU_CONNECTION_SCOPES, refreshMagaluToken } from './magalu-oauth';
import { MagaluConnectionError } from './magalu-diagnostics';

export type MagaluConnection = { id: string; empresa_id: string; provider: 'magalu'; seller_reference: string; status: string;
  token_sealed: Parameters<typeof openMarketplaceSecret>[0]; expires_at: string | null; scopes: string[]; connected_at: string; last_error_code?: string | null };

export async function loadMagaluConnection(db: SupabaseClient, companyId: string, id: unknown): Promise<MagaluConnection> {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'select_account', 'Selecione a conta Magalu.');
  const { data, error } = await db.from('marketplace_connections').select('*').eq('empresa_id', companyId).eq('id', id).eq('provider', 'magalu').maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível conferir a conta Magalu.');
  if (!data) throw new MarketplaceError(404, 'account_not_found', 'Conta não encontrada nesta empresa.');
  if (!['connected', 'attention'].includes(data.status) || !data.token_sealed) throw new MarketplaceError(409, 'reconnect', 'Conecte a mesma loja Magalu novamente, sem excluir a conta.');
  if (!Array.isArray(data.scopes) || !MAGALU_CONNECTION_SCOPES.every(scope => data.scopes.includes(scope))) throw new MarketplaceError(403, 'magalu_missing_scopes', 'Autorize novamente a mesma loja Magalu para permitir vendas e pós-venda. Não precisa excluir a conta.');
  return data as MagaluConnection;
}

/**
 * Portão próprio para catálogo: consultas de vendas continuam válidas para uma
 * conta que ainda não consentiu publicação. Nunca use este carregador para
 * uma operação de leitura de pedidos ou pós-venda.
 */
export async function loadMagaluCatalogConnection(db: SupabaseClient, companyId: string, id: unknown): Promise<MagaluConnection> {
  const connection = await loadMagaluConnection(db, companyId, id);
  if (connection.status === 'attention' && connection.last_error_code !== 'magalu_connector_pending') {
    throw new MarketplaceError(409, 'magalu_catalog_reauthorize', 'Esta loja precisa ser reautorizada antes de publicar. Não exclua a conta.');
  }
  if (!magaluCatalogScopesGranted(connection.scopes)) {
    throw new MarketplaceError(403, 'magalu_catalog_reauthorize', 'Para preparar catálogo, preços e estoque no AvantaLab, autorize novamente a mesma loja Magalu. Não precisa excluir a conta.');
  }
  return connection;
}

async function accessToken(db: SupabaseClient, initial: MagaluConnection, force = false): Promise<string> {
  let connection = initial;
  for (let attempt = 0; attempt < 10; attempt++) {
    let saved: Record<string, unknown>;
    try { saved = objectValue(JSON.parse(openMarketplaceSecret(connection.token_sealed))); }
    catch { throw new MarketplaceError(503, 'vault_unavailable', 'Não foi possível acessar a autorização com segurança. Avise o administrador.'); }
    if (typeof saved.accessToken !== 'string' || typeof saved.refreshToken !== 'string') throw new MarketplaceError(409, 'reconnect', 'Autorize a mesma loja Magalu novamente.');
    if ((!force || JSON.stringify(connection.token_sealed) !== JSON.stringify(initial.token_sealed)) && Date.parse(connection.expires_at || '') > Date.now() + 60_000) return saved.accessToken;
    const owner = randomUUID();
    const { data: locked, error } = await db.from('marketplace_connections').update({ refresh_lock_owner: owner, refresh_lock_until: new Date(Date.now() + 40_000).toISOString() })
      .eq('empresa_id', connection.empresa_id).eq('id', connection.id).eq('provider', 'magalu').eq('status', connection.status)
      .filter('token_sealed', 'eq', JSON.stringify(connection.token_sealed)).or(`refresh_lock_until.is.null,refresh_lock_until.lt.${new Date().toISOString()}`).select('*').maybeSingle();
    if (error) throw new MarketplaceError(503, 'database', 'Não foi possível renovar a autorização Magalu.');
    if (locked) {
      let exchanged = false;
      try {
        const refreshed = await refreshMagaluToken(saved.refreshToken, getMagaluOAuthConfiguration()); exchanged = true;
        if (refreshed.sellerReference !== connection.seller_reference) throw new MarketplaceError(409, 'seller_mismatch', 'A identidade da loja mudou. Autorize a mesma loja novamente.');
        const persisted = await db.from('marketplace_connections').update({ token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken })),
          expires_at: refreshed.expiresAt, scopes: refreshed.scopes, last_checked_at: new Date().toISOString() })
          .eq('empresa_id', connection.empresa_id).eq('id', connection.id).eq('provider', 'magalu').eq('status', connection.status).eq('refresh_lock_owner', owner)
          .filter('token_sealed', 'eq', JSON.stringify(connection.token_sealed)).select('id').maybeSingle();
        if (persisted.error || !persisted.data) throw new MarketplaceError(409, 'refresh_persistence', 'A autorização mudou durante a consulta. Conecte a mesma loja novamente.');
        return refreshed.accessToken;
      } catch (error) {
        if (exchanged || (error instanceof MagaluConnectionError && error.code === 'authorization_revoked')) {
          await db.from('marketplace_connections').update({ status: 'expired', token_sealed: null, last_error_code: 'magalu_reauthorize' })
            .eq('empresa_id', connection.empresa_id).eq('id', connection.id).eq('provider', 'magalu').eq('refresh_lock_owner', owner)
            .filter('token_sealed', 'eq', JSON.stringify(connection.token_sealed));
        }
        if (error instanceof MarketplaceError) throw error;
        throw new MarketplaceError(503, 'magalu_refresh', error instanceof MagaluConnectionError ? error.message : 'Não foi possível renovar a autorização. Tente novamente.');
      } finally {
        await db.from('marketplace_connections').update({ refresh_lock_owner: null, refresh_lock_until: null }).eq('empresa_id', connection.empresa_id).eq('id', connection.id).eq('provider', 'magalu').eq('refresh_lock_owner', owner);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    connection = await loadMagaluConnection(db, connection.empresa_id, connection.id);
  }
  throw new MarketplaceError(409, 'refresh_busy', 'A autorização Magalu está em atualização. Aguarde e tente novamente.');
}

/** Somente leitura em rotas conhecidas; nunca aceita URL/resource vindo do navegador. */
export async function magaluRequest(db: SupabaseClient, connection: MagaluConnection, path: string): Promise<unknown> {
  const url = new URL(path, 'https://api.magalu.com');
  if (url.origin !== 'https://api.magalu.com' || !path.startsWith('/') || path.startsWith('//') || url.hash
    || !/^\/seller\/(?:v1\/(?:orders(?:\/[A-Za-z0-9_-]{1,100})?|financial-analysis\/orders)|v0\/tickets(?:\/[a-f0-9-]{36}(?:\/(?:events|returns|messages))?)?)$/.test(url.pathname)) throw new MarketplaceError(400, 'invalid_resource', 'Consulta Magalu inválida.');
  let token = await accessToken(db, connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try { response = await fetch(url, { method: 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000), headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': connection.seller_reference } }); }
    catch { throw new MarketplaceError(503, 'magalu_unavailable', 'O Magalu não respondeu. Tente atualizar novamente.'); }
    if (response.status === 401 && attempt === 0) { token = await accessToken(db, connection, true); continue; }
    if (response.status !== 200) throw new MarketplaceError(response.status === 403 ? 403 : 503, `magalu_${response.status}`, response.status === 403 ? 'O Magalu não liberou esta consulta. Autorize novamente a mesma loja para permitir vendas e pós-venda.' : response.status === 429 ? 'Limite de consultas do Magalu. Aguarde e tente novamente.' : 'Não foi possível consultar este recurso no Magalu. Tente novamente.');
    return response.json().catch(() => { throw new MarketplaceError(503, 'magalu_response', 'A resposta do Magalu está incompleta. Tente atualizar novamente.'); });
  }
  throw new MarketplaceError(409, 'reconnect', 'Autorize a mesma loja Magalu novamente.');
}

/** Catálogo: caminhos fixos, escopos próprios e escrita somente após validação no servidor. */
export async function magaluCatalogRequest(db: SupabaseClient, connection: MagaluConnection, method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  if (!magaluCatalogScopesGranted(connection.scopes)) throw new MarketplaceError(403, 'magalu_catalog_reauthorize', 'Reautorize esta loja Magalu para catálogo, preço e estoque. Não precisa excluí-la.');
  const url = new URL(path, 'https://api.magalu.com');
  const base = '/seller/v1/portfolios/';
  const readable = /^\/seller\/v1\/portfolios\/(?:category(?:\/hierarchy|\/[a-f0-9-]{36}\/(?:attributes|datasheet))?|skus\/[A-Za-z0-9._-]{1,32}(?:\/validation-info)?|prices\/[A-Za-z0-9._-]{1,32}|stocks\/[A-Za-z0-9._-]{1,32})$/i;
  const writable = /^\/seller\/v1\/portfolios\/(?:skus|prices\/[A-Za-z0-9._-]{1,32}|stocks\/[A-Za-z0-9._-]{1,32})$/;
  if (!path.startsWith(base) || path.startsWith('//') || url.origin !== 'https://api.magalu.com' || url.hash || (method === 'GET' ? !readable.test(url.pathname) : !writable.test(url.pathname) || !!url.search)) {
    throw new MarketplaceError(400, 'invalid_resource', 'Recurso de catálogo Magalu inválido.');
  }
  if (method === 'GET' && [...url.searchParams.keys()].some(key => !['name', 'id', 'parent_id', '_limit', '_offset'].includes(key))) throw new MarketplaceError(400, 'invalid_resource', 'Filtro de catálogo inválido.');
  let token = await accessToken(db, connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try { response = await fetch(url, { method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': connection.seller_reference, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new MarketplaceError(method === 'POST' ? 409 : 503, method === 'POST' ? 'magalu_write_uncertain' : 'magalu_unavailable',
      method === 'POST' ? 'A resposta do Magalu não chegou. O envio pode ter sido aceito; não repita a publicação antes de conferir o SKU.' : 'O Magalu não respondeu. Tente consultar novamente.'); }
    if (response.status === 401 && attempt === 0) { token = await accessToken(db, connection, true); continue; }
    const data: unknown = await response.json().catch(() => null);
    if (method === 'GET' && response.status === 404) return { status: 404, data: null };
    if (response.status !== (method === 'POST' ? 202 : 200)) {
      const code = response.status === 403 ? 'magalu_catalog_denied' : response.status === 422 ? 'magalu_catalog_validation' : response.status === 423 ? 'magalu_catalog_locked' : `magalu_catalog_${response.status}`;
      throw new MarketplaceError(response.status === 403 ? 403 : response.status === 422 ? 422 : response.status === 423 ? 423 : 503, code,
        response.status === 403 ? 'O Magalu não liberou esta operação para a loja. Reautorize e confira a aprovação do vendedor.' : response.status === 422 ? 'O Magalu rejeitou os dados do catálogo. Revise a ficha e a categoria; o envio foi interrompido.' : response.status === 423 ? 'O Magalu bloqueou temporariamente o cadastro de produtos. Aguarde a liberação.' : response.status === 429 ? 'Limite de consultas do Magalu. Aguarde e tente novamente.' : 'O Magalu não confirmou esta etapa. Confira o SKU antes de tentar novamente.');
    }
    if (!data || typeof data !== 'object' || (method === 'POST' && Array.isArray(data))) throw new MarketplaceError(503, 'magalu_response', 'A resposta do Magalu está incompleta. Confira o SKU antes de repetir o envio.');
    return { status: response.status, data };
  }
  throw new MarketplaceError(409, 'reconnect', 'Reautorize a mesma loja Magalu.');
}
