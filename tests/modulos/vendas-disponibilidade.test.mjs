import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  filtrarModulosDisponiveisParaEmpresa,
  moduloDisponivelParaEmpresa,
  VENDAS_PILOTO_EMPRESA_ID,
} from '../../app/lib/modulos-disponibilidade.ts';

test('o piloto de Vendas pertence à empresa Tridium, nunca a um login', () => {
  assert.equal(moduloDisponivelParaEmpresa('vendas', VENDAS_PILOTO_EMPRESA_ID), true);
  assert.equal(moduloDisponivelParaEmpresa('vendas', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false);
  assert.equal(moduloDisponivelParaEmpresa('custos', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), true);
});

test('o catálogo remove somente Vendas fora da empresa piloto', () => {
  const catalogo = [{ id: 'custos' }, { id: 'vendas' }];
  assert.deepEqual(filtrarModulosDisponiveisParaEmpresa(catalogo, VENDAS_PILOTO_EMPRESA_ID), catalogo);
  assert.deepEqual(filtrarModulosDisponiveisParaEmpresa(catalogo, 'outra-empresa'), [{ id: 'custos' }]);
});

test('listar, instalar e assinar repetem a trava no servidor', () => {
  const listar = readFileSync('app/api/cobranca/modulos/listar/route.ts', 'utf8');
  const ativar = readFileSync('app/api/cobranca/modulos/ativar/route.ts', 'utf8');
  const assinar = readFileSync('app/api/cobranca/modulos/assinar/route.ts', 'utf8');
  assert.match(listar, /filtrarModulosDisponiveisParaEmpresa/);
  assert.match(ativar, /moduloDisponivelParaEmpresa\(moduloId, empresaId\)/);
  assert.match(assinar, /moduloDisponivelParaEmpresa\(moduloId, empresaId\)/);
});

test('o emissor fiscal é resolvido pelo cadastro da empresa', () => {
  const resolver = readFileSync('app/vendas/lib/server/commercial-runtime-resolvers.mjs', 'utf8');
  const bridge = readFileSync('app/vendas/lib/management-catalog-bridge.mjs', 'utf8');
  const tela = readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  assert.match(resolver, /from public\.cadastros_perfil cadastro/);
  assert.match(resolver, /where cadastro\.empresa_id=\$1/);
  assert.match(bridge, /text\(profile\.empresa_id\) !== companyId/);
  assert.match(tela, /companyStorageKey/);
  assert.match(tela, /company: moduleSettings\.company/);
});

test('a credencial PostgreSQL do piloto aplica menor privilégio e RLS da Tridium', () => {
  const provisionamento = readFileSync('supabase/migrations/20260905165000_vendas_runtime_credencial.sql', 'utf8');
  const fechamento = readFileSync('supabase/migrations/20260905166000_vendas_runtime_fechamento.sql', 'utf8');
  const integradas = readFileSync('supabase/migrations/20260907164500_vendas_runtime_permissoes_integradas.sql', 'utf8');
  assert.match(provisionamento, /noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls/);
  assert.doesNotMatch(provisionamento, /grant service_role to avanta_vendas_runtime/i);
  assert.match(provisionamento, /create policy vendas_runtime_tridium/);
  assert.match(provisionamento, /ec9604fd-38f2-429b-9c00-c4bc6c642b0e/);
  assert.match(fechamento, /drop function public\.vendas_definir_senha_runtime/);
  assert.match(fechamento, /session_user = 'avanta_vendas_runtime'/);
  assert.match(integradas, /grant select, insert, update on table public\.vendas_fornecedores[\s\S]*to avanta_vendas_runtime/i);
  assert.match(integradas, /grant select, insert on table public\.vendas_fiscal_rascunho_cancelamentos[\s\S]*to avanta_vendas_runtime/i);
  assert.equal((integradas.match(/ec9604fd-38f2-429b-9c00-c4bc6c642b0e/g) || []).length, 4);
});

test('o runtime fiscal exige validação TLS e aceita a CA oficial por variável protegida', () => {
  const runtime = readFileSync('app/vendas/lib/server/fiscal-status-runtime.mjs', 'utf8');
  assert.match(runtime, /FISCAL_DATABASE_CA_PEM/);
  assert.match(runtime, /rejectUnauthorized: true/);
  assert.doesNotMatch(runtime, /FISCAL_DATABASE_TLS_VERIFY/);
});

test('a trava do piloto é composta no runtime de acesso, fora do construtor do certificado', () => {
  const runtime = readFileSync('app/vendas/lib/server/fiscal-status-runtime.mjs', 'utf8');
  const certificateFactory = runtime.slice(
    runtime.indexOf('function createCertificateRuntime'),
    runtime.indexOf('function createStatusRuntime'),
  );
  assert.doesNotMatch(certificateFactory, /authClient|accessRepository|baseAccessResolver/);
  assert.match(runtime, /const baseAccessResolver = createAvantaLabAccessResolver\(\{ authClient, accessRepository \}\)/);
  assert.match(runtime, /boundary\?\.companyId\) !== VENDAS_PILOTO_EMPRESA_ID/);
});
