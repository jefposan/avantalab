'use client';

import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { rolarParaSecaoPublica } from '../lib/rolagem-publica';

type LinkRolagemPublicaProps = ComponentPropsWithoutRef<'a'> & {
  href: `#${string}`;
};

export default function LinkRolagemPublica({ href, onClick, ...props }: LinkRolagemPublicaProps) {
  const aoClicar = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    rolarParaSecaoPublica(href);
  };

  return <a {...props} href={href} onClick={aoClicar} />;
}
