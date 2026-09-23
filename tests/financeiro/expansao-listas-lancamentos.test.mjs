import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const botao = readFileSync('app/components/BotaoExpandirCard.tsx', 'utf8');
const despesas = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');
const cardDespesas = readFileSync('app/components/CardLancamentoDespesa.tsx', 'utf8');
const receitas = readFileSync('app/components/CardEntradaFaturamento.tsx', 'utf8');

test('controle compartilhado diferencia pop-up e lista com nome acessível', () => {
  assert.match(botao, /modo\?: 'popup' \| 'lista'/);
  assert.match(botao, /'Expandir card'/);
  assert.match(botao, /'Expandir lista de lançamentos'/);
  assert.match(botao, /'Recolher lista de lançamentos'/);
  assert.match(botao, /aria-expanded=\{expandido\}/);
  assert.match(botao, /inline-flex h-7/);
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
});
