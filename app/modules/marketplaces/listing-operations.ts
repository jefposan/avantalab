export type PostSaleProgress = { state: 'open' | 'closed' | 'unknown'; checkedAt: string };
export type ListingOperation = { count: number; labels: string[] };
type OperationalSale = { status: string; shipment_status: string | null; shipment_substatus: string | null; snapshot: unknown; connection_id: string };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Estado operacional local. Não reativa anúncio nem altera o status do ML. */
export function pendingSaleOperation(sale: OperationalSale): string | null {
  const snapshot = object(sale.snapshot), postSale = object(snapshot.postSaleProgress);
  if (postSale.state === 'open') return 'Pós-venda em andamento';
  if (['cancelled', 'refunded'].includes(sale.status)) {
    return postSale.state === 'closed' ? null : 'Pós-venda a confirmar';
  }
  if (sale.status === 'partially_refunded' && postSale.state !== 'closed') return 'Pós-venda a confirmar';
  if (sale.status === 'invalid') return null;
  if (sale.status === 'pending_cancel') return 'Cancelamento em processamento';
  if (sale.status === 'payment_required') return 'Aguardando pagamento';
  if (sale.status === 'payment_in_process') return 'Pagamento em análise';
  if (sale.status === 'partially_paid') return 'Pagamento parcial';
  if (postSale.state === 'unknown' && sale.shipment_status === 'delivered') return 'Pós-venda a confirmar';
  if (sale.shipment_status === 'delivered') return null;
  if (sale.shipment_status === 'shipped') return 'Em trânsito';
  if (sale.shipment_status === 'not_delivered') return 'Não entregue / devolução em andamento';
  if (['pending', 'handling', 'ready_to_ship', 'not_verified'].includes(sale.shipment_status || '')) return 'Aguardando envio';
  if (sale.status === 'paid' || sale.status === 'confirmed') return 'Venda confirmada';
  return 'Pedido em atualização';
}

export function listingOperations(sales: OperationalSale[], connectionIds: string[]) {
  const allowed = new Set(connectionIds), result = new Map<string, ListingOperation>();
  for (const sale of sales) {
    if (!allowed.has(sale.connection_id)) continue;
    const label = pendingSaleOperation(sale); if (!label) continue;
    const lines = object(sale.snapshot).inventoryLines;
    if (!Array.isArray(lines)) continue;
    const ids = new Set(lines.map(line => object(line).listingId).filter((id): id is string => typeof id === 'string' && /^MLB\d{6,20}$/.test(id)));
    for (const id of ids) {
      const key = `${sale.connection_id}:${id}`, existing = result.get(key) || { count: 0, labels: [] };
      existing.count++;
      if (!existing.labels.includes(label)) existing.labels.push(label);
      result.set(key, existing);
    }
  }
  return result;
}

export function listingOperationalStatus(status: string, stock: number | null, operation?: ListingOperation) {
  if (operation?.count) return 'active';
  return status === 'active' && stock === 0 ? 'inactive' : status;
}
