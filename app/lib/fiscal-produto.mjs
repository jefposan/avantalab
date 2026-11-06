const text = value => String(value ?? '').trim();
const pick = (source, ...keys) => keys.map(key => text(source?.[key])).find(Boolean) || '';

/** Null preserves legacy/imported exceptions; an explicit choice always wins. */
export function usaFiscalEmpresa(source = {}) {
  const choice = source.usar_fiscal_empresa ?? source.useCompanyFiscal;
  if (typeof choice === 'boolean') return choice;
  return !['cfop_padrao', 'cfop_interestadual', 'cfopInternal', 'cfopInterstate', 'cfop', 'cst', 'csosn', 'icmsCode',
    'cst_pis', 'pisCst', 'cst_cofins', 'cofinsCst', 'cst_ibs_cbs', 'ibsCbsCst', 'classificacao_ibs_cbs', 'ibsCbsClassification']
    .some(key => text(source[key])) && !/^[1-8](?:\D|$)/.test(pick(source, 'origem_mercadoria', 'originCode', 'fiscalOriginCode'));
}

export function padroesFiscaisEmpresa(profile = {}) {
  const source = profile.configuracao_fiscal || profile.fiscalConfiguration || {};
  const simples = ['simples_nacional', 'mei_simei'].includes(profile.regime_tributario || profile.taxRegime);
  return {
    originCode: pick(source, 'origem_mercadoria_padrao', 'originCode'),
    icmsCode: simples ? pick(source, 'csosn') : pick(source, 'cst_icms', 'cstIcms'),
    pisCst: pick(source, 'cst_pis', 'pisCst'), cofinsCst: pick(source, 'cst_cofins', 'cofinsCst'),
    ibsCbsCst: pick(source, 'cst_ibs_cbs', 'ibsCbsCst'),
    ibsCbsClassification: pick(source, 'classificacao_ibs_cbs', 'ibsCbsClassification'),
  };
}

/** Product classification stays on the product; CFOP requires operation context. */
export function resolverFiscalProduto(product = {}, company = {}, operation = {}) {
  const inherited = usaFiscalEmpresa(product);
  const defaults = padroesFiscaisEmpresa(company);
  const simples = ['simples_nacional', 'mei_simei'].includes(company.regime_tributario || company.taxRegime);
  const value = (field, ...keys) => (!inherited && pick(product, ...keys)) || defaults[field] || '';
  const manualCfop = inherited ? '' : operation.destination === 'Fora da UF'
    ? pick(product, 'cfop_interestadual', 'cfopInterstate')
    : operation.destination === 'Dentro da UF' ? pick(product, 'cfop_padrao', 'cfopInternal', 'cfop') : '';
  return {
    useCompanyFiscal: inherited,
    ncm: pick(product, 'ncm'), cest: pick(product, 'cest'),
    taxableUnit: pick(product, 'unidade_tributavel', 'taxableUnit', 'unidadeTributavel', 'unidade', 'unit'),
    originCode: value('originCode', 'origem_mercadoria', 'originCode', 'fiscalOriginCode').split(/\D/)[0],
    icmsCode: value('icmsCode', simples ? 'csosn' : 'cst', 'icmsCode'),
    pisCst: value('pisCst', 'cst_pis', 'pisCst'), cofinsCst: value('cofinsCst', 'cst_cofins', 'cofinsCst'),
    ibsCbsCst: value('ibsCbsCst', 'cst_ibs_cbs', 'ibsCbsCst'),
    ibsCbsClassification: value('ibsCbsClassification', 'classificacao_ibs_cbs', 'ibsCbsClassification'),
    cfop: manualCfop || text(operation.cfop),
  };
}
