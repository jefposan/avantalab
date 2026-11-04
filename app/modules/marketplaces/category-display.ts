export type CategoryDisplay = { id: string; name: string; path?: string };

/** Os identificadores permanecem internos; a interface usa nomes oficiais. */
export function categoryDisplay(id: string, fallback: string, detail: unknown): CategoryDisplay {
  const data = detail && typeof detail === 'object' ? detail as Record<string, unknown> : {};
  const readable = (value: unknown) => typeof value === 'string' && !/^MLB\d+$/i.test(value.trim()) ? value.trim().slice(0, 180) : '';
  const path = Array.isArray(data.path_from_root) ? data.path_from_root.slice(0, 20).map(row => readable(row && typeof row === 'object' ? (row as Record<string, unknown>).name : '')).filter(Boolean).join(' → ') : '';
  return { id, name: readable(data.name) || readable(fallback) || 'Categoria indisponível', ...(path ? { path } : {}) };
}
