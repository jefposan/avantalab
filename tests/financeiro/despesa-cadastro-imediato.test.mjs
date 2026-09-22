import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

async function fontes() {
  const [web, mobile] = await Promise.all([
    readFile(new URL('app/gestao/page.tsx', raiz), 'utf8'),
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
  ]);
  return { web, mobile };
}

function trecho(conteudo, inicio, fim) {
  const posicaoInicial = conteudo.indexOf(inicio);
  const posicaoFinal = conteudo.indexOf(fim, posicaoInicial);
  assert.ok(posicaoInicial >= 0, `não encontrou ${inicio}`);
  assert.ok(posicaoFinal > posicaoInicial, `não encontrou o fim ${fim}`);
  return conteudo.slice(posicaoInicial, posicaoFinal);
}

test('tipo de despesa novo entra no seletor Web e já é escolhido no lançamento aberto', async () => {
  const { web } = await fontes();
  const adicionar = trecho(web, 'const adicionarDespesaBase = async () => {', 'const editarDespesaBase = async');

  assert.match(adicionar, /setDespesasCadastradas\(\(atuais\) =>[\s\S]*?ordenarDespesasAlfabeticamente/);
  assert.match(adicionar, /atuais\.filter\(\(despesa\) => normalizarTexto\(despesa\.nome\) !== normalizarTexto\(despesaSalva\.nome\)\)/);
  assert.match(adicionar, /setFormDespesa\(despesaSalva\.nome\)/);
  assert.ok(adicionar.indexOf('setFormDespesa(despesaSalva.nome)') < adicionar.indexOf('notificarFinanceiroAtualizado()'));
});

test('cadastro inline Mobile atualiza o seletor sem esperar nova carga', async () => {
  const { mobile } = await fontes();
  const inline = trecho(mobile, 'async function salvarNovaDespesaInline() {', 'function abrirCategoriaAcoes(id)');
  const menu = trecho(mobile, 'async function salvarCategoriaDespesa() {', 'async function salvarNovaDespesaInline()');

  assert.match(inline, /state\.despesas = ordenarDespesasAlfabeticamenteMobile/);
  assert.match(inline, /state\.despesaNome = novoNome/);
  assert.match(inline, /state\.novaDespesaAberta = false[\s\S]*?render\(true\)/);
  assert.doesNotMatch(inline, /await carregarDados\(\)/);
  assert.match(menu, /state\.despesas = ordenarDespesasAlfabeticamenteMobile/);
  assert.match(menu, /state\.carregando = false[\s\S]*?render\(true\)/);
  assert.doesNotMatch(menu, /await carregarDados\(\)/);
});

test('pílula do perfil preserva a transparência entre renderizações e só a recalcula pela rolagem', async () => {
  const { mobile } = await fontes();
  const recolhimento = trecho(mobile, 'function configurarRecolhimentoPerfilHeader() {', 'function acoesHeaderMobileHtml()');
  const renderizacao = trecho(mobile, 'function render(forcarDuranteEdicao) {', "bind('confirmar-telefone-obrigatorio'");

  assert.match(recolhimento, /window\._avaProfilePillScrollTop = scroll\.scrollTop/);
  assert.match(recolhimento, /pill\.style\.opacity = window\._avaProfilePillTranslucent \? '0\.25' : '1'/);
  assert.match(recolhimento, /window\.requestAnimationFrame\(aplicarTransparencia\)/);
  assert.doesNotMatch(recolhimento, /_avaProfilePillHidden = false/);
  assert.match(renderizacao, /_scrollContainers\['mobile-main-scroll'\]/);
  assert.match(renderizacao, /window\._avaProfilePillTranslucent = window\._avaProfilePillScrollTop > 8/);
});
