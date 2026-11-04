import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { conferirOrigemProducao, REMOTO_OFICIAL } from '../../scripts/conferir-origem-producao.mjs';
const exec = promisify(execFile);
async function fixture(acao) {
  const pasta = await mkdtemp(join(tmpdir(), 'avanta-origem-test-'));
  try {
    const git = async args => (await exec('git', args, { cwd: pasta })).stdout;
    await git(['init', '-b', 'main']);
    await git(['config', 'user.name', 'Jeff']);
    await git(['config', 'user.email', 'jefposan@hotmail.com']);
    await git(['remote', 'add', 'origin', REMOTO_OFICIAL]);
    await mkdir(join(pasta, 'supabase/migrations'), { recursive: true });
    const path = 'supabase/migrations/20261104190000_exemplo.sql';
    const sql = 'begin;\nselect 1;\ncommit;\n';
    await writeFile(join(pasta, path), sql);
    await git(['add', path]);
    await git(['commit', '-m', 'fixture']);
    const hash = (await git(['rev-parse', 'HEAD'])).trim();
    let remote = hash;
    const chamadas = [];
    const rodar = async (bin, args) => {
      assert.equal(bin, 'git'); chamadas.push(args);
      if (args[0] === 'ls-remote') return `${remote}\trefs/heads/main`;
      const saida = await git(args);
      return args[0] === 'show' ? saida : saida.trim();
    };
    await acao({ pasta, git, hash, path, sql, rodar, chamadas, mudarRemoto: valor => { remote = valor; } });
  } finally { await rm(pasta, { recursive: true, force: true }); }
}
test('produção aceita SHA exato e SQL rastreado, incluindo a quebra de linha final', () => fixture(async f => {
  const manifesto = { migrations: [{ path: f.path, sha256: createHash('sha256').update(f.sql).digest('hex') }] };
  assert.equal((await conferirOrigemProducao({ rodar: f.rodar, manifesto })).hash, f.hash);
  assert.ok(f.chamadas.some(args => args[0] === 'ls-remote'));
}));
test('SHA fora da main, ancestral antigo e referência ilegível bloqueiam', () => fixture(async f => {
  for (const remote of ['a'.repeat(40), '', 'HEAD']) {
    f.mudarRemoto(remote);
    await assert.rejects(conferirOrigemProducao({ rodar: f.rodar, manifesto: { migrations: [] } }), /main/);
  }
}));
test('falha na rede não usa origin/main local como autorização', () => fixture(async f => {
  await assert.rejects(conferirOrigemProducao({ manifesto: { migrations: [] }, rodar: (bin,args) => {
    if(args[0] === 'ls-remote') throw Error('rede indisponível');
    return f.rodar(bin,args);
  }}), /rede indisponível/);
}));
test('remoto temporário e identidade divergente bloqueiam', () => fixture(async f => {
  await f.git(['remote','set-url','origin','/tmp/outro']);
  await assert.rejects(conferirOrigemProducao({ rodar:f.rodar,manifesto:{migrations:[]} }), /remoto oficial/);
  await f.git(['remote','set-url','origin',REMOTO_OFICIAL]);
  await f.git(['-c','user.name=Outro','-c','user.email=outro@example.com','commit','--allow-empty','-m','outro']);
  await assert.rejects(conferirOrigemProducao({ rodar:f.rodar,manifesto:{migrations:[]} }), /Autor e committer/);
}));
test('migração ausente do commit ou hash divergente bloqueiam', () => fixture(async f => {
  for (const migration of [
    { path: f.path, sha256: '0'.repeat(64) },
    { path: 'supabase/migrations/20261104190001_ausente.sql', sha256: '0'.repeat(64) },
    { path: '../fora.sql', sha256: '0'.repeat(64) },
  ]) await assert.rejects(conferirOrigemProducao({rodar:f.rodar,manifesto:{migrations:[migration]}}));
  await assert.rejects(conferirOrigemProducao({rodar:f.rodar,manifesto:{}}), /Declare migrations/);
}));

test('candidato com auditoria pendente bloqueia antes de qualquer consulta ou envio', async () => {
  await assert.rejects(conferirOrigemProducao({ manifesto: { reconciliationStatus: 'blocked-audit' }, rodar: () => { throw Error('não consultar'); } }), /auditoria pendente/);
});
