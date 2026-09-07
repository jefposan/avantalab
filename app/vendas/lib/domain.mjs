import { normalizeFiscalMatrix, validateFiscalMatrix } from './fiscal-matrix.mjs';
import { resolveMunicipalityCode } from './municipality.mjs';

export const DOCUMENT_TYPES = ['orcamento', 'pedido', 'venda', 'ordem_servico', 'nfe', 'nfce', 'nfse'];

export function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

export function percent(value) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value) || 0) + '%';
}

export function parseCommercialNumber(value) {
  const raw = String(value ?? '').replace(/R\$/gi, '').replace(/\s/g, '');
  const normalized = (raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw).replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isValidEmail(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function brazilianDocumentDigit(base, weights) {
  const sum = weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value) {
  const normalized = String(value ?? '').replace(/\D/g, '');
  if (normalized.length !== 14 || /^(\d)\1{13}$/.test(normalized)) return false;
  const first = brazilianDocumentDigit(normalized, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = brazilianDocumentDigit(`${normalized.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return normalized.endsWith(`${first}${second}`);
}

export function isValidCpf(value) {
  const normalized = String(value ?? '').replace(/\D/g, '');
  if (normalized.length !== 11 || /^(\d)\1{10}$/.test(normalized)) return false;
  const digit = (length) => {
    const sum = normalized.slice(0, length).split('').reduce((total, current, index) => total + Number(current) * (length + 1 - index), 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return Number(normalized[9]) === digit(9) && Number(normalized[10]) === digit(10);
}

export function formatCnpj(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatCpf(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11);
  return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d)/, '$1-$2');
}

export function formatCep(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function evaluateCertificateCompanyRegistration(company) {
  const digits = (value) => String(value || '').replace(/\D/g, '');
  const checks = [
    { id: 'display-name', label: 'Nome de exibição', ready: Boolean(company?.name?.trim()) },
    { id: 'legal-name', label: 'Razão social', ready: Boolean(company?.legalName?.trim()) },
    { id: 'document', label: 'CNPJ com 14 dígitos', ready: digits(company?.document).length === 14 },
    { id: 'tax-regime', label: 'Regime tributário', ready: Boolean(company?.taxRegime?.trim()) },
    { id: 'city', label: 'Município e UF', ready: Boolean(company?.city?.trim()) },
    { id: 'city-code', label: 'Município fiscal identificado', ready: digits(company?.cityCode).length === 7 },
    { id: 'cep', label: 'CEP fiscal', ready: digits(company?.cep).length === 8 },
    { id: 'street', label: 'Logradouro fiscal', ready: Boolean(company?.street?.trim()) },
    { id: 'number', label: 'Número do endereço', ready: Boolean(company?.number?.trim()) },
    { id: 'district', label: 'Bairro fiscal', ready: Boolean(company?.district?.trim()) },
  ];
  const missing = checks.filter((check) => !check.ready);
  return {
    ready: missing.length === 0,
    document: digits(company?.document),
    checks,
    missing,
  };
}

export function documentLabel(type) {
  return ({
    orcamento: 'Orçamento', pedido: 'Pedido', venda: 'Venda rápida', ordem_servico: 'Ordem de serviço',
    nfe: 'NF-e', nfce: 'NFC-e', nfse: 'NFS-e',
  })[type] || 'Documento';
}

export function calculateOrder(items, discount = 0, freight = 0) {
  const subtotal = items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0), 0);
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const safeFreight = Math.max(0, Number(freight) || 0);
  return { subtotal, discount: safeDiscount, freight: safeFreight, total: subtotal - safeDiscount + safeFreight };
}

export function validateOrder(order) {
  const errors = [];
  const warnings = [];
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!order?.client?.trim()) errors.push('Selecione o cliente do pedido.');
  if (!items.length) errors.push('Adicione ao menos um produto ou serviço.');
  if (!order?.paymentMethod?.trim()) errors.push('Defina a condição de pagamento.');
  if (order?.orderDate && !isValidIsoDate(order.orderDate)) errors.push('Informe uma data válida para o pedido.');
  if (order?.deliveryDate && !isValidIsoDate(order.deliveryDate)) errors.push('Informe uma data válida para a entrega.');
  if (order?.orderDate && order?.deliveryDate && isValidIsoDate(order.orderDate) && isValidIsoDate(order.deliveryDate) && order.deliveryDate < order.orderDate) errors.push('A entrega não pode ocorrer antes da data do pedido.');
  if (!Number.isInteger(Number(order?.installments)) || Number(order?.installments) < 1 || Number(order?.installments) > 120) errors.push('Informe de 1 a 120 parcelas.');
  if (!isValidIsoDate(order?.firstDueDate)) errors.push('Informe uma data válida para o primeiro vencimento.');
  if (order?.orderDate && isValidIsoDate(order.orderDate) && isValidIsoDate(order?.firstDueDate) && order.firstDueDate < order.orderDate) errors.push('O primeiro vencimento não pode ser anterior à data do pedido.');
  items.forEach((item, index) => {
    const label = item.name?.trim() || `Item ${index + 1}`;
    if (!(Number(item.quantity) > 0)) errors.push(`${label}: informe uma quantidade maior que zero.`);
    if (!(Number(item.unitPrice) > 0)) errors.push(`${label}: informe um preço unitário maior que zero.`);
    if (order.reserveStock && item.kind !== 'servico' && Number(item.quantity) > Number(item.available)) {
      errors.push(`${label}: estoque disponível insuficiente para a reserva.`);
    }
    if (order.fiscalDocument === 'nfe' && item.fiscalStatus !== 'Completo') {
      warnings.push(`${label}: revise o cadastro fiscal antes de emitir a NF-e.`);
    }
  });
  if (!order.fiscalDocument || order.fiscalDocument === 'nenhum') warnings.push('O pedido será confirmado sem documento fiscal definido.');
  return { ready: errors.length === 0, errors, warnings: [...new Set(warnings)] };
}

export function validateServiceOrder(order) {
  const errors = [];
  const warnings = [];
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!order?.client?.trim()) errors.push('Selecione o cliente da ordem de serviço.');
  if (!items.length) errors.push('Adicione ao menos um serviço publicado.');
  if (!order?.scheduledDate?.trim()) errors.push('Informe a data do atendimento.');
  if (!order?.scheduledTime?.trim()) errors.push('Informe o horário do atendimento.');
  if (!order?.technician?.trim()) errors.push('Defina o responsável pelo atendimento.');
  if (!order?.paymentMethod?.trim()) errors.push('Defina a condição de pagamento.');
  if (!(Number(order?.installments) >= 1)) errors.push('Informe ao menos uma parcela.');
  if (order?.scheduledDate && !isValidIsoDate(order.scheduledDate)) errors.push('Informe uma data válida para o atendimento.');
  if (order?.scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(order.scheduledTime)) errors.push('Informe um horário válido para o atendimento.');
  if (!Number.isInteger(Number(order?.installments)) || Number(order?.installments) > 120) errors.push('Informe de 1 a 120 parcelas.');
  if (!isValidIsoDate(order?.firstDueDate)) errors.push('Informe uma data válida para o primeiro vencimento.');
  if (order?.scheduledDate && isValidIsoDate(order.scheduledDate) && isValidIsoDate(order?.firstDueDate) && order.firstDueDate < order.scheduledDate) errors.push('O primeiro vencimento não pode ser anterior ao atendimento.');
  items.forEach((item, index) => {
    const label = item.name?.trim() || `Serviço ${index + 1}`;
    if (item.kind !== 'servico') errors.push(`${label}: somente serviços podem compor a ordem.`);
    if (!(Number(item.quantity) > 0)) errors.push(`${label}: informe uma quantidade maior que zero.`);
    if (!(Number(item.unitPrice) > 0)) errors.push(`${label}: informe um valor unitário maior que zero.`);
    if (order.fiscalDocument === 'nfse' && (!item.municipalServiceCode?.trim() || item.fiscalStatus !== 'Completo')) {
      warnings.push(`${label}: revise o código municipal antes de preparar a NFS-e.`);
    }
  });
  if (!order?.fiscalDocument || order.fiscalDocument === 'nenhum') warnings.push('A ordem será concluída sem documento fiscal definido.');
  return { ready: errors.length === 0, errors, warnings: [...new Set(warnings)] };
}

export function validateServiceExecution(execution) {
  const errors = [];
  const warnings = [];
  const materials = Array.isArray(execution?.materials) ? execution.materials : [];
  const checklist = Array.isArray(execution?.checklist) ? execution.checklist : [];
  if (!(Number(execution?.actualDurationMinutes) > 0)) errors.push('Informe o tempo realizado no atendimento.');
  if (!execution?.completionNotes?.trim()) errors.push('Registre o relato da execução antes de concluir.');
  if (execution?.startedAt && execution?.completedAt && new Date(execution.completedAt).getTime() < new Date(execution.startedAt).getTime()) {
    errors.push('A conclusão não pode ocorrer antes do início realizado.');
  }
  materials.forEach((material, index) => {
    const label = material.name?.trim() || `Material ${index + 1}`;
    if (!material.name?.trim()) errors.push(`${label}: informe a descrição ou selecione um produto.`);
    if (!(Number(material.quantity) > 0)) errors.push(`${label}: informe uma quantidade maior que zero.`);
    if (!material.unit?.trim()) errors.push(`${label}: informe a unidade utilizada.`);
  });
  if (checklist.length && checklist.some((item) => !item.complete)) warnings.push('O checklist operacional possui etapas pendentes.');
  if (execution?.acceptanceStatus !== 'Aceito') warnings.push('A ordem será concluída sem aceite confirmado do cliente.');
  if (execution?.acceptanceStatus === 'Aceito' && !execution?.acceptedBy?.trim()) errors.push('Informe quem realizou o aceite do serviço.');
  return { ready: errors.length === 0, errors, warnings: [...new Set(warnings)] };
}

export function fiscalReadiness(config, documentType) {
  const errors = [];
  const warnings = [];
  if (!config.companyDocument?.trim()) errors.push('Informe o CNPJ do emitente.');
  if (!config.taxRegime?.trim()) errors.push('Informe o regime tributário.');
  if (!config.cityCode?.trim()) errors.push('Não foi possível identificar o município fiscal. Revise CEP, município e UF.');
  if (documentType === 'nfse') {
    if (!config.municipalRegistration?.trim()) errors.push('Informe a inscrição municipal.');
  } else {
    if (!config.stateRegistration?.trim()) errors.push('Informe a inscrição estadual.');
  }
  if (!config.providerConnected) errors.push('Conecte um provedor fiscal ou autorizador.');
  if (!config.certificateValid) errors.push('Instale um certificado ou vínculo de assinatura válido.');
  if (!config.fiscalResponsible?.trim()) errors.push('Identifique o responsável fiscal.');
  if (documentType === 'nfse' && (!config.nfseAuthorityMode || config.nfseAuthorityMode === 'Não definido')) errors.push('Defina a rota de autorização da NFS-e.');
  if (!config.taxReviewConfirmed) errors.push('Confirme a revisão das regras tributárias.');
  if (!config.taxReformReviewConfirmed) errors.push('Confirme a revisão de IBS/CBS e CNPJ alfanumérico.');
  if (config.environment !== 'homologacao') warnings.push('Produção exige liberação explícita após homologação.');
  if (!config.contingencyPlan || config.contingencyPlan === 'Não definido') warnings.push('Documente a contingência por documento e autorizador.');
  return { ready: errors.length === 0, errors, warnings };
}

export function normalizeModuleSettings(input, defaults) {
  const source = input && typeof input === 'object' ? input : {};
  const cleanList = (value, fallback) => {
    const list = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
    return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
  };
  const company = { ...defaults.company, ...(source.company && typeof source.company === 'object' ? source.company : {}) };
  company.cityCode = resolveMunicipalityCode({ city: company.city, cep: company.cep, currentCode: company.cityCode });
  const commercial = { ...defaults.commercial, ...(source.commercial && typeof source.commercial === 'object' ? source.commercial : {}) };
  const payments = { ...defaults.payments, ...(source.payments && typeof source.payments === 'object' ? source.payments : {}) };
  const services = { ...defaults.services, ...(source.services && typeof source.services === 'object' ? source.services : {}) };
  const fiscal = { ...defaults.fiscal, ...(source.fiscal && typeof source.fiscal === 'object' ? source.fiscal : {}) };
  const defaultDocumentScope = Array.isArray(defaults.fiscal.documentScope) && defaults.fiscal.documentScope.length ? defaults.fiscal.documentScope : ['nfe', 'nfce', 'nfse'];
  fiscal.documentScope = cleanList(fiscal.documentScope, defaultDocumentScope).filter((documentType) => ['nfe', 'nfce', 'nfse'].includes(documentType));
  if (!fiscal.documentScope.length) fiscal.documentScope = [...defaultDocumentScope];
  fiscal.certificateMode = fiscal.certificateMode === 'A1' || fiscal.certificateMode === 'A1 em cofre' ? 'Certificado A1' : fiscal.certificateMode === 'Assinatura em nuvem' ? 'Certificado em nuvem' : fiscal.certificateMode;
  fiscal.matrix = normalizeFiscalMatrix(source.fiscal?.matrix || defaults.fiscal.matrix);
  const stock = { ...defaults.stock, ...(source.stock && typeof source.stock === 'object' ? source.stock : {}) };
  const sourceAccess = source.access && typeof source.access === 'object' ? source.access : {};
  const permissionSchemaVersion = Number(defaults.access.permissionSchemaVersion) || 1;
  const sourcePermissionSchemaVersion = Number(sourceAccess.permissionSchemaVersion) || 0;
  commercial.sellers = cleanList(commercial.sellers, defaults.commercial.sellers);
  if (!commercial.sellers.includes(commercial.defaultSeller)) commercial.defaultSeller = commercial.sellers[0] || defaults.commercial.defaultSeller;
  if (commercial.defaultFiscalDocument !== 'nenhum' && !fiscal.documentScope.includes(commercial.defaultFiscalDocument)) commercial.defaultFiscalDocument = 'nenhum';
  payments.enabledMethods = cleanList(payments.enabledMethods, defaults.payments.enabledMethods).filter((method) => ['pix', 'boleto', 'cartao', 'prazo'].includes(method));
  if (!payments.enabledMethods.length) payments.enabledMethods = [...defaults.payments.enabledMethods];
  if (!payments.enabledMethods.includes(payments.defaultMethod)) payments.defaultMethod = payments.enabledMethods[0];
  services.technicians = cleanList(services.technicians, defaults.services.technicians);
  if (!services.technicians.includes(services.defaultTechnician)) services.defaultTechnician = services.technicians[0] || defaults.services.defaultTechnician;
  stock.locations = cleanList(stock.locations, defaults.stock.locations);
  if (!stock.locations.includes(stock.defaultLocation)) stock.defaultLocation = stock.locations[0] || defaults.stock.defaultLocation;
  stock.entryReasons = cleanList(stock.entryReasons, defaults.stock.entryReasons);
  stock.exitReasons = cleanList(stock.exitReasons, defaults.stock.exitReasons);
  stock.inventoryReasons = cleanList(stock.inventoryReasons, defaults.stock.inventoryReasons);
  if (!stock.entryReasons.includes(stock.defaultEntryReason)) stock.defaultEntryReason = stock.entryReasons[0] || defaults.stock.defaultEntryReason;
  if (!stock.exitReasons.includes(stock.defaultExitReason)) stock.defaultExitReason = stock.exitReasons[0] || defaults.stock.defaultExitReason;
  if (!stock.inventoryReasons.includes(stock.defaultInventoryReason)) stock.defaultInventoryReason = stock.inventoryReasons[0] || defaults.stock.defaultInventoryReason;
  const knownPermissionIds = new Set(defaults.access.roles.flatMap((role) => role.permissions));
  const protectedAccessPermissions = ['settings.view', 'access.view', 'access.manage', 'access.audit', 'fiscal.configure', 'fiscal.homologate'];
  const sourceRoles = Array.isArray(sourceAccess.roles) ? sourceAccess.roles : [];
  const roles = defaults.access.roles.map((defaultRole) => {
    const savedRole = sourceRoles.find((role) => role?.id === defaultRole.id);
    const permissions = cleanList(savedRole?.permissions, defaultRole.permissions).filter((permission) => knownPermissionIds.has(permission));
    if (permissionSchemaVersion >= 3 && sourcePermissionSchemaVersion < 3 && defaultRole.permissions.includes('sales.invoice') && !permissions.includes('sales.invoice')) permissions.push('sales.invoice');
    if (defaultRole.id === 'gestor' || defaultRole.id === 'administrador') {
      protectedAccessPermissions.forEach((permission) => { if (!permissions.includes(permission)) permissions.push(permission); });
    }
    return { ...defaultRole, ...(savedRole && typeof savedRole === 'object' ? savedRole : {}), id: defaultRole.id, permissions };
  });
  const knownRoleIds = new Set(roles.map((role) => role.id));
  const sourceUsers = Array.isArray(sourceAccess.users) ? sourceAccess.users : defaults.access.users;
  const seenUserIds = new Set();
  const users = sourceUsers.map((user, index) => {
    const fallback = defaults.access.users[index] || defaults.access.users[defaults.access.users.length - 1];
    const rawId = String(user?.id || fallback?.id || `usuario-${index + 1}`).trim();
    const id = seenUserIds.has(rawId) ? `${rawId}-${index + 1}` : rawId;
    seenUserIds.add(id);
    const roleId = knownRoleIds.has(user?.roleId) ? user.roleId : 'operador_simples';
    const overrides = {};
    if (user?.overrides && typeof user.overrides === 'object') {
      Object.entries(user.overrides).forEach(([permission, decision]) => {
        if (!knownPermissionIds.has(permission) || !['permitir', 'bloquear'].includes(decision)) return;
        if ((roleId === 'gestor' || roleId === 'administrador') && decision === 'bloquear' && protectedAccessPermissions.includes(permission)) return;
        overrides[permission] = decision;
      });
    }
    return { id, name: String(user?.name || fallback?.name || 'Usuário').trim(), email: String(user?.email || fallback?.email || '').trim(), roleId, sector: String(user?.sector || fallback?.sector || 'Não definido').trim(), active: user?.active !== false, overrides };
  });
  const sourceAudit = Array.isArray(sourceAccess.auditTrail) ? sourceAccess.auditTrail : defaults.access.auditTrail;
  const auditTrail = sourceAudit.slice(0, 50).map((entry, index) => ({ id: String(entry?.id || `auditoria-${index + 1}`), at: String(entry?.at || new Date(0).toISOString()), actor: String(entry?.actor || 'Sistema'), summary: String(entry?.summary || 'Configuração de acesso atualizada.') }));
  return { version: defaults.version, company, commercial, payments, services, fiscal, stock, access: { permissionSchemaVersion, roles, users, auditTrail } };
}

export function resolveEffectivePermissions({ rolePermissions, overrides, permissionIds }) {
  const inherited = new Set(Array.isArray(rolePermissions) ? rolePermissions : []);
  const decisions = overrides && typeof overrides === 'object' ? overrides : {};
  return Object.fromEntries((Array.isArray(permissionIds) ? permissionIds : []).map((permission) => [permission, decisions[permission] === 'permitir' || (decisions[permission] !== 'bloquear' && inherited.has(permission))]));
}

export function canAccessPermission({ active, effectivePermissions, permission }) {
  return Boolean(active && permission && effectivePermissions?.[permission]);
}

export function validateModuleSettings(settings) {
  const errors = [];
  const warnings = [];
  const digits = (value) => String(value || '').replace(/\D/g, '');
  if (!settings?.company?.name?.trim()) errors.push('Informe o nome de exibição da empresa.');
  if (!settings?.company?.legalName?.trim()) errors.push('Informe a razão social.');
  if (digits(settings?.company?.document).length !== 14) errors.push('Informe um CNPJ com 14 dígitos.');
  if (!settings?.company?.city?.trim()) errors.push('Informe o município da empresa.');
  if (digits(settings?.company?.cityCode).length !== 7) errors.push('Não foi possível identificar o município fiscal. Revise o CEP e informe município/UF.');
  if (digits(settings?.company?.cep).length !== 8) errors.push('Informe o CEP fiscal da empresa com 8 dígitos.');
  if (!settings?.company?.street?.trim()) errors.push('Informe o logradouro fiscal da empresa.');
  if (!settings?.company?.number?.trim()) errors.push('Informe o número do endereço fiscal da empresa.');
  if (!settings?.company?.district?.trim()) errors.push('Informe o bairro fiscal da empresa.');
  if (!settings?.company?.taxRegime?.trim()) errors.push('Informe o regime tributário.');
  if (!Array.isArray(settings?.fiscal?.documentScope) || !settings.fiscal.documentScope.length) errors.push('Selecione ao menos um tipo de nota fiscal utilizado pela empresa.');
  if (settings?.commercial?.defaultFiscalDocument && settings.commercial.defaultFiscalDocument !== 'nenhum' && !settings?.fiscal?.documentScope?.includes(settings.commercial.defaultFiscalDocument)) errors.push('O documento fiscal padrão precisa estar entre as notas utilizadas pela empresa.');
  if (!Array.isArray(settings?.commercial?.sellers) || !settings.commercial.sellers.length) errors.push('Cadastre ao menos um vendedor.');
  if (!settings?.commercial?.sellers?.includes(settings?.commercial?.defaultSeller)) errors.push('O vendedor padrão deve pertencer à equipe comercial.');
  if (!(Number(settings?.commercial?.quoteValidityDays) >= 1 && Number(settings?.commercial?.quoteValidityDays) <= 365)) errors.push('A validade padrão dos orçamentos deve ficar entre 1 e 365 dias.');
  if (!(Number(settings?.commercial?.maxDiscountPercent) >= 0 && Number(settings?.commercial?.maxDiscountPercent) <= 100)) errors.push('O limite de desconto deve ficar entre 0% e 100%.');
  if (!Array.isArray(settings?.payments?.enabledMethods) || !settings.payments.enabledMethods.length) errors.push('Habilite ao menos uma forma de pagamento.');
  if (!settings?.payments?.enabledMethods?.includes(settings?.payments?.defaultMethod)) errors.push('A forma de pagamento padrão precisa estar habilitada.');
  if (!(Number(settings?.payments?.defaultInstallments) >= 1)) errors.push('Informe ao menos uma parcela padrão.');
  if (!Array.isArray(settings?.services?.technicians) || !settings.services.technicians.length) errors.push('Cadastre ao menos um responsável por serviços.');
  if (!settings?.services?.technicians?.includes(settings?.services?.defaultTechnician)) errors.push('O responsável padrão deve pertencer à equipe de serviços.');
  if (!Array.isArray(settings?.stock?.locations) || !settings.stock.locations.length) errors.push('Cadastre ao menos um local de estoque.');
  if (!settings?.stock?.locations?.includes(settings?.stock?.defaultLocation)) errors.push('O local padrão deve pertencer aos locais de estoque.');
  if (!Array.isArray(settings?.stock?.entryReasons) || !settings.stock.entryReasons.length) errors.push('Cadastre ao menos um motivo de entrada.');
  if (!Array.isArray(settings?.stock?.exitReasons) || !settings.stock.exitReasons.length) errors.push('Cadastre ao menos um motivo de saída.');
  if (!Array.isArray(settings?.stock?.inventoryReasons) || !settings.stock.inventoryReasons.length) errors.push('Cadastre ao menos um motivo de inventário.');
  if (!settings?.stock?.entryReasons?.includes(settings?.stock?.defaultEntryReason)) errors.push('O motivo padrão de entrada precisa estar disponível.');
  if (!settings?.stock?.exitReasons?.includes(settings?.stock?.defaultExitReason)) errors.push('O motivo padrão de saída precisa estar disponível.');
  if (!settings?.stock?.inventoryReasons?.includes(settings?.stock?.defaultInventoryReason)) errors.push('O motivo padrão de inventário precisa estar disponível.');
  const roleIds = new Set((settings?.access?.roles || []).map((role) => role.id));
  const permissionIds = new Set((settings?.access?.roles || []).flatMap((role) => role.permissions || []));
  if (!['gestor', 'administrador', 'operador_completo', 'operador_simples'].every((roleId) => roleIds.has(roleId))) errors.push('Mantenha os quatro perfis padrão de acesso.');
  if (!(settings?.access?.users || []).some((user) => user.active && user.roleId === 'gestor')) errors.push('Mantenha ao menos um gestor ativo.');
  if (!(settings?.access?.users || []).some((user) => user.active && user.roleId === 'administrador')) errors.push('Mantenha ao menos um administrador ativo.');
  if ((settings?.access?.users || []).some((user) => !roleIds.has(user.roleId))) errors.push('Todo usuário precisa estar vinculado a um perfil válido.');
  if ((settings?.access?.users || []).some((user) => Object.keys(user.overrides || {}).some((permission) => !permissionIds.has(permission)))) errors.push('Existe uma exceção vinculada a uma permissão inválida.');
  for (const criticalRole of ['gestor', 'administrador']) {
    const role = (settings?.access?.roles || []).find((item) => item.id === criticalRole);
    if (!['settings.view', 'access.view', 'access.manage', 'access.audit', 'fiscal.configure', 'fiscal.homologate'].every((permission) => role?.permissions?.includes(permission))) errors.push('Gestor e administrador devem preservar o gerenciamento de acessos, auditoria, matriz fiscal e homologação.');
  }
  if (settings?.stock?.allowNegativeStock) warnings.push('Saldo negativo está permitido e exige acompanhamento operacional.');
  if (!settings?.stock?.protectReservations) warnings.push('Saídas manuais podem comprometer reservas de pedidos.');
  if (!settings?.company?.stateRegistration?.trim()) warnings.push('A inscrição estadual está pendente para NF-e e NFC-e.');
  if (!settings?.company?.municipalRegistration?.trim()) warnings.push('A inscrição municipal está pendente para NFS-e.');
  if (settings?.fiscal?.providerMode === 'Não definido') warnings.push('Defina a estratégia prevista para integração fiscal.');
  if (settings?.fiscal?.certificateMode === 'Não definido') warnings.push('Defina a modalidade prevista de assinatura fiscal.');
  if (!settings?.fiscal?.fiscalResponsible?.trim()) warnings.push('Identifique o responsável fiscal da empresa ativa.');
  if (settings?.fiscal?.nfseAuthorityMode === 'Não definido') warnings.push('Defina se a NFS-e seguirá o padrão nacional ou a rota municipal.');
  if (settings?.fiscal?.contingencyPlan === 'Não definido') warnings.push('Documente a estratégia de contingência por documento e autorizador.');
  if (!settings?.fiscal?.taxReviewConfirmed) warnings.push('A revisão do responsável fiscal ainda não foi confirmada.');
  if (!settings?.fiscal?.taxReformReviewConfirmed) warnings.push('A revisão de IBS/CBS e CNPJ alfanumérico ainda não foi confirmada.');
  const fiscalMatrix = validateFiscalMatrix(settings?.fiscal?.matrix, settings?.fiscal?.documentScope);
  errors.push(...fiscalMatrix.errors.map((message) => `Matriz fiscal: ${message}`));
  warnings.push(...fiscalMatrix.warnings.map((message) => `Matriz fiscal: ${message}`));
  return { ready: errors.length === 0, errors, warnings };
}

export function validateFiscalDraft({ documentType, recipient, items, config }) {
  const fiscalItems = Array.isArray(items) ? items : [];
  const checks = [];
  const add = (key, label, ready, detail, scope = 'cadastro') => checks.push({ key, label, ready: Boolean(ready), detail, scope });
  add('emitente', 'Dados do emitente', config?.companyDocument?.trim() && config?.taxRegime?.trim() && config?.cityCode?.trim(), 'CNPJ, regime tributário e município fiscal identificado automaticamente');
  add('destinatario', documentType === 'nfse' ? 'Dados do tomador' : 'Dados do destinatário', recipient?.name?.trim() && recipient?.document?.trim() && recipient?.city?.trim(), 'Nome, documento e município vinculados à operação');
  add('itens', 'Itens e valores', fiscalItems.length > 0 && fiscalItems.every((item) => Number(item.quantity) > 0 && Number(item.unitPrice) > 0), 'Quantidade e valor precisam vir da operação comercial');
  add('matriz', 'Regra fiscal da operação', config?.fiscalMatrixRuleMatched && config?.fiscalMatrixRuleReviewed && config?.fiscalMatrixRequirementsMet !== false, config?.fiscalMatrixRuleDetail || (config?.fiscalMatrixRuleName ? `${config.fiscalMatrixRuleName}${config.fiscalMatrixRuleReviewed ? ' revisada' : ' ainda depende de revisão fiscal'}` : 'Nenhuma regra ativa corresponde ao contexto da operação'));
  if (documentType === 'nfse') {
    add('inscricao', 'Inscrição municipal', config?.municipalRegistration?.trim(), 'Cadastro municipal do prestador');
    add('classificacao', 'Classificação dos serviços', fiscalItems.length > 0 && fiscalItems.every((item) => item.kind === 'servico' && item.municipalServiceCode?.trim() && item.nationalServiceCode?.trim() && item.nbs?.trim() && Number(item.issRate) > 0 && item.pisCst?.trim() && item.cofinsCst?.trim() && item.serviceIncidenceMode && item.serviceIncidenceMode !== 'Definir por operação'), 'Código municipal, item nacional, NBS, ISS, PIS/COFINS e incidência precisam estar definidos');
  } else {
    add('inscricao', 'Inscrição estadual', config?.stateRegistration?.trim(), 'Cadastro estadual do emitente');
    add('classificacao', 'Classificação das mercadorias', fiscalItems.length > 0 && fiscalItems.every((item) => item.kind === 'produto' && item.ncm?.trim() && item.taxableUnit?.trim() && item.fiscalOriginCode?.trim() && item.cfopInternal?.trim() && (documentType === 'nfce' || item.cfopInterstate?.trim()) && item.icmsCode?.trim() && item.pisCst?.trim() && item.cofinsCst?.trim() && item.fiscalStatus === 'Completo'), documentType === 'nfce' ? 'NCM, unidade tributável, origem, CFOP da NFC-e, ICMS, PIS/COFINS e complementos fiscais precisam estar completos' : 'NCM, unidade tributável, origem, CFOP interno e interestadual, ICMS, PIS/COFINS e complementos fiscais precisam estar completos');
  }
  add('certificado', 'Certificado ou assinatura', config?.certificateValid, 'Credencial válida e protegida', 'transmissao');
  add('provedor', 'Provedor ou autorizador', config?.providerConnected, 'Conector homologado e credenciais válidas', 'transmissao');
  add('responsavel', 'Responsável fiscal', config?.fiscalResponsible?.trim(), 'Pessoa responsável pela validação fiscal da empresa ativa', 'transmissao');
  if (documentType === 'nfse') add('rota-nfse', 'Rota de autorização da NFS-e', config?.nfseAuthorityMode && config.nfseAuthorityMode !== 'Não definido', 'Padrão nacional ou prefeitura/provedor municipal', 'transmissao');
  add('revisao', 'Revisão fiscal', config?.taxReviewConfirmed, 'Regras aprovadas pelo responsável fiscal', 'transmissao');
  add('reforma', 'Revisão IBS/CBS e CNPJ', config?.taxReformReviewConfirmed, 'Leiautes e regras vigentes revisados antes da homologação', 'transmissao');
  add('reforma-itens', 'IBS/CBS dos itens', fiscalItems.length > 0 && fiscalItems.every((item) => item.ibsCbsCst?.trim() && item.ibsCbsClassification?.trim() && (documentType !== 'nfse' || item.ibsCbsOperationIndicator?.trim())), 'CST, classificação tributária e indicador da operação quando exigido', 'transmissao');
  const draftReady = checks.filter((check) => check.scope === 'cadastro').every((check) => check.ready);
  const transmissionReady = checks.every((check) => check.ready);
  const errors = checks.filter((check) => !check.ready).map((check) => `${check.label}: ${check.detail}.`);
  const warnings = [];
  if (documentType === 'nfce') warnings.push('NFC-e também exigirá CSC, token e regras específicas da UF antes da homologação.');
  if (documentType === 'nfse') warnings.push('A NFS-e depende das regras do município e do padrão nacional adotado pelo emitente.');
  if (!config?.contingencyPlan || config.contingencyPlan === 'Não definido') warnings.push('A contingência ainda precisa ser documentada por documento e autorizador.');
  return { draftReady, transmissionReady, checks, errors, warnings };
}

export function stockStatus(current, minimum) {
  const quantity = Number(current) || 0;
  const threshold = Number(minimum) || 0;
  if (quantity <= 0) return 'sem_estoque';
  if (quantity < threshold) return 'baixo';
  return 'normal';
}

export function applyStockMovement({ current, reserved, quantity, direction, allowNegativeStock = false, protectReservations = true }) {
  const physical = Number(current) || 0;
  const committed = Math.max(0, Number(reserved) || 0);
  const amount = Number(quantity) || 0;
  const errors = [];
  if (!(amount > 0)) errors.push('Informe uma quantidade maior que zero.');
  const delta = direction === 'saida' ? -Math.abs(amount) : Math.abs(amount);
  const nextCurrent = physical + delta;
  if (!allowNegativeStock && nextCurrent < 0) errors.push('A saída não pode deixar o saldo físico negativo.');
  if (protectReservations && nextCurrent < committed) errors.push('A saída compromete unidades já reservadas. Revise as reservas antes de continuar.');
  return {
    valid: errors.length === 0,
    errors,
    delta,
    nextCurrent: allowNegativeStock ? nextCurrent : Math.max(0, nextCurrent),
    nextAvailable: allowNegativeStock ? nextCurrent - committed : Math.max(0, nextCurrent - committed),
  };
}

export function applyServiceMaterialStockTransition(lines, transition) {
  const errors = [];
  const grouped = new Map();
  (Array.isArray(lines) ? lines : []).forEach((line, index) => {
    const sku = String(line?.sku || '').trim();
    const quantity = Number(line?.quantity) || 0;
    if (!sku) { errors.push(`Material ${index + 1}: informe o produto do catálogo.`); return; }
    if (!(quantity > 0)) { errors.push(`${sku}: informe uma quantidade maior que zero.`); return; }
    const existing = grouped.get(sku);
    if (existing) existing.quantity += quantity;
    else grouped.set(sku, {
      ...line,
      sku,
      current: Math.max(0, Number(line.current) || 0),
      reserved: Math.max(0, Number(line.reserved) || 0),
      quantity,
    });
  });
  const items = [...grouped.values()].map((line) => {
    let nextCurrent = line.current;
    if (transition === 'consumir') {
      if (line.current - line.reserved < line.quantity) errors.push(`${line.sku}: saldo disponível insuficiente para o consumo da ordem de serviço.`);
      nextCurrent = Math.max(0, line.current - line.quantity);
    } else if (transition === 'estornar') {
      nextCurrent = line.current + line.quantity;
    }
    return { ...line, current: nextCurrent, available: Math.max(0, nextCurrent - line.reserved) };
  });
  return { valid: errors.length === 0, errors: [...new Set(errors)], items };
}

export function calculateServiceExecutionCost({ serviceLines, materials, actualDurationMinutes, total }) {
  const lines = Array.isArray(serviceLines) ? serviceLines : [];
  const materialLines = Array.isArray(materials) ? materials : [];
  const hourly = lines.filter((line) => String(line.unit || '').toLocaleLowerCase('pt-BR') === 'h');
  const nonHourly = lines.filter((line) => String(line.unit || '').toLocaleLowerCase('pt-BR') !== 'h');
  const plannedHours = hourly.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0), 0);
  const plannedHourlyCost = hourly.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.cost) || 0), 0);
  const hourlyRate = plannedHours > 0 ? plannedHourlyCost / plannedHours : 0;
  const actualHours = Math.max(0, Number(actualDurationMinutes) || 0) / 60;
  const laborCost = hourlyRate * actualHours + nonHourly.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.cost) || 0), 0);
  const materialCost = materialLines.reduce((sum, material) => material?.source === 'Cliente' ? sum : sum + Math.max(0, Number(material?.quantity) || 0) * Math.max(0, Number(material?.cost) || 0), 0);
  const actualCost = laborCost + materialCost;
  const revenue = Math.max(0, Number(total) || 0);
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    laborCost: round(laborCost),
    materialCost: round(materialCost),
    actualCost: round(actualCost),
    marginValue: round(revenue - actualCost),
    marginPercent: revenue > 0 ? Math.round(((revenue - actualCost) / revenue) * 1000) / 10 : 0,
  };
}

export function calculateCommercialReport({ operations = [], receivables = [], catalog = [], movements = [], fiscalDrafts = [], todayIso = '' } = {}) {
  const round = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
  const addGroup = (map, label, values = {}) => {
    const key = String(label || 'Não informado');
    const current = map.get(key) || { label: key, count: 0, quantity: 0, revenue: 0, cost: 0, value: 0, received: 0 };
    Object.entries(values).forEach(([field, value]) => { current[field] = (Number(current[field]) || 0) + (Number(value) || 0); });
    map.set(key, current);
  };
  const finalizeGroups = (map, sortBy = 'revenue') => [...map.values()]
    .map((item) => ({ ...item, revenue: round(item.revenue), cost: round(item.cost), value: round(item.value), received: round(item.received), marginValue: round(item.revenue - item.cost), marginPercent: item.revenue > 0 ? round(((item.revenue - item.cost) / item.revenue) * 100) : 0 }))
    .sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0) || a.label.localeCompare(b.label, 'pt-BR'));
  const categories = new Map();
  const products = new Map();
  const services = new Map();
  const clients = new Map();
  const sellers = new Map();
  const technicians = new Map();
  const completed = (Array.isArray(operations) ? operations : []).filter((operation) => ['Faturado', 'Concluído'].includes(operation?.status));
  let revenue = 0;
  let cost = 0;
  let serviceMinutes = 0;
  completed.forEach((operation) => {
    const operationRevenue = Math.max(0, Number(operation?.total) || 0);
    const lines = Array.isArray(operation?.order?.lines) ? operation.order.lines : Array.isArray(operation?.serviceOrder?.lines) ? operation.serviceOrder.lines : [];
    const gross = lines.reduce((sum, line) => sum + Math.max(0, Number(line?.quantity) || 0) * Math.max(0, Number(line?.unitPrice) || 0), 0);
    const baseLineCost = lines.reduce((sum, line) => sum + Math.max(0, Number(line?.quantity) || 0) * Math.max(0, Number(line?.cost) || 0), 0);
    const actualServiceCost = Number(operation?.serviceOrder?.actualCostTotal);
    const operationCost = Number.isFinite(actualServiceCost) ? Math.max(0, actualServiceCost) : baseLineCost;
    revenue += operationRevenue;
    cost += operationCost;
    addGroup(clients, operation?.client, { count: 1, revenue: operationRevenue, cost: operationCost });
    if (operation?.order) addGroup(sellers, operation.order.seller, { count: 1, revenue: operationRevenue, cost: operationCost });
    if (operation?.serviceOrder) addGroup(technicians, operation.serviceOrder.technician, { count: 1, revenue: operationRevenue, cost: operationCost });
    if (operation?.serviceOrder) serviceMinutes += Math.max(0, Number(operation.serviceOrder.actualDurationMinutes) || Number(operation.serviceOrder.durationMinutes) || 0);
    if (!lines.length) {
      addGroup(categories, operation?.serviceOrder ? 'Serviços' : 'Outros', { count: 1, revenue: operationRevenue, cost: operationCost });
      return;
    }
    lines.forEach((line) => {
      const quantity = Math.max(0, Number(line?.quantity) || 0);
      const lineGross = quantity * Math.max(0, Number(line?.unitPrice) || 0);
      const share = gross > 0 ? lineGross / gross : 1 / lines.length;
      const lineRevenue = operationRevenue * share;
      const lineCost = operation?.serviceOrder ? operationCost * share : quantity * Math.max(0, Number(line?.cost) || 0);
      const isService = line?.kind === 'servico' || Boolean(operation?.serviceOrder);
      addGroup(categories, isService ? 'Serviços' : 'Produtos', { count: 1, quantity, revenue: lineRevenue, cost: lineCost });
      addGroup(isService ? services : products, line?.name || line?.sku, { count: 1, quantity, revenue: lineRevenue, cost: lineCost });
    });
  });
  const paymentGroups = new Map();
  let openReceivables = 0;
  let receivedNet = 0;
  let overdueReceivables = 0;
  let dueTermTotal = 0;
  let dueTermCount = 0;
  (Array.isArray(receivables) ? receivables : []).forEach((record) => {
    const balance = receivableBalance(record);
    const received = Math.max(0, (Number(record?.received) || 0) - (Number(record?.refunded) || 0));
    openReceivables += balance;
    receivedNet += received;
    if (balance > 0 && todayIso && String(record?.dueDate || '') < todayIso) overdueReceivables += balance;
    const createdAt = new Date(record?.createdAt || '');
    const dueAt = new Date(`${record?.dueDate || ''}T12:00:00`);
    if (!Number.isNaN(createdAt.getTime()) && !Number.isNaN(dueAt.getTime())) {
      dueTermTotal += Math.max(0, Math.round((dueAt.getTime() - createdAt.getTime()) / 86_400_000));
      dueTermCount += 1;
    }
    addGroup(paymentGroups, record?.method, { count: 1, value: balance, received });
  });
  const inventoryRows = (Array.isArray(catalog) ? catalog : []).filter((item) => item?.trackStock).map((item) => ({
    label: item.name || item.sku,
    sku: item.sku,
    count: 1,
    quantity: Math.max(0, Number(item.available) || 0),
    current: Math.max(0, Number(item.current) || 0),
    reserved: Math.max(0, Number(item.reserved) || 0),
    minimum: Math.max(0, Number(item.minimum) || 0),
    value: round(Math.max(0, Number(item.available) || 0) * Math.max(0, Number(item.cost) || 0)),
    status: stockStatus(item.available, item.minimum),
  })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
  const fiscalGroups = new Map();
  (Array.isArray(fiscalDrafts) ? fiscalDrafts : []).forEach((draft) => addGroup(fiscalGroups, draft?.status, { count: 1, value: Math.max(0, Number(draft?.total) || 0) }));
  const stockConsumed = (Array.isArray(movements) ? movements : []).filter((movement) => movement?.direction === 'saida').reduce((sum, movement) => sum + Math.abs(Number(movement?.quantity) || 0), 0);
  const grossProfit = revenue - cost;
  return {
    revenue: round(revenue),
    cost: round(cost),
    grossProfit: round(grossProfit),
    marginPercent: revenue > 0 ? round((grossProfit / revenue) * 100) : 0,
    completedOperations: completed.length,
    averageTicket: completed.length ? round(revenue / completed.length) : 0,
    serviceHours: round(serviceMinutes / 60),
    openReceivables: round(openReceivables),
    receivedNet: round(receivedNet),
    overdueReceivables: round(overdueReceivables),
    averageDueDays: dueTermCount ? Math.round(dueTermTotal / dueTermCount) : 0,
    stockAvailableValue: round(inventoryRows.reduce((sum, item) => sum + item.value, 0)),
    stockCurrentUnits: round(inventoryRows.reduce((sum, item) => sum + item.current, 0)),
    stockReservedUnits: round(inventoryRows.reduce((sum, item) => sum + item.reserved, 0)),
    stockLowItems: inventoryRows.filter((item) => item.status !== 'normal').length,
    stockConsumed: round(stockConsumed),
    fiscalDrafts: (Array.isArray(fiscalDrafts) ? fiscalDrafts : []).length,
    fiscalReady: (Array.isArray(fiscalDrafts) ? fiscalDrafts : []).filter((draft) => draft?.status === 'Pronto para homologação').length,
    fiscalBlocked: (Array.isArray(fiscalDrafts) ? fiscalDrafts : []).filter((draft) => ['Com pendências', 'Bloqueado para transmissão'].includes(draft?.status)).length,
    fiscalValue: round((Array.isArray(fiscalDrafts) ? fiscalDrafts : []).reduce((sum, draft) => sum + Math.max(0, Number(draft?.total) || 0), 0)),
    categories: finalizeGroups(categories),
    products: finalizeGroups(products),
    services: finalizeGroups(services),
    clients: finalizeGroups(clients),
    sellers: finalizeGroups(sellers),
    technicians: finalizeGroups(technicians),
    payments: finalizeGroups(paymentGroups, 'value'),
    fiscal: finalizeGroups(fiscalGroups, 'value'),
    inventory: inventoryRows,
  };
}

export function buildReportCsv(rows = []) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return ['Indicador;Detalhe;Valor principal;Complemento', ...(Array.isArray(rows) ? rows : []).map((row) => [row?.label, row?.detail, row?.primary, row?.secondary].map(escape).join(';'))].join('\n');
}

export function calculateInventoryCount({ current, reserved, counted, protectReservations = true }) {
  const physical = Math.max(0, Number(current) || 0);
  const committed = Math.max(0, Number(reserved) || 0);
  const count = Number(counted);
  const errors = [];
  if (!Number.isFinite(count) || count < 0) errors.push('Informe uma contagem física igual ou maior que zero.');
  if (protectReservations && Number.isFinite(count) && count < committed) errors.push('A contagem ficou abaixo do saldo reservado. Revise as reservas antes de concluir o inventário.');
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : physical;
  return {
    valid: errors.length === 0,
    errors,
    adjustment: safeCount - physical,
    nextCurrent: safeCount,
    nextAvailable: Math.max(0, safeCount - committed),
  };
}

export function applyOrderStockTransition(lines, transition, { allowNegativeStock = false } = {}) {
  const errors = [];
  const items = (Array.isArray(lines) ? lines : []).map((line) => {
    const current = Math.max(0, Number(line.current) || 0);
    const reserved = Math.max(0, Number(line.reserved) || 0);
    const quantity = Math.max(0, Number(line.quantity) || 0);
    let nextCurrent = current;
    let nextReserved = reserved;
    if (!(quantity > 0)) errors.push(`${line.sku || 'Produto'}: informe uma quantidade maior que zero.`);
    if (transition === 'reservar') {
      if (!allowNegativeStock && current - reserved < quantity) errors.push(`${line.sku || 'Produto'}: saldo disponível insuficiente para reservar.`);
      nextReserved = reserved + quantity;
    } else if (transition === 'liberar') {
      if (reserved < quantity) errors.push(`${line.sku || 'Produto'}: a reserva disponível é menor que a quantidade do pedido.`);
      nextReserved = Math.max(0, reserved - quantity);
    } else if (transition === 'baixar') {
      if (reserved < quantity) errors.push(`${line.sku || 'Produto'}: confirme a reserva antes de baixar o pedido.`);
      if (!allowNegativeStock && current < quantity) errors.push(`${line.sku || 'Produto'}: saldo físico insuficiente para faturar.`);
      nextCurrent = allowNegativeStock ? current - quantity : Math.max(0, current - quantity);
      nextReserved = Math.max(0, reserved - quantity);
    } else if (transition === 'baixar_direto') {
      if (!allowNegativeStock && current - reserved < quantity) errors.push(`${line.sku || 'Produto'}: saldo disponível insuficiente para faturar sem reserva.`);
      nextCurrent = allowNegativeStock ? current - quantity : Math.max(0, current - quantity);
    } else if (transition === 'devolver') {
      nextCurrent = current + quantity;
    }
    return { ...line, current: nextCurrent, reserved: nextReserved, available: allowNegativeStock ? nextCurrent - nextReserved : Math.max(0, nextCurrent - nextReserved) };
  });
  return { valid: errors.length === 0, errors, items };
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function addMonthsToIsoDate(value, offset) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return '';
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1 + offset;
  const day = Number(match[3]);
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function createReceivableSchedule({ total, installments, firstDueDate }) {
  const amount = roundCurrency(Math.max(0, Number(total) || 0));
  const count = Math.max(1, Math.min(48, Math.trunc(Number(installments) || 1)));
  const errors = [];
  if (!(amount > 0)) errors.push('O valor total deve ser maior que zero.');
  if (!isValidIsoDate(firstDueDate)) errors.push('Informe o primeiro vencimento em uma data válida.');
  const base = Math.floor(amount * 100 / count) / 100;
  const items = Array.from({ length: count }, (_, index) => ({
    installment: `${index + 1}/${count}`,
    dueDate: isValidIsoDate(firstDueDate) ? addMonthsToIsoDate(firstDueDate, index) : '',
    value: index === count - 1 ? roundCurrency(amount - base * (count - 1)) : base,
  }));
  return { valid: errors.length === 0, errors, items };
}

export function receivableBalance(record) {
  const principal = Math.max(0, roundCurrency((Number(record?.value) || 0) - (Number(record?.reversed) || 0)));
  const netReceived = Math.max(0, roundCurrency((Number(record?.received) || 0) - (Number(record?.refunded) || 0)));
  return roundCurrency(Math.max(0, principal - netReceived));
}

export function receivableStatus(record, todayIso) {
  const value = Math.max(0, roundCurrency(record?.value));
  const reversed = Math.max(0, roundCurrency(record?.reversed));
  const netReceived = Math.max(0, roundCurrency((Number(record?.received) || 0) - (Number(record?.refunded) || 0)));
  const balance = receivableBalance(record);
  if (reversed >= value && netReceived <= 0) return 'Estornado';
  if (reversed >= value && netReceived > 0) return 'Estorno pendente';
  if (balance <= 0 && value > 0) return 'Recebido';
  if (netReceived > 0) return 'Recebido parcial';
  if (record?.dueDate && todayIso && record.dueDate < todayIso) return 'Atrasado';
  if (record?.dueDate && todayIso && record.dueDate === todayIso) return 'Vence hoje';
  return 'Em aberto';
}

export function applyReceivablePayment(record, amount) {
  const payment = roundCurrency(Number(amount) || 0);
  const balance = receivableBalance(record);
  const errors = [];
  if (!(payment > 0)) errors.push('Informe um valor de recebimento maior que zero.');
  if (payment > balance) errors.push('O recebimento não pode ultrapassar o saldo da parcela.');
  return { valid: errors.length === 0, errors, received: roundCurrency((Number(record?.received) || 0) + Math.min(Math.max(payment, 0), balance)) };
}

export function applyReceivableRefund(record, amount) {
  const refund = roundCurrency(Number(amount) || 0);
  const netReceived = Math.max(0, roundCurrency((Number(record?.received) || 0) - (Number(record?.refunded) || 0)));
  const errors = [];
  if (!(refund > 0)) errors.push('Informe um valor de estorno maior que zero.');
  if (refund > netReceived) errors.push('O estorno não pode ultrapassar o valor líquido recebido.');
  return { valid: errors.length === 0, errors, refunded: roundCurrency((Number(record?.refunded) || 0) + Math.min(Math.max(refund, 0), netReceived)) };
}

export function reverseReceivable(record) {
  const value = Math.max(0, roundCurrency(record?.value));
  const netReceived = Math.max(0, roundCurrency((Number(record?.received) || 0) - (Number(record?.refunded) || 0)));
  return { reversed: value, refunded: roundCurrency((Number(record?.refunded) || 0) + netReceived) };
}

export function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}
