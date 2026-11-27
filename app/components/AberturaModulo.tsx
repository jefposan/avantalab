'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MENSAGEM_MODULO_PRONTO } from '@/app/lib/navegacao-modulos';
import { apagarMarcadoresDePreparacao, PARAMETRO_PREPARACAO_ACESSO } from '@/app/lib/origem-preparacao';
import TransicaoNavegacaoInterna from './TransicaoNavegacaoInterna';

export function useAvisarModuloPronto(destino: string, empresaId: string | null | undefined, pronto: boolean) {
  useEffect(() => {
    if (!pronto || !empresaId || window.parent === window) return;
    window.parent.postMessage({ type: MENSAGEM_MODULO_PRONTO, destino, empresaId }, window.location.origin);
  }, [destino, empresaId, pronto]);
}

type Props = {
  modulo: string;
  titulo: string;
  empresaId: string;
  pronta: boolean;
  children: ReactNode;
};

/** Monta a primeira tela sem expor dados parciais. Atualizações seguintes ficam na própria seção. */
export default function AberturaModulo({ modulo, titulo, empresaId, pronta, children }: Props) {
  const [aberta, setAberta] = useState(pronta);
  useEffect(() => { if (pronta) setAberta(true); }, [pronta]);
  useAvisarModuloPronto(modulo, empresaId, aberta);
  useEffect(() => {
    if (aberta && window.parent === window) apagarMarcadoresDePreparacao(PARAMETRO_PREPARACAO_ACESSO);
  }, [aberta]);

  return <>
    {!aberta && <TransicaoNavegacaoInterna destino={titulo} />}
    <div className={aberta ? 'contents' : 'contents invisible'} inert={!aberta || undefined} aria-hidden={!aberta || undefined}
      data-av-modulo-pronto={aberta ? modulo : undefined} data-av-empresa-modulo={aberta ? empresaId : undefined}>
      {children}
    </div>
  </>;
}
