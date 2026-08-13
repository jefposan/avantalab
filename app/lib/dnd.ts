import type { Modifier } from '@dnd-kit/core';

const MARGEM_JANELA = 8;

export const KANBAN_ESTAVEL_DURACAO_MS = 170;
export const KANBAN_ESTAVEL_CURVA = 'cubic-bezier(.2,.8,.2,1)';
export const KANBAN_ESTAVEL_HISTERESE = 0.07;

export type KanbanPonto = { x: number; y: number };
export type KanbanSlot = { left: number; top: number; width: number; height: number };

export function moverItemNaOrdem<T>(ordem: readonly T[], origemIndice: number, destinoIndice: number) {
  const proxima = [...ordem];
  if (
    origemIndice < 0
    || destinoIndice < 0
    || origemIndice >= proxima.length
    || destinoIndice >= proxima.length
    || origemIndice === destinoIndice
  ) return proxima;

  const [movido] = proxima.splice(origemIndice, 1);
  proxima.splice(destinoIndice, 0, movido);
  return proxima;
}

function distanciaDoCentro(ponto: KanbanPonto, slot: KanbanSlot) {
  return Math.hypot(
    ponto.x - (slot.left + slot.width / 2),
    ponto.y - (slot.top + slot.height / 2),
  );
}

export function encontrarSlotKanbanEstavel({
  ponto,
  slots,
  indiceAtual,
  histerese = KANBAN_ESTAVEL_HISTERESE,
}: {
  ponto: KanbanPonto;
  slots: readonly KanbanSlot[];
  indiceAtual: number;
  histerese?: number;
}) {
  if (!slots.length) return -1;

  let indiceMaisProximo = 0;
  let menorDistancia = Number.POSITIVE_INFINITY;
  slots.forEach((slot, indice) => {
    const distancia = distanciaDoCentro(ponto, slot);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      indiceMaisProximo = indice;
    }
  });

  if (indiceAtual < 0 || indiceAtual >= slots.length || indiceMaisProximo === indiceAtual) {
    return indiceMaisProximo;
  }

  const slotAtual = slots[indiceAtual];
  const distanciaAtual = distanciaDoCentro(ponto, slotAtual);
  const tolerancia = Math.min(slotAtual.width, slotAtual.height) * Math.max(0, histerese);
  return menorDistancia + tolerancia < distanciaAtual ? indiceMaisProximo : indiceAtual;
}

export const restringirArrasteAJanela: Modifier = ({
  transform,
  overlayNodeRect,
  draggingNodeRect,
  activeNodeRect,
  windowRect,
}) => {
  const rect = overlayNodeRect || draggingNodeRect || activeNodeRect;
  if (!rect || !windowRect) return transform;

  const minimoX = windowRect.left + MARGEM_JANELA - rect.left;
  const maximoX = windowRect.right - MARGEM_JANELA - rect.right;
  const minimoY = windowRect.top + MARGEM_JANELA - rect.top;
  const maximoY = windowRect.bottom - MARGEM_JANELA - rect.bottom;

  return {
    ...transform,
    x: minimoX > maximoX ? minimoX : Math.min(Math.max(transform.x, minimoX), maximoX),
    y: minimoY > maximoY ? minimoY : Math.min(Math.max(transform.y, minimoY), maximoY),
  };
};
