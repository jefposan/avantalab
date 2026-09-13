import assert from 'node:assert/strict';
import test from 'node:test';
import { ehDownloadInicialApple, lerRelatorioApple, lerRelatorioGoogle } from '../../app/lib/downloads-lojas-relatorios.ts';

test('lê unidades do relatório diário de vendas da Apple', () => {
  const linhas = lerRelatorioApple([
    'Provider\tApple Identifier\tProduct Type Identifier\tUnits',
    'AvantaLab\t6797617650\t1F\t4',
    'AvantaLab\t6793744930\t1F\t2',
  ].join('\n'));
  assert.deepEqual(linhas, [
    { appleId: '6797617650', tipoProduto: '1F', unidades: 4 },
    { appleId: '6793744930', tipoProduto: '1F', unidades: 2 },
  ]);
});

test('considera todas as variantes de download inicial da Apple e ignora atualizações', () => {
  assert.equal(ehDownloadInicialApple('1'), true);
  assert.equal(ehDownloadInicialApple('1F'), true);
  assert.equal(ehDownloadInicialApple('1T'), true);
  assert.equal(ehDownloadInicialApple('3'), false);
  assert.equal(ehDownloadInicialApple('7'), false);
});

test('lê instalações diárias do relatório CSV do Google Play', () => {
  const linhas = lerRelatorioGoogle([
    'Date,Package Name,Country,Daily Device Installs',
    '2026-09-12,br.com.avantalab.vendas,BR,3',
    '2026-09-12,br.com.avantalab.app,BR,2',
  ].join('\n'));
  assert.deepEqual(linhas, [
    { data: '2026-09-12', pacote: 'br.com.avantalab.vendas', instalacoes: 3 },
    { data: '2026-09-12', pacote: 'br.com.avantalab.app', instalacoes: 2 },
  ]);
});
