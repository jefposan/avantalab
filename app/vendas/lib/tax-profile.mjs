export const TAX_PROFILE_REFERENCE = '2026.08';

export const catalogTaxProfileDefaults = Object.freeze({
  fiscalProfileVersion: TAX_PROFILE_REFERENCE,
  fiscalReviewedAt: '',
  fiscalReviewedBy: '',
  fiscalOriginCode: '',
  taxableUnit: '',
  fiscalBenefitCode: '',
  cfopInternal: '',
  cfopInterstate: '',
  icmsCode: '',
  icmsRate: 0,
  pisCst: '',
  pisRate: 0,
  cofinsCst: '',
  cofinsRate: 0,
  ipiApplicable: false,
  ipiCst: '',
  ipiLegalCode: '',
  ipiRate: 0,
  cestRequired: false,
  stApplicable: false,
  stBaseMode: '',
  stMvaRate: 0,
  stIcmsRate: 0,
  stBaseReductionRate: 0,
  approximateFederalTaxRate: 0,
  approximateStateTaxRate: 0,
  nfeOverrideEnabled: false,
  nfeCfopInternal: '',
  nfeCfopInterstate: '',
  nfeIcmsCode: '',
  nfePisCst: '',
  nfeCofinsCst: '',
  nfceOverrideEnabled: false,
  nfceCfop: '',
  nfceIcmsCode: '',
  nfcePisCst: '',
  nfceCofinsCst: '',
  nationalServiceCode: '',
  serviceIncidenceMode: 'Definir por operação',
  issWithheldDefault: false,
  ibsCbsCst: '',
  ibsCbsClassification: '',
  ibsCbsOperationIndicator: '',
  selectiveTaxCode: '',
});

export function normalizeCatalogTaxProfile(item) {
  const source = item && typeof item === 'object' ? item : {};
  return {
    ...catalogTaxProfileDefaults,
    ...source,
    fiscalProfileVersion: String(source.fiscalProfileVersion || TAX_PROFILE_REFERENCE),
    taxableUnit: String(source.taxableUnit || source.unit || ''),
    cestRequired: Boolean(source.cestRequired || source.cest),
    ipiApplicable: Boolean(source.ipiApplicable),
    stApplicable: Boolean(source.stApplicable),
    nfeOverrideEnabled: Boolean(source.nfeOverrideEnabled),
    nfceOverrideEnabled: Boolean(source.nfceOverrideEnabled),
    issWithheldDefault: Boolean(source.issWithheldDefault),
  };
}

function requiredCheck(key, label, value, group, detail) {
  return { key, label, ready: Boolean(String(value ?? '').trim()), group, detail };
}

export function evaluateCatalogTaxProfile(item) {
  const profile = normalizeCatalogTaxProfile(item);
  const isService = profile.category === 'Serviço';
  const coreChecks = isService ? [
    requiredCheck('municipal-service', 'Código municipal do serviço', profile.municipalServiceCode, 'identificacao', 'Classificação exigida pelo município do emitente.'),
    requiredCheck('national-service', 'Item da lista nacional', profile.nationalServiceCode, 'identificacao', 'Item nacional relacionado ao serviço.'),
    requiredCheck('nbs', 'NBS', profile.nbs, 'identificacao', 'Nomenclatura Brasileira de Serviços.'),
    requiredCheck('iss', 'Alíquota padrão de ISS', Number(profile.issRate) > 0 ? profile.issRate : '', 'tributacao', 'Padrão cadastral; a operação ainda pode alterar incidência e retenção.'),
    requiredCheck('pis', 'CST do PIS', profile.pisCst, 'tributacao', 'Situação tributária padrão do serviço.'),
    requiredCheck('cofins', 'CST da COFINS', profile.cofinsCst, 'tributacao', 'Situação tributária padrão do serviço.'),
    requiredCheck('incidence', 'Regra de incidência', profile.serviceIncidenceMode !== 'Definir por operação' ? profile.serviceIncidenceMode : '', 'tributacao', 'Define um padrão sem impedir revisão por operação.'),
  ] : [
    requiredCheck('ncm', 'NCM', profile.ncm, 'identificacao', 'Classificação fiscal da mercadoria.'),
    requiredCheck('taxable-unit', 'Unidade tributável', profile.taxableUnit, 'identificacao', 'Unidade usada no item do documento fiscal; pode coincidir com a unidade comercial.'),
    requiredCheck('origin', 'Origem da mercadoria', profile.fiscalOriginCode, 'identificacao', 'Código de origem utilizado no grupo do ICMS.'),
    requiredCheck('cfop-internal', 'CFOP interno padrão', profile.cfopInternal, 'tributacao', 'Padrão para operação dentro da UF.'),
    requiredCheck('cfop-interstate', 'CFOP interestadual padrão', profile.cfopInterstate, 'tributacao', 'Padrão para operação destinada a outra UF.'),
    requiredCheck('icms', 'CST/CSOSN do ICMS', profile.icmsCode, 'tributacao', 'Código compatível com o regime e a operação.'),
    requiredCheck('pis', 'CST do PIS', profile.pisCst, 'tributacao', 'Situação tributária padrão da mercadoria.'),
    requiredCheck('cofins', 'CST da COFINS', profile.cofinsCst, 'tributacao', 'Situação tributária padrão da mercadoria.'),
    ...(profile.cestRequired ? [requiredCheck('cest', 'CEST', profile.cest, 'identificacao', 'Obrigatório para este perfil quando aplicável.')] : []),
    ...(profile.ipiApplicable ? [
      requiredCheck('ipi-cst', 'CST do IPI', profile.ipiCst, 'tributacao', 'Obrigatório porque o IPI foi marcado como aplicável.'),
      requiredCheck('ipi-legal', 'Enquadramento legal do IPI', profile.ipiLegalCode, 'tributacao', 'Código de enquadramento do IPI conforme a operação.'),
    ] : []),
    ...(profile.stApplicable ? [
      requiredCheck('st-mode', 'Modalidade da base do ICMS-ST', profile.stBaseMode, 'tributacao', 'Obrigatória porque a substituição tributária foi marcada como aplicável.'),
      requiredCheck('st-rate', 'Alíquota do ICMS-ST', Number(profile.stIcmsRate) > 0 ? profile.stIcmsRate : '', 'tributacao', 'Percentual padrão sujeito à revisão por operação.'),
    ] : []),
    ...(profile.nfeOverrideEnabled ? [
      requiredCheck('nfe-cfop-internal', 'CFOP interno específico da NF-e', profile.nfeCfopInternal, 'tributacao', 'Exceção usada somente na NF-e.'),
      requiredCheck('nfe-cfop-interstate', 'CFOP interestadual específico da NF-e', profile.nfeCfopInterstate, 'tributacao', 'Exceção usada somente na NF-e.'),
      requiredCheck('nfe-icms', 'ICMS específico da NF-e', profile.nfeIcmsCode, 'tributacao', 'CST/CSOSN que substitui o padrão geral na NF-e.'),
    ] : []),
    ...(profile.nfceOverrideEnabled ? [
      requiredCheck('nfce-cfop', 'CFOP específico da NFC-e', profile.nfceCfop, 'tributacao', 'Exceção usada somente na NFC-e.'),
      requiredCheck('nfce-icms', 'ICMS específico da NFC-e', profile.nfceIcmsCode, 'tributacao', 'CST/CSOSN que substitui o padrão geral na NFC-e.'),
    ] : []),
  ];
  const reformChecks = [
    requiredCheck('ibs-cbs-cst', 'CST IBS/CBS', profile.ibsCbsCst, 'reforma', 'Código conforme o leiaute vigente.'),
    requiredCheck('ibs-cbs-class', 'Classificação tributária IBS/CBS', profile.ibsCbsClassification, 'reforma', 'cClassTrib conforme tabela oficial vigente.'),
    ...(isService ? [requiredCheck('ibs-cbs-operation', 'Indicador da operação IBS/CBS', profile.ibsCbsOperationIndicator, 'reforma', 'Indicador aplicável à DPS/NFS-e.')] : []),
  ];
  const checks = [...coreChecks, ...reformChecks];
  const coreReady = coreChecks.every((check) => check.ready);
  const reformReady = reformChecks.every((check) => check.ready);
  const completeCount = checks.filter((check) => check.ready).length;
  const completion = checks.length ? Math.round(completeCount / checks.length * 100) : 0;
  const firstMissing = coreChecks.find((check) => !check.ready);
  const status = !coreReady
    ? firstMissing?.key === 'ncm' ? 'Revisar NCM'
      : firstMissing?.key === 'cest' ? 'Revisar CEST'
        : firstMissing?.key === 'municipal-service' ? 'Revisar código municipal'
          : 'Revisar perfil fiscal'
    : 'Completo';
  return { profile, checks, coreReady, reformReady, completion, status };
}
