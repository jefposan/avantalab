import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('a despesa escolhida em uma nova recorrência permanece selecionada após renderizar', () => {
  assert.match(mobile, /var nomeSelecionado = state\.novaRecorrNome \|\| ''/);
  assert.match(mobile, /d\.nome === nomeSelecionado \? ' selected' : ''/);
});

test('o rascunho de despesa fixa é limpo somente ao salvar ou encerrar o modal', () => {
  assert.match(mobile, /function limparNovaRecorrenciaMobile\(\)[\s\S]*?state\.novaRecorrNome = ''[\s\S]*?state\.novaRecorrMesesFrente = 1/);
  assert.match(mobile, /async function salvarNovaRecorrenciaMobile\(\)[\s\S]*?limparNovaRecorrenciaMobile\(\)/);
  assert.match(mobile, /function fecharModalMenu\(\)[\s\S]*?state\.modalMenu === 'despesasFixas'[\s\S]*?limparNovaRecorrenciaMobile\(\)/);
});
