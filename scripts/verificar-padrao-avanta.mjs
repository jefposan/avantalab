import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const pastaPadrao = resolve(raiz, 'docs/padrao-avanta');
const falhas = [];

async function ler(caminhoRelativo) {
  try {
    return await readFile(resolve(raiz, caminhoRelativo), 'utf8');
  } catch {
    falhas.push(`Arquivo ausente ou ilegível: ${caminhoRelativo}`);
    return '';
  }
}

const manifestoTexto = await ler('docs/padrao-avanta/manifest.json');
let manifesto;

try {
  manifesto = JSON.parse(manifestoTexto);
} catch {
  falhas.push('Manifesto inválido: docs/padrao-avanta/manifest.json');
}

if (manifesto) {
  if (manifesto.id !== 'PADRAO-AVANTA') falhas.push('O manifesto deve usar o id PADRAO-AVANTA.');
  if (!/^\d+\.\d+\.\d+$/.test(manifesto.versao || '')) falhas.push('A versão do padrão deve usar MAJOR.MINOR.PATCH.');

  const principal = await ler(`docs/padrao-avanta/${manifesto.documentoPrincipal}`);
  if (!principal.includes(`Versão oficial: **${manifesto.versao}**`)) {
    falhas.push('A versão do README não coincide com o manifesto do PADRÃO AVANTA.');
  }

  const historico = await ler('docs/padrao-avanta/CHANGELOG.md');
  if (!historico.includes(`## ${manifesto.versao} -`)) {
    falhas.push('A versão atual não está registrada no changelog do PADRÃO AVANTA.');
  }

  for (const documento of manifesto.documentosObrigatorios || []) {
    await ler(`docs/padrao-avanta/${documento}`);
  }

  const componentes = await ler('docs/padrao-avanta/componentes.md');
  if (!componentes.includes('Sem essa solicitação, não impor AvantaCard')) {
    falhas.push('A regra condicional de uso do AvantaCard não está documentada.');
  }
  if (!componentes.includes('BotaoProximoScroll')) {
    falhas.push('O componente oficial BotaoProximoScroll não está documentado.');
  }
}

const agents = await ler('AGENTS.md');
if (!agents.includes('PADRAO-AVANTA') || !agents.includes('docs/padrao-avanta/README.md')) {
  falhas.push('AGENTS.md não obriga a leitura do PADRÃO AVANTA.');
}

const packageJson = await ler('package.json');
if (!packageJson.includes('verificar:padrao-avanta')) {
  falhas.push('package.json não expõe o comando verificar:padrao-avanta.');
}

const globals = await ler('app/globals.css');
for (const token of ['--av-font-family', '--av-font-weight-body', '--av-font-weight-control', '--av-font-weight-title']) {
  if (!globals.includes(token)) falhas.push(`Token tipográfico obrigatório ausente: ${token}`);
}

for (const arquivo of [
  'app/components/AvantaCard.tsx',
  'app/components/AvantaCard.module.css',
  'app/components/BotaoProximoScroll.tsx',
  'app/components/BotaoProximoScroll.module.css',
  'planejamento/padrao-avanta-card.md',
]) {
  await ler(arquivo);
}

const pastaModulos = resolve(raiz, 'app/modules');
try {
  await access(pastaModulos, constants.R_OK);
  const entradas = await readdir(pastaModulos, { withFileTypes: true });
  for (const entrada of entradas.filter((item) => item.isDirectory())) {
    for (const arquivo of ['manifest.ts', 'README.md']) {
      try {
        await access(resolve(pastaModulos, entrada.name, arquivo), constants.R_OK);
      } catch {
        falhas.push(`Módulo ${entrada.name} sem ${arquivo}.`);
      }
    }
  }
} catch {
  // A pasta passa a existir quando os módulos adotarem o novo contrato.
}

if (falhas.length) {
  throw new Error(`PADRÃO AVANTA inválido:\n- ${falhas.join('\n- ')}`);
}

console.log(`PADRÃO AVANTA ${manifesto.versao} validado em ${pastaPadrao}.`);
