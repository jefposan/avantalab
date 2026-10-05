export type ListingAction = 'pause' | 'resume' | 'close' | 'delete';
export type ListingSnapshot = {
  id: string; title: string; status: string; substatus: string[]; permalink: string | null;
  price: number | null; currency: string; stock: number | null; sold: number | null;
  category: string; listingType: string; condition: string; ean: string | null; sku: string | null;
  shipping: { mode: string; logisticType: string; free: boolean | null; dimensions: string | null; pickup: boolean | null };
  feeEstimate: number | null; feePercent: number | null; freightEstimate: number | null;
  attributes: { name: string; value: string }[];
  variations: { id: string; price: number | null; stock: number | null; attributes: string }[];
  createdAt: string | null; endsAt: string | null; updatedAt: string | null; syncedAt: string;
  warnings: string[];
};
export const listingIdIsValid = (id: unknown): id is string => typeof id === 'string' && /^MLB\d{6,20}$/.test(id);
export const uuidIsValid = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const textValue = (value: unknown) => typeof value === 'string' ? value.slice(0, 1000) : '';
const numberValue = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const arrayValue = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function actionBody(action: ListingAction, status: string, substatus: string[] = []) {
  if (substatus.includes('deleted')) throw new Error('Este anúncio já foi excluído.');
  if (action === 'pause' && status === 'active') return { status: 'paused' };
  if (action === 'resume' && status === 'paused') return { status: 'active' };
  if (action === 'close' && ['active', 'paused'].includes(status)) return { status: 'closed' };
  if (action === 'delete' && status === 'closed') return { deleted: 'true' };
  throw new Error('Ação incompatível com a situação atual. Atualize a lista; para excluir, encerre primeiro.');
}

export function normalizeListing(item: Record<string, unknown>, seller: string, estimates: { fee?: unknown; percent?: unknown; freight?: unknown; warnings?: string[] } = {}): ListingSnapshot {
  if (!listingIdIsValid(item.id) || String(item.seller_id) !== seller) throw new Error('Anúncio não pertence à conta selecionada.');
  const shipping = objectValue(item.shipping);
  const attrs = arrayValue(item.attributes).map(objectValue);
  let permalink: string | null = null;
  try {
    const url = new URL(textValue(item.permalink));
    if (url.protocol === 'https:' && (url.hostname === 'mercadolivre.com.br' || url.hostname.endsWith('.mercadolivre.com.br'))) permalink = url.toString();
  } catch { /* Link ausente não impede a consulta. */ }
  const attribute = (id: string) => textValue(attrs.find((attr) => attr.id === id)?.value_name) || null;
  return {
    id: item.id, title: textValue(item.title), status: textValue(item.status),
    substatus: arrayValue(item.sub_status).filter((value): value is string => typeof value === 'string'), permalink,
    price: numberValue(item.price), currency: textValue(item.currency_id) || 'BRL', stock: numberValue(item.available_quantity), sold: numberValue(item.sold_quantity),
    category: textValue(item.category_id), listingType: textValue(item.listing_type_id), condition: textValue(item.condition),
    ean: attribute('GTIN'), sku: textValue(item.seller_custom_field) || attribute('SELLER_SKU'),
    shipping: { mode: textValue(shipping.mode), logisticType: textValue(shipping.logistic_type), free: typeof shipping.free_shipping === 'boolean' ? shipping.free_shipping : null,
      dimensions: textValue(shipping.dimensions) || null, pickup: typeof shipping.local_pick_up === 'boolean' ? shipping.local_pick_up : null },
    feeEstimate: numberValue(estimates.fee), feePercent: numberValue(estimates.percent), freightEstimate: numberValue(estimates.freight),
    attributes: attrs.map((attr) => ({ name: textValue(attr.name) || textValue(attr.id), value: textValue(attr.value_name) })).filter((attr) => attr.value),
    variations: arrayValue(item.variations).map(objectValue).map((variation) => ({ id: String(variation.id || ''), price: numberValue(variation.price), stock: numberValue(variation.available_quantity),
      attributes: arrayValue(variation.attribute_combinations).map(objectValue).map((attr) => `${textValue(attr.name)}: ${textValue(attr.value_name)}`).join(' · ') })),
    createdAt: textValue(item.date_created) || null, endsAt: textValue(item.stop_time) || null, updatedAt: textValue(item.last_updated) || null,
    syncedAt: new Date().toISOString(), warnings: estimates.warnings || [],
  };
}

export function parseItemNotification(value: unknown, applicationId: string) {
  const body = objectValue(value);
  if (String(body.application_id) !== applicationId || body.topic !== 'items' || typeof body._id !== 'string' || body._id.length > 160 || !body._id) return null;
  if (typeof body.resource !== 'string' || !/^\/items\/MLB\d{6,20}$/.test(body.resource) || !/^\d{1,20}$/.test(String(body.user_id))) return null;
  return { id: body._id, itemId: body.resource.slice(7), seller: String(body.user_id) };
}
