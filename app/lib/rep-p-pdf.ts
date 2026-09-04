import 'server-only';

import { PDFPage, PDFFont, rgb } from 'pdf-lib';

function dataHoraBrasil(data: Date) {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Selo informativo para documentos REP-P já assinados no PDF.
 *
 * O texto deliberadamente não declara que a pessoa jurídica é a titular do
 * certificado: isso é demonstrado somente pela assinatura ICP-Brasil e pelo
 * validador oficial. Assim, o documento é claro sem expor nome ou CPF no
 * conteúdo visível.
 */
export function desenharSeloAssinaturaRepP(
  pagina: PDFPage,
  regular: PDFFont,
  negrito: PDFFont,
  emitidoEm: Date,
  posicao: { x: number; y: number; largura?: number },
) {
  const largura = posicao.largura ?? 410;
  const altura = 58;
  pagina.drawRectangle({
    x: posicao.x,
    y: posicao.y,
    width: largura,
    height: altura,
    color: rgb(0.95, 0.98, 1),
    borderColor: rgb(0.55, 0.76, 0.9),
    borderWidth: 0.8,
  });
  pagina.drawText('DOCUMENTO ELETRÔNICO', {
    x: posicao.x + 10,
    y: posicao.y + 40,
    size: 8,
    font: negrito,
    color: rgb(0, 0.24, 0.45),
  });
  pagina.drawText('Emitido pelo AvantaLab · assinatura digital ICP-Brasil incorporada ao PDF.', {
    x: posicao.x + 10,
    y: posicao.y + 26,
    size: 7.5,
    font: regular,
    color: rgb(0.16, 0.24, 0.34),
  });
  pagina.drawText(`Emissão: ${dataHoraBrasil(emitidoEm)} (horário de Brasília) · Validar: validar.iti.gov.br`, {
    x: posicao.x + 10,
    y: posicao.y + 12,
    size: 7,
    font: regular,
    color: rgb(0.25, 0.35, 0.46),
  });
}
