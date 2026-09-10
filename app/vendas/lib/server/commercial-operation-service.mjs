import { createHash } from 'node:crypto';

export const COMMERCIAL_OPERATION_SERVICE_REFERENCE = '2026-09-03';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9:_-]{8,160}$/;
const HASH = /^[0-9a-f]{64}$/;
const MAX_CENTS = 999_999_999;
const MAX_QUANTITY_MILLI = 999_999_999;

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value, 10));
  if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function text(value, max = 1000) {
  return (typeof value === 'string' ? value : String(value ?? '')).trim().slice(0, max);
}

function error(code, field, message) {
  return { code, field, message };
}

function parseScaled(value, scale) {
  const raw = text(value).replace(/R\$/gi, '').replace(/\s/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${scale}})?$`).test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const result = BigInt(whole) * (10n ** BigInt(scale)) + BigInt(fraction.padEnd(scale, '0'));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}

function moneyFromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function quantityFromMilli(milli) {
  return Number((milli / 1000).toFixed(3));
}

function lineCents(quantityMilli, unitCents) {
  return Number((BigInt(quantityMilli) * BigInt(unitCents) + 500n) / 1000n);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function requiredPermission(channel, action) {
  return `${channel === 'servicos' ? 'services' : 'sales'}.${action}`;
}

function accessError(context, permission) {
  if (!context || !UUID.test(text(context.companyId)) || !UUID.test(text(context.actorId))) {
    return error('AV-COMMERCIAL-SESSION', 'session', 'A sessão e a empresa ativa precisam ser confirmadas novamente.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return error('AV-COMMERCIAL-MODULE', 'module', 'O acesso informado não pertence ao módulo Vendas e Serviços.');
  }
  if (!context.active || !context.moduleActive) {
    return error('AV-COMMERCIAL-ACCESS', 'access', 'O vínculo e o módulo Vendas e Serviços precisam estar ativos.');
  }
  if (context.effectivePermissions?.[permission] !== true) {
    return error('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite realizar esta ação comercial.');
  }
  return null;
}

function normalizePayment(input = {}) {
  const installments = Math.min(120, Math.max(1, Number.parseInt(input.installments, 10) || 1));
  return {
    method: text(input.method, 40).toLowerCase(),
    installments,
    firstDueDate: validDate(input.firstDueDate) ? text(input.firstDueDate, 10) : '',
    notes: text(input.notes, 500),
  };
}

function normalizeDelivery(input = {}) {
  return {
    mode: text(input.mode, 40).toLowerCase(),
    expectedDate: validDate(input.expectedDate) ? text(input.expectedDate, 10) : '',
    postalCode: text(input.postalCode).replace(/\D/g, '').slice(0, 8),
    address: text(input.address, 240),
    notes: text(input.notes, 500),
  };
}

function customerSnapshot(customer) {
  return {
    id: customer.id,
    code: customer.code,
    documentType: customer.documentType,
    document: customer.document,
    legalName: customer.legalName,
    tradeName: customer.tradeName || '',
    displayName: customer.displayName,
    stateRegistration: customer.stateRegistration || '',
    municipalRegistration: customer.municipalRegistration || '',
    stateRegistrationIndicator: customer.stateRegistrationIndicator,
    consumerFinal: customer.consumerFinal === true,
    email: customer.email || '',
    phone: customer.phone || '',
    address: {
      postalCode: customer.postalCode || '', street: customer.street || '', number: customer.number || '',
      complement: customer.complement || '', district: customer.district || '', city: customer.city || '',
      cityCode: customer.cityCode || '', state: customer.state || '',
    },
    version: customer.version,
  };
}

function catalogSnapshot(item) {
  const fiscal = item.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
  return {
    ncm: text(fiscal.ncm, 8), cest: text(fiscal.cest, 7), cfop: text(fiscal.cfop, 4),
    cst: text(fiscal.cst, 4), csosn: text(fiscal.csosn, 4),
    originCode: text(fiscal.originCode, 1), taxableUnit: text(fiscal.taxableUnit, 20),
    pisCst: text(fiscal.pisCst, 2), cofinsCst: text(fiscal.cofinsCst, 2),
    ibsCbsCst: text(fiscal.ibsCbsCst, 6), ibsCbsClassification: text(fiscal.ibsCbsClassification, 20),
    nationalServiceCode: text(fiscal.nationalServiceCode, 20),
    municipalServiceCode: text(fiscal.municipalServiceCode, 20),
    itemLc116: text(fiscal.itemLc116, 20), nbs: text(fiscal.nbs, 12),
    taxableMunicipality: text(fiscal.taxableMunicipality, 120),
  };
}

function repositoryError(cause) {
  const messages = {
    'AV-COMMERCIAL-OPERATION-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já foi usada com outro conteúdo. Atualize a página antes de tentar novamente.'],
    'AV-COMMERCIAL-OPERATION-CONFLICT': ['version', 'O documento foi alterado por outra pessoa. Atualize os dados antes de salvar novamente.'],
    'AV-COMMERCIAL-OPERATION-NOT-FOUND': ['operation', 'Documento comercial não localizado nesta empresa.'],
    'AV-COMMERCIAL-OPERATION-NOT-EDITABLE': ['status', 'Este documento não pode mais ser alterado.'],
    'AV-COMMERCIAL-OPERATION-ALREADY-CONVERTED': ['operation', 'Este orçamento já foi convertido.'],
  };
  const known = messages[cause?.code];
  return known ? error(cause.code, known[0], known[1]) : error('AV-COMMERCIAL-OPERATION-STORAGE', 'storage', 'Não foi possível concluir a operação comercial. Tente novamente.');
}

async function prepareOperation({ input, context, customerResolver, catalogResolver }) {
  const errors = [];
  const warnings = [];
  const type = text(input?.type, 30).toLowerCase();
  const channel = text(input?.channel || 'vendas', 20).toLowerCase();
  if (!['vendas', 'servicos'].includes(channel)) errors.push(error('AV-COMMERCIAL-CHANNEL', 'channel', 'Selecione Vendas ou Serviços.'));
  if (type !== 'orcamento' && !(type === 'pedido' && channel === 'vendas')) {
    errors.push(error('AV-COMMERCIAL-OPERATION-TYPE', 'type', 'Nesta etapa, crie um orçamento ou um pedido de venda.'));
  }
  const customerId = text(input?.customerId, 36);
  if (!UUID.test(customerId)) errors.push(error('AV-COMMERCIAL-OPERATION-CUSTOMER', 'customerId', 'Selecione um cliente válido.'));
  const priceTableId = text(input?.priceTableId, 36);
  if (priceTableId && !UUID.test(priceTableId)) errors.push(error('AV-COMMERCIAL-PRICE-TABLE', 'priceTableId', 'Selecione uma tabela de preços válida.'));
  const sellerId = text(input?.sellerId, 36);
  if (sellerId && !UUID.test(sellerId)) errors.push(error('AV-COMMERCIAL-SELLER', 'sellerId', 'Selecione um vendedor válido ou deixe o campo vazio.'));
  const idempotencyKey = text(input?.idempotencyKey, 160);
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) errors.push(error('AV-COMMERCIAL-IDEMPOTENCY', 'idempotencyKey', 'Atualize a página para gerar uma solicitação válida.'));
  const requestedItems = Array.isArray(input?.items) ? input.items : [];
  if (!requestedItems.length) errors.push(error('AV-COMMERCIAL-ITEMS', 'items', 'Adicione ao menos um produto ou serviço.'));
  if (requestedItems.length > 200) errors.push(error('AV-COMMERCIAL-ITEM-LIMIT', 'items', 'Cada documento pode possuir até 200 itens.'));
  if (errors.length) return { errors, warnings };

  const customer = await customerResolver({ companyId: context.companyId, customerId });
  if (!customer || customer.status === 'inativo') {
    return { errors: [error('AV-COMMERCIAL-OPERATION-CUSTOMER', 'customerId', 'O cliente não está ativo nesta empresa.')], warnings };
  }
  const itemIds = requestedItems.map((item) => text(item?.catalogItemId, 36));
  if (itemIds.some((id) => !UUID.test(id))) {
    return { errors: [error('AV-COMMERCIAL-CATALOG-ITEM', 'items', 'Selecione somente itens publicados no catálogo.')], warnings };
  }
  const catalogResult = await catalogResolver({ companyId: context.companyId, priceTableId, itemIds });
  const catalogItems = Array.isArray(catalogResult?.items) ? catalogResult.items : [];
  const byId = new Map(catalogItems.map((item) => [item.id, item]));
  const lines = [];
  let subtotalCents = 0;
  let itemDiscountCents = 0;
  for (let index = 0; index < requestedItems.length; index += 1) {
    const requested = requestedItems[index];
    const source = byId.get(itemIds[index]);
    if (!source || source.active === false || source.published === false) {
      errors.push(error('AV-COMMERCIAL-CATALOG-ITEM', `items.${index}`, 'Um item não está mais disponível no catálogo desta empresa.'));
      continue;
    }
    const quantityMilli = parseScaled(requested.quantity, 3);
    const defaultPriceCents = parseScaled(source.salePrice, 2);
    const unitPriceCents = requested.unitPrice === undefined || requested.unitPrice === ''
      ? defaultPriceCents : parseScaled(requested.unitPrice, 2);
    const discountUnitCents = requested.discountUnit === undefined || requested.discountUnit === ''
      ? 0 : parseScaled(requested.discountUnit, 2);
    if (!quantityMilli || quantityMilli > MAX_QUANTITY_MILLI) errors.push(error('AV-COMMERCIAL-QUANTITY', `items.${index}.quantity`, 'Informe uma quantidade válida, maior que zero.'));
    if (!unitPriceCents || unitPriceCents > MAX_CENTS) errors.push(error('AV-COMMERCIAL-UNIT-PRICE', `items.${index}.unitPrice`, 'Informe um preço entre R$ 0,01 e R$ 9.999.999,99.'));
    if (discountUnitCents === null || discountUnitCents < 0 || discountUnitCents > (unitPriceCents || 0)) errors.push(error('AV-COMMERCIAL-DISCOUNT', `items.${index}.discountUnit`, 'O desconto unitário não pode ultrapassar o preço.'));
    if (!quantityMilli || !unitPriceCents || discountUnitCents === null || errors.some((item) => item.field.startsWith(`items.${index}`))) continue;
    const grossCents = lineCents(quantityMilli, unitPriceCents);
    const discountCents = lineCents(quantityMilli, discountUnitCents);
    const netCents = grossCents - discountCents;
    if (grossCents > MAX_CENTS || netCents > MAX_CENTS) {
      errors.push(error('AV-COMMERCIAL-LINE-TOTAL', `items.${index}`, 'O total deste item ultrapassa R$ 9.999.999,99.'));
      continue;
    }
    const fiscal = catalogSnapshot(source);
    const fiscalReady = source.fiscalReady === true;
    lines.push({
      position: index + 1,
      productId: source.id,
      itemType: source.type === 'servico' ? 'servico' : 'produto',
      sku: text(source.sku, 80), name: text(source.name, 180), description: text(source.description, 1000),
      unit: text(source.unit || 'un', 20), quantity: quantityFromMilli(quantityMilli),
      unitPrice: moneyFromCents(unitPriceCents), discountUnit: moneyFromCents(discountUnitCents),
      gross: moneyFromCents(grossCents), discount: moneyFromCents(discountCents), net: moneyFromCents(netCents),
      costUnitSnapshot: source.costPrice === undefined || source.costPrice === null ? null : moneyFromCents(parseScaled(source.costPrice, 2) || 0),
      fiscalSnapshot: fiscal, fiscalReady, controlsStock: source.controlsStock === true && source.type !== 'servico',
    });
    subtotalCents += grossCents;
    itemDiscountCents += discountCents;
  }
  if (errors.length) return { errors, warnings };
  const generalDiscountCents = parseScaled(input.generalDiscount || 0, 2);
  const freightCents = parseScaled(input.freight || 0, 2);
  const insuranceCents = parseScaled(input.insurance || 0, 2);
  const otherExpensesCents = parseScaled(input.otherExpenses || 0, 2);
  if ([generalDiscountCents, freightCents, insuranceCents, otherExpensesCents].some((value) => value === null || value > MAX_CENTS)) {
    return { errors: [error('AV-COMMERCIAL-TOTALS', 'totals', 'Revise desconto, frete, seguro e outras despesas.')], warnings };
  }
  if (generalDiscountCents > subtotalCents - itemDiscountCents) {
    return { errors: [error('AV-COMMERCIAL-GENERAL-DISCOUNT', 'generalDiscount', 'O desconto geral não pode ultrapassar o valor dos itens.')], warnings };
  }
  const totalCents = subtotalCents - itemDiscountCents - generalDiscountCents + freightCents + insuranceCents + otherExpensesCents;
  if (totalCents < 0 || totalCents > MAX_CENTS) return { errors: [error('AV-COMMERCIAL-TOTAL', 'total', 'O total precisa ficar entre R$ 0,00 e R$ 9.999.999,99.')], warnings };
  const fiscalDocument = text(input.fiscalDocument || 'nenhum', 10).toLowerCase();
  const allowedFiscal = channel === 'servicos' ? ['nenhum', 'nfse'] : ['nenhum', 'nfe', 'nfce'];
  if (!allowedFiscal.includes(fiscalDocument)) return { errors: [error('AV-COMMERCIAL-FISCAL-DOCUMENT', 'fiscalDocument', 'Selecione um documento fiscal compatível com esta operação.')], warnings };
  const customerFiscalReady = customer.status !== 'revisar_cadastro';
  const itemsFiscalReady = lines.every((item) => item.fiscalReady);
  if (fiscalDocument !== 'nenhum' && !customerFiscalReady) warnings.push(error('AV-COMMERCIAL-CUSTOMER-FISCAL-REVIEW', 'customerId', 'O cliente precisa concluir o cadastro antes da emissão da nota.'));
  if (fiscalDocument !== 'nenhum' && !itemsFiscalReady) warnings.push(error('AV-COMMERCIAL-ITEM-FISCAL-REVIEW', 'items', 'Existem itens que precisam de revisão fiscal antes da emissão da nota.'));
  const validityDate = text(input.validityDate, 10);
  if (type === 'orcamento' && validityDate && !validDate(validityDate)) return { errors: [error('AV-COMMERCIAL-VALIDITY', 'validityDate', 'Informe uma validade válida para o orçamento.')], warnings };
  const payment = normalizePayment(input.payment);
  if (!payment.method) return { errors: [error('AV-COMMERCIAL-PAYMENT', 'payment.method', 'Selecione a forma ou condição de pagamento.')], warnings };
  if (!payment.firstDueDate) return { errors: [error('AV-COMMERCIAL-DUE-DATE', 'payment.firstDueDate', 'Informe uma data válida para o primeiro vencimento.')], warnings };
  const delivery = normalizeDelivery(input.delivery);
  if (input?.delivery?.expectedDate && !delivery.expectedDate) return { errors: [error('AV-COMMERCIAL-DELIVERY-DATE', 'delivery.expectedDate', 'Informe uma data de entrega válida.')], warnings };
  if (delivery.expectedDate && delivery.expectedDate < payment.firstDueDate && input?.delivery?.requireBeforePayment === true) return { errors: [error('AV-COMMERCIAL-DATE-SEQUENCE', 'delivery.expectedDate', 'Revise a sequência entre entrega e primeiro vencimento.')], warnings };
  const operation = {
    companyId: context.companyId, actorId: context.actorId, type, channel, customerId,
    customerSnapshot: customerSnapshot(customer), priceTableId: priceTableId || null,
    priceTableSnapshot: catalogResult?.priceTable && typeof catalogResult.priceTable === 'object' ? stable(catalogResult.priceTable) : {},
    sellerId: sellerId || null,
    sellerName: text(input.sellerName, 120), status: 'salvo', validityDate: type === 'orcamento' ? validityDate || null : null,
    subtotalGross: moneyFromCents(subtotalCents), itemDiscount: moneyFromCents(itemDiscountCents),
    generalDiscount: moneyFromCents(generalDiscountCents), freight: moneyFromCents(freightCents),
    insurance: moneyFromCents(insuranceCents), otherExpenses: moneyFromCents(otherExpensesCents),
    total: moneyFromCents(totalCents), paymentSnapshot: payment,
    deliverySnapshot: delivery, fiscalDocument,
    fiscalStatus: fiscalDocument === 'nenhum' ? 'nao_aplicavel' : customerFiscalReady && itemsFiscalReady ? 'pronto' : 'pendencia_cadastral',
    stockStatus: 'sem_movimentacao', customerNotes: text(input.customerNotes, 2000),
    internalNotes: text(input.internalNotes, 2000), idempotencyKey, items: lines,
  };
  operation.contentHash = fingerprint(operation);
  if (!HASH.test(operation.contentHash)) throw new Error('Falha ao identificar o conteúdo comercial.');
  return { operation, errors, warnings };
}

export function createCommercialOperationService({ repository, customerResolver, catalogResolver } = {}) {
  if (!repository || typeof repository.create !== 'function' || typeof repository.update !== 'function' || typeof repository.convertQuoteToOrder !== 'function') throw new TypeError('Informe o repositório server-side de operações.');
  if (typeof customerResolver !== 'function' || typeof catalogResolver !== 'function') throw new TypeError('Informe os resolvedores server-side de cliente e catálogo.');
  return Object.freeze({
    async create({ context, input } = {}) {
      const channel = text(input?.channel || 'vendas', 20).toLowerCase();
      const denied = accessError(context, requiredPermission(channel, 'create'));
      if (denied) return { ok: false, errors: [denied], warnings: [] };
      try {
        const prepared = await prepareOperation({ input, context, customerResolver, catalogResolver });
        if (prepared.errors.length) return { ok: false, errors: prepared.errors, warnings: prepared.warnings };
        const result = await repository.create(prepared.operation);
        return { ok: true, operation: result.operation, reused: result.reused, errors: [], warnings: prepared.warnings };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)], warnings: [] };
      }
    },
    async update({ context, operationId, expectedVersion, input } = {}) {
      const channel = text(input?.channel || 'vendas', 20).toLowerCase();
      const denied = accessError(context, requiredPermission(channel, 'edit'));
      if (denied) return { ok: false, errors: [denied], warnings: [] };
      if (!UUID.test(text(operationId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1) return { ok: false, errors: [error('AV-COMMERCIAL-OPERATION-VERSION', 'version', 'Atualize o documento antes de salvar novamente.')], warnings: [] };
      try {
        const prepared = await prepareOperation({ input, context, customerResolver, catalogResolver });
        if (prepared.errors.length) return { ok: false, errors: prepared.errors, warnings: prepared.warnings };
        const operation = await repository.update({ operationId, expectedVersion, operation: prepared.operation });
        return { ok: true, operation, errors: [], warnings: prepared.warnings };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)], warnings: [] };
      }
    },
    async convertQuoteToOrder({ context, quoteId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context, 'sales.create') || accessError(context, 'sales.edit');
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(text(quoteId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !IDEMPOTENCY_KEY.test(text(idempotencyKey, 160))) return { ok: false, errors: [error('AV-COMMERCIAL-CONVERSION', 'operation', 'Atualize o orçamento antes de convertê-lo.') ] };
      try {
        const result = await repository.convertQuoteToOrder({ companyId: context.companyId, actorId: context.actorId, quoteId, expectedVersion, idempotencyKey: text(idempotencyKey, 160) });
        return { ok: true, operation: result.operation, reused: result.reused, errors: [] };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)] };
      }
    },
    async get({ context, operationId, channel = 'vendas' } = {}) {
      const denied = accessError(context, requiredPermission(text(channel, 20).toLowerCase(), 'view'));
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(text(operationId))) return { ok: false, errors: [error('AV-COMMERCIAL-OPERATION-ID', 'operation', 'Documento comercial inválido.')] };
      try { return { ok: true, operation: await repository.get({ companyId: context.companyId, operationId, channel: text(channel, 20).toLowerCase() }), errors: [] }; }
      catch (cause) { return { ok: false, errors: [repositoryError(cause)] }; }
    },
    async list({ context, channel = 'vendas', ...input } = {}) {
      const normalizedChannel = text(channel, 20).toLowerCase();
      const denied = accessError(context, requiredPermission(normalizedChannel, 'view'));
      if (denied) return { ok: false, operations: [], errors: [denied] };
      const limit = Math.min(100, Math.max(1, Number.parseInt(input.limit, 10) || 50));
      const offset = Math.max(0, Number.parseInt(input.offset, 10) || 0);
      try {
        const operations = await repository.list({ companyId: context.companyId, channel: normalizedChannel, type: text(input.type, 30), status: text(input.status, 30), query: text(input.query, 120), limit, offset });
        return { ok: true, operations, errors: [] };
      } catch (cause) { return { ok: false, operations: [], errors: [repositoryError(cause)] }; }
    },
  });
}
