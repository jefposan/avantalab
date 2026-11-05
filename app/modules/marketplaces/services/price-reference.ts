export const PRICE_REFERENCE_OFFER_LIMIT = 8;

/**
 * Até oito ofertas comprovadas e deduplicadas, sem perseguir os menores preços.
 */
export function selectReferencePriceCents(pricesInCents: readonly number[]) {
  return pricesInCents
    .filter((value) => Number.isSafeInteger(value) && value > 0)
    .slice(0, PRICE_REFERENCE_OFFER_LIMIT)
    .sort((left, right) => left - right);
}
