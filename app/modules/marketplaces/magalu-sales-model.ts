import { objectValue, uuidIsValid } from './services/listing-model';
import type { MarketplaceSale } from './services/mercadolivre-sales';

export const magaluCode = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export const magaluText = (value: unknown, limit = 500) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, limit) : '';
export const magaluDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
export const magaluList = (value: unknown) => Array.isArray(value) ? value.map(objectValue) : [];
export function magaluMoney(value: unknown, field = 'total') {
  const data = objectValue(value), raw = data[field], normalizer = data.normalizer;
  return data.currency === 'BRL' && Number.isSafeInteger(raw) && (raw as number) >= 0 && Number.isSafeInteger(normalizer) && (normalizer as number) > 0
    ? Math.round((raw as number) / (normalizer as number) * 100) / 100 : null;
}
const shipmentStates: Record<string, string> = { new: 'pending', approved: 'handling', invoiced: 'ready_to_ship', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled', frozen: 'not_verified' };
const deliveryLabels: Record<string, string> = { new: 'Aguardando preparação', approved: 'Pagamento aprovado · aguardando envio', invoiced: 'Nota fiscal emitida · aguardando envio', shipped: 'Em trânsito', delivered: 'Entregue', cancelled: 'Entrega cancelada', frozen: 'Entrega em análise' };

export function normalizeMagaluOrder(value: unknown, seller: string) {
  const order = objectValue(value), deliveries = magaluList(order.deliveries);
  if (!magaluCode(order.code) || !uuidIsValid(order.id) || !magaluDate(order.purchased_at) || !magaluDate(order.updated_at)
    || !deliveries.length || deliveries.some(delivery => !uuidIsValid(delivery.id) || objectValue(delivery.seller).id !== seller)
    || (order.seller != null && objectValue(order.seller).id !== seller)) throw new Error('magalu_order_identity');
  const packages = deliveries.map(delivery => ({ id: String(delivery.id), code: magaluText(delivery.code, 100), status: shipmentStates[String(delivery.status)] || null,
    statusText: deliveryLabels[String(delivery.status)] || 'Situação da entrega ainda não reconhecida',
    deadline: magaluDate(objectValue(objectValue(delivery.shipping).handling_time).limit_date),
    invoices: magaluList(delivery.invoices).map(invoice => ({ key: /^\d{44}$/.test(String(invoice.key)) ? String(invoice.key) : null,
      statusText: ({ approved: 'Nota fiscal aprovada', pending: 'Nota fiscal em análise', rejected: 'Nota fiscal recusada' } as Record<string, string>)[String(objectValue(invoice.status).id)] || 'Nota fiscal em atualização' })),
  }));
  const active = packages.filter(delivery => delivery.status !== 'cancelled');
  const shipmentStatus = !active.length ? 'cancelled' : active.some(delivery => !delivery.status) ? null : active.every(delivery => delivery.status === 'delivered') ? 'delivered'
    : ['pending', 'not_verified', 'handling', 'ready_to_ship', 'shipped'].find(status => active.some(delivery => delivery.status === status)) || null;
  const items = deliveries.flatMap(delivery => magaluList(delivery.items)).map(item => {
    if (!Number.isSafeInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 100_000) throw new Error('magalu_items');
    return { title: magaluText(objectValue(item.info).name) || 'Produto', quantity: item.quantity as number, unitPrice: magaluMoney(item.unit_price, 'value') };
  });
  if (!items.length || items.length > 500) throw new Error('magalu_items');
  const status = order.status === 'cancelled' ? 'cancelled' : order.status === 'approved' ? 'paid' : order.status === 'new' ? 'payment_required' : order.status === 'finished' ? 'confirmed' : 'unknown';
  return { orderId: order.code, providerOrderId: String(order.id), providerOrderStatus: ({ new: 'Pedido criado', approved: 'Pagamento aprovado', cancelled: 'Venda cancelada', finished: 'Pedido finalizado' } as Record<string, string>)[String(order.status)] || 'Pedido em atualização',
    channelId: uuidIsValid(objectValue(order.channel).id) ? String(objectValue(order.channel).id) : null,
    soldAt: magaluDate(order.purchased_at)!, status, shipmentId: packages.length === 1 ? packages[0].id : null, shipmentStatus, shipmentSubstatus: null,
    labelStatus: 'unavailable' as const, buyer: magaluText(objectValue(order.customer).name, 160) || null, total: magaluMoney(order.amounts), currency: 'BRL', items,
    deliveries: packages, confirmedAt: magaluDate(order.approved_at), providerUpdatedAt: magaluDate(order.updated_at)!, inventoryLines: [],
    warnings: packages.some(delivery => delivery.status === 'cancelled') && active.length ? ['Este pedido tem entrega cancelada e outras entregas com situações diferentes. Confira cada pacote.'] : [],
  };
}

/** Só avança com uma página reconhecida; links externos nunca viram requisições. */
export function magaluPage(value: unknown, path: string, offset: number, limit = 20) {
  const page = objectValue(value), meta = objectValue(page.meta), links = objectValue(meta.links), info = objectValue(meta.page);
  const rows = page.results === null && info.count === 0 ? [] : page.results;
  if (!Array.isArray(rows) || rows.length > limit || info.offset !== offset || info.count !== rows.length || !Object.hasOwn(links, 'next')) throw new Error('magalu_page');
  let next: number | null = null;
  if (links.next) {
    if (typeof links.next !== 'string') throw new Error('magalu_page');
    const url = new URL(links.next, `https://api.magalu.com${path}`);
    next = Number(url.searchParams.get('_offset'));
    if (url.origin !== 'https://api.magalu.com' || url.pathname !== path || !Number.isSafeInteger(next) || next <= offset || next > offset + rows.length) throw new Error('magalu_page');
  }
  return { rows: rows.map(objectValue), next };
}

export function salesAccountAvailable(account: { provider?: string; status: string; last_error_code?: string | null }) {
  return (!account.provider || account.provider === 'mercado_livre') ? account.status === 'connected'
    : account.provider === 'magalu' && (account.status === 'connected' || (account.status === 'attention' && account.last_error_code === 'magalu_connector_pending'));
}
export type MagaluDelivery = NonNullable<MarketplaceSale['deliveries']>[number];
