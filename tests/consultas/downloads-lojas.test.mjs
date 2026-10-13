import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { decodificarRelatorioGoogle, ehDownloadInicialApple, lerRelatorioApple, lerRelatorioGoogle } from '../../app/lib/downloads-lojas-relatorios.ts';

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

const csvGoogle = 'Date,Package Name,Country,Daily Device Installs\r\n2026-10-10,br.com.avantalab.vendas,BR,12\r\n2026-10-11,br.com.avantalab.vendas,BR,0';
const esperadoGoogle = [
  { data: '2026-10-10', pacote: 'br.com.avantalab.vendas', instalacoes: 12 },
  { data: '2026-10-11', pacote: 'br.com.avantalab.vendas', instalacoes: 0 },
];

test('lê o CSV oficial UTF-16LE com BOM e preserva o dia de zero instalações', () => {
  const arquivo = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(csvGoogle, 'utf16le')]);
  assert.deepEqual(lerRelatorioGoogle(arquivo), esperadoGoogle);
});

test('aceita UTF-16BE e UTF-16 sem BOM, além do UTF-8 convertido', () => {
  const littleEndian = Buffer.from(csvGoogle, 'utf16le');
  const bigEndian = Buffer.from(littleEndian).swap16();
  for (const arquivo of [littleEndian, bigEndian, Buffer.concat([Buffer.from([0xfe, 0xff]), bigEndian]), Buffer.from(csvGoogle)]) {
    assert.deepEqual(lerRelatorioGoogle(arquivo), esperadoGoogle);
  }
});

test('relatório ilegível ou sem colunas obrigatórias não vira importação bem-sucedida vazia', () => {
  assert.throws(() => lerRelatorioGoogle('Date,Package Name,Country\n2026-10-10,br.com.avantalab.vendas,BR'), /colunas de instalações/);
  assert.throws(() => lerRelatorioGoogle(new Uint8Array()), /está vazio/);
  assert.throws(() => decodificarRelatorioGoogle(Buffer.from([0xff, 0xfe, 0x41])), /encoded data/);
});

test('sincronização não inventa zero quando a Apple ainda não liberou o relatório e diagnostica a fonte Google', () => {
  const servidor = readFileSync(new URL('../../app/lib/downloads-lojas-servidor.ts', import.meta.url), 'utf8');
  assert.match(servidor, /if \(resposta\.status === 404\) return null/);
  assert.match(servidor, /Promise\.allSettled\(lote\.map/);
  assert.match(servidor, /nextPageToken/);
  assert.match(servidor, /Google Play não devolveu relatórios de instalações/);
  assert.match(servidor, /situacao: 'atualizado' \| 'atrasado' \| 'sem_dados'/);
});
