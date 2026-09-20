export type GatilhoDisparoProgramado = 'data_programada' | 'apos_cadastro' | 'sem_acesso';
export type UnidadeDisparoProgramado = 'horas' | 'dias' | 'semanas';

export type RegraDisparoProgramado = {
  gatilho: GatilhoDisparoProgramado;
  data_programada: string | null;
  intervalo_valor: number | null;
  intervalo_unidade: UnidadeDisparoProgramado | null;
};

export type AtividadeAplicativo = {
  primeiro_acesso_em: string;
  ultimo_acesso_em: string;
};

export function milissegundosDisparo(valor: number, unidade: UnidadeDisparoProgramado | null) {
  const hora = 60 * 60 * 1000;
  if (unidade === 'semanas') return valor * 7 * 24 * hora;
  if (unidade === 'dias') return valor * 24 * hora;
  return valor * hora;
}

export function referenciaDisparo(regra: RegraDisparoProgramado, atividade: AtividadeAplicativo) {
  if (regra.gatilho === 'data_programada') return String(regra.data_programada);
  if (regra.gatilho === 'apos_cadastro') return String(atividade.primeiro_acesso_em);
  return String(atividade.ultimo_acesso_em);
}

export function usuarioElegivelParaDisparo(regra: RegraDisparoProgramado, atividade: AtividadeAplicativo, agora: Date) {
  if (regra.gatilho === 'data_programada') {
    return Boolean(regra.data_programada && new Date(regra.data_programada) <= agora);
  }
  const base = regra.gatilho === 'apos_cadastro'
    ? atividade.primeiro_acesso_em
    : atividade.ultimo_acesso_em;
  if (!base || !regra.intervalo_valor || !regra.intervalo_unidade) return false;
  return new Date(base).getTime() + milissegundosDisparo(regra.intervalo_valor, regra.intervalo_unidade) <= agora.getTime();
}
