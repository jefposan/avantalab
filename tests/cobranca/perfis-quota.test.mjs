import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  avaliarQuotaParaCriacao,
  ehCriacaoDePerfilAdicional,
  papelPodeConsumirQuotaDePerfis,
  resolverEmpresaOrigemDaCriacao,
} from '../../app/lib/perfis-quota.ts';

test('criação inline em Gerenciar perfis usa o perfil atual como origem', () => {
  assert.equal(ehCriacaoDePerfilAdicional(false, 'criar'), true);
  assert.equal(ehCriacaoDePerfilAdicional(true, null), true);
  assert.equal(ehCriacaoDePerfilAdicional(false, null), false);
  assert.equal(
    resolverEmpresaOrigemDaCriacao('limp-quality-id', true),
    'limp-quality-id',
  );
  assert.equal(resolverEmpresaOrigemDaCriacao('limp-quality-id', false), undefined);
});

test('somente gestores podem consumir a quota do perfil assinante', () => {
  assert.equal(papelPodeConsumirQuotaDePerfis('gestor_master'), true);
  assert.equal(papelPodeConsumirQuotaDePerfis('administrador'), true);
  assert.equal(papelPodeConsumirQuotaDePerfis('operador_completo'), false);
  assert.equal(papelPodeConsumirQuotaDePerfis('operador_simples'), false);
});

test('Business Pro compartilha a assinatura enquanto houver vaga', () => {
  const resultado = avaliarQuotaParaCriacao({
    plano: 'business_pro',
    usados: 1,
    limite: 10,
    origemEmpresaId: 'limp-quality-id',
  }, 'empresa', ['pessoal', 'empresa']);

  assert.deepEqual(resultado, {
    tipoPermitido: true,
    temVaga: true,
    possuiAssinaturaOrigem: true,
    compartilhaAssinatura: true,
  });
});

test('empresa fora da quota segue independente sem herdar a assinatura', () => {
  const quotaCheia = avaliarQuotaParaCriacao({
    plano: 'business_pro',
    usados: 10,
    limite: 10,
    origemEmpresaId: 'limp-quality-id',
  }, 'empresa', ['pessoal', 'empresa']);
  const semOrigem = avaliarQuotaParaCriacao({
    plano: 'free',
    usados: 0,
    limite: 1,
    origemEmpresaId: null,
  }, 'empresa', ['pessoal']);

  assert.equal(quotaCheia.compartilhaAssinatura, false);
  assert.equal(quotaCheia.possuiAssinaturaOrigem, true);
  assert.equal(semOrigem.compartilhaAssinatura, false);
  assert.equal(semOrigem.tipoPermitido, false);
});

test('reconciliação preserva assinaturas e restringe execução ao servidor', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260817190000_reconciliar_perfis_quota_assinatura.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /gateway_subscription_id is null/);
  assert.match(sql, /titular_origem\.perfil = 'gestor_master'/);
  assert.match(sql, /revoke all on function public\.reconciliar_perfis_quota\(uuid\) from authenticated/);
  assert.match(sql, /grant execute on function public\.reconciliar_perfis_quota\(uuid\) to service_role/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.assinaturas/i);
});
