/** Total confirmado da lista inteira, nunca o tamanho da página atual. */
export function panelCountText(total: number | null, loading = false, failed = false): string {
  if (loading && !failed && total == null) return '…';
  if (failed || total == null || !Number.isSafeInteger(total) || total < 0) return '—';
  return total.toLocaleString('pt-BR');
}
