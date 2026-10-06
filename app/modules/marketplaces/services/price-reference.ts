export const PRICE_REFERENCE_OFFER_LIMIT = 5;

/**
 * Seleciona a faixa de ofertas usada como referência comercial. Valores muito
 * altos tendem a ser anúncios fora de mercado, por isso a base é limitada às
 * cinco menores ofertas válidas encontradas.
 */
export function selectReferencePriceCents(pricesInCents: readonly number[]) {
  return pricesInCents
    .filter((value) => Number.isSafeInteger(value) && value > 0)
    .sort((left, right) => left - right)
    .slice(0, PRICE_REFERENCE_OFFER_LIMIT);
}
