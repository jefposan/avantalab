import type { CicloComercial, PlanoEmpresarial } from './planos-comerciais';

const ORDEM_PLANOS: Record<PlanoEmpresarial, number> = {
  business: 1,
  business_pro: 2,
  business_premium: 3,
};

export type TipoAlteracaoAssinatura =
  | 'sem_alteracao'
  | 'upgrade_imediato'
  | 'alteracao_agendada';

export type AlteracaoAssinaturaAgendada = {
  plano: PlanoEmpresarial;
  ciclo: CicloComercial;
  efetivaEm: string;
};

export function ehPlanoEmpresarial(valor: unknown): valor is PlanoEmpresarial {
  return valor === 'business' || valor === 'business_pro' || valor === 'business_premium';
}

export function ehCicloComercial(valor: unknown): valor is CicloComercial {
  return valor === 'mensal' || valor === 'anual';
}

/**
 * Upgrades de nível são imediatos. Reduções de nível e qualquer mudança de
 * periodicidade ficam agendadas para o fim do período já pago.
 */
export function classificarAlteracaoAssinatura({
  planoAtual,
  cicloAtual,
  planoSolicitado,
  cicloSolicitado,
}: {
  planoAtual: PlanoEmpresarial;
  cicloAtual: CicloComercial;
  planoSolicitado: PlanoEmpresarial;
  cicloSolicitado: CicloComercial;
}): TipoAlteracaoAssinatura {
  if (planoAtual === planoSolicitado && cicloAtual === cicloSolicitado) return 'sem_alteracao';
  if (
    cicloAtual === cicloSolicitado
    && ORDEM_PLANOS[planoSolicitado] > ORDEM_PLANOS[planoAtual]
  ) return 'upgrade_imediato';
  return 'alteracao_agendada';
}

export function alteracaoAgendadaEstaVigente(
  alteracao: AlteracaoAssinaturaAgendada | null | undefined,
  agora = new Date(),
): boolean {
  if (!alteracao || !ehPlanoEmpresarial(alteracao.plano) || !ehCicloComercial(alteracao.ciclo)) return false;
  const efetivaEm = new Date(alteracao.efetivaEm);
  return !Number.isNaN(efetivaEm.getTime()) && efetivaEm > agora;
}

export function alteracaoAgendadaDeveSerAplicada(
  alteracao: AlteracaoAssinaturaAgendada | null | undefined,
  agora = new Date(),
): boolean {
  if (!alteracao || !ehPlanoEmpresarial(alteracao.plano) || !ehCicloComercial(alteracao.ciclo)) return false;
  const efetivaEm = new Date(alteracao.efetivaEm);
  return !Number.isNaN(efetivaEm.getTime()) && efetivaEm <= agora;
}

export function referenciaConferePlanoAtualOuAgendado({
  referencia,
  empresaId,
  planoAtual,
  cicloAtual,
  alteracaoAgendada,
}: {
  referencia: { empresaId: string; plano: string; ciclo: string };
  empresaId: string;
  planoAtual: string | null | undefined;
  cicloAtual: string | null | undefined;
  alteracaoAgendada?: AlteracaoAssinaturaAgendada | null;
}): boolean {
  if (referencia.empresaId !== empresaId) return false;
  const confereAtual = referencia.plano === planoAtual && referencia.ciclo === cicloAtual;
  if (confereAtual) return true;
  return Boolean(
    alteracaoAgendada
    && referencia.plano === alteracaoAgendada.plano
    && referencia.ciclo === alteracaoAgendada.ciclo,
  );
}
