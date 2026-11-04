import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { minify } = require('next/dist/compiled/terser');
export const OPCOES_MOBILE = Object.freeze({
  compress: false,
  mangle: false,
  format: { comments: /@license|@preserve|^!/, ascii_only: true },
});

// Só formatação: não eliminar código, renomear símbolos ou mudar o fluxo.
export async function reduzirScriptMobile(codigo) {
  new Script(codigo, { filename: 'mobile-app.original.js' });
  const resultado = await minify(codigo, OPCOES_MOBILE);
  if (!resultado.code) throw new Error('O script mobile otimizado ficou vazio.');
  new Script(resultado.code, { filename: 'mobile-app.otimizado.js' });
  return resultado.code + '\n';
}

const sha256 = codigo => createHash('sha256').update(codigo).digest('hex');
const tamanhos = codigo => ({ bytes: Buffer.byteLength(codigo), gzip: gzipSync(codigo).length, brotli: brotliCompressSync(codigo).length });

export async function gerarMobileOtimizado(raiz = resolve(import.meta.dirname, '..')) {
  const origem = await readFile(resolve(raiz, 'public/mobile-app.js'), 'utf8');
  const versao = (await readFile(resolve(raiz, 'app/lib/version.ts'), 'utf8')).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
  if (!versao) throw new Error('Versão oficial não encontrada.');
  const codigo = await reduzirScriptMobile(origem);
  if (Buffer.byteLength(codigo) >= Buffer.byteLength(origem)) throw new Error('A otimização não reduziu o script mobile.');
  const pasta = resolve(raiz, 'public/mobile-runtime');
  await mkdir(pasta, { recursive: true });
  // Gerados a partir de fontes auditáveis; não recebem credenciais.
  await writeFile(resolve(pasta, 'mobile-app.js.tmp'), codigo);
  await rename(resolve(pasta, 'mobile-app.js.tmp'), resolve(pasta, 'mobile-app.js'));
  const manifesto = {
    versao, estrategia: 'formatacao-sem-compressao-logica-sem-renomeacao',
    origem: { sha256: sha256(origem), ...tamanhos(origem) },
    entrega: { sha256: sha256(codigo), ...tamanhos(codigo) },
  };
  await writeFile(resolve(pasta, 'manifest.json'), JSON.stringify(manifesto, null, 2) + '\n');
  return manifesto;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await gerarMobileOtimizado(), null, 2));
}
