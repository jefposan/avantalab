import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const componente = await readFile(resolve(raiz, 'app/components/NovidadesVendasModal.tsx'), 'utf8');

test('publicação bloqueia localmente arquivos maiores que 100 MB', () => {
  assert.match(componente, /const LIMITE_ARQUIVO_DIVULGACAO_BYTES = 100 \* 1024 \* 1024;/);
  assert.match(componente, /if \(file\.size > LIMITE_ARQUIVO_DIVULGACAO_BYTES\)/);
  assert.match(componente, /excede o limite permitido de \$\{LIMITE_ARQUIVO_DIVULGACAO_MB\} MB/);
  assert.ok(
    componente.indexOf('if (file.size > LIMITE_ARQUIVO_DIVULGACAO_BYTES)')
      < componente.indexOf('arquivoHash = await calcularHashSha256(file)'),
    'o tamanho deve ser validado antes de ler e enviar todo o arquivo',
  );
});

test('respostas técnicas do armazenamento são convertidas para português', () => {
  assert.match(componente, /function mensagemErroEnvioMaterial\(erro: unknown\)/);
  assert.match(componente, /exceeded the maximum allowed size\|maximum allowed size\|payload too large/);
  assert.match(componente, /O arquivo excede o limite permitido de \$\{LIMITE_ARQUIVO_DIVULGACAO_MB\} MB\./);
  assert.match(componente, /reject\(new Error\(mensagemErroEnvioMaterial\(mensagem\)\)\)/);
  assert.match(componente, /falhas\.push\(`\$\{file\.name\}: \$\{mensagemErroEnvioMaterial\(e\)\}`\)/);
  assert.doesNotMatch(componente, /falhas\.push\(`\$\{file\.name\}: \$\{e instanceof Error \? e\.message/);
});
