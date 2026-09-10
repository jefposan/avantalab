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

  const acoesPorVoz = await ler('docs/padrao-avanta/acoes-por-voz.md');
  for (const contrato of [
    'window.AvantaVoiceActions.open(adapter)',
    'Sem voz, sem movimento',
    'Qualquer escrita exige confirmação explícita',
    'É proibido copiar o JavaScript',
    'aliases semânticos gerados por IA em segundo plano',
  ]) {
    if (!acoesPorVoz.includes(contrato)) {
      falhas.push(`Contrato obrigatório ausente em acoes-por-voz.md: ${contrato}`);
    }
  }

  const controladorVoz = await ler('app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js');
  const estilosVoz = await ler('app/padrao-avanta/acoes-por-voz/avanta-voice-actions.css');
  const contratoVoz = await ler('app/padrao-avanta/acoes-por-voz/contract.ts');
  for (const referencia of [
    'window.AvantaVoiceActions = publicApi',
    'getByteTimeDomainData',
    "button('Salvar para depois'",
    "rotulo: 'Compartilhar comprovante'",
  ]) {
    if (!controladorVoz.includes(referencia)) {
      falhas.push(`Controlador oficial de ações por voz incompleto: ${referencia}`);
    }
  }
  for (const referencia of ['.mobile-voice-command-trigger', '.mobile-voice-command-help', '.voice-pending-list']) {
    if (!estilosVoz.includes(referencia)) {
      falhas.push(`Estilo oficial de ações por voz incompleto: ${referencia}`);
    }
  }
  if (!contratoVoz.includes('AvantaVoiceActionsAdapter')) {
    falhas.push('Contrato TypeScript oficial de ações por voz ausente.');
  }

  const autenticacao = await ler('docs/padrao-avanta/autenticacao.md');
  for (const contrato of [
    'uma única fonte de estado social',
    '`${window.location.origin}/`',
    'skipBrowserRedirect: true',
    "App.addListener('appUrlOpen'",
    "Browser.addListener('browserFinished'",
    'Preparando acesso',
    'Cancelar e voltar ao login',
    '44 × 44 px',
    'minmax(0, 1fr) auto minmax(0, 1fr)',
    'Não posicionar a marca por `top`',
  ]) {
    if (!autenticacao.includes(contrato)) {
      falhas.push(`Contrato obrigatório ausente em autenticacao.md: ${contrato}`);
    }
  }

  const hookAutenticacao = await ler('app/hooks/useAuth.ts');
  for (const referencia of [
    'loginSocialPendenteRef',
    "CapacitorApp.addListener('appUrlOpen'",
    'skipBrowserRedirect: true',
    'Browser.open',
    'Browser.close',
  ]) {
    if (!hookAutenticacao.includes(referencia)) {
      falhas.push(`Referência de autenticação da Gestão ausente: ${referencia}`);
    }
  }

  const loginVendas = await ler('app/avantavendas/sistema/app.js');
  for (const referencia of [
    'Preparando acesso',
    'cancelarLoginSocialVendas',
    'entrarComGoogle',
    'entrarComApple',
  ]) {
    if (!loginVendas.includes(referencia)) {
      falhas.push(`Referência de autenticação do AvantaVendas ausente: ${referencia}`);
    }
  }
  for (const referencia of [
    'window.AvantaVoiceActions?.open',
    '/avantavendas/recursos/avanta-voice-actions.js',
    "storageNamespace: 'avantalab.vendas.voice_command.official.v1'",
  ]) {
    if (!loginVendas.includes(referencia)) {
      falhas.push(`AvantaVendas não usa o padrão central de ações por voz: ${referencia}`);
    }
  }

  const estilosLocaisVendas = await ler('app/avantavendas/sistema/styles.css');
  if (/\.mobile-voice-command-trigger\s*\{/.test(estilosLocaisVendas)) {
    falhas.push('AvantaVendas mantém uma cópia local dos estilos oficiais de ações por voz.');
  }
}

const agents = await ler('AGENTS.md');
if (!agents.includes('PADRAO-AVANTA') || !agents.includes('docs/padrao-avanta/README.md')) {
  falhas.push('AGENTS.md não obriga a leitura do PADRÃO AVANTA.');
}
if (!agents.includes('docs/padrao-avanta/acoes-por-voz.md')
  || !agents.includes('app/padrao-avanta/acoes-por-voz/')) {
  falhas.push('AGENTS.md não obriga o uso do padrão central de ações por voz.');
}

const packageJson = await ler('package.json');
if (!packageJson.includes('verificar:padrao-avanta')) {
  falhas.push('package.json não expõe o comando verificar:padrao-avanta.');
}

const globals = await ler('app/globals.css');
for (const token of ['--av-font-family', '--av-font-weight-body', '--av-font-weight-control', '--av-font-weight-title']) {
  if (!globals.includes(token)) falhas.push(`Token tipográfico obrigatório ausente: ${token}`);
}

for (const arquivo of ['app/components/AvantaCard.tsx', 'app/components/AvantaCard.module.css', 'planejamento/padrao-avanta-card.md']) {
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
