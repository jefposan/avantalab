import type { Ciclo, StatusAssinatura } from './cobranca';

export const STATUS_FATURA_PAGA = new Set([
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH',
]);

export const STATUS_FATURA_PAGAVEL = new Set(['PENDING', 'OVERDUE']);

type FaturaPeriodo = {
  dueDate?: string | null;
  status?: string | null;
};

function dataValida(valor: string | null | undefined) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function normalizarStatusTemporal(
  status: StatusAssinatura,
  trialFim: string | null,
  validoAte: string | null,
  agora = new Date(),
): StatusAssinatura {
  if (status === 'trial') {
    const fim = dataValida(trialFim);
    return !fim || fim <= agora ? 'expirada' : status;
  }
  if (status === 'cortesia' && validoAte) {
    const fim = dataValida(validoAte);
    return !fim || fim <= agora ? 'expirada' : status;
  }
  return status;
}

export function calcularFimCarencia(
  agora = new Date(),
  trialFim: string | null = null,
) {
  const carencia = new Date(agora);
  carencia.setDate(carencia.getDate() + 3);
  const fimTrial = dataValida(trialFim);
  return fimTrial && fimTrial > carencia ? fimTrial.toISOString() : carencia.toISOString();
}

export function calcularFimPeriodoPago(
  faturas: FaturaPeriodo[],
  ciclo: Ciclo | null | undefined,
  fallback: string | null | undefined,
  agora = new Date(),
) {
  const candidatos: Date[] = [];
  const fallbackData = dataValida(fallback);
  if (fallbackData) candidatos.push(fallbackData);

  for (const fatura of faturas) {
    if (!fatura.dueDate || !STATUS_FATURA_PAGA.has(String(fatura.status || ''))) continue;
    const inicio = new Date(`${fatura.dueDate}T23:59:59-03:00`);
    if (Number.isNaN(inicio.getTime())) continue;
    if (ciclo === 'anual') inicio.setFullYear(inicio.getFullYear() + 1);
    else inicio.setMonth(inicio.getMonth() + 1);
    candidatos.push(inicio);
  }

  const maisDistante = candidatos.sort((a, b) => b.getTime() - a.getTime())[0];
  return maisDistante && maisDistante > agora ? maisDistante.toISOString() : null;
}

export function assinaturaBloqueiaNovoCheckout(
  status: StatusAssinatura,
  validoAte: string | null,
  agora = new Date(),
) {
  if (status === 'ativa' || status === 'inadimplente') return true;
  if (status === 'cortesia') {
    const fim = dataValida(validoAte);
    return !validoAte || Boolean(fim && fim > agora);
  }
  if (status !== 'cancelada') return false;
  const fim = dataValida(validoAte);
  return Boolean(fim && fim > agora);
}
