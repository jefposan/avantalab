import 'server-only';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { magaluRequest, loadMagaluConnection, type MagaluConnection } from './magalu-request';
import { magaluCode, magaluPage, normalizeMagaluOrder } from '../magalu-sales-model';
import { objectValue, uuidIsValid } from './listing-model';
import { publicSale } from './mercadolivre-sales';
import { readMagaluPostSale } from './magalu-post-sale';

export async function saveMagaluOrder(db: SupabaseClient, connection: MagaluConnection, value: unknown) {
  let snapshot;
  try { snapshot = normalizeMagaluOrder(value, connection.seller_reference); }
  catch { throw new MarketplaceError(503, 'magalu_order', 'O Magalu não confirmou os dados e a conta deste pedido.'); }
  const previous = await db.from('marketplace_sales').select('id,updated_at,snapshot').eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('provider', 'magalu').eq('provider_order_id', snapshot.orderId).maybeSingle();
  if (previous.error) throw new MarketplaceError(503, 'database', 'Não foi possível conferir a venda Magalu salva.');
  const current = objectValue(previous.data?.snapshot);
  if (current.providerUpdatedAt && Date.parse(String(current.providerUpdatedAt)) > Date.parse(snapshot.providerUpdatedAt)) return;
  const postSaleProgress = current.postSaleProgress ? current.providerUpdatedAt === snapshot.providerUpdatedAt ? current.postSaleProgress
    : { ...objectValue(current.postSaleProgress), state: 'unknown' } : null;
  const nextSnapshot = { ...snapshot, ...(postSaleProgress ? { postSaleProgress } : {}) };
  if (isDeepStrictEqual(current, nextSnapshot)) return;
  const data = { empresa_id: connection.empresa_id, connection_id: connection.id, provider: 'magalu', provider_order_id: snapshot.orderId,
    status: snapshot.status, shipment_id: snapshot.shipmentId, shipment_status: snapshot.shipmentStatus, shipment_substatus: snapshot.shipmentSubstatus, label_status: 'unavailable',
    snapshot: nextSnapshot, operation_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const saved = previous.data
    ? await db.from('marketplace_sales').update(data).eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('provider', 'magalu').eq('id', previous.data.id).eq('updated_at', previous.data.updated_at).select('id').maybeSingle()
    : await db.from('marketplace_sales').upsert(data, { onConflict: 'connection_id,provider_order_id', ignoreDuplicates: true }).select('id').maybeSingle();
  if (saved.error) throw new MarketplaceError(503, 'magalu_database', 'Não foi possível salvar vendas Magalu. Confira a migração desta integração no banco.');
  if (!saved.data) throw new MarketplaceError(409, 'sale_changed', 'Outra atualização do pedido chegou. A consulta continuará sem pular vendas.');
}

/** Uma página por conta/consulta, cursor persistente e janela fixa, incluindo canceladas. */
export async function syncMagaluSales(db: SupabaseClient, connection: MagaluConnection, deadline = Date.now() + 35_000) {
  const now = new Date().toISOString(), owner = randomUUID();
  const setup = await db.from('marketplace_magalu_sales_sync').upsert({ empresa_id: connection.empresa_id, connection_id: connection.id }, { onConflict: 'connection_id', ignoreDuplicates: true });
  if (setup.error) throw new MarketplaceError(503, 'magalu_setup', 'As vendas Magalu precisam da migração de integração no banco. Avise o administrador.');
  const lease = await db.from('marketplace_magalu_sales_sync').update({ lease_owner: owner, lease_until: new Date(Date.now() + 40_000).toISOString() })
    .eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).or(`lease_until.is.null,lease_until.lt.${now}`).select('*').maybeSingle();
  if (lease.error) throw new MarketplaceError(503, 'database', 'Não foi possível preparar a atualização das vendas Magalu.');
  if (!lease.data) return { pending: 1 };
  try {
    if (Date.now() > deadline - 8_000) throw new Error('time_limit');
    const state = lease.data, offset = Number(state.scan_offset), end = state.window_end || now;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isFinite(Date.parse(end))) throw new Error('invalid_cursor');
    // Data de compra não muda quando o pedido avança. Não limitar updated_at
    // por cima: isso tiraria pedidos do meio da paginação durante uma atualização.
    const query = new URLSearchParams({ _offset: String(offset), _limit: '20', _sort: 'purchased_at:asc', purchased_at__lte: end });
    if (state.checkpoint) query.set('updated_at__gte', new Date(Date.parse(state.checkpoint) - 3_600_000).toISOString());
    const page = magaluPage(await magaluRequest(db, connection, `/seller/v1/orders?${query}`), '/seller/v1/orders', offset);
    // Validar a página inteira antes da primeira gravação.
    page.rows.forEach(order => normalizeMagaluOrder(order, connection.seller_reference));
    if (new Set(page.rows.map(order => order.code)).size !== page.rows.length) throw new Error('duplicate_orders');
    for (const order of page.rows) {
      if (Date.now() > deadline - 2_000) throw new Error('time_limit');
      await saveMagaluOrder(db, connection, order);
    }
    const progress = await db.from('marketplace_magalu_sales_sync').update({ scan_offset: page.next || 0, window_end: page.next == null ? null : end,
      ...(page.next == null ? { checkpoint: end, last_completed_at: now } : {}), last_checked_at: now })
      .eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('lease_owner', owner).select('connection_id').maybeSingle();
    if (progress.error || !progress.data) throw new Error('cursor_not_saved');
    return { pending: page.next == null ? 0 : 1 };
  } catch (error) {
    if (error instanceof MarketplaceError) throw error;
    throw new MarketplaceError(503, 'magalu_page', 'A consulta Magalu ficou incompleta. O sistema retomará sem pular pedidos.');
  } finally {
    await db.from('marketplace_magalu_sales_sync').update({ lease_owner: null, lease_until: null, last_checked_at: now }).eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('lease_owner', owner);
  }
}

export async function magaluPostSaleForSale(db: SupabaseClient, companyId: string, connectionId: unknown, saleId: unknown) {
  const deadline = Date.now() + 45_000;
  if (!uuidIsValid(saleId)) throw new MarketplaceError(400, 'invalid_sale', 'Pedido inválido.');
  const connection = await loadMagaluConnection(db, companyId, connectionId);
  const saved = await db.from('marketplace_sales').select('*').eq('empresa_id', companyId).eq('connection_id', connection.id).eq('provider', 'magalu').eq('id', saleId).maybeSingle();
  if (saved.error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar o pedido salvo.');
  if (!saved.data || !magaluCode(saved.data.provider_order_id)) throw new MarketplaceError(404, 'sale_not_found', 'Venda não encontrada nesta conta.');
  const order = objectValue(await magaluRequest(db, connection, `/seller/v1/orders/${saved.data.provider_order_id}`));
  let snapshot;
  try { snapshot = normalizeMagaluOrder(order, connection.seller_reference); }
  catch { throw new MarketplaceError(503, 'magalu_order', 'O Magalu não confirmou os dados deste pedido.'); }
  if (snapshot.orderId !== saved.data.provider_order_id || snapshot.providerOrderId !== objectValue(saved.data.snapshot).providerOrderId) throw new MarketplaceError(503, 'magalu_order', 'A identidade do pedido mudou. Atualize a lista e confira a venda.');
  if (Date.parse(snapshot.providerUpdatedAt) < Date.parse(String(objectValue(saved.data.snapshot).providerUpdatedAt))) throw new MarketplaceError(409, 'sale_changed', 'O Magalu retornou uma posição anterior deste pedido. Tente atualizar novamente.');
  const postSale = await readMagaluPostSale(order, connection.seller_reference, path => magaluRequest(db, connection, path), deadline);
  const updated = { status: snapshot.status, shipment_id: snapshot.shipmentId, shipment_status: snapshot.shipmentStatus, shipment_substatus: null, label_status: 'unavailable',
    snapshot: { ...snapshot, postSaleProgress: { state: postSale.processState || 'unknown', checkedAt: postSale.checkedAt } }, updated_at: new Date().toISOString() };
  const result = await db.from('marketplace_sales').update(updated).eq('empresa_id', companyId).eq('connection_id', connection.id).eq('provider', 'magalu').eq('id', saleId).eq('updated_at', saved.data.updated_at).select('id').maybeSingle();
  if (result.error || !result.data) throw new MarketplaceError(409, 'sale_changed', 'Outra atualização deste pedido chegou. Atualize o pós-venda novamente.');
  return { sale: publicSale({ ...saved.data, ...updated }), postSale };
}
