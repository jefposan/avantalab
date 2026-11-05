export const MARKETPLACE_PANEL_ORDER_VERSION = 3;
export const DEFAULT_MARKETPLACE_PANEL_ORDER = ['sales', 'announced', 'warehouses', 'products'];

export function marketplacePanelOrderKey(userId: string, companyId: string) {
  return userId && companyId ? `avantalab:marketplaces:panel-order:v1:${encodeURIComponent(userId)}:${encodeURIComponent(companyId)}` : null;
}

export function parseMarketplacePanelOrder(value: string | null): string[] {
  try {
    const saved = JSON.parse(value || 'null');
    if (saved?.version === 1 && Array.isArray(saved.order) && saved.order.length === 2
      && new Set(saved.order).size === 2 && saved.order.every((id: unknown) => ['sales', 'announced'].includes(id as string))) return [...saved.order, 'warehouses', 'products'];
    if (saved?.version === 2 && Array.isArray(saved.order) && saved.order.length === 3
      && new Set(saved.order).size === 3 && saved.order.every((id: unknown) => ['sales', 'products', 'announced'].includes(id as string))) {
      if (saved.order.join(',') === 'sales,products,announced') return [...DEFAULT_MARKETPLACE_PANEL_ORDER];
      const order = [...saved.order];
      order.splice(order.indexOf('products'), 0, 'warehouses');
      return order;
    }
    if (saved?.version === MARKETPLACE_PANEL_ORDER_VERSION && Array.isArray(saved.order) && saved.order.length === 4
      && new Set(saved.order).size === 4 && saved.order.every((id: unknown) => DEFAULT_MARKETPLACE_PANEL_ORDER.includes(id as string))) return [...saved.order];
  } catch { /* Preferência ausente ou inválida: ordem oficial. */ }
  return [...DEFAULT_MARKETPLACE_PANEL_ORDER];
}
