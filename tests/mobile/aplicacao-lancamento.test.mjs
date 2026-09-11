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
