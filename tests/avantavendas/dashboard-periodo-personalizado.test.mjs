import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['isoData', 'limitesDoMes', 'aplicarPeriodoCompletoMesSelecionado', 'aplicarFiltroDashboard', 'selecionarDataCalendario', 'fecharCalendarioCentralizado', 'mudarMes', 'irMesAtual'];
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(ast)).join('\n');
function contexto() {
  const fields = { filtroInicio: { value: '2026-11-01' }, filtroFim: { value: '2026-11-30' } };
  const ctx = vm.createContext({
    state: { filtroInicio: '2026-11-01', filtroFim: '2026-11-30', mesReferencia: '2026-11-01' },
    HOJE: new Date(), calendarioCentralizado: null, pedidoClienteRascunho: null,
    document: { getElementById: id => fields[id] },
    calendarioBloqueiaDatasFuturas: () => false, dataBR: x => x.slice(0,10).split('-').reverse().join('/'),
    render() { ctx.renders++; }, salvarEstado() { ctx.saves++; }, toast(m) { ctx.erro = m; }, renders: 0, saves: 0,
  });
  vm.runInContext(code, ctx);
  return { ctx, fields };
}
test('calendário mantém dias escolhidos no campo; Filtrar aplica exatamente o intervalo', () => {
  const { ctx, fields } = contexto();
  ctx.calendarioCentralizado = { idCampo: 'filtroInicio' };
  ctx.selecionarDataCalendario('2026-11-14');
  assert.equal(fields.filtroInicio.value, '2026-11-14');
  assert.equal(fields.filtroInicio.textContent, '14/11/2026');
  assert.equal(ctx.renders, 0);
  assert.equal(ctx.state.filtroInicio, '2026-11-01');
  ctx.calendarioCentralizado = { idCampo: 'filtroFim' };
  ctx.selecionarDataCalendario('2026-11-14');
  ctx.aplicarFiltroDashboard();
  assert.equal(ctx.state.filtroInicio, '2026-11-14');
  assert.equal(ctx.state.filtroFim, '2026-11-14');
  assert.equal(ctx.saves, 1);
  assert.equal(ctx.renders, 1);
});
test('intervalo entre meses é respeitado; inversão não substitui o filtro aplicado', () => {
  const { ctx, fields } = contexto();
  fields.filtroInicio.value = '2026-10-28'; fields.filtroFim.value = '2026-11-04';
  ctx.aplicarFiltroDashboard();
  assert.equal(ctx.state.filtroInicio, '2026-10-28');
  assert.equal(ctx.state.filtroFim, '2026-11-04');
  assert.equal(ctx.state.mesReferencia, '2026-10-01');
  fields.filtroInicio.value = '2026-11-10'; fields.filtroFim.value = '2026-11-04';
  ctx.aplicarFiltroDashboard();
  assert.equal(ctx.state.filtroInicio, '2026-10-28');
  assert.match(ctx.erro, /inicial/);
  assert.equal(ctx.renders, 1);
});
test('setas e Mês atual continuam restaurando o mês completo', () => {
  const { ctx } = contexto();
  ctx.state.filtroInicio = '2026-11-14'; ctx.state.filtroFim = '2026-11-14';
  ctx.mudarMes(1);
  assert.equal(ctx.state.filtroInicio, '2026-12-01'); assert.equal(ctx.state.filtroFim, '2026-12-31');
  ctx.irMesAtual();
  const hoje = new Date();
  assert.equal(ctx.state.filtroInicio, ctx.isoData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  assert.equal(ctx.state.filtroFim, ctx.isoData(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)));
});
