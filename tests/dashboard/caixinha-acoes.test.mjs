import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('lançamento da Caixinha abre ações acessíveis de editar e excluir', async () => {
  const dashboard = await readFile(
    new URL('../../app/components/Dashboard.tsx', import.meta.url),
    'utf8',
  );

  assert.match(dashboard, /caixinhaAporteSelecionadoId/);
  assert.match(dashboard, /aria-expanded=\{selecionado\}/);
  assert.match(dashboard, /role="group" aria-label=\{`Ações do lançamento/);
  assert.match(dashboard, />\s*Editar\s*<\/button>/);
  assert.match(dashboard, /onExcluirAporteCaixinha\(mov\)/);
  assert.match(dashboard, />\s*Excluir\s*<\/button>/);
});

test('exclusão confirma e remove o aporte e a despesa vinculada', async () => {
  const gestao = await readFile(
    new URL('../../app/gestao/page.tsx', import.meta.url),
    'utf8',
  );
  const fluxo = gestao.match(
    /const solicitarExclusaoAporteCaixinha = [\s\S]*?\n\};\n\n\/\/ A partir da data programada/,
  )?.[0] || '';

  assert.match(fluxo, /podeExcluirLancamentos/);
  assert.match(fluxo, /abrirConfirmacao\(\{/);
  assert.match(fluxo, /apagarLancamento\(movimento\.lancamentoId\)/);
  assert.match(fluxo, /\.from\('caixinhas_movimentos'\)/);
  assert.match(fluxo, /\.eq\('tipo', 'aporte'\)/);
  assert.match(fluxo, /setCaixinhaMovimentos\(\(prev\) => prev\.filter/);
  assert.match(fluxo, /setLancamentos\(\(prev\) => prev\.filter/);
});
