import { spawn } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import { availableParallelism, totalmem } from 'node:os';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function memoriaLimiteTestes() {
  const restrita = process.constrainedMemory?.() || 0;
  const total = totalmem();
  return restrita > 0 ? Math.min(restrita, total) : total;
}

export function concorrenciaTestes(valor, nucleos = availableParallelism(), ambiente = process.env, memoriaBytes = memoriaLimiteTestes()) {
  const vercel = ambiente.VERCEL === '1';
  if (valor !== undefined && !(vercel ? /^[1-4]$/ : /^[12]$/).test(String(valor))) {
    throw new Error(`AVANTA_TEST_CONCURRENCY deve ser ${vercel ? '1, 2, 3 ou 4 na Vercel' : '1 ou 2 no computador local'}.`);
  }
  const cpu = Number.isSafeInteger(nucleos) && nucleos > 0 ? nucleos : 1;
  // Reserva conservadora de 4 GiB para o build e 2 GiB por processo de testes.
  // O computador local continua limitado a dois, independentemente da CPU/RAM.
  const memoriaGiB = memoriaBytes / 1024 ** 3;
  const limiteMemoria = Number.isFinite(memoriaGiB) && memoriaGiB > 0
    ? Math.max(1, Math.floor((memoriaGiB - 4) / 2)) : 2;
  const limite = vercel ? Math.min(4, limiteMemoria) : 2;
  return Math.min(Number(valor ?? limite), cpu, limite);
}

// Descoberta explícita: inclui também testes na raiz e em subpastas profundas.
export function arquivosTeste(raiz, selecao = ['tests']) {
  const encontrados = new Set();
  const base = resolve(raiz, 'tests');
  function visitar(arquivo) {
    const rel = relative(base, arquivo);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep)) {
      throw new Error('Selecione somente arquivos ou pastas dentro de tests/.');
    }
    const stat = lstatSync(arquivo, { throwIfNoEntry: false });
    if (!stat) throw new Error('Teste não encontrado: ' + relative(raiz, arquivo));
    if (stat.isSymbolicLink()) throw new Error('Links simbólicos não são seleções de teste válidas.');
    if (stat.isDirectory()) {
      for (const item of readdirSync(arquivo, { withFileTypes: true })) {
        if (item.isDirectory() || item.isFile()) visitar(resolve(arquivo, item.name));
      }
    } else if (stat.isFile() && arquivo.endsWith('.test.mjs')) encontrados.add(arquivo);
  }
  for (const item of selecao) visitar(resolve(raiz, item));
  if (!encontrados.size) throw new Error('Nenhum teste selecionado; execução recusada.');
  return [...encontrados].sort();
}

export function ambienteTeste(ambiente = process.env) {
  const env = { ...ambiente };
  // Uma invocação aninhada não pode herdar o protocolo interno do node:test,
  // que faria o Node ignorar --test e encerrar sem executar os arquivos.
  delete env.NODE_TEST_CONTEXT;
  // Não habilitar cache extra: o benchmark não demonstrou ganho consistente.
  // Preservar opt-in externo do Node, exceto em cobertura, que exige precisão.
  if (env.NODE_V8_COVERAGE || env.NODE_DISABLE_COMPILE_CACHE === '1') {
    delete env.NODE_COMPILE_CACHE;
    env.NODE_DISABLE_COMPILE_CACHE = '1';
  }
  return env;
}

export async function executarTestes({ raiz = process.cwd(), selecao, ambiente = process.env } = {}) {
  const arquivos = arquivosTeste(raiz, selecao);
  const nucleos = availableParallelism();
  const memoria = memoriaLimiteTestes();
  const concorrencia = concorrenciaTestes(ambiente.AVANTA_TEST_CONCURRENCY, nucleos, ambiente, memoria);
  const env = ambienteTeste(ambiente);
  console.log(`[testes] ${arquivos.length} arquivos; ${concorrencia} processos isolados; suíte ${selecao?.length ? 'selecionada' : 'completa'}.`);
  console.log(`[testes] ambiente ${ambiente.VERCEL === '1' ? 'Vercel' : 'local'}; ${nucleos} CPUs disponíveis; limite de memória ${(memoria / 1024 ** 3).toFixed(1)} GiB; sem cache de aprovação.`);
  const inicio = performance.now();
  const filho = spawn(process.execPath, [
    '--no-warnings', '--experimental-strip-types', '--test',
    `--test-concurrency=${concorrencia}`, ...arquivos,
  ], { cwd: raiz, env, stdio: 'inherit' });
  const encaminhar = sinal => filho.kill(sinal);
  const sigint = () => encaminhar('SIGINT'), sigterm = () => encaminhar('SIGTERM');
  process.once('SIGINT', sigint); process.once('SIGTERM', sigterm);
  try {
    const codigo = await new Promise((ok, falha) => {
      filho.once('error', falha);
      filho.once('exit', (code, sinal) => ok(sinal ? 1 : code ?? 1));
    });
    console.log(`[testes] ${(performance.now() - inicio).toFixed(0)} ms; saída ${codigo}.`);
    return codigo;
  } finally {
    process.removeListener('SIGINT', sigint); process.removeListener('SIGTERM', sigterm);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const selecao = process.argv.slice(2);
    if (selecao.some(arg => arg.startsWith('-'))) throw new Error('Informe caminhos de teste, não opções que possam desativar verificações.');
    process.exitCode = await executarTestes({ selecao: selecao.length ? selecao : undefined });
  } catch (erro) { console.error(erro.message); process.exitCode = 1; }
}
