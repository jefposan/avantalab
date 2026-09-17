import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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

test('validação do lançamento fica no card e não vaza para o dashboard', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const inicioEntrada = mobile.indexOf('async function salvarEntrada()');
  const fimEntrada = mobile.indexOf('async function salvarCategoriaDespesa()', inicioEntrada);
  const salvarEntrada = mobile.slice(inicioEntrada, fimEntrada);

  assert.match(mobile, /lancamentoErro: ''/);
  assert.match(mobile, /function setErroLancamentoMobile\(texto\)[\s\S]*?state\.lancamentoErro = texto \|\| ''/);
  assert.match(salvarEntrada, /setErroLancamentoMobile\('Informe dia, origem e valor validos\.'\)/);
  assert.doesNotMatch(salvarEntrada, /setErro\('Informe dia, origem e valor validos\.'\)/);
  assert.match(mobile, /id="lancamento-alerta-dia" role="alert"[\s\S]*?state\.lancamentoErro/);
  assert.match(mobile, /bind\('fechar-lancamento', function \(\) \{[\s\S]*?state\.lancamentoErro = ''/);
});

test('linhas de despesas e receitas abrem a ação sem erro de contexto', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const inicio = mobile.indexOf('function abrirAcaoLancamento(tipo, id)');
  const fim = mobile.indexOf('function fecharAcaoLancamento()', inicio);
  const abrirAcao = mobile.slice(inicio, fim);
  let renderizacoes = 0;
  const state = {
    lancamentos: [
      { id: 'despesa-confirmada', status: 'confirmada' },
      { id: 'despesa-prevista', status: 'prevista' },
    ],
    entradas: [{ id: 'receita-confirmada', status: 'confirmada' }],
    caixinhaMovimentos: [],
    modalAcao: null,
  };
  const contexto = {
    state,
    ehReceitaSincronizada: () => false,
    render: () => { renderizacoes += 1; },
  };
  vm.runInNewContext(`${abrirAcao}\nthis.abrirAcaoLancamento = abrirAcaoLancamento;`, contexto);

  assert.match(mobile, /data-tipo-lancamento="despesa" data-lancamento-id=/);
  assert.match(mobile, /data-tipo-lancamento="receita" data-lancamento-id=/);
  assert.match(abrirAcao, /var caixinha = tipo === 'caixinha';/);

  contexto.abrirAcaoLancamento('despesa', 'despesa-confirmada');
  assert.equal(state.modalAcao.modo, 'editar');
  assert.equal(state.modalAcao.item.id, 'despesa-confirmada');

  contexto.abrirAcaoLancamento('despesa', 'despesa-prevista');
  assert.equal(state.modalAcao.modo, 'opcoes');

  contexto.abrirAcaoLancamento('receita', 'receita-confirmada');
  assert.equal(state.modalAcao.modo, 'editar');
  assert.equal(renderizacoes, 3);
});

test('ações de lançamento previsto cabem em uma única linha no modal móvel', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const inicio = mobile.indexOf('function modalOpcoesLancamentoHtml(acao)');
  const fim = mobile.indexOf('function modalConfirmarExclusaoLancamentoHtml(acao)', inicio);
  const opcoes = mobile.slice(inicio, fim);

  assert.match(opcoes, /prevista \? 'grid-cols-3' : 'grid-cols-2'/);
  assert.match(opcoes, /id="aceitar-prevista-hoje"[\s\S]*?text-\[10px\]/);
  assert.match(opcoes, /id="editar-lancamento"[\s\S]*?text-\[10px\]/);
  assert.match(opcoes, /id="excluir-lancamento"[\s\S]*?text-\[10px\]/);
});
