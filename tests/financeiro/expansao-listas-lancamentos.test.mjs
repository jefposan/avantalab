import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const botao = readFileSync('app/components/BotaoExpandirCard.tsx', 'utf8');
const despesas = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');
const cardDespesas = readFileSync('app/components/CardLancamentoDespesa.tsx', 'utf8');
const receitas = readFileSync('app/components/CardEntradaFaturamento.tsx', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');

test('controle compartilhado diferencia pop-up e lista com nome acessível', () => {
  assert.match(botao, /modo\?: 'popup' \| 'lista'/);
  assert.match(botao, /'Expandir card'/);
  assert.match(botao, /'Expandir lista de lançamentos'/);
  assert.match(botao, /'Recolher lista de lançamentos'/);
  assert.match(botao, /aria-expanded=\{expandido\}/);
  assert.match(botao, /flex h-7/);
  assert.match(botao, /compactoNoRodape/);
  assert.match(botao, /corPrimaria\?: string/);
  assert.match(botao, /darkMode\?: boolean/);
  assert.match(botao, /usarTemaPrimarioNoRodape/);
  assert.match(botao, /color-mix\(in srgb/);
  assert.match(botao, /relative h-5 after:absolute/);
  assert.match(botao, /after:-inset-\[12px\]/);
  assert.match(botao, /translate-y-3/);
  assert.match(botao, /hover:scale-\[1\.04\]/);
  assert.match(botao, /active:scale-95/);
  assert.doesNotMatch(botao, /hover:text-slate-900/);
});

test('Despesas troca a alça de arrastar pela expansão inline da lista', () => {
  assert.match(despesas, /variante="rodape"/);
  assert.match(despesas, /modo="lista"/);
  assert.match(despesas, /const \[listaExpandida, setListaExpandida\] = useState\(false\)/);
  assert.match(despesas, /onClick=\{\(\) => definirListaExpandida\(!listaExpandida\)\}/);
  assert.match(despesas, /listaExpandida\s*\?\s*'auto'/);
  assert.match(despesas, /linhaReferenciaExpansaoRef/);
  assert.match(despesas, /window\.scrollTo\(\{ top: window\.scrollY \+ deslocamento/);
  assert.match(despesas, /setListaExpandida\(true\)/);
  assert.match(despesas, /onRecolherLista=\{\(\) => definirListaExpandida\(false\)\}/);
  assert.match(cardDespesas, /listaExpandida && onRecolherLista/);
  assert.match(cardDespesas, /<span>Parcelar<\/span>/);
  assert.match(cardDespesas, /\{expandido && \(/);
  assert.match(despesas, /data-rodape-expansao-lista="despesas"/);
  assert.match(despesas, /flex shrink-0 items-center justify-center/);
  assert.match(despesas, /compactoNoRodape/);
  assert.match(despesas, /corPrimaria=\{corPrimaria\}/);
  assert.match(despesas, /darkMode=\{darkMode\}/);
  assert.match(gestao, /const ESPACO_ACAO_EXPANSAO_TABELA = 36;/);
  assert.doesNotMatch(despesas, /cursor-row-resize/);
  assert.doesNotMatch(despesas, /onPointerDown/);
});

test('Receitas recebe a mesma expansão inline, independente do pop-up', () => {
  assert.match(receitas, /!popupExpandido && entradas\.length > 10/);
  assert.match(receitas, /variante="rodape"/);
  assert.match(receitas, /modo="lista"/);
  assert.match(receitas, /const \[listaExpandida, setListaExpandida\] = useState\(false\)/);
  assert.match(receitas, /onClick=\{\(\) => definirListaExpandida\(!listaExpandida\)\}/);
  assert.match(receitas, /linhaReferenciaExpansaoRef/);
  assert.match(receitas, /\[data-tabela-entradas\]/);
  assert.match(receitas, /\{ativo && \(/);
  assert.match(receitas, /data-rodape-expansao-lista="receitas"/);
  assert.match(receitas, /mt-1 flex h-9 shrink-0 items-center justify-center/);
  assert.match(receitas, /compactoNoRodape/);
  assert.match(receitas, /corPrimaria=\{corPrimaria\}/);
  assert.match(receitas, /darkMode=\{darkMode\}/);
});
