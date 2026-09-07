export const FISCAL_HOMOLOGATION_REFERENCE = '2026.08';

export const FISCAL_HOMOLOGATION_STATUSES = [
  'Não iniciado',
  'Em preparação',
  'Pronto para teste externo',
  'Aguardando evidência',
  'Validado externamente',
  'Reprovado',
  'Não aplicável',
];

const DOCUMENT_TYPES = ['nfe', 'nfce', 'nfse'];

const scenarioTemplates = [
  ['nfe-interna-contribuinte', 'nfe', 'Venda interna para contribuinte', 'Validar autorização de uma NF-e interna com destinatário contribuinte e classificação fiscal completa.', 'Autorização no ambiente de homologação, retorno armazenado e DANFE identificado como sem valor fiscal.'],
  ['nfe-interestadual-contribuinte', 'nfe', 'Venda interestadual para contribuinte', 'Conferir destino, CFOP interestadual, cadastro do destinatário e totais da operação.', 'Autorização no ambiente de homologação com regra interestadual comprovada na evidência.'],
  ['nfe-consumidor-final', 'nfe', 'Venda para consumidor final', 'Validar o tratamento cadastral e tributário do consumidor final conforme o cenário da empresa.', 'Resposta do autorizador registrada e dados do destinatário conferidos.'],
  ['nfe-cancelamento', 'nfe', 'Evento de cancelamento da NF-e', 'Confirmar prazo, justificativa, evento e reconciliação do documento autorizado em teste.', 'Evento aceito no ambiente de homologação e situação conciliada no sistema.'],
  ['nfce-presencial', 'nfce', 'Venda presencial ao consumidor', 'Validar NFC-e modelo 65, pagamento, QR Code e parâmetros próprios da UF.', 'Autorização em homologação e DANFE NFC-e/QR Code conferidos com identificação de teste.'],
  ['nfce-cancelamento', 'nfce', 'Cancelamento da NFC-e', 'Confirmar evento, prazo da UF e reconciliação da venda de teste.', 'Evento aceito em homologação e operação conciliada.'],
  ['nfse-municipio', 'nfse', 'Serviço no município do prestador', 'Validar DPS/NFS-e, serviço nacional, código municipal, incidência e dados do tomador.', 'NFS-e de teste gerada pela rota definida e evidência do retorno armazenada.'],
  ['nfse-fora-municipio', 'nfse', 'Serviço com incidência em outro município', 'Conferir município de incidência, retenção e regras municipais aplicáveis ao piloto.', 'Retorno do ambiente de testes registrado e incidência revisada pelo responsável fiscal.'],
  ['nfse-evento', 'nfse', 'Cancelamento ou substituição da NFS-e', 'Validar o evento suportado pela rota nacional, prefeitura ou provedor municipal escolhido.', 'Evento de teste registrado e situação final reconciliada.'],
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function companySnapshot(company = {}) {
  const rawCity = text(company.city);
  const inferredUf = text(company.uf) || rawCity.match(/\/([A-Z]{2})$/)?.[1] || '';
  return {
    name: text(company.name),
    document: text(company.document),
    uf: inferredUf.slice(0, 2).toUpperCase(),
    city: rawCity.replace(/\/[A-Z]{2}$/, ''),
    cityCode: text(company.cityCode).replace(/\D/g, '').slice(0, 7),
    taxRegime: text(company.taxRegime),
  };
}

function defaultScenario(template) {
  const [id, documentType, title, purpose, expectedResult] = template;
  return {
    id,
    documentType,
    title,
    purpose,
    expectedResult,
    required: true,
    status: 'Não iniciado',
    evidenceReference: '',
    externalReference: '',
    testedAt: '',
    testedBy: '',
    notes: '',
  };
}

export function createDefaultFiscalHomologationPlan(company = {}) {
  return {
    version: 1,
    reference: FISCAL_HOMOLOGATION_REFERENCE,
    company: companySnapshot(company),
    coordinator: '',
    targetDate: '',
    providerMode: 'Não definido',
    nfseAuthorityMode: 'Não definido',
    documentScope: [...DOCUMENT_TYPES],
    notes: '',
    scenarios: scenarioTemplates.map(defaultScenario),
  };
}

export function normalizeFiscalHomologationPlan(value, company = {}) {
  const fallback = createDefaultFiscalHomologationPlan(company);
  if (!value || typeof value !== 'object') return fallback;
  const source = value;
  const sourceScenarios = Array.isArray(source.scenarios) ? source.scenarios : [];
  const known = new Map(fallback.scenarios.map((scenario) => [scenario.id, scenario]));
  const scenarios = sourceScenarios.map((scenario, index) => {
    const base = known.get(text(scenario?.id)) ?? fallback.scenarios[index] ?? defaultScenario(scenarioTemplates[0]);
    const documentType = DOCUMENT_TYPES.includes(scenario?.documentType) ? scenario.documentType : base.documentType;
    return {
      ...base,
      ...scenario,
      id: text(scenario?.id) || base.id,
      documentType,
      title: text(scenario?.title) || base.title,
      purpose: text(scenario?.purpose) || base.purpose,
      expectedResult: text(scenario?.expectedResult) || base.expectedResult,
      required: scenario?.required !== false,
      status: FISCAL_HOMOLOGATION_STATUSES.includes(scenario?.status) ? scenario.status : 'Não iniciado',
      evidenceReference: text(scenario?.evidenceReference),
      externalReference: text(scenario?.externalReference),
      testedAt: text(scenario?.testedAt),
      testedBy: text(scenario?.testedBy),
      notes: text(scenario?.notes),
    };
  });
  const presentIds = new Set(scenarios.map((scenario) => scenario.id));
  fallback.scenarios.forEach((scenario) => { if (!presentIds.has(scenario.id)) scenarios.push(scenario); });
  const requestedScope = Array.isArray(source.documentScope) ? source.documentScope.filter((item) => DOCUMENT_TYPES.includes(item)) : fallback.documentScope;
  return {
    ...fallback,
    ...source,
    version: 1,
    reference: FISCAL_HOMOLOGATION_REFERENCE,
    company: companySnapshot({ ...fallback.company, ...(source.company ?? {}) }),
    coordinator: text(source.coordinator),
    targetDate: text(source.targetDate),
    providerMode: text(source.providerMode) || 'Não definido',
    nfseAuthorityMode: text(source.nfseAuthorityMode) || 'Não definido',
    documentScope: [...new Set(requestedScope)],
    notes: text(source.notes),
    scenarios,
  };
}

export function validateFiscalHomologationPlan(value) {
  const plan = normalizeFiscalHomologationPlan(value);
  const errors = [];
  const warnings = [];
  if (!plan.company.name || !plan.company.document || !plan.company.uf || !plan.company.city || plan.company.cityCode.length !== 7 || !plan.company.taxRegime) errors.push('Revise CNPJ, CEP, município/UF e regime tributário nos dados da empresa ativa para identificar automaticamente o município fiscal.');
  if (!plan.documentScope.length) errors.push('Selecione ao menos um documento para o plano de homologação.');
  if (!plan.coordinator) warnings.push('Defina o responsável pela coordenação dos testes.');
  if (!plan.targetDate) warnings.push('Defina uma data-alvo para o ciclo de homologação.');
  if (plan.providerMode === 'Não definido') warnings.push('A estratégia de integração ainda não foi definida.');
  if (plan.documentScope.includes('nfse') && plan.nfseAuthorityMode === 'Não definido') warnings.push('Defina a rota autorizadora da NFS-e antes do teste externo.');
  const ids = new Set();
  plan.scenarios.forEach((scenario) => {
    if (ids.has(scenario.id)) errors.push(`O identificador ${scenario.id} está repetido.`);
    ids.add(scenario.id);
    if (!scenario.title || !scenario.purpose || !scenario.expectedResult) errors.push(`Complete a descrição do cenário ${scenario.id}.`);
    if (scenario.required && scenario.status === 'Não aplicável') errors.push(`O cenário obrigatório “${scenario.title}” não pode ser marcado como não aplicável.`);
    if (scenario.status === 'Validado externamente' && (!scenario.testedBy || !scenario.testedAt || !scenario.evidenceReference || !scenario.externalReference)) errors.push(`Informe responsável, data, evidência e referência externa para validar “${scenario.title}”.`);
    if (scenario.status === 'Pronto para teste externo' && (!plan.coordinator || !plan.targetDate || plan.providerMode === 'Não definido')) warnings.push(`O cenário “${scenario.title}” ainda depende da coordenação, data-alvo e estratégia de integração.`);
  });
  plan.documentScope.forEach((documentType) => {
    const required = plan.scenarios.filter((scenario) => scenario.documentType === documentType && scenario.required);
    if (!required.length) errors.push(`Inclua ao menos um cenário obrigatório para ${documentType.toUpperCase()}.`);
  });
  const activeScenarios = plan.scenarios.filter((scenario) => plan.documentScope.includes(scenario.documentType) && scenario.status !== 'Não aplicável');
  const requiredScenarios = activeScenarios.filter((scenario) => scenario.required);
  const validatedScenarios = requiredScenarios.filter((scenario) => scenario.status === 'Validado externamente');
  const evidenceCount = activeScenarios.filter((scenario) => scenario.evidenceReference && scenario.externalReference).length;
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    total: activeScenarios.length,
    required: requiredScenarios.length,
    validated: validatedScenarios.length,
    evidenceCount,
    progress: requiredScenarios.length ? Math.round(validatedScenarios.length / requiredScenarios.length * 100) : 0,
    readyForExternalCycle: errors.length === 0 && Boolean(plan.coordinator && plan.targetDate && plan.providerMode !== 'Não definido') && (!plan.documentScope.includes('nfse') || plan.nfseAuthorityMode !== 'Não definido'),
    externallyValidated: errors.length === 0 && requiredScenarios.length > 0 && validatedScenarios.length === requiredScenarios.length,
  };
}
