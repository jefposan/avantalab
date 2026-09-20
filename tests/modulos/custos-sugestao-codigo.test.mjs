import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sugerirCodigosEmpresa } from '../../app/custos/types.ts';

const item = (id, sku, categoria = '', marca = '', tipo_item = 'produto') => ({ id, sku, categoria, marca, tipo_item });

test('sugere a próxima sequência de cada família já usada pela empresa', () => {
  const sugestoes = sugerirCodigosEmpresa([
    item('1', 'T024', 'Escovas', 'Tridium'),
    item('2', 'T084', 'Shampoos', 'Tridium'),
    item('3', 'CX009', 'Caixas', 'Tridium'),
    item('4', 'N002', 'Notas', 'Tridium'),
  ], item('', '', 'Escovas', 'Tridium'));

  assert.deepEqual(sugestoes.map(({ codigo }) => codigo), ['T085', 'CX010', 'N003']);
  assert.equal(sugestoes[0].motivo, 'Categoria semelhante');
});

test('prioriza a família que a pessoa começou a digitar, sem preencher automaticamente', () => {
  const sugestoes = sugerirCodigosEmpresa([
    item('1', 'T024'),
    item('2', 'CX009'),
  ], item('', 'CX'));

  assert.equal(sugestoes[0].codigo, 'CX010');
  assert.equal(sugestoes[0].motivo, 'Família digitada');
});

test('empresa sem sequência reconhecida não recebe código inventado', () => {
  const sugestoes = sugerirCodigosEmpresa([item('1', 'SEM-SEQUENCIA')], item('', '', 'Escovas', 'Tridium'));
  assert.deepEqual(sugestoes, []);
});
