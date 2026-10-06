'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type PedidoCompartilhamento = {
  arquivos: File[];
  titulo?: string;
  tituloDialogo?: string;
};

declare global {
  interface Window {
    __avantavendasCompartilharArquivos?: (pedido: PedidoCompartilhamento) => Promise<boolean>;
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
    if (
      !Capacitor.isNativePlatform()
      || !Capacitor.isPluginAvailable('Filesystem')
      || !Capacitor.isPluginAvailable('Share')
    ) return;

    let ativo = true;
    window.__avantavendasCompartilharArquivos = async ({ arquivos, titulo, tituloDialogo }) => {
      if (!ativo || !Array.isArray(arquivos) || !arquivos.length) {
        throw new Error('Não foi possível preparar o arquivo.');
      }

      const diretorio = `avanta-vendas-compartilhamento/${Date.now()}`;
      const caminhos: string[] = [];
      try {
        for (const [indice, arquivo] of arquivos.entries()) {
          const caminho = `${diretorio}/${nomeSeguro(arquivo.name, indice)}`;
          const gravado = await Filesystem.writeFile({
            path: caminho,
            data: await blobParaBase64(arquivo),
            directory: Directory.Cache,
            recursive: true,
          });
          caminhos.push(gravado.uri);
        }
        await Share.share({
          title: titulo || 'Material AvantaLab',
          files: caminhos,
          dialogTitle: tituloDialogo || 'Compartilhar material',
        });
        return true;
      } finally {
        window.setTimeout(() => {
          void Promise.all(
            caminhos.map((_, indice) => Filesystem.deleteFile({
              path: `${diretorio}/${nomeSeguro(arquivos[indice]?.name || '', indice)}`,
              directory: Directory.Cache,
            }).catch(() => undefined)),
          );
        }, 60_000);
      }
    };

    return () => {
      ativo = false;
      delete window.__avantavendasCompartilharArquivos;
    };
  }, []);

  return null;
}
