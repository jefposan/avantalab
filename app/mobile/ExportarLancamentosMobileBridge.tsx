'use client';

import { useEffect } from 'react';
import {
  exportarLancamentosMesExcel,
  exportarLancamentosMesPdf,
  type DadosExportacaoLancamentosMes,
} from '../lib/exportacao-lancamentos-mes';

type PedidoExportacao = DadosExportacaoLancamentosMes & { id: string; formato: 'excel' | 'pdf' };

export default function ExportarLancamentosMobileBridge() {
  useEffect(() => {
    const exportar = async (evento: Event) => {
      const pedido = (evento as CustomEvent<PedidoExportacao>).detail;
      if (!pedido?.id || !pedido.formato) return;
      try {
        if (pedido.formato === 'excel') await exportarLancamentosMesExcel(pedido);
        else await exportarLancamentosMesPdf(pedido);
        window.dispatchEvent(new CustomEvent('avantalab:exportar-lancamentos-mes-resultado', { detail: { id: pedido.id, sucesso: true } }));
      } catch (falha) {
        window.dispatchEvent(new CustomEvent('avantalab:exportar-lancamentos-mes-resultado', { detail: { id: pedido.id, sucesso: false, mensagem: falha instanceof Error ? falha.message : 'Não foi possível gerar o arquivo.' } }));
      }
    };
    window.addEventListener('avantalab:exportar-lancamentos-mes', exportar);
    return () => window.removeEventListener('avantalab:exportar-lancamentos-mes', exportar);
  }, []);
  return null;
}
