import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizarTexto } from '@/app/lib/formatters';
import { refreshMercadoLivreToken } from './mercadolivre-oauth';
import { openMarketplaceSecret, sealMarketplaceSecret } from './secret-vault';
import { MarketplaceError } from './management-access';
import { mercadoLivreValidationError, isWarningOnlyPrevalidation } from './mercadolivre-validation-error';
import { actionBody, listingIdIsValid, normalizeListing, objectValue, uuidIsValid, type ListingAction } from './listing-model';
import { fiscalProviderProblem, isFiscalPath } from './fiscal-provider-error';

export type ListingTypeFeeEstimate = { fee: number | null; percent: number | null; notice?: string };

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

export async function resolveMercadoLivreConnection(db: SupabaseClient, company: string, requestedId?: unknown) {
  if (requestedId != null && String(requestedId).trim()) return loadConnection(db, company, requestedId);
  const { data, error } = await db.from('marketplace_connections')
    .select('id')
    .eq('empresa_id', company)
    .eq('provider', 'mercado_livre')
    .eq('status', 'connected')
    .not('token_sealed', 'is', null)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar a conexão do Mercado Livre.');
  if (!data?.id) throw new MarketplaceError(409, 'marketplace_not_connected', 'Esta empresa ainda não possui uma conta do Mercado Livre conectada.');
  return loadConnection(db, company, data.id);
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

export async function mlRequest(db: SupabaseClient, connection: SellerConnection, path: string, method = 'GET', body?: unknown, options?: { xml: string }): Promise<unknown> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  let token = await accessToken(db, connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://api.mercadolibre.com${path}`, { method, cache: 'no-store', redirect: isFiscalPath(path) ? 'error' : 'follow', signal: AbortSignal.timeout(8_000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(/^\/shipments\/\d+/.test(path) ? { 'X-Format-New': 'true' } : {}), ...(/^\/users\/\d+\/shipping_modes$/.test(path) && method === 'POST' ? { 'X-Format-New': 'true', 'x-multichannel': 'true' } : {}), ...(options || body ? { 'Content-Type': options ? 'application/xml' : 'application/json' } : {}) },
        ...(options ? { body: options.xml } : body ? { body: JSON.stringify(body) } : {}) });
    } catch {
      throw new MarketplaceError(503, method === 'GET' ? 'provider_unavailable' : 'mutation_uncertain', method === 'GET' ? 'Mercado Livre indisponível. Tente novamente.' : 'A resposta do Mercado Livre não chegou. Atualize a lista antes de repetir a ação.');
    }
    if (response.status === 401 && attempt === 0) { token = await accessToken(db, connection, true); continue; }
    if (!response.ok) {
      if (isFiscalPath(path)) throw fiscalProviderProblem(response.status, await response.json().catch(() => null), response.headers.get('x-request-id') || response.headers.get('x-correlation-id'));
      if (method === 'GET' && response.status === 403 && path.startsWith('/post-purchase/')) {
        const denied = objectValue(await response.json().catch(() => null));
        // Reconhecer apenas código documentado; nunca enviar mensagem/cause brutos.
        if (denied.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') throw new MarketplaceError(403, 'provider_policy_403', 'A política de acesso do Mercado Livre recusou a consulta de pós-venda. Confira as permissões funcionais e a autorização da conta.');
      }
      if (method !== 'GET' && [400, 409, 422].includes(response.status)) {
        const problem = await response.json().catch(() => null);
        const diagnostic = mercadoLivreValidationError(problem, response.status, body);
        if (isWarningOnlyPrevalidation(problem, response.status, path, method)) return { validatedWithWarnings: true, details: diagnostic.details, warningCodes: (objectValue(problem).cause as Array<Record<string, unknown>>).map(cause => cause.code) };
        throw new MarketplaceError(400, 'invalid_fields', diagnostic.message, diagnostic.fields, diagnostic.details);
      }
      throw new MarketplaceError([403, 429].includes(response.status) ? response.status : 409, `provider_${response.status}`,
        response.status === 403 ? 'O Mercado Livre negou este recurso. A conexão segue ativa; confira as permissões funcionais do aplicativo e da conta.' : response.status === 429 ? 'Limite de consultas do Mercado Livre. Aguarde antes de tentar novamente.' : 'O Mercado Livre recusou a operação. Atualize os dados e confira o anúncio na plataforma.');
    }
    if (response.status === 204) return null;
    return await response.json().catch(() => { throw new MarketplaceError(503, method === 'GET' ? 'invalid_response' : 'mutation_uncertain', 'Resposta incompleta. Atualize a lista antes de repetir.'); });
  }
  throw new MarketplaceError(409, 'reconnect', 'Reconecte a conta do Mercado Livre.');
}

/** Busca documentos do Mercado Livre sem expor o token ao navegador. */
/** Upload isolado: não associa a foto a nenhum anúncio antes da confirmação do editor. */
export async function uploadMercadoLivrePicture(db: SupabaseClient, connection: SellerConnection, bytes: Uint8Array, mime: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), mime === 'image/png' ? 'foto.png' : 'foto.jpg');
  let response: Response;
  try { response = await fetch('https://api.mercadolibre.com/pictures/items/upload', { method:'POST', cache:'no-store', signal:AbortSignal.timeout(20_000), headers:{Authorization:`Bearer ${await accessToken(db,connection)}`}, body:form }); }
  catch { throw new MarketplaceError(503,'upload_uncertain','Não foi possível confirmar o envio da foto. Nenhum anúncio foi alterado.'); }
  if(!response.ok)throw new MarketplaceError(response.status===403?403:409,'picture_upload_failed','O Mercado Livre não aceitou a foto. Confira formato, resolução e permissões da conta. Nenhum anúncio foi alterado.');
  return response.json();
}

export async function mlBinaryRequest(db: SupabaseClient, connection: SellerConnection, path: string, format: 'pdf' | 'xml' | 'json' | 'zip' = 'pdf') {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
  let token = await accessToken(db, connection);
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://api.mercadolibre.com${path}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000), headers: { Authorization: `Bearer ${token}`, Accept: format === 'zip' ? 'application/zip' : format === 'pdf' ? 'application/pdf' : format === 'xml' ? 'application/xml' : 'application/json' } });
    } catch { throw new MarketplaceError(503, 'provider_unavailable', 'Mercado Livre indisponível. Tente imprimir novamente.'); }
    if (response.status === 401 && attempt === 0) { token = await accessToken(db, connection, true); continue; }
    if (!response.ok) {
      if (isFiscalPath(path)) throw fiscalProviderProblem(response.status, await response.json().catch(() => null), response.headers.get('x-request-id') || response.headers.get('x-correlation-id'));
      if (response.status === 400) throw new MarketplaceError(409, 'label_unavailable', 'A etiqueta ainda não está disponível para este envio.');
      throw new MarketplaceError([403, 429].includes(response.status) ? response.status : 503, `provider_${response.status}`, 'Não foi possível obter a etiqueta no Mercado Livre.');
    }
    const contentType = response.headers.get('content-type') || '';
    if (format === 'zip' ? !/^(application\/(zip|x-zip-compressed|octet-stream))(;|$)/i.test(contentType) : !contentType.includes(format)) throw new MarketplaceError(503, 'invalid_label', 'O Mercado Livre não devolveu o documento no formato solicitado.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 5 || bytes.length > 15 * 1024 * 1024 || (format === 'pdf' && String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-')) throw new MarketplaceError(503, 'invalid_label', 'O Mercado Livre devolveu um arquivo de documento inválido. Tente novamente.');
    if (format === 'zip' && (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04)) throw new MarketplaceError(503, 'invalid_label', 'O Mercado Livre não devolveu um pacote de etiqueta térmica válido.');
    return bytes;
  }
  throw new MarketplaceError(409, 'reconnect', 'Reconecte esta conta para imprimir a etiqueta.');
}

export async function estimateMercadoLivreListingTypeFee(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>, listingTypeId = String(item.listing_type_id || '')): Promise<ListingTypeFeeEstimate> {
  const warnings: string[] = [];
  const shipping = objectValue(item.shipping);
  const price = typeof item.price === 'number' ? item.price : NaN;
  if (!listingTypeId || !Number.isFinite(price) || price <= 0) return { fee: null, percent: null, notice: 'Preço indisponível para calcular a taxa.' };
  const query = new URLSearchParams({ price: String(price), listing_type_id: listingTypeId });
  if (item.catalog_product_id) query.set('catalog_product_id', String(item.catalog_product_id));
  else query.set('category_id', String(item.category_id));
  if (shipping.mode) query.set('shipping_mode', String(shipping.mode));
  if (shipping.logistic_type) query.set('logistic_type', String(shipping.logistic_type));
  try {
    const data = await mlRequest(db, connection, `/sites/MLB/listing_prices?${query}`);
    const rows = Array.isArray(data) ? data : [data];
    const row = rows.map(objectValue).find((candidate) => candidate.listing_type_id === listingTypeId);
    const fee = typeof row?.sale_fee_amount === 'number' ? row.sale_fee_amount : null;
    const details = objectValue(row?.sale_fee_details);
    const percentage = details.percentage_fee ?? details.percent;
    const percent = typeof percentage === 'number' ? percentage : null;
    return { fee, percent, ...(fee == null ? { notice: 'Taxa estimada indisponível.' } : {}) };
  } catch {
    return { fee: null, percent: null, notice: 'Não foi possível obter a taxa estimada.' };
  }
}

async function estimates(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>) {
  const warnings: string[] = [];
  let freight: unknown;
  const feeEstimate = await estimateMercadoLivreListingTypeFee(db, connection, item);
  if (feeEstimate.notice) warnings.push(feeEstimate.notice);
  const shipping = objectValue(item.shipping);
  if (['active', 'paused'].includes(String(item.status)) && shipping.mode === 'me2' && typeof shipping.free_shipping === 'boolean') {
    try {
      const data = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/shipping_options/free?${new URLSearchParams({ item_id: String(item.id), free_shipping: shipping.free_shipping ? 'True' : 'False' })}`));
      const coverage = objectValue(objectValue(data.coverage).all_country);
      if (coverage.currency_id === 'BRL') freight = coverage.list_cost;
      if (freight == null) warnings.push('Frete estimado do vendedor indisponível.');
    } catch { warnings.push('Não foi possível estimar o frete do vendedor.'); }
  }
  return { fee: feeEstimate.fee, percent: feeEstimate.percent, freight, warnings };
}

export async function saveListing(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>, includeEstimates = true) {
  const snapshot = normalizeListing(item, connection.seller_reference, includeEstimates ? await estimates(db, connection, item) : {});
  if(!includeEstimates){
    const previous=await db.from('marketplace_listings').select('snapshot').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',snapshot.id).maybeSingle();
    if(previous.error)throw new MarketplaceError(503,'database','Não foi possível conferir o retrato anterior do anúncio.');
    const old=objectValue(previous.data?.snapshot);
    if(old.price===snapshot.price&&old.listingType===snapshot.listingType&&JSON.stringify(old.shipping)===JSON.stringify(snapshot.shipping)){
      snapshot.feeEstimate=typeof old.feeEstimate==='number'?old.feeEstimate:null;
      snapshot.feePercent=typeof old.feePercent==='number'?old.feePercent:null;
      snapshot.freightEstimate=typeof old.freightEstimate==='number'?old.freightEstimate:null;
    }
  }
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
  // Mesmo uma ação incompatível precisa corrigir o retrato local já defasado.
  await saveListing(db,connection,item,false);
  let body, resumeQuantity: number | null = null;
  try { body = actionBody(input.action as ListingAction, current.status, current.substatus); }
  catch (error) { throw new MarketplaceError(409, 'invalid_state', error instanceof Error ? error.message : 'Ação não permitida.'); }
  if(input.action==='resume'){
    const linked=await db.from('marketplace_product_links').select('product_id').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',input.id).maybeSingle();
    if(linked.error)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir o saldo Online.');
    if(linked.data){
      const local=await db.from('marketplace_products').select('stock_quantity,listing_stock_review_at').eq('empresa_id',connection.empresa_id).eq('id',linked.data.product_id).is('archived_at',null).maybeSingle();
      if(local.error)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir o saldo Online.');
      if(local.data?.listing_stock_review_at)throw new MarketplaceError(409,'import_stock_review','Confirme a quantidade física Online antes de reativar este anúncio.');
      if(typeof local.data?.stock_quantity!=='number'||local.data.stock_quantity<=0)throw new MarketplaceError(409,'insufficient_stock','Sem estoque Online disponível para reativar este anúncio.');
      // A reativação só pode tornar o anúncio comprável depois de o saldo atual
      // ter sido aceito e relido. Nunca reabre com a quantidade antiga remota.
      resumeQuantity=local.data.stock_quantity;
    }
  }
  const { data: event, error } = await db.from('marketplace_listing_actions').insert({ empresa_id: connection.empresa_id,
    connection_id: connection.id, provider_listing_id: input.id, action: input.action, request_key: input.requestKey, actor_id: actor }).select('id').single();
  if (error) throw new MarketplaceError(error.code === '23505' ? 409 : 503, error.code === '23505' ? 'duplicate_action' : 'database', 'A ação não foi reenviada. Atualize a lista antes de tentar novamente.');
  let providerSucceeded = false;
  try {
    if (resumeQuantity != null) {
      await mlRequest(db, connection, `/items/${input.id}`, 'PUT', { available_quantity: resumeQuantity });
      providerSucceeded = true;
      const quantityObserved=objectValue(await mlRequest(db, connection, `/items/${input.id}`));
      if(quantityObserved.id!==input.id||String(quantityObserved.seller_id)!==connection.seller_reference||quantityObserved.available_quantity!==resumeQuantity)
        throw new MarketplaceError(409,'remote_stock_unconfirmed','O Mercado Livre ainda não confirmou o saldo antes da reativação.');
    }
    await mlRequest(db, connection, `/items/${input.id}`, 'PUT', body);
    providerSucceeded = true;
    const updated=await recordPublishedListing(db, connection, input.id);
    const observedStatus=updated.substatus.includes('deleted')?'deleted':updated.status;
    const observation=await db.rpc('marketplace_observe_listing',{p_empresa:connection.empresa_id,p_connection:connection.id,p_listing:updated.id,p_quantity:updated.stock,p_status:observedStatus});
    if(observation.error)throw new Error('Listing link persistence failed');
    const expected=({pause:'paused',resume:'active',close:'closed',delete:'deleted'} as Record<string,string>)[String(input.action)];
    const pending=observedStatus!==expected;
    const { error: eventError } = await db.from('marketplace_listing_actions').update({ status: pending?'uncertain':'succeeded',error_code:pending?'remote_status_unconfirmed':null }).eq('id', event.id).eq('empresa_id', connection.empresa_id);
    if (eventError) throw new Error('Audit persistence failed');
    return { success: !pending,pending };
  } catch (error) {
    const uncertain = providerSucceeded || (error instanceof MarketplaceError && error.code === 'mutation_uncertain');
    await db.from('marketplace_listing_actions').update({ status: uncertain ? 'uncertain' : 'failed', error_code: error instanceof MarketplaceError ? error.code : 'persistence' }).eq('id', event.id).eq('empresa_id', connection.empresa_id);
    if (uncertain) throw new MarketplaceError(409, 'mutation_uncertain', 'A operação pode ter sido aplicada. Atualize ou confira no Mercado Livre antes de repetir.');
    if (error instanceof MarketplaceError) throw error;
    throw new MarketplaceError(409, 'invalid_state', 'A ação não é permitida para a situação atual.');
  }
}
