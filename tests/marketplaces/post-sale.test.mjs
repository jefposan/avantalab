import assert from 'node:assert/strict';
import test from 'node:test';
import { readPostSale, refundDetails, normalizeReturn, cancellationDetails } from '../../app/modules/marketplaces/post-sale.ts';
import { saleConflictText, saleStatusText } from '../../app/modules/marketplaces/sales-status.ts';

const order = (overrides = {}) => ({ id: 2000018759586622, seller: { id: 123 }, status: 'cancelled', currency_id: 'BRL', payments: [{ id: 1, status: 'approved', transaction_amount_refunded: 0 }], ...overrides });
const claim = (overrides = {}) => ({ id: 987, resource: 'order', resource_id: order().id, type: 'return', status: 'opened', stage: 'claim', reason_id: 'PDD9939', related_entities: ['return'], players: [{ type: 'seller', user_id: 123, available_actions: [] }], ...overrides });
const returned = (overrides = {}) => ({ id: 321, claim_id: 987, resource_type: 'order', resource_id: order().id, orders: [{ order_id: order().id }], status: 'shipped', status_money: 'retained', refund_at: 'shipped', subtype: 'return_total', shipments: [{ shipment_id: 222, status: 'shipped', tracking_number: 'TRACK', destination: { name: 'seller_address', shipping_address: { address_line: 'PRIVATE' } } }], ...overrides });
const provider = (cases = [claim()], returnValue = returned()) => async (path) => {
  if (path.includes('/claims/search?')) return { data: cases, paging: { total: cases.length } };
  if (path.includes('/claims/reasons/')) return { name: 'repentant_buyer', detail: 'Spanish raw text' };
  if (path.endsWith('/returns')) return returnValue;
  if (path === '/post-purchase/v1/claims/987') return cases[0];
  throw new Error(`Unexpected path: ${path}`);
};

test('cancelada com entrega original não é automaticamente uma devolução ou reembolso', async () => {
  const sale = { status: 'cancelled', shipmentStatus: 'delivered', shipmentSubstatus: null, labelStatus: 'unavailable' };
  assert.equal(saleStatusText(sale), 'Cancelada · envio original entregue');
  assert.match(saleConflictText(sale), /não confirma devolução.*nem reembolso/);
  const result = await readPostSale(order(), '123', provider([]));
  assert.equal(result.claimsComplete, true);
  assert.equal(result.returnsComplete, true);
  assert.equal(result.claims.length, 0);
  assert.match(result.refundText, /Sem reembolso informado/);
  assert.equal(result.refundedAmount, null);
});

test('consulta utiliza o pedido exato e inclui reclamações encerradas', async () => {
  const paths = [];
  const read = provider([claim({ status: 'closed', resolution: { reason: 'payment_refunded' } })], returned({ status_money: 'refunded' }));
  const result = await readPostSale(order(), '123', async (path) => { paths.push(path); return read(path); });
  assert.match(paths[0], /order_id=2000018759586622&limit=20&offset=0/);
  assert.ok(paths.every((path) => !path.includes('status=opened')));
  assert.equal(result.claims[0].statusText, 'Encerrada');
  assert.equal(result.claims[0].reasonText, 'Comprador desistiu da compra');
  assert.equal(result.claims[0].resolutionText, 'Pagamento reembolsado ao comprador');
  assert.equal(result.claims[0].returnDetails.moneyText, 'Dinheiro reembolsado ao comprador');
});

test('retorno em trânsito, destino e regra financeira ficam separados', async () => {
  const result = await readPostSale(order(), '123', provider());
  const data = result.claims[0].returnDetails;
  assert.equal(data.statusText, 'Devolução em trânsito');
  assert.equal(data.moneyText, 'Dinheiro retido pelo Mercado Livre');
  assert.match(data.refundRuleText, /não confirma pagamento/);
  assert.equal(data.shipments[0].destinationText, 'Endereço do vendedor');
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.ok(!JSON.stringify(result).includes('Spanish raw text'));
});

test('retorno entregue ao depósito não é apresentado como recebido pelo vendedor', () => {
  const data = normalizeReturn(returned({ status: 'delivered', shipments: [{ status: 'delivered', destination: { name: 'warehouse' } }] }), '987', String(order().id));
  assert.equal(data.statusText, 'Devolução entregue ao destino');
  assert.equal(data.shipments[0].destinationText, 'Depósito do Mercado Livre');
  assert.ok(!data.statusText.includes('vendedor'));
  // Contrato oficial também permite recurso claim; ela já pertence ao pedido verificado.
  const claimResource = normalizeReturn(returned({ orders: [], resource_type: 'claim', resource_id: 987 }), '987', String(order().id));
  assert.equal(claimResource.id, '321');
  assert.throws(() => normalizeReturn(returned({ orders: [], resource_type: 'claim', resource_id: 999 }), '987', String(order().id)), /invalid_return/);
});

test('devolução cancelada e caso low cost não viram produto recebido', () => {
  assert.equal(normalizeReturn(returned({ status: 'cancelled', status_money: 'available' }), '987', String(order().id)).statusText, 'Devolução cancelada');
  const low = normalizeReturn(returned({ subtype: 'low_cost', shipments: [], status_money: 'refunded' }), '987', String(order().id));
  assert.equal(low.physicalReturn, false);
  assert.equal(low.statusText, 'Caso sem devolução física do produto');
});

test('reembolso parcial e valor usam pagamentos, sem deduplicar por aproximação', () => {
  const payment = { id: 1, status: 'approved', status_detail: 'partially_refunded', transaction_amount_refunded: 20.15 };
  const data = refundDetails(order({ payments: [payment, payment, { id: 2, transaction_amount_refunded: 1.1 }] }));
  assert.equal(data.refundedAmount, 21.25);
  assert.match(data.refundText, /parcial/);
  assert.equal(refundDetails(order({ payments: [] })).refundedAmount, null);
  assert.match(refundDetails(order({ payments: [] })).refundText, /não disponíveis/);
  assert.match(refundDetails(order({ payments: [{ id: 1, status: 'refunded' }] })).refundText, /Reembolso informado/);
});

test('permissão negada não equivale a ausência de devolução nem desconexão', async () => {
  const result = await readPostSale(order(), '123', async () => { throw Object.assign(new Error('SECRET'), { code: 'provider_403' }); });
  assert.equal(result.claimsComplete, false);
  assert.equal(result.returnsComplete, false);
  assert.match(result.warnings[0], /não autorizou.*não foi desconectada/);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});

test('erro no retorno mantém reclamação mas não informa nenhuma devolução', async () => {
  const read = provider();
  const result = await readPostSale(order(), '123', async (path) => { if (path.endsWith('/returns')) throw Object.assign(new Error(), { code: 'provider_404' }); return read(path); });
  assert.equal(result.claims.length, 1);
  assert.equal(result.claimsComplete, true);
  assert.equal(result.returnsComplete, false);
  assert.equal(result.claims[0].returnDetails, null);
});

test('dados desconhecidos permanecem em português, sem inventar motivo ou estado', async () => {
  const read = provider([claim({ resolution: { reason: 'new_reason' } })], returned({ status: 'future_status', status_money: 'future_money' }));
  const result = await readPostSale(order(), '123', async (path) => path.includes('/reasons/') ? { name: 'new_reason', detail: 'Untranslated' } : read(path));
  assert.match(result.claims[0].reasonText, /não disponibilizado em português/);
  assert.match(result.claims[0].returnDetails.statusText, /ainda não traduzida/);
  assert.ok(!JSON.stringify(result).includes('future_status'));
  assert.ok(!JSON.stringify(result).includes('Untranslated'));
});

test('ações e prazo do vendedor são informados sem executar uma mutação', async () => {
  const current = claim({ players: [{ type: 'seller', user_id: 123, available_actions: [{ action: 'send_message_to_mediator', mandatory: true, due_date: '2026-10-12T12:00:00.000Z' }, { action: 'return_review_ok' }] }] });
  const result = await readPostSale(order(), '123', provider([current]));
  assert.match(result.claims[0].actions[0].text, /Responder à mediação/);
  assert.equal(result.claims[0].actions[0].dueAt, '2026-10-12T12:00:00.000Z');
  assert.match(result.claims[0].actions[1].text, /Revisar o produto/);
});

test('cancellation usa categoria documentada e não confunde split com devolução', () => {
  assert.match(cancellationDetails(order({ cancel_detail: { code: 'pack_splitted', group: 'shipment', requested_by: 'seller' } })).reasonText, /dividido em novos pedidos/);
  assert.equal(cancellationDetails(order({ status: 'paid' })), null);
  assert.equal(cancellationDetails(order({ cancel_detail: { group: 'mediations', requested_by: 'buyer' } })).requestedByText, 'Comprador');
});

test('pedido, reclamação e retorno de outra conta não são apresentados', async () => {
  let reads = 0;
  await assert.rejects(readPostSale(order({ seller: { id: 999 } }), '123', async () => { reads++; }), /owner/);
  assert.equal(reads, 0);
  const result = await readPostSale(order(), '123', provider([claim({ players: [{ type: 'seller', user_id: 999 }] })]));
  assert.equal(result.claims.length, 0);
  assert.equal(result.claimsComplete, false);
  assert.throws(() => normalizeReturn(returned({ orders: [{ order_id: 555 }] }), '987', String(order().id)), /invalid_return/);
  assert.throws(() => normalizeReturn(returned({ claim_id: 999 }), '987', String(order().id)), /invalid_return/);
});

test('limite de histórico ou resposta malformada não vira ausência de pós-venda', async () => {
  const result = await readPostSale(order(), '123', async () => ({ data: [], paging: { total: 30 } }));
  assert.equal(result.claimsComplete, false);
  assert.match(result.warnings[0], /histórico completo/);
  const invalid = await readPostSale(order(), '123', async () => ({ data: 'broken' }));
  assert.equal(invalid.claimsComplete, false);
  assert.ok(invalid.warnings.length);
});

test('pedido com solicitação de retorno sem claims ou entidades incompletas exige confirmação', async () => {
  const hinted = await readPostSale(order({ order_request: { return: { id: 99 } } }), '123', provider([]));
  assert.equal(hinted.returnsComplete, false);
  const missing = await readPostSale(order(), '123', provider([claim({ type: 'mediations', related_entities: undefined })]));
  assert.equal(missing.returnsComplete, false);
});
