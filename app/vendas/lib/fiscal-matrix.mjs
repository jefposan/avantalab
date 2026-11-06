export const FISCAL_MATRIX_REFERENCE = '2026.09';

const documentTypes = ['nfe', 'nfce', 'nfse'];
const operations = ['Qualquer', 'Venda', 'Prestação de serviço', 'Devolução', 'Remessa', 'Retorno'];
const destinations = ['Qualquer', 'Dentro da UF', 'Fora da UF', 'Exterior', 'Não aplicável'];
const recipientProfiles = ['Qualquer', 'Contribuinte ICMS', 'Contribuinte isento', 'Não contribuinte', 'Não aplicável'];
const consumerFinalOptions = ['Qualquer', 'Sim', 'Não', 'Não aplicável'];
const presences = ['Qualquer', 'Presencial', 'Internet', 'Não presencial', 'Não aplicável'];
const issuePurposes = ['Normal', 'Complementar', 'Devolução', 'Ajuste'];
const serviceIncidenceModes = ['Herdar do serviço', 'Município do prestador', 'Município do tomador', 'Local da execução', 'Definir por operação', 'Não aplicável'];

const baselineRules = [
  { id: 'nfe-venda-interna-contribuinte', name: 'NF-e · venda interna para contribuinte', documentType: 'nfe', priority: 10, operation: 'Venda', destination: 'Dentro da UF', recipientProfile: 'Contribuinte ICMS', consumerFinal: 'Qualquer', presence: 'Qualquer', issuePurpose: 'Normal', operationNature: 'Venda de mercadoria dentro da UF', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: true, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfe-venda-interestadual-contribuinte', name: 'NF-e · venda interestadual para contribuinte', documentType: 'nfe', priority: 20, operation: 'Venda', destination: 'Fora da UF', recipientProfile: 'Contribuinte ICMS', consumerFinal: 'Qualquer', presence: 'Qualquer', issuePurpose: 'Normal', operationNature: 'Venda de mercadoria para outra UF', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: true, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfe-venda-consumidor-final', name: 'NF-e · venda para consumidor final', documentType: 'nfe', priority: 30, operation: 'Venda', destination: 'Qualquer', recipientProfile: 'Qualquer', consumerFinal: 'Sim', presence: 'Qualquer', issuePurpose: 'Normal', operationNature: 'Venda de mercadoria para consumidor final', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: false, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfe-regra-geral', name: 'NF-e · regra geral de segurança', documentType: 'nfe', priority: 900, operation: 'Qualquer', destination: 'Qualquer', recipientProfile: 'Qualquer', consumerFinal: 'Qualquer', presence: 'Qualquer', issuePurpose: 'Normal', operationNature: 'Operação de saída a revisar', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: false, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfce-venda-presencial', name: 'NFC-e · venda presencial ao consumidor', documentType: 'nfce', priority: 10, operation: 'Venda', destination: 'Dentro da UF', recipientProfile: 'Qualquer', consumerFinal: 'Sim', presence: 'Presencial', issuePurpose: 'Normal', operationNature: 'Venda presencial ao consumidor', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: false, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfce-regra-geral', name: 'NFC-e · regra geral de segurança', documentType: 'nfce', priority: 900, operation: 'Qualquer', destination: 'Qualquer', recipientProfile: 'Qualquer', consumerFinal: 'Sim', presence: 'Qualquer', issuePurpose: 'Normal', operationNature: 'Venda ao consumidor a revisar', cfopOverride: '', serviceIncidenceMode: 'Não aplicável', requiresStateRegistration: false, requiresMunicipalIncidence: false, active: true, reviewed: false },
  { id: 'nfse-prestacao-servico', name: 'NFS-e · prestação de serviço', documentType: 'nfse', priority: 10, operation: 'Prestação de serviço', destination: 'Não aplicável', recipientProfile: 'Não aplicável', consumerFinal: 'Não aplicável', presence: 'Não aplicável', issuePurpose: 'Normal', operationNature: 'Prestação de serviço', cfopOverride: '', serviceIncidenceMode: 'Herdar do serviço', requiresStateRegistration: false, requiresMunicipalIncidence: true, active: true, reviewed: false },
];

export function createDefaultFiscalMatrix() {
  return { version: FISCAL_MATRIX_REFERENCE, reviewedAt: '', reviewedBy: '', documentScope: [...documentTypes], rules: baselineRules.map((rule) => ({ ...rule })) };
}

function normalizeRule(rule, index) {
  const fallback = baselineRules.find((item) => item.id === rule?.id) || baselineRules[index] || baselineRules[baselineRules.length - 1];
  const source = rule && typeof rule === 'object' ? rule : {};
  const documentType = documentTypes.includes(source.documentType) ? source.documentType : fallback.documentType;
  const legacyConsumerFinal = source.recipientProfile === 'Consumidor final';
  return {
    ...fallback,
    ...source,
    id: String(source.id || `${documentType}-regra-${index + 1}`).trim(),
    name: String(source.name || '').trim(),
    documentType,
    priority: Math.max(1, Math.min(999, Number(source.priority) || fallback.priority || 100)),
    operation: String(source.operation || 'Qualquer'),
    destination: String(source.destination || 'Qualquer'),
    recipientProfile: legacyConsumerFinal ? 'Qualquer' : String(source.recipientProfile || fallback.recipientProfile || 'Qualquer'),
    consumerFinal: legacyConsumerFinal ? 'Sim' : String(source.consumerFinal || fallback.consumerFinal || (documentType === 'nfse' ? 'Não aplicável' : 'Qualquer')),
    presence: String(source.presence || 'Qualquer'),
    issuePurpose: String(source.issuePurpose || 'Normal'),
    operationNature: String(source.operationNature || '').trim(),
    cfopOverride: String(source.cfopOverride || '').replace(/\D/g, '').slice(0, 4),
    serviceIncidenceMode: String(source.serviceIncidenceMode || (documentType === 'nfse' ? 'Herdar do serviço' : 'Não aplicável')),
    requiresStateRegistration: Boolean(source.requiresStateRegistration),
    requiresMunicipalIncidence: Boolean(source.requiresMunicipalIncidence),
    active: source.active !== false,
    reviewed: Boolean(source.reviewed),
  };
}

export function normalizeFiscalMatrix(input) {
  const source = input && typeof input === 'object' ? input : {};
  const sourceRules = Array.isArray(source.rules) && source.rules.length ? source.rules : baselineRules;
  const seenIds = new Set();
  const rules = sourceRules.map((rule, index) => {
    const normalized = normalizeRule(rule, index);
    const baseId = normalized.id || `regra-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) { id = `${baseId}-${suffix}`; suffix += 1; }
    seenIds.add(id);
    return { ...normalized, id };
  });
  return {
    version: FISCAL_MATRIX_REFERENCE,
    reviewedAt: String(source.reviewedAt || ''),
    reviewedBy: String(source.reviewedBy || '').trim(),
    documentScope: [...new Set((Array.isArray(source.documentScope) ? source.documentScope : documentTypes).filter((documentType) => documentTypes.includes(documentType)))],
    rules,
  };
}

function signature(rule) {
  return [rule.documentType, rule.operation, rule.destination, rule.recipientProfile, rule.consumerFinal, rule.presence, rule.issuePurpose].join('|');
}

export function validateFiscalMatrix(input, requestedDocumentScope) {
  const matrix = normalizeFiscalMatrix(input);
  const errors = [];
  const issues = [];
  const addError = (message, field = 'matrix', ruleId = '') => { errors.push(message); issues.push({ code: 'AV-FISCAL-RULES-MATRIX', message, field, ruleId }); };
  const warnings = [];
  const rawRules = Array.isArray(input?.rules) ? input.rules : [];
  const requestedScope = Array.isArray(requestedDocumentScope) ? requestedDocumentScope : matrix.documentScope;
  const documentScope = [...new Set(requestedScope.filter((documentType) => documentTypes.includes(documentType)))];
  const effectiveDocumentScope = documentScope.length ? documentScope : [...documentTypes];
  if (rawRules.length > 100) addError('A matriz fiscal aceita no máximo 100 regras.');
  const allowed = [
    ['documento', 'documentType', documentTypes], ['operação', 'operation', operations], ['destino', 'destination', destinations],
    ['situação da inscrição estadual', 'recipientProfile', [...recipientProfiles, 'Consumidor final']], ['consumidor final', 'consumerFinal', consumerFinalOptions],
    ['presença', 'presence', presences], ['finalidade fiscal', 'issuePurpose', issuePurposes], ['incidência do ISS', 'serviceIncidenceMode', serviceIncidenceModes],
  ];
  rawRules.forEach((rule, index) => {
    if (!rule || typeof rule !== 'object') { addError(`A regra ${index + 1} possui formato inválido.`); return; }
    for (const [label, field, values] of allowed) {
      if (field === 'consumerFinal' && rule[field] == null) continue;
      if (!values.includes(rule[field])) addError(`${String(rule.name || rule.id || `Regra ${index + 1}`)}: selecione uma opção válida para ${label}.`, field, matrix.rules[index].id);
    }
    if (rule.cfopOverride && !/^\d{4}$/.test(String(rule.cfopOverride))) addError(`${String(rule.name || rule.id || `Regra ${index + 1}`)}: informe o CFOP com quatro dígitos.`, 'cfopOverride', matrix.rules[index].id);
    if (rule.active !== false && effectiveDocumentScope.includes(rule.documentType)
      && ['nfe', 'nfce'].includes(rule.documentType) && !String(rule.cfopOverride || '').trim()) addError(`${String(rule.name || rule.id || `Regra ${index + 1}`)}: informe o CFOP da operação para a emissão.`, 'cfopOverride', matrix.rules[index].id);
  });
  if (Array.isArray(requestedDocumentScope)) {
    if (!requestedDocumentScope.length) addError('Selecione ao menos um tipo de nota fiscal para publicar as regras.');
    const invalidDocumentTypes = requestedDocumentScope.filter((documentType) => !documentTypes.includes(documentType));
    if (invalidDocumentTypes.length) addError('O escopo da publicação contém um tipo de nota fiscal inválido.');
  }
  const activeRules = matrix.rules.filter((rule) => rule.active && effectiveDocumentScope.includes(rule.documentType));
  for (const documentType of effectiveDocumentScope) {
    if (!activeRules.some((rule) => rule.documentType === documentType)) addError(`Mantenha ao menos uma regra ativa para ${documentType.toUpperCase()}.`, 'active', matrix.rules.find((rule) => rule.documentType === documentType)?.id || '');
  }
  const signatures = new Map();
  for (const rule of activeRules) {
    if (!rule.name) addError(`Informe o nome da regra ${rule.id}.`, 'name', rule.id);
    if (!rule.operationNature) addError(`${rule.name || rule.id}: informe a natureza da operação.`, 'operationNature', rule.id);
    const key = signature(rule);
    if (signatures.has(key)) addError(`${rule.name || rule.id}: existe outra regra ativa com o mesmo escopo.`, 'operation', rule.id);
    signatures.set(key, rule.id);
  }
  const reviewedRules = activeRules.filter((rule) => rule.reviewed);
  if (reviewedRules.length && !matrix.reviewedBy) addError('Revisado por: informe o responsável pela revisão.', 'reviewedBy');
  if (reviewedRules.length && !matrix.reviewedAt) addError('Data da revisão: informe a data da conferência.', 'reviewedAt');
  const pending = activeRules.filter((rule) => !rule.reviewed).length;
  if (pending) warnings.push(`${pending} ${pending === 1 ? 'regra ativa ainda precisa' : 'regras ativas ainda precisam'} de revisão fiscal.`);
  if (activeRules.some((rule) => rule.cfopOverride)) warnings.push('CFOPs são definidos pela regra fiscal da operação e exigem revisão antes da emissão.');
  return { matrix, ready: errors.length === 0, errors, issues, warnings, activeCount: activeRules.length, reviewedCount: reviewedRules.length, documentScope: effectiveDocumentScope };
}

export function validFiscalReviewDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10);
}

export function validateFiscalMatrixPublication(input = {}) {
  const source = input.matrix && typeof input.matrix === 'object' ? input.matrix : {};
  const reviewedBy = String(input.fiscalResponsible || source.reviewedBy || '').trim();
  const reviewedAt = String(input.reviewedAt || source.reviewedAt || '').trim();
  const validation = validateFiscalMatrix({ ...source, reviewedBy, reviewedAt }, input.documentScope);
  const issues = [...validation.issues];
  const add = (code, field, message, ruleId = '') => {
    if (!issues.some((issue) => issue.field === field && issue.ruleId === ruleId)) issues.push({ code, field, message, ruleId });
  };
  if (!reviewedBy) add('AV-FISCAL-RULES-RESPONSIBLE', 'reviewedBy', 'Revisado por: informe o responsável pela revisão.');
  if (!validFiscalReviewDate(reviewedAt)) add('AV-FISCAL-RULES-REVIEW-DATE', 'reviewedAt', 'Data da revisão: informe uma data válida, sem usar uma data futura.');
  if (input.taxReviewConfirmed !== true) add('AV-FISCAL-RULES-TAX-REVIEW', 'taxReviewConfirmed', 'Cadastro fiscal conferido: confirme a revisão dos dados da empresa.');
  if (input.taxReformReviewConfirmed !== true) add('AV-FISCAL-RULES-TAX-REFORM', 'taxReformReviewConfirmed', 'Regras atuais conferidas: confirme a revisão tributária.');
  for (const rule of validation.matrix.rules) {
    if (rule.active && validation.documentScope.includes(rule.documentType) && !rule.reviewed) {
      add('AV-FISCAL-RULES-REVIEW', 'reviewed', `${rule.name || rule.id}: marque Regra revisada após conferir os dados.`, rule.id);
    }
  }
  return { ...validation, issues, errors: issues.map((issue) => issue.message), ready: issues.length === 0 };
}

function matches(expected, actual) {
  return expected === 'Qualquer' || expected === actual;
}

export function resolveFiscalMatrixRule({ matrix: input, documentType, operation, destination, recipientProfile, consumerFinal, presence, issuePurpose }) {
  const matrix = normalizeFiscalMatrix(input);
  const context = {
    operation: operation || 'Qualquer',
    destination: destination || 'Qualquer',
    recipientProfile: recipientProfile || 'Qualquer',
    consumerFinal: consumerFinal || 'Qualquer',
    presence: presence || 'Qualquer',
    issuePurpose: issuePurpose || 'Normal',
  };
  const candidates = matrix.rules.filter((rule) => rule.active && rule.documentType === documentType
    && matches(rule.operation, context.operation)
    && matches(rule.destination, context.destination)
    && matches(rule.recipientProfile, context.recipientProfile)
    && matches(rule.consumerFinal, context.consumerFinal)
    && matches(rule.presence, context.presence)
    && matches(rule.issuePurpose, context.issuePurpose));
  const specificity = (rule) => [rule.operation, rule.destination, rule.recipientProfile, rule.consumerFinal, rule.presence, rule.issuePurpose].filter((value) => value !== 'Qualquer').length;
  candidates.sort((left, right) => specificity(right) - specificity(left) || left.priority - right.priority || left.name.localeCompare(right.name, 'pt-BR'));
  const rule = candidates[0] || null;
  return {
    matrixReference: matrix.version,
    context,
    matched: Boolean(rule),
    reviewed: Boolean(rule?.reviewed && matrix.reviewedBy && matrix.reviewedAt),
    rule,
    reason: !rule ? 'Nenhuma regra ativa corresponde ao contexto da operação.' : rule.reviewed ? 'Regra correspondente encontrada; confira os dados da operação.' : 'Regra correspondente encontrada, mas ainda não foi revisada pelo responsável fiscal.',
  };
}
