import { conferirOrigemProducao } from './conferir-origem-producao.mjs';
import { execFile } from 'node:child_process';
import { mkdir, readFile, realpath, rmdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const raiz = resolve(import.meta.dirname, '..');
const projeto = 'prj_AiYSXppfsqysQ4z0khaxb7EOFJP3';
const equipe = 'team_4AGRJbnDI1pfFrCMbqZM0U6U';
const scope = 'jeff-projetos';

export function conferirFila(resposta) {
  if (!resposta || !Array.isArray(resposta.deployments)) throw new Error('Não foi possível conferir a fila; envio bloqueado.');
  const pendentes = resposta.deployments.filter(d => ['BUILDING', 'QUEUED', 'INITIALIZING'].includes(d.readyState ?? d.state));
  if (pendentes.length) throw new Error(`Já há ${pendentes.length} publicação(ões) em andamento. Aguarde antes de preparar/enviar outro pacote; nada foi cancelado.`);
}

export function conferirIdentificacao(versao, mensagem, arquivos) {
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(versao ?? '') ||
      !(mensagem.startsWith(versao + ' — ') || mensagem.startsWith(versao + '-')) || !/ — [^:]+: .+/.test(mensagem)) {
    throw new Error('Snapshot precisa de identificação: VERSÃO — Módulo: resumo.');
  }
  const sensiveis = arquivos.filter(a => /(^|\/)(\.env(?:\.|$)|\.backups\/|backups\/|\.codex\/)|\.(?:pem|p12|p8|pfx|key|jks|keystore|mobileprovision)$/.test(a));
  if (sensiveis.length) throw new Error('Snapshot contém arquivos sensíveis; envio bloqueado.');
}

export function conferirBase(manifesto, atual) {
  if (!manifesto?.baseDeploymentId || !atual?.targets?.production?.id ||
      manifesto.baseDeploymentId !== atual.targets.production.id) {
    throw new Error('A base de produção mudou ou não foi registrada. Refaça o pacote sobre a produção atual para não sobrescrever outra entrega.');
  }
}

export function conferirProducaoDoDominio(alias, deployment) {
  if (alias?.alias !== 'avantalab.com.br' || alias.projectId !== projeto ||
      !alias.deploymentId || alias.deployment?.id !== alias.deploymentId ||
      deployment?.id !== alias.deploymentId || deployment.projectId !== projeto ||
      deployment.readyState !== 'READY') {
    throw new Error('Não foi possível confirmar a produção READY do domínio oficial; envio bloqueado.');
  }
  return { targets: { production: { id: deployment.id } } };
}

export function conferirBuildProjeto(atual) {
  const recursos = atual?.resourceConfig;
  // Configuração Elastic/Standard já contratada e autorizada pelo titular.
  // Apenas leitura: este fluxo não altera plano, máquina ou concorrência.
  const elasticStandardAutorizado = recursos?.buildMachineSelection === 'elastic'
    && recursos.buildMachineType === 'standard'
    && recursos.elasticBuildMachine?.label === 'standard'
    && recursos.elasticBuildMachine.cores === 4
    && recursos.elasticBuildMachine.memory === 8192;
  // Enhanced ativada pelo provedor e autorizada expressamente em 24/10/2026.
  // Apenas aceita a configuração atual; não modifica recursos nem plano.
  const elasticEnhancedAutorizado = recursos?.buildMachineSelection === 'elastic'
    && recursos.buildMachineType === 'enhanced'
    && recursos.elasticBuildMachine?.label === 'enhanced'
    && recursos.elasticBuildMachine.cores === 8
    && recursos.elasticBuildMachine.memory === 16384;
  // Enhanced fixa autorizada pelo titular em 26/10/2026 (8 vCPUs/16 GB).
  const fixedEnhancedAutorizado = recursos?.buildMachineSelection === 'fixed'
    && recursos.buildMachineType === 'enhanced';
  if (!(recursos?.buildMachineType === 'basic' || elasticStandardAutorizado || elasticEnhancedAutorizado || fixedEnhancedAutorizado) ||
      (atual.buildCommand != null && atual.buildCommand.trim() !== 'npm run build')) {
    throw new Error('Configuração remota não confirma máquina básica, Elastic/Standard, Elastic/Enhanced ou Enhanced fixa autorizada e build completo; envio bloqueado, sem alterar recursos ou custos.');
  }
}

export async function comTrava(pasta, acao) {
  try { await mkdir(pasta); }
  catch (erro) {
    if (erro.code === 'EEXIST') throw new Error('Outro envio local está em andamento. Trava preservada; não será removida automaticamente.');
    throw erro;
  }
  try { return await acao(); }
  finally { await rmdir(pasta); }
}

export async function publicar({ pasta, producao = false, cli = process.env.AVANTA_VERCEL_CLI ?? 'vercel', executar = exec } = {}) {
  if (!pasta) throw new Error('Informe --diretorio com um pacote isolado e snapshot Git.');
  const pacote = await realpath(resolve(pasta));
  const workspace = await realpath(raiz);
  if (pacote === workspace) throw new Error('Não publicar o checkout compartilhado. Prepare um pacote isolado.');
  const rodarBruto = async (bin, args, cwd = pacote) => {
    const r = await executar(bin, args, { cwd, maxBuffer: 8 * 1024 * 1024 });
    return r.stdout;
  };
  const rodar = async (...args) => (await rodarBruto(...args)).trim();
  const vc = args => cli.endsWith('.js') ? rodar(process.execPath, [cli, ...args]) : rodar(cli, args);
  const identidade = JSON.parse(await readFile(resolve(pacote, '.vercel/project.json'), 'utf8'));
  if (identidade.projectId !== projeto || identidade.orgId !== equipe) throw new Error('Projeto/equipe do pacote não corresponde ao AvantaLab.');
  if (await rodar('git', ['rev-parse', '--show-toplevel']) !== pacote) throw new Error('O snapshot Git deve pertencer somente ao pacote isolado.');
  if (await rodar('git', ['status', '--porcelain'])) throw new Error('Pacote mudou após o snapshot; refaça os testes e o snapshot antes de enviar.');
  const mensagem = await rodar('git', ['log', '-1', '--format=%s']);
  const hash = await rodar('git', ['rev-parse', 'HEAD']);
  const versao = (await readFile(resolve(pacote, 'app/lib/version.ts'), 'utf8')).match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1];
  conferirIdentificacao(versao, mensagem, (await rodar('git', ['ls-files'])).split('\n'));
  // O build remoto continua obrigatório. Não há --prebuilt, --force ou salto de testes.
  const config = JSON.parse(await readFile(resolve(pacote, 'package.json'), 'utf8'));
  if (!config.scripts?.build?.includes('npm test') || !config.scripts.build.includes('next build') ||
      config.scripts.test !== 'node scripts/executar-testes.mjs') {
    throw new Error('Build deve manter a suíte completa e a compilação verificadas.');
  }
  const estado = resolve(raiz, 'output/pipeline');
  await mkdir(estado, { recursive: true });
  return comTrava(resolve(estado, 'publicacao-vercel.lock'), async () => {
    conferirFila(JSON.parse(await vc(['api', `/v6/deployments?projectId=${projeto}&limit=100`, '--scope', scope])));
    const atual = JSON.parse(await vc(['api', `/v9/projects/${projeto}`, '--scope', scope]));
    conferirBuildProjeto(atual);
    if (producao) {
      const manifesto = JSON.parse(await readFile(resolve(pacote, 'avanta-entrega.json'), 'utf8'));
      await conferirOrigemProducao({ rodar: async (bin, args) => args[0] === 'show' ? rodarBruto(bin, args) : rodar(bin, args), manifesto });
      // targets.production pode apontar a última tentativa que falhou. O domínio
      // oficial e o deployment READY são a fonte da produção efetivamente servida.
      const alias = JSON.parse(await vc(['api', '/v4/aliases/avantalab.com.br', '--scope', scope]));
      const deployment = JSON.parse(await vc(['api', `/v13/deployments/${alias.deploymentId}`, '--scope', scope]));
      conferirBase(manifesto, conferirProducaoDoDominio(alias, deployment));
    }
    if (await rodar('git', ['status', '--porcelain']) || await rodar('git', ['rev-parse', 'HEAD']) !== hash) throw new Error('Pacote mudou durante a conferência; envio bloqueado.');
    if (producao) await conferirOrigemProducao({ rodar: async (bin, args) => args[0] === 'show' ? rodarBruto(bin, args) : rodar(bin, args), manifesto: JSON.parse(await readFile(resolve(pacote, 'avanta-entrega.json'), 'utf8')) });
    const inicio = Date.now();
    const args = ['deploy', '--yes', '--no-wait', '--scope', scope,
      '--meta', `githubCommitMessage=${mensagem}`, '--meta', `githubCommitSha=${hash}`,
      '--meta', `avantaVersion=${versao}`, '--meta', `avantaSummary=${mensagem}`];
    if (producao) args.push('--prod');
    const saida = await vc(args);
    const url = saida.match(/https:\/\/[^\s]+\.vercel\.app\b/)?.[0];
    if (!url) throw new Error('Vercel não devolveu URL; confira o histórico antes de repetir o envio.');
    const detalhe = JSON.parse(await vc(['api', `/v13/deployments/${new URL(url).hostname}`, '--scope', scope]));
    const recibo = { versao, resumo: mensagem, hash, url, id: detalhe.id, destino: producao ? 'production' : 'preview',
      estado: detalhe.readyState, identificacaoConferida: detalhe.meta?.githubCommitMessage === mensagem,
      inicio, enviadoEm: Date.now(), promocao: producao ? 'automatica-apos-build-aprovado' : 'nao-autorizada-por-este-comando' };
    await writeFile(resolve(estado, `publicacao-${hash.slice(0, 12)}.json`), JSON.stringify(recibo, null, 2) + '\n');
    if (!recibo.identificacaoConferida) throw new Error(`Envio recebido (${url}), mas identificação não confirmada. Não repetir; confira a Vercel.`);
    console.log(JSON.stringify(recibo, null, 2));
    console.log('Envio concluído. Em fila/em build NÃO significa publicado. Confira READY e os domínios antes de comunicar conclusão.');
    return recibo;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), pos = args.indexOf('--diretorio');
    if (args.some((arg, i) => arg !== '--diretorio' && arg !== '--producao' && !(pos >= 0 && i === pos + 1))) throw new Error('Opções: --diretorio PACOTE [--producao].');
    await publicar({ pasta: pos >= 0 ? args[pos + 1] : undefined, producao: args.includes('--producao') });
  } catch (erro) { console.error(erro.message); process.exitCode = 1; }
}
