import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [arquivoVersao, manualVendas, changelog] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8'),
  readFile(resolve(raiz, 'docs/ava/vendas.md'), 'utf8'),
  readFile(resolve(raiz, 'CHANGELOG.md'), 'utf8'),
]);

const revisaoExecutavel = arquivoVersao.match(/AVANTAVENDAS_ASSET_REVISION\s*=\s*'(\d+)'/)?.[1];
const revisaoMarcador = manualVendas.match(/<!--\s*avantavendas-asset-revision:\s*(\d+)\s*-->/)?.[1];
const revisoesManual = [...manualVendas.matchAll(/>\s*Revisão\s+[\d.]+-av(\d+):/g)]
  .map((resultado) => Number(resultado[1]));
const revisoesChangelog = [...changelog.matchAll(/^##\s+[\d.]+-av(\d+)\s+-/gm)]
  .map((resultado) => Number(resultado[1]));

if (!revisaoExecutavel) {
  throw new Error('Não foi possível identificar AVANTAVENDAS_ASSET_REVISION em app/avantavendas/version.ts.');
}
if (!revisaoMarcador || !revisoesManual.length || !revisoesChangelog.length) {
  throw new Error('Documente a revisão operacional do AvantaVendas no manual e no changelog.');
}

const revisaoManualMaisRecente = String(Math.max(...revisoesManual));
const revisaoChangelogMaisRecente = String(Math.max(...revisoesChangelog));
const revisoes = {
  executavel: revisaoExecutavel,
  marcadorDoManual: revisaoMarcador,
  manual: revisaoManualMaisRecente,
  changelog: revisaoChangelogMaisRecente,
};
const divergentes = Object.entries(revisoes)
  .filter(([, revisao]) => revisao !== revisaoExecutavel)
  .map(([origem, revisao]) => `${origem}=av${revisao}`);

if (divergentes.length) {
  throw new Error(
    `Revisão do AvantaVendas divergente: executável=av${revisaoExecutavel}; ${divergentes.join('; ')}. `
    + 'Incremente a revisão dos recursos e documente a mesma revisão antes de publicar.',
  );
}

console.log(`Revisão operacional do AvantaVendas validada: av${revisaoExecutavel}.`);
