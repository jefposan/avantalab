import { safeHttpsImage, safeText, validEan } from './services/catalog-publication.ts';

export const MAGALU_CHANNEL_ID = '9fe0d853-732b-4e4a-a0b0-cff988ed043d';

export type MagaluCategoryField = { name: string; label: string; required: boolean; choices: string[]; variation: boolean };
export type MagaluPublicationForm = {
  productId: string; revision: number; categoryId: string; sku: string; title: string; brand: string;
  description: string; ean: string; imageUrl: string; condition: 'NEW' | 'USED' | 'REMANUFACTURED';
  priceCents: number; stock: number; productHeight: number; productWidth: number; productLength: number;
  productWeight: number; packageHeight: number; packageWidth: number; packageLength: number; packageWeight: number;
  attributes: Record<string, string>; datasheet: Record<string, string>;
};

export function isMagaluPublicationForm(value: unknown): value is MagaluPublicationForm {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const form = value as Record<string, unknown>;
  const strings = ['productId', 'categoryId', 'sku', 'title', 'brand', 'description', 'ean', 'imageUrl', 'condition'];
  const numbers = ['revision', 'priceCents', 'stock', 'productHeight', 'productWidth', 'productLength', 'productWeight',
    'packageHeight', 'packageWidth', 'packageLength', 'packageWeight'];
  if (!strings.every(key => typeof form[key] === 'string') || !numbers.every(key => typeof form[key] === 'number' && Number.isFinite(form[key]))) return false;
  return ['attributes', 'datasheet'].every(key => form[key] && typeof form[key] === 'object' && !Array.isArray(form[key])
    && Object.entries(form[key]).length <= 100 && Object.values(form[key]).every(entry => typeof entry === 'string'));
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const skuPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export function magaluCategoryFields(value: unknown, variation: boolean): MagaluCategoryField[] {
  const rows = value && typeof value === 'object' && !Array.isArray(value) ? (value as { results?: unknown }).results : null;
  if (!Array.isArray(rows)) throw new Error('O Magalu não retornou os campos da categoria.');
  return rows.slice(0, 100).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const rawName = typeof row.name === 'string' ? row.name.trim() : '';
    if (rawName.length > (variation ? 20 : 100)) throw new Error('O nome de um campo da categoria excede o limite do Magalu.');
    if (rawName in Object.prototype) throw new Error('A categoria possui um nome de campo reservado.');
    const name = rawName, label = safeText(row.display_name, 100) || name;
    if (!name || !label || row.active === false || (row.variation === true) !== variation) return [];
    const choices = Array.isArray(row.choices) ? row.choices.slice(0, 100).map(choice => safeText(choice, 100)).filter(Boolean) : [];
    return [{ name, label, required: row.required === 'required', choices, variation }];
  });
}

export function magaluPublicationErrors(form: MagaluPublicationForm, product: { sku: string; ean: string | null; stock_quantity: number | null; pictures: string[] }, attributes: MagaluCategoryField[], datasheet: MagaluCategoryField[]) {
  const errors: Record<string, string> = {};
  if (!uuid.test(form.productId) || !Number.isSafeInteger(form.revision) || form.revision < 1) errors.productId = 'Selecione novamente o cadastro local.';
  if (!uuid.test(form.categoryId)) errors.categoryId = 'Selecione uma categoria final do Magalu.';
  if (!skuPattern.test(form.sku) || form.sku !== product.sku) errors.sku = 'Use o SKU do cadastro local (até 32 letras, números, pontos, traços ou sublinhados).';
  if (!safeText(form.title, 150) || form.title.length > 150) errors.title = 'Informe um título de até 150 caracteres.';
  if (!safeText(form.brand, 100) || form.brand.length > 100) errors.brand = 'Informe a marca de até 100 caracteres.';
  if (!safeText(form.description, 7000) || form.description.length > 7000) errors.description = 'Informe uma descrição de até 7.000 caracteres.';
  if (!validEan(form.ean) || form.ean !== product.ean) errors.ean = 'Confirme o EAN válido do cadastro local.';
  if (!safeHttpsImage(form.imageUrl) || !product.pictures.includes(form.imageUrl) || !/\.jpe?g(?:\?|$)/i.test(form.imageUrl)) errors.imageUrl = 'Selecione uma foto JPEG HTTPS do cadastro local.';
  if (!['NEW', 'USED', 'REMANUFACTURED'].includes(form.condition)) errors.condition = 'Selecione a condição do produto.';
  if (!Number.isSafeInteger(form.priceCents) || form.priceCents < 1 || form.priceCents > 99999999) errors.priceCents = 'Informe preço entre R$ 0,01 e R$ 999.999,99.';
  if (!Number.isSafeInteger(form.stock) || form.stock < 1 || form.stock > 99999 || product.stock_quantity == null || form.stock > product.stock_quantity) errors.stock = 'Informe uma quantidade entre 1 e o estoque físico confirmado.';
  for (const key of ['productHeight', 'productWidth', 'productLength', 'packageHeight', 'packageWidth', 'packageLength'] as const) {
    if (!Number.isFinite(form[key]) || form[key] < 0.001 || form[key] > 1000000) errors[key] = 'Informe a medida em centímetros.';
  }
  for (const key of ['productWeight', 'packageWeight'] as const) {
    if (!Number.isFinite(form[key]) || form[key] < 1 || form[key] > 1000000) errors[key] = 'Informe o peso em gramas.';
  }
  for (const [key, fields, values] of [['attributes', attributes, form.attributes], ['datasheet', datasheet, form.datasheet]] as const) {
    if (key === 'attributes' && fields.filter(field => form.attributes[field.name]?.trim()).length > 3) errors.attributes = 'O Magalu aceita no máximo 3 atributos de variação.';
    for (const field of fields) {
      const value = values?.[field.name]?.trim() || '';
      if (field.required && !value) errors[`${key}:${field.name}`] = `Informe ${field.label}.`;
      else if (value && ((key === 'attributes' && value.length > 50) || (key === 'datasheet' && value.length > 500) || (field.choices.length && !field.choices.includes(value)))) errors[`${key}:${field.name}`] = `Revise ${field.label}.`;
    }
  }
  return errors;
}

export function magaluPublicationBodies(form: MagaluPublicationForm, attributes: MagaluCategoryField[], datasheet: MagaluCategoryField[]) {
  const dimension = (name: 'product' | 'package', prefix: 'product' | 'package') => ({ name,
    height: { unit: 'cm', value: form[`${prefix}Height`] }, width: { unit: 'cm', value: form[`${prefix}Width`] },
    length: { unit: 'cm', value: form[`${prefix}Length`] }, weight: { unit: 'g', value: form[`${prefix}Weight`] } });
  return {
    sku: { active: true, attributes: attributes.flatMap(field => form.attributes[field.name]?.trim() ? [{ name: field.name, value: form.attributes[field.name].trim() }] : []),
      brand: form.brand.trim(), category: { id: form.categoryId }, channels: [{ id: MAGALU_CHANNEL_ID }], condition: form.condition,
      datasheet: datasheet.flatMap(field => form.datasheet[field.name]?.trim() ? [{ name: field.name, value: form.datasheet[field.name].trim() }] : []),
      description: form.description.trim(), dimensions: [dimension('product', 'product'), dimension('package', 'package')],
      extra_data: [], fulfillment: false, group: { id: form.sku, main_variation: true }, has_ean: true,
      identifiers: [{ type: 'ean', value: form.ean }], images: [{ reference: form.imageUrl, type: 'image/jpeg' }],
      perishable: false, podcasts: [], videos: [], sku: form.sku, title: form.title.trim(), type: 'product' },
    price: { channel: { id: MAGALU_CHANNEL_ID }, currency: 'BRL', list_price: form.priceCents, normalizer: 100, price: form.priceCents },
    stock: { channel: { id: MAGALU_CHANNEL_ID }, quantity: form.stock, type: 'AVAILABLE' },
  };
}
