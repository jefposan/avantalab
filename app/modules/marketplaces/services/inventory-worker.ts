import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { loadConnection, mlRequest, saveListing, type SellerConnection } from './mercadolivre-management';
import { processSaleNotifications } from './mercadolivre-sales';
import { listingStockPolicy } from './inventory-model';
import { objectValue } from './listing-model';
import { stockModelFromResponse } from './mercadolivre-edit-policy';

type StockJob = { link_id: string; empresa_id: string; product_id: string; desired_quantity: number; revision: number; generation: string; allow_increase: boolean; attempts: number };
const failureCode = (error: unknown) => error instanceof MarketplaceError ? error.code : 'processing';
function assertDatabase(error: unknown) { if (error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível registrar a sincronização do estoque.'); }

/** Nunca confirma sucesso só pelo PUT: relê o anúncio e verifica o saldo. */
export async function deliverStockJob(db: SupabaseClient, job: StockJob, deadline = Infinity) {
  const { data: product, error: productError } = await db.from('marketplace_products').select('stock_quantity,revision').eq('empresa_id', job.empresa_id).eq('id', job.product_id).is('archived_at', null).maybeSingle();
  assertDatabase(productError);
  if (!product || product.stock_quantity !== job.desired_quantity) return;
  const { data: link, error: linkError } = await db.from('marketplace_product_links').select('*').eq('empresa_id', job.empresa_id).eq('product_id', job.product_id).eq('id', job.link_id).maybeSingle();
  assertDatabase(linkError);
  if (!link) return;
  let outcome = 'pending', issue: string | null = null;
  try {
    if (link.provider !== 'mercado_livre') throw new MarketplaceError(409, 'provider_not_supported', 'Esta plataforma ainda precisa do conector de estoque.');
    const connection = await loadConnection(db, job.empresa_id, link.connection_id);
    const item = objectValue(await mlRequest(db, connection, `/items/${link.provider_listing_id}`));
    if (item.id !== link.provider_listing_id || String(item.seller_id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_listing', 'O anúncio não foi confirmado nesta conta.');
    const seller = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}`));
    if (String(seller.id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_seller', 'Conta não confirmada.');
    if (item.user_product_id != null) {
      if (typeof item.user_product_id !== 'string' || !/^MLB[A-Z]?\d+$/.test(item.user_product_id)) throw new MarketplaceError(409, 'unknown_stock_model', 'Modelo de estoque não confirmado.');
      const stock = await mlRequest(db, connection, `/user-products/${item.user_product_id}/stock`);
      if (stockModelFromResponse(stock, connection.seller_reference) !== 'single') throw new MarketplaceError(409, 'warehouse', 'Estoque por depósito precisa de vínculo específico.');
      const associated = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/items/search?${new URLSearchParams({ user_product_id: item.user_product_id, limit: '100' })}`));
      const paging = objectValue(associated.paging);
      if (!Array.isArray(associated.results) || typeof paging.total !== 'number' || paging.total !== associated.results.length || !associated.results.includes(item.id)) throw new MarketplaceError(409, 'user_product_not_unified', 'Os anúncios do estoque compartilhado não foram confirmados.');
      const related = await db.from('marketplace_product_links').select('provider_listing_id,product_id').eq('empresa_id', job.empresa_id).eq('connection_id', link.connection_id).in('provider_listing_id', associated.results);
      assertDatabase(related.error);
      if (related.data?.length !== associated.results.length || related.data.some(row => row.product_id !== job.product_id)) throw new MarketplaceError(409, 'user_product_not_unified', 'Vincule todos os anúncios deste produto do Mercado Livre ao mesmo cadastro local.');
    }
    const policy = listingStockPolicy(item, seller.tags, job.desired_quantity, job.allow_increase);
    if (policy === 'inactive') outcome = 'excluded';
    else if (policy === 'equal') { await saveListing(db, connection, item, false); outcome = 'synced'; }
    else if (policy !== 'write') issue = policy;
    else {
      // Não aumentar enquanto há avisos de venda por processar nesta empresa.
      const queued = await db.from('marketplace_sale_notifications').select('id', { count: 'exact', head: true }).eq('empresa_id', job.empresa_id).is('processed_at', null);
      assertDatabase(queued.error);
      const pending = await db.from('marketplace_inventory_events').select('id', { count: 'exact', head: true }).eq('empresa_id', job.empresa_id).eq('state', 'pending');
      assertDatabase(pending.error);
      if ((item.available_quantity as number) < job.desired_quantity && (queued.count || pending.count)) throw new MarketplaceError(409, 'pending_sales', 'Existem vendas pendentes de conferência.');
      // A revisão pode ter mudado durante as consultas. Jamais enviar um saldo antigo.
      const latest = await db.from('marketplace_products').select('stock_quantity,revision').eq('empresa_id', job.empresa_id).eq('id', job.product_id).maybeSingle();
      assertDatabase(latest.error);
      if (!latest.data || latest.data.stock_quantity !== job.desired_quantity || latest.data.revision !== product.revision) throw new MarketplaceError(409, 'stock_changed', 'O estoque foi atualizado durante a conferência.');
      if (Date.now() > deadline - 16_000) throw new MarketplaceError(409, 'worker_time_limit', 'A atualização continuará na próxima tentativa.');
      await mlRequest(db, connection, `/items/${link.provider_listing_id}`, 'PUT', { available_quantity: job.desired_quantity });
      const verified = objectValue(await mlRequest(db, connection, `/items/${link.provider_listing_id}`));
      if (verified.id !== link.provider_listing_id || String(verified.seller_id) !== connection.seller_reference || verified.available_quantity !== job.desired_quantity) throw new MarketplaceError(409, 'stock_not_confirmed', 'O Mercado Livre ainda não confirmou o saldo enviado.');
      await saveListing(db, connection, verified, false);
      const refreshed = await db.from('marketplace_product_links').update({ reported_stock: job.desired_quantity, status: verified.status, updated_at: new Date().toISOString() }).eq('id', link.id).eq('empresa_id', job.empresa_id).eq('product_id', job.product_id);
      assertDatabase(refreshed.error); outcome = 'synced';
    }
  } catch (error) { issue = failureCode(error); }
  // Uma nova baixa pode ter substituído o job. Não apagar a pendência mais recente.
  const result = await db.from('marketplace_inventory_outbox').update({ state: outcome, issue, attempts: job.attempts + 1,
    next_attempt_at: new Date(Date.now() + Math.min(15, 2 ** Math.min(job.attempts, 4)) * 60_000).toISOString(),
    synced_at: outcome === 'synced' ? new Date().toISOString() : null,
  }).eq('link_id', job.link_id).eq('empresa_id', job.empresa_id).eq('product_id', job.product_id).eq('revision', job.revision).eq('generation', job.generation);
  assertDatabase(result.error);
}

/** Varredura paginada com janela fixa e sobreposição de uma hora (precisão dos filtros ML). */
export async function reconcileOrders(db: SupabaseClient, connection: SellerConnection, activatedAt: string) {
  const { data: existing, error } = await db.from('marketplace_inventory_reconciliation').select('*').eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).maybeSingle();
  assertDatabase(error);
  const checkpoint = existing?.checkpoint || activatedAt, end = existing?.window_end || new Date().toISOString(), offset = existing?.scan_offset || 0;
  const query = new URLSearchParams({ seller: connection.seller_reference, 'order.date_last_updated.from': new Date(new Date(checkpoint).getTime() - 3_600_000).toISOString(),
    'order.date_last_updated.to': new Date(Math.ceil(new Date(end).getTime() / 3_600_000) * 3_600_000).toISOString(), offset: String(offset), limit: '50', sort: 'date_asc' });
  const response = objectValue(await mlRequest(db, connection, `/orders/search?${query}`));
  const paging = objectValue(response.paging);
  if (!Array.isArray(response.results) || typeof paging.total !== 'number' || !Number.isSafeInteger(paging.total) || paging.total < 0 || response.results.length > 50) throw new MarketplaceError(503, 'invalid_orders_page', 'Consulta incompleta de vendas.');
  for (const raw of response.results) {
    const order = objectValue(raw), id = String(order.id);
    if (!/^\d{1,24}$/.test(id) || String(objectValue(order.seller).id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_order', 'A conta do pedido não foi confirmada.');
    // O payload público nunca é confiado para baixar estoque: o processador relê /orders/id.
    const stamp = typeof order.last_updated === 'string' ? order.last_updated : end;
    const queued = await db.from('marketplace_sale_notifications').upsert({ id: `reconcile:${connection.id}:${id}:${stamp}`, empresa_id: connection.empresa_id,
      connection_id: connection.id, provider: 'mercado_livre', topic: 'orders_v2', resource: `/orders/${id}` }, { onConflict: 'id', ignoreDuplicates: true });
    assertDatabase(queued.error);
  }
  if (!response.results.length && offset < paging.total) throw new MarketplaceError(503, 'invalid_orders_page', 'A consulta de vendas ficou incompleta.');
  const more = offset + response.results.length < paging.total;
  const saved = await db.from('marketplace_inventory_reconciliation').upsert({ connection_id: connection.id, empresa_id: connection.empresa_id,
    checkpoint: more ? checkpoint : end, window_end: more ? end : null, scan_offset: more ? offset + response.results.length : 0, checked_at: new Date().toISOString(), issue: null });
  assertDatabase(saved.error);
}

export async function runMarketplaceWorker(db: SupabaseClient) {
  // Falta de configuração local não pode expirar as conexões reais nem escrever no ML.
  if (!process.env.MARKETPLACE_SECRETS_KEY || !process.env.MERCADOLIVRE_CLIENT_ID || !process.env.MERCADOLIVRE_CLIENT_SECRET) return { configured: false };
  const owner = randomUUID(), claimed = await db.rpc('marketplace_worker_claim', { p_owner: owner });
  assertDatabase(claimed.error); if (!claimed.data) return { busy: true };
  const deadline = Date.now() + 40_000;
  let issue: string | null = null;
  try {
    const settings = await db.from('marketplace_inventory_settings').select('empresa_id,activated_at').eq('enabled', true);
    assertDatabase(settings.error);
    const companies = (settings.data || []).map(row => row.empresa_id);
    if (!companies.length) return { ok: true };
    const modules = await db.from('empresa_modulos').select('empresa_id,expira_em').in('empresa_id', companies).eq('modulo_id', 'marketplaces').eq('ativo', true);
    assertDatabase(modules.error);
    const enabled = (modules.data || []).filter(row => !row.expira_em || new Date(row.expira_em).getTime() > Date.now()).map(row => row.empresa_id);
    if (!enabled.length) return { ok: true };
    const worker = await db.from('marketplace_inventory_worker').select('turn').eq('id', 1).maybeSingle();
    assertDatabase(worker.error);
    const turn = Number(worker.data?.turn || 0) % 3;
    let delivered = false;
    const deliver = async () => {
      if (delivered || Date.now() > deadline - 30_000) return;
      const jobs = await db.from('marketplace_inventory_outbox').select('*').in('empresa_id', enabled).eq('state', 'pending').lte('next_attempt_at', new Date().toISOString()).order('next_attempt_at').limit(3);
      assertDatabase(jobs.error);
      for (const job of jobs.data || []) {
        if (Date.now() > deadline - 25_000) break;
        delivered = true; await deliverStockJob(db, job, deadline);
      }
    };
    const reconcile = async () => {
      if (Date.now() > deadline - 8_000) return;
      const connections = await db.from('marketplace_connections').select('id,empresa_id').in('empresa_id', enabled).eq('provider', 'mercado_livre').eq('status', 'connected');
      assertDatabase(connections.error);
      const cursors = await db.from('marketplace_inventory_reconciliation').select('connection_id,checked_at').in('empresa_id', enabled);
      assertDatabase(cursors.error);
      const checked = new Map((cursors.data || []).map(row => [row.connection_id, row.checked_at || '']));
      const candidate = (connections.data || []).sort((a, b) => String(checked.get(a.id) || '').localeCompare(String(checked.get(b.id) || '')))[0];
      if (!candidate) return;
      try { await reconcileOrders(db, await loadConnection(db, candidate.empresa_id, candidate.id), settings.data!.find(row => row.empresa_id === candidate.empresa_id)!.activated_at); }
      catch (error) {
        issue = failureCode(error);
        const current = await db.from('marketplace_inventory_reconciliation').select('checkpoint').eq('connection_id', candidate.id).maybeSingle();
        assertDatabase(current.error);
        const saved = await db.from('marketplace_inventory_reconciliation').upsert({ connection_id: candidate.id, empresa_id: candidate.empresa_id,
          checkpoint: current.data?.checkpoint || settings.data!.find(row => row.empresa_id === candidate.empresa_id)!.activated_at, checked_at: new Date().toISOString(), issue }, { onConflict: 'connection_id' });
        assertDatabase(saved.error);
      }
    };
    // Alterna a prioridade: fila de vendas não pode impedir indefinidamente envio de estoque/varredura.
    if (turn === 0) await deliver();
    if (turn === 2) await reconcile();
    const queued = await db.from('marketplace_sale_notifications').select('empresa_id,connection_id').in('empresa_id', enabled).is('processed_at', null).lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(100);
    assertDatabase(queued.error);
    for (const row of [...new Map((queued.data || []).map(row => [row.connection_id, row])).values()]) {
      if (Date.now() > deadline - 16_000) break;
      try { await processSaleNotifications(db, await loadConnection(db, row.empresa_id, row.connection_id), 3, deadline - 16_000); } catch (error) { issue = failureCode(error); }
    }
    const pending = await db.from('marketplace_inventory_events').select('id').in('empresa_id', enabled).eq('state', 'pending').order('updated_at').limit(20);
    assertDatabase(pending.error);
    for (const event of pending.data || []) { const applied = await db.rpc('marketplace_apply_inventory_event', { p_id: event.id }); assertDatabase(applied.error); }
    await deliver();
    if (turn !== 2) await reconcile();
    return { ok: !issue };
  } catch (error) { issue = failureCode(error); throw error; }
  finally {
    const released = await db.from('marketplace_inventory_worker').update({ lease_owner: null, lease_until: null, finished_at: new Date().toISOString(), issue }).eq('id', 1).eq('lease_owner', owner);
    assertDatabase(released.error);
  }
}
