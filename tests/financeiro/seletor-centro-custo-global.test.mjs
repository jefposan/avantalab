import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const header = readFileSync('app/components/AppHeader.tsx', 'utf8');

test('seletor operacional de centro de custo fica no cabeçalho global', () => {
  assert.match(gestao, /centrosCustoAtivo=\{centrosCustoAtivo\}/);
  assert.match(gestao, /onSelecionarCentroCusto=\{\(centroCustoId\)/);
  assert.match(header, /centrosCustoAtivo && centrosCustoAtivos\.length > 0/);
  assert.match(header, /absolute left-1\/2 top-full z-10 mt-\[6px\] flex w-max -translate-x-1\/2 translate-y-1 items-center gap-1\.5/);
  assert.match(header, /Centro de custo:/);
  assert.match(header, /lista-centros-custo-global/);
});

test('páginas analíticas seguem somente o seletor global', () => {
  assert.doesNotMatch(gestao, /centroCustoRelatorioId/);
  assert.match(gestao, /<Graficos[\s\S]*?centroCustoId=\{centrosCustoAtivo \? centroCustoSelecionadoId : undefined\}/);
  assert.match(gestao, /<PorCategoria[\s\S]*?centroCustoId=\{centrosCustoAtivo \? centroCustoSelecionadoId : undefined\}/);
  assert.match(gestao, /<Relatorio[\s\S]*?centroCustoId=\{centrosCustoAtivo \? centroCustoSelecionadoId : undefined\}/);
});

test('controle global mantém contorno primário e aciona a troca do contexto', () => {
  assert.match(header, /h-6 w-\[138px\] items-center justify-center rounded-md border-2 px-6 text-center/);
  assert.match(header, /style=\{\{ backgroundColor: corPrimaria, borderColor: corPrimaria, color: textoSobreCorPrimaria \}\}/);
  assert.match(header, /onSelecionarCentroCusto\?\.\(centro.id\)/);
  assert.match(gestao, /setCarregandoCentroCusto\(true\);/);
  assert.match(gestao, /setCentroCustoSelecionadoId\(centroCustoId\);/);
});

test('cabeçalho eleva as abas apenas com centro de custo ativo', () => {
  assert.match(header, /xl:py-\[14px\]/);
  assert.match(header, /max-w-\[560px\] \$\{centrosCustoAtivo \? '-translate-y-1' : ''\} grid-cols-5/);
  assert.match(header, /top-full z-10 mt-\[6px\] flex w-max -translate-x-1\/2 translate-y-1/);
});

test('barra mensal passa a respeitar a altura do cabeçalho global', () => {
  assert.match(gestao, /top: alturaHeaderGestao \? `\$\{alturaHeaderGestao\}px` : undefined/);
});

test('lista de centros abre acima das demais camadas da Gestão', () => {
  assert.match(header, /listaCentroCustoAberta \? 'z-\[8600\]' : 'z-\[900\]'/);
  assert.match(header, /absolute left-0 top-full z-\[8610\] mt-1 max-h-56 w-full.*shadow-2xl/);
});
