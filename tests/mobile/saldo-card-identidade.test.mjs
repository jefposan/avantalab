import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('saldo do mês usa o azul institucional AvantaLab', () => {
  const inicio = mobile.indexOf('function saldoTopoHtml(');
  const fim = mobile.indexOf('function caixinhaResumo(', inicio);
  const saldo = mobile.slice(inicio, fim);

  assert.match(saldo, /<section class="rounded-2xl p-4 text-white shadow-lg" style="background:#003E73">/);
  assert.doesNotMatch(saldo, /bg-slate-950/);
  assert.match(saldo, /text-emerald-300/);
  assert.match(saldo, /text-cyan-300/);
});
