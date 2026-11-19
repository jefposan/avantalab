'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';

type PedidoCompartilhamento = {
  arquivos: File[];
  titulo?: string;
  tituloDialogo?: string;
  signal?: AbortSignal;
};
type CompartilhamentoPreparado = { compartilhar: () => Promise<boolean>; descartar: () => void };

declare global {
  interface Window {
    __avantavendasCompartilharArquivos?: (pedido: PedidoCompartilhamento) => Promise<boolean>;
    __avantavendasPrepararCompartilhamentoArquivos?: (pedido: PedidoCompartilhamento) => Promise<CompartilhamentoPreparado>;
    __avantavendasAbrirDownloadAndroid?: (url: string) => Promise<void>;
  }
}

function blobParaBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
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
}

function nomeSeguro(nome: string, indice: number) {
  const normalizado = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalizado || `material-${indice + 1}`;
}

export default function NativeShareBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let ativo = true;
    const pendentes = new Set<() => void>();
    const limpar = () => {
      ativo = false;
      delete window.__avantavendasCompartilharArquivos;
      delete window.__avantavendasPrepararCompartilhamentoArquivos;
      delete window.__avantavendasAbrirDownloadAndroid;
      pendentes.forEach(descartar => descartar());
    };

    // O pacote Android antigo já embute Browser, mas pode não embutir Share
    // e Filesystem. O navegador consegue baixar uma URL HTTPS com attachment;
    // um blob: criado dentro do WebView não pode ser entregue a ele.
    if (Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('Browser')) {
      window.__avantavendasAbrirDownloadAndroid = async (endereco) => {
        const url = new URL(endereco);
        if (!ativo || url.protocol !== 'https:' || url.username || url.password
          || !url.pathname.startsWith('/storage/v1/object/public/vendas-divulgacao/')
          || !url.searchParams.get('download')) {
          throw new Error('Não foi possível iniciar o download. Tente novamente.');
        }
        await Browser.open({ url: url.href });
      };
    }

    if (!Capacitor.isPluginAvailable('Filesystem') || !Capacitor.isPluginAvailable('Share')) {
      return limpar;
    }

    window.__avantavendasPrepararCompartilhamentoArquivos = async ({ arquivos, titulo, tituloDialogo, signal }) => {
      if (!ativo || !Array.isArray(arquivos) || !arquivos.length) {
        throw new Error('Não foi possível preparar o arquivo.');
      }

      const diretorio = `avanta-vendas-compartilhamento/${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const caminhos: string[] = [];
      const gravados: string[] = [];
      let descartado = false, utilizado = false, compartilhando = false;
      const descartar = () => {
        if (descartado) return;
        descartado = true; pendentes.delete(descartar);
        const apagar = () => { void Promise.all(gravados.map(path => Filesystem.deleteFile({ path, directory:Directory.Cache }).catch(() => undefined))); };
        // O destino pode continuar lendo os arquivos após a escolha no Sharesheet.
        if (utilizado) window.setTimeout(apagar,60_000); else apagar();
      };
      const conferir = () => { if (!ativo || signal?.aborted || descartado) throw new DOMException('Preparo cancelado.','AbortError'); };
      pendentes.add(descartar);
      try {
        for (const [indice, arquivo] of arquivos.entries()) {
          conferir();
          const caminho = `${diretorio}/${nomeSeguro(arquivo.name, indice)}`;
          const gravado = await Filesystem.writeFile({
            path: caminho,
            data: await blobParaBase64(arquivo),
            directory: Directory.Cache,
            recursive: true,
          });
          gravados.push(caminho);
          caminhos.push(gravado.uri);
          if (descartado) await Filesystem.deleteFile({path:caminho,directory:Directory.Cache}).catch(()=>undefined);
          conferir();
        }
        return { descartar, compartilhar: async () => {
          conferir();
          if (compartilhando) throw new Error('O compartilhamento já está aberto.');
          utilizado=true; compartilhando=true;
          try {
            // Nenhuma leitura, conversão ou gravação entre o novo toque e Share.share.
            await Share.share({title:titulo || 'Material AvantaLab',files: caminhos,dialogTitle:tituloDialogo || 'Compartilhar material'});
            return true;
          } finally { compartilhando=false; }
        } };
      } catch (erro) { descartar(); throw erro; }
    };

    // Mantém PDF/comprovantes e os consumidores antigos no contrato anterior.
    window.__avantavendasCompartilharArquivos = async pedido => {
      const preparado = await window.__avantavendasPrepararCompartilhamentoArquivos!(pedido);
      try { return await preparado.compartilhar(); } finally { preparado.descartar(); }
    };

    return limpar;
  }, []);

  return null;
}
