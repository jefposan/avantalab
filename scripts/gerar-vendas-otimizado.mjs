import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { reduzirScriptMobile as reduzirScript } from './gerar-mobile-otimizado.mjs';

export const SCRIPTS_VENDAS = JSON.parse(await readFile(new URL('../app/avantavendas/recursos/scripts-proprios.json', import.meta.url), 'utf8'));
const hash = codigo => createHash('sha256').update(codigo).digest('hex');
const medidas = codigo => ({ sha256: hash(codigo), bytes: Buffer.byteLength(codigo), gzip: gzipSync(codigo).length, brotli: brotliCompressSync(codigo).length });

export async function gerarVendasOtimizado(raiz = resolve(import.meta.dirname, '..')) {
  const versao = (await readFile(resolve(raiz, 'app/lib/version.ts'), 'utf8')).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
  const revisao = (await readFile(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8')).match(/AVANTAVENDAS_ASSET_REVISION\s*=\s*'(\d+)'/)?.[1];
  if (!versao || !revisao) throw new Error('Versão/revisão do AvantaVendas ausente.');
  const pasta = resolve(raiz, 'app/avantavendas/runtime-compacto');
  await mkdir(pasta, { recursive: true });
  const arquivos = [];
  for (const arquivo of SCRIPTS_VENDAS) {
    if (!/^[a-z0-9-]+\.js$/.test(arquivo)) throw new Error('Nome de script inválido.');
    const fonte = await readFile(resolve(raiz, 'app/avantavendas/sistema', arquivo), 'utf8');
    const codigo = await reduzirScript(fonte);
    if (Buffer.byteLength(codigo) >= Buffer.byteLength(fonte)) throw new Error('Sem redução: ' + arquivo);
    await writeFile(resolve(pasta, arquivo + '.tmp'), codigo);
    await rename(resolve(pasta, arquivo + '.tmp'), resolve(pasta, arquivo));
    arquivos.push({ arquivo, origem: medidas(fonte), entrega: medidas(codigo) });
  }
  const manifesto = { versao: `${versao}-av${revisao}`, estrategia: 'formatacao-sem-compressao-logica-sem-renomeacao', arquivos };
  await writeFile(resolve(pasta, 'manifest.json'), JSON.stringify(manifesto, null, 2) + '\n');
  return manifesto;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await gerarVendasOtimizado(), null, 2));
}
