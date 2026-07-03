import type { Modifier } from '@dnd-kit/core';

const MARGEM_JANELA = 8;

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
