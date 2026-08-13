import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  KANBAN_ESTAVEL_HISTERESE,
  encontrarSlotKanbanEstavel,
  moverItemNaOrdem,
} from '../../app/lib/dnd.ts';

const slots = [
  { left: 0, top: 0, width: 100, height: 100 },
  { left: 120, top: 0, width: 100, height: 100 },
  { left: 240, top: 0, width: 100, height: 100 },
  { left: 0, top: 120, width: 100, height: 100 },
  { left: 120, top: 120, width: 100, height: 100 },
  { left: 240, top: 120, width: 100, height: 100 },
];

test('move o item uma única vez para o encaixe final', () => {
  assert.deepEqual(moverItemNaOrdem(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moverItemNaOrdem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('seleciona o encaixe pelo centro do card, inclusive em diagonal', () => {
  assert.equal(encontrarSlotKanbanEstavel({ ponto: { x: 289, y: 174 }, slots, indiceAtual: 0 }), 5);
  assert.equal(encontrarSlotKanbanEstavel({ ponto: { x: 169, y: 54 }, slots, indiceAtual: 4 }), 1);
});

test('mantém o encaixe atual quando a vantagem ainda está dentro da histerese', () => {
  const limiteEntrePrimeiros = { x: 110, y: 50 };
  assert.equal(KANBAN_ESTAVEL_HISTERESE, 0.07);
  assert.equal(encontrarSlotKanbanEstavel({
    ponto: limiteEntrePrimeiros,
    slots,
    indiceAtual: 0,
  }), 0);
});

test('troca de encaixe quando o movimento ultrapassa claramente a tolerância', () => {
  assert.equal(encontrarSlotKanbanEstavel({
    ponto: { x: 125, y: 50 },
    slots,
    indiceAtual: 0,
  }), 1);
});

test('retorna menos um quando não existem encaixes', () => {
  assert.equal(encontrarSlotKanbanEstavel({
    ponto: { x: 0, y: 0 },
    slots: [],
    indiceAtual: 0,
  }), -1);
});
