import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import QRCode from 'qrcode';
import { lotGenerationLabel, lotMoney, lotSource, lotTotals, lotUnits, type PriceLotDetail } from './price-lots';

export type PriceLotPdfMode = 'detailed' | 'summary';
type ImageLoader = (url: string) => Promise<Uint8Array | null>;
type PdfOptions = { mode?: PriceLotPdfMode; generatedAt?: Date };
const colors = {
  ink: rgb(.13, .18, .24), muted: rgb(.36, .41, .47), white: rgb(1, 1, 1),
  brand: rgb(0, 62 / 255, 115 / 255), minimum: rgb(.72, .12, .15),
  medium: rgb(.07, .33, .72), ideal: rgb(.04, .43, .25),
  rule: rgb(.84, .88, .91), light: rgb(.95, .97, .98),
};

/** A4 paisagem, margens de 5 mm e retrato salvo; resumido nunca carrega produtos/fotos. */
export async function createPriceLotPdf(detail: Pick<PriceLotDetail, 'lot' | 'items'>, loadImage?: ImageLoader, options: PdfOptions = {}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mode = options.mode ?? 'detailed';
  const generatedAt = options.generatedAt ?? new Date();
  if (!Number.isFinite(generatedAt.getTime())) throw new Error('Data de geração inválida.');
  const clean = (value: string) => Array.from(value.replace(/[\r\n\t]+/g, ' ')).map(char => {
    try { regular.encodeText(char); return char; } catch { return '?'; }
  }).join('');
  function lines(value: string, width: number, size: number, font = regular) {
    const result: string[] = []; let line = '';
    for (const word of clean(value).split(/\s+/)) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) { result.push(line); line = ''; }
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) { result.push(line); line = ''; }
        for (const char of word) {
          if (line && font.widthOfTextAtSize(line + char, size) > width) { result.push(line); line = ''; }
          line += char;
        }
      } else line += `${line ? ' ' : ''}${word}`;
    }
    if (line) result.push(line);
    return result;
  }
  const margin = 5 * 72 / 25.4;
  const width = PageSizes.A4[1], height = PageSizes.A4[0], innerWidth = width - 2 * margin;
  const rowHeight = 36, footerTop = margin + 12;
  const totals = lotTotals(detail.items, detail.lot.purchase_cost_cents);
  let page = pdf.addPage([width, height]), y = height - margin;
  function text(value: string, x: number, baseline: number, size = 9, font = regular, color = colors.ink, maxWidth?: number) {
    const content = clean(value);
    const fitted = maxWidth ? Math.min(size, size * maxWidth / Math.max(1, font.widthOfTextAtSize(content, size))) : size;
    page.drawText(content, { x, y: baseline, size: fitted, font, color });
  }
  function clippedLines(value: string, x: number, baseline: number, maxWidth: number, size: number, maxLines: number, font: PDFFont = regular) {
    const wrapped = lines(value, maxWidth, size, font);
    wrapped.slice(0, maxLines).forEach((line, index) => {
      if (index === maxLines - 1 && wrapped.length > maxLines) {
        while (line && font.widthOfTextAtSize(`${line}...`, size) > maxWidth) line = line.slice(0, -1);
        line += '...';
      }
      text(line, x, baseline - index * (size + 2), size, font);
    });
  }
  function reportHeader() {
    y = height - margin;
    page.drawRectangle({ x: margin, y: y - 42, width: innerWidth, height: 42, color: colors.brand });
    text(detail.lot.company_name, margin + 8, y - 16, 12, bold, colors.white, innerWidth - 16);
    const paid = detail.lot.purchase_cost_cents === null ? '' : ` | Valor pago: ${lotMoney(detail.lot.purchase_cost_cents)}`;
    text(`Gerado em ${lotGenerationLabel(generatedAt)} | ${lotUnits(totals.quantity)}${paid}`, margin + 8, y - 32, 9, regular, colors.white, innerWidth - 16);
    y -= 46;
    const cellWidth = innerWidth / 3;
    for (const [index, key] of (['minimum', 'medium', 'ideal'] as const).entries()) {
      const x = margin + index * cellWidth;
      page.drawRectangle({ x, y: y - 48, width: cellWidth - (index < 2 ? 3 : 0), height: 48, color: colors.light });
      text(`${totals.pending ? 'Subtotal' : 'Total'} ${['mínimo', 'médio', 'ideal'][index]}`, x + 8, y - 12, 9, bold, colors[key]);
      text(lotMoney(totals.sales[key]), x + 8, y - 28, 13, bold, colors[key], cellWidth - 16);
      text(`Lucro bruto: ${totals.difference ? lotMoney(totals.difference[key]) : totals.pending ? 'pendente' : '-'}`, x + 8, y - 41, 9, regular, colors.ink, cellWidth - 16);
    }
    y -= 52;
    if (totals.pending) { text(`${lotUnits(totals.pending)} sem preço | Totais parciais`, margin + 4, y - 8, 8, bold); y -= 15; }
  }
  const widths = [36, 225, 140, 30, 105, 92, 92, innerWidth - 720];
  const xs = widths.map((_, i) => margin + widths.slice(0, i).reduce((sum, n) => sum + n, 0));
  function tableHeader() {
    page.drawRectangle({ x: margin, y: y - 26, width: innerWidth, height: 26, color: colors.brand });
    text('Preços de venda (unitários)', xs[5] + 4, y - 9, 8, bold, colors.white);
    ['Foto', 'Descrição', 'Código lido / QR', 'Qtd.', 'Média / referência', 'Mínimo', 'Médio', 'Ideal'].forEach((label, i) => {
      text(label, xs[i] + 4, y - (i < 5 ? 17 : 21), 8, bold, colors.white, widths[i] - 8);
    });
    y -= 27;
  }
  pdf.setTitle(`Lote recebido - ${detail.lot.name} - ${mode === 'summary' ? 'Resumido' : 'Detalhado'}`);
  pdf.setAuthor(detail.lot.company_name);
  pdf.setCreationDate(generatedAt);
  reportHeader();
  if (mode === 'detailed') {
    if (detail.items.length) tableHeader();
    else text('Nenhum produto no lote.', margin + 4, y - 12, 9);
    const images = new Map<string, PDFImage | null>();
    const codes = new Map<string, PDFImage>();
    for (const item of detail.items) {
      if (y - rowHeight < footerTop) { page = pdf.addPage([width, height]); reportHeader(); tableHeader(); }
      const top = y;
      let image: PDFImage | null = null;
      if (item.image_url && loadImage) {
        if (!images.has(item.image_url)) {
          try {
            const bytes = await loadImage(item.image_url);
            images.set(item.image_url, bytes ? await pdf.embedPng(bytes).catch(() => pdf.embedJpg(bytes)) : null);
          } catch { images.set(item.image_url, null); }
        }
        image = images.get(item.image_url) || null;
      }
      if (image) {
        const fit = image.scaleToFit(28, 30);
        page.drawImage(image, { x: xs[0] + (36 - fit.width) / 2, y: top - 3 - fit.height, width: fit.width, height: fit.height });
      } else text('Sem foto', xs[0] + 3, top - 19, 6.5, regular, colors.muted);
      clippedLines(item.product_name || 'Aguardando identificação', xs[1] + 4, top - 11, widths[1] - 8, 8.5, 2, bold);
      if (item.product_description) clippedLines(item.product_description, xs[1] + 4, top - 31, widths[1] - 8, 6.5, 1);
      if (!codes.has(item.scanned_code)) codes.set(item.scanned_code, await pdf.embedPng(await QRCode.toDataURL(item.scanned_code, { width: 100, margin: 1 })));
      page.drawImage(codes.get(item.scanned_code)!, { x: xs[2] + 3, y: top - 30, width: 27, height: 27 });
      clippedLines(item.scanned_code, xs[2] + 34, top - 11, widths[2] - 38, 7.5, 3);
      text(String(item.quantity), xs[3] + 3, top - 15, 9, bold, colors.ink, widths[3] - 6);
      [item.market_price_cents, item.minimum_price_cents, item.medium_price_cents, item.ideal_price_cents].forEach((value, index) => {
        const color = index ? colors[(['minimum', 'medium', 'ideal'] as const)[index - 1]] : colors.ink;
        text(lotMoney(value), xs[4 + index] + 4, top - 15, 9, bold, color, widths[4 + index] - 8);
        if (index && value !== null && item.quantity > 1) text(`Total: ${lotMoney(value * item.quantity)}`, xs[4 + index] + 4, top - 28, 7, regular, color, widths[4 + index] - 8);
      });
      text(lotSource(item.reference_source), xs[4] + 4, top - 28, 7, regular, colors.muted, widths[4] - 8);
      y -= rowHeight;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: .4, color: colors.rule });
    }
  }
  pdf.getPages().forEach((current, i) => current.drawText(`${i + 1} / ${pdf.getPageCount()}`, { x: width - margin - 32, y: margin, size: 7, font: regular, color: colors.muted }));
  return pdf.save();
}

/** Rede de imagens fica no navegador, sem proxy de URL arbitrária com credenciais do servidor. */
export async function loadLotPhoto(url: string): Promise<Uint8Array | null> {
  try {
    if (!/^https:\/\//i.test(url)) return null;
    const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(6000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return null;
    const blob = await response.blob();
    if (blob.size > 5_000_000) return null;
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const output = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return output ? new Uint8Array(await output.arrayBuffer()) : null;
  } catch { return null; }
}
