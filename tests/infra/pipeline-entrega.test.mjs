import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { ambienteTeste, arquivosTeste, concorrenciaTestes } from '../../scripts/executar-testes.mjs';
import { comTrava, conferirBase, conferirBuildProjeto, conferirFila, conferirIdentificacao, conferirProducaoDoDominio, publicar } from '../../scripts/publicar-vercel.mjs';

test('Enhanced expressamente autorizada mantém limites exatos e build completo',()=>{
 const resourceConfig={buildMachineSelection:'elastic',buildMachineType:'enhanced',elasticBuildMachine:{label:'enhanced',cores:8,memory:16384}};
 assert.doesNotThrow(()=>conferirBuildProjeto({resourceConfig,buildCommand:'npm run build'}));
 for(const change of [{cores:16},{memory:32768},{label:'turbo'}])assert.throws(()=>conferirBuildProjeto({resourceConfig:{...resourceConfig,elasticBuildMachine:{...resourceConfig.elasticBuildMachine,...change}}}),/bloqueado/);
 assert.throws(()=>conferirBuildProjeto({resourceConfig,buildCommand:'next build'}),/bloqueado/);
 assert.doesNotThrow(()=>conferirBuildProjeto({resourceConfig:{...resourceConfig,buildMachineSelection:'fixed'}}));
});

const root = resolve(import.meta.dirname, '../..');
test('base é o deployment READY do domínio oficial, não uma tentativa de publicação falha',()=>{
 const projectId='prj_AiYSXppfsqysQ4z0khaxb7EOFJP3';
 const alias={alias:'avantalab.com.br',projectId,deploymentId:'dpl_real',deployment:{id:'dpl_real'}};
 const ready={id:'dpl_real',projectId,readyState:'READY'};
 assert.doesNotThrow(()=>conferirBase({baseDeploymentId:'dpl_real'},conferirProducaoDoDominio(alias,ready)));
 assert.throws(()=>conferirBase({baseDeploymentId:'dpl_falho'},conferirProducaoDoDominio(alias,ready)),/base de produção mudou/);
 for(const bad of [{...ready,readyState:'ERROR'},{...ready,readyState:'BUILDING'},{...ready,id:'outro'},{...ready,projectId:'outro'}])assert.throws(()=>conferirProducaoDoDominio(alias,bad),/bloqueado/);
 for(const bad of [{...alias,alias:'outro.com.br'},{...alias,projectId:'outro'},{...alias,deploymentId:'outro'},{...alias,deployment:null}])assert.throws(()=>conferirProducaoDoDominio(bad,ready),/bloqueado/);
});
async function temporario(acao) {
  const pasta = await mkdtemp(resolve(tmpdir(), 'avanta-pipeline-test-'));
  try { return await acao(pasta); } finally { await rm(pasta, { recursive: true }); }
}

test('concorrência limitada usa dois processos em dois núcleos, sem aumentar a máquina', () => {
  assert.equal(concorrenciaTestes(undefined, 2), 2);
  assert.equal(concorrenciaTestes(undefined, 1), 1);
  assert.equal(concorrenciaTestes('1', 8), 1);
  assert.equal(concorrenciaTestes(undefined, 8), 2);
  for (const valor of ['0', '7', '8', 'texto', '']) assert.throws(() => concorrenciaTestes(valor), /1 ou 2/);
});

test('descoberta não perde testes na raiz/profundos, não segue symlink e recusa seleção vazia/externa', () => temporario(async pasta => {
  await mkdir(resolve(pasta, 'tests/a/b'), { recursive: true });
  for (const file of ['tests/raiz.test.mjs', 'tests/a/b/profundo.test.mjs', 'tests/a/helper.mjs']) await writeFile(resolve(pasta, file), '');
  await symlink(resolve(pasta, 'tests/raiz.test.mjs'), resolve(pasta, 'tests/link.test.mjs'));
  assert.equal(arquivosTeste(pasta).length, 2);
  assert.equal(arquivosTeste(pasta, ['tests', 'tests/raiz.test.mjs']).length, 2);
  assert.throws(() => arquivosTeste(pasta, ['package.json']), /dentro de tests/);
  assert.throws(() => arquivosTeste(pasta, ['tests/a/helper.mjs']), /Nenhum/);
  assert.throws(() => arquivosTeste(pasta, ['tests/ausente.test.mjs']), /não encontrado/);
  assert.throws(() => arquivosTeste(pasta, ['tests/link.test.mjs']), /simbólicos/);
}));

test('não cria cache extra de aprovação/compilação; cobertura desativa opt-in externo', () => {
  const normal = ambienteTeste({});
  assert.equal(normal.NODE_COMPILE_CACHE, undefined);
  assert.equal(ambienteTeste({ NODE_COMPILE_CACHE: '/opt-in-explicito' }).NODE_COMPILE_CACHE, '/opt-in-explicito');
  const cobertura = ambienteTeste({ NODE_V8_COVERAGE: '/coverage', NODE_COMPILE_CACHE: '/antigo' });
  assert.equal(cobertura.NODE_COMPILE_CACHE, undefined);
  assert.equal(cobertura.NODE_DISABLE_COMPILE_CACHE, '1');
  assert.equal(ambienteTeste({ NODE_DISABLE_COMPILE_CACHE: '1' }).NODE_COMPILE_CACHE, undefined);
  assert.equal(ambienteTeste({ NODE_TEST_CONTEXT: 'child-v8' }).NODE_TEST_CONTEXT, undefined);
});

test('falha real em assert propaga saída não zero; nenhum teste é pulado pelo runner', () => temporario(async pasta => {
  await mkdir(resolve(pasta, 'tests'));
  await writeFile(resolve(pasta, 'tests/falha.test.mjs'), "import test from 'node:test'; import assert from 'node:assert/strict'; test('falha proposital',()=>assert.equal(1,2));");
  const r = spawnSync(process.execPath, [resolve(root, 'scripts/executar-testes.mjs')], { cwd: pasta, encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /falha proposital/);
}));

test('tipagem mantém todo app e tipos Next, removendo só raízes de artefatos', () => {
  const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile).config;
  const lido = ts.parseJsonConfigFileContent(config, ts.sys, root);
  assert.equal(lido.errors.length, 0);
  assert.ok(lido.fileNames.some(f => f.endsWith('/app/gestao/page.tsx')));
  assert.ok(lido.fileNames.some(f => f.endsWith('/app/lib/acessos-usuario-servidor.ts')));
  assert.ok(config.include.includes('.next/types/**/*.ts'));
  assert.equal(config.compilerOptions.strict, true);
  assert.ok(!lido.fileNames.some(f => /\/(outputs|output|native|ios|android)\//.test(f)));
});

test('build obrigatório continua com suíte completa, validadores e Next; sem salto de TypeScript', async () => {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.test, 'node scripts/executar-testes.mjs');
  assert.match(pkg.scripts.build, /npm test/);
  for (const nome of ['padrao-avanta', 'conhecimento-ava', 'acesso-mobile', 'acesso-web', 'notificacoes-perfil']) assert.ok(pkg.scripts.build.includes('verificar-' + nome));
  assert.match(pkg.scripts.build, /next build --webpack$/);
  assert.doesNotMatch(await readFile(resolve(root, 'next.config.ts'), 'utf8'), /ignoreBuildErrors\s*:\s*true/);
});

test('fila bloqueia segundo envio, não cancela trabalho e falha fechada em resposta inválida', () => {
  for (const state of ['BUILDING', 'QUEUED', 'INITIALIZING']) assert.throws(() => conferirFila({ deployments: [{ state }] }), /andamento/);
  assert.throws(() => conferirFila({}), /bloqueado/);
  assert.doesNotThrow(() => conferirFila({ deployments: [{ state: 'READY' }, { state: 'ERROR' }] }));
});

test('produção exige base atual; pacote antigo não sobrescreve uma entrega concorrente', () => {
  const atual = { targets: { production: { id: 'dpl_atual' } } };
  assert.doesNotThrow(() => conferirBase({ baseDeploymentId: 'dpl_atual' }, atual));
  assert.throws(() => conferirBase({ baseDeploymentId: 'dpl_anterior' }, atual), /base de produção/);
  assert.throws(() => conferirBase({}, atual), /base de produção/);
  assert.throws(() => conferirBase({ baseDeploymentId: 'dpl_atual' }, {}), /base de produção/);
});

test('configuração remota não pode dispensar o gate nem elevar a máquina por este fluxo', () => {
  const base = { resourceConfig: { buildMachineType: 'basic' }, buildCommand: null };
  assert.doesNotThrow(() => conferirBuildProjeto(base));
  assert.doesNotThrow(() => conferirBuildProjeto({ ...base, buildCommand: 'npm run build' }));
  assert.throws(() => conferirBuildProjeto({ ...base, buildCommand: 'next build' }), /bloqueado/);
  assert.throws(() => conferirBuildProjeto({ ...base, resourceConfig: { buildMachineType: 'turbo' } }), /bloqueado/);
  assert.throws(() => conferirBuildProjeto({}), /bloqueado/);
});

test('Elastic/Standard existente é aceito sem alteração remota nem dispensa do build completo', () => {
  const atual = { resourceConfig: { buildMachineType: 'standard', buildMachineSelection: 'elastic', elasticConcurrencyEnabled: true, elasticBuildMachine: { label: 'standard', cores: 4, memory: 8192 } }, buildCommand: null };
  const original = structuredClone(atual);
  assert.doesNotThrow(() => conferirBuildProjeto(atual));
  assert.doesNotThrow(() => conferirBuildProjeto({ ...atual, buildCommand: 'npm run build' }));
  assert.deepEqual(atual, original);
  for (const buildCommand of ['next build', 'npm test', 'npm run build -- --ignore-errors']) {
    assert.throws(() => conferirBuildProjeto({ ...atual, buildCommand }), /bloqueado/);
  }
  for (const elasticBuildMachine of [undefined, { label: 'turbo', cores: 30, memory: 61440 }, { label: 'standard', cores: 8, memory: 8192 }, { label: 'standard', cores: 4, memory: 16384 }]) {
    assert.throws(() => conferirBuildProjeto({ ...atual, resourceConfig: { ...atual.resourceConfig, elasticBuildMachine } }), /bloqueado/);
  }
  assert.throws(() => conferirBuildProjeto({ ...atual, resourceConfig: { ...atual.resourceConfig, buildMachineSelection: 'fixed' } }), /bloqueado/);
});

test('trava é exclusiva, preserva trava existente e libera em sucesso ou erro', () => temporario(async pasta => {
  const lock = resolve(pasta, 'envio.lock');
  await comTrava(lock, async () => assert.rejects(comTrava(lock, async () => {}), /Outro envio/));
  await assert.rejects(comTrava(lock, async () => { throw Error('falha controlada'); }), /controlada/);
  await comTrava(lock, async () => {});
}));

test('snapshot exige versão/resumo e rejeita segredos; raiz compartilhada nunca é enviada', async () => {
  const resumo = '3.2.0.85 — Infraestrutura: build seguro';
  assert.doesNotThrow(() => conferirIdentificacao('3.2.0.85', resumo, ['app/page.tsx']));
  for (const file of ['.env.local', 'pasta/.env', '.backups/db.sql', 'certificado.p12']) assert.throws(() => conferirIdentificacao('3.2.0.85', resumo, [file]), /sensíveis/);
  assert.throws(() => conferirIdentificacao('3.2.0.85', 'resumo sem versão', []), /identificação/);
  await assert.rejects(publicar({ pasta: root, executar: () => { throw Error('Não chamar rede'); } }), /checkout compartilhado/);
});

test('upload simulado conserva build remoto, identificação visível e preview por padrão', () => temporario(async pasta => {
  pasta = await realpath(pasta);
  await mkdir(resolve(pasta, '.vercel'));
  await mkdir(resolve(pasta, 'app/lib'), { recursive: true });
  await writeFile(resolve(pasta, '.vercel/project.json'), JSON.stringify({ projectId: 'prj_AiYSXppfsqysQ4z0khaxb7EOFJP3', orgId: 'team_4AGRJbnDI1pfFrCMbqZM0U6U' }));
  await writeFile(resolve(pasta, 'app/lib/version.ts'), "export const APP_VERSION = '3.2.0.85';");
  await writeFile(resolve(pasta, 'package.json'), JSON.stringify({ scripts: { build: 'npm test && next build', test: 'node scripts/executar-testes.mjs' } }));
  const resumo = '3.2.0.85 — Infraestrutura: build seguro', chamadas = [];
  const executar = async (bin, args) => {
    chamadas.push({ bin, args });
    if (bin === 'git') {
      const chave = args.join(' ');
      return { stdout: chave === 'rev-parse --show-toplevel' ? pasta : chave === 'status --porcelain' ? '' : chave === 'rev-parse HEAD' ? 'pipeline-fixture-unico' : chave === 'ls-files' ? 'app/lib/version.ts' : resumo };
    }
    if (args[0] === 'deploy') return { stdout: 'https://fixture-pipeline.vercel.app' };
    if (args[1].startsWith('/v6/')) return { stdout: JSON.stringify({ deployments: [] }) };
    if (args[1].startsWith('/v9/')) return { stdout: JSON.stringify({ resourceConfig: { buildMachineType: 'basic' }, buildCommand: null }) };
    return { stdout: JSON.stringify({ id: 'dpl_simulado', readyState: 'BUILDING', meta: { githubCommitMessage: resumo } }) };
  };
  const recibo = await publicar({ pasta, cli: 'vercel-simulado', executar });
  assert.equal(recibo.estado, 'BUILDING');
  assert.equal(recibo.destino, 'preview');
  assert.equal(recibo.identificacaoConferida, true);
  const envio = chamadas.find(c => c.args[0] === 'deploy').args;
  for (const proibido of ['--prod', '--prebuilt', '--force', '--turbo']) assert.ok(!envio.includes(proibido));
  assert.ok(chamadas.every(c => c.bin === 'git' || c.args[0] === 'api' || c.args[0] === 'deploy'));
  assert.ok(chamadas.filter(c => c.args[0] === 'api').every(c => !c.args.some(a => /^(POST|PATCH|PUT|DELETE)$/.test(a))));
  assert.ok(envio.includes('--no-wait'));
  assert.ok(envio.includes('githubCommitMessage=' + resumo));
}));
