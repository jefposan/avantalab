export const FISCAL_INTEGRATION_EVALUATION_REFERENCE = '2026.08';

export const FISCAL_INTEGRATION_MODES = ['Provedor fiscal', 'Integração direta', 'PAA'];
export const FISCAL_INTEGRATION_DECISION_STATUSES = ['Sem decisão', 'Pré-selecionado', 'Aprovado para homologação'];

const DOCUMENT_TYPES = ['nfe', 'nfce', 'nfse'];

const defaultCriteria = [
  { id: 'coverage', name: 'Cobertura fiscal', description: 'NF-e, NFC-e, NFS-e, municípios, eventos e contingência necessários ao piloto.', weight: 20, mandatory: true },
  { id: 'security', name: 'Segurança e certificado', description: 'Custódia, assinatura, segregação de ambientes, auditoria e resposta a incidentes.', weight: 18, mandatory: true },
  { id: 'compliance', name: 'Atualização legal e técnica', description: 'Acompanhamento de schemas, notas técnicas, IBS/CBS e CNPJ alfanumérico.', weight: 14, mandatory: true },
  { id: 'homologation', name: 'Homologação e suporte', description: 'Sandbox, documentação, acompanhamento do piloto, SLA e suporte especializado.', weight: 14, mandatory: true },
  { id: 'resilience', name: 'Resiliência e contingência', description: 'Retentativas, idempotência, consulta, reconciliação e planos por autorizador.', weight: 12, mandatory: true },
  { id: 'traceability', name: 'Guarda e rastreabilidade', description: 'XML, protocolos, eventos, logs, backup, retenção e recuperação.', weight: 10, mandatory: true },
  { id: 'cost', name: 'Custo total', description: 'Implantação, mensalidade, volume, suporte e manutenção interna.', weight: 8, mandatory: false },
  { id: 'portability', name: 'Portabilidade e saída', description: 'Exportação, ausência de dependência excessiva e plano de troca de fornecedor.', weight: 4, mandatory: false },
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finite(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function candidateTemplate(id, name, mode) {
  return {
    id,
    name,
    mode,
    documents: [],
    municipalityCoverage: '',
    testEnvironment: false,
    apiDocumentationReviewed: false,
    certificateModel: 'Não definido',
    supportModel: 'Não definido',
    contingencyModel: 'Não definido',
    storageYears: 0,
    setupFee: 0,
    monthlyFee: 0,
    perDocumentFee: 0,
    implementationDays: 0,
    slaPercent: 0,
    contractTermMonths: 0,
    exitPlan: '',
    notes: '',
    ratings: Object.fromEntries(defaultCriteria.map((criterion) => [criterion.id, 0])),
  };
}

export function createDefaultFiscalIntegrationEvaluation() {
  return {
    version: 1,
    reference: FISCAL_INTEGRATION_EVALUATION_REFERENCE,
    monthlyDocumentVolume: 300,
    requiredDocuments: [...DOCUMENT_TYPES],
    criteria: defaultCriteria.map((criterion) => ({ ...criterion })),
    candidates: [
      candidateTemplate('provider-candidate', 'Provedor fiscal a pesquisar', 'Provedor fiscal'),
      candidateTemplate('direct-integration', 'Integração direta', 'Integração direta'),
      candidateTemplate('paa-candidate', 'PAA habilitado a pesquisar', 'PAA'),
    ],
    decision: { status: 'Sem decisão', candidateId: '', decidedBy: '', decidedAt: '', justification: '' },
  };
}

export function normalizeFiscalIntegrationEvaluation(value) {
  const fallback = createDefaultFiscalIntegrationEvaluation();
  if (!value || typeof value !== 'object') return fallback;
  const source = value;
  const sourceCriteria = Array.isArray(source.criteria) ? source.criteria : fallback.criteria;
  const criteria = sourceCriteria.map((criterion, index) => {
    const base = fallback.criteria.find((item) => item.id === criterion?.id) ?? fallback.criteria[index] ?? fallback.criteria[0];
    return { ...base, ...criterion, id: text(criterion?.id) || base.id, name: text(criterion?.name) || base.name, description: text(criterion?.description) || base.description, weight: finite(criterion?.weight, base.weight, 0, 100), mandatory: criterion?.mandatory === true };
  });
  const candidates = (Array.isArray(source.candidates) ? source.candidates : fallback.candidates).map((candidate, index) => {
    const base = fallback.candidates.find((item) => item.id === candidate?.id) ?? candidateTemplate(`candidate-${index + 1}`, `Candidato ${index + 1}`, 'Provedor fiscal');
    const ratings = Object.fromEntries(criteria.map((criterion) => [criterion.id, finite(candidate?.ratings?.[criterion.id], 0, 0, 5)]));
    return {
      ...base,
      ...candidate,
      id: text(candidate?.id) || base.id,
      name: text(candidate?.name) || base.name,
      mode: FISCAL_INTEGRATION_MODES.includes(candidate?.mode) ? candidate.mode : base.mode,
      documents: [...new Set((Array.isArray(candidate?.documents) ? candidate.documents : []).filter((item) => DOCUMENT_TYPES.includes(item)))],
      municipalityCoverage: text(candidate?.municipalityCoverage),
      testEnvironment: candidate?.testEnvironment === true,
      apiDocumentationReviewed: candidate?.apiDocumentationReviewed === true,
      certificateModel: text(candidate?.certificateModel) || 'Não definido',
      supportModel: text(candidate?.supportModel) || 'Não definido',
      contingencyModel: text(candidate?.contingencyModel) || 'Não definido',
      storageYears: finite(candidate?.storageYears, 0, 0, 100),
      setupFee: finite(candidate?.setupFee),
      monthlyFee: finite(candidate?.monthlyFee),
      perDocumentFee: finite(candidate?.perDocumentFee),
      implementationDays: finite(candidate?.implementationDays, 0, 0, 3650),
      slaPercent: finite(candidate?.slaPercent, 0, 0, 100),
      contractTermMonths: finite(candidate?.contractTermMonths, 0, 0, 240),
      exitPlan: text(candidate?.exitPlan),
      notes: text(candidate?.notes),
      ratings,
    };
  });
  const decisionSource = source.decision ?? {};
  return {
    ...fallback,
    ...source,
    version: 1,
    reference: FISCAL_INTEGRATION_EVALUATION_REFERENCE,
    monthlyDocumentVolume: finite(source.monthlyDocumentVolume, fallback.monthlyDocumentVolume, 1, 10000000),
    requiredDocuments: [...new Set((Array.isArray(source.requiredDocuments) ? source.requiredDocuments : fallback.requiredDocuments).filter((item) => DOCUMENT_TYPES.includes(item)))],
    criteria,
    candidates,
    decision: {
      status: FISCAL_INTEGRATION_DECISION_STATUSES.includes(decisionSource.status) ? decisionSource.status : 'Sem decisão',
      candidateId: text(decisionSource.candidateId),
      decidedBy: text(decisionSource.decidedBy),
      decidedAt: text(decisionSource.decidedAt),
      justification: text(decisionSource.justification),
    },
  };
}

export function evaluateFiscalIntegrationOptions(value) {
  const evaluation = normalizeFiscalIntegrationEvaluation(value);
  const criteriaWeight = evaluation.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const candidates = evaluation.candidates.map((candidate) => {
    const weightedScore = criteriaWeight ? evaluation.criteria.reduce((sum, criterion) => sum + finite(candidate.ratings[criterion.id], 0, 0, 5) * criterion.weight, 0) / (criteriaWeight * 5) * 100 : 0;
    const monthlyCost = candidate.monthlyFee + candidate.perDocumentFee * evaluation.monthlyDocumentVolume + candidate.setupFee / 12;
    const mandatoryGaps = [
      ...evaluation.requiredDocuments.filter((documentType) => !candidate.documents.includes(documentType)).map((documentType) => `Sem cobertura confirmada para ${documentType.toUpperCase()}`),
      ...(evaluation.requiredDocuments.includes('nfse') && !candidate.municipalityCoverage ? ['Cobertura municipal da NFS-e não comprovada'] : []),
      ...evaluation.criteria.filter((criterion) => criterion.mandatory && !(candidate.ratings[criterion.id] > 0)).map((criterion) => `Critério obrigatório sem nota: ${criterion.name}`),
      ...(!candidate.testEnvironment ? ['Ambiente de testes não confirmado'] : []),
      ...(!candidate.apiDocumentationReviewed ? ['Documentação de API não revisada'] : []),
      ...(candidate.certificateModel === 'Não definido' ? ['Modelo de certificado não definido'] : []),
      ...(candidate.supportModel === 'Não definido' ? ['Modelo de suporte não definido'] : []),
      ...(candidate.contingencyModel === 'Não definido' ? ['Contingência não definida'] : []),
      ...(!(candidate.storageYears > 0) ? ['Prazo de guarda dos artefatos não definido'] : []),
      ...(!candidate.exitPlan ? ['Plano de saída não definido'] : []),
    ];
    return { ...candidate, weightedScore: Math.round(weightedScore * 10) / 10, monthlyCost: Math.round(monthlyCost * 100) / 100, mandatoryGaps, complete: mandatoryGaps.length === 0 };
  });
  const eligible = candidates.filter((candidate) => candidate.complete && candidate.weightedScore > 0).sort((a, b) => b.weightedScore - a.weightedScore || a.monthlyCost - b.monthlyCost);
  return { evaluation, candidates, criteriaWeight, recommendedCandidateId: eligible[0]?.id ?? '' };
}

export function validateFiscalIntegrationEvaluation(value) {
  const result = evaluateFiscalIntegrationOptions(value);
  const { evaluation, candidates, criteriaWeight } = result;
  const errors = [];
  const warnings = [];
  if (criteriaWeight !== 100) errors.push(`Os pesos dos critérios devem somar 100%; o total atual é ${criteriaWeight}%.`);
  if (!evaluation.requiredDocuments.length) errors.push('Selecione ao menos um documento fiscal obrigatório.');
  if (!evaluation.candidates.length) errors.push('Inclua ao menos uma alternativa de integração.');
  const ids = new Set();
  evaluation.candidates.forEach((candidate) => {
    if (ids.has(candidate.id)) errors.push(`O identificador ${candidate.id} está repetido.`);
    ids.add(candidate.id);
    if (!candidate.name) errors.push('Todos os candidatos precisam de identificação.');
  });
  const decisionCandidate = candidates.find((candidate) => candidate.id === evaluation.decision.candidateId);
  if (evaluation.decision.status !== 'Sem decisão' && !decisionCandidate) errors.push('Selecione o candidato relacionado à decisão.');
  if (evaluation.decision.status === 'Aprovado para homologação') {
    if (!evaluation.decision.decidedBy || !evaluation.decision.decidedAt || !evaluation.decision.justification) errors.push('Informe responsável, data e justificativa para aprovar uma alternativa para homologação.');
    if (decisionCandidate && !decisionCandidate.complete) errors.push('A alternativa aprovada ainda possui requisitos obrigatórios pendentes.');
  }
  candidates.forEach((candidate) => {
    if (candidate.monthlyCost === 0) warnings.push(`Registre os custos estimados de “${candidate.name}”.`);
    if (!candidate.complete) warnings.push(`“${candidate.name}” possui ${candidate.mandatoryGaps.length} requisitos obrigatórios pendentes.`);
  });
  return { ...result, valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], approvedForHomologation: errors.length === 0 && evaluation.decision.status === 'Aprovado para homologação' && Boolean(decisionCandidate?.complete) };
}
