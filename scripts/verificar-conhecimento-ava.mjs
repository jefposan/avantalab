import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const conteudoVersao = await readFile(resolve(raiz, 'app/lib/version.ts'), 'utf8');
const encontrado = conteudoVersao.match(/APP_VERSION\s*=\s*'([^']+)'/);

if (!encontrado) throw new Error('Não foi possível identificar APP_VERSION em app/lib/version.ts.');

const versao = encontrado[1];
const manuais = ['gestao-web.md', 'gestao-mobile.md', 'vendas.md'];
const pendentes = [];

for (const arquivo of manuais) {
  const caminho = resolve(raiz, 'docs/ava', arquivo);
  try {
    const conteudo = await readFile(caminho, 'utf8');
    if (!conteudo.includes(`<!-- ava-version: ${versao} -->`)) pendentes.push(arquivo);
  } catch {
    pendentes.push(arquivo);
  }
}

if (pendentes.length) {
  throw new Error(`Revise os manuais da Ava para a versão ${versao}: ${pendentes.join(', ')}.`);
}

console.log(`Manuais da Ava revisados para a versão ${versao}.`);
