import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizarTexto } from '@/app/lib/formatters';
import { refreshMercadoLivreToken } from './mercadolivre-oauth';
import { openMarketplaceSecret, sealMarketplaceSecret } from './secret-vault';
import { MarketplaceError } from './management-access';
import { actionBody, listingIdIsValid, normalizeListing, objectValue, uuidIsValid, type ListingAction } from './listing-model';

export type SellerConnection = {
  id: string; empresa_id: string; seller_reference: string; status: string; seller_name: string | null;
  token_sealed: Parameters<typeof openMarketplaceSecret>[0]; expires_at: string | null;
  sync_cursor: string | null; sync_cursor_at: string | null;
  sync_phase: 'scan' | 'enrich'; sync_pending_ids: string[];
  sync_scan_in_flight: boolean;
};
export async function loadConnection(db: SupabaseClient, company: string, id: unknown): Promise<SellerConnection> {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'select_account', 'Selecione a conta do Mercado Livre.');
  const { data, error } = await db.from('marketplace_connections').select('*').eq('empresa_id', company).eq('id', id).eq('provider', 'mercado_livre').maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar a conexão.');
  if (!data) throw new MarketplaceError(404, 'account_not_found', 'Conta não encontrada nesta empresa.');
  if (data.status !== 'connected' || !data.token_sealed) throw new MarketplaceError(409, 'reconnect', 'Reconecte esta conta para consultar ou alterar anúncios.');
  return data as SellerConnection;
}

async function accessToken(db: SupabaseClient, initial: SellerConnection, force = false): Promise<string> {
  let connection = initial;
  for (let attempt = 0; attempt < 12; attempt++) {
    const saved = JSON.parse(openMarketplaceSecret(connection.token_sealed)) as { accessToken: string; refreshToken: string };
    if (!saved.accessToken || !saved.refreshToken) throw new MarketplaceError(409, 'reconnect', 'Reconecte esta conta.');
    if ((!force || connection.token_sealed !== initial.token_sealed) && connection.expires_at && new Date(connection.expires_at).getTime() > Date.now() + 60_000) return saved.accessToken;
    const owner = randomUUID();
    const now = new Date().toISOString();
    const { data: locked, error: lockError } = await db.from('marketplace_connections')
      .update({ refresh_lock_owner: owner, refresh_lock_until: new Date(Date.now() + 30_000).toISOString() })
      .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected')
      .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now}`).select('*').maybeSingle();
    if (lockError) throw new MarketplaceError(503, 'database', 'Não foi possível renovar a conexão.');
    if (locked) {
      let exchanged = false;
      try {
        // Releitura sob lease: o refresh token é de uso único, não usar o snapshot anterior.
        const current = JSON.parse(openMarketplaceSecret(locked.token_sealed));
        const currentExpires = new Date(locked.expires_at || 0).getTime();
        if ((!force || current.accessToken !== saved.accessToken) && currentExpires > Date.now() + 60_000) return current.accessToken;
        const refreshed = await refreshMercadoLivreToken(current.refreshToken);
        exchanged = true;
        if (refreshed.sellerReference !== connection.seller_reference) throw new MarketplaceError(409, 'seller_mismatch', 'Identidade da conta divergente. Reconecte a conta.');
        const { data: persisted, error } = await db.from('marketplace_connections').update({
          token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken })),
          expires_at: refreshed.expiresAt, scopes: refreshed.scopes, last_checked_at: new Date().toISOString(), last_error_code: null,
        }).eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected').eq('refresh_lock_owner', owner).select('id').maybeSingle();
        if (error || !persisted) throw new MarketplaceError(409, 'refresh_persistence', 'A conexão mudou durante a renovação. Reconecte a conta.');
        return refreshed.accessToken;
      } catch (error) {
        const revoked = error instanceof Error && error.message.includes('invalid_grant');
        if (revoked || exchanged) {
          await db.from('marketplace_connections').update({ status: 'expired', last_error_code: revoked ? 'invalid_grant' : 'refresh_persistence', token_sealed: null })
            .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('refresh_lock_owner', owner);
          throw new MarketplaceError(409, 'reconnect', 'A autorização expirou ou foi revogada. Reconecte esta conta.');
        }
        throw error;
      } finally {
        await db.from('marketplace_connections').update({ refresh_lock_owner: null, refresh_lock_until: null })
          .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('refresh_lock_owner', owner);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    connection = await loadConnection(db, connection.empresa_id, connection.id);
  }
  throw new MarketplaceError(409, 'refresh_busy', 'A conexão está sendo renovada. Aguarde alguns segundos.');
}

export async function mlRequest(db: SupabaseClient, connection: SellerConnection, path: string, method = 'GET', body?: unknown): Promise<unknown> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  let token = await accessToken(db, connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://api.mercadolibre.com${path}`, { method, cache: 'no-store', signal: AbortSignal.timeout(8_000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch {
      throw new MarketplaceError(503, method === 'GET' ? 'provider_unavailable' : 'mutation_uncertain', method === 'GET' ? 'Mercado Livre indisponível. Tente novamente.' : 'A resposta do Mercado Livre não chegou. Atualize a lista antes de repetir a ação.');
    }
    if (response.status === 401 && attempt === 0) { token = await accessToken(db, connection, true); continue; }
    if (!response.ok) {
      if (method !== 'GET' && [400, 409].includes(response.status)) {
        const problem = objectValue(await response.json().catch(() => null));
        const fields: Record<string, string> = {};
        const names: Record<string, string> = { title: 'title', price: 'price', available_quantity: 'stock', plain_text: 'description' };
        const labels: Record<string, string> = { title: 'título', price: 'preço', stock: 'estoque', description: 'descrição' };
        for (const cause of (Array.isArray(problem.cause) ? problem.cause : [])) {
          const references = objectValue(cause).references;
          for (const reference of (Array.isArray(references) ? references : [])) {
            if (typeof reference !== 'string') continue;
            const field = names[reference.replace(/^(item|body)\./, '').split('[')[0]];
            if (field) fields[field] = `O Mercado Livre recusou este ${labels[field] === 'descrição' ? 'campo de descrição' : labels[field]}. Confira as regras e o valor informado.`;
          }
        }
        // Não repassar mensagens arbitrárias do provedor, tokens ou outros campos.
        if (Object.keys(fields).length) throw new MarketplaceError(400, 'invalid_fields', 'Revise os campos indicados pelo Mercado Livre.', fields);
      }
      throw new MarketplaceError(response.status === 429 ? 429 : 409, `provider_${response.status}`,
        response.status === 403 ? 'O Mercado Livre negou o acesso. Verifique as permissões do aplicativo e da conta.' : response.status === 429 ? 'Limite de consultas do Mercado Livre. Aguarde antes de tentar novamente.' : 'O Mercado Livre recusou a operação. Atualize os dados e confira o anúncio na plataforma.');
    }
    return await response.json().catch(() => { throw new MarketplaceError(503, method === 'GET' ? 'invalid_response' : 'mutation_uncertain', 'Resposta incompleta. Atualize a lista antes de repetir.'); });
  }
  throw new MarketplaceError(409, 'reconnect', 'Reconecte a conta do Mercado Livre.');
}

async function estimates(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>) {
  const warnings: string[] = [];
  let fee: unknown, percent: unknown, freight: unknown;
  const shipping = objectValue(item.shipping);
  const query = new URLSearchParams({ price: String(item.price), listing_type_id: String(item.listing_type_id) });
  if (item.catalog_product_id) query.set('catalog_product_id', String(item.catalog_product_id));
  else query.set('category_id', String(item.category_id));
  if (shipping.mode) query.set('shipping_mode', String(shipping.mode));
  if (shipping.logistic_type) query.set('logistic_type', String(shipping.logistic_type));
  try {
    const data = await mlRequest(db, connection, `/sites/MLB/listing_prices?${query}`);
    const rows = Array.isArray(data) ? data : [data];
    const row = rows.map(objectValue).find((row) => row.listing_type_id === item.listing_type_id);
    fee = row?.sale_fee_amount; percent = objectValue(row?.sale_fee_details).percentage_fee ?? objectValue(row?.sale_fee_details).percent;
    if (fee == null) warnings.push('Taxa estimada indisponível.');
  } catch { warnings.push('Não foi possível obter a taxa estimada.'); }
  if (['active', 'paused'].includes(String(item.status)) && shipping.mode === 'me2' && typeof shipping.free_shipping === 'boolean') {
    try {
      const data = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/shipping_options/free?${new URLSearchParams({ item_id: String(item.id), free_shipping: shipping.free_shipping ? 'True' : 'False' })}`));
      const coverage = objectValue(objectValue(data.coverage).all_country);
      if (coverage.currency_id === 'BRL') freight = coverage.list_cost;
      if (freight == null) warnings.push('Frete estimado do vendedor indisponível.');
    } catch { warnings.push('Não foi possível estimar o frete do vendedor.'); }
  }
  return { fee, percent, freight, warnings };
}

export async function saveListing(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>, includeEstimates = true) {
  const snapshot = normalizeListing(item, connection.seller_reference, includeEstimates ? await estimates(db, connection, item) : {});
  const { error } = await db.from('marketplace_listings').upsert({ empresa_id: connection.empresa_id, connection_id: connection.id,
    provider: 'mercado_livre', provider_listing_id: snapshot.id, title: snapshot.title,
    search_text: normalizarTexto([snapshot.title, snapshot.id, snapshot.ean, snapshot.sku].filter(Boolean).join(' ')),
    status: snapshot.substatus.includes('deleted') ? 'deleted' : snapshot.status, snapshot, synced_at: snapshot.syncedAt }, { onConflict: 'connection_id,provider_listing_id' });
  if (error) throw new MarketplaceError(503, 'database', 'Os dados chegaram, mas não foram salvos. Atualize novamente.');
  return snapshot;
}

// Usar imediatamente após o sucesso de uma futura chamada de publicação.
export async function recordPublishedListing(db: SupabaseClient, connection: SellerConnection, id: string) {
  if (!listingIdIsValid(id)) throw new MarketplaceError(400, 'invalid_item', 'Identificador de anúncio inválido.');
  return saveListing(db, connection, objectValue(await mlRequest(db, connection, `/items/${id}`)));
}

export async function synchronizeListings(db: SupabaseClient, connection: SellerConnection) {
  const owner = randomUUID();
  const now = new Date().toISOString();
  const { data: locked, error } = await db.from('marketplace_connections').update({ sync_lock_owner: owner, sync_lock_until: new Date(Date.now() + 90_000).toISOString() })
    .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected')
    .or(`sync_lock_until.is.null,sync_lock_until.lt.${now}`).select('*').maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível iniciar a sincronização.');
  if (!locked) throw new MarketplaceError(409, 'sync_busy', 'Esta conta já está sendo sincronizada. Aguarde alguns segundos.');
  try {
    connection = locked as SellerConnection;
    if (!connection.seller_name) {
      try {
        const identity = objectValue(await mlRequest(db, connection, '/users/me'));
        if (String(identity.id) === connection.seller_reference && typeof identity.nickname === 'string') {
          await db.from('marketplace_connections').update({ seller_name: identity.nickname.slice(0, 160) }).eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected').eq('sync_lock_owner', owner);
        }
      } catch { /* Metadado opcional; sempre exibir seller_reference confirmado. */ }
    }
    let pending = connection.sync_pending_ids || [];
    if (connection.sync_phase !== 'enrich') {
      const continuing = !connection.sync_scan_in_flight && connection.sync_cursor && connection.sync_cursor_at && Date.now() - new Date(connection.sync_cursor_at).getTime() < 4 * 60_000;
      const query = new URLSearchParams({ search_type: 'scan', limit: '100' });
      if (continuing) query.set('scroll_id', connection.sync_cursor!);
      // Scan é stateful: resposta perdida pode ter consumido a página. Marcador durável força reinício seguro.
      const { data: marked, error: markerError } = await db.from('marketplace_connections').update({ sync_scan_in_flight: true })
        .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected').eq('sync_lock_owner', owner).select('id').maybeSingle();
      if (markerError || !marked) throw new MarketplaceError(503, 'database', 'Não foi possível registrar a etapa de sincronização.');
      const found = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/items/search?${query}`));
      if (found.results !== null && !Array.isArray(found.results)) throw new MarketplaceError(503, 'invalid_response', 'A lista do Mercado Livre está incompleta.');
      const ids = (found.results || []) as unknown[];
      if (!ids.every(listingIdIsValid)) throw new MarketplaceError(503, 'invalid_response', 'O Mercado Livre retornou identificadores inválidos.');
      pending = [...new Set([...(continuing ? pending : []), ...ids])];
      const cursor = typeof found.scroll_id === 'string' ? found.scroll_id : continuing ? connection.sync_cursor : null;
      if (ids.length && !cursor) throw new MarketplaceError(503, 'invalid_cursor', 'O Mercado Livre não retornou o cursor de sincronização.');
      // Primeiro enumerar IDs rapidamente; cotação de frete/taxa não consome o TTL de 5 min do scan.
      const { data: saved, error: progressError } = await db.from('marketplace_connections').update({
        sync_scan_in_flight: false, sync_pending_ids: pending, sync_phase: ids.length ? 'scan' : 'enrich', sync_cursor: ids.length ? cursor : null,
        sync_cursor_at: ids.length ? continuing ? connection.sync_cursor_at : now : null, last_checked_at: now,
      }).eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected').eq('sync_lock_owner', owner).select('id').maybeSingle();
      if (progressError || !saved) throw new MarketplaceError(503, 'database', 'Não foi possível salvar o progresso da sincronização.');
      return { count: 0, complete: false, phase: 'scan', discovered: pending.length };
    }
    const ids = pending.slice(0, 10);
    let count = 0;
    if (ids.length) {
      // Contrato novo /items/bulk; não depender de /items?ids que será descontinuado.
      const bulk = await mlRequest(db, connection, `/items/bulk?ids=${ids.join(',')}`);
      if (!Array.isArray(bulk) || bulk.length !== ids.length || new Set(bulk.map((entry) => objectValue(objectValue(entry).body).id)).size !== ids.length) throw new MarketplaceError(503, 'invalid_response', 'Consulta de anúncios incompleta.');
      await Promise.all(bulk.map(async (entry) => {
        const envelope = objectValue(entry);
        const item = objectValue(envelope.body);
        if ((envelope.status_code ?? envelope.code) !== 200 || !listingIdIsValid(item.id) || !ids.includes(item.id)) throw new MarketplaceError(503, 'bulk_incomplete', 'Não foi possível consultar todos os anúncios. Tente sincronizar novamente.');
        await saveListing(db, connection, item);
        count++;
      }));
    }
    pending = pending.slice(ids.length);
    const complete = pending.length === 0;
    const { data: saved, error: progressError } = await db.from('marketplace_connections').update({ sync_phase: complete ? 'scan' : 'enrich', sync_pending_ids: pending,
      ...(complete ? { last_synced_at: new Date().toISOString() } : {}), last_checked_at: new Date().toISOString() })
      .eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('status', 'connected').eq('sync_lock_owner', owner).select('id').maybeSingle();
    if (progressError || !saved) throw new MarketplaceError(503, 'database', 'Não foi possível salvar o progresso da sincronização.');
    return { count, complete, phase: 'enrich' };
  } finally {
    await db.from('marketplace_connections').update({ sync_lock_owner: null, sync_lock_until: null }).eq('id', connection.id).eq('empresa_id', connection.empresa_id).eq('sync_lock_owner', owner);
  }
}

export async function manageListing(db: SupabaseClient, connection: SellerConnection, actor: string, input: { id: unknown; action: unknown; requestKey: unknown; confirmation: unknown }) {
  if (!listingIdIsValid(input.id) || !uuidIsValid(input.requestKey) || !['pause', 'resume', 'close', 'delete'].includes(String(input.action)) || input.confirmation !== input.id)
    throw new MarketplaceError(400, 'invalid_action', 'Confirmação ou ação inválida.');
  const item = objectValue(await mlRequest(db, connection, `/items/${input.id}`));
  const current = normalizeListing(item, connection.seller_reference);
  let body;
  try { body = actionBody(input.action as ListingAction, current.status, current.substatus); }
  catch (error) { throw new MarketplaceError(409, 'invalid_state', error instanceof Error ? error.message : 'Ação não permitida.'); }
  const { data: event, error } = await db.from('marketplace_listing_actions').insert({ empresa_id: connection.empresa_id,
    connection_id: connection.id, provider_listing_id: input.id, action: input.action, request_key: input.requestKey, actor_id: actor }).select('id').single();
  if (error) throw new MarketplaceError(error.code === '23505' ? 409 : 503, error.code === '23505' ? 'duplicate_action' : 'database', 'A ação não foi reenviada. Atualize a lista antes de tentar novamente.');
  let providerSucceeded = false;
  try {
    await mlRequest(db, connection, `/items/${input.id}`, 'PUT', body);
    providerSucceeded = true;
    await recordPublishedListing(db, connection, input.id);
    const { error: eventError } = await db.from('marketplace_listing_actions').update({ status: 'succeeded' }).eq('id', event.id).eq('empresa_id', connection.empresa_id);
    if (eventError) throw new Error('Audit persistence failed');
    return { success: true };
  } catch (error) {
    const uncertain = providerSucceeded || (error instanceof MarketplaceError && error.code === 'mutation_uncertain');
    await db.from('marketplace_listing_actions').update({ status: uncertain ? 'uncertain' : 'failed', error_code: error instanceof MarketplaceError ? error.code : 'persistence' }).eq('id', event.id).eq('empresa_id', connection.empresa_id);
    if (uncertain) throw new MarketplaceError(409, 'mutation_uncertain', 'A operação pode ter sido aplicada. Atualize ou confira no Mercado Livre antes de repetir.');
    if (error instanceof MarketplaceError) throw error;
    throw new MarketplaceError(409, 'invalid_state', 'A ação não é permitida para a situação atual.');
  }
}
