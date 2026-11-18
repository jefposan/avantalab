// Projeção da resposta: nunca altera os retratos persistidos nem os cálculos internos.
const COST_KEYS = new Set(['costUnitSnapshot','costPrice','unitCost','cost','laborCost','materialCost','actualCost','estimatedCost','plannedCost','margin','marginPercent','profit','profitPercent','totalCost','laborCostTotal','materialCostTotal','actualCostTotal','actualMarginPercent']);
export function commercialResponse(context, value) {
  if (context?.effectivePermissions?.['catalog.view_cost'] === true) return value;
  const redact = (item) => {
    if (Array.isArray(item)) return item.map(redact);
    if (!item || typeof item !== 'object' || item instanceof Date) return item;
    return Object.fromEntries(Object.entries(item).filter(([key]) => !COST_KEYS.has(key)).map(([key, child]) => [key, redact(child)]));
  };
  return redact(value);
}
export function protectCommercialService(service) {
  return Object.freeze(Object.fromEntries(Object.entries(service).map(([name, method]) => [name, typeof method === 'function' ? async (input = {}) => commercialResponse(input.context, await method(input)) : method])));
}
