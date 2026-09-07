function ascii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfText(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function brl(value) {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  const [integer, decimal] = Math.abs(amount).toFixed(2).split('.');
  return `${sign}R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal}`;
}

function numberBr(value) {
  return String(Number(value || 0)).replace('.', ',');
}

function ellipsis(value, limit) {
  const safe = ascii(value);
  return safe.length > limit ? `${safe.slice(0, Math.max(0, limit - 3)).trimEnd()}...` : safe;
}

function wrapWords(value, limit, maximumLines = 2) {
  const source = ascii(value);
  const words = source.split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= limit) { current = candidate; return; }
    if (current && lines.length < maximumLines) lines.push(current);
    current = word;
  });
  if (current && lines.length < maximumLines) lines.push(ellipsis(current, limit));
  if (words.length && lines.join(' ').length < source.length && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > limit - 3 ? `${last.slice(0, limit - 3).trimEnd()}...` : `${last}...`;
  }
  return lines;
}

function line(commands, label, value, x, y, width = 78) {
  commands.push('0.36 0.43 0.50 rg');
  commands.push(`BT /F1 7 Tf ${x} ${y} Td (${pdfText(label.toLocaleUpperCase('pt-BR'))}) Tj ET`);
  commands.push('0.10 0.16 0.22 rg');
  commands.push(`BT /F1 9 Tf ${x} ${y - 13} Td (${pdfText(String(value || '-').slice(0, width))}) Tj ET`);
}

export function serviceOrderPdfFileName(number) {
  return `${ascii(number || 'ordem-de-servico').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}.pdf`;
}

export function buildServiceOrderPdf(order) {
  const company = order.company || {};
  const companyName = company.name || 'Empresa emitente';
  const logoInitials = ascii(company.logoInitials || companyName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2) || 'EM').toLocaleUpperCase('pt-BR');
  const services = Array.isArray(order.services) ? order.services.slice(0, 8) : [];
  const materials = Array.isArray(order.materials) ? order.materials.slice(0, 7) : [];
  const checklist = Array.isArray(order.checklist) ? order.checklist.slice(0, 6) : [];
  const attachments = Array.isArray(order.attachments) ? order.attachments.slice(0, 5) : [];
  const commands = [
    '0.00 0.24 0.45 rg', '48 766 44 44 re f', '1 1 1 rg',
    `BT /F1 16 Tf 59 782 Td (${pdfText(logoInitials)}) Tj ET`,
    '0.00 0.24 0.45 rg',
    `BT /F1 17 Tf 106 793 Td (${pdfText(companyName.slice(0, 42))}) Tj ET`,
    '0.36 0.43 0.50 rg',
    `BT /F1 8 Tf 106 777 Td (${pdfText(ellipsis(company.legalName || '', 76))}) Tj ET`,
    `BT /F1 8 Tf 106 763 Td (${pdfText([company.document, company.city].filter(Boolean).join('  |  '))}) Tj ET`,
    '0.10 0.16 0.22 rg',
    `BT /F1 15 Tf 48 736 Td (${pdfText('ORDEM DE SERVICO')}) Tj ET`,
    '0.36 0.43 0.50 rg',
    `BT /F1 9 Tf 48 718 Td (${pdfText(`Numero: ${order.number}`)}) Tj ET`,
    `BT /F1 9 Tf 360 718 Td (${pdfText(`Situacao: ${order.status || '-'}`)}) Tj ET`,
    '0.85 0.89 0.92 RG 0.8 w 48 702 m 547 702 l S',
  ];
  line(commands, 'Cliente', order.client, 48, 684, 48);
  line(commands, 'Documento', order.clientDocument, 300, 684, 30);
  line(commands, 'Agenda', order.scheduled, 48, 645, 42);
  line(commands, 'Responsavel', order.technician, 220, 645, 28);
  line(commands, 'Local', order.location, 360, 645, 34);

  commands.push('0.95 0.97 0.98 rg 48 590 499 24 re f');
  commands.push('0.10 0.16 0.22 rg');
  commands.push(`BT /F1 9 Tf 54 599 Td (${pdfText('SERVICOS EXECUTADOS')}) Tj ET`);
  let y = 573;
  services.forEach((service) => {
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(ellipsis(`${service.sku || ''} ${service.name}`, 60))}) Tj ET`);
    commands.push(`BT /F1 8 Tf 390 ${y} Td (${pdfText(`${numberBr(service.quantity)} ${service.unit || ''}`)}) Tj ET`);
    commands.push(`BT /F1 8 Tf 476 ${y} Td (${pdfText(brl(Number(service.quantity) * Number(service.unitPrice)))}) Tj ET`);
    y -= 18;
  });
  if (!services.length) { commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText('Nenhum servico informado.')}) Tj ET`); y -= 18; }

  commands.push('0.95 0.97 0.98 rg');
  commands.push(`48 ${y - 12} 499 24 re f`);
  commands.push('0.10 0.16 0.22 rg');
  commands.push(`BT /F1 9 Tf 54 ${y - 3} Td (${pdfText('APONTAMENTO OPERACIONAL')}) Tj ET`);
  y -= 32;
  commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(`Tempo realizado: ${order.actualDuration || '-'}`)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 260 ${y} Td (${pdfText(`Inicio: ${order.startedAt || '-'}`)}) Tj ET`);
  y -= 17;
  wrapWords(`Relato: ${order.completionNotes || 'Nao informado'}`, 94, 2).forEach((text) => {
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(text)}) Tj ET`);
    y -= 12;
  });
  y -= 12;
  materials.forEach((material) => {
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(ellipsis(`Material: ${material.name} | ${numberBr(material.quantity)} ${material.unit} | ${material.source || 'Informativo'}`, 96))}) Tj ET`);
    y -= 15;
  });
  if (!materials.length) { commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText('Materiais: nenhum material informado.')}) Tj ET`); y -= 15; }
  checklist.forEach((item) => {
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(`[${item.complete ? 'X' : ' '}] ${item.label}`.slice(0, 105))}) Tj ET`);
    y -= 14;
  });
  if (attachments.length) {
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(ellipsis(`Anexos registrados: ${attachments.map((item) => item.name).join(', ')}`, 96))}) Tj ET`);
    y -= 15;
  }

  const acceptanceHeaderY = Math.max(112, y - 28);
  const acceptanceY = acceptanceHeaderY - 18;
  commands.push('0.95 0.97 0.98 rg');
  commands.push(`48 ${acceptanceHeaderY} 499 24 re f`);
  commands.push('0.10 0.16 0.22 rg');
  commands.push(`BT /F1 9 Tf 54 ${acceptanceHeaderY + 9} Td (${pdfText('ACEITE DO CLIENTE')}) Tj ET`);
  commands.push(`BT /F1 8 Tf 54 ${acceptanceY} Td (${pdfText(`Situacao: ${order.acceptanceStatus || 'Pendente'}`)}) Tj ET`);
  commands.push(`BT /F1 8 Tf 200 ${acceptanceY} Td (${pdfText(ellipsis(`Responsavel: ${order.acceptedBy || '-'}`, 48))}) Tj ET`);
  commands.push(`BT /F1 8 Tf 430 ${acceptanceY} Td (${pdfText(order.acceptedAt || '-')}) Tj ET`);
  commands.push(`BT /F1 8 Tf 54 ${acceptanceY - 17} Td (${pdfText(ellipsis(`Observacao: ${order.acceptanceNotes || 'Sem observacoes.'}`, 96))}) Tj ET`);
  commands.push('0.36 0.43 0.50 rg');
  commands.push(`BT /F1 7 Tf 48 42 Td (${pdfText('Documento operacional gerado localmente. Nao substitui documento fiscal ou assinatura eletronica certificada.')}) Tj ET`);

  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  const encoder = new TextEncoder();
  let pdf = '%PDF-1.4\n';
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
