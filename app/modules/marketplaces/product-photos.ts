/** Fotos retornadas pela ficha do ML; nunca construir URLs a partir de IDs. */
export function mercadoLivrePictures(value: Record<string, unknown>): string[] {
  const candidates = (Array.isArray(value.pictures) ? value.pictures.slice(0, 12) : []).flatMap(raw => {
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return [row.secure_url, row.url];
  });
  const pictures = validProductPictures(candidates, true);
  return pictures.length ? pictures : validProductPictures([value.secure_thumbnail, value.thumbnail], true);
}

export function validProductPictures(value: unknown, mercadoLivre = false): string[] {
  const result: string[] = [];
  for (const raw of Array.isArray(value) ? value.slice(0, 24) : []) {
    if (typeof raw !== 'string' || raw.length > 2048) continue;
    try {
      const url = new URL(raw);
      const mlHost = url.hostname === 'mlstatic.com' || url.hostname.endsWith('.mlstatic.com');
      if (mercadoLivre && mlHost && url.protocol === 'http:') url.protocol = 'https:';
      if (url.protocol !== 'https:' || url.username || url.password || (mercadoLivre && !mlHost)) continue;
      url.hash = '';
      const picture = url.toString();
      if (!result.includes(picture)) result.push(picture);
      if (result.length === 12) break;
    } catch { /* Uma foto inválida não elimina as demais. */ }
  }
  return result;
}
