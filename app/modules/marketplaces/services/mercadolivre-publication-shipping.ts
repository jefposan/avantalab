import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mlRequest, type SellerConnection } from './mercadolivre-management';
import { MarketplaceError } from './management-access';
import { objectValue } from './listing-model';
import type { CatalogPreparation, PublicationForm } from './catalog-publication';
import { packageDimensionsText, publicationShippingKey, type PackageDimensions, type PublicationShippingQuote } from '../publication-shipping';

const lifetime = 10 * 60_000;
function secret() {
  const key = Buffer.from(process.env.MARKETPLACE_SECRETS_KEY || '', 'base64url');
  if (key.length !== 32) throw new MarketplaceError(503, 'shipping_config', 'Não foi possível preparar a conferência do frete. Tente novamente.');
  return key;
}
const scope = (connection: SellerConnection) => [connection.empresa_id, connection.id, connection.seller_reference];
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const context = (prepared: CatalogPreparation) => digest(JSON.stringify(prepared.product?.attributes || []));
function sign(value: unknown) {
  const encoded = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encoded}.${createHmac('sha256', secret()).update(encoded).digest('base64url')}`;
}
export function reviewPublicationShipping(connection: SellerConnection, form: PublicationForm, prepared: CatalogPreparation) {
  if (form.shippingMode !== 'me2') return;
  try {
    const [encoded, supplied, extra] = (form.shippingQuoteToken || '').split('.');
    if (!encoded || !supplied || extra || encoded.length > 12000) throw new Error('missing');
    const expected = createHmac('sha256', secret()).update(encoded).digest();
    const signature = Buffer.from(supplied, 'base64url');
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error('signature');
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (JSON.stringify(value.scope) !== JSON.stringify(scope(connection)) || value.key !== digest(publicationShippingKey(form))
      || value.context !== context(prepared) || typeof value.expires !== 'number' || value.expires <= Date.now()) throw new Error('stale');
    if (!['mandatory', 'optional', 'not_allowed'].includes(value.policy) || (value.policy === 'mandatory' && !form.freeShipping) || (value.policy === 'not_allowed' && form.freeShipping)) throw new Error('policy');
    if (value.cost == null && form.acknowledgeUnavailableShippingCost !== true) throw new Error('cost');
  } catch {
    throw new MarketplaceError(400, 'shipping_review_required', 'Confira as condições e o custo estimado do frete antes de publicar. Se alterou os dados ou a estimativa venceu, atualize a consulta.', { freeShipping: 'Atualize a estimativa e confirme as condições do frete.' });
  }
}

/** Somente medidas da EMBALAGEM; nunca inferir a caixa a partir do tamanho do produto. */
export function productPackageDimensions(prepared: CatalogPreparation): PackageDimensions | undefined {
  const attributes = prepared.product?.attributes || [];
  const read = (id: string, mass = false) => {
    const text = attributes.find(a => a.id === id)?.value || '';
    const match = text.trim().match(/^(\d+(?:[.,]\d+)?)\s*(cm|mm|m|kg|g)$/i);
    if (!match) return undefined;
    const n = Number(match[1].replace(',', '.')), unit = match[2].toLowerCase();
    if (mass) return unit === 'kg' ? n : unit === 'g' ? n / 1000 : undefined;
    return unit === 'cm' ? n : unit === 'mm' ? n / 10 : unit === 'm' ? n * 100 : undefined;
  };
  const result = { height: read('SELLER_PACKAGE_HEIGHT'), width: read('SELLER_PACKAGE_WIDTH'), length: read('SELLER_PACKAGE_LENGTH'), weightKg: read('SELLER_PACKAGE_WEIGHT', true) };
  return packageDimensionsText(result) ? result : undefined;
}

export async function estimatePublicationShipping(db: SupabaseClient, connection: SellerConnection, form: PublicationForm, prepared: CatalogPreparation, body: Record<string, unknown>): Promise<PublicationShippingQuote> {
  const now = Date.now();
  const quote: PublicationShippingQuote = { policy: 'unknown', freeShipping: form.freeShipping === true, sellerCost: null, dimensionsSource: null, notice: '', checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + lifetime).toISOString() };
  if (form.shippingMode !== 'me2') return { ...quote, freeShipping: false, notice: 'Nesta modalidade, combine o frete diretamente. O Mercado Livre não fornece esta estimativa.' };
  try {
    const attributes = Array.isArray(body.attributes) ? body.attributes : [];
    const response = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/shipping_modes`, 'POST', {
      site_id: 'MLB', seller_id: Number(connection.seller_reference), title: prepared.product!.name,
      item_price: form.price, item_currency: 'BRL', category_id: form.categoryId,
      catalog: { domain_id: prepared.product!.domainId, attributes },
      sale_terms: body.sale_terms, listing_type_id: form.listingType, buying_mode: 'buy_it_now', condition: form.condition,
      channels: [{ id: 'marketplace' }], new_format: true, verbose: false,
    }));
    const channel = objectValue(objectValue(response.channels).marketplace);
    const modes = Array.isArray(channel.available_modes) ? channel.available_modes.map(objectValue).filter(row => row.mode === 'me2') : [];
    if (modes.length !== 1) throw new Error('mode');
    const policy = objectValue(modes[0].shipping_attributes).free_shipping;
    if (!['mandatory', 'optional', 'not_allowed'].includes(String(policy))) throw new Error('policy');
    quote.policy = policy as PublicationShippingQuote['policy'];
    quote.freeShipping = policy === 'mandatory' || (policy === 'optional' && form.freeShipping === true);
    const defaults = (Array.isArray(modes[0].logistic_types) ? modes[0].logistic_types.map(objectValue) : []).filter(row => row.default === true && typeof row.type === 'string');
    const logisticType = defaults.length === 1 ? String(defaults[0].type) : '';
    const manual = form.packageDimensions && Object.values(form.packageDimensions).some(value => value != null);
    let dimensions = manual ? packageDimensionsText(form.packageDimensions) : packageDimensionsText(productPackageDimensions(prepared));
    if (dimensions) quote.dimensionsSource = manual ? 'manual' : 'product';
    if (!dimensions && !manual) {
      const preferences = objectValue(await mlRequest(db, connection, `/categories/${form.categoryId}/shipping_preferences`));
      const d = objectValue(preferences.dimensions);
      dimensions = packageDimensionsText({ height: d.height as number, width: d.width as number, length: d.length as number, weightKg: typeof d.weight === 'number' ? d.weight / 1000 : undefined });
      if (dimensions) quote.dimensionsSource = 'category';
    }
    if (!dimensions) quote.notice = 'Informe altura, largura, comprimento e peso da embalagem para calcular o custo. Não use as medidas do produto sem a caixa.';
    else {
      const params = new URLSearchParams({ dimensions, item_price: String(form.price), currency_id: 'BRL', category_id: form.categoryId, listing_type_id: form.listingType, mode: 'me2', condition: form.condition, free_shipping: quote.freeShipping ? 'True' : 'False', verbose: 'true', ...(logisticType ? { logistic_type: logisticType } : {}) });
      const cost = objectValue(objectValue(objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/shipping_options/free?${params}`)).coverage).all_country);
      if (cost.currency_id === 'BRL' && typeof cost.list_cost === 'number' && Number.isFinite(cost.list_cost) && cost.list_cost >= 0) quote.sellerCost = cost.list_cost;
      else quote.notice = 'O Mercado Livre não retornou um custo válido em reais. Atualize a estimativa antes de decidir.';
    }
  } catch {
    quote.notice = quote.policy === 'unknown' ? 'Não foi possível confirmar as regras de frete desta conta. Tente atualizar a consulta. Não é necessário desconectar a conta.' : 'Custo estimado indisponível agora. Atualize a consulta ou confirme que está ciente antes de publicar.';
  }
  if (quote.policy !== 'unknown') {
    const reviewed = { ...form, freeShipping: quote.freeShipping };
    quote.token = sign({ scope: scope(connection), key: digest(publicationShippingKey(reviewed)), context: context(prepared), policy: quote.policy, cost: quote.sellerCost, expires: now + lifetime });
  }
  return quote;
}
