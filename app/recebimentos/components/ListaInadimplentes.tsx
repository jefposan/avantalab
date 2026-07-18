'use client';

import { useMemo } from 'react';
import type { Empresa, Recebimento, Subempresa } from './types';
import { dataLocalIso, limitesDoMes } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';

type Props = {
  chaveMes: string;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
};

export default function ListaInadimplentes({ chaveMes, empresas, subempresas, recebimentos }: Props) {
  const hojeIso = useMemo(() => dataLocalIso(), []);

  const inadimplentes = useMemo(() => {
    const fim = limitesDoMes(chaveMes).fim;
    return recebimentos
      .filter((r) => {
        const vencido = r.vencimento < hojeIso && r.vencimento <= fim;
        return vencido && r.situacao === 'em_atraso' && r.valorRecebido == null;
      })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [recebimentos, chaveMes, hojeIso]);

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
    />
  );
}
