/** A lista recebida já pertence ao perfil, ano e centro de custo autorizados. */
export type DespesaConferencia = {
  id: string | number;
  mes?: string;
  dia: string | number;
  despesa: string;
  descricao?: string | null;
  valor: number;
  status?: string | null;
};

export function despesasComMesmoValor<T extends DespesaConferencia>(
  lista: T[], valor: number, mes: string, ignorarId?: string | number,
): T[] {
  const centavos = Math.round(Number(valor) * 100);
  if (!Number.isFinite(centavos) || centavos <= 0) return [];
  return lista.filter((item) =>
    String(item.mes).toUpperCase() === mes.toUpperCase()
    && item.status !== 'cancelada'
    && (ignorarId === undefined || String(item.id) !== String(ignorarId))
    && Math.round(Number(item.valor) * 100) === centavos
  ).sort((a, b) => Number(a.dia) - Number(b.dia));
}

export function mensagemDespesasMesmoValor(lista: DespesaConferencia[], ano: number): string {
  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const detalhes = lista.map((item) => {
    const data = `${String(item.dia).padStart(2, '0')}/${String(meses.indexOf(String(item.mes).toUpperCase()) + 1).padStart(2, '0')}/${ano}`;
    const valor = Number(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `${data} · ${item.despesa}\n${item.descricao || 'Sem descrição'}\n${valor} · ${item.status === 'prevista' ? 'Prevista' : 'Confirmada'}`;
  });
  return `Já existe uma despesa com este valor neste período. Confira os registros encontrados:\n\n${detalhes.join('\n\n──────────\n\n')}\n\nDeseja salvar mesmo assim?`;
}
