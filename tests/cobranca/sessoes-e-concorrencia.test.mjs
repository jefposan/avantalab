import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('sessões empresariais são decididas no servidor por dispositivo e plano', async () => {
  const [rota, migracao, planos] = await Promise.all([
    readFile(new URL('../../app/api/cobranca/sessoes/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/migrations/20261007190000_sessoes_isoladas_por_perfil.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/planos-comerciais.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(rota, /acao: AcaoSessao = corpo\.acao === 'verificar' \? 'verificar' : 'entrar'/);
  assert.match(rota, /permiteSessoesSimultaneasDoMesmoUsuario/);
  assert.match(rota, /avantalab_confirmar_sessao_perfil/);
  assert.doesNotMatch(rota, /signOut\(/);
  assert.match(rota, /dispositivo nunca pode reativar-se por/);
  assert.match(migracao, /primary key \(user_id, empresa_id, sessao_auth_id\)/);
  assert.match(migracao, /pg_advisory_xact_lock/);
  assert.match(migracao, /not p_simultaneas and \(p_acao = 'entrar' or v_simultaneas\)/);
  assert.match(migracao, /empresa_id = p_empresa_id/);
  assert.match(migracao, /as restrictive for all/);
  assert.match(planos, /permiteSessoesSimultaneasDoMesmoUsuario: false/);
  assert.match(planos, /permiteSessoesSimultaneasDoMesmoUsuario: true/);
});

test('edições financeiras usam revisão e Mobile acompanha receitas em tempo real', async () => {
  const [migracao, web, mobile, banco] = await Promise.all([
    readFile(new URL('../../supabase/migrations/20260923110000_sessoes_e_concorrencia_financeira.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/gestao/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../public/mobile-app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/database.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(migracao, /add column if not exists revisao integer not null default 1/);
  assert.match(migracao, /avantalab_avancar_revisao_financeira/);
  assert.match(banco, /revisaoEsperada/);
  assert.match(banco, /\.eq\('revisao', revisaoEsperada\)/);
  assert.match(web, /revisaoEsperada: lancamentoAtual\?\.revisao/);
  assert.match(mobile, /table: 'faturamentos_entradas'/);
  assert.match(mobile, /table: 'faturamentos'/);
  const fila = await readFile(new URL('../../supabase/migrations/20261020190000_edicoes_financeiras_idempotentes.sql', import.meta.url), 'utf8');
  assert.match(fila, /v_receita\.revisao <> p_revisao[\s\S]*?outro dispositivo/);
  assert.match(fila, /v_despesa\.revisao <> p_revisao[\s\S]*?outro dispositivo/);
  assert.match(mobile, /codigo === '40001'[\s\S]*?não sobrescreveu o servidor/);
});
