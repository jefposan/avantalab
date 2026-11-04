/** Opens the browser dialog for the original PDF, never a resized canvas. */
export function printLabelPdf(target: Pick<Window,'focus'|'print'> | null) {
  if (!target || typeof target.print !== 'function') throw new Error('Abra o PDF em outra guia para imprimir neste navegador.');
  target.focus();
  target.print();
}
