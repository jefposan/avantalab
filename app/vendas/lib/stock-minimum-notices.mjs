/** Avisos derivados do saldo disponível; não criam notificações duplicadas. */
export function stockMinimumNotices(products, controls = {}) {
  if (controls.enabled === false) return [];
  const disabled = new Set(controls.disabledProductIds || []);
  return products.filter(item => item.category !== 'Serviço' && item.trackStock
    && !disabled.has(item.catalogItemId) && Number(item.minimum) > 0
    && Number(item.available) <= Number(item.minimum));
}
