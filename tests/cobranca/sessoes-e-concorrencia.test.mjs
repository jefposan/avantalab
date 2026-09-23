import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('sessões empresariais são decididas no servidor por dispositivo e plano', async () => {
  const [rota, migracao, planos] = await Promise.all([
    readFile(new URL('../../app/api/cobranca/sessoes/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/migrations/20260923110000_sessoes_e_concorrencia_financeira.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/planos-comerciais.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(rota, /acao: AcaoSessao = corpo\.acao === 'verificar' \? 'verificar' : 'entrar'/);
  assert.match(rota, /permiteSessoesSimultaneasDoMesmoUsuario/);
  assert.match(rota, /neq\('dispositivo_id', dispositivoId\)/);
  assert.match(rota, /signOut\(token, 'others'\)/);
  assert.match(rota, /dispositivo nunca pode reativar-se por/);
  assert.match(migracao, /create table if not exists public\.sessoes_acesso/);
  assert.match(migracao, /unique \(user_id, dispositivo_id\)/);
  assert.match(migracao, /Usuário consulta as próprias sessões/);
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
  assert.match(mobile, /Esta receita foi alterada em outro dispositivo/);
  assert.match(mobile, /Esta despesa foi alterada em outro dispositivo/);
});
