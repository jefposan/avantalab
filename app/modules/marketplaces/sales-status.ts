export type SaleStatusInput = {
  status: string;
  shipmentStatus: string | null;
  shipmentSubstatus: string | null;
  labelStatus: 'ready' | 'unavailable' | 'fulfilled';
};

const orderStates: Record<string, string> = {
  confirmed: 'Pedido confirmado',
  payment_required: 'Aguardando pagamento',
  payment_in_process: 'Pagamento em análise',
  partially_paid: 'Pagamento parcial',
  paid: 'Venda confirmada',
  partially_refunded: 'Pagamento parcialmente estornado',
  pending_cancel: 'Cancelamento em processamento',
  cancelled: 'Venda cancelada',
  invalid: 'Venda inválida',
};

const shipmentSubstates: Record<string, string> = {
  waiting_for_label_generation: 'Gerando etiqueta',
  regenerating: 'Gerando nova etiqueta',
  invoice_pending: 'Aguardando nota fiscal ou DC-e',
  ready_to_print: 'Etiqueta pronta para impressão',
  printed: 'Etiqueta impressa — pronta para despacho',
  in_pickup_list: 'Aguardando coleta',
  ready_for_pickup: 'Aguardando retirada pelo comprador',
  ready_for_dropoff: 'Aguardando postagem',
  picked_up: 'Coletado pelo transportador',
  in_hub: 'No centro de distribuição',
  out_for_delivery: 'Saiu para entrega',
  soon_deliver: 'Próxima entrega',
  at_the_door: 'Na porta do destinatário',
  documentation_issue: 'Retido: documento pendente',
  delayed: 'Entrega com atraso',
  returned: 'Não entregue — em devolução',
  refused_delivery: 'Entrega recusada',
  recipient_absent: 'Não entregue: destinatário ausente',
  invalid_address: 'Não entregue: endereço inválido',
};

export function shipmentStatusText(status: string | null, substatus: string | null) {
  if (status === 'delivered') return 'Entregue';
  if (status === 'cancelled') return 'Envio cancelado';
  if (substatus && shipmentSubstates[substatus]) return shipmentSubstates[substatus];
  switch (status) {
    case 'pending': return 'Aguardando preparação do envio';
    case 'handling': return 'Em preparação para envio';
    case 'ready_to_ship': return 'Pronto para despacho';
    case 'shipped': return 'Em trânsito';
    case 'delivered': return 'Entregue';
    case 'not_delivered': return 'Não entregue';
    case 'not_verified': return 'Envio aguardando confirmação';
    case 'cancelled': return 'Envio cancelado';
    default: return null;
  }
}

export function saleStatusText(sale: SaleStatusInput) {
  if (sale.status === 'cancelled') return 'Venda cancelada';
  if (sale.shipmentStatus === 'delivered') return 'Entregue';
  if (sale.labelStatus === 'fulfilled') return 'Envio Full';
  return shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus)
    || orderStates[sale.status]
    || 'Venda em atualização';
}

export function labelActionText(sale: SaleStatusInput) {
  return sale.shipmentSubstatus === 'printed' ? 'Reimprimir etiqueta' : 'Imprimir etiqueta';
}

export function labelUnavailableText(sale: SaleStatusInput) {
  if (sale.shipmentStatus === 'delivered') return null;
  if (sale.shipmentStatus === 'shipped') return null;
  if (sale.shipmentStatus === 'not_delivered') return null;
  if (sale.shipmentStatus === 'cancelled' || sale.status === 'cancelled') return null;
  if (sale.labelStatus === 'fulfilled') return 'Envio Full: a etiqueta é operada pelo Mercado Livre.';
  if (sale.shipmentSubstatus === 'invoice_pending') return 'A etiqueta será liberada depois da nota fiscal ou DC-e.';
  if (sale.shipmentSubstatus === 'waiting_for_label_generation' || sale.shipmentSubstatus === 'regenerating') return 'O Mercado Livre ainda está gerando a etiqueta.';
  return 'A etiqueta ainda não foi liberada pelo Mercado Livre para este envio.';
}

export const SALE_GROUPS = [
  { value: 'confirmed', label: 'Vendas confirmadas' },
  { value: 'payment_pending', label: 'Aguardando pagamento' },
  { value: 'payment_processing', label: 'Pagamento em análise' },
  { value: 'partially_paid', label: 'Pagamento parcial' },
  { value: 'awaiting_dispatch', label: 'Aguardando envio' },
  { value: 'in_transit', label: 'Em trânsito' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'not_delivered', label: 'Não entregues / devolução' },
  { value: 'pending_cancel', label: 'Cancelamento em processamento' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'refunded', label: 'Estornadas' },
  { value: 'invalid', label: 'Inválidas' },
  { value: 'other', label: 'Em atualização' },
] as const;

export type SaleGroup = typeof SALE_GROUPS[number]['value'];
export type SalePeriod = { start: string; end: string };
export type FilterableSale = SaleStatusInput & { connectionId: string; orderId: string; soldAt: string; createdAt: string };

/** Cada pedido ocupa um único grupo; Full é uma operação logística, não um estado. */
export function saleGroup(sale: SaleStatusInput): SaleGroup {
  if (sale.status === 'cancelled' || sale.shipmentStatus === 'cancelled') return 'cancelled';
  if (sale.status === 'pending_cancel') return 'pending_cancel';
  if (sale.status === 'partially_refunded' || sale.status === 'refunded') return 'refunded';
  if (sale.status === 'invalid') return 'invalid';
  if (sale.shipmentStatus === 'delivered') return 'delivered';
  if (sale.shipmentStatus === 'not_delivered') return 'not_delivered';
  if (sale.shipmentStatus === 'shipped') return 'in_transit';
  if (sale.status === 'payment_required') return 'payment_pending';
  if (sale.status === 'payment_in_process') return 'payment_processing';
  if (sale.status === 'partially_paid') return 'partially_paid';
  if (['pending', 'handling', 'ready_to_ship', 'not_verified'].includes(sale.shipmentStatus || '')) return 'awaiting_dispatch';
  if (sale.status === 'paid' || sale.status === 'confirmed') return 'confirmed';
  return 'other';
}

const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

export function validSalePeriod(period: SalePeriod) {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return (!period.start && !period.end) || (validDate(period.start) && validDate(period.end) && period.start <= period.end);
}

export function salesInPeriod<T extends FilterableSale>(sales: T[], period: SalePeriod): T[] {
  if (!validSalePeriod(period)) return [];
  const unique = new Map(sales.map((sale) => [`${sale.connectionId}:${sale.orderId}`, sale]));
  return [...unique.values()].filter((sale) => {
    if (!period.start) return true;
    const timestamp = new Date(sale.soldAt || sale.createdAt);
    if (Number.isNaN(timestamp.getTime())) return false;
    const day = localDay.format(timestamp);
    return day >= period.start && day <= period.end;
  });
}

export function salesSummary(sales: FilterableSale[], group: SaleGroup | '') {
  const byGroup = Object.fromEntries(SALE_GROUPS.map(({ value }) => [value, 0])) as Record<SaleGroup, number>;
  const byConnection: Record<string, number> = {};
  for (const sale of sales) {
    const state = saleGroup(sale);
    byGroup[state] += 1;
    if (!group || state === group) byConnection[sale.connectionId] = (byConnection[sale.connectionId] || 0) + 1;
  }
  return { byGroup, byConnection, total: sales.length, filteredTotal: Object.values(byConnection).reduce((sum, count) => sum + count, 0) };
}
