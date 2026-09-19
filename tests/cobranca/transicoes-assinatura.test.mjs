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
let classificarAlteracaoAssinatura;
let alteracaoAgendadaEstaVigente;
let alteracaoAgendadaDeveSerAplicada;
let referenciaConferePlanoAtualOuAgendado;

before(() => {
  compiledDir = mkdtempSync(path.join(tmpdir(), 'avanta-transicoes-assinatura-'));
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/lib/assinatura-transicoes.ts',
    '--outDir', compiledDir,
    '--module', 'commonjs',
    '--target', 'ES2022',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  ({
    classificarAlteracaoAssinatura,
    alteracaoAgendadaEstaVigente,
    alteracaoAgendadaDeveSerAplicada,
    referenciaConferePlanoAtualOuAgendado,
  } = loadModule(path.join(compiledDir, 'assinatura-transicoes.js')));
});

after(() => { if (compiledDir) rmSync(compiledDir, { recursive: true, force: true }); });

const classificar = (planoAtual, planoSolicitado, cicloAtual = 'mensal', cicloSolicitado = cicloAtual) => (
  classificarAlteracaoAssinatura({ planoAtual, planoSolicitado, cicloAtual, cicloSolicitado })
);

test('upgrade de nível no mesmo ciclo é imediato', () => {
  assert.equal(classificar('business', 'business_pro'), 'upgrade_imediato');
  assert.equal(classificar('business', 'business_premium'), 'upgrade_imediato');
  assert.equal(classificar('business_pro', 'business_premium'), 'upgrade_imediato');
});

test('downgrade e toda mudança de ciclo são agendados', () => {
  assert.equal(classificar('business_premium', 'business_pro'), 'alteracao_agendada');
  assert.equal(classificar('business_premium', 'business'), 'alteracao_agendada');
  assert.equal(classificar('business_pro', 'business'), 'alteracao_agendada');
  assert.equal(classificar('business', 'business', 'mensal', 'anual'), 'alteracao_agendada');
  assert.equal(classificar('business', 'business_pro', 'mensal', 'anual'), 'alteracao_agendada');
});

test('plano e ciclo iguais não geram alteração', () => {
  assert.equal(classificar('business', 'business'), 'sem_alteracao');
  assert.equal(classificar('business_pro', 'business_pro', 'anual'), 'sem_alteracao');
  assert.equal(classificar('business_premium', 'business_premium'), 'sem_alteracao');
});

test('data efetiva separa período vigente e momento de aplicação', () => {
  const agora = new Date('2026-09-19T12:00:00Z');
  const futura = { plano: 'business', ciclo: 'mensal', efetivaEm: '2026-10-19T12:00:00Z' };
  const vencida = { plano: 'business', ciclo: 'mensal', efetivaEm: '2026-09-19T11:59:59Z' };
  assert.equal(alteracaoAgendadaEstaVigente(futura, agora), true);
  assert.equal(alteracaoAgendadaDeveSerAplicada(futura, agora), false);
  assert.equal(alteracaoAgendadaEstaVigente(vencida, agora), false);
  assert.equal(alteracaoAgendadaDeveSerAplicada(vencida, agora), true);
});

test('webhook aceita referência atual ou futura, mas rejeita outro perfil', () => {
  const base = {
    empresaId: '11111111-1111-4111-8111-111111111111',
    planoAtual: 'business_premium',
    cicloAtual: 'mensal',
    alteracaoAgendada: { plano: 'business', ciclo: 'anual', efetivaEm: '2026-10-19T12:00:00Z' },
  };
  assert.equal(referenciaConferePlanoAtualOuAgendado({
    ...base,
    referencia: { empresaId: base.empresaId, plano: 'business_premium', ciclo: 'mensal' },
  }), true);
  assert.equal(referenciaConferePlanoAtualOuAgendado({
    ...base,
    referencia: { empresaId: base.empresaId, plano: 'business', ciclo: 'anual' },
  }), true);
  assert.equal(referenciaConferePlanoAtualOuAgendado({
    ...base,
    referencia: { empresaId: '22222222-2222-4222-8222-222222222222', plano: 'business', ciclo: 'anual' },
  }), false);
});

test('API, webhook, conciliação e banco implementam a alteração agendada', async () => {
  const [api, estado, webhook, cron, migracao, interfaceWeb, interfaceMobile] = await Promise.all([
    readFile(new URL('../../app/api/cobranca/gerenciar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/estado/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/webhook/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/conciliar-cobrancas/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/migrations/20260919143000_alteracoes_assinatura_agendadas.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/AssinaturaModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../public/mobile-app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(api, /classificarAlteracaoAssinatura/);
  assert.match(api, /calcularFimPeriodoPago/);
  assert.match(api, /plano_agendado: plano/);
  assert.match(api, /cancelarAlteracaoAgendada/);
  assert.match(webhook, /aplicar_alteracao_assinatura_agendada/);
  assert.match(cron, /alteracoesAgendadasAplicadas/);
  assert.match(estado, /referenciaConferePlanoAtualOuAgendado/);
  assert.match(estado, /referenciaAssinatura && !referenciaAtualValida/);
  assert.match(migracao, /for update/);
  assert.match(migracao, /plano = v_assinatura\.plano_agendado/);
  assert.match(interfaceWeb, /Cancelar alteração agendada/);
  assert.match(interfaceWeb, /Downgrade mantém o plano atual até o fim do período pago/);
  assert.match(interfaceWeb, /detalhes\?\.valorContratado \?\? assinatura\.valor/);
  assert.match(interfaceMobile, /data-assinatura-alterar-plano/);
  assert.match(interfaceMobile, /cancelarAlteracaoAssinaturaMobile/);
  assert.match(interfaceMobile, /state\.assinaturaPlanoSelecionado \|\| 'business'/);
});
