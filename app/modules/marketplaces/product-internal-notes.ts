export const PRODUCT_INTERNAL_NOTES_LIMIT = 160;
export type ProductInternalNotes = { internalNotes: string; internalNotesRevision: number; internalNotesAvailable: boolean };

/** Texto interno: nunca faz parte de atributos, descrição ou payload de anúncio. */
export function validInternalNotes(value: unknown): value is string {
  return typeof value === 'string' && value.length <= PRODUCT_INTERNAL_NOTES_LIMIT && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
