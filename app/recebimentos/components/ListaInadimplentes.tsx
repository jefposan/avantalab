'use client';

import { useMemo } from 'react';
import type { Empresa, Recebimento, Subempresa } from './types';
import { dataLocalIso } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
};

export default function ListaInadimplentes({ empresas, subempresas, recebimentos }: Props) {
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
    />
  );
}
