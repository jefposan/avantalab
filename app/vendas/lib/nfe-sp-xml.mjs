export const NFE_SP_XML_REFERENCE = '2026-09-05';
export const NFE_SP_SCHEMA_PACKAGE = 'PL_010e_v1.02';
export const NFE_SP_SCHEMA_VERSION = '4.00';
export const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
export const HOMOLOGATION_RECIPIENT_NAME = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

function text(value, maxLength = 0) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function digits(value, maxLength = 0) {
  const normalized = String(value || '').replace(/\D/g, '');
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function decimal(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlTag(name, value, level = 0) {
  if (value === '' || value === undefined || value === null) return '';
  return `${'  '.repeat(level)}<${name}>${xmlEscape(value)}</${name}>`;
}

function formatDecimal(value, scale) {
  return decimal(value).toFixed(scale);
}

function taxRegimeCode(value) {
  if (/simples/i.test(text(value))) return '1';
  if (/excesso/i.test(text(value))) return '2';
  return '3';
}

function paymentCode(value) {
  const normalized = text(value).toLocaleLowerCase('pt-BR');
  if (normalized.includes('pix')) return '17';
  if (normalized.includes('boleto')) return '15';
  if (normalized.includes('cart')) return '03';
  if (normalized.includes('dinheiro')) return '01';
  return '99';
}

function presenceCode(value) {
  const normalized = text(value).toLocaleLowerCase('pt-BR');
  if (normalized.includes('presencial')) return '1';
  if (normalized.includes('internet')) return '2';
  return '9';
}

function destinationCode(issuerUf, recipientUf) {
  if (!recipientUf || recipientUf === 'EX') return '3';
  return issuerUf === recipientUf ? '1' : '2';
}

function recipientStateRegistrationIndicator(profile, stateRegistration) {
  const normalizedProfile = text(profile).toLocaleLowerCase('pt-BR');
  const normalizedRegistration = text(stateRegistration).toLocaleLowerCase('pt-BR');
  if (normalizedProfile.includes('contribuinte') && !normalizedProfile.includes('não')) return '1';
  if (normalizedRegistration === 'isento') return '2';
  return '9';
}

function normalizeAddress(value = {}) {
  return {
    street: text(value.street, 60),
    number: text(value.number, 60),
    complement: text(value.complement, 60),
    district: text(value.district, 60),
    cityCode: digits(value.cityCode, 7),
    city: text(value.city, 60),
    uf: text(value.uf, 2).toUpperCase(),
    cep: digits(value.cep, 8),
    countryCode: digits(value.countryCode || '1058', 4),
    country: text(value.country || 'Brasil', 60),
    phone: digits(value.phone, 14),
  };
}

function normalizeItem(value = {}, index = 0) {
  const quantity = decimal(value.quantity);
  const unitValue = decimal(value.unitValue);
  return {
    number: Math.max(1, Math.trunc(decimal(value.number, index + 1))),
    code: text(value.code, 60),
    description: text(value.description, 120),
    gtin: digits(value.gtin, 14) || 'SEM GTIN',
    ncm: digits(value.ncm, 8),
    cest: digits(value.cest, 7),
    cfop: digits(value.cfop, 4),
    commercialUnit: text(value.commercialUnit, 6).toUpperCase(),
    quantity,
    unitValue,
    totalValue: decimal(value.totalValue, quantity * unitValue),
    discountValue: Math.max(0, decimal(value.discountValue)),
    taxableUnit: text(value.taxableUnit || value.commercialUnit, 6).toUpperCase(),
    taxableQuantity: decimal(value.taxableQuantity, quantity),
    taxableUnitValue: decimal(value.taxableUnitValue, unitValue),
    origin: digits(value.origin, 1),
    icmsCode: digits(value.icmsCode, 3),
    pisCst: digits(value.pisCst, 2),
    cofinsCst: digits(value.cofinsCst, 2),
  };
}

export function normalizeNfeSpXmlInput(value) {
  const source = value && typeof value === 'object' ? value : {};
  const issuer = source.issuer && typeof source.issuer === 'object' ? source.issuer : {};
  const recipient = source.recipient && typeof source.recipient === 'object' ? source.recipient : {};
  const totals = source.totals && typeof source.totals === 'object' ? source.totals : {};
  const payment = source.payment && typeof source.payment === 'object' ? source.payment : {};
  return {
    reference: NFE_SP_XML_REFERENCE,
    schemaPackage: NFE_SP_SCHEMA_PACKAGE,
    schemaVersion: NFE_SP_SCHEMA_VERSION,
    environment: 'homologacao',
    documentStage: source.documentStage === 'signature' ? 'signature' : 'preparation',
    issuedAt: text(source.issuedAt),
    operationNature: text(source.operationNature, 60),
    series: digits(source.series, 3),
    number: digits(source.number, 9),
    numericCode: digits(source.numericCode, 8),
    emissionType: '1',
    purpose: '1',
    consumerFinal: source.consumerFinal === true,
    presence: text(source.presence),
    issuer: {
      document: digits(issuer.document, 14),
      legalName: text(issuer.legalName, 60),
      tradeName: text(issuer.tradeName, 60),
      stateRegistration: text(issuer.stateRegistration, 14).replace(/\D/g, ''),
      taxRegime: text(issuer.taxRegime),
      address: normalizeAddress(issuer.address),
    },
    recipient: {
      document: digits(recipient.document, 14),
      originalName: text(recipient.name, 60),
      stateRegistration: text(recipient.stateRegistration, 14).replace(/[^\dIiSsEeNnTtOo]/g, ''),
      stateRegistrationIndicator: digits(recipient.stateRegistrationIndicator, 1),
      email: text(recipient.email, 60).toLocaleLowerCase('pt-BR'),
      address: normalizeAddress(recipient.address),
    },
    items: Array.isArray(source.items) ? source.items.slice(0, 990).map(normalizeItem) : [],
    totals: {
      products: decimal(totals.products),
      freight: decimal(totals.freight),
      insurance: decimal(totals.insurance),
      discount: decimal(totals.discount),
      other: decimal(totals.other),
      invoice: decimal(totals.invoice),
    },
    payment: {
      method: text(payment.method),
      amount: decimal(payment.amount),
    },
    additionalInfo: text(source.additionalInfo, 5000),
    matrixReviewConfirmed: source.matrixReviewConfirmed === true,
    fiscalReviewConfirmed: source.fiscalReviewConfirmed === true,
    taxReformReviewConfirmed: source.taxReformReviewConfirmed === true,
  };
}

function validationError(code, field, message) {
  return { code, field, message };
}

function validIssuedAt(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/.test(value) && Number.isFinite(new Date(value).getTime());
}

export function calculateNfeAccessKeyCheckDigit(base43) {
  const digitsOnly = digits(base43);
  if (digitsOnly.length !== 43) throw new Error('A base da chave deve possuir 43 dígitos.');
  let weight = 2;
  let sum = 0;
  for (let index = digitsOnly.length - 1; index >= 0; index -= 1) {
    sum += Number(digitsOnly[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const result = 11 - (sum % 11);
  return result === 10 || result === 11 ? '0' : String(result);
}

export function buildNfeAccessKey(inputValue) {
  const input = normalizeNfeSpXmlInput(inputValue);
  if (!validIssuedAt(input.issuedAt)) throw new Error('A data de emissão deve estar no fuso de São Paulo.');
  const yearMonth = `${input.issuedAt.slice(2, 4)}${input.issuedAt.slice(5, 7)}`;
  const base = [
    '35',
    yearMonth,
    input.issuer.document,
    '55',
    input.series.padStart(3, '0'),
    input.number.padStart(9, '0'),
    input.emissionType,
    input.numericCode.padStart(8, '0'),
  ].join('');
  if (base.length !== 43) throw new Error('Os campos informados não formam a base de 43 dígitos da chave.');
  return `${base}${calculateNfeAccessKeyCheckDigit(base)}`;
}

export function validateNfeSpXmlInput(inputValue) {
  const input = normalizeNfeSpXmlInput(inputValue);
  const errors = [];
  const warnings = [];
  const requiredText = (value, code, field, message) => { if (!value) errors.push(validationError(code, field, message)); };
  requiredText(input.operationNature, 'NFE-B04', 'operationNature', 'Informe a natureza da operação com até 60 caracteres.');
  if (!validIssuedAt(input.issuedAt)) errors.push(validationError('NFE-B09', 'issuedAt', 'Informe data e hora no formato ISO com o fuso -03:00 de São Paulo.'));
  if (!input.series || Number(input.series) > 999) errors.push(validationError('NFE-B07', 'series', 'Informe uma série de NF-e entre 0 e 999.'));
  if (!input.number || Number(input.number) < 1) errors.push(validationError('NFE-B08', 'number', 'Informe um número de teste entre 1 e 999999999.'));
  if (input.numericCode.length !== 8) errors.push(validationError('NFE-B03', 'numericCode', 'Informe o código numérico cNF com exatamente oito dígitos.'));

  if (input.issuer.document.length !== 14) errors.push(validationError('NFE-C02', 'issuer.document', 'O CNPJ do emitente deve possuir 14 dígitos nesta fase do piloto.'));
  requiredText(input.issuer.legalName, 'NFE-C03', 'issuer.legalName', 'Informe a razão social do emitente.');
  requiredText(input.issuer.stateRegistration, 'NFE-C17', 'issuer.stateRegistration', 'Informe a inscrição estadual do emitente.');
  if (input.issuer.address.uf !== 'SP') errors.push(validationError('NFE-C09', 'issuer.address.uf', 'O piloto direto aceita somente estabelecimento emitente de São Paulo.'));
  if (input.issuer.address.cityCode.length !== 7) errors.push(validationError('NFE-C07', 'issuer.address.cityCode', 'Não foi possível identificar o município fiscal do emitente. Revise CEP, município e UF.'));
  [['street', 'logradouro'], ['number', 'número'], ['district', 'bairro'], ['city', 'município'], ['cep', 'CEP']].forEach(([field, label]) => requiredText(input.issuer.address[field], `NFE-C-${field}`, `issuer.address.${field}`, `Informe ${label} do endereço do emitente.`));
  if (input.issuer.address.cep && input.issuer.address.cep.length !== 8) errors.push(validationError('NFE-C13', 'issuer.address.cep', 'O CEP do emitente deve possuir oito dígitos.'));

  if (![11, 14].includes(input.recipient.document.length)) errors.push(validationError('NFE-E02', 'recipient.document', 'Informe CPF ou CNPJ válido no cadastro do destinatário.'));
  if (!['1', '2', '9'].includes(input.recipient.stateRegistrationIndicator)) errors.push(validationError('NFE-E16a', 'recipient.stateRegistrationIndicator', 'Defina o indicador de inscrição estadual do destinatário.'));
  if (input.recipient.stateRegistrationIndicator === '1' && !input.recipient.stateRegistration) errors.push(validationError('NFE-E17', 'recipient.stateRegistration', 'Destinatário contribuinte precisa de inscrição estadual.'));
  if (input.recipient.address.cityCode.length !== 7) errors.push(validationError('NFE-E10', 'recipient.address.cityCode', 'Não foi possível identificar o município fiscal do destinatário. Revise CEP, município e UF.'));
  [['street', 'logradouro'], ['number', 'número'], ['district', 'bairro'], ['city', 'município'], ['uf', 'UF'], ['cep', 'CEP']].forEach(([field, label]) => requiredText(input.recipient.address[field], `NFE-E-${field}`, `recipient.address.${field}`, `Informe ${label} do endereço do destinatário.`));
  if (input.recipient.address.cep && input.recipient.address.cep.length !== 8) errors.push(validationError('NFE-E13', 'recipient.address.cep', 'O CEP do destinatário deve possuir oito dígitos.'));

  if (!input.items.length) errors.push(validationError('NFE-H01', 'items', 'Inclua ao menos um produto na NF-e.'));
  input.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    requiredText(item.code, 'NFE-I02', `${prefix}.code`, `Item ${index + 1}: informe o código do produto.`);
    requiredText(item.description, 'NFE-I04', `${prefix}.description`, `Item ${index + 1}: informe a descrição do produto.`);
    if (item.ncm.length !== 8) errors.push(validationError('NFE-I05', `${prefix}.ncm`, `Item ${index + 1}: o NCM deve possuir oito dígitos.`));
    if (item.cfop.length !== 4) errors.push(validationError('NFE-I08', `${prefix}.cfop`, `Item ${index + 1}: o CFOP deve possuir quatro dígitos.`));
    if (!item.commercialUnit) errors.push(validationError('NFE-I09', `${prefix}.commercialUnit`, `Item ${index + 1}: informe a unidade comercial.`));
    if (!(item.quantity > 0)) errors.push(validationError('NFE-I10', `${prefix}.quantity`, `Item ${index + 1}: a quantidade deve ser maior que zero.`));
    if (!(item.unitValue >= 0)) errors.push(validationError('NFE-I10a', `${prefix}.unitValue`, `Item ${index + 1}: o valor unitário não pode ser negativo.`));
    if (!item.origin) errors.push(validationError('NFE-N11', `${prefix}.origin`, `Item ${index + 1}: informe a origem fiscal da mercadoria.`));
    if (item.icmsCode !== '102') errors.push(validationError('AV-NFE-ICMS', `${prefix}.icmsCode`, `Item ${index + 1}: o primeiro gerador suporta somente CSOSN 102; outros regimes permanecem bloqueados.`));
    if (!item.pisCst || !item.cofinsCst) errors.push(validationError('AV-NFE-PIS-COFINS', prefix, `Item ${index + 1}: informe os CST de PIS e COFINS.`));
  });

  const calculatedProducts = input.items.reduce((total, item) => total + item.totalValue, 0);
  const calculatedDiscount = input.items.reduce((total, item) => total + item.discountValue, 0);
  const calculatedInvoice = input.totals.products + input.totals.freight + input.totals.insurance + input.totals.other - input.totals.discount;
  if (Math.abs(calculatedProducts - input.totals.products) > 0.01) errors.push(validationError('NFE-W07', 'totals.products', 'A soma dos itens não confere com o total dos produtos.'));
  if (Math.abs(calculatedDiscount - input.totals.discount) > 0.01) errors.push(validationError('NFE-W10', 'totals.discount', 'A soma dos descontos dos itens não confere com o desconto total da NF-e.'));
  if (Math.abs(calculatedInvoice - input.totals.invoice) > 0.01) errors.push(validationError('NFE-W16', 'totals.invoice', 'Frete, seguro, desconto, outras despesas e produtos não fecham o valor da NF-e.'));
  if (Math.abs(input.payment.amount - input.totals.invoice) > 0.01) errors.push(validationError('NFE-YA03', 'payment.amount', 'O valor do pagamento não confere com o total da NF-e.'));
  if (!input.fiscalReviewConfirmed) errors.push(validationError('AV-NFE-REVIEW', 'fiscalReviewConfirmed', 'A revisão tributária precisa estar confirmada.'));
  if (!input.matrixReviewConfirmed) errors.push(validationError('AV-NFE-MATRIX', 'matrixReviewConfirmed', 'A regra aplicável da matriz fiscal precisa estar revisada.'));
  if (!input.taxReformReviewConfirmed) errors.push(validationError('AV-NFE-RTC', 'taxReformReviewConfirmed', 'A revisão dos campos vigentes de IBS/CBS precisa estar confirmada.'));
  warnings.push('Este gerador puro executa a validação estrutural e semântica do AvantaLab; a rota server-side deve executar o pacote XSD antes de liberar o pré-XML.');
  warnings.push('O XML gerado não contém assinatura XMLDSig, protocolo de autorização ou valor fiscal.');
  let accessKey = '';
  if (!errors.some((error) => ['issuedAt', 'series', 'number', 'numericCode', 'issuer.document'].includes(error.field))) {
    try { accessKey = buildNfeAccessKey(input); } catch (error) { errors.push(validationError('AV-NFE-KEY', 'accessKey', error instanceof Error ? error.message : 'Não foi possível montar a chave de teste.')); }
  }
  return { input, valid: errors.length === 0, errors, warnings, accessKey, schemaValidationExecuted: false, schemaPackage: NFE_SP_SCHEMA_PACKAGE };
}

function itemXml(item, index, crt) {
  const icms = crt === '1'
    ? [`          <ICMSSN102>`, xmlTag('orig', item.origin, 6), xmlTag('CSOSN', item.icmsCode, 6), `          </ICMSSN102>`].join('\n')
    : '';
  return [
    `    <det nItem="${index + 1}">`,
    '      <prod>',
    xmlTag('cProd', item.code, 4),
    xmlTag('cEAN', item.gtin, 4),
    xmlTag('xProd', item.description, 4),
    xmlTag('NCM', item.ncm, 4),
    xmlTag('CEST', item.cest, 4),
    xmlTag('CFOP', item.cfop, 4),
    xmlTag('uCom', item.commercialUnit, 4),
    xmlTag('qCom', formatDecimal(item.quantity, 4), 4),
    xmlTag('vUnCom', formatDecimal(item.unitValue, 10), 4),
    xmlTag('vProd', formatDecimal(item.totalValue, 2), 4),
    xmlTag('cEANTrib', item.gtin, 4),
    xmlTag('uTrib', item.taxableUnit, 4),
    xmlTag('qTrib', formatDecimal(item.taxableQuantity, 4), 4),
    xmlTag('vUnTrib', formatDecimal(item.taxableUnitValue, 10), 4),
    xmlTag('vDesc', item.discountValue > 0 ? formatDecimal(item.discountValue, 2) : '', 4),
    xmlTag('indTot', '1', 4),
    '      </prod>',
    '      <imposto>',
    '        <ICMS>',
    icms,
    '        </ICMS>',
    '        <PIS>',
    '          <PISOutr>',
    xmlTag('CST', item.pisCst, 6),
    xmlTag('vBC', '0.00', 6),
    xmlTag('pPIS', '0.0000', 6),
    xmlTag('vPIS', '0.00', 6),
    '          </PISOutr>',
    '        </PIS>',
    '        <COFINS>',
    '          <COFINSOutr>',
    xmlTag('CST', item.cofinsCst, 6),
    xmlTag('vBC', '0.00', 6),
    xmlTag('pCOFINS', '0.0000', 6),
    xmlTag('vCOFINS', '0.00', 6),
    '          </COFINSOutr>',
    '        </COFINS>',
    '      </imposto>',
    '    </det>',
  ].filter(Boolean).join('\n');
}

function addressXml(tagName, address, level) {
  return [
    `${'  '.repeat(level)}<${tagName}>`,
    xmlTag('xLgr', address.street, level + 1),
    xmlTag('nro', address.number, level + 1),
    xmlTag('xCpl', address.complement, level + 1),
    xmlTag('xBairro', address.district, level + 1),
    xmlTag('cMun', address.cityCode, level + 1),
    xmlTag('xMun', address.city, level + 1),
    xmlTag('UF', address.uf, level + 1),
    xmlTag('CEP', address.cep, level + 1),
    xmlTag('cPais', address.countryCode, level + 1),
    xmlTag('xPais', address.country, level + 1),
    xmlTag('fone', address.phone, level + 1),
    `${'  '.repeat(level)}</${tagName}>`,
  ].filter(Boolean).join('\n');
}

export function buildUnsignedNfeSpXml(inputValue) {
  const validation = validateNfeSpXmlInput(inputValue);
  if (!validation.valid) return { ...validation, xml: '' };
  const { input, accessKey } = validation;
  const crt = taxRegimeCode(input.issuer.taxRegime);
  const idDest = destinationCode(input.issuer.address.uf, input.recipient.address.uf);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<NFe xmlns="${NFE_NAMESPACE}">`,
    `  <infNFe Id="NFe${accessKey}" versao="4.00">`,
    '    <ide>',
    xmlTag('cUF', '35', 3),
    xmlTag('cNF', input.numericCode.padStart(8, '0'), 3),
    xmlTag('natOp', input.operationNature, 3),
    xmlTag('mod', '55', 3),
    xmlTag('serie', String(Number(input.series)), 3),
    xmlTag('nNF', String(Number(input.number)), 3),
    xmlTag('dhEmi', input.issuedAt, 3),
    xmlTag('tpNF', '1', 3),
    xmlTag('idDest', idDest, 3),
    xmlTag('cMunFG', input.issuer.address.cityCode, 3),
    xmlTag('tpImp', '1', 3),
    xmlTag('tpEmis', input.emissionType, 3),
    xmlTag('cDV', accessKey.slice(-1), 3),
    xmlTag('tpAmb', '2', 3),
    xmlTag('finNFe', input.purpose, 3),
    xmlTag('indFinal', input.consumerFinal ? '1' : '0', 3),
    xmlTag('indPres', presenceCode(input.presence), 3),
    xmlTag('indIntermed', '0', 3),
    xmlTag('procEmi', '0', 3),
    xmlTag('verProc', input.documentStage === 'signature' ? 'AvantaLab 0.1' : 'AvantaLab 0.1 PRE', 3),
    '    </ide>',
    '    <emit>',
    xmlTag('CNPJ', input.issuer.document, 3),
    xmlTag('xNome', input.issuer.legalName, 3),
    xmlTag('xFant', input.issuer.tradeName, 3),
    addressXml('enderEmit', input.issuer.address, 3),
    xmlTag('IE', input.issuer.stateRegistration, 3),
    xmlTag('CRT', crt, 3),
    '    </emit>',
    '    <dest>',
    xmlTag(input.recipient.document.length === 14 ? 'CNPJ' : 'CPF', input.recipient.document, 3),
    xmlTag('xNome', HOMOLOGATION_RECIPIENT_NAME, 3),
    addressXml('enderDest', input.recipient.address, 3),
    xmlTag('indIEDest', input.recipient.stateRegistrationIndicator, 3),
    xmlTag('IE', input.recipient.stateRegistrationIndicator === '1' ? input.recipient.stateRegistration : '', 3),
    xmlTag('email', input.recipient.email, 3),
    '    </dest>',
    input.items.map((item, index) => itemXml(item, index, crt)).join('\n'),
    '    <total>',
    '      <ICMSTot>',
    xmlTag('vBC', '0.00', 4),
    xmlTag('vICMS', '0.00', 4),
    xmlTag('vICMSDeson', '0.00', 4),
    xmlTag('vFCP', '0.00', 4),
    xmlTag('vBCST', '0.00', 4),
    xmlTag('vST', '0.00', 4),
    xmlTag('vFCPST', '0.00', 4),
    xmlTag('vFCPSTRet', '0.00', 4),
    xmlTag('vProd', formatDecimal(input.totals.products, 2), 4),
    xmlTag('vFrete', formatDecimal(input.totals.freight, 2), 4),
    xmlTag('vSeg', formatDecimal(input.totals.insurance, 2), 4),
    xmlTag('vDesc', formatDecimal(input.totals.discount, 2), 4),
    xmlTag('vII', '0.00', 4),
    xmlTag('vIPI', '0.00', 4),
    xmlTag('vIPIDevol', '0.00', 4),
    xmlTag('vPIS', '0.00', 4),
    xmlTag('vCOFINS', '0.00', 4),
    xmlTag('vOutro', formatDecimal(input.totals.other, 2), 4),
    xmlTag('vNF', formatDecimal(input.totals.invoice, 2), 4),
    '      </ICMSTot>',
    '    </total>',
    '    <transp>',
    xmlTag('modFrete', '9', 3),
    '    </transp>',
    '    <pag>',
    '      <detPag>',
    xmlTag('indPag', '0', 4),
    xmlTag('tPag', paymentCode(input.payment.method), 4),
    xmlTag('vPag', formatDecimal(input.payment.amount, 2), 4),
    '      </detPag>',
    '    </pag>',
    '    <infAdic>',
    xmlTag('infCpl', input.documentStage === 'signature'
      ? input.additionalInfo
      : `${input.additionalInfo ? `${input.additionalInfo} · ` : ''}PRE-XML DE HOMOLOGACAO SEM ASSINATURA E SEM VALOR FISCAL`, 3),
    '    </infAdic>',
    '  </infNFe>',
    '</NFe>',
  ].filter(Boolean).join('\n');
  return { ...validation, xml };
}

export function prototypeDraftToNfeSpXmlInput({ draft, client, config, issuedAt }) {
  const issuer = draft?.issuer || {};
  const items = Array.isArray(draft?.items) ? draft.items : [];
  const productTotal = items.reduce((total, item) => total + decimal(item.quantity) * decimal(item.unitPrice), 0);
  const storedTotals = draft?.commercialTotals && typeof draft.commercialTotals === 'object' ? draft.commercialTotals : {};
  const lineDiscounts = items.map((item) => Math.min(decimal(item.quantity) * decimal(item.unitPrice), decimal(item.quantity) * Math.max(0, decimal(item.unitDiscount))));
  const lineDiscountTotal = lineDiscounts.reduce((total, value) => total + value, 0);
  const orderDiscount = Math.max(0, decimal(storedTotals.orderDiscount, Math.max(0, decimal(storedTotals.discount) - lineDiscountTotal)));
  const discountBases = items.map((item, index) => Math.max(0, decimal(item.quantity) * decimal(item.unitPrice) - lineDiscounts[index]));
  const discountBaseTotal = discountBases.reduce((total, value) => total + value, 0);
  let allocatedOrderDiscount = 0;
  const itemDiscounts = items.map((item, index) => {
    const available = Math.max(0, discountBases[index]);
    const remaining = Math.max(0, orderDiscount - allocatedOrderDiscount);
    const allocation = index === items.length - 1
      ? Math.min(available, remaining)
      : Math.min(available, Math.round((discountBaseTotal > 0 ? orderDiscount * available / discountBaseTotal : 0) * 100) / 100);
    allocatedOrderDiscount += allocation;
    return Math.round((lineDiscounts[index] + allocation) * 100) / 100;
  });
  const discountTotal = itemDiscounts.reduce((total, value) => total + value, 0);
  const normalizedProducts = decimal(storedTotals.products, productTotal);
  const normalizedFreight = Math.max(0, decimal(storedTotals.freight));
  const normalizedInsurance = Math.max(0, decimal(storedTotals.insurance));
  const normalizedOther = Math.max(0, decimal(storedTotals.other));
  const normalizedInvoice = decimal(storedTotals.invoice, draft?.total);
  const recipientIndicator = recipientStateRegistrationIndicator(client?.fiscal, client?.stateRegistration);
  return normalizeNfeSpXmlInput({
    documentStage: config?.documentStage,
    issuedAt,
    operationNature: draft?.operationNature,
    series: issuer.series || draft?.series,
    number: config?.testDocumentNumber,
    numericCode: config?.testNumericCode,
    consumerFinal: client?.fiscal === 'Consumidor final',
    presence: draft?.operationContext?.presence,
    issuer: {
      document: issuer.document,
      legalName: issuer.legalName,
      stateRegistration: issuer.stateRegistration,
      taxRegime: issuer.taxRegime,
      address: { street: issuer.street, number: issuer.number, complement: issuer.complement, district: issuer.district, cityCode: issuer.cityCode, city: issuer.city, uf: issuer.uf, cep: issuer.cep, phone: issuer.phone },
    },
    recipient: {
      document: client?.document || draft?.clientDocument,
      name: client?.legalName || client?.name || draft?.client,
      stateRegistration: client?.stateRegistration,
      stateRegistrationIndicator: recipientIndicator,
      email: client?.email,
      address: { street: client?.street, number: client?.number, complement: client?.complement, district: client?.district, cityCode: client?.cityCode, city: client?.cityName, uf: client?.state, cep: client?.cep, phone: client?.phone },
    },
    items: items.map((item, index) => ({ number: index + 1, code: item.sku, description: item.name, gtin: item.gtin, ncm: item.ncm, cest: item.cest, cfop: item.cfopInternal, commercialUnit: item.unit, quantity: item.quantity, unitValue: item.unitPrice, totalValue: decimal(item.quantity) * decimal(item.unitPrice), discountValue: itemDiscounts[index], taxableUnit: item.taxableUnit || item.unit, taxableQuantity: item.quantity, taxableUnitValue: item.unitPrice, origin: item.fiscalOriginCode, icmsCode: item.icmsCode, pisCst: item.pisCst, cofinsCst: item.cofinsCst })),
    totals: { products: normalizedProducts, freight: normalizedFreight, insurance: normalizedInsurance, discount: discountTotal, other: normalizedOther, invoice: normalizedInvoice },
    payment: { method: draft?.paymentMethod || 'Outros', amount: draft?.total },
    additionalInfo: `Rascunho ${draft?.id || 'não identificado'} · origem ${draft?.originId || 'não identificada'}`,
    matrixReviewConfirmed: config?.matrixReviewConfirmed,
    fiscalReviewConfirmed: config?.taxReviewConfirmed,
    taxReformReviewConfirmed: config?.taxReformReviewConfirmed,
  });
}
