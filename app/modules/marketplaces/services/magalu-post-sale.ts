import 'server-only';
import type { ClaimDetails, PostSaleDetails } from '../post-sale';
import { magaluDate, magaluList, magaluMoney, magaluPage, magaluText, normalizeMagaluOrder } from '../magalu-sales-model';
import { objectValue, uuidIsValid } from './listing-model';
import { MarketplaceError } from './management-access';

const states: Record<string, string> = {
  waiting_seller: 'Aguardando vendedor', waiting_customer: 'Aguardando comprador', waiting_marketplace: 'Aguardando Magalu',
  waiting_return_info: 'Aguardando dados da devolução', waiting_item_return: 'Aguardando devolução do produto', waiting_rating: 'Aguardando avaliação',
  waiting_banking_account: 'Aguardando dados para reembolso', waiting_customer_complement: 'Aguardando informações do comprador', waiting_rating_complement: 'Aguardando complemento da avaliação',
  waiting_customer_close_ticket: 'Aguardando encerramento pelo comprador', refund_authorized: 'Reembolso autorizado — pagamento ainda não confirmado', validating_bank_account: 'Dados do reembolso em análise',
  refund_denied: 'Reembolso recusado', waiting_seller_pickup: 'Aguardando coleta pelo vendedor', seller_already_pickedup: 'Coleta informada pelo vendedor', waiting_picked_up: 'Aguardando coleta',
  closed: 'Encerrada', waiting_partner_receive_collected_product: 'Aguardando recebimento do produto coletado', reversal_made: 'Estorno registrado', waiting_pickup: 'Aguardando retirada',
  waiting_checklist: 'Aguardando conferência', waiting_pickup_schedule: 'Aguardando agendamento da coleta', waiting_to_complete_the_checklist: 'Conferência em andamento',
  failed_to_identify_reverse: 'Devolução não identificada', validating_return_invoice: 'Nota fiscal da devolução em análise', valid_return_invoice: 'Nota fiscal da devolução validada',
  waiting_refund_release: 'Aguardando liberação do reembolso', waiting_confirmation_collection_schedule: 'Aguardando confirmação da coleta', failed_collection_schedule: 'Falha no agendamento da coleta',
};
const reasons: Record<string, string> = { price_discrepancy: 'Divergência de preço', incorrect_product: 'Produto incorreto', duplicated_order: 'Pedido duplicado', payment_issue: 'Problema no pagamento',
  unavailability: 'Produto indisponível', chargeback: 'Contestação do pagamento', shipping_delay: 'Atraso no envio', delivery_delay: 'Atraso na entrega', damaged_parts: 'Peças danificadas', missing_parts: 'Peças faltando',
  defective_product: 'Produto com defeito', shipped_but_lost: 'Produto extraviado', held_at_customs: 'Produto retido na fiscalização', better_price: 'Outro preço encontrado', freight_discrepancy: 'Divergência no frete',
  not_received: 'Produto não recebido', shipping_address_issues: 'Problema no endereço de entrega', quality_concern: 'Problema na qualidade', change_of_mind: 'Comprador desistiu da compra', customer_error: 'Erro na compra',
  unexpected_circumstances: 'Circunstância inesperada', missing_damaged_parts: 'Peças faltando ou danificadas' };
const types: Record<string, string> = { shipping: 'Entrega', cancellation: 'Cancelamento', payment: 'Pagamento', general: 'Atendimento', exchange: 'Troca', product_question: 'Dúvida sobre o produto', feedback: 'Avaliação', shipping_notification: 'Aviso de entrega' };
const events: Record<string, string> = { product_sent: 'Envio do produto informado', return_info_sent: 'Dados da devolução informados', authorize_refund: 'Reembolso autorizado', product_received: 'Recebimento do produto informado', exchange_product_received: 'Recebimento da troca informado',
  refunded: 'Reembolso registrado', added_bank_account: 'Dados para reembolso informados', sla_waiting_customer_expired: 'Prazo do comprador encerrado', rejection_reason: 'Recusa registrada', valid_bank_account: 'Dados do reembolso validados', waiting_seller_pickup: 'Aguardando coleta pelo vendedor',
  seller_already_pickedup: 'Coleta informada pelo vendedor', waiting_pickup_schedule: 'Aguardando agendamento da coleta', sensitive_data_identified: 'Informação protegida identificada', sensitive_data_saved: 'Informação protegida registrada', return_invoice: 'Nota fiscal de devolução informada',
  cancel_invoice: 'Cancelamento fiscal informado', delivery: 'Entrega informada', withdrawn_product: 'Retirada do produto informada', waiting_picked_up: 'Aguardando coleta', validating_return_invoice: 'Nota da devolução em análise', waiting_refund_release: 'Aguardando liberação do reembolso' };

export async function readMagaluPostSale(order: Record<string, unknown>, seller: string, request: (path: string) => Promise<unknown>, deadline = Date.now() + 32_000): Promise<PostSaleDetails> {
  const snapshot = normalizeMagaluOrder(order, seller);
  const details: PostSaleDetails = { provider: 'magalu', checkedAt: new Date().toISOString(), currency: 'BRL', claims: [], claimsComplete: true, returnsComplete: true, warnings: [], accessIssues: [],
    cancellation: order.status === 'cancelled' ? { reasonText: 'Pedido cancelado — confira os protocolos abaixo para conhecer o motivo', requestedByText: 'Não confirmado pelo Magalu', date: null } : null,
    refundText: 'Reembolso não confirmado nesta consulta. Cancelamento não comprova pagamento ou devolução.', refundedAmount: null, financialEntries: [] };
  function warn(area: string, error: unknown, claimId: string | null = null) {
    const permissionDenied = error instanceof MarketplaceError && error.status === 403;
    details.accessIssues.push({ area, claimId, permissionDenied, policyDenied: false });
    const message = permissionDenied ? `O Magalu não liberou a consulta de ${area}. Autorize novamente a mesma loja, sem excluir a conta.` : `Não foi possível concluir a consulta de ${area}. Os demais dados confirmados foram mantidos.`;
    if (!details.warnings.includes(message)) details.warnings.push(message);
  }
  async function collection(path: string, query = new URLSearchParams()) {
    let offset = 0; const result: Record<string, unknown>[] = [];
    for (let page = 0; page < 6; page++) {
      if (Date.now() > deadline - 8_000) throw new Error('time_limit');
      const params = new URLSearchParams(query); params.set('_offset', String(offset)); params.set('_limit', '20');
      const received = magaluPage(await request(`${path}?${params}`), path, offset);
      result.push(...received.rows);
      if (received.next == null) return result;
      offset = received.next;
    }
    throw new Error('incomplete_pages');
  }
  let tickets: Record<string, unknown>[] = [];
  try {
    if (!snapshot.channelId) throw new Error('channel_missing');
    tickets = await collection('/seller/v0/tickets', new URLSearchParams({ order__code: snapshot.orderId, channel__id: snapshot.channelId }));
    if (tickets.some(ticket => !uuidIsValid(ticket.id) || objectValue(ticket.channel).id !== snapshot.channelId || !magaluList(ticket.order).some(reference => {
      const delivery = objectValue(reference.delivery), owner = objectValue(delivery.seller).id;
      return reference.code === snapshot.orderId && reference.id === snapshot.providerOrderId && snapshot.deliveries.some(pack => pack.id === delivery.id)
        && (owner === seller || owner === seller.replace(/^GENPUB\./, ''));
    }))) throw new Error('ticket_identity');
    if (new Set(tickets.map(ticket => ticket.id)).size !== tickets.length) throw new Error('duplicate_tickets');
  } catch (error) { tickets = []; details.claimsComplete = false; details.returnsComplete = false; warn('protocolos de pós-venda', error); }
  for (const ticket of tickets) {
    const status = String(ticket.status), closed = ticket.closed === true && status === 'closed';
    const dueAt = closed ? null : magaluDate(ticket.due_date);
    const claim: ClaimDetails = { id: String(ticket.id), reference: magaluText(ticket.protocol, 100) || magaluText(ticket.code, 100) || undefined, processState: closed ? 'closed' : states[status] ? 'open' : 'unknown', statusText: closed ? 'Encerrada' : status === 'closed' ? 'Encerramento a confirmar' : states[status] || 'Situação ainda não confirmada', typeText: types[String(ticket.type)] || 'Atendimento',
      reasonText: reasons[String(ticket.reason)] || 'Motivo específico não confirmado nesta consulta', resolutionText: null, stageText: types[String(ticket.type)] || 'Pós-venda em acompanhamento',
      responsibleText: status === 'waiting_seller' ? 'Vendedor' : status.startsWith('waiting_customer') ? 'Comprador' : status === 'waiting_marketplace' ? 'Magalu' : null,
      actions: !closed && status === 'waiting_seller' && ticket.type !== 'shipping_notification' ? [{ text: 'Avaliar e responder ao protocolo no Magalu', required: true, dueAt }] : [],
      dueAt, createdAt: magaluDate(ticket.created_at), updatedAt: magaluDate(ticket.updated_at), closedAt: null, problemText: null, detailComplete: true, returnDetails: null, messages: [], events: [], returnRecords: [] };
    for (const area of ['events', 'messages', 'returns'] as const) {
      try {
        const records = await collection(`/seller/v0/tickets/${claim.id}/${area}`);
        if (records.some(record => !uuidIsValid(record.id) || (record.ticket_id != null && record.ticket_id !== claim.id))) throw new Error('case_identity');
        if (area === 'messages') {
          if (records.some(record => typeof record.message !== 'string')) throw new Error('message_format');
          claim.messages = records.map(record => ({ id: String(record.id), text: magaluText(record.message, 2000), date: magaluDate(record.created_at) }));
        } else if (area === 'events') {
          claim.events = records.map(record => ({ id: String(record.id), text: events[String(record.type)] || 'Atualização registrada no Magalu', date: magaluDate(record.created_at) }));
          if (records.some(record => record.type === 'refunded')) details.refundText = 'Reembolso registrado no histórico do Magalu. Confira o relatório financeiro para os valores.';
        } else {
          // Uma remessa registrada não comprova entrega de retorno ou reembolso.
          claim.returnRecords = records.map(record => ({ id: String(record.id), statusText: 'Remessa de devolução registrada — entrega e andamento ainda precisam de confirmação no Magalu' }));
          if (records.length) { details.returnsComplete = false; details.warnings.push('Há remessa de devolução registrada. Esta consulta não confirma recebimento físico do produto.'); }
        }
      } catch (error) {
        claim.detailComplete = false;
        if (area === 'returns') details.returnsComplete = false;
        warn(area === 'events' ? 'histórico do protocolo' : area === 'messages' ? 'mensagens do protocolo' : 'devoluções', error, claim.id);
      }
    }
    details.claims.push(claim);
  }
  try {
    const reports = await collection('/seller/v1/financial-analysis/orders', new URLSearchParams({ order_id: snapshot.providerOrderId }));
    const entries = reports.flatMap(report => {
      if (report.external_id !== snapshot.providerOrderId || (objectValue(report.seller).id != null && ![seller, seller.replace(/^GENPUB\./, '')].includes(String(objectValue(report.seller).id)))) throw new Error('financial_identity');
      return magaluList(report.transactions).map(transaction => ({
        text: `${({ CREDIT: 'Crédito', DEBIT: 'Débito', INFORMATIVE: 'Informativo' } as Record<string, string>)[String(transaction.type)] || 'Movimentação'} · ${({ SALE: 'Receita de venda', REFUND: 'Estorno', COMMISSION: 'Comissão', FEES: 'Tarifa', SHIPPING_COST: 'Frete', DISCOUNT: 'Desconto', PROMOTION: 'Promoção', TAXES: 'Imposto' } as Record<string, string>)[String(transaction.category)] || 'Registro financeiro'}`,
        value: magaluMoney(transaction, 'value'), statusText: ({ ready: 'Disponível para processamento', payment_requested: 'Pagamento solicitado', concluded: 'Concluída' } as Record<string, string>)[String(transaction.status)] || 'Situação financeira em confirmação', date: magaluDate(transaction.transaction_at),
      }));
    });
    details.financialEntries = entries.slice(0, 200);
    if (entries.length > 200) warn('relatório financeiro completo', new Error('limit'));
  } catch (error) { warn('relatório financeiro', error); }
  const embeddedReturns = magaluList(order.deliveries).flatMap(pack => magaluList(pack.returns));
  if (embeddedReturns.length && !details.claims.some(claim => claim.returnRecords?.length)) {
    details.returnsComplete = false; details.warnings.push('O pedido informa processo de devolução, mas seu detalhamento ainda não foi confirmado. Confira no Magalu.');
  }
  details.processState = details.claims.some(claim => claim.processState === 'open') ? 'open' : !details.claimsComplete || !details.returnsComplete || details.claims.some(claim => claim.processState === 'unknown') ? 'unknown' : 'closed';
  return details;
}
