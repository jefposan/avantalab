'use client';

import React, { useEffect, useRef, useState } from 'react';

type DraggableModalCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export default function DraggableModalCard({ children, className = '', style, ...props }: DraggableModalCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ ativo: false, pointerId: 0, inicioX: 0, inicioY: 0, posX: 0, posY: 0 });
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });
  const [desktop, setDesktop] = useState(false);

  const limitar = (x: number, y: number) => {
    const card = cardRef.current;
    if (!card) return { x, y };
    const margem = 8;
    const rect = card.getBoundingClientRect();
    const baseLeft = rect.left - posicao.x;
    const baseTop = rect.top - posicao.y;
    const minX = margem - baseLeft;
    const maxX = Math.max(minX, window.innerWidth - margem - baseLeft - rect.width);
    const minY = margem - baseTop;
    const maxY = Math.max(minY, window.innerHeight - margem - baseTop - rect.height);
    return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
  };

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (pointer: fine)');
    const atualizar = () => {
      setDesktop(media.matches);
      if (!media.matches) setPosicao({ x: 0, y: 0 });
    };
    atualizar();
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);

  useEffect(() => {
    const ajustar = () => setPosicao((atual) => limitar(atual.x, atual.y));
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  });

  const iniciar = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!desktop || event.button !== 0) return;
    const alvo = event.target as HTMLElement;
    if (!alvo.closest('[data-modal-drag-handle]') || alvo.closest('button, input, select, textarea, a, label')) return;
    dragRef.current = { ativo: true, pointerId: event.pointerId, inicioX: event.clientX, inicioY: event.clientY, posX: posicao.x, posY: posicao.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const mover = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.ativo || dragRef.current.pointerId !== event.pointerId) return;
    setPosicao(limitar(dragRef.current.posX + event.clientX - dragRef.current.inicioX, dragRef.current.posY + event.clientY - dragRef.current.inicioY));
  };

  const terminar = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.ativo) return;
    dragRef.current.ativo = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={cardRef}
      className={`draggable-modal-card ${className}`}
      style={{ ...style, transform: desktop ? `translate3d(${posicao.x}px, ${posicao.y}px, 0)` : undefined }}
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={terminar}
      onPointerCancel={terminar}
      {...props}
    >
      {children}
    </div>
  );
}
