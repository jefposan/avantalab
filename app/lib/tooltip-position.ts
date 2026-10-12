/** Centro horizontal de tooltip com margem, sem cortar texto nas bordas. */
export function tooltipCenterWithinViewport(center: number, width: number, viewport: number) {
  const half = width / 2;
  return Math.max(8 + half, Math.min(center, viewport - 8 - half));
}
