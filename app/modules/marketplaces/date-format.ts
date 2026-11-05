import { formatarDataISO } from '../../lib/formatters.ts';

export const marketplaceDateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
});
export const marketplaceDateLabel = (iso: string) => formatarDataISO(iso, true);
export function marketplaceDateTimeLabel(value: string | Date, fallback = 'Data não informada') {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? marketplaceDateTime.format(date) : fallback;
}
