'use client';

import { useMemo, useState } from 'react';
import type { Empresa, FormaPagamentoRecebimento, Recebimento, Subempresa } from './types';
import { dataLocalIso } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';
import FiltroCompetencia from './FiltroCompetencia';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  podeBaixar: boolean;
  onBaixar: (id: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void> | void;
  portalBusca?: HTMLElement | null;
};

export default function ListaInadimplentes({ empresas, subempresas, recebimentos, podeBaixar, onBaixar, portalBusca }: Props) {
  const hojeIso = useMemo(() => dataLocalIso(), []);
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  });
  const [todosMeses, setTodosMeses] = useState(false);
  const chaveMes = `${mesReferencia.ano}-${String(mesReferencia.mes + 1).padStart(2, '0')}`;
  function mudarMes(delta: number) {
    setMesReferencia((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
    setTodosMeses(false);
  }

  const inadimplentes = useMemo(
    () => recebimentos
      .filter((r) => r.vencimento < hojeIso && r.situacao === 'em_atraso' && r.valorRecebido == null)
      .filter((recebimento) => todosMeses || recebimento.vencimento.slice(0, 7) === chaveMes)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [recebimentos, hojeIso, todosMeses, chaveMes],
  );

  return (
    <TabelaVencimentos
      titulo="Inadimplentes"
      descricao="Cobranças vencidas ainda não baixadas."
      vazio="Nenhuma cobrança em atraso."
      variante="inadimplente"
      hojeIso={hojeIso}
      empresas={empresas}
      subempresas={subempresas}
      recebimentos={inadimplentes}
      podeBaixar={podeBaixar}
      onBaixar={onBaixar}
      portalBusca={portalBusca}
      filtroCompetencia={<FiltroCompetencia referencia={mesReferencia} todos={todosMeses} onMudarMes={mudarMes} onMostrarTodos={() => setTodosMeses(true)} />}
    />
  );
}
