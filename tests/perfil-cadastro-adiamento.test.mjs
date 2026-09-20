import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('o adiamento do cadastro é persistido no perfil, sem remover a validação da conclusão', () => {
  const route = read('app/api/perfil-cadastro/route.ts');
  const migration = read('supabase/migrations/20260917113000_permitir_adiar_cadastro_perfil.sql');
  const modal = read('app/components/CadastroPerfilModal.tsx');

  assert.match(migration, /add column if not exists adiado_em timestamptz/);
  assert.match(route, /adiado: Boolean\(normalizado\.adiado_em\)/);
  assert.match(route, /const adiar = corpo\.adiar === true/);
  assert.match(modal, /body: JSON\.stringify\(\{ empresaId, adiar: true \}\)/);
  assert.match(route, /concluido_em: cadastroAtual\?\.concluido_em \|\| new Date\(\)\.toISOString\(\), adiado_em: null/);
});

test('web e mobile não bloqueiam o uso comum depois do adiamento', () => {
  const web = read('app/gestao/page.tsx');
  const mobile = read('public/mobile-app.js');
  const modal = read('app/components/CadastroPerfilModal.tsx');

  assert.match(web, /cadastroPerfilStatus\?\.podeEditar/);
  assert.match(web, /!cadastroPerfilStatus\.adiado/);
  assert.match(web, /contexto="lembrete"/);
  assert.match(mobile, /status\.podeEditar === true && !status\.completo && !status\.adiado && !state\.cadastroPerfilAdiado/);
  assert.match(mobile, /telaCadastroPerfilMobile\('lembrete'\)/);
  assert.match(modal, />Preencher depois</);
  assert.match(modal, /Salvar rascunho/);
});

test('a assinatura e a emissão fiscal seguem exigindo os dados necessários', () => {
  const web = read('app/gestao/page.tsx');
  const fiscal = read('app/vendas/lib/server/nfe-issuance-preparation.mjs');

  assert.match(web, /!cadastroConfirmado && cadastroPerfilStatus && !cadastroPerfilStatus\.completo/);
  assert.match(fiscal, /Conclua o cadastro do perfil empresarial com o CNPJ antes de emitir a nota/);
});

test('configuração tributária fica no cadastro da empresa e não no formulário do produto', () => {
  const route = read('app/api/perfil-cadastro/route.ts');
  const modal = read('app/components/CadastroPerfilModal.tsx');
  const migration = read('supabase/migrations/20260920123000_configuracao_tributaria_empresa.sql');
  const rules = read('app/vendas/lib/server/commercial-fiscal-rules.mjs');

  assert.match(migration, /configuracao_fiscal jsonb/);
  assert.match(route, /normalizarConfiguracaoFiscal/);
  assert.match(modal, /Parâmetros tributários padrão/);
  assert.match(modal, /CFOP e natureza da operação são definidos na regra da própria emissão/);
  assert.match(rules, /function companyFiscalProfile/);
  assert.match(rules, /cfop: clean\(rule\.cfopOverride\)/);
});
