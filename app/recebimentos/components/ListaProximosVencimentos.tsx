'use client';

import { useMemo } from 'react';
import type { Empresa, Recebimento, Subempresa } from './types';
import { dataLocalIso, proximasCobrancasPorEmpresa } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
};

export default function ListaProximosVencimentos({ empresas, subempresas, recebimentos }: Props) {
  const hojeIso = useMemo(() => dataLocalIso(), []);
  const proximos = useMemo(
    () => proximasCobrancasPorEmpresa(recebimentos, hojeIso),
    [recebimentos, hojeIso],
  );

  return (
    <TabelaVencimentos
      titulo="Próximo a vencer"
      descricao="Próxima cobrança prevista de cada empresa atendida."
      vazio="Nenhuma cobrança futura prevista."
      variante="proximo"
      hojeIso={hojeIso}
      empresas={empresas}
      subempresas={subempresas}
      recebimentos={proximos}
    />
  );
}
