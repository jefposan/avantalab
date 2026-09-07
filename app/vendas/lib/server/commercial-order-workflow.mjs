export const COMMERCIAL_ORDER_WORKFLOW_REFERENCE = '2026-09-04';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,80}$/;
const TARGETS = new Set(['confirmado', 'em_separacao', 'faturado', 'cancelado', 'devolvido']);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const digits = (value, max = 14) => clean(value).replace(/\D/g, '').slice(0, max);
const issue = (code, field, message) => ({ code, field, message });

function firstError(result, fallback) {
  return Array.isArray(result?.errors) && result.errors[0] ? result.errors[0] : fallback;
}

function snapshot(operation, extra = {}) {
  return {
    operationId: operation.id,
    year: operation.year,
    number: operation.number,
    version: operation.version,
    status: operation.status,
    stockStatus: operation.stockStatus,
    fiscalStatus: operation.fiscalStatus,
    fiscalDraftId: clean(extra.fiscalDraftId, 36),
    fiscalDraftStatus: clean(extra.fiscalDraftStatus, 40),
    receivableCount: Number(extra.receivableCount) || 0,
    stockIntegrated: operation.stockStatus !== 'sem_movimentacao',
  };
}

export function createCommercialOrderWorkflow({ customerRepository, customerService, operationService, lifecycleService, billingService } = {}) {
  if (!customerRepository?.findByDocument || !customerService?.create || !operationService?.create || !operationService?.get
    || !lifecycleService?.confirm || !lifecycleService?.startSeparation || !lifecycleService?.cancel || !lifecycleService?.returnInvoiced || !billingService?.invoice) {
    throw new TypeError('Informe os serviços server-side do fluxo comercial.');
  }

  return Object.freeze({
    async advance({ context, target, operationId = '', persistenceKey, customer, order } = {}) {
      const normalizedTarget = clean(target, 30).toLowerCase();
      const key = clean(persistenceKey, 80);
      const stockLocationId = clean(order?.stockLocationId, 36);
      if (!TARGETS.has(normalizedTarget) || !KEY.test(key)) {
        return { ok: false, errors: [issue('AV-COMMERCIAL-WORKFLOW-INPUT', 'order', 'Atualize o pedido antes de continuar.')] };
      }

      let current;
      let customerRecord = null;
      if (operationId) {
        if (!UUID.test(clean(operationId, 36))) return { ok: false, errors: [issue('AV-COMMERCIAL-WORKFLOW-ID', 'order', 'O vínculo persistido do pedido é inválido.')] };
        const loaded = await operationService.get({ context, operationId: clean(operationId, 36), channel: 'vendas' });
        if (!loaded?.ok || !loaded.operation) return { ok: false, errors: [firstError(loaded, issue('AV-COMMERCIAL-WORKFLOW-NOT-FOUND', 'order', 'Pedido persistido não localizado.'))] };
        current = loaded.operation;
      } else {
        const document = digits(customer?.document);
        if (![11, 14].includes(document.length)) return { ok: false, errors: [issue('AV-COMMERCIAL-WORKFLOW-CUSTOMER', 'customer', 'Selecione um cliente com CPF ou CNPJ válido.')] };
        customerRecord = await customerRepository.findByDocument({ companyId: context.companyId, document });
        if (customerRecord?.status === 'inativo') return { ok: false, errors: [issue('AV-COMMERCIAL-WORKFLOW-CUSTOMER', 'customer', 'O cliente está inativo nesta empresa.')] };
        if (!customerRecord) {
          const createdCustomer = await customerService.create({ context, input: customer });
          if (!createdCustomer?.ok) return { ok: false, errors: [firstError(createdCustomer, issue('AV-COMMERCIAL-WORKFLOW-CUSTOMER', 'customer', 'Não foi possível registrar o cliente.'))], warnings: createdCustomer?.warnings || [] };
          customerRecord = createdCustomer.customer;
        }
        const createdOrder = await operationService.create({
          context,
          input: { ...order, type: 'pedido', channel: 'vendas', customerId: customerRecord.id, idempotencyKey: `order:${key}` },
        });
        if (!createdOrder?.ok || !createdOrder.operation) return { ok: false, errors: [firstError(createdOrder, issue('AV-COMMERCIAL-WORKFLOW-CREATE', 'order', 'Não foi possível salvar o pedido.'))], warnings: createdOrder?.warnings || [] };
        current = createdOrder.operation;
      }

      const refresh = async () => {
        const loaded = await operationService.get({ context, operationId: current.id, channel: 'vendas' });
        if (!loaded?.ok || !loaded.operation) throw Object.assign(new Error('Pedido persistido indisponível.'), { publicIssue: firstError(loaded, issue('AV-COMMERCIAL-WORKFLOW-LOAD', 'order', 'Não foi possível atualizar o pedido persistido.')) });
        current = loaded.operation;
      };

      try {
        if (normalizedTarget === 'cancelado' && ['salvo', 'confirmado', 'em_separacao'].includes(current.status)) {
          const canceled = await lifecycleService.cancel({ context, orderId: current.id, expectedVersion: current.version, idempotencyKey: `order:${key}:cancel` });
          if (!canceled?.ok) return { ok: false, errors: [firstError(canceled, issue('AV-COMMERCIAL-WORKFLOW-CANCEL', 'order', 'Não foi possível cancelar o pedido.'))] };
          await refresh();
        }
        if (normalizedTarget === 'devolvido' && current.status === 'faturado') {
          const returned = await lifecycleService.returnInvoiced({ context, orderId: current.id, expectedVersion: current.version, idempotencyKey: `order:${key}:return` });
          if (!returned?.ok) return { ok: false, errors: [firstError(returned, issue('AV-COMMERCIAL-WORKFLOW-RETURN', 'order', 'Não foi possível registrar a devolução.'))] };
          await refresh();
        }
        if (current.status === 'salvo' && ['confirmado', 'em_separacao', 'faturado'].includes(normalizedTarget)) {
          const confirmed = await lifecycleService.confirm({ context, orderId: current.id, localId: stockLocationId, expectedVersion: current.version, idempotencyKey: `order:${key}:confirm` });
          if (!confirmed?.ok) return { ok: false, errors: [firstError(confirmed, issue('AV-COMMERCIAL-WORKFLOW-CONFIRM', 'order', 'Não foi possível confirmar o pedido.'))] };
          await refresh();
        }
        if (current.status === 'confirmado' && ['em_separacao', 'faturado'].includes(normalizedTarget)) {
          const separated = await lifecycleService.startSeparation({ context, orderId: current.id, expectedVersion: current.version, idempotencyKey: `order:${key}:separate` });
          if (!separated?.ok) return { ok: false, errors: [firstError(separated, issue('AV-COMMERCIAL-WORKFLOW-SEPARATE', 'order', 'Não foi possível iniciar a separação.'))] };
          await refresh();
        }
        let billing = {};
        if (current.status === 'em_separacao' && normalizedTarget === 'faturado') {
          const invoiced = await billingService.invoice({ context, orderId: current.id, expectedVersion: current.version, idempotencyKey: `order:${key}:invoice` });
          if (!invoiced?.ok) return { ok: false, errors: [firstError(invoiced, issue('AV-COMMERCIAL-WORKFLOW-INVOICE', 'order', 'Não foi possível faturar o pedido.'))] };
          billing = invoiced.result || {};
          await refresh();
        }
        if (current.status !== normalizedTarget) {
          return { ok: false, errors: [issue('AV-COMMERCIAL-WORKFLOW-STATE', 'status', 'O pedido está em uma etapa incompatível com esta ação.')] };
        }
        return { ok: true, customerId: customerRecord?.id || current.customerId, order: snapshot(current, billing), errors: [] };
      } catch (cause) {
        return { ok: false, errors: [cause?.publicIssue || issue('AV-COMMERCIAL-WORKFLOW-STORAGE', 'storage', 'Não foi possível concluir o fluxo comercial. Tente novamente.')] };
      }
    },
  });
}
