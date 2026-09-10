export const COMMERCIAL_CUSTOMER_SERVICE_REFERENCE = '2026-09-03';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = new Set(['ativo', 'revisar_cadastro', 'inativo']);
const ALLOWED_STATE_REGISTRATION = new Set(['contribuinte_icms', 'contribuinte_isento', 'nao_contribuinte']);

function text(value, max = 1000) {
  return (typeof value === 'string' ? value : String(value ?? '')).trim().slice(0, max);
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function cnpjDigit(base, weights) {
  const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function cpfDigit(value, length) {
  const sum = value.slice(0, length).split('').reduce((total, current, index) => total + Number(current) * (length + 1 - index), 0);
  const result = (sum * 10) % 11;
  return result === 10 ? 0 : result;
}

export function isValidCnpj(value) {
  const normalized = digits(value);
  if (normalized.length !== 14 || /^(\d)\1{13}$/.test(normalized)) return false;
  const first = cnpjDigit(normalized, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const second = cnpjDigit(`${normalized.slice(0, 12)}${first}`, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return normalized.endsWith(`${first}${second}`);
}

export function isValidCpf(value) {
  const normalized = digits(value);
  return normalized.length === 11 && !/^(\d)\1{10}$/.test(normalized)
    && Number(normalized[9]) === cpfDigit(normalized, 9)
    && Number(normalized[10]) === cpfDigit(normalized, 10);
}

function error(code, field, message) {
  return { code, field, message };
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
    return error('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite realizar esta ação com clientes.');
  }
  return null;
}

export function normalizeCommercialCustomerInput(input = {}) {
  const documentType = text(input.documentType || 'cnpj', 4).toLowerCase();
  const stateRegistrationIndicator = text(input.stateRegistrationIndicator || 'nao_contribuinte', 30).toLowerCase();
  const requestedStatus = text(input.status || 'ativo', 30).toLowerCase();
  const normalized = {
    personType: documentType === 'cpf' ? 'fisica' : 'juridica',
    documentType,
    document: digits(input.document),
    legalName: text(input.legalName, 160),
    tradeName: text(input.tradeName, 160),
    displayName: text(input.displayName || input.tradeName || input.legalName, 160),
    stateRegistration: text(input.stateRegistration, 40),
    municipalRegistration: text(input.municipalRegistration, 40),
    stateRegistrationIndicator,
    consumerFinal: input.consumerFinal === true,
    email: text(input.email, 254).toLowerCase(),
    phone: digits(input.phone).slice(0, 15),
    primaryContact: text(input.primaryContact, 120),
    postalCode: digits(input.postalCode).slice(0, 8),
    street: text(input.street, 180),
    number: text(input.number, 30),
    complement: text(input.complement, 100),
    district: text(input.district, 100),
    city: text(input.city, 100),
    cityCode: digits(input.cityCode).slice(0, 7),
    state: text(input.state, 2).toUpperCase(),
    sellerId: text(input.sellerId, 36),
    paymentTerms: text(input.paymentTerms, 120),
    notes: text(input.notes, 2000),
    status: ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : 'revisar_cadastro',
  };
  const fiscalAddressReady = Boolean(
    normalized.postalCode.length === 8 && normalized.street && normalized.number
    && normalized.district && normalized.city && normalized.cityCode.length === 7
    && /^[A-Z]{2}$/.test(normalized.state)
  );
  const stateRegistrationReady = stateRegistrationIndicator !== 'contribuinte_icms'
    || Boolean(normalized.stateRegistration && normalized.stateRegistration.toLocaleLowerCase('pt-BR') !== 'isento');
  if (!fiscalAddressReady || !stateRegistrationReady) normalized.status = 'revisar_cadastro';
  return { normalized, fiscalReady: fiscalAddressReady && stateRegistrationReady };
}

export function validateCommercialCustomerInput(input = {}) {
  const { normalized, fiscalReady } = normalizeCommercialCustomerInput(input);
  const errors = [];
  const warnings = [];
  if (typeof input.consumerFinal !== 'boolean') errors.push(error('AV-COMMERCIAL-CONSUMER-FINAL', 'consumerFinal', 'Informe se o cliente é consumidor final.'));
  if (!['cnpj', 'cpf'].includes(normalized.documentType)) errors.push(error('AV-COMMERCIAL-DOCUMENT-TYPE', 'documentType', 'Selecione Pessoa jurídica ou Pessoa física.'));
  if (normalized.documentType === 'cnpj' && !isValidCnpj(normalized.document)) errors.push(error('AV-COMMERCIAL-CNPJ', 'document', 'Informe um CNPJ válido.'));
  if (normalized.documentType === 'cpf' && !isValidCpf(normalized.document)) errors.push(error('AV-COMMERCIAL-CPF', 'document', 'Informe um CPF válido.'));
  if (normalized.legalName.length < 2) errors.push(error('AV-COMMERCIAL-LEGAL-NAME', 'legalName', 'Informe a razão social do cliente.'));
  if (normalized.displayName.length < 2) errors.push(error('AV-COMMERCIAL-DISPLAY-NAME', 'displayName', 'Informe o nome usado para identificar o cliente.'));
  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) errors.push(error('AV-COMMERCIAL-EMAIL', 'email', 'Informe um e-mail válido ou deixe o campo vazio.'));
  if (normalized.postalCode && normalized.postalCode.length !== 8) errors.push(error('AV-COMMERCIAL-CEP', 'postalCode', 'Informe o CEP com oito dígitos.'));
  if (normalized.cityCode && normalized.cityCode.length !== 7) errors.push(error('AV-COMMERCIAL-IBGE', 'cityCode', 'O município precisa possuir um código IBGE válido.'));
  if (normalized.state && !/^[A-Z]{2}$/.test(normalized.state)) errors.push(error('AV-COMMERCIAL-UF', 'state', 'Informe a UF com duas letras.'));
  if (normalized.sellerId && !UUID.test(normalized.sellerId)) errors.push(error('AV-COMMERCIAL-SELLER', 'sellerId', 'Selecione um vendedor válido ou deixe o campo vazio.'));
  if (!ALLOWED_STATE_REGISTRATION.has(normalized.stateRegistrationIndicator)) errors.push(error('AV-COMMERCIAL-IE-INDICATOR', 'stateRegistrationIndicator', 'Selecione a situação correta da inscrição estadual.'));
  if (!fiscalReady) warnings.push(error('AV-COMMERCIAL-FISCAL-REVIEW', 'status', 'O cliente será salvo como Revisar cadastro e não poderá emitir nota até completar os dados fiscais.'));
  return { valid: errors.length === 0, normalized, fiscalReady, errors, warnings };
}

function normalizeListInput(input = {}) {
  const limit = Math.min(100, Math.max(1, Number.isInteger(Number(input.limit)) ? Number(input.limit) : 50));
  const offset = Math.max(0, Number.isInteger(Number(input.offset)) ? Number(input.offset) : 0);
  const status = text(input.status, 30).toLowerCase();
  return { query: text(input.query, 120), status: ALLOWED_STATUSES.has(status) ? status : '', limit, offset };
}

function repositoryError(cause) {
  if (cause?.code === 'AV-COMMERCIAL-CUSTOMER-DUPLICATE') return error(cause.code, 'document', 'Já existe um cliente com este CPF ou CNPJ nesta empresa.');
  if (cause?.code === 'AV-COMMERCIAL-CUSTOMER-CONFLICT') return error(cause.code, 'version', 'O cliente foi alterado por outra pessoa. Atualize os dados antes de salvar novamente.');
  if (cause?.code === 'AV-COMMERCIAL-CUSTOMER-NOT-FOUND') return error(cause.code, 'customer', 'Cliente não localizado nesta empresa.');
  return error('AV-COMMERCIAL-CUSTOMER-STORAGE', 'storage', 'Não foi possível concluir a operação com o cliente. Tente novamente.');
}

export function createCommercialCustomerService({ repository } = {}) {
  if (!repository || typeof repository.create !== 'function' || typeof repository.list !== 'function') {
    throw new TypeError('Informe o repositório server-side de clientes.');
  }
  return Object.freeze({
    async create({ context, input } = {}) {
      const denied = accessError(context, 'clients.create');
      if (denied) return { ok: false, errors: [denied], warnings: [] };
      const validation = validateCommercialCustomerInput(input);
      if (!validation.valid) return { ok: false, errors: validation.errors, warnings: validation.warnings };
      try {
        const customer = await repository.create({
          ...validation.normalized, companyId: context.companyId, actorId: context.actorId,
        });
        return { ok: true, customer, fiscalReady: validation.fiscalReady, errors: [], warnings: validation.warnings };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)], warnings: validation.warnings };
      }
    },

    async update({ context, customerId, expectedVersion, input } = {}) {
      const denied = accessError(context, 'clients.edit');
      if (denied) return { ok: false, errors: [denied], warnings: [] };
      if (!UUID.test(text(customerId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return { ok: false, errors: [error('AV-COMMERCIAL-CUSTOMER-VERSION', 'version', 'Atualize o cadastro antes de salvar novamente.')], warnings: [] };
      }
      const validation = validateCommercialCustomerInput(input);
      if (!validation.valid) return { ok: false, errors: validation.errors, warnings: validation.warnings };
      try {
        const customer = await repository.update({
          companyId: context.companyId, actorId: context.actorId, customerId, expectedVersion,
          customer: validation.normalized,
        });
        return { ok: true, customer, fiscalReady: validation.fiscalReady, errors: [], warnings: validation.warnings };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)], warnings: validation.warnings };
      }
    },

    async deactivate({ context, customerId, expectedVersion } = {}) {
      const denied = accessError(context, 'clients.edit');
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(text(customerId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return { ok: false, errors: [error('AV-COMMERCIAL-CUSTOMER-VERSION', 'version', 'Atualize o cadastro antes de inativar.')] };
      }
      try {
        const customer = await repository.deactivate({ companyId: context.companyId, actorId: context.actorId, customerId, expectedVersion });
        return { ok: true, customer, errors: [] };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)] };
      }
    },

    async get({ context, customerId } = {}) {
      const denied = accessError(context, 'clients.view');
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(text(customerId))) return { ok: false, errors: [error('AV-COMMERCIAL-CUSTOMER-ID', 'customer', 'Cliente inválido.')] };
      try {
        const customer = await repository.get({ companyId: context.companyId, customerId });
        return { ok: true, customer, errors: [] };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)] };
      }
    },

    async list({ context, ...input } = {}) {
      const denied = accessError(context, 'clients.view');
      if (denied) return { ok: false, errors: [denied], customers: [] };
      try {
        const customers = await repository.list({ companyId: context.companyId, ...normalizeListInput(input) });
        return { ok: true, customers, errors: [] };
      } catch (cause) {
        return { ok: false, errors: [repositoryError(cause)], customers: [] };
      }
    },
  });
}
