import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
  type EstadoCobrancaFacial,
} from './ponto-facial-cobranca';

export type RegistroAssinaturaFacial = {
  id: string;
  empresa_id: string;
  status: 'pendente_pagamento' | 'ativa' | 'inadimplente' | 'cancelamento_programado' | 'cancelada' | 'suspensa';
  quantidade_atual: number;
  quantidade_proxima: number;
  valor_unitario_centavos: number;
  valor_mensal_centavos: number;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  proximo_vencimento: string | null;
  valido_ate: string | null;
  desativacao_imediata: boolean;
};

export async function buscarAssinaturaFacial(db: SupabaseClient, empresaId: string) {
  const { data } = await db.from('ponto_facial_assinaturas')
    .select('id, empresa_id, status, quantidade_atual, quantidade_proxima, valor_unitario_centavos, valor_mensal_centavos, gateway_customer_id, gateway_subscription_id, proximo_vencimento, valido_ate, desativacao_imediata')
    .eq('empresa_id', empresaId).maybeSingle();
  return (data || null) as RegistroAssinaturaFacial | null;
}

export async function montarEstadoCobrancaFacial(db: SupabaseClient, empresaId: string): Promise<EstadoCobrancaFacial> {
  const assinatura = await buscarAssinaturaFacial(db, empresaId);
  if (!assinatura) {
    const { count } = await db.from('ponto_facial_funcionarios')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .neq('status', 'removido');
    return {
      status: 'sem_assinatura', quantidadeAtual: Number(count || 0), quantidadeProxima: Number(count || 0),
      valorUnitarioCentavos: PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
      valorMensalCentavos: Number(count || 0) * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
      proximoVencimento: null, validoAte: null, invoiceUrl: null,
      valorPendenteCentavos: null, vencimentoPendente: null,
      legadoSemCobranca: Number(count || 0) > 0,
    };
  }

  const { data: faturas } = await db.from('ponto_facial_faturas')
    .select('invoice_url, valor_centavos, vencimento, status, atualizado_em')
    .eq('empresa_id', empresaId)
    .in('status', ['PENDING', 'OVERDUE'])
    .order('atualizado_em', { ascending: false })
    .limit(1);
  const pendente = faturas?.[0] || null;

  return {
    status: assinatura.status,
    quantidadeAtual: Number(assinatura.quantidade_atual || 0),
    quantidadeProxima: Number(assinatura.quantidade_proxima || 0),
    valorUnitarioCentavos: Number(assinatura.valor_unitario_centavos || PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS),
    valorMensalCentavos: Number(assinatura.valor_mensal_centavos || 0),
    proximoVencimento: assinatura.proximo_vencimento,
    validoAte: assinatura.valido_ate,
    invoiceUrl: pendente?.invoice_url || null,
    valorPendenteCentavos: pendente ? Number(pendente.valor_centavos || 0) : null,
    vencimentoPendente: pendente?.vencimento || null,
    legadoSemCobranca: false,
  };
}

export function somarUmMesData(dataIso: string) {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-').map(Number);
  const ultimoDiaDestino = new Date(Date.UTC(ano, mes + 1, 0, 12)).getUTCDate();
  const data = new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDiaDestino), 12));
  return data.toISOString().slice(0, 10);
}

export function fimDoPeriodoPago(vencimento: string) {
  return new Date(`${somarUmMesData(vencimento)}T00:00:00-03:00`).toISOString();
}

export function fimDaCarencia(vencimento?: string | null) {
  const base = vencimento ? new Date(`${vencimento}T00:00:00-03:00`) : new Date();
  base.setDate(base.getDate() + 3);
  return base.toISOString();
}
