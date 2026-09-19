import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const loadModule = createRequire(import.meta.url);
let compiledDir;
let planoPermiteCentrosDeCusto;
let validarLimiteDeFuncionariosPonto;
let validarLimiteDeUsuarios;

before(() => {
  process.env.NEXT_PUBLIC_COBRANCA_ATIVA = 'true';
  compiledDir = mkdtempSync(path.join(tmpdir(), 'avanta-limites-planos-tests-'));
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/lib/cobranca.ts',
    'app/lib/planos-comerciais.ts',
    'app/lib/limites-comerciais-servidor.ts',
    '--outDir', compiledDir,
    '--module', 'commonjs',
    '--target', 'ES2022',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  ({
    planoPermiteCentrosDeCusto,
    validarLimiteDeFuncionariosPonto,
    validarLimiteDeUsuarios,
  } = loadModule(path.join(compiledDir, 'limites-comerciais-servidor.js')));
});

after(() => { if (compiledDir) rmSync(compiledDir, { recursive: true, force: true }); });

const estado = (plano) => ({
  tipoPerfil: 'empresa',
  status: 'ativa',
  validoAte: null,
  trialFim: null,
  plano,
  ciclo: 'mensal',
});

function bancoComFuncionariosAtivos(quantidade) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async eq() {
                  return { count: quantidade, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

function bancoComUsuariosAtivos(quantidade) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    async neq() {
                      return { count: quantidade, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('Centros de custo ficam disponíveis somente a partir do Business Pro', () => {
  assert.equal(planoPermiteCentrosDeCusto(estado('business'), true), false);
  assert.equal(planoPermiteCentrosDeCusto(estado('business_pro'), true), true);
  assert.equal(planoPermiteCentrosDeCusto(estado('business_premium'), true), true);
  assert.equal(planoPermiteCentrosDeCusto(estado('business'), false), true);
});

test('Controle de Ponto aplica os limites 10, 30 e ilimitado', async () => {
  const basicoComNove = await validarLimiteDeFuncionariosPonto(
    bancoComFuncionariosAtivos(9), 'empresa-1', estado('business'), true,
  );
  const basicoComDez = await validarLimiteDeFuncionariosPonto(
    bancoComFuncionariosAtivos(10), 'empresa-1', estado('business'), true,
  );
  const proComTrinta = await validarLimiteDeFuncionariosPonto(
    bancoComFuncionariosAtivos(30), 'empresa-1', estado('business_pro'), true,
  );
  const premium = await validarLimiteDeFuncionariosPonto(
    { from() { throw new Error('Premium não deve consultar contagem.'); } },
    'empresa-1', estado('business_premium'), true,
  );

  assert.deepEqual(basicoComNove, { permitido: true });
  assert.equal(basicoComDez.permitido, false);
  assert.match(basicoComDez.mensagem, /até 10 funcionários ativos/);
  assert.equal(proComTrinta.permitido, false);
  assert.match(proComTrinta.mensagem, /Business Premium/);
  assert.deepEqual(premium, { permitido: true });
});

test('Usuários aplicam exatamente as bordas 1, 3 e 10 sem cadastros manuais', async () => {
  for (const [plano, permitidoCom, bloqueadoCom] of [
    ['business', 0, 1],
    ['business_pro', 2, 3],
    ['business_premium', 9, 10],
  ]) {
    assert.deepEqual(
      await validarLimiteDeUsuarios(bancoComUsuariosAtivos(permitidoCom), 'empresa-1', estado(plano)),
      { permitido: true },
    );
    const bloqueado = await validarLimiteDeUsuarios(
      bancoComUsuariosAtivos(bloqueadoCom), 'empresa-1', estado(plano),
    );
    assert.equal(bloqueado.permitido, false);
  }
});

test('Web, Mobile e API usam a configuração protegida de Centros de custo', async () => {
  const [web, mobile, api] = await Promise.all([
    readFile(new URL('../../app/gestao/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../public/mobile-app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/centros-custo/configurar/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(web, /fetch\('\/api\/centros-custo\/configurar'/);
  assert.match(web, /Disponível a partir do Business Pro/);
  assert.match(mobile, /fetch\('\/api\/centros-custo\/configurar'/);
  assert.match(mobile, /centrosCustoPermitidosPeloPlanoMobile/);
  assert.match(api, /planoPermiteCentrosDeCusto/);
  assert.match(api, /garantir_centro_custo_principal/);
});

test('mudança para Business Básico desativa somente benefícios incluídos', async () => {
  const migracao = await readFile(
    new URL('../../supabase/migrations/20260919133000_aplicar_direitos_planos_empresariais.sql', import.meta.url),
    'utf8',
  );

  assert.match(migracao, /centros_custo_ativo = false/);
  assert.match(migracao, /instalacao\.origem in \('plano_business_pro', 'cortesia'\)/);
  assert.doesNotMatch(migracao, /instalacao\.origem in \([^)]*assinatura_modulo/);
  assert.match(migracao, /assinatura_origem_empresa_id = null/);
  assert.match(migracao, /set status = 'inativo'/);
  assert.match(migracao, /set ativo = false/);
});
