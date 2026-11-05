/** Só confirma a gravação quando o recibo transacional corresponde ao lote enviado. */
export function validarReciboImportacao(corpo: unknown, quantidade: number, loteChave: string) {
  const resposta = corpo as { erro?: unknown; resultado?: { total?: unknown; inseridos?: unknown; ignorados?: unknown; lote_chave?: unknown } } | null;
  const recibo = resposta?.resultado;
  if (resposta?.erro !== false || !recibo
    || recibo.total !== quantidade || recibo.lote_chave !== loteChave
    || typeof recibo.inseridos !== 'number' || !Number.isSafeInteger(recibo.inseridos) || recibo.inseridos < 0
    || typeof recibo.ignorados !== 'number' || !Number.isSafeInteger(recibo.ignorados) || recibo.ignorados < 0
    || recibo.inseridos + recibo.ignorados !== quantidade) {
    throw new Error('Não recebemos uma confirmação válida da gravação. Seus dados foram preservados; confira os lançamentos antes de tentar novamente.');
  }
  return { inseridos: recibo.inseridos, ignorados: recibo.ignorados };
}
