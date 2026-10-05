import type { MarketplaceId } from './types';

// Contrato de edição independente do provedor. Cada conector calcula suas permissões.
export const EDIT_FIELDS = ['title', 'price', 'stock', 'description'] as const;
export type EditField = typeof EDIT_FIELDS[number];
export type ListingEditValues = { title: string; price: number | null; stock: number | null; description: string };
export type FieldPermission = { editable: boolean; reason?: string; notice?: string; label?: string; maxLength?: number; min?: number; max?: number };
export type ListingEditor = {
  provider: MarketplaceId; id: string; revision: string; currency: string;
  values: ListingEditValues; fields: Record<EditField, FieldPermission>;
};
export type ListingChanges = Partial<ListingEditValues>;

export function changedFields(editor: ListingEditor, values: ListingEditValues): ListingChanges {
  return Object.fromEntries(EDIT_FIELDS.filter((key) => editor.fields[key].editable && editor.values[key] !== values[key]).map((key) => [key, values[key]]));
}

export function validateChanges(editor: ListingEditor, input: unknown): { changes: ListingChanges; errors: Partial<Record<EditField | 'form', string>> } {
  const errors: Partial<Record<EditField | 'form', string>> = {};
  const changes: ListingChanges = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { changes, errors: { form: 'Informe os campos a alterar.' } };
  const raw = input as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !EDIT_FIELDS.includes(key as EditField))) errors.form = 'Esta edição contém campos não autorizados.';
  for (const key of EDIT_FIELDS) {
    if (!Object.hasOwn(raw, key)) continue;
    const rule = editor.fields[key], value = raw[key];
    if (!rule.editable) { errors[key] = rule.reason || 'Campo bloqueado nesta publicação.'; continue; }
    if (key === 'title' || key === 'description') {
      if (typeof value !== 'string' || !value.trim()) errors[key] = 'Preencha este campo.';
      else if (rule.maxLength && value.length > rule.maxLength) errors[key] = `Use no máximo ${rule.maxLength} caracteres.`;
      else if (key === 'description' && /<[^>]*>/.test(value)) errors[key] = 'Use somente texto, sem HTML.';
      else changes[key] = key === 'title' ? value.trim() : value;
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value) || (rule.min != null && value < rule.min) || (rule.max != null && value > rule.max)) errors[key] = key === 'price' ? 'Informe um preço válido, maior que zero e dentro dos limites da categoria.' : 'Informe um estoque válido dentro dos limites da categoria.';
      else if (key === 'stock' && !Number.isSafeInteger(value)) errors[key] = 'Informe uma quantidade inteira.';
      else if (key === 'price' && Math.abs(value * 100 - Math.round(value * 100)) > .00001) errors[key] = 'Use no máximo duas casas decimais.';
      else changes[key] = value;
    }
  }
  if (!Object.keys(raw).length) errors.form = 'Nenhuma alteração para salvar.';
  return { changes, errors };
}
