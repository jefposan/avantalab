/** Contratos oficiais: /post-purchase/v1/claims e /post-purchase/v2/claims/{id}/returns.
 * O retorno do produto e o reembolso nunca são inferidos do cancelamento do pedido.
 * Apenas campos permitidos chegam à tela; anexos e endereços brutos não.
 * Magalu usa os protocolos SAC; mensagens são texto seguro, nunca HTML executável.
 */
export type ReturnDetails = {
  processState: 'open' | 'closed' | 'unknown';
  id: string; statusText: string; moneyText: string; refundRuleText: string | null;
  physicalReturn: boolean; shipments: Array<{ id: string; statusText: string; destinationText: string; tracking: string | null }>;
};
export type ClaimDetails = {
  reference?: string;
  messages?: Array<{ id: string; text: string; date: string | null }>;
  events?: Array<{ id: string; text: string; date: string | null }>;
  returnRecords?: Array<{ id: string; statusText: string }>;
  processState: 'open' | 'closed' | 'unknown';
  id: string; statusText: string; typeText: string; reasonText: string;
  resolutionText: string | null; actions: Array<{ text: string; dueAt: string | null; required: boolean }>;
  stageText: string; responsibleText: string | null; dueAt: string | null;
  problemText: string | null; detailComplete: boolean;
  createdAt: string | null; updatedAt: string | null; closedAt: string | null;
  returnDetails: ReturnDetails | null;
};
export type PostSaleDetails = {
  provider?: 'mercado_livre' | 'magalu';
  financialEntries?: Array<{ text: string; value: number | null; statusText: string; date: string | null }>;
  processState?: 'open' | 'closed' | 'unknown';
  checkedAt: string; cancellation: { reasonText: string; requestedByText: string; date: string | null } | null;
  refundText: string; refundedAmount: number | null; currency: string;
  claims: ClaimDetails[]; claimsComplete: boolean; returnsComplete: boolean; warnings: string[];
  accessIssues: Array<{ area: string; claimId: string | null; permissionDenied: boolean; policyDenied: boolean }>;
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown, limit = 160) => typeof value === 'string' ? value.slice(0, limit) : '';
const id = (value: unknown) => /^\d{1,24}$/.test(String(value)) ? String(value) : '';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const cancelGroups: Record<string, string> = {
  mediations: 'Cancelamento relacionado a reclamação ou mediação', fiscal: 'Cancelamento por questão fiscal',
  buyer: 'Cancelamento relacionado ao comprador', seller: 'Cancelamento relacionado ao vendedor',
  fraud: 'Cancelamento por segurança ou suspeita de fraude', item: 'Cancelamento relacionado ao produto',
  shipment: 'Cancelamento relacionado ao envio', delivery: 'Cancelamento relacionado à entrega', internal: 'Cancelamento interno do Mercado Livre',
};
const actors: Record<string, string> = { buyer: 'Comprador', seller: 'Vendedor', meli: 'Mercado Livre', mercado_libre: 'Mercado Livre', mercado_livre: 'Mercado Livre', 'Mercado Livre': 'Mercado Livre' };
const reasons: Record<string, string> = {
  repentant_buyer: 'Comprador desistiu da compra', product_damaged: 'Produto danificado',
  return_incomplete: 'Devolução incompleta', delivery_lost: 'Produto extraviado', delivery_damaged: 'Produto danificado na entrega',
  delivery_delayed: 'Entrega atrasada', unavailable_product: 'Produto indisponível',
  not_expected_quality_item: 'Qualidade do produto diferente da esperada', wrong_warranty: 'Problema com a garantia',
};
const resolutions: Record<string, string> = {
  payment_refunded: 'Pagamento reembolsado ao comprador', partial_refunded: 'Pagamento parcialmente reembolsado',
  item_returned: 'Produto devolvido', return_canceled: 'Devolução cancelada pelo comprador', return_expired: 'Prazo da devolução encerrado',
  charged_back: 'Contestação do pagamento (contracargo)', coverage_decision: 'Mediação encerrada com cobertura do Mercado Livre',
  no_bpp: 'Encerrada sem cobertura do Mercado Livre', opened_claim_by_mistake: 'Reclamação aberta por engano',
  prefered_to_keep_product: 'Comprador decidiu ficar com o produto', worked_out_with_seller: 'Resolvida diretamente com o vendedor',
  seller_explained_functions: 'Vendedor orientou sobre o funcionamento', seller_sent_product: 'Vendedor enviou o produto',
  already_shipped: 'Produto a caminho', not_delivered: 'Produto não entregue', respondent_timeout: 'Prazo de resposta do vendedor encerrado',
  timeout: 'Prazo de ação do comprador encerrado', item_changed: 'Troca realizada', low_cost: 'Encerrada por custo de retorno maior que o produto',
  buyer_claim_opened: 'Encerrada por abertura de outra reclamação', buyer_dispute_opened: 'Encerrada por abertura de mediação',
};
const returnStates: Record<string, string> = {
  pending_cancel: 'Cancelamento da devolução em processamento', pending: 'Devolução iniciada — preparando retorno',
  failed: 'Falha na preparação da devolução', shipped: 'Devolução em trânsito', pending_delivered: 'Recebimento da devolução em confirmação',
  return_to_buyer: 'Produto retornando ao comprador', pending_expiration: 'Prazo da devolução em encerramento',
  scheduled: 'Coleta da devolução agendada', pending_failure: 'Problema na devolução em análise',
  label_generated: 'Aguardando postagem da devolução pelo comprador', cancelled: 'Devolução cancelada',
  not_delivered: 'Devolução não entregue ao destino', expired: 'Prazo da devolução encerrado', delivered: 'Devolução entregue ao destino',
};
const returnShipmentStates: Record<string, string> = {
  pending: 'Retorno em preparação', handling: 'Retorno em preparação', ready_to_ship: 'Retorno aguardando despacho',
  shipped: 'Retorno em trânsito', delivered: 'Retorno entregue ao destino', not_delivered: 'Retorno não entregue', cancelled: 'Envio de retorno cancelado',
};
const moneyStates: Record<string, string> = { retained: 'Dinheiro retido pelo Mercado Livre', refunded: 'Dinheiro reembolsado ao comprador', available: 'Dinheiro disponível, conforme o Mercado Livre' };
const stages: Record<string, string> = { claim: 'Tratativa entre comprador e vendedor', dispute: 'Mediação do Mercado Livre', recontact: 'Caso reaberto para novo contato', stale: 'Análise entre comprador e Mercado Livre', none: 'Sem etapa adicional informada' };
const actionNames: Record<string, string> = {
  send_message_to_complainant: 'Responder ao comprador no Mercado Livre', send_message_to_mediator: 'Responder à mediação no Mercado Livre',
  return_review: 'Revisar o produto devolvido no Mercado Livre', return_review_ok: 'Revisar o produto devolvido e informar que chegou conforme esperado no Mercado Livre',
  return_review_fail: 'Revisar o produto devolvido e informar um problema no Mercado Livre', refund: 'Avaliar reembolso no Mercado Livre',
  allow_partial_refund: 'Avaliar proposta de reembolso parcial no Mercado Livre', allow_return: 'Avaliar devolução no Mercado Livre',
  open_dispute: 'Solicitar mediação no Mercado Livre', send_shipping_evidence: 'Apresentar comprovante de envio no Mercado Livre',
};
const reasonCategories: Record<string, string> = { repentant: 'Comprador desistiu da compra', defective: 'Produto com defeito', incomplete: 'Produto incompleto', different: 'Produto diferente do esperado', not_working: 'Produto não funciona' };

/** Texto do problema é conteúdo do caso, nunca HTML nem instrução executável. */
function problemText(value: unknown) {
  const valueText = text(value, 600).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return valueText || null;
}

export function cancellationDetails(order: Record<string, unknown>): PostSaleDetails['cancellation'] {
  if (order.status !== 'cancelled' && order.status !== 'pending_cancel') return null;
  const detail = object(order.cancel_detail);
  return {
    reasonText: detail.code === 'pack_splitted' ? 'Pedido original dividido em novos pedidos (não confirma devolução)' : cancelGroups[text(detail.group)] || 'Motivo do cancelamento não disponibilizado em português pelo Mercado Livre',
    requestedByText: actors[text(detail.requested_by)] || 'Não informado pelo Mercado Livre', date: date(detail.date),
  };
}

export function refundDetails(order: Record<string, unknown>) {
  const payments = [...new Map(list(order.payments).map((payment, index) => [id(payment.id) || `payment-${index}`, payment])).values()];
  const known = payments.map((payment) => amount(payment.transaction_amount_refunded)).filter((value): value is number => value != null);
  const refundedAmount = known.length ? Math.round(known.reduce((sum, value) => sum + value, 0) * 100) / 100 : null;
  const partial = order.status === 'partially_refunded' || payments.some((payment) => payment.status_detail === 'partially_refunded');
  const refunded = order.status === 'refunded' || payments.some((payment) => payment.status === 'refunded') || (refundedAmount || 0) > 0;
  return {
    refundText: partial ? 'Reembolso parcial informado pelo Mercado Livre' : refunded ? 'Reembolso informado pelo Mercado Livre' : known.length === payments.length && payments.length > 0 ? 'Sem reembolso informado nos pagamentos desta consulta' : 'Dados de reembolso dos pagamentos não disponíveis nesta consulta',
    refundedAmount: refundedAmount && refundedAmount > 0 ? refundedAmount : null,
    currency: /^[A-Z]{3}$/.test(text(order.currency_id)) ? text(order.currency_id) : 'BRL',
  };
}

export function normalizeReturn(value: unknown, claimId: string, orderId: string): ReturnDetails {
  const data = object(value);
  const orders = list(data.orders);
  const claims = list(data.resources).filter((resource) => resource.resource === 'claim');
  const resourceMatches = data.resource_type === 'order' && id(data.resource_id) === orderId || data.resource_type === 'claim' && id(data.resource_id) === claimId;
  if (!id(data.id) || (id(data.claim_id) !== claimId && !claims.some((claim) => id(claim.resource_id) === claimId)) ||
      (orders.length ? !orders.some((order) => id(order.order_id) === orderId) : !resourceMatches)) {
    throw new Error('invalid_return');
  }
  const physicalReturn = data.subtype !== 'low_cost';
  const processState = data.status_money === 'retained' ? 'open' : !physicalReturn && data.status_money === 'refunded' ? 'closed'
    : ['delivered', 'cancelled', 'expired'].includes(text(data.status)) ? Object.hasOwn(moneyStates, text(data.status_money)) ? 'closed' : 'unknown'
    : Object.hasOwn(returnStates, text(data.status)) ? 'open' : 'unknown';
  return {
    id: id(data.id), physicalReturn,
    processState,
    statusText: physicalReturn ? returnStates[text(data.status)] || 'Situação da devolução ainda não traduzida — confira no Mercado Livre' : 'Caso sem devolução física do produto',
    moneyText: moneyStates[text(data.status_money)] || 'Situação do dinheiro não informada',
    // É uma condição do reembolso, não a confirmação de que ele aconteceu.
    refundRuleText: data.refund_at === 'shipped' ? 'Regra do ML: reembolso previsto após postagem do retorno; não confirma pagamento.' : data.refund_at === 'delivered' ? 'Regra do ML: reembolso previsto após recebimento e análise do retorno; não confirma pagamento.' : null,
    shipments: list(data.shipments).slice(0, 10).map((shipment) => ({
      id: id(shipment.shipment_id), statusText: returnShipmentStates[text(shipment.status)] || 'Situação do retorno não informada',
      destinationText: object(shipment.destination).name === 'warehouse' ? 'Depósito do Mercado Livre' : object(shipment.destination).name === 'seller_address' ? 'Endereço do vendedor' : 'Destino não informado',
      tracking: text(shipment.tracking_number, 120) || null,
    })),
  };
}

function lookupWarning(error: unknown, area: string) {
  const code = text(object(error).code);
  if (code === 'provider_403' || code === 'provider_policy_403') return `O Mercado Livre não autorizou a consulta: ${area} (403). ${code === 'provider_policy_403' ? 'A política de acesso do Mercado Livre recusou o recurso. ' : ''}Confira as permissões do aplicativo e a autorização da conta; a conta não foi desconectada.`;
  if (code === 'provider_429') return `Limite de consultas do Mercado Livre atingido: ${area}. Aguarde e atualize o pós-venda.`;
  if (code === 'reconnect' || code === 'provider_401') return `A autorização da conta precisa ser renovada para consultar ${area}. Reconecte a mesma conta do pedido.`;
  return `Não foi possível consultar ${area}. Atualize ou confira diretamente no Mercado Livre.`;
}

/** Leitura injetada mantém a orquestração testável e sem acesso direto a credenciais. */
export async function readPostSale(order: Record<string, unknown>, sellerId: string, read: (path: string) => Promise<unknown>): Promise<PostSaleDetails> {
  const orderId = id(order.id);
  if (!orderId || id(object(order.seller).id) !== sellerId) throw new Error('invalid_order_owner');
  const result: PostSaleDetails = { checkedAt: new Date().toISOString(), cancellation: cancellationDetails(order), ...refundDetails(order), claims: [], claimsComplete: false, returnsComplete: false, warnings: [], accessIssues: [] };
  const warn = (error: unknown, area: string, claimId: string | null = null) => {
    const code = text(object(error).code);
    result.accessIssues.push({ area, claimId, permissionDenied: ['provider_403', 'provider_policy_403'].includes(code), policyDenied: code === 'provider_policy_403' });
    result.warnings.push(lookupWarning(error, area));
  };
  let claims: Record<string, unknown>[] = [];
  try {
    // Busca delimitada pelo pedido, sem filtro de status: inclui casos abertos e encerrados.
    const search = object(await read(`/post-purchase/v1/claims/search?order_id=${orderId}&limit=20&offset=0&sort=date_created:desc&players.user_id=${sellerId}&players.role=respondent`));
    if (!Array.isArray(search.data) || !Number.isInteger(object(search.paging).total) || Number(object(search.paging).total) < 0) throw new Error('invalid_claim_search');
    claims = [...new Map(list(search.data).map((claim) => [id(claim.id), claim])).values()];
    if (claims.some((claim) => !id(claim.id))) throw new Error('invalid_claim');
    result.claimsComplete = Number(object(search.paging).total) === claims.length && claims.length <= 5;
    result.returnsComplete = result.claimsComplete;
    if (!result.claimsComplete) result.warnings.push('Mostrando até 5 casos recentes. Há mais casos ou a consulta está incompleta; confira o histórico completo no Mercado Livre.');
  } catch (error) {
    warn(error, 'busca de reclamações deste pedido');
    // IDs fornecidos pelo próprio pedido, nunca adivinhados. Cada caso será
    // autorizado pelo ML e validado pelo pedido/vendedor abaixo. Não atesta histórico completo.
    claims = [...new Map(list(order.mediations).filter((entry) => id(entry.id)).map((entry) => [id(entry.id), entry])).values()];
    if (claims.length) result.warnings.push('Consultando os casos identificados no próprio pedido. A busca completa de reclamações continua indisponível.');
  }
  result.claims = (await Promise.all(claims.slice(0, 5).map(async (entry): Promise<ClaimDetails | null> => {
      try {
        const claim = object(await read(`/post-purchase/v1/claims/${id(entry.id)}`));
        const sellers = list(claim.players).filter((player) => player.type === 'seller');
        if (id(claim.id) !== id(entry.id) || claim.resource !== 'order' || id(claim.resource_id) !== orderId || !sellers.some((seller) => id(seller.user_id) === sellerId)) throw new Error('invalid_claim_owner');
        const typeText = ({ mediations: 'Reclamação', return: 'Devolução', fulfillment: 'Reclamação de envio Full', ml_case: 'Caso do Mercado Livre', cancel_sale: 'Cancelamento pelo vendedor', cancel_purchase: 'Cancelamento pelo comprador', change: 'Troca', service: 'Caso de serviço' } as Record<string, string>)[text(claim.type)] || 'Caso de pós-venda';
        const detail: ClaimDetails = {
          processState: claim.status === 'closed' ? 'closed' : claim.status === 'opened' ? 'open' : 'unknown',
          id: id(claim.id), typeText, statusText: claim.status === 'closed' ? 'Encerrada' : claim.status === 'opened' ? claim.stage === 'dispute' ? 'Em mediação com o Mercado Livre' : 'Aberta' : 'Situação não informada',
          reasonText: 'Motivo específico não disponibilizado em português pelo Mercado Livre',
          stageText: stages[text(claim.stage)] || 'Etapa não informada pelo Mercado Livre', responsibleText: null, dueAt: null,
          problemText: null, detailComplete: false, createdAt: date(claim.date_created), updatedAt: date(claim.last_updated), closedAt: date(object(claim.resolution).date_created),
          resolutionText: object(claim.resolution).reason ? resolutions[text(object(claim.resolution).reason)] || 'Caso encerrado com resolução não traduzida — confira no Mercado Livre' : null,
          actions: claim.status === 'opened' ? sellers.filter((seller) => id(seller.user_id) === sellerId).flatMap((seller) => list(seller.available_actions)).slice(0, 20).map((action) => ({ text: actionNames[text(action.action)] || 'Consultar ação disponível no Mercado Livre', dueAt: date(action.due_date), required: action.mandatory === true })) : [],
          returnDetails: null,
        };
        const hasReturn = claim.type === 'return' || (Array.isArray(claim.related_entities) && claim.related_entities.includes('return'));
        if (!Array.isArray(claim.related_entities) && !hasReturn) {
          result.returnsComplete = false;
          result.warnings.push('O Mercado Livre não informou todas as entidades de um caso. A ausência de devolução não pode ser confirmada.');
        }
        await Promise.all([
          (async () => {
            try {
              const info = object(await read(`/post-purchase/v1/claims/${detail.id}/detail`));
              if (!['action_responsible', 'due_date', 'problem', 'title', 'description'].some((key) => Object.hasOwn(info, key))) throw new Error('invalid_claim_detail');
              detail.detailComplete = true;
              detail.problemText = problemText(info.problem);
              detail.responsibleText = ({ seller: 'Vendedor — sua conta', buyer: 'Comprador', mediator: 'Mercado Livre' } as Record<string, string>)[text(info.action_responsible)] || null;
              // Prazo de caso encerrado não é pendência atual.
              detail.dueAt = claim.status === 'opened' ? date(info.due_date) : null;
            } catch (error) { warn(error, 'detalhamento da reclamação', detail.id); }
          })(),
          (async () => {
            const reasonId = text(claim.reason_id);
            if (!/^[A-Za-z0-9_-]{1,80}$/.test(reasonId)) return;
            try {
              const reason = object(await read(`/post-purchase/v1/claims/reasons/${reasonId}`));
              const categories = object(reason.settings).rules_engine_triage;
              const translated = Array.isArray(categories) ? categories.filter((value): value is string => typeof value === 'string').map((value) => reasonCategories[value]).filter(Boolean) : [];
              detail.reasonText = reasons[text(reason.name)] || (translated.length ? `Categoria informada: ${[...new Set(translated)].join('; ')}` : detail.reasonText);
            } catch (error) { warn(error, 'motivo da reclamação', detail.id); }
          })(),
          (async () => {
            if (!hasReturn) return;
            try { detail.returnDetails = normalizeReturn(await read(`/post-purchase/v2/claims/${detail.id}/returns`), detail.id, orderId); }
            catch (error) { result.returnsComplete = false; warn(error, 'devolução do produto', detail.id); }
          })(),
        ]);
        return detail;
      } catch (error) { result.claimsComplete = false; result.returnsComplete = false; warn(error, 'dados da reclamação', id(entry.id)); return null; }
    }))).filter((claim): claim is ClaimDetails => claim != null);
  if (object(order.order_request).return != null && !result.claims.some((claim) => claim.returnDetails)) {
    result.returnsComplete = false;
    result.warnings.push('O pedido indica uma solicitação de retorno, mas os detalhes da devolução não foram confirmados nesta consulta.');
  }
  result.warnings = [...new Set(result.warnings)];
  result.checkedAt = new Date().toISOString();
  result.processState = result.claims.some(claim => claim.processState === 'open' || claim.returnDetails?.processState === 'open') ? 'open'
    : !result.claimsComplete || !result.returnsComplete || result.claims.some(claim => claim.processState !== 'closed' || claim.returnDetails?.processState === 'unknown') ? 'unknown' : 'closed';
  return result;
}
