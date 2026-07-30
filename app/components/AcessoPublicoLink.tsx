'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

type ModoAcessoPublico = 'entrar' | 'cadastro';

type AcessoPublicoLinkProps = {
  modo: ModoAcessoPublico;
  children: ReactNode;
  className?: string;
  tabIndex?: number;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function deveAbrirGestaoMobile() {
  if (Capacitor.isNativePlatform()) return true;

  const agente = navigator.userAgent;
  const dispositivoMovel = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobi/i.test(agente);
  const iPadComIdentificacaoDeDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return dispositivoMovel || iPadComIdentificacaoDeDesktop;
}

/**
 * Mantém um único contrato de entrada para as páginas públicas:
 * Gestão Web no desktop e Gestão Mobile em aparelhos móveis/Capacitor.
 * O href para Gestão Web preserva navegação sem JavaScript e o clique no
 * cliente seleciona o destino específico do aparelho.
 */
export default function AcessoPublicoLink({ modo, children, className, tabIndex, onClick }: AcessoPublicoLinkProps) {
  const destinoWeb = `/gestao?${modo}=1`;

  const tratarClique = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!deveAbrirGestaoMobile()) return;

    event.preventDefault();
    window.location.assign(`/mobile?${modo}=1`);
  };

  return <Link href={destinoWeb} className={className} tabIndex={tabIndex} onClick={tratarClique}>{children}</Link>;
}
