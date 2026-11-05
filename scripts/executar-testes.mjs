import { spawn } from 'node:child_process';
import { lstatSync, readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function concorrenciaTestes(valor, nucleos = availableParallelism()) {
  if (valor !== undefined && !/^[12]$/.test(String(valor))) {
    throw new Error('AVANTA_TEST_CONCURRENCY deve ser 1 ou 2.');
  }
  // Dois núcleos na Vercel; limite local também evita vários PostgreSQL/WASM
  // disputando a memória dos Macs de 8 GB e travando a interface.
  return Math.min(Number(valor ?? 2), Math.max(1, nucleos));
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
  const concorrencia = concorrenciaTestes(ambiente.AVANTA_TEST_CONCURRENCY);
  const env = ambienteTeste(ambiente);
  console.log(`[testes] ${arquivos.length} arquivos; ${concorrencia} processos isolados; suíte ${selecao?.length ? 'selecionada' : 'completa'}.`);
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
