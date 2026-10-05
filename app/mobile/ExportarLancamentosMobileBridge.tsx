'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  gerarLancamentosMesExcel,
  gerarLancamentosMesPdf,
  type ArquivoExportacaoLancamentosMes,
  type DadosExportacaoLancamentosMes,
} from '../lib/exportacao-lancamentos-mes';

type PedidoExportacao = DadosExportacaoLancamentosMes & { id: string; formato: 'excel' | 'pdf' };
type ResultadoEntrega = 'compartilhado' | 'download';

const blobParaBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const leitor = new FileReader();
  leitor.onerror = () => reject(leitor.error || new Error('Não foi possível preparar o arquivo.'));
  leitor.onload = () => {
    const resultado = String(leitor.result || '');
    const separador = resultado.indexOf(',');
    if (separador < 0) reject(new Error('Não foi possível preparar o arquivo.'));
    else resolve(resultado.slice(separador + 1));
  };
  leitor.readAsDataURL(blob);
});

const baixarNoNavegador = (arquivo: ArquivoExportacaoLancamentosMes) => {
  const url = URL.createObjectURL(arquivo.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo.nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const entregarArquivo = async (arquivo: ArquivoExportacaoLancamentosMes): Promise<ResultadoEntrega> => {
  const titulo = 'Relatório financeiro AvantaLab';
  if (
    Capacitor.isNativePlatform()
    && Capacitor.isPluginAvailable('Filesystem')
    && Capacitor.isPluginAvailable('Share')
  ) {
    const caminho = `relatorios/${arquivo.nome}`;
    const gravado = await Filesystem.writeFile({
      path: caminho,
      data: await blobParaBase64(arquivo.blob),
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({
        title: titulo,
        text: 'Relatório financeiro gerado no AvantaLab.',
        files: [gravado.uri],
        dialogTitle: 'Salvar ou compartilhar relatório',
      });
    } finally {
      window.setTimeout(() => {
        void Filesystem.deleteFile({ path: caminho, directory: Directory.Cache }).catch(() => undefined);
      }, 60_000);
    }
    return 'compartilhado';
  }

  const arquivoWeb = new File([arquivo.blob], arquivo.nome, { type: arquivo.tipo });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [arquivoWeb] }))) {
    await navigator.share({ title: titulo, files: [arquivoWeb] });
    return 'compartilhado';
  }
  baixarNoNavegador(arquivo);
  return 'download';
};

const compartilhamentoCancelado = (falha: unknown) => {
  if (falha instanceof DOMException && falha.name === 'AbortError') return true;
  const mensagem = falha instanceof Error ? falha.message : String(falha || '');
  return /cancel|canceled|cancelled|cancelado/i.test(mensagem);
};

export default function ExportarLancamentosMobileBridge() {
  useEffect(() => {
    const exportar = async (evento: Event) => {
      const pedido = (evento as CustomEvent<PedidoExportacao>).detail;
      if (!pedido?.id || !pedido.formato) return;
      try {
        const arquivo = pedido.formato === 'excel'
          ? await gerarLancamentosMesExcel(pedido)
          : await gerarLancamentosMesPdf(pedido);
        const entrega = await entregarArquivo(arquivo);
        window.dispatchEvent(new CustomEvent('avantalab:exportar-lancamentos-mes-resultado', { detail: { id: pedido.id, sucesso: true, entrega } }));
      } catch (falha) {
        const cancelado = compartilhamentoCancelado(falha);
        window.dispatchEvent(new CustomEvent('avantalab:exportar-lancamentos-mes-resultado', { detail: { id: pedido.id, sucesso: false, cancelado, mensagem: cancelado ? 'Compartilhamento cancelado.' : falha instanceof Error ? falha.message : 'Não foi possível gerar o arquivo.' } }));
      }
    };
    window.addEventListener('avantalab:exportar-lancamentos-mes', exportar);
    return () => window.removeEventListener('avantalab:exportar-lancamentos-mes', exportar);
  }, []);
  return null;
}
