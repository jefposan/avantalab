import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('lançamento da Caixinha entra diretamente em edição na própria linha web', async () => {
  const dashboard = await readFile(
    new URL('../../app/components/Dashboard.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(dashboard, /caixinhaAporteSelecionadoId/);
  assert.match(dashboard, /onClick=\{\(\) => setCaixinhaAporteEditando\(\{ id: mov\.id/);
  assert.match(dashboard, /aria-label=\{`Editar lançamento \$\{descricaoMovimento\}`\}/);
  assert.match(dashboard, /aria-label="Salvar aporte"/);
  assert.match(dashboard, /aria-label="Cancelar edição"/);
  assert.match(dashboard, /onExcluirAporteCaixinha\(mov\)/);
  assert.match(dashboard, /aria-label="Excluir aporte"/);
});

test('lançamento da Caixinha abre o card móvel compartilhado de editar e excluir', async () => {
  const mobile = await readFile(
    new URL('../../public/mobile-app.js', import.meta.url),
    'utf8',
  );

  assert.match(mobile, /data-tipo-lancamento="caixinha" data-lancamento-id=/);
  assert.match(mobile, /tipo === 'caixinha' \? state\.caixinhaMovimentos/);
  assert.match(mobile, /var detalhe = caixinha \? 'Aporte da caixinha'/);
  assert.match(mobile, /id="editar-caixinha-data" type="date"/);
  assert.match(mobile, /campoClaro\('editar-caixinha-descricao'/);
  assert.match(mobile, /salvarEdicaoAporteCaixinhaSelecionadoMobile/);
  assert.match(mobile, /excluirAporteCaixinhaSelecionadoMobile/);
  assert.match(mobile, /\.from\('caixinhas_movimentos'\)/);
  assert.match(mobile, /\.from\('lancamentos'\)/);
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
