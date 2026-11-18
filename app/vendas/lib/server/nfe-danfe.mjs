import {Font,Encodings} from '@pdf-lib/standard-fonts';
import { buildProcessedNfeArtifact } from './nfe-processed-artifact.mjs';

export const NFE_DANFE_REFERENCE = 'MOC 7.0 - Anexo II';
export const NFE_DANFE_MAX_ITEMS = 990;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 14.17;
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

function parseProcessedNfe(value, expectedEnvironment) {
  const xml = typeof value === 'string' ? value.trim() : '';
  const errors = [];
  if (!xml) errors.push(error('AV-NFE-DANFE-XML-EMPTY', 'processedXml', 'O procNFe não foi fornecido.'));
  if (xml && Buffer.byteLength(xml, 'utf8') > 2 * 1024 * 1024) errors.push(error('AV-NFE-DANFE-XML-SIZE', 'processedXml', 'O procNFe excede o limite de 2 MB para geração do DANFE.'));
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) errors.push(error('AV-NFE-DANFE-XML-DOCTYPE', 'processedXml', 'O procNFe contém declaração externa proibida.'));
  const processBlock = errors.length ? '' : tagBlock(xml, 'nfeProc');
  const nfeBlock = tagBlock(processBlock, 'NFe');
  const protocolBlock = tagBlock(processBlock, 'protNFe');
  if (!processBlock || !nfeBlock || !protocolBlock) errors.push(error('AV-NFE-DANFE-PROCESS', 'processedXml.nfeProc', 'O documento não contém NF-e e protocolo processados.'));
  const validated = nfeBlock && protocolBlock ? buildProcessedNfeArtifact({ signedXml: nfeBlock, protocolXml: protocolBlock, expectedEnvironment }) : { valid: false, errors: [] };
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
    recipient: { name: tagValue(recipient, 'xNome'), document: recipientDocument, stateRegistration: tagValue(recipient, 'IE') || (tagValue(recipient, 'indIEDest') === '2' ? 'ISENTO' : ''), email: tagValue(recipient, 'email'), address: address(recipient, 'enderDest') },
    totals: Object.fromEntries(['vBC','vICMS','vICMSDeson','vFCP','vBCST','vST','vFCPST','vProd','vFrete','vSeg','vDesc','vII','vIPI','vIPIDevol','vPIS','vCOFINS','vOutro','vNF'].map((name) => [name, tagValue(total, name)])),
    transport: { freightMode: tagValue(transport, 'modFrete'), carrier: tagValue(tagBlock(transport, 'transporta'), 'xNome'), document: tagValue(tagBlock(transport, 'transporta'), 'CNPJ') || tagValue(tagBlock(transport, 'transporta'), 'CPF'), stateRegistration: tagValue(tagBlock(transport, 'transporta'), 'IE'), address: tagValue(tagBlock(transport, 'transporta'), 'xEnder'), city: tagValue(tagBlock(transport, 'transporta'), 'xMun'), state: tagValue(tagBlock(transport, 'transporta'), 'UF'), vehiclePlate: tagValue(tagBlock(transport, 'veicTransp'), 'placa'), vehicleState: tagValue(tagBlock(transport, 'veicTransp'), 'UF'), rntc:tagValue(tagBlock(transport,'veicTransp'),'RNTC'), volume: tagBlocks(transport, 'vol').map((volume) => ({ quantity: tagValue(volume, 'qVol'), species: tagValue(volume, 'esp'), brand: tagValue(volume, 'marca'), numbering: tagValue(volume, 'nVol'), grossWeight: tagValue(volume, 'pesoB'), netWeight: tagValue(volume, 'pesoL') })) },
    installments: tagBlocks(billing, 'dup').map((entry) => ({ number: tagValue(entry, 'nDup'), dueDate: tagValue(entry, 'dVenc'), value: tagValue(entry, 'vDup') })),
    invoice: { number: tagValue(tagBlock(billing, 'fat'), 'nFat'), originalValue: tagValue(tagBlock(billing, 'fat'), 'vOrig'), discount: tagValue(tagBlock(billing, 'fat'), 'vDesc'), netValue: tagValue(tagBlock(billing, 'fat'), 'vLiq') },
    additional: { taxpayer: tagValue(additional, 'infCpl'), taxAuthority: tagValue(additional, 'infAdFisco') }, items,
  };
  if (data.model && data.model !== '55') errors.push(error('AV-NFE-DANFE-MODEL', 'processedXml.mod', 'Este gerador aceita somente NF-e modelo 55.'));
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

const fontMetrics={normal:Font.load('Helvetica'),bold:Font.load('Helvetica-Bold')};
function textWidth(value,size,bold=false){const font=fontMetrics[bold?'bold':'normal'];return [...ascii(value)].reduce((sum,char)=>sum+(font.getWidthOfGlyph(Encodings.WinAnsi.encodeUnicodeCodePoint(char.codePointAt(0)).name)||0),0)*size/1000;}
function fitLines(value,width,size,bold=false){const output=[];let line='';for(const word of ascii(value||'-').split(/\s+/)){if(textWidth(word,width?size:0,bold)>width){if(line){output.push(line);line='';}for(const char of word){if(textWidth(line+char,size,bold)>width&&line){output.push(line);line='';}line+=char;}continue;}if(textWidth(`${line} ${word}`.trim(),size,bold)>width&&line){output.push(line);line=word;}else line=`${line} ${word}`.trim();}if(line)output.push(line);return output;}
function text(commands, value, x, y, size = 7, bold = false, align = 'left', width = 0) {
  const safe = pdfText(value);
  const estimated = textWidth(value,size,bold);
  const drawX = align === 'center' ? x + Math.max(0, (width - estimated) / 2) : align === 'right' ? x + Math.max(0, width - estimated) : x;
  commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${drawX.toFixed(2)} ${y.toFixed(2)} Td (${safe}) Tj ET`);
}

function wrap(value, maxChars, maxLines = 2) {
  const words = ascii(value).split(/\s+/).filter(Boolean).flatMap(word=>word.match(new RegExp(`.{1,${maxChars}}`,'g'))||[]);
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

function labeledValue(commands,label,value,x,y,width,height,options={}){
 rect(commands,x,y,width,height,options.fill||'');
 const labelSize=Math.min(5.5,(width-8)/Math.max(1,textWidth(label.toUpperCase(),1,true)));
 text(commands,label.toUpperCase(),x+4,y+height-10,labelSize,true);
 let size=options.size||7.4;let lines=fitLines(value||'-',width-8,size,options.bold||false);
 while(lines.length*(size+2)>height-20&&size>5.5){size-=.25;lines=fitLines(value||'-',width-8,size,options.bold||false);}
 lines.forEach((entry,i)=>text(commands,entry,x+4,y+height-22-i*(size+2),size,options.bold||false));
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

const MM=72/25.4;
const at=y=>PAGE_HEIGHT-y*MM;
function frame(commands,x,y,w,h,fill=''){rect(commands,x*MM,at(y+h),w*MM,h*MM,fill);}
function labelCell(commands,label,value,x,y,w,h=12,options={}){labeledValue(commands,label,value,x*MM,at(y+h),w*MM,h*MM,{size:8,maxChars:Math.max(5,Math.floor((w*MM-9)/4.2)),maxLines:Math.max(1,Math.floor((h*MM-22)/9)),...options});}
function sectionBand(commands,label,y){frame(commands,5,y,200,5,'0.95 0.95 0.95');text(commands,label,6.5*MM,at(y+3.6),7,true);}
function commonHeader(commands, data, pageNumber, pageCount, firstPage) {
 const offset=firstPage?0:-17;const y=value=>value+offset;
 if(firstPage){frame(commands,5,5,165,14);wrap(`RECEBEMOS DE ${data.issuer.name} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.`,115,2).forEach((entry,i)=>text(commands,entry,7*MM,at(8.5+i*2.8),5.7));text(commands,'DATA DE RECEBIMENTO',7*MM,at(17),5.3);text(commands,'IDENTIFICACAO E ASSINATURA DO RECEBEDOR',55*MM,at(17),5.3);frame(commands,170,5,35,14);text(commands,`NF-e N. ${String(data.number).padStart(9,'0')}`,172*MM,at(11),8,true);text(commands,`SERIE ${String(data.series).padStart(3,'0')}`,180*MM,at(16),7,true);}
 frame(commands,5,y(22),80,43);text(commands,'IDENTIFICACAO DO EMITENTE',7*MM,at(y(26)),5.5);
 // Logo occupies a separate proportional area; all fiscal identity stays from XML.
 const trade=ascii(data.issuer.tradeName);const legal=ascii(data.issuer.name);const distinct=trade&&trade.toLowerCase()!==legal.toLowerCase();
 const names=fitLines(distinct?trade:legal,47*MM,9,true);names.forEach((entry,i)=>text(commands,entry,35*MM,at(y(33+i*3.5)),9,true));
 if(distinct)fitLines(legal,47*MM,6.8).forEach((entry,i)=>text(commands,entry,35*MM,at(y(43+i*3)),6.8));
 const issuerAddress=`${data.issuer.address.street}, ${data.issuer.address.number}${data.issuer.address.complement?` - ${data.issuer.address.complement}`:''} - ${data.issuer.address.district}`;
 fitLines(issuerAddress,74*MM,7).forEach((entry,i)=>text(commands,entry,8*MM,at(y(51+i*3)),7));
 text(commands,`${data.issuer.address.city}/${data.issuer.address.state} - CEP ${cepMask(data.issuer.address.cep)}`,8*MM,at(y(58)),7);
 text(commands,`CNPJ ${documentMask(data.issuer.document)} - IE ${data.issuer.stateRegistration||'-'}`,8*MM,at(y(62)),6.5,true);
 frame(commands,85,y(22),26,43);text(commands,'DANFE',87*MM,at(y(30)),15,true);['Documento Auxiliar','da Nota Fiscal','Eletronica'].forEach((v,i)=>text(commands,v,87*MM,at(y(35+i*3)),6));text(commands,data.operationType==='0'?'0 - ENTRADA':'1 - SAIDA',89*MM,at(y(46)),7,true);text(commands,`N. ${String(data.number).padStart(9,'0')}`,87*MM,at(y(52)),8,true);text(commands,`SERIE ${String(data.series).padStart(3,'0')}`,90*MM,at(y(57)),7,true);text(commands,`FOLHA ${pageNumber}/${pageCount}`,90*MM,at(y(62)),6.5);
 frame(commands,111,y(22),94,43);commands.push(...barcodeCommands(data.accessKey,116*MM,at(y(37)),84*MM,10*MM));text(commands,'CHAVE DE ACESSO',113*MM,at(y(41)),5.5,true);text(commands,accessKeyMask(data.accessKey),113*MM,at(y(46)),6.4,true);text(commands,'Consulta de autenticidade no portal nacional da NF-e',115*MM,at(y(51)),5.8);text(commands,'www.nfe.fazenda.gov.br/portal ou no site da Sefaz autorizadora',113*MM,at(y(55)),5.4);text(commands,'PROTOCOLO DE AUTORIZACAO DE USO',113*MM,at(y(59)),5.5);text(commands,`${data.protocolNumber} - ${dateTime(data.protocolReceivedAt)}`,117*MM,at(y(63)),6.5,true);
 return at(y(65));
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
 commands.push('0 G 0 g 0.45 w');commonHeader(commands,data,pageNumber,pageCount,true);
 // Variable operation text expands vertically instead of truncating or covering the next section.
 const natureLines=fitLines(data.nature,120*MM-8,7.3,true);const natureHeight=Math.max(15,8+3.2*natureLines.length);const delta=natureHeight-15;
 labelCell(commands,'Natureza da operacao',data.nature,5,67,120,natureHeight,{bold:true,maxChars:82,maxLines:natureLines.length,size:7.3});labelCell(commands,'Inscricao estadual',data.issuer.stateRegistration,125,67,40,natureHeight);labelCell(commands,'IE do substituto tributario',data.issuer.substituteRegistration,165,67,40,natureHeight);
 const y=v=>v+delta;sectionBand(commands,'DESTINATARIO / REMETENTE',y(86));
 labelCell(commands,'Nome / razao social',data.recipient.name,5,y(91),116,13,{bold:true,maxLines:2});labelCell(commands,'CNPJ / CPF',documentMask(data.recipient.document),121,y(91),43,13);labelCell(commands,'Data da emissao',dateTime(data.issueDate),164,y(91),41,13,{size:7.2,maxChars:24});
 const address=`${data.recipient.address.street}, ${data.recipient.address.number}${data.recipient.address.complement?` - ${data.recipient.address.complement}`:''}`;
 labelCell(commands,'Endereco',address,5,y(104),101,13,{maxLines:2});labelCell(commands,'Bairro / distrito',data.recipient.address.district,106,y(104),58,13,{maxLines:2});labelCell(commands,'CEP',cepMask(data.recipient.address.cep),164,y(104),41,13);
 labelCell(commands,'Municipio',data.recipient.address.city,5,y(117),75,13);labelCell(commands,'UF',data.recipient.address.state,80,y(117),12,13);labelCell(commands,'Fone / fax',data.recipient.address.phone,92,y(117),42,13);labelCell(commands,'Inscricao estadual',data.recipient.stateRegistration,134,y(117),30,13);labelCell(commands,'Saida / entrada',dateTime(data.exitDate),164,y(117),41,13,{size:7.2,maxChars:24});
 sectionBand(commands,'CALCULO DO IMPOSTO',y(134));
 ['Base de calculo do ICMS','Valor do ICMS','Base de calculo do ICMS ST','Valor do ICMS ST','Valor total dos produtos'].forEach((label,i)=>labelCell(commands,label,money(data.totals[['vBC','vICMS','vBCST','vST','vProd'][i]]),5+i*40,y(139),40,12,{bold:i===4}));
 ['Valor do frete','Valor do seguro','Desconto','Outras despesas','Valor do IPI','Valor total da nota'].forEach((label,i)=>labelCell(commands,label,money(data.totals[['vFrete','vSeg','vDesc','vOutro','vIPI','vNF'][i]]),5+i*200/6,y(151),200/6,12,{bold:i===5}));
 sectionBand(commands,'TRANSPORTADOR / VOLUMES TRANSPORTADOS',y(167));const v=data.transport.volume[0]||{};
 [['Nome / razao social',data.transport.carrier,5,85],['Frete por conta',data.transport.freightMode==='9'?'9 - Sem transporte':data.transport.freightMode,90,50],['Placa / UF',[data.transport.vehiclePlate,data.transport.vehicleState].filter(Boolean).join('/'),140,25],['CNPJ / CPF',documentMask(data.transport.document),165,40]].forEach(([l,value,x,w])=>labelCell(commands,l,value,x,y(172),w,11,{size:7}));
 ['Quantidade','Especie','Marca','Numeracao','Peso bruto','Peso liquido'].forEach((label,i)=>labelCell(commands,label,[v.quantity,v.species,v.brand,v.numbering,v.grossWeight,v.netWeight][i],5+i*200/6,y(183),200/6,11));
 sectionBand(commands,'DADOS DOS PRODUTOS / SERVICOS',y(198));const bottom=drawItemTable(commands,items,at(y(203)),120);
 sectionBand(commands,'DADOS ADICIONAIS',(PAGE_HEIGHT-bottom+5)/MM);
 labeledValue(commands,'Informacoes complementares',additionalText(data)||'Sem informacoes complementares.',MARGIN,35,CONTENT_WIDTH*.675,Math.max(54,bottom-55),{maxChars:92,maxLines:5,size:6.2});labeledValue(commands,'Reservado ao fisco','-',MARGIN+CONTENT_WIDTH*.675,35,CONTENT_WIDTH*.325,Math.max(54,bottom-55),{maxChars:38,maxLines:5,size:6.2});
 if(sampleMode)text(commands,'AMOSTRA CONTROLADA - NAO REPRESENTA NF-e AUTORIZADA',MARGIN,18,7,true,'center',CONTENT_WIDTH);
}

function additionalText(data){return [data.additional.taxpayer,[data.transport.address,data.transport.city,data.transport.state,data.transport.stateRegistration,data.transport.rntc].some(Boolean)?`Transportador: ${[data.transport.address,data.transport.city,data.transport.state].filter(Boolean).join(', ')}${data.transport.stateRegistration?` - IE ${data.transport.stateRegistration}`:''}${data.transport.rntc?` - ANTT ${data.transport.rntc}`:''}`:'',data.additional.taxAuthority?`Informacoes ao fisco: ${data.additional.taxAuthority}`:''].filter(Boolean).join(' / ');}
function drawAdditionalPage(commands,data,lines,pageNumber,pageCount,sampleMode){commands.push('0 G 0 g 0.45 w');const bottom=commonHeader(commands,data,pageNumber,pageCount,false);text(commands,'DADOS ADICIONAIS - CONTINUACAO',MARGIN,bottom-14,8,true);let y=bottom-32;for(const line of lines){text(commands,line,MARGIN,y,8);y-=12;}if(sampleMode)text(commands,'AMOSTRA CONTROLADA - NAO REPRESENTA NF-e AUTORIZADA',MARGIN,18,7,true,'center',CONTENT_WIDTH);}

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

export function buildNfeDanfe({ processedXml, expectedAccessKey, expectedEnvironment, sampleMode = false } = {}) {
  const parsed = parseProcessedNfe(processedXml, expectedEnvironment);
  const errors = [...parsed.errors];
  if (expectedAccessKey && parsed.data.accessKey && digits(expectedAccessKey) !== parsed.data.accessKey) errors.push(error('AV-NFE-DANFE-EXPECTED-KEY', 'expectedAccessKey', 'O procNFe não corresponde à chave esperada.'));
  if (errors.length) return { valid: false, errors, pdf: new Uint8Array(), fileName: '', pageCount: 0, accessKey: parsed.data.accessKey || '', sampleMode: Boolean(sampleMode), xmlReturned: false };
  const natureHeight=Math.max(15,8+3.2*fitLines(parsed.data.nature,120*MM-8,7.3,true).length);
  const firstPageCapacity = Math.max(1,Math.min(5,Math.floor((at(203+natureHeight-15)-120-22)/27)));
  const continuationCapacity = 20;
  const chunks = [parsed.data.items.slice(0, firstPageCapacity)];
  for (let index = firstPageCapacity; index < parsed.data.items.length; index += continuationCapacity) chunks.push(parsed.data.items.slice(index, index + continuationCapacity));
  const extraLines=wrap(additionalText(parsed.data),92,10000);
  const extraChunks=[];if(extraLines.length>5)for(let i=0;i<extraLines.length;i+=52)extraChunks.push(extraLines.slice(i,i+52));
  const pageCount = chunks.length+extraChunks.length;
  const pageCommands = chunks.map((items, index) => {
    const commands = [];
    if (index === 0) drawFirstPage(commands, parsed.data, items, index + 1, pageCount, Boolean(sampleMode));
    else drawContinuationPage(commands, parsed.data, items, index + 1, pageCount, Boolean(sampleMode));
    return commands;
  });
  extraChunks.forEach((lines,index)=>{const commands=[];drawAdditionalPage(commands,parsed.data,lines,chunks.length+index+1,pageCount,Boolean(sampleMode));pageCommands.push(commands);});
  return { valid: true, errors: [], pdf: buildPdf(pageCommands), fileName: nfeDanfeFileName(parsed.data.accessKey), pageCount, accessKey: parsed.data.accessKey, protocolNumber: parsed.data.protocolNumber, environment: parsed.data.environment === '1' ? 'producao' : 'homologacao', sampleMode: Boolean(sampleMode), xmlReturned: false };
}
