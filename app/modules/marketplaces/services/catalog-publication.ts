import { isValidEan, normalizeEan } from './ean.ts';

export type CatalogAttribute = { id: string; name: string; value: string; valueId?: string };
export type CatalogCandidate = { id: string; name: string; domainId: string; picture: string | null; source?: 'mercadolivre_catalog' | 'profile_catalog' };
export type CatalogPreparationIssue = { code: string; message: string };
export type CatalogPreparation = {
  status: 'found' | 'not_found';
  ean: string;
  product?: CatalogCandidate & { attributes: CatalogAttribute[]; pictures: string[]; description: string };
  candidates?: CatalogCandidate[];
  categories?: Array<{ id: string; name: string }>;
  categoryId?: string;
  listingTypes?: Array<{ id: string; name: string }>;
  shippingModes?: Array<{ id: string; name: string }>;
  conditions?: Array<{ id: string; name: string }>;
  requiredAttributes?: Array<{ id: string; name: string; values: Array<{ id: string; name: string }> }>;
  presetAttributes?: CatalogAttribute[];
  constraints?: { minimumPrice?: number; maximumPrice?: number; maxDescriptionLength: number };
  blockingIssues?: CatalogPreparationIssue[];
  warnings?: string[];
  notice?: string;
};

export type PublicationForm = {
  ean: string; productId: string; categoryId: string; price: number; stock: number;
  listingType: string; shippingMode: string; condition: string; warrantyType: string;
  warrantyTime?: string; description?: string; pictureUrl?: string;
  attributes?: Record<string, string>;
};

export function validEan(input: unknown): string | null {
  const ean = normalizeEan(input);
  return isValidEan(ean) ? ean : null;
}

export function safeText(value: unknown, max = 180): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function safeCatalogImage(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && (url.hostname === 'mlstatic.com' || url.hostname.endsWith('.mlstatic.com')) ? url.toString() : null;
  } catch { return null; }
}

export function safeHttpsImage(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.toString().slice(0, 2048) : null;
  } catch { return null; }
}

export function catalogCandidate(value: unknown): CatalogCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = safeText(row.id, 30), name = safeText(row.name, 220), domainId = safeText(row.domain_id, 100);
  if (!/^MLB\d+$/.test(id) || !name || !domainId.startsWith('MLB-') || row.status !== 'active') return null;
  const first = Array.isArray(row.pictures) ? row.pictures[0] as Record<string, unknown> | undefined : undefined;
  return { id, name, domainId, picture: safeCatalogImage(first?.secure_url || first?.url) };
}

export function catalogAttributes(value: unknown): CatalogAttribute[] {
  return (Array.isArray(value) ? value : []).slice(0, 80).flatMap((raw) => {
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const id = safeText(row.id, 80), name = safeText(row.name, 120) || id, value = safeText(row.value_name, 300);
    return id && value ? [{ id, name, value }] : [];
  });
}

export function catalogPictures(value: unknown): string[] {
  return (Array.isArray(value) ? value : []).slice(0, 12).flatMap((raw) => {
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const url = safeCatalogImage(row.secure_url || row.url);
    return url ? [url] : [];
  });
}

export function publicationErrors(form: PublicationForm, preparation: CatalogPreparation): Record<string, string> {
  const errors: Record<string, string> = {};
  if (preparation.blockingIssues?.length) errors.preparation = 'Resolva as pendências da preparação antes de publicar.';
  if (!validEan(form.ean) || form.ean !== preparation.ean) errors.ean = 'Valide novamente o EAN.';
  if (!preparation.product || form.productId !== preparation.product.id) errors.productId = 'Valide novamente o produto.';
  if (!form.categoryId || !preparation.categories?.some((option) => option.id === form.categoryId)) errors.categoryId = 'Selecione uma categoria confirmada para este produto.';
  if (!Number.isFinite(form.price) || form.price <= 0 || Math.abs(Math.round(form.price * 100) - form.price * 100) > 0.0001) errors.price = 'Informe um preço válido em reais e centavos.';
  else if (preparation.constraints?.minimumPrice != null && form.price < preparation.constraints.minimumPrice) errors.price = `O preço mínimo desta categoria é R$ ${preparation.constraints.minimumPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
  else if (preparation.constraints?.maximumPrice != null && form.price > preparation.constraints.maximumPrice) errors.price = `O preço máximo desta categoria é R$ ${preparation.constraints.maximumPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
  if (!Number.isSafeInteger(form.stock) || form.stock < 1 || form.stock > 99999) errors.stock = 'Informe o estoque disponível (1 a 99.999).';
  if (!preparation.listingTypes?.some((option) => option.id === form.listingType)) errors.listingType = 'Escolha um tipo de anúncio permitido para esta conta.';
  if (!preparation.shippingModes?.some((option) => option.id === form.shippingMode)) errors.shippingMode = 'Escolha uma forma de envio permitida para esta conta e categoria.';
  if (!preparation.conditions?.some((option) => option.id === form.condition)) errors.condition = 'Escolha uma condição permitida para esta categoria.';
  if (!['none', 'seller', 'factory'].includes(form.warrantyType)) errors.warrantyType = 'Selecione a garantia.';
  if (form.warrantyType !== 'none' && !safeText(form.warrantyTime, 40)) errors.warrantyTime = 'Informe o prazo da garantia.';
  if (form.condition === 'refurbished' && form.warrantyType === 'none') errors.warrantyType = 'Produto recondicionado precisa ter garantia.';
  if (form.condition === 'refurbished' && form.warrantyType !== 'none' && safeText(form.warrantyTime, 40)) {
    const warranty = safeText(form.warrantyTime, 40).toLocaleLowerCase('pt-BR').match(/^(\d+)\s*(dia|dias|m[eê]s|meses|ano|anos)$/);
    const days = warranty ? Number(warranty[1]) * (/ano/.test(warranty[2]) ? 365 : /m[eê]s|meses/.test(warranty[2]) ? 30 : 1) : 0;
    if (days < 90) errors.warrantyTime = 'Produto recondicionado precisa ter garantia mínima de 90 dias.';
  }
  const descriptionLimit = preparation.constraints?.maxDescriptionLength || 50000;
  if (form.description && form.description.length > descriptionLimit) errors.description = `A descrição deve ter até ${descriptionLimit.toLocaleString('pt-BR')} caracteres.`;
  if (preparation.product?.source === 'profile_catalog') {
    if (!form.pictureUrl || !safeHttpsImage(form.pictureUrl) || !preparation.product.pictures.includes(form.pictureUrl)) errors.pictureUrl = 'Selecione a imagem cadastrada para este produto no perfil.';
  } else if (form.pictureUrl && !safeCatalogImage(form.pictureUrl)) errors.pictureUrl = 'Use uma imagem HTTPS hospedada no Mercado Livre.';
  for (const attribute of preparation.requiredAttributes || []) {
    const value = form.attributes?.[attribute.id]?.trim();
    if (!value || (attribute.values.length > 0 && !attribute.values.some((option) => option.id === value))) errors[`attribute:${attribute.id}`] = `Informe ${attribute.name}.`;
  }
  return errors;
}
