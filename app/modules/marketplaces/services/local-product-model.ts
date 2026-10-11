import { catalogAttributes, safeHttpsImage, safeText, validEan, type PublicationForm } from './catalog-publication.ts';
import { objectValue, type ListingSnapshot } from './listing-model.ts';

export type LocalProductLink = { id: string; connection_id: string; provider: string; provider_listing_id: string; title: string; reported_stock: number | null; status: string; source_snapshot: Record<string, unknown>; updated_at: string; accountName?: string };
export type LocalProduct = {
  id: string; empresa_id: string; sku: string; name: string; ean: string | null; description: string;
  pictures: string[]; category_id: string; catalog_product_id: string; attributes: Array<{ id: string; name: string; value: string; valueId?: string }>;
  publication_form: Partial<PublicationForm>; price_cents: number | null; stock_quantity: number | null;
  stock_confirmed_at: string | null; revision: number; created_at: string; updated_at: string;
  links: LocalProductLink[];
};

export function physicalQuantity(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 99999 ? value : null;
}

/** Campos de produto apenas: nunca copiar tokens, dados de comprador ou payload arbitrário. */
export function localProductData(raw: unknown) {
  const input = objectValue(raw);
  const eanText = safeText(input.ean, 30);
  const ean = validEan(eanText);
  const pictures = (Array.isArray(input.pictures) ? input.pictures : []).slice(0, 12).flatMap(value => {
    const url = safeHttpsImage(value); return url ? [url] : [];
  });
  const price = typeof input.price === 'number' && Number.isFinite(input.price) && input.price > 0 && input.price < 100000000 ? Math.round(input.price * 100) : null;
  return {
    name: safeText(input.name, 220), sku: safeText(input.sku, 80), ean: ean || null,
    invalidEan: !!eanText && !ean, description: safeText(input.description, 50000), pictures,
    price_cents: price, category_id: /^MLB\d+$/.test(safeText(input.categoryId, 30)) ? safeText(input.categoryId, 30) : '',
    catalog_product_id: /^MLB\d+$/.test(safeText(input.catalogProductId, 30)) ? safeText(input.catalogProductId, 30) : '',
    attributes: catalogAttributes(input.attributes),
  };
}

export function productFromSnapshot(snapshot: ListingSnapshot) {
  return {
    name: safeText(snapshot.title, 220), ean: validEan(snapshot.ean) || null,
    sku: '', description: '', pictures: [], category_id: safeText(snapshot.category, 30), catalog_product_id: '',
    price_cents: snapshot.price != null && snapshot.price > 0 ? Math.round(snapshot.price * 100) : null,
    attributes: [],
    publication_form: { ean: validEan(snapshot.ean) || '', price: snapshot.price || 0, stock: snapshot.stock ?? -1,
      categoryId: snapshot.category, listingType: snapshot.listingType, shippingMode: snapshot.shipping.mode,
      condition: snapshot.condition, description: '', attributes: {} },
  };
}

export function productFromPreparation(form: PublicationForm, product: { name: string; pictures: string[]; attributes: LocalProduct['attributes'] }) {
  return {
    name: safeText(product.name, 220), ean: validEan(form.ean) || null, sku: '',
    description: safeText(form.description, 50000), pictures: [...new Set([form.pictureUrl, ...product.pictures].flatMap(value => {
      const url = safeHttpsImage(value); return url ? [url] : [];
    }))].slice(0, 12),
    category_id: safeText(form.categoryId, 30), catalog_product_id: '', attributes: product.attributes,
    price_cents: Math.round(form.price * 100),
    publication_form: { ean: form.ean, productId: form.productId, categoryId: form.categoryId, price: form.price, stock: form.stock,
      listingType: form.listingType, shippingMode: form.shippingMode, condition: form.condition,
      warrantyType: form.warrantyType, warrantyTime: form.warrantyTime || '', description: form.description || '',
      pictureUrl: form.pictureUrl || '', attributes: form.attributes || {} },
  };
}
