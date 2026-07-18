'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './recebimentos.module.css';
import type { Empresa, Recebimento, Subempresa } from './components/types';
import {
  colaboradorAtualId,
  colaboradoresDemo,
  empresasDemo,
  EMPRESA_OPERADORA,
  recebimentosDemo,
  subempresasDemo,
} from './components/dadosDemo';
import { situacaoPorValor } from './components/helpers';
import PainelColaborador from './components/PainelColaborador';

// App autônomo do colaborador — alvo do PWA em /recebimentos/colaborador.
// Não tem seletor de perfil nem visão administrativa: é só a experiência de campo.
export default function ColaboradorApp() {
  const [empresas] = useState<Empresa[]>(empresasDemo);
  const [subempresas] = useState<Subempresa[]>(subempresasDemo);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>(recebimentosDemo);

  const colaborador = useMemo(
    () => colaboradoresDemo.find((c) => c.id === colaboradorAtualId) ?? colaboradoresDemo[0],
    [],
  );

  // Registra o service worker do PWA (instalação em tela inicial).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/recebimentos-sw.js?v=1', { scope: '/recebimentos/colaborador' })
      .catch(() => undefined);
  }, []);

  function registrarRecebimento(subempresaId: string, valorRecebido: number, observacao: string) {
    const sub = subempresas.find((s) => s.id === subempresaId);
    if (!sub) return;
    const agora = new Date();
    const venc = new Date(agora.getFullYear(), agora.getMonth(), sub.diaVencimento);
    const novo: Recebimento = {
      id: `r-${Date.now()}`,
      empresaId: sub.empresaId,
      subempresaId: sub.id,
      vencimento: venc.toISOString().slice(0, 10),
      valorCombinado: sub.valorCombinado,
      valorRecebido,
      colaboradorId: colaborador.id,
      recebidoEm: agora.toISOString(),
      observacao: observacao.trim() || null,
      situacao: situacaoPorValor(sub.valorCombinado, valorRecebido),
      baixadoPor: null,
      baixadoEm: null,
    };
    setRecebimentos((prev) => [novo, ...prev]);
  }

  // Baixa individual de uma parcela em atraso: o cliente pode ter várias
  // vencidas e pagar somente uma — apenas a selecionada é atualizada.
  function receberCobranca(recebimentoId: string, valorRecebido: number, observacao: string) {
    const agora = new Date();
    setRecebimentos((prev) =>
      prev.map((r) =>
        r.id === recebimentoId
          ? {
              ...r,
              valorRecebido,
              colaboradorId: colaborador.id,
              recebidoEm: agora.toISOString(),
              observacao: observacao.trim() || r.observacao,
              situacao: situacaoPorValor(r.valorCombinado, valorRecebido),
            }
          : r,
      ),
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandKicker}>Recebimentos em Campo</span>
            <span className={styles.brandTitle}>{EMPRESA_OPERADORA}</span>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        <PainelColaborador
          colaborador={colaborador}
          empresas={empresas}
          subempresas={subempresas}
          recebimentos={recebimentos}
          onRegistrar={registrarRecebimento}
          onReceberCobranca={receberCobranca}
        />
      </div>
    </div>
  );
}
