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
  const warnings = [];
  const rawRules = Array.isArray(input?.rules) ? input.rules : [];
  if (rawRules.length > 100) errors.push('A matriz fiscal aceita no máximo 100 regras.');
  const allowed = [
    ['documento', 'documentType', documentTypes], ['operação', 'operation', operations], ['destino', 'destination', destinations],
    ['situação da inscrição estadual', 'recipientProfile', [...recipientProfiles, 'Consumidor final']], ['consumidor final', 'consumerFinal', consumerFinalOptions],
    ['presença', 'presence', presences], ['finalidade fiscal', 'issuePurpose', issuePurposes], ['incidência do ISS', 'serviceIncidenceMode', serviceIncidenceModes],
  ];
  rawRules.forEach((rule, index) => {
    if (!rule || typeof rule !== 'object') { errors.push(`A regra ${index + 1} possui formato inválido.`); return; }
    for (const [label, field, values] of allowed) {
      if (field === 'consumerFinal' && rule[field] == null) continue;
      if (!values.includes(rule[field])) errors.push(`${String(rule.name || rule.id || `Regra ${index + 1}`)}: selecione uma opção válida para ${label}.`);
    }
    if (rule.cfopOverride && !/^\d{4}$/.test(String(rule.cfopOverride))) errors.push(`${String(rule.name || rule.id || `Regra ${index + 1}`)}: informe o CFOP com quatro dígitos ou deixe o campo vazio.`);
  });
  const requestedScope = Array.isArray(requestedDocumentScope) ? requestedDocumentScope : matrix.documentScope;
  const documentScope = [...new Set(requestedScope.filter((documentType) => documentTypes.includes(documentType)))];
  if (Array.isArray(requestedDocumentScope)) {
    if (!requestedDocumentScope.length) errors.push('Selecione ao menos um tipo de nota fiscal para publicar as regras.');
    const invalidDocumentTypes = requestedDocumentScope.filter((documentType) => !documentTypes.includes(documentType));
    if (invalidDocumentTypes.length) errors.push('O escopo da publicação contém um tipo de nota fiscal inválido.');
  }
  const effectiveDocumentScope = documentScope.length ? documentScope : [...documentTypes];
  const activeRules = matrix.rules.filter((rule) => rule.active && effectiveDocumentScope.includes(rule.documentType));
  for (const documentType of effectiveDocumentScope) {
    if (!activeRules.some((rule) => rule.documentType === documentType)) errors.push(`Mantenha ao menos uma regra ativa para ${documentType.toUpperCase()}.`);
  }
  const signatures = new Map();
  for (const rule of activeRules) {
    if (!rule.name) errors.push(`Informe o nome da regra ${rule.id}.`);
    if (!rule.operationNature) errors.push(`${rule.name || rule.id}: informe a natureza da operação.`);
    const key = signature(rule);
    if (signatures.has(key)) errors.push(`${rule.name || rule.id}: existe outra regra ativa com o mesmo escopo.`);
    signatures.set(key, rule.id);
  }
  const reviewedRules = activeRules.filter((rule) => rule.reviewed);
  if (reviewedRules.length && (!matrix.reviewedBy || !matrix.reviewedAt)) errors.push('Informe responsável e data para registrar regras como revisadas.');
  const pending = activeRules.filter((rule) => !rule.reviewed).length;
  if (pending) warnings.push(`${pending} ${pending === 1 ? 'regra ativa ainda precisa' : 'regras ativas ainda precisam'} de revisão fiscal.`);
  if (activeRules.some((rule) => rule.cfopOverride)) warnings.push('CFOPs definidos na matriz substituem o padrão do item somente após revisão da operação.');
  return { matrix, ready: errors.length === 0, errors, warnings, activeCount: activeRules.length, reviewedCount: reviewedRules.length, documentScope: effectiveDocumentScope };
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
