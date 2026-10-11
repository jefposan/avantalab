'use client';

import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode, type PointerEvent, type KeyboardEvent } from 'react';
import { encontrarSlotKanbanEstavel, moverItemNaOrdem, posicoesVerticaisKanbanEstavel, KANBAN_ESTAVEL_CURVA, KANBAN_ESTAVEL_DURACAO_MS, type KanbanSlot } from '@/app/lib/dnd';
import styles from './AvantaKanban.module.css';
import Tooltip from './Tooltip';

type Item = { id: string; title: string; render: (handle: ReactNode) => ReactNode };
type Drag = {
  id: string; pointerId: number; handle: HTMLButtonElement; nodes: HTMLElement[];
  slots: KanbanSlot[]; order: string[]; origin: number; destination: number;
  startX: number; startY: number; x: number; y: number; scrollY: number;
  overlay: HTMLElement | null; frame: number; timer: number; ending: boolean;
};
const transition = `transform ${KANBAN_ESTAVEL_DURACAO_MS}ms ${KANBAN_ESTAVEL_CURVA}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vertical stable slots: only transforms during a gesture; commit once on drop. */
export default function AvantaKanban({ items, order, onOrderChange, disabled = false, className = '' }: {
  items: Item[]; order: string[]; onOrderChange: (order: string[]) => void; disabled?: boolean; className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const instructions = useId();
  const [announcement, announce] = useState('');

  function clear(current: Drag) {
    current.ending = true;
    if (drag.current === current) drag.current = null;
    cancelAnimationFrame(current.frame);
    clearTimeout(current.timer);
    current.overlay?.remove();
    current.nodes.forEach((node) => {
      node.style.removeProperty('transform'); node.style.removeProperty('transition'); node.style.removeProperty('opacity');
    });
    if (current.handle.hasPointerCapture(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
  }

  // Geometry comes from the initial snapshot, including unequal panel heights.
  function positions(current: Drag, destination: number) {
    return posicoesVerticaisKanbanEstavel(current.slots, current.origin, destination)
      .map((position) => ({ ...position, id: current.order[position.index] }));
  }

  function finish(cancelled: boolean) {
    const current = drag.current;
    if (!current || current.ending) return;
    current.ending = true;
    cancelAnimationFrame(current.frame);
    const destination = cancelled ? current.origin : current.destination;
    const targets = positions(current, destination);
    current.nodes.forEach((node, index) => {
      node.style.transition = reducedMotion() ? 'none' : transition;
      node.style.transform = `translateY(${targets.find((target) => target.index === index)!.top - current.slots[index].top}px)`;
    });
    if (current.overlay) {
      const slot = current.slots[current.origin];
      current.overlay.style.transition = reducedMotion() ? 'none' : transition;
      current.overlay.style.transform = `translate3d(${slot.left}px,${targets.find((target) => target.id === current.id)!.top - window.scrollY}px,0) scale(1)`;
    }
    current.timer = window.setTimeout(() => {
      clear(current);
      if (!cancelled && destination !== current.origin) {
        onOrderChange(moverItemNaOrdem(current.order, current.origin, destination));
        announce(`${items.find((item) => item.id === current.id)?.title}: posição ${destination + 1} de ${items.length}.`);
      } else if (cancelled) announce('Organização cancelada. Ordem mantida.');
      requestAnimationFrame(() => current.handle.isConnected && current.handle.focus({ preventScroll: true }));
    }, !current.overlay || reducedMotion() ? 0 : KANBAN_ESTAVEL_DURACAO_MS);
  }

  const cancelDrag = useEffectEvent(() => finish(true));
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); cancelDrag(); }
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('resize', cancelDrag);
    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', cancelDrag);
      window.removeEventListener('resize', cancelDrag);
      if (drag.current) clear(drag.current);
    };
  }, []);

  function paint(current: Drag) {
    if (current.ending || !current.overlay) return;
    const slot = current.slots[current.origin];
    const left = slot.left + current.x - current.startX;
    const top = slot.top - current.scrollY + current.y - current.startY;
    current.overlay.style.transform = `translate3d(${left}px,${top}px,0) scale(1.035)`;
    current.destination = encontrarSlotKanbanEstavel({
      ponto: { x: left + slot.width / 2, y: top + window.scrollY + slot.height / 2 },
      slots: current.slots, indiceAtual: current.destination,
    });
    positions(current, current.destination).forEach(({ id, index, top: targetTop }) => {
      if (id === current.id) return;
      current.nodes[index].style.transition = reducedMotion() ? 'none' : transition;
      current.nodes[index].style.transform = `translateY(${targetTop - current.slots[index].top}px)`;
    });
  }

  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (disabled || drag.current || event.button !== 0 || !root.current) return;
    event.preventDefault();
    const nodes = Array.from(root.current.children).filter((node): node is HTMLElement => node instanceof HTMLElement && !!node.dataset.avantaKanbanItem);
    const slots = nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top + window.scrollY, width: rect.width, height: rect.height };
    });
    drag.current = { id, pointerId: event.pointerId, handle: event.currentTarget, nodes, slots, order: [...order],
      origin: order.indexOf(id), destination: order.indexOf(id), startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, scrollY: window.scrollY, overlay: null, frame: 0, timer: 0, ending: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.ending || event.pointerId !== current.pointerId) return;
    current.x = event.clientX; current.y = event.clientY;
    if (!current.overlay) {
      if (Math.hypot(current.x - current.startX, current.y - current.startY) < 6) return;
      const original = current.nodes[current.origin];
      const clone = original.cloneNode(true) as HTMLElement;
      const fields = original.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
      clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select').forEach((field, index) => {
        const source = fields[index];
        if (!(field instanceof HTMLInputElement && field.type === 'file')) field.value = source.value;
        if (field instanceof HTMLInputElement && source instanceof HTMLInputElement) field.checked = source.checked;
      });
      clone.removeAttribute('data-avanta-kanban-item');
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
      clone.setAttribute('aria-hidden', 'true'); clone.inert = true;
      clone.classList.add(styles.overlay);
      clone.style.width = `${current.slots[current.origin].width}px`;
      root.current!.appendChild(clone);
      current.overlay = clone; original.style.opacity = '0';
      const tick = () => {
        if (current.ending) return;
        const edge = 56;
        const delta = current.y < edge ? -12 : current.y > window.innerHeight - edge ? 12 : 0;
        if (delta) window.scrollBy(0, delta);
        paint(current);
        current.frame = requestAnimationFrame(tick);
      };
      current.frame = requestAnimationFrame(tick);
    }
    paint(current);
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (disabled || drag.current) return;
    const index = order.indexOf(id);
    const destination = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? index - 1
      : event.key === 'ArrowDown' || event.key === 'ArrowRight' ? index + 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : null;
    if (destination === null) return;
    event.preventDefault();
    if (destination < 0 || destination >= order.length || destination === index) return;
    const handle = event.currentTarget;
    onOrderChange(moverItemNaOrdem(order, index, destination));
    announce(`${items.find((item) => item.id === id)?.title}: posição ${destination + 1} de ${items.length}.`);
    requestAnimationFrame(() => handle.focus({ preventScroll: true }));
  }

  return <div ref={root} className={`${styles.board} ${className}`} aria-label="Organizar blocos">
    <p id={instructions} className={styles.srOnly}>Arraste pelos seis pontos para organizar os blocos. Pelo teclado, use as setas, Início ou Fim. Escape cancela o arraste. Recolher os blocos facilita a organização.</p>
    <span role="status" aria-live="polite" className={styles.srOnly}>{announcement}</span>
    {order.map((id) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return null;
      const handle = <Tooltip texto="segure arraste para mudar a ordem"><button type="button" className={styles.handle} disabled={disabled} data-avanta-kanban-handle=""
        aria-label={`Mover bloco ${item.title}`} aria-roledescription="item reordenável"
        aria-describedby={instructions} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home End Escape"
        onPointerDown={(event) => start(event, id)} onPointerMove={move} onPointerUp={() => finish(false)}
        onPointerCancel={() => finish(true)} onLostPointerCapture={() => finish(true)} onKeyDown={(event) => keyboard(event, id)}>
        <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true" fill="currentColor">{[6, 12, 18].map((y) => <g key={y}><circle cx="5" cy={y} r="1.8"/><circle cx="13" cy={y} r="1.8"/></g>)}</svg>
      </button></Tooltip>;
      return <div key={id} className={styles.item} data-avanta-kanban-item={id}>{item.render(handle)}</div>;
    })}
  </div>;
}
