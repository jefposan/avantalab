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
  if (sale.labelStatus === 'fulfilled') return 'Envio Full';
  return shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus)
    || orderStates[sale.status]
    || 'Venda em atualização';
}

export function labelActionText(sale: SaleStatusInput) {
  return sale.shipmentSubstatus === 'printed' ? 'Reimprimir etiqueta' : 'Imprimir etiqueta';
}

export function labelUnavailableText(sale: SaleStatusInput) {
  if (sale.labelStatus === 'fulfilled') return 'Envio Full: a etiqueta é operada pelo Mercado Livre.';
  if (sale.shipmentSubstatus === 'invoice_pending') return 'A etiqueta será liberada depois da nota fiscal ou DC-e.';
  if (sale.shipmentSubstatus === 'waiting_for_label_generation' || sale.shipmentSubstatus === 'regenerating') return 'O Mercado Livre ainda está gerando a etiqueta.';
  if (sale.shipmentStatus === 'cancelled' || sale.status === 'cancelled') return 'Este envio foi cancelado e não possui etiqueta para impressão.';
  return 'A etiqueta ainda não foi liberada pelo Mercado Livre para este envio.';
}
