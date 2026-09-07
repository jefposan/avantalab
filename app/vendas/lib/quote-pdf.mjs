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
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

export function quotePdfFileName(number) {
  return `${ascii(number || 'orcamento').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}.pdf`;
}

export function buildQuotePdf(quote) {
  const items = Array.isArray(quote.items) ? quote.items.slice(0, 12) : [];
  const company = quote.company || {};
  const companyName = company.name || 'Empresa emitente';
  const logoInitials = ascii(company.logoInitials || companyName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2) || 'EM').toLocaleUpperCase('pt-BR');
  const commands = [
    '0.00 0.24 0.45 rg',
    '48 766 44 44 re f',
    '1 1 1 rg',
    `BT /F1 16 Tf 59 782 Td (${pdfText(logoInitials)}) Tj ET`,
    '0.00 0.24 0.45 rg',
    `BT /F1 17 Tf 106 793 Td (${pdfText(companyName.slice(0, 42))}) Tj ET`,
    '0.36 0.43 0.50 rg',
    `BT /F1 8 Tf 106 777 Td (${pdfText(company.legalName || '')}) Tj ET`,
    `BT /F1 8 Tf 106 763 Td (${pdfText([company.document, company.city].filter(Boolean).join('  |  '))}) Tj ET`,
    '0.10 0.16 0.22 rg',
    `BT /F1 15 Tf 48 736 Td (${pdfText('ORCAMENTO COMERCIAL')}) Tj ET`,
    '0.36 0.43 0.50 rg',
    `BT /F1 9 Tf 48 717 Td (${pdfText(`Numero: ${quote.number}`)}) Tj ET`,
    `BT /F1 9 Tf 300 717 Td (${pdfText(`Validade: ${quote.validUntil || '-'}`)}) Tj ET`,
    '0.85 0.89 0.92 RG 0.8 w 48 702 m 547 702 l S',
    '0.10 0.16 0.22 rg',
    `BT /F1 11 Tf 48 678 Td (${pdfText('CLIENTE')}) Tj ET`,
    `BT /F1 10 Tf 48 659 Td (${pdfText(quote.client || 'Cliente nao definido')}) Tj ET`,
    '0.36 0.43 0.50 rg',
    `BT /F1 8 Tf 48 643 Td (${pdfText(quote.clientDocument || '')}) Tj ET`,
    `BT /F1 8 Tf 300 643 Td (${pdfText(quote.clientCity || '')}) Tj ET`,
    '0.95 0.97 0.98 rg 48 604 499 24 re f',
    '0.10 0.16 0.22 rg',
    `BT /F1 9 Tf 54 613 Td (${pdfText('ITEM')}) Tj ET`,
    `BT /F1 9 Tf 360 613 Td (${pdfText('QTD.')}) Tj ET`,
    `BT /F1 9 Tf 418 613 Td (${pdfText('UNITARIO')}) Tj ET`,
    `BT /F1 9 Tf 500 613 Td (${pdfText('TOTAL')}) Tj ET`,
  ];
  let y = 586;
  items.forEach((item) => {
    commands.push('0.10 0.16 0.22 rg');
    commands.push(`BT /F1 8 Tf 54 ${y} Td (${pdfText(`${item.sku || ''} ${item.name}`.slice(0, 52))}) Tj ET`);
    commands.push(`BT /F1 8 Tf 365 ${y} Td (${pdfText(String(item.quantity))}) Tj ET`);
    commands.push(`BT /F1 8 Tf 418 ${y} Td (${pdfText(brl(item.unitPrice))}) Tj ET`);
    commands.push(`BT /F1 8 Tf 500 ${y} Td (${pdfText(brl(Number(item.quantity) * Number(item.unitPrice)))}) Tj ET`);
    commands.push(`0.90 0.93 0.95 RG 0.5 w 48 ${y - 9} m 547 ${y - 9} l S`);
    y -= 28;
  });
  if (!items.length) commands.push(`BT /F1 9 Tf 54 ${y} Td (${pdfText('Itens nao informados no registro local.')}) Tj ET`);
  const totalsY = Math.max(180, y - 24);
  commands.push('0.36 0.43 0.50 rg');
  commands.push(`BT /F1 9 Tf 356 ${totalsY} Td (${pdfText('Subtotal')}) Tj ET`);
  commands.push(`BT /F1 9 Tf 484 ${totalsY} Td (${pdfText(brl(quote.subtotal))}) Tj ET`);
  commands.push(`BT /F1 9 Tf 356 ${totalsY - 18} Td (${pdfText('Desconto')}) Tj ET`);
  commands.push(`BT /F1 9 Tf 484 ${totalsY - 18} Td (${pdfText(brl(quote.discount))}) Tj ET`);
  commands.push(`BT /F1 9 Tf 356 ${totalsY - 36} Td (${pdfText('Frete')}) Tj ET`);
  commands.push(`BT /F1 9 Tf 484 ${totalsY - 36} Td (${pdfText(brl(quote.freight))}) Tj ET`);
  commands.push('0.00 0.24 0.45 rg');
  commands.push(`BT /F1 14 Tf 356 ${totalsY - 64} Td (${pdfText('TOTAL')}) Tj ET`);
  commands.push(`BT /F1 14 Tf 466 ${totalsY - 64} Td (${pdfText(brl(quote.total))}) Tj ET`);
  if (quote.notes) {
    commands.push('0.36 0.43 0.50 rg');
    commands.push(`BT /F1 8 Tf 48 116 Td (${pdfText(`Observacoes: ${quote.notes}`.slice(0, 100))}) Tj ET`);
  }
  commands.push('0.36 0.43 0.50 rg');
  commands.push(`BT /F1 8 Tf 48 78 Td (${pdfText('Proposta comercial demonstrativa. Valores e disponibilidade sujeitos a confirmacao.')}) Tj ET`);
  commands.push(`BT /F1 8 Tf 48 62 Td (${pdfText(`${companyName}${company.document ? ` - ${company.document}` : ''}`)}) Tj ET`);
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
