import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

test('alterações de lançamento bloqueiam a tela e comunicam o progresso', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(mobile, /aplicacaoLancamento: false/);
  assert.match(mobile, /function iniciarAplicacaoLancamentoMobile\(mensagem\)[\s\S]*?state\.aplicacaoLancamentoMensagem = mensagem \|\| 'Aplicando alteração'[\s\S]*?state\.carregando = true/);
  assert.match(mobile, /function falharAplicacaoLancamentoMobile\(mensagem\)[\s\S]*?state\.aplicacaoLancamento = false/);
  assert.match(mobile, /function concluirAplicacaoLancamentoMobile\(mensagem\)[\s\S]*?mostrarToast\(mensagem\)/);
  assert.match(mobile, /function aplicacaoLancamentoHtml\(\)[\s\S]*?bg-slate-950\/85[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-busy="true"[\s\S]*?aria-label="' \+ titulo \+ '"[\s\S]*?role="status"[\s\S]*?aria-live="assertive"[\s\S]*?animate-spin/);
  assert.match(mobile, /processandoNotaHtml\(\) \+\n\s*aplicacaoLancamentoHtml\(\)/);
  assert.match(mobile, /async function excluirLancamentoSelecionado\(\)[\s\S]*?iniciarAplicacaoLancamentoMobile\(\)[\s\S]*?concluirAplicacaoLancamentoMobile\(/);
  assert.match(mobile, /async function salvarEdicaoLancamentoSelecionado\(confirmarPrevista\)[\s\S]*?iniciarAplicacaoLancamentoMobile\(\)[\s\S]*?concluirAplicacaoLancamentoMobile\(/);
});

test('Editar nos avisos de previsão abre diretamente o formulário do lançamento', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  const inicioDespesa = mobile.indexOf('function ajustarDespesaPrevista(id)');
  const fimDespesa = mobile.indexOf('async function confirmarReceitaPrevista', inicioDespesa);
  const ajusteDespesa = mobile.slice(inicioDespesa, fimDespesa);
  assert.match(ajusteDespesa, /state\.modalAcao = \{ tipo: 'despesa', modo: 'editar', item: despesa \}/);
  assert.doesNotMatch(ajusteDespesa, /abrirAcaoLancamento/);

  const inicioReceita = mobile.indexOf('function editarReceitaPrevista(id)');
  const fimReceita = mobile.indexOf('function telaLoginWrapper', inicioReceita);
  const ajusteReceita = mobile.slice(inicioReceita, fimReceita);
  assert.match(ajusteReceita, /state\.modalAcao = \{ tipo: 'receita', modo: 'editar', item: entrada \}/);
  assert.match(mobile, /\[data-ajustar-id\][\s\S]*?ajustarDespesaPrevista/);
});
