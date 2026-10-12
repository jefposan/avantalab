import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { mlRequest, type SellerConnection } from './mercadolivre-management';
import { objectValue } from './listing-model';

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;
const pageError = () => new MarketplaceError(503, 'invalid_orders_page', 'Não foi possível conferir todas as vendas. A consulta será retomada.');
function databaseError(error: unknown) {
  if (error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível salvar a consulta das vendas anteriores.');
}

/** Busca recorrente e histórica incluem canceladas, sem pular páginas ou contas. */
export async function readOrderSearchPages(db: SupabaseClient, connection: SellerConnection, query: URLSearchParams) {
  const offset = Number(query.get('offset') || '0');
  if (!Number.isSafeInteger(offset) || offset < 0 || query.get('seller') !== connection.seller_reference) throw pageError();
  // A busca padrão do vendedor pode omitir canceladas.
  const cancelledQuery = new URLSearchParams(query); cancelledQuery.set('order.status', 'cancelled');
  const pages = (await Promise.all([query, cancelledQuery].map(params => mlRequest(db, connection, `/orders/search?${params}`)))).map(raw => {
    const response = objectValue(raw), paging = objectValue(response.paging);
    if (!Array.isArray(response.results) || !Number.isSafeInteger(paging.total) || (paging.total as number) < 0 || response.results.length > 50
      || (!response.results.length && offset < (paging.total as number))) throw pageError();
    return { orders: response.results.map(objectValue), total: paging.total as number };
  });
  for (const order of pages.flatMap(page => page.orders)) {
    if (!/^\d{1,24}$/.test(String(order.id)) || String(objectValue(order.seller).id) !== connection.seller_reference)
      throw new MarketplaceError(503, 'invalid_order', 'A conta do pedido não foi confirmada.');
  }
  const orders = [...new Map(pages.flatMap(page => page.orders).map(order => [String(order.id), order])).values()];
  const continuing = pages.filter(page => offset + page.orders.length < page.total);
  const more = continuing.length > 0;
  // Sobrepor a página maior em vez de pular a menor, caso ML retorne páginas parciais.
  const nextOffset = more ? offset + Math.min(...continuing.map(page => page.orders.length)) : 0;
  return { orders, more, nextOffset };
}

/** Histórico tem cursor próprio: nunca recua a varredura das movimentações novas. */
export async function reconcileSalesHistory(db: SupabaseClient, connection: SellerConnection, activatedAt: string) {
  const { data: saved, error } = await db.from('marketplace_inventory_reconciliation').select('*')
    .eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).maybeSingle();
  databaseError(error);
  if (saved?.history_completed_at) return { complete: true, count: 0 };
  // Rollout seguro: a versão anterior continua funcionando antes desta migração.
  if (saved && !Object.hasOwn(saved, 'history_scan_offset')) {
    throw new MarketplaceError(503, 'sales_history_setup', 'A recuperação das vendas anteriores precisa ser ativada no banco.');
  }
  const now = new Date();
  const started = saved?.history_started_at || now.toISOString();
  // ML mantém pedidos por até 12 meses. Um dia de margem evita exceder o limite.
  const earliest = new Date(now); earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);
  const cutoff = Math.ceil((earliest.getTime() + 24 * HOUR) / HOUR) * HOUR;
  const end = saved?.history_window_end || new Date(Math.ceil(new Date(activatedAt).getTime() / HOUR) * HOUR).toISOString();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(endTime) || endTime > now.getTime() + HOUR) throw pageError();
  const fromTime = Math.max(cutoff, endTime - WEEK);
  const offset = saved?.history_scan_offset || 0;
  if (!Number.isSafeInteger(offset) || offset < 0) throw pageError();
  const progress = { connection_id: connection.id, empresa_id: connection.empresa_id,
    checkpoint: saved?.checkpoint || activatedAt, history_started_at: started, history_checked_at: now.toISOString() };
  if (endTime <= cutoff) {
    const result = await db.from('marketplace_inventory_reconciliation').upsert({ ...progress, history_completed_at: now.toISOString(), history_scan_offset: 0 });
    databaseError(result.error); return { complete: true, count: 0 };
  }
  const query = new URLSearchParams({ seller: connection.seller_reference,
    'order.date_created.from': new Date(fromTime).toISOString(), 'order.date_created.to': end,
    sort: 'date_desc', limit: '50', offset: String(offset) });
  const { orders, more, nextOffset } = await readOrderSearchPages(db, connection, query);
  for (const order of orders) {
    const stamp = typeof order.last_updated === 'string' ? order.last_updated : typeof order.date_last_updated === 'string' ? order.date_last_updated : activatedAt;
    const queued = await db.from('marketplace_sale_notifications').upsert({ id: `history:${connection.id}:${order.id}:${stamp}`,
      empresa_id: connection.empresa_id, connection_id: connection.id, provider: 'mercado_livre', topic: 'orders_v2', resource: `/orders/${order.id}`, priority: 1 },
    { onConflict: 'id', ignoreDuplicates: true });
    databaseError(queued.error);
  }
  const complete = !more && fromTime === cutoff;
  const result = await db.from('marketplace_inventory_reconciliation').upsert({ ...progress,
    history_window_end: more ? end : new Date(fromTime).toISOString(), history_scan_offset: nextOffset,
    history_completed_at: complete ? now.toISOString() : null, issue: null });
  databaseError(result.error);
  return { complete, count: orders.length };
}
