'use client';

import { useMemo } from 'react';
import type { Empresa, FormaPagamentoRecebimento, Recebimento, Subempresa } from './types';
import { cobrancasNosProximosDias, dataLocalIso } from './helpers';
import TabelaVencimentos from './TabelaVencimentos';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  podeBaixar: boolean;
  onBaixar: (id: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void> | void;
};

export default function ListaProximosVencimentos({ empresas, subempresas, recebimentos, podeBaixar, onBaixar }: Props) {
  const hojeIso = useMemo(() => dataLocalIso(), []);
  const proximos = useMemo(
    () => cobrancasNosProximosDias(recebimentos, hojeIso, 30),
    [recebimentos, hojeIso],
  );

  return (
    <TabelaVencimentos
      titulo="Próximo a vencer"
      descricao="Cobranças previstas para os próximos 30 dias."
      vazio="Nenhuma cobrança prevista para os próximos 30 dias."
      variante="proximo"
      hojeIso={hojeIso}
      empresas={empresas}
      subempresas={subempresas}
      recebimentos={proximos}
      podeBaixar={podeBaixar}
      onBaixar={onBaixar}
    />
  );
}
