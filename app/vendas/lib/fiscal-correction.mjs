import { fiscalOperationCfop } from './fiscal-item-presentation.mjs';

export function fiscalProductIssues(items, key, destination = '') {
  return items.flatMap(item => {
    if (item.kind !== 'produto') return [];
    const missing = [];
    const require = (value, label) => { if (!String(value ?? '').trim()) missing.push(label); };
    if (key === 'reforma-itens') {
      require(item.ibsCbsCst, 'CST IBS/CBS'); require(item.ibsCbsClassification, 'Classificação IBS/CBS');
    } else {
      require(item.ncm, 'NCM'); require(item.taxableUnit || item.unit, 'Unidade tributável');
      require(item.fiscalOriginCode, 'Origem'); require(fiscalOperationCfop(item, destination), 'CFOP da operação');
      require(item.icmsCode, 'CST/CSOSN do ICMS'); require(item.pisCst, 'CST do PIS'); require(item.cofinsCst, 'CST da COFINS');
      if (!missing.length && item.fiscalStatus && item.fiscalStatus !== 'Completo') missing.push('Revisão fiscal do produto');
    }
    return missing.length ? [{ target: item.catalogItemId || item.sku, name: item.name || item.sku, fields: missing }] : [];
  });
}

export function fiscalCorrectionAction(key) {
  if (key === 'submission-status') return { label: 'Abrir nota', target: 'note', permission: 'fiscal.view' };
  if (key === 'numbering') return { label: 'Configurar série e numeração', target: 'numbering', permission: 'fiscal.configure' };
  if (['classificacao', 'itens', 'reforma-itens'].includes(key)) return { label: 'Editar produto', target: 'product', permission: 'catalog.edit' };
  if (['matriz', 'revisao', 'reforma'].includes(key)) return { label: 'Revisar regras', target: 'rules', permission: 'fiscal.configure' };
  if (key === 'certificado') return { label: 'Ver certificado', target: 'certificate', permission: 'fiscal.configure' };
  if (['issuer-selection', 'issuer-route', 'rota-nfse'].includes(key)) return { label: 'Revisar emissor', target: 'issuer', permission: 'fiscal.configure' };
  if (key === 'provedor') return { label: 'Ver serviço', target: 'service', permission: 'fiscal.view' };
  if (key === 'destinatario') return { label: 'Revisar cliente', target: 'customer', permission: 'clients.edit' };
  return { label: 'Abrir ajustes', target: 'settings', permission: 'settings.view' };
}

/** A review may refresh tax defaults; financial values and fiscal identities stay frozen. */
export function fiscalItemsForReview(items, catalog, immutable = false) {
  if (immutable) return items;
  return items.map(item => {
    const candidates = catalog.filter(product => item.catalogItemId ? product.catalogItemId === item.catalogItemId : product.sku === item.sku);
    if (candidates.length !== 1) return item;
    const product = candidates[0];
    const fields = ['useCompanyFiscal', 'taxableUnit', 'ncm', 'cest', 'fiscalOriginCode', 'cfopInternal', 'cfopInterstate', 'icmsCode', 'pisCst', 'cofinsCst', 'ibsCbsCst', 'ibsCbsClassification', 'ibsCbsOperationIndicator', 'municipalServiceCode', 'nationalServiceCode', 'nbs', 'issRate', 'serviceIncidenceMode'];
    return { ...item, ...Object.fromEntries(fields.filter(key => product[key] !== undefined).map(key => [key, product[key]])), catalogItemId: product.catalogItemId || item.catalogItemId, fiscalStatus: product.fiscal || item.fiscalStatus };
  });
}

/** Destinos baseados no código/campo público, nunca em texto livre da resposta. */
export function fiscalCheckoutCorrection(result) {
  if (/CERTIFICATE/.test(result?.code || '')) return 'certificado';
  // Falha de comunicação permanece no formulário; repetir Salvar e emitir reconcilia internamente.
  if (result?.field === 'numbering' || /^AV-(?:FISCAL-NUMBER-(?:SEQUENCE|EXHAUSTED)|NFE-ISSUE-NUMBERING|NUMBERING-)/.test(result?.code || '')) return 'numbering';
  if (/CERTIFICATE/.test(result?.code || '')) return 'certificado';
  return '';
}
