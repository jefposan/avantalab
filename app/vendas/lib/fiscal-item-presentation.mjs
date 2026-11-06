const clean = value => String(value ?? '').trim();

/** Only the CFOP for this destination belongs in the operational review. */
export function fiscalOperationCfop(item = {}, destination = '') {
  if (destination === 'Fora da UF') return clean(item.cfopInterstate) || (clean(item.cfopInternal).startsWith('6') ? clean(item.cfopInternal) : '');
  if (destination === 'Dentro da UF') return clean(item.cfopInternal);
  return clean(item.cfopInternal) || clean(item.cfopInterstate);
}

export function fiscalItemDetails(item = {}, destination = '') {
  const fields = [];
  const add = (label, value, required = false) => { if (clean(value) || required) fields.push({ label, value: clean(value) || 'Não informado' }); };
  if (item.kind === 'servico') {
    add('Código do serviço', item.municipalServiceCode, true);
    add('Lista nacional', item.nationalServiceCode); add('NBS', item.nbs);
    if (Number(item.issRate) > 0) add('ISS', `${Number(item.issRate).toLocaleString('pt-BR')}%`);
  } else {
    add('NCM', item.ncm, true); add('CEST', item.cest);
    add('Unidade tributável', item.taxableUnit || item.unit);
    add('Origem da mercadoria', item.fiscalOriginCode);
    add('CFOP da operação', fiscalOperationCfop(item, destination));
    add('CST/CSOSN do ICMS', item.icmsCode);
    if (item.ipiCst) { add('CST do IPI', item.ipiCst); add('Enquadramento do IPI', item.ipiLegalCode); }
    add('Base do ICMS-ST', item.stBaseMode); add('Benefício fiscal', item.fiscalBenefitCode);
  }
  add('CST do PIS', item.pisCst); add('CST da COFINS', item.cofinsCst);
  // Absence is not, by itself, a requirement. Blocking checks remain outside this disclosure.
  add('CST IBS/CBS', item.ibsCbsCst); add('Classificação IBS/CBS', item.ibsCbsClassification);
  add('Indicador IBS/CBS', item.ibsCbsOperationIndicator);
  return fields;
}

// Receita Federal: cronograma dos documentos fiscais eletrônicos, consultado em 05/11/2026.
// Exceção limitada à NF-e do Simples em 2026; outros contextos continuam exigindo revisão.
export function fiscalIbsCbsRequired({ documentType, taxRegime, issueDate } = {}) {
  const regime = clean(taxRegime).toLowerCase().replace(/\s+/g, '_');
  const date = clean(issueDate) || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const parsed = /^2026-\d{2}-\d{2}$/.test(date) && new Date(`${date}T12:00:00Z`);
  const year2026 = parsed && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  return !(documentType === 'nfe' && ['simples_nacional', 'mei_simei'].includes(regime) && year2026);
}
