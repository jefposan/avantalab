import { resolveMunicipalityCode } from './municipality.mjs';

export const FISCAL_ISSUER_ROUTING_REFERENCE = '2026.08';

export const FISCAL_REGISTRATION_STATUSES = ['Não configurado', 'Pendente', 'Homologação', 'Produção'];
export const FISCAL_NFSE_ROUTE_MODES = ['Automática', 'SEFIN Nacional', 'Emissor municipal'];
export const FISCAL_CSC_STATUSES = ['Não configurado', 'Pendente', 'Configurado'];

const DOCUMENT_TYPES = ['nfe', 'nfce', 'nfse'];
const UF_CODES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const STATE_AUTHORITY_BY_UF = {
  AM: 'SEFAZ/AM', BA: 'SEFAZ/BA', GO: 'SEFAZ/GO', MG: 'SEFAZ/MG', MS: 'SEFAZ/MS', MT: 'SEFAZ/MT', PE: 'SEFAZ/PE', PR: 'SEFAZ/PR', RS: 'SEFAZ/RS', SP: 'SEFAZ/SP', MA: 'SVAN',
  AC: 'SVRS', AL: 'SVRS', AP: 'SVRS', CE: 'SVRS', DF: 'SVRS', ES: 'SVRS', PA: 'SVRS', PB: 'SVRS', PI: 'SVRS', RJ: 'SVRS', RN: 'SVRS', RO: 'SVRS', RR: 'SVRS', SC: 'SVRS', SE: 'SVRS', TO: 'SVRS',
};

const SVC_AN_UFS = new Set(['AC', 'AL', 'AP', 'CE', 'DF', 'ES', 'MG', 'PA', 'PB', 'PI', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']);
const SVC_RS_UFS = new Set(['AM', 'BA', 'GO', 'MA', 'MS', 'MT', 'PE', 'PR']);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function companyUf(company) {
  const explicit = text(company?.uf || company?.state).toUpperCase();
  if (UF_CODES.includes(explicit)) return explicit;
  return text(company?.city).match(/\/([A-Z]{2})$/)?.[1] || '';
}

function companyCity(company) {
  return text(company?.city).replace(/\/[A-Z]{2}$/, '').trim();
}

function registration(enabled = true, series = '1') {
  return { enabled, registrationStatus: 'Pendente', series };
}

export function createFiscalEstablishmentFromCompany(company = {}, index = 0) {
  const document = digits(company.document);
  const taxRegime = text(company.taxRegime) || 'Não definido';
  const uf = companyUf(company);
  const city = companyCity(company);
  const cep = digits(company.cep).slice(0, 8);
  return {
    id: `establishment-${document || index + 1}`,
    label: index === 0 ? 'Matriz' : `Filial ${index + 1}`,
    kind: index === 0 ? 'Matriz' : 'Filial',
    active: true,
    legalName: text(company.legalName) || text(company.name) || 'Estabelecimento a configurar',
    document,
    uf,
    city,
    cityCode: resolveMunicipalityCode({ city, uf, cep, currentCode: company.cityCode }),
    cep,
    street: text(company.street),
    number: text(company.number),
    complement: text(company.complement),
    district: text(company.district),
    phone: digits(company.phone).slice(0, 14),
    taxRegime,
    stateRegistration: text(company.stateRegistration),
    municipalRegistration: text(company.municipalRegistration),
    documents: {
      nfe: registration(true, '1'),
      nfce: { ...registration(true, '1'), cscStatus: 'Pendente' },
      nfse: { ...registration(true, '90001'), routeMode: 'Automática' },
    },
  };
}

export function createFiscalIssuerRegistry(company = {}) {
  const establishment = createFiscalEstablishmentFromCompany(company);
  return { version: 2, reference: FISCAL_ISSUER_ROUTING_REFERENCE, defaultEstablishmentId: establishment.id, establishments: [establishment] };
}

function normalizeDocumentRegistration(source, fallback, documentType) {
  const registrationStatus = FISCAL_REGISTRATION_STATUSES.includes(source?.registrationStatus) ? source.registrationStatus : fallback.registrationStatus;
  const result = {
    enabled: source?.enabled !== false,
    registrationStatus,
    series: digits(source?.series || fallback.series).slice(0, documentType === 'nfse' ? 5 : 3) || fallback.series,
  };
  if (documentType === 'nfce') result.cscStatus = FISCAL_CSC_STATUSES.includes(source?.cscStatus) ? source.cscStatus : fallback.cscStatus;
  if (documentType === 'nfse') result.routeMode = FISCAL_NFSE_ROUTE_MODES.includes(source?.routeMode) ? source.routeMode : fallback.routeMode;
  return result;
}

export function normalizeFiscalIssuerRegistry(value, company = {}) {
  const fallback = createFiscalIssuerRegistry(company);
  if (!value || typeof value !== 'object') return fallback;
  const sourceEstablishments = Array.isArray(value.establishments) && value.establishments.length ? value.establishments : fallback.establishments;
  const establishments = sourceEstablishments.map((source, index) => {
    const base = index === 0 ? fallback.establishments[0] : createFiscalEstablishmentFromCompany({}, index);
    const document = digits(source?.document || base.document);
    const id = text(source?.id) || `establishment-${document || index + 1}`;
    const sourceDocuments = source?.documents && typeof source.documents === 'object' ? source.documents : {};
    const uf = UF_CODES.includes(text(source?.uf).toUpperCase()) ? text(source.uf).toUpperCase() : base.uf;
    const city = text(source?.city) || base.city;
    const cep = digits(source?.cep || base.cep).slice(0, 8);
    return {
      ...base,
      ...source,
      id,
      label: text(source?.label) || base.label,
      kind: source?.kind === 'Filial' ? 'Filial' : 'Matriz',
      active: source?.active !== false,
      legalName: text(source?.legalName) || base.legalName,
      document,
      uf,
      city,
      cityCode: resolveMunicipalityCode({ city, uf, cep, currentCode: source?.cityCode || base.cityCode }),
      cep,
      street: text(source?.street) || base.street,
      number: text(source?.number) || base.number,
      complement: text(source?.complement),
      district: text(source?.district) || base.district,
      phone: digits(source?.phone || base.phone).slice(0, 14),
      taxRegime: text(source?.taxRegime) || base.taxRegime,
      stateRegistration: text(source?.stateRegistration),
      municipalRegistration: text(source?.municipalRegistration),
      documents: {
        nfe: normalizeDocumentRegistration(sourceDocuments.nfe, base.documents.nfe, 'nfe'),
        nfce: normalizeDocumentRegistration(sourceDocuments.nfce, base.documents.nfce, 'nfce'),
        nfse: normalizeDocumentRegistration(sourceDocuments.nfse, base.documents.nfse, 'nfse'),
      },
    };
  });
  const defaultEstablishmentId = establishments.some((item) => item.id === value.defaultEstablishmentId && item.active)
    ? value.defaultEstablishmentId
    : establishments.find((item) => item.active)?.id || establishments[0]?.id || '';
  return { version: 2, reference: FISCAL_ISSUER_ROUTING_REFERENCE, defaultEstablishmentId, establishments };
}

function stateContingency(uf, documentType) {
  if (documentType === 'nfce') return 'Contingência offline conforme regras da UF';
  if (SVC_AN_UFS.has(uf)) return 'SVC-AN';
  if (SVC_RS_UFS.has(uf)) return 'SVC-RS';
  return 'Plano de contingência da UF a confirmar';
}

export function resolveFiscalIssuerRoute(establishment, documentType) {
  const normalizedType = DOCUMENT_TYPES.includes(documentType) ? documentType : 'nfe';
  const registrationData = establishment?.documents?.[normalizedType] || {};
  const blockers = [];
  if (!establishment?.active) blockers.push('O estabelecimento está inativo.');
  if (!registrationData.enabled) blockers.push('O documento não está habilitado para este estabelecimento.');
  if (digits(establishment?.document).length !== 14) blockers.push('O CNPJ do estabelecimento está incompleto.');
  if (!text(establishment?.cityCode)) blockers.push('O município fiscal não foi identificado; revise CEP, município e UF.');
  if (!['Homologação', 'Produção'].includes(registrationData.registrationStatus)) blockers.push('O credenciamento ainda não foi confirmado para homologação ou produção.');

  if (normalizedType === 'nfse') {
    if (!text(establishment?.municipalRegistration)) blockers.push('A inscrição municipal está pendente.');
    const routeMode = FISCAL_NFSE_ROUTE_MODES.includes(registrationData.routeMode) ? registrationData.routeMode : 'Automática';
    if (routeMode === 'Automática') blockers.push('Consulte os parâmetros do convênio municipal para confirmar a rota da NFS-e.');
    const authority = routeMode === 'SEFIN Nacional'
      ? 'SEFIN Nacional'
      : routeMode === 'Emissor municipal'
        ? `Emissor de ${text(establishment?.city) || 'município a definir'}`
        : 'Rota municipal a consultar';
    return {
      documentType: normalizedType,
      authority,
      routeMode,
      environment: 'Homologação',
      contingency: 'Consulta e reconciliação pela rota definida',
      readyForHomologation: blockers.length === 0,
      blockers,
      explanation: routeMode === 'SEFIN Nacional'
        ? `A DPS será preparada para a API nacional usando os parâmetros do município ${establishment?.cityCode || 'pendente'}.`
        : 'O município fiscal identificado determina a consulta da rota; a cidade do tomador não altera o estabelecimento emitente.',
    };
  }

  const uf = text(establishment?.uf).toUpperCase();
  if (!UF_CODES.includes(uf)) blockers.push('A UF do estabelecimento não foi informada.');
  if (digits(establishment?.cep).length !== 8) blockers.push('O CEP fiscal do estabelecimento está incompleto.');
  if (!text(establishment?.street)) blockers.push('O logradouro fiscal do estabelecimento não foi informado.');
  if (!text(establishment?.number)) blockers.push('O número do endereço fiscal do estabelecimento não foi informado.');
  if (!text(establishment?.district)) blockers.push('O bairro fiscal do estabelecimento não foi informado.');
  if (!text(establishment?.stateRegistration)) blockers.push('A inscrição estadual está pendente.');
  if (normalizedType === 'nfce' && registrationData.cscStatus !== 'Configurado') blockers.push('O CSC da NFC-e ainda não foi confirmado.');
  const authority = STATE_AUTHORITY_BY_UF[uf] || 'Autorizador estadual a definir';
  return {
    documentType: normalizedType,
    authority,
    routeMode: `Roteamento por ${uf || 'UF pendente'}`,
    environment: 'Homologação',
    contingency: stateContingency(uf, normalizedType),
    readyForHomologation: blockers.length === 0,
    blockers,
    explanation: `A autorização usa o estabelecimento de ${uf || 'UF pendente'}, independentemente do estado do comprador.`,
  };
}

export function createFiscalIssuerSelectionSnapshot(establishment, documentType) {
  if (!establishment) return undefined;
  const normalizedType = DOCUMENT_TYPES.includes(documentType) ? documentType : 'nfe';
  const registrationData = establishment.documents?.[normalizedType] || {};
  const route = resolveFiscalIssuerRoute(establishment, normalizedType);
  return {
    establishmentId: establishment.id,
    label: establishment.label,
    kind: establishment.kind,
    legalName: establishment.legalName,
    document: digits(establishment.document),
    uf: establishment.uf,
    city: establishment.city,
    cityCode: establishment.cityCode,
    cep: establishment.cep,
    street: establishment.street,
    number: establishment.number,
    complement: establishment.complement,
    district: establishment.district,
    phone: establishment.phone,
    taxRegime: establishment.taxRegime,
    stateRegistration: establishment.stateRegistration,
    municipalRegistration: establishment.municipalRegistration,
    documentType: normalizedType,
    registrationStatus: registrationData.registrationStatus || 'Não configurado',
    series: registrationData.series || '',
    cscStatus: normalizedType === 'nfce' ? registrationData.cscStatus || 'Não configurado' : undefined,
    nfseRouteMode: normalizedType === 'nfse' ? registrationData.routeMode || 'Automática' : undefined,
    routeReference: FISCAL_ISSUER_ROUTING_REFERENCE,
    authorityRoute: route.authority,
    contingency: route.contingency,
    routeReadyForHomologation: route.readyForHomologation,
    routeBlockers: [...route.blockers],
  };
}

export function resolveFiscalIssuerSelection(value, documentType, preferredEstablishmentId = '', company = {}) {
  const evaluation = evaluateFiscalIssuerRegistry(value, company);
  const normalizedType = DOCUMENT_TYPES.includes(documentType) ? documentType : 'nfe';
  const preferred = text(preferredEstablishmentId);
  const establishment = preferred
    ? evaluation.establishments.find((item) => item.id === preferred)
    : evaluation.establishments.find((item) => item.id === evaluation.registry.defaultEstablishmentId && item.active && item.documents[normalizedType].enabled)
      || evaluation.establishments.find((item) => item.active && item.documents[normalizedType].enabled);
  const errors = [];
  if (!establishment) errors.push(preferred ? 'O estabelecimento emissor selecionado não existe mais.' : 'Nenhum estabelecimento emissor está disponível para este documento.');
  if (establishment && !establishment.active) errors.push(`${establishment.label}: o estabelecimento está inativo.`);
  if (establishment && !establishment.documents[normalizedType].enabled) errors.push(`${establishment.label}: ${normalizedType.toUpperCase()} não está habilitada.`);
  const snapshot = establishment ? createFiscalIssuerSelectionSnapshot(establishment, normalizedType) : undefined;
  return {
    valid: errors.length === 0,
    errors,
    warnings: snapshot?.routeBlockers ?? [],
    establishment,
    route: establishment?.routes[normalizedType],
    snapshot,
  };
}

export function evaluateFiscalIssuerRegistry(value, company = {}) {
  const registry = normalizeFiscalIssuerRegistry(value, company);
  const establishments = registry.establishments.map((establishment) => {
    const routes = Object.fromEntries(DOCUMENT_TYPES.map((documentType) => [documentType, resolveFiscalIssuerRoute(establishment, documentType)]));
    const enabledDocuments = DOCUMENT_TYPES.filter((documentType) => establishment.documents[documentType].enabled);
    return { ...establishment, routes, enabledDocuments, readyDocuments: enabledDocuments.filter((documentType) => routes[documentType].readyForHomologation) };
  });
  const active = establishments.filter((item) => item.active);
  return {
    registry,
    establishments,
    defaultEstablishment: establishments.find((item) => item.id === registry.defaultEstablishmentId) || active[0] || establishments[0],
    activeCount: active.length,
    enabledRouteCount: establishments.reduce((sum, item) => sum + item.enabledDocuments.length, 0),
    readyRouteCount: establishments.reduce((sum, item) => sum + item.readyDocuments.length, 0),
  };
}

export function validateFiscalIssuerRegistry(value, company = {}) {
  const result = evaluateFiscalIssuerRegistry(value, company);
  const errors = [];
  const warnings = [];
  if (!result.establishments.length) errors.push('Cadastre ao menos um estabelecimento emissor.');
  if (!result.activeCount) errors.push('Mantenha ao menos um estabelecimento emissor ativo.');
  if (!result.defaultEstablishment?.active) errors.push('Defina um estabelecimento ativo como padrão.');
  const ids = new Set();
  const documents = new Set();
  result.establishments.forEach((establishment, index) => {
    const label = establishment.label || `Estabelecimento ${index + 1}`;
    if (ids.has(establishment.id)) errors.push(`O identificador de “${label}” está repetido.`);
    ids.add(establishment.id);
    if (!establishment.label) errors.push(`Identifique o estabelecimento ${index + 1}.`);
    if (!establishment.legalName) errors.push(`${label}: informe a razão social.`);
    if (establishment.document.length !== 14) errors.push(`${label}: informe um CNPJ com 14 dígitos.`);
    if (establishment.document && documents.has(establishment.document)) errors.push(`${label}: o CNPJ já pertence a outro estabelecimento.`);
    documents.add(establishment.document);
    if (!establishment.uf) errors.push(`${label}: informe a UF.`);
    if (!establishment.city) errors.push(`${label}: informe o município.`);
    if (establishment.cityCode.length !== 7) errors.push(`${label}: não foi possível identificar o município fiscal; revise CEP, município e UF.`);
    if (establishment.cep.length !== 8) errors.push(`${label}: informe o CEP fiscal com 8 dígitos.`);
    if (!establishment.street) errors.push(`${label}: informe o logradouro fiscal.`);
    if (!establishment.number) errors.push(`${label}: informe o número do endereço fiscal.`);
    if (!establishment.district) errors.push(`${label}: informe o bairro fiscal.`);
    if (!establishment.taxRegime || establishment.taxRegime === 'Não definido') errors.push(`${label}: informe o regime tributário.`);
    establishment.enabledDocuments.forEach((documentType) => {
      const route = establishment.routes[documentType];
      if (!route.readyForHomologation) warnings.push(`${label} · ${documentType.toUpperCase()}: ${route.blockers[0]}`);
    });
  });
  return { ...result, valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
