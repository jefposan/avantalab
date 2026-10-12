import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tooltipCenterWithinViewport } from '../../app/lib/tooltip-position.ts';

test('tooltip preserva centro quando cabe e limita somente bordas com margem de 8px', () => {
  assert.equal(tooltipCenterWithinViewport(500, 160, 1000), 500);
  assert.equal(tooltipCenterWithinViewport(25, 160, 1000), 88);
  assert.equal(tooltipCenterWithinViewport(975, 160, 1000), 912);
  for (const viewport of [320, 390, 1024, 1470]) for (const center of [20, viewport / 2, viewport - 20]) {
    const width = Math.min(280, viewport - 16);
    const x = tooltipCenterWithinViewport(center, width, viewport);
    assert.ok(x - width / 2 >= 8);
    assert.ok(x + width / 2 <= viewport - 8);
  }
});
test('largura do conteúdo aplica-se só ao tooltip inferior, com limite responsivo sem nowrap forçado', () => {
  const source = readFileSync(new URL('../../app/components/Tooltip.tsx', import.meta.url), 'utf8');
  assert.match(source, /posicao === 'bottom'\) element.style.left =.*tooltipCenterWithinViewport/);
  assert.match(source, /posicao === 'bottom' \? \{ width: 'max-content', maxWidth: 'min\(280px, calc\(100vw - 16px\)\)' \} : \{\}/);
  assert.match(source, /role="tooltip"/);
  assert.doesNotMatch(source, /whiteSpace: 'nowrap'/);
});
