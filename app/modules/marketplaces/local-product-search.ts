import { normalizarTexto } from '../../lib/formatters.ts';
import { isValidEan } from './services/ean.ts';

export type ProductSearchRow = { id: string; name: string; sku: string; ean: string | null; description: string };

export function productMatchesSearch(product: ProductSearchRow, query: string) {
  const term = normalizarTexto(query);
  const text=normalizarTexto([product.name,product.description,product.sku,product.ean].filter(Boolean).join(' '));
  return !term || term.split(' ').every(part=>text.includes(part));
}

/** Pausa de leitura evita consultar prefixos; nenhum caminho depende de Enter. */
export const productSearchDelay = (query: string) => /^\d+$/.test(query) && isValidEan(query) ? 100 : 300;

/** Percorre projeções paginadas no servidor; nunca pesquisa só os 25 itens da tela. */
export async function findProductSearchIds(readPage: (offset: number) => Promise<ProductSearchRow[]>, query: string, signal?: AbortSignal) {
  const exact: string[] = [], matches: string[] = [];
  const seen = new Set<string>();
  let offset = 0;
  while (true) {
    signal?.throwIfAborted();
    const rows = await readPage(offset);
    signal?.throwIfAborted();
    if (!rows.length) break;
    let added = 0;
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id); added++;
      if (!productMatchesSearch(row, query)) continue;
      (row.ean === query.trim() ? exact : matches).push(row.id);
    }
    if (!added) throw new Error('A paginação da pesquisa não avançou.');
    offset += rows.length;
  }
  return [...exact, ...matches];
}
