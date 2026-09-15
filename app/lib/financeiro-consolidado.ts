export type EntradaParaConsolidacao = {
  mes: string;
  valor: number;
  status?: string | null;
};

/**
 * Soma as receitas efetivadas do perfil por mês. A lista recebida deve ser
 * buscada sem filtro de centro de custo para representar o consolidado.
 */
export function consolidarReceitasRealizadasPorMes(
  entradas: readonly EntradaParaConsolidacao[],
): Record<string, number> {
  return entradas.reduce<Record<string, number>>((totais, entrada) => {
    if (entrada.status === 'prevista') return totais;

    totais[entrada.mes] = (totais[entrada.mes] || 0) + Number(entrada.valor || 0);
    return totais;
  }, {});
}
