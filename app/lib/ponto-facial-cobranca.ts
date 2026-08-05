export const PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS = 1490;

export type StatusCobrancaFacial =
  | 'sem_assinatura'
  | 'pendente_pagamento'
  | 'ativa'
  | 'inadimplente'
  | 'cancelamento_programado'
  | 'cancelada'
  | 'suspensa';

export type EstadoCobrancaFacial = {
  status: StatusCobrancaFacial;
  quantidadeAtual: number;
  quantidadeProxima: number;
  valorUnitarioCentavos: number;
  valorMensalCentavos: number;
  proximoVencimento: string | null;
  validoAte: string | null;
  invoiceUrl: string | null;
  valorPendenteCentavos: number | null;
  vencimentoPendente: string | null;
  legadoSemCobranca: boolean;
};

export type ResumoAlteracaoFacial = {
  tipo: 'contratacao' | 'aumento' | 'reducao' | 'sem_alteracao';
  quantidadeAnterior: number;
  quantidadeNova: number;
  adicionados: number;
  removidos: number;
  valorAgoraCentavos: number;
  valorMensalCentavos: number;
  proximoVencimento: string | null;
  exigePagamento: boolean;
};

function dataUtc(data: string) {
  const partes = data.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(partes[0], Math.max(0, partes[1] - 1), partes[2], 12));
}

function vencimentoAnterior(data: Date) {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth();
  const dia = data.getUTCDate();
  const ultimoDiaMesAnterior = new Date(Date.UTC(ano, mes, 0, 12)).getUTCDate();
  return new Date(Date.UTC(ano, mes - 1, Math.min(dia, ultimoDiaMesAnterior), 12));
}

export function calcularProporcionalFacialCentavos(
  quantidadeAdicional: number,
  proximoVencimento: string | null,
  hoje = new Date(),
) {
  const quantidade = Math.max(0, Math.trunc(quantidadeAdicional));
  if (!quantidade) return 0;
  if (!proximoVencimento) return quantidade * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS;

  const proximo = dataUtc(proximoVencimento);
  const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 12));
  if (proximo <= hojeUtc) return quantidade * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS;

  const anterior = vencimentoAnterior(proximo);
  const diaMs = 24 * 60 * 60 * 1000;
  const diasCiclo = Math.max(1, Math.round((proximo.getTime() - anterior.getTime()) / diaMs));
  const diasRestantes = Math.max(1, Math.round((proximo.getTime() - hojeUtc.getTime()) / diaMs));
  return Math.max(1, Math.round(
    quantidade * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS * Math.min(1, diasRestantes / diasCiclo),
  ));
}

export function cobrancaFacialPermiteUso(
  assinatura: { status?: string; valido_ate?: string | null } | null | undefined,
  agora = new Date(),
) {
  if (!assinatura) return true; // compatibilidade segura para configurações anteriores à cobrança
  if (assinatura.status === 'ativa') return true;
  if (assinatura.status === 'inadimplente' || assinatura.status === 'cancelamento_programado') {
    return Boolean(assinatura.valido_ate && new Date(assinatura.valido_ate) > agora);
  }
  return false;
}

export function formatarCentavos(valor: number | null | undefined) {
  return ((Number(valor) || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
