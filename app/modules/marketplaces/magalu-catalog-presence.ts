import { objectValue } from './services/listing-model';

export type MagaluCatalogPresence = 'empty' | 'has_skus';

/** A primeira página de SKUs basta para presença; metadados opcionais não são exigidos. */
export function magaluCatalogPresence(value: unknown): MagaluCatalogPresence {
  const response = objectValue(value);
  const results = response.results;
  const meta = objectValue(response.meta);
  const page = objectValue(meta.page);
  const links = objectValue(meta.links);
  // Não impor ao catálogo o parser de pedidos: a API pode omitir metadados
  // de paginação, mas um array de resultados continua sendo inequívoco.
  if (Array.isArray(results) && results.length === 1 && results[0] && typeof results[0] === 'object' && !Array.isArray(results[0])) return 'has_skus';
  if (Array.isArray(results) && results.length > 1) throw new Error('magalu_catalog_page');
  const explicitlyContradictsEmpty = (page.offset !== undefined && page.offset !== 0)
    || (page.count !== undefined && page.count !== 0)
    || (page.total !== undefined && page.total !== 0)
    || (links.next !== undefined && links.next !== null && links.next !== '');
  if (explicitlyContradictsEmpty) throw new Error('magalu_catalog_page');
  if (Array.isArray(results) && results.length === 0) return 'empty';
  if (results === null && page.offset === 0 && (page.count === 0 || page.total === 0)) return 'empty';
  throw new Error('magalu_catalog_page');
}
