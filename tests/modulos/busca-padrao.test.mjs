import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { correspondeBusca, normalizarTexto } from '../../app/lib/formatters.ts';

test('busca normaliza acentos, cedilha, caixa e espaços sem alterar o texto exibido', () => {
  assert.equal(normalizarTexto('  Válvula   Çentral  '), 'valvula central');
  assert.equal(correspondeBusca('Válvula Çentral', 'valvula c'), true);
  assert.equal(correspondeBusca('Válvula Çentral', 'VÁLVULA Ç'), true);
  assert.equal(correspondeBusca('Válvula Çentral', 'registro'), false);
});

test('campo oficial de busca só oferece limpeza enquanto há texto', () => {
  const campo = readFileSync('app/components/CampoBusca.tsx', 'utf8');
  const padrao = readFileSync('docs/padrao-avanta/componentes.md', 'utf8');
  assert.match(campo, /\{value && <button/);
  assert.match(campo, /aria-label=\{rotuloLimpar\}/);
  assert.match(padrao, /correspondeBusca/);
  assert.match(padrao, /CampoBusca\.tsx/);
});
