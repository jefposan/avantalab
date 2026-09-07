import { buildProcessedNfeArtifact } from './nfe-processed-artifact.mjs';

export const NFE_DANFE_REFERENCE = 'MOC 7.0 - Anexo II';
export const NFE_DANFE_MAX_ITEMS = 990;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CODE_128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112',
];

function error(code, field, message) {
  return { code, field, message };
}

function xmlText(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

function tagBlock(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml)?.[0] || '';
}

function tagBlocks(xml, localName) {
  return [...String(xml || '').matchAll(new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'gi'))].map((match) => match[0]);
}

function tagValue(xml, localName) {
  const match = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml);
  return match ? xmlText(match[1].replace(/<[^>]+>/g, '')) : '';
}

function rootAttributes(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b([^>]*)>`, 'i').exec(xml)?.[1] || '';
}

function attributeValue(attributes, name) {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes)?.[2]?.trim() || '';
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function number(value) {
  const parsed = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ascii(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pdfText(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value) {
  return number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function quantity(value) {
  return number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function documentMask(value) {
  const valueDigits = digits(value);
  if (valueDigits.length === 14) return valueDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (valueDigits.length === 11) return valueDigits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return valueDigits;
}

function cepMask(value) {
  const valueDigits = digits(value);
  return valueDigits.length === 8 ? valueDigits.replace(/^(\d{5})(\d{3})$/, '$1-$2') : valueDigits;
}

function accessKeyMask(value) {
  return digits(value).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function dateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(value || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}${match[4] ? ` ${match[4]}:${match[5]}:${match[6] || '00'}` : ''}` : ascii(value);
}

function address(block, prefix) {
  const scope = tagBlock(block, prefix);
  return {
    street: tagValue(scope, 'xLgr'), number: tagValue(scope, 'nro'), complement: tagValue(scope, 'xCpl'), district: tagValue(scope, 'xBairro'), cityCode: tagValue(scope, 'cMun'), city: tagValue(scope, 'xMun'), state: tagValue(scope, 'UF'), cep: tagValue(scope, 'CEP'), country: tagValue(scope, 'xPais'), phone: tagValue(scope, 'fone'),
  };
}

function parseProcessedNfe(value) {
  const xml = typeof value === 'string' ? value.trim() : '';
  const errors = [];
  if (!xml) errors.push(error('AV-NFE-DANFE-XML-EMPTY', 'processedXml', 'O procNFe não foi fornecido.'));
  if (xml && Buffer.byteLength(xml, 'utf8') > 2 * 1024 * 1024) errors.push(error('AV-NFE-DANFE-XML-SIZE', 'processedXml', 'O procNFe excede o limite de 2 MB para geração do DANFE.'));
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) errors.push(error('AV-NFE-DANFE-XML-DOCTYPE', 'processedXml', 'O procNFe contém declaração externa proibida.'));
  const processBlock = errors.length ? '' : tagBlock(xml, 'nfeProc');
  const nfeBlock = tagBlock(processBlock, 'NFe');
  const protocolBlock = tagBlock(processBlock, 'protNFe');
  if (!processBlock || !nfeBlock || !protocolBlock) errors.push(error('AV-NFE-DANFE-PROCESS', 'processedXml.nfeProc', 'O documento não contém NF-e e protocolo processados.'));
  const validated = nfeBlock && protocolBlock ? buildProcessedNfeArtifact({ signedXml: nfeBlock, protocolXml: protocolBlock }) : { valid: false, errors: [] };
  if (!validated.valid) errors.push(...(validated.errors || []).map((entry) => ({ ...entry, code: `AV-NFE-DANFE-${entry.code}` })));
  const info = tagBlock(nfeBlock, 'infNFe');
  const ide = tagBlock(info, 'ide');
  const issuer = tagBlock(info, 'emit');
  const recipient = tagBlock(info, 'dest');
  const total = tagBlock(tagBlock(info, 'total'), 'ICMSTot');
  const transport = tagBlock(info, 'transp');
  const billing = tagBlock(info, 'cobr');
  const additional = tagBlock(info, 'infAdic');
  const issuerDocument = tagValue(issuer, 'CNPJ') || tagValue(issuer, 'CPF');
  const recipientDocument = tagValue(recipient, 'CNPJ') || tagValue(recipient, 'CPF') || tagValue(recipient, 'idEstrangeiro');
  const items = tagBlocks(info, 'det').map((itemBlock) => {
    const product = tagBlock(itemBlock, 'prod');
    const tax = tagBlock(itemBlock, 'imposto');
    const icms = tagBlock(tax, 'ICMS');
    const icmsGroup = icms ? icms.replace(/^<[^>]+>|<\/[^>]+>$/g, '') : '';
    return {
      number: attributeValue(rootAttributes(itemBlock, 'det'), 'nItem'),
      code: tagValue(product, 'cProd'), description: tagValue(product, 'xProd'), ncm: tagValue(product, 'NCM'), cest: tagValue(product, 'CEST'), cfop: tagValue(product, 'CFOP'), unit: tagValue(product, 'uCom'), quantity: tagValue(product, 'qCom'), unitValue: tagValue(product, 'vUnCom'), totalValue: tagValue(product, 'vProd'), discount: tagValue(product, 'vDesc'), additionalInfo: tagValue(itemBlock, 'infAdProd'), taxCode: tagValue(icmsGroup, 'CSOSN') || tagValue(icmsGroup, 'CST'),
    };
  });
  const data = {
    accessKey: validated.accessKey || attributeValue(rootAttributes(info, 'infNFe'), 'Id').replace(/^NFe/i, ''),
    protocolNumber: validated.protocolNumber || tagValue(protocolBlock, 'nProt'), protocolReceivedAt: validated.receivedAt || tagValue(protocolBlock, 'dhRecbto'),
    environment: tagValue(ide, 'tpAmb'), model: tagValue(ide, 'mod'), series: tagValue(ide, 'serie'), number: tagValue(ide, 'nNF'), issueDate: tagValue(ide, 'dhEmi') || tagValue(ide, 'dEmi'), exitDate: tagValue(ide, 'dhSaiEnt') || tagValue(ide, 'dSaiEnt'), operationType: tagValue(ide, 'tpNF'), nature: tagValue(ide, 'natOp'),
    issuer: { name: tagValue(issuer, 'xNome'), tradeName: tagValue(issuer, 'xFant'), document: issuerDocument, stateRegistration: tagValue(issuer, 'IE'), substituteRegistration: tagValue(issuer, 'IEST'), municipalRegistration: tagValue(issuer, 'IM'), address: address(issuer, 'enderEmit') },
    recipient: { name: tagValue(recipient, 'xNome'), document: recipientDocument, stateRegistration: tagValue(recipient, 'IE') || tagValue(recipient, 'indIEDest'), email: tagValue(recipient, 'email'), address: address(recipient, 'enderDest') },
    totals: Object.fromEntries(['vBC','vICMS','vICMSDeson','vFCP','vBCST','vST','vFCPST','vProd','vFrete','vSeg','vDesc','vII','vIPI','vIPIDevol','vPIS','vCOFINS','vOutro','vNF'].map((name) => [name, tagValue(total, name)])),
    transport: { freightMode: tagValue(transport, 'modFrete'), carrier: tagValue(tagBlock(transport, 'transporta'), 'xNome'), document: tagValue(tagBlock(transport, 'transporta'), 'CNPJ') || tagValue(tagBlock(transport, 'transporta'), 'CPF'), stateRegistration: tagValue(tagBlock(transport, 'transporta'), 'IE'), address: tagValue(tagBlock(transport, 'transporta'), 'xEnder'), city: tagValue(tagBlock(transport, 'transporta'), 'xMun'), state: tagValue(tagBlock(transport, 'transporta'), 'UF'), vehiclePlate: tagValue(tagBlock(transport, 'veicTransp'), 'placa'), vehicleState: tagValue(tagBlock(transport, 'veicTransp'), 'UF'), volume: tagBlocks(transport, 'vol').map((volume) => ({ quantity: tagValue(volume, 'qVol'), species: tagValue(volume, 'esp'), brand: tagValue(volume, 'marca'), numbering: tagValue(volume, 'nVol'), grossWeight: tagValue(volume, 'pesoB'), netWeight: tagValue(volume, 'pesoL') })) },
    installments: tagBlocks(billing, 'dup').map((entry) => ({ number: tagValue(entry, 'nDup'), dueDate: tagValue(entry, 'dVenc'), value: tagValue(entry, 'vDup') })),
    invoice: { number: tagValue(tagBlock(billing, 'fat'), 'nFat'), originalValue: tagValue(tagBlock(billing, 'fat'), 'vOrig'), discount: tagValue(tagBlock(billing, 'fat'), 'vDesc'), netValue: tagValue(tagBlock(billing, 'fat'), 'vLiq') },
    additional: { taxpayer: tagValue(additional, 'infCpl'), taxAuthority: tagValue(additional, 'infAdFisco') }, items,
  };
  if (data.model && data.model !== '55') errors.push(error('AV-NFE-DANFE-MODEL', 'processedXml.mod', 'Este gerador aceita somente NF-e modelo 55.'));
  if (data.environment && data.environment !== '2') errors.push(error('AV-NFE-DANFE-ENVIRONMENT', 'processedXml.tpAmb', 'O piloto gera DANFE somente para homologação.'));
  if (!data.number || !data.series || !data.nature || !data.issueDate) errors.push(error('AV-NFE-DANFE-IDENTIFICATION', 'processedXml.ide', 'Número, série, natureza e emissão são obrigatórios no DANFE.'));
  if (!data.issuer.name || digits(data.issuer.document).length !== 14 || !data.issuer.address.street || !data.issuer.address.city || !data.issuer.address.state) errors.push(error('AV-NFE-DANFE-ISSUER', 'processedXml.emit', 'A identificação e o endereço do emitente estão incompletos.'));
  if (!data.recipient.name || !data.recipient.document || !data.recipient.address.street || !data.recipient.address.city || !data.recipient.address.state) errors.push(error('AV-NFE-DANFE-RECIPIENT', 'processedXml.dest', 'A identificação e o endereço do destinatário estão incompletos.'));
  if (!items.length) errors.push(error('AV-NFE-DANFE-ITEMS', 'processedXml.det', 'A NF-e não possui itens para o DANFE.'));
  if (items.length > NFE_DANFE_MAX_ITEMS) errors.push(error('AV-NFE-DANFE-ITEMS-LIMIT', 'processedXml.det', `O DANFE aceita até ${NFE_DANFE_MAX_ITEMS} itens.`));
  if (!data.totals.vNF) errors.push(error('AV-NFE-DANFE-TOTAL', 'processedXml.ICMSTot.vNF', 'O valor total da NF-e não foi informado.'));
  return { valid: errors.length === 0, errors, data };
}

function rect(commands, x, y, width, height, fill = '') {
  if (fill) commands.push(`q ${fill} rg ${x} ${y} ${width} ${height} re f Q`);
  commands.push(`${x} ${y} ${width} ${height} re S`);
}

function line(commands, x1, y1, x2, y2) {
  commands.push(`${x1} ${y1} m ${x2} ${y2} l S`);
}

function text(commands, value, x, y, size = 7, bold = false, align = 'left', width = 0) {
  const safe = pdfText(value);
  const estimated = safe.length * size * (bold ? 0.54 : 0.5);
  const drawX = align === 'center' ? x + Math.max(0, (width - estimated) / 2) : align === 'right' ? x + Math.max(0, width - estimated) : x;
  commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${safe}) Tj ET`);
}

function wrap(value, maxChars, maxLines = 2) {
  const words = ascii(value).split(' ').filter(Boolean);
  const lines = [];
  for (const word of words) {
    if (!lines.length || `${lines.at(-1)} ${word}`.trim().length > maxChars) lines.push(word);
    else lines[lines.length - 1] = `${lines.at(-1)} ${word}`;
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
  }
  return lines.length ? lines : ['-'];
}

function labeledValue(commands, label, value, x, y, width, height, options = {}) {
  rect(commands, x, y, width, height, options.fill || '');
  text(commands, label.toUpperCase(), x + 3, y + height - 8, 5.5, true);
  const lines = wrap(value || '-', options.maxChars || Math.max(8, Math.floor(width / 4.4)), options.maxLines || 1);
  lines.forEach((entry, index) => text(commands, entry, x + 3, y + height - 19 - index * 8, options.size || 7.4, options.bold || false));
}

function barcodeCommands(accessKey, x, y, maxWidth, height) {
  const normalized = digits(accessKey);
  if (!/^\d{44}$/.test(normalized)) return [];
  const values = normalized.match(/\d{2}/g).map(Number);
  const sequence = [105, ...values];
  let checksum = 105;
  values.forEach((value, index) => { checksum += value * (index + 1); });
  sequence.push(checksum % 103, 106);
  const modules = sequence.reduce((total, value) => total + [...CODE_128_PATTERNS[value]].reduce((sum, digit) => sum + Number(digit), 0), 0);
  const moduleWidth = Math.min(0.82, maxWidth / modules);
  let cursor = x + (maxWidth - modules * moduleWidth) / 2;
  const commands = [];
  sequence.forEach((value) => {
    [...CODE_128_PATTERNS[value]].forEach((digit, index) => {
      const width = Number(digit) * moduleWidth;
      if (index % 2 === 0) commands.push(`${cursor.toFixed(2)} ${y} ${width.toFixed(2)} ${height} re f`);
      cursor += width;
    });
  });
  return commands;
}

function commonHeader(commands, data, pageNumber, pageCount, firstPage) {
  if (firstPage) {
    rect(commands, MARGIN, 807, CONTENT_WIDTH, 27);
    text(commands, `RECEBEMOS DE ${data.issuer.name} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.`, MARGIN + 4, 822, 5.7);
    text(commands, 'DATA DE RECEBIMENTO', MARGIN + 4, 810, 5.3, true);
    line(commands, MARGIN + 108, 807, MARGIN + 108, 821);
    text(commands, 'IDENTIFICACAO E ASSINATURA DO RECEBEDOR', MARGIN + 112, 810, 5.3, true);
    line(commands, 468, 807, 468, 834);
    text(commands, `NF-e  N. ${String(data.number).padStart(9, '0')}`, 468, 821, 7.5, true, 'center', MARGIN + CONTENT_WIDTH - 468);
    text(commands, `SERIE ${String(data.series).padStart(3, '0')}`, 468, 811, 6.7, true, 'center', MARGIN + CONTENT_WIDTH - 468);
  }
  const top = firstPage ? 799 : 810;
  const headerHeight = 104;
  const issuerWidth = 248;
  const danfeWidth = 92;
  const keyWidth = CONTENT_WIDTH - issuerWidth - danfeWidth;
  rect(commands, MARGIN, top - headerHeight, issuerWidth, headerHeight);
  const initials = ascii(data.issuer.tradeName || data.issuer.name).split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  rect(commands, MARGIN + 8, top - 48, 38, 38, '0.94 0.97 0.99');
  text(commands, initials || 'NF', MARGIN + 8, top - 34, 14, true, 'center', 38);
  text(commands, data.issuer.tradeName || data.issuer.name, MARGIN + 51, top - 20, 10, true);
  wrap(data.issuer.name, 42, 2).forEach((entry, index) => text(commands, entry, MARGIN + 51, top - 32 - index * 8, 6.5));
  const issuerAddress = `${data.issuer.address.street}, ${data.issuer.address.number}${data.issuer.address.complement ? ` - ${data.issuer.address.complement}` : ''} - ${data.issuer.address.district}`;
  wrap(issuerAddress, 64, 2).forEach((entry, index) => text(commands, entry, MARGIN + 8, top - 62 - index * 8, 6.2));
  text(commands, `${data.issuer.address.city}/${data.issuer.address.state} - CEP ${cepMask(data.issuer.address.cep)}${data.issuer.address.phone ? ` - Fone ${data.issuer.address.phone}` : ''}`, MARGIN + 8, top - 82, 6.2);
  text(commands, `CNPJ ${documentMask(data.issuer.document)} - IE ${data.issuer.stateRegistration || '-'}`, MARGIN + 8, top - 94, 6.2, true);
  const danfeX = MARGIN + issuerWidth;
  rect(commands, danfeX, top - headerHeight, danfeWidth, headerHeight);
  text(commands, 'DANFE', danfeX, top - 18, 15, true, 'center', danfeWidth);
  text(commands, 'Documento Auxiliar da', danfeX, top - 30, 5.8, false, 'center', danfeWidth);
  text(commands, 'Nota Fiscal Eletronica', danfeX, top - 38, 5.8, false, 'center', danfeWidth);
  text(commands, data.operationType === '0' ? '0 - ENTRADA' : '1 - SAIDA', danfeX, top - 55, 7, true, 'center', danfeWidth);
  text(commands, `N. ${String(data.number).padStart(9, '0')}`, danfeX, top - 71, 8, true, 'center', danfeWidth);
  text(commands, `SERIE ${String(data.series).padStart(3, '0')}`, danfeX, top - 83, 7, true, 'center', danfeWidth);
  text(commands, `FOLHA ${pageNumber}/${pageCount}`, danfeX, top - 96, 6.5, true, 'center', danfeWidth);
  const keyX = danfeX + danfeWidth;
  rect(commands, keyX, top - headerHeight, keyWidth, headerHeight);
  commands.push(...barcodeCommands(data.accessKey, keyX + 5, top - 35, keyWidth - 10, 24));
  text(commands, 'CHAVE DE ACESSO', keyX + 4, top - 45, 5.5, true);
  text(commands, accessKeyMask(data.accessKey), keyX, top - 58, 6.5, true, 'center', keyWidth);
  text(commands, 'Consulta de autenticidade no portal nacional da NF-e', keyX, top - 74, 5.5, false, 'center', keyWidth);
  text(commands, 'www.nfe.fazenda.gov.br/portal ou no site da Sefaz autorizadora', keyX, top - 83, 5.2, false, 'center', keyWidth);
  text(commands, `PROTOCOLO: ${data.protocolNumber} - ${dateTime(data.protocolReceivedAt)}`, keyX, top - 97, 5.7, true, 'center', keyWidth);
  return top - headerHeight;
}

function drawItemTable(commands, items, topY, bottomY) {
  const columns = [55, 175, 48, 30, 32, 24, 45, 58, CONTENT_WIDTH - 467];
  const labels = ['CODIGO', 'DESCRICAO DOS PRODUTOS / SERVICOS', 'NCM/SH', 'CST', 'CFOP', 'UN', 'QTD.', 'V. UNIT.', 'V. TOTAL'];
  const rowHeight = 27;
  const headerHeight = 22;
  const tableHeight = Math.max(headerHeight + items.length * rowHeight, topY - bottomY);
  const tableBottom = topY - tableHeight;
  rect(commands, MARGIN, tableBottom, CONTENT_WIDTH, tableHeight);
  commands.push(`q 0.94 0.96 0.98 rg ${MARGIN} ${topY - headerHeight} ${CONTENT_WIDTH} ${headerHeight} re f Q`);
  line(commands, MARGIN, topY - headerHeight, MARGIN + CONTENT_WIDTH, topY - headerHeight);
  let cursor = MARGIN;
  columns.forEach((width, index) => {
    if (index > 0) line(commands, cursor, tableBottom, cursor, topY);
    text(commands, labels[index], cursor + 1, topY - 13, index === 1 ? 5.2 : 5, true, 'center', width - 2);
    cursor += width;
  });
  items.forEach((item, rowIndex) => {
    const rowTop = topY - headerHeight - rowIndex * rowHeight;
    const rowBottom = rowTop - rowHeight;
    line(commands, MARGIN, rowBottom, MARGIN + CONTENT_WIDTH, rowBottom);
    const values = [item.code, '', item.ncm, item.taxCode, item.cfop, item.unit, quantity(item.quantity), money(item.unitValue), money(item.totalValue)];
    let x = MARGIN;
    values.forEach((value, index) => {
      if (index !== 1) text(commands, value || '-', x + 2, rowTop - 16, index >= 6 ? 5.8 : 6, false, index >= 6 ? 'right' : 'center', columns[index] - 4);
      x += columns[index];
    });
    wrap(`${item.description}${item.additionalInfo ? ` - ${item.additionalInfo}` : ''}`, 49, 2).forEach((entry, index) => text(commands, entry, MARGIN + columns[0] + 3, rowTop - 10 - index * 9, 6.2));
  });
  return tableBottom;
}

function drawFirstPage(commands, data, items, pageNumber, pageCount, sampleMode) {
  commands.push('0 G 0 g 0.45 w');
  if (sampleMode) commands.push('q 0.965 g BT /F2 34 Tf 0.866 0.5 -0.5 0.866 75 290 Tm (AMOSTRA TECNICA - SEM VALOR FISCAL) Tj ET Q');
  const headerBottom = commonHeader(commands, data, pageNumber, pageCount, true);
  let y = headerBottom - 3;
  labeledValue(commands, 'Natureza da operacao', data.nature, MARGIN, y - 27, 235, 27, { bold: true });
  labeledValue(commands, 'Inscricao estadual', data.issuer.stateRegistration, MARGIN + 235, y - 27, 85, 27);
  labeledValue(commands, 'IE do substituto tributario', data.issuer.substituteRegistration, MARGIN + 320, y - 27, 95, 27);
  labeledValue(commands, 'CNPJ', documentMask(data.issuer.document), MARGIN + 415, y - 27, CONTENT_WIDTH - 415, 27, { bold: true });
  y -= 31;
  text(commands, 'DESTINATARIO / REMETENTE', MARGIN, y, 6, true);
  y -= 35;
  labeledValue(commands, 'Nome / razao social', data.recipient.name, MARGIN, y, 290, 31, { bold: true });
  labeledValue(commands, 'CNPJ / CPF', documentMask(data.recipient.document), MARGIN + 290, y, 130, 31);
  labeledValue(commands, 'Data da emissao', dateTime(data.issueDate), MARGIN + 420, y, CONTENT_WIDTH - 420, 31);
  y -= 31;
  const recipientAddress = `${data.recipient.address.street}, ${data.recipient.address.number}${data.recipient.address.complement ? ` - ${data.recipient.address.complement}` : ''}`;
  labeledValue(commands, 'Endereco', recipientAddress, MARGIN, y, 245, 31);
  labeledValue(commands, 'Bairro / distrito', data.recipient.address.district, MARGIN + 245, y, 105, 31);
  labeledValue(commands, 'CEP', cepMask(data.recipient.address.cep), MARGIN + 350, y, 70, 31);
  labeledValue(commands, 'Data saida / entrada', dateTime(data.exitDate), MARGIN + 420, y, CONTENT_WIDTH - 420, 31);
  y -= 31;
  labeledValue(commands, 'Municipio', data.recipient.address.city, MARGIN, y, 245, 29);
  labeledValue(commands, 'Fone / fax', data.recipient.address.phone, MARGIN + 245, y, 105, 29);
  labeledValue(commands, 'UF', data.recipient.address.state, MARGIN + 350, y, 35, 29);
  labeledValue(commands, 'Inscricao estadual', data.recipient.stateRegistration, MARGIN + 385, y, 105, 29);
  labeledValue(commands, 'Hora saida', data.exitDate ? dateTime(data.exitDate).split(' ')[1] : '', MARGIN + 490, y, CONTENT_WIDTH - 490, 29);
  y -= 36;
  text(commands, 'CALCULO DO IMPOSTO', MARGIN, y, 6, true);
  y -= 29;
  const totalTop = y;
  const totalWidths = [90, 90, 90, 90, CONTENT_WIDTH - 360];
  ['Base de calculo do ICMS','Valor do ICMS','Base de calculo do ICMS ST','Valor do ICMS ST','Valor total dos produtos'].forEach((label, index) => labeledValue(commands, label, money(data.totals[['vBC','vICMS','vBCST','vST','vProd'][index]]), MARGIN + totalWidths.slice(0, index).reduce((sum, width) => sum + width, 0), totalTop, totalWidths[index], 29, { bold: index === 4 }));
  y -= 29;
  const secondWidths = [72,72,72,72,72,CONTENT_WIDTH - 360];
  ['Valor do frete','Valor do seguro','Desconto','Outras despesas','Valor do IPI','Valor total da nota'].forEach((label, index) => labeledValue(commands, label, money(data.totals[['vFrete','vSeg','vDesc','vOutro','vIPI','vNF'][index]]), MARGIN + secondWidths.slice(0, index).reduce((sum, width) => sum + width, 0), y, secondWidths[index], 29, { bold: index === 5 }));
  y -= 36;
  text(commands, 'TRANSPORTADOR / VOLUMES TRANSPORTADOS', MARGIN, y, 6, true);
  y -= 30;
  const volume = data.transport.volume[0] || {};
  labeledValue(commands, 'Nome / razao social', data.transport.carrier, MARGIN, y, 205, 30);
  labeledValue(commands, 'Frete por conta', data.transport.freightMode || '-', MARGIN + 205, y, 65, 30);
  labeledValue(commands, 'Placa do veiculo', data.transport.vehiclePlate, MARGIN + 270, y, 75, 30);
  labeledValue(commands, 'UF', data.transport.vehicleState, MARGIN + 345, y, 30, 30);
  labeledValue(commands, 'CNPJ / CPF', documentMask(data.transport.document), MARGIN + 375, y, CONTENT_WIDTH - 375, 30);
  y -= 30;
  labeledValue(commands, 'Quantidade', volume.quantity, MARGIN, y, 65, 27);
  labeledValue(commands, 'Especie', volume.species, MARGIN + 65, y, 85, 27);
  labeledValue(commands, 'Marca', volume.brand, MARGIN + 150, y, 85, 27);
  labeledValue(commands, 'Numeracao', volume.numbering, MARGIN + 235, y, 95, 27);
  labeledValue(commands, 'Peso bruto', volume.grossWeight, MARGIN + 330, y, 90, 27);
  labeledValue(commands, 'Peso liquido', volume.netWeight, MARGIN + 420, y, CONTENT_WIDTH - 420, 27);
  y -= 34;
  text(commands, 'DADOS DOS PRODUTOS / SERVICOS', MARGIN, y, 6, true);
  y -= 4;
  const tableBottom = drawItemTable(commands, items, y, 120);
  text(commands, 'DADOS ADICIONAIS', MARGIN, tableBottom - 10, 6, true);
  labeledValue(commands, 'Informacoes complementares', data.additional.taxpayer || 'Sem informacoes complementares.', MARGIN, 35, 360, Math.max(54, tableBottom - 49), { maxChars: 92, maxLines: 5, size: 6.2 });
  labeledValue(commands, 'Reservado ao fisco', data.additional.taxAuthority || '-', MARGIN + 360, 35, CONTENT_WIDTH - 360, Math.max(54, tableBottom - 49), { maxChars: 38, maxLines: 5, size: 6.2 });
  if (sampleMode) {
    text(commands, 'AMOSTRA CONTROLADA - NAO REPRESENTA NF-e AUTORIZADA', MARGIN, 18, 7, true, 'center', CONTENT_WIDTH);
  }
}

function drawContinuationPage(commands, data, items, pageNumber, pageCount, sampleMode) {
  commands.push('0 G 0 g 0.45 w');
  if (sampleMode) commands.push('q 0.965 g BT /F2 34 Tf 0.866 0.5 -0.5 0.866 75 290 Tm (AMOSTRA TECNICA - SEM VALOR FISCAL) Tj ET Q');
  const headerBottom = commonHeader(commands, data, pageNumber, pageCount, false);
  text(commands, 'DADOS DOS PRODUTOS / SERVICOS - CONTINUACAO', MARGIN, headerBottom - 12, 6, true);
  drawItemTable(commands, items, headerBottom - 17, 38);
  if (sampleMode) {
    text(commands, 'AMOSTRA CONTROLADA - NAO REPRESENTA NF-e AUTORIZADA', MARGIN, 18, 7, true, 'center', CONTENT_WIDTH);
  }
}

function buildPdf(pageCommands) {
  const encoder = new TextEncoder();
  const pageCount = pageCommands.length;
  const pageObjectStart = 5;
  const contentObjectStart = pageObjectStart + pageCount;
  const kids = pageCommands.map((_, index) => `${pageObjectStart + index} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  pageCommands.forEach((_, index) => objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`));
  pageCommands.forEach((commands) => {
    const stream = commands.join('\n');
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = '%PDF-1.4\n%AvantaLab DANFE\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = encoder.encode(pdf).length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

export function nfeDanfeFileName(accessKey) {
  const normalized = digits(accessKey);
  return /^\d{44}$/.test(normalized) ? `danfe-nfe-${normalized}.pdf` : 'danfe-nfe.pdf';
}

export function buildNfeDanfe({ processedXml, expectedAccessKey, sampleMode = false } = {}) {
  const parsed = parseProcessedNfe(processedXml);
  const errors = [...parsed.errors];
  if (expectedAccessKey && parsed.data.accessKey && digits(expectedAccessKey) !== parsed.data.accessKey) errors.push(error('AV-NFE-DANFE-EXPECTED-KEY', 'expectedAccessKey', 'O procNFe não corresponde à chave esperada.'));
  if (errors.length) return { valid: false, errors, pdf: new Uint8Array(), fileName: '', pageCount: 0, accessKey: parsed.data.accessKey || '', sampleMode: Boolean(sampleMode), xmlReturned: false };
  const firstPageCapacity = 7;
  const continuationCapacity = 20;
  const chunks = [parsed.data.items.slice(0, firstPageCapacity)];
  for (let index = firstPageCapacity; index < parsed.data.items.length; index += continuationCapacity) chunks.push(parsed.data.items.slice(index, index + continuationCapacity));
  const pageCount = chunks.length;
  const pageCommands = chunks.map((items, index) => {
    const commands = [];
    if (index === 0) drawFirstPage(commands, parsed.data, items, index + 1, pageCount, Boolean(sampleMode));
    else drawContinuationPage(commands, parsed.data, items, index + 1, pageCount, Boolean(sampleMode));
    return commands;
  });
  return { valid: true, errors: [], pdf: buildPdf(pageCommands), fileName: nfeDanfeFileName(parsed.data.accessKey), pageCount, accessKey: parsed.data.accessKey, protocolNumber: parsed.data.protocolNumber, sampleMode: Boolean(sampleMode), xmlReturned: false };
}
