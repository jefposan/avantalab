export type DateOrder = 'asc' | 'desc';

export function dateOrder(value: unknown): DateOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

/** Datas ausentes ficam no fim; o desempate evita saltos entre atualizações. */
export function sortSalesByDate<T extends { id: string; soldAt: string }>(sales: readonly T[], order: DateOrder): T[] {
  return [...sales].sort((a, b) => {
    const first = Date.parse(a.soldAt), second = Date.parse(b.soldAt);
    const firstValid = Number.isFinite(first), secondValid = Number.isFinite(second);
    if (firstValid !== secondValid) return firstValid ? -1 : 1;
    if (firstValid && first !== second) return (first - second) * (order === 'asc' ? 1 : -1);
    return a.id.localeCompare(b.id);
  });
}
