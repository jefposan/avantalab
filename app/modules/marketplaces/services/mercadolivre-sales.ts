import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { loadConnection, mlBinaryRequest, mlRequest, type SellerConnection } from './mercadolivre-management';
import { objectValue } from './listing-model';

export type SaleNotification = { id: string; seller: string; topic: 'orders_v2' | 'orders' | 'shipments'; resource: string; orderId?: string; shipmentId?: string };
export type MarketplaceSale = { id: string; orderId: string; status: string; shipmentId: string | null; shipmentStatus: string | null; shipmentSubstatus: string | null; labelStatus: 'ready' | 'unavailable' | 'fulfilled'; seenAt: string | null; createdAt: string; updatedAt: string; buyer: string | null; total: number | null; currency: string; items: Array<{ title: string; quantity: number; unitPrice: number | null }> };

const orderId = (value: unknown) => /^\d{1,24}$/.test(String(value)) ? String(value) : '';
const shipmentId = orderId;
const text = (value: unknown, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

export function parseSaleNotification(value: unknown, applicationId: string): SaleNotification | null {
  const body = objectValue(value);
  const topic = body.topic;
  const resource = body.resource;
  if (String(body.application_id) !== applicationId || !['orders_v2', 'orders', 'shipments'].includes(String(topic)) || typeof body._id !== 'string' || !body._id || body._id.length > 160 || !/^\d{1,20}$/.test(String(body.user_id)) || typeof resource !== 'string') return null;
  if (topic === 'shipments' && /^\/shipments\/\d{1,24}$/.test(resource)) return { id: body._id, seller: String(body.user_id), topic, resource, shipmentId: resource.slice(11) };
  if ((topic === 'orders_v2' || topic === 'orders') && /^\/orders\/\d{1,24}$/.test(resource)) return { id: body._id, seller: String(body.user_id), topic, resource, orderId: resource.slice(8) };
  return null;
}

function saleSnapshot(order: Record<string, unknown>, shipment: Record<string, unknown> | null) {
  const shipping = objectValue(order.shipping);
  const logistics = shipment ? objectValue(shipment.logistic) : {};
  const mode = text((shipment || shipping).mode, 40);
  const logisticType = text(logistics.logistic_type || (shipment || shipping).logistic_type, 80);
  const shipmentStatus = shipment ? text(shipment.status, 80) || null : null;
  const shipmentSubstatus = shipment ? text(shipment.substatus, 80) || null : null;
  const labelStatus: MarketplaceSale['labelStatus'] = logisticType === 'fulfillment' ? 'fulfilled' : mode === 'me2' && shipmentStatus === 'ready_to_ship' && shipmentSubstatus === 'ready_to_print' ? 'ready' : 'unavailable';
  const items = (Array.isArray(order.order_items) ? order.order_items : []).map(objectValue).map((row) => {
    const item = objectValue(row.item);
    return { title: text(item.title) || 'Produto', quantity: Math.max(1, Math.floor(amount(row.quantity) || 1)), unitPrice: amount(row.unit_price) };
  }).slice(0, 100);
  return {
    orderId: orderId(order.id), status: text(order.status, 80) || 'unknown', shipmentId: shipmentId(shipment?.id || shipping.id) || null,
    shipmentStatus, shipmentSubstatus, labelStatus, buyer: text(objectValue(order.buyer).nickname, 160) || null,
    total: amount(order.total_amount), currency: text(order.currency_id, 12) || 'BRL', items,
  };
}

function publicSale(row: Record<string, unknown>): MarketplaceSale {
  const snapshot = objectValue(row.snapshot);
  return { id: String(row.id), orderId: String(row.provider_order_id), status: text(row.status, 80), shipmentId: typeof row.shipment_id === 'string' ? row.shipment_id : null,
    shipmentStatus: typeof row.shipment_status === 'string' ? row.shipment_status : null, shipmentSubstatus: typeof row.shipment_substatus === 'string' ? row.shipment_substatus : null,
    labelStatus: row.label_status === 'ready' || row.label_status === 'fulfilled' ? row.label_status : 'unavailable', seenAt: typeof row.seen_at === 'string' ? row.seen_at : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at), buyer: typeof snapshot.buyer === 'string' ? snapshot.buyer : null,
    total: amount(snapshot.total), currency: text(snapshot.currency, 12) || 'BRL', items: (Array.isArray(snapshot.items) ? snapshot.items : []).map(objectValue).map((item) => ({ title: text(item.title) || 'Produto', quantity: Math.max(1, Math.floor(amount(item.quantity) || 1)), unitPrice: amount(item.unitPrice) })).slice(0, 100) };
}

async function syncOrder(db: SupabaseClient, connection: SellerConnection, id: string) {
  const order = objectValue(await mlRequest(db, connection, `/orders/${id}`));
  if (orderId(order.id) !== id) throw new MarketplaceError(503, 'invalid_order', 'O Mercado Livre devolveu uma venda inválida.');
  const shipping = objectValue(order.shipping); const idShipment = shipmentId(shipping.id);
  let shipment: Record<string, unknown> | null = null;
  if (idShipment) {
    try { shipment = objectValue(await mlRequest(db, connection, `/shipments/${idShipment}`)); } catch { /* Venda continua visível; etiqueta será reavaliada na abertura. */ }
  }
  const snapshot = saleSnapshot(order, shipment);
  const { error } = await db.from('marketplace_sales').upsert({ empresa_id: connection.empresa_id, connection_id: connection.id, provider: 'mercado_livre', provider_order_id: id,
    status: snapshot.status, shipment_id: snapshot.shipmentId, shipment_status: snapshot.shipmentStatus, shipment_substatus: snapshot.shipmentSubstatus, label_status: snapshot.labelStatus, snapshot, updated_at: new Date().toISOString() }, { onConflict: 'connection_id,provider_order_id' });
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível salvar a venda recebida.');
}

export async function queueSaleNotification(db: SupabaseClient, notification: SaleNotification) {
  const { data: connection } = await db.from('marketplace_connections').select('id,empresa_id').eq('provider', 'mercado_livre').eq('seller_reference', notification.seller).eq('status', 'connected').maybeSingle();
  if (!connection) return;
  await db.from('marketplace_sale_notifications').upsert({ id: notification.id, empresa_id: connection.empresa_id, connection_id: connection.id, topic: notification.topic, resource: notification.resource }, { onConflict: 'id', ignoreDuplicates: true });
}

export async function processSaleNotifications(db: SupabaseClient, connection: SellerConnection) {
  const { data, error } = await db.from('marketplace_sale_notifications').select('id,topic,resource,attempts').eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).is('processed_at', null).lte('next_attempt_at', new Date().toISOString()).order('created_at').limit(12);
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar as vendas recebidas.');
  for (const event of data || []) {
    try {
      let id = String(event.resource).split('/').pop() || '';
      if (event.topic === 'shipments') {
        const shipment = objectValue(await mlRequest(db, connection, `/shipments/${id}`));
        id = orderId(shipment.order_id);
      }
      if (!orderId(id)) throw new Error('invalid_resource');
      await syncOrder(db, connection, id);
      await db.from('marketplace_sale_notifications').update({ processed_at: new Date().toISOString(), error_code: null }).eq('id', event.id);
    } catch (error) {
      const attempts = Math.min(99, Number(event.attempts || 0) + 1);
      await db.from('marketplace_sale_notifications').update({ attempts, error_code: error instanceof MarketplaceError ? error.code : 'processing', next_attempt_at: new Date(Date.now() + Math.min(30, attempts * 2) * 60_000).toISOString() }).eq('id', event.id);
    }
  }
}

export async function listSales(db: SupabaseClient, companyId: string, connectionId: string) {
  const { data, error } = await db.from('marketplace_sales').select('*').eq('empresa_id', companyId).eq('connection_id', connectionId).order('updated_at', { ascending: false }).limit(50);
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível carregar as vendas.');
  return (data || []).map((row) => publicSale(row as Record<string, unknown>));
}

export async function pendingSalesByConnection(db: SupabaseClient, companyId: string) {
  const [{ data: sales, error: salesError }, { data: queued, error: queuedError }] = await Promise.all([
    db.from('marketplace_sales').select('connection_id').eq('empresa_id', companyId).is('seen_at', null).in('status', ['paid', 'confirmed']),
    db.from('marketplace_sale_notifications').select('connection_id').eq('empresa_id', companyId).is('processed_at', null),
  ]);
  if (salesError || queuedError) throw new MarketplaceError(503, 'database', 'Não foi possível calcular os avisos de venda.');
  return [...(sales || []), ...(queued || [])].reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.connection_id]: (counts[row.connection_id] || 0) + 1 }), {});
}

export async function markSalesSeen(db: SupabaseClient, companyId: string, connectionId: string) {
  await db.from('marketplace_sales').update({ seen_at: new Date().toISOString() }).eq('empresa_id', companyId).eq('connection_id', connectionId).is('seen_at', null);
}

export async function labelForSale(db: SupabaseClient, companyId: string, connectionId: string, saleId: string) {
  const connection = await loadConnection(db, companyId, connectionId);
  const { data, error } = await db.from('marketplace_sales').select('shipment_id,label_status').eq('empresa_id', companyId).eq('connection_id', connectionId).eq('id', saleId).maybeSingle();
  if (error || !data) throw new MarketplaceError(404, 'sale_not_found', 'Venda não encontrada nesta conta.');
  if (data.label_status !== 'ready' || !shipmentId(data.shipment_id)) throw new MarketplaceError(409, 'label_unavailable', data.label_status === 'fulfilled' ? 'O envio Full é operado pelo Mercado Livre e não possui etiqueta para impressão local.' : 'A etiqueta ainda não está disponível para este envio.');
  return mlBinaryRequest(db, connection, `/shipment_labels?shipment_ids=${data.shipment_id}&response_type=pdf`);
}
