import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const loadModule = createRequire(import.meta.url);
let compiledDir;
let permiteInstalacaoModuloSemCobranca;
let resolverAcessoComercialModulo;

before(() => {
  compiledDir = mkdtempSync(path.join(tmpdir(), 'avanta-modulos-tests-'));
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/lib/cobranca.ts',
    'app/lib/planos-comerciais.ts',
    'app/lib/modulos-acesso-comercial.ts',
    '--outDir', compiledDir,
    '--module', 'commonjs',
    '--target', 'ES2022',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  ({
    permiteInstalacaoModuloSemCobranca,
    resolverAcessoComercialModulo,
  } = loadModule(path.join(compiledDir, 'modulos-acesso-comercial.js')));
});

after(() => { if (compiledDir) rmSync(compiledDir, { recursive: true, force: true }); });

const baseEmpresa = {
  tipoPerfil: 'empresa',
  validoAte: null,
  trialFim: null,
  ciclo: null,
  modoRevisao: false,
};

test('cortesia empresarial vigente libera instalação sem cobrança', () => {
  const acesso = resolverAcessoComercialModulo({
    ...baseEmpresa,
    status: 'cortesia',
    plano: null,
  }, true);

  assert.equal(acesso, 'cortesia');
  assert.equal(permiteInstalacaoModuloSemCobranca(acesso), true);
});

test('Business contrata módulo e Business Pro instala sem cobrança', () => {
  const business = resolverAcessoComercialModulo({
    ...baseEmpresa,
    status: 'ativa',
    plano: 'business',
  }, true);
  const businessPro = resolverAcessoComercialModulo({
    ...baseEmpresa,
    status: 'ativa',
    plano: 'business_pro',
  }, true);

  assert.equal(business, 'business');
  assert.equal(permiteInstalacaoModuloSemCobranca(business), false);
  assert.equal(businessPro, 'business_pro');
  assert.equal(permiteInstalacaoModuloSemCobranca(businessPro), true);
});

test('cortesia expirada e perfil pessoal não liberam módulos empresariais', () => {
  const expirada = resolverAcessoComercialModulo({
    ...baseEmpresa,
    status: 'cortesia',
    validoAte: '2020-01-01T00:00:00.000Z',
    plano: null,
  }, true);
  const pessoal = resolverAcessoComercialModulo({
    ...baseEmpresa,
    tipoPerfil: 'pessoal',
    status: 'cortesia',
    plano: 'pessoal_premium',
  }, true);

  assert.equal(expirada, null);
  assert.equal(pessoal, null);
});

test('cobrança desligada preserva a liberação geral', () => {
  const acesso = resolverAcessoComercialModulo(null, false);
  assert.equal(acesso, 'liberado');
  assert.equal(permiteInstalacaoModuloSemCobranca(acesso), true);
});
