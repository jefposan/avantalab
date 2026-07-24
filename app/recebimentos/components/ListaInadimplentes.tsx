'use client';

import { useMemo } from 'react';
import type { Empresa, FormaPagamentoRecebimento, Recebimento, Subempresa } from './types';
import { dataLocalIso } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  podeBaixar: boolean;
  onBaixar: (id: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void> | void;
};

export default function ListaInadimplentes({ empresas, subempresas, recebimentos, podeBaixar, onBaixar }: Props) {
  const hojeIso = useMemo(() => dataLocalIso(), []);

  const inadimplentes = useMemo(
    () => recebimentos
      .filter((r) => r.vencimento < hojeIso && r.situacao === 'em_atraso' && r.valorRecebido == null)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [recebimentos, hojeIso],
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
    />
  );
}
