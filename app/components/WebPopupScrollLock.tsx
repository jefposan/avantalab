'use client';

import { useEffect } from 'react';

type EstilosAnteriores = {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyPaddingRight: string;
};

export default function WebPopupScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let bloqueado = false;
    let scrollYTravado = 0;
    let estilosAnteriores: EstilosAnteriores | null = null;

    const popupVisivel = () => {
      if (document.getElementById('mobile-root')) return false;

      return Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0')).some((elemento) => {
        const estilo = window.getComputedStyle(elemento);
        return estilo.display !== 'none' && estilo.visibility !== 'hidden';
      });
    };

    const bloquear = () => {
      if (bloqueado) return;
      bloqueado = true;
      scrollYTravado = window.scrollY;
      estilosAnteriores = {
        htmlOverflow: html.style.overflow,
        htmlOverscrollBehavior: html.style.overscrollBehavior,
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyLeft: body.style.left,
        bodyRight: body.style.right,
        bodyWidth: body.style.width,
        bodyOverflow: body.style.overflow,
        bodyOverscrollBehavior: body.style.overscrollBehavior,
        bodyPaddingRight: body.style.paddingRight,
      };

      const larguraBarraRolagem = Math.max(0, window.innerWidth - html.clientWidth);
      const paddingDireitoAtual = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      html.classList.add('av-popup-scroll-lock');
      html.style.overflow = 'hidden';
      html.style.overscrollBehavior = 'none';
      body.style.position = 'fixed';
      body.style.top = `-${scrollYTravado}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      if (larguraBarraRolagem > 0) body.style.paddingRight = `${paddingDireitoAtual + larguraBarraRolagem}px`;
    };

    const desbloquear = () => {
      if (!bloqueado || !estilosAnteriores) return;
      bloqueado = false;
      html.classList.remove('av-popup-scroll-lock');
      html.style.overflow = estilosAnteriores.htmlOverflow;
      html.style.overscrollBehavior = estilosAnteriores.htmlOverscrollBehavior;
      body.style.position = estilosAnteriores.bodyPosition;
      body.style.top = estilosAnteriores.bodyTop;
      body.style.left = estilosAnteriores.bodyLeft;
      body.style.right = estilosAnteriores.bodyRight;
      body.style.width = estilosAnteriores.bodyWidth;
      body.style.overflow = estilosAnteriores.bodyOverflow;
      body.style.overscrollBehavior = estilosAnteriores.bodyOverscrollBehavior;
      body.style.paddingRight = estilosAnteriores.bodyPaddingRight;
      window.scrollTo(0, scrollYTravado);
      estilosAnteriores = null;
    };

    const atualizar = () => {
      if (popupVisivel()) bloquear();
      else desbloquear();
    };

    const observer = new MutationObserver(atualizar);
    observer.observe(body, { childList: true, subtree: true });
    window.addEventListener('resize', atualizar);
    atualizar();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', atualizar);
      desbloquear();
    };
  }, []);

  return null;
}
