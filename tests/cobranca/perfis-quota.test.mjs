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
    limite: 3,
    origemEmpresaId: 'limp-quality-id',
  }, 'empresa', ['empresa']);

  assert.deepEqual(resultado, {
    tipoPermitido: true,
    temVaga: true,
    possuiAssinaturaOrigem: true,
    compartilhaAssinatura: true,
    requerPerfilEmpresarialAdicional: false,
  });
});

test('franquias 1, 3 e 10 bloqueiam exatamente o próximo perfil', () => {
  for (const [plano, limite] of [
    ['business', 1],
    ['business_pro', 3],
    ['business_premium', 10],
  ]) {
    const ultimaVaga = avaliarQuotaParaCriacao({
      plano,
      usados: limite - 1,
      limite,
      origemEmpresaId: 'origem-id',
    }, 'empresa', ['empresa']);
    const cheia = avaliarQuotaParaCriacao({
      plano,
      usados: limite,
      limite,
      origemEmpresaId: 'origem-id',
    }, 'empresa', ['empresa']);
    assert.equal(ultimaVaga.compartilhaAssinatura, true);
    assert.equal(cheia.compartilhaAssinatura, false);
    assert.equal(cheia.requerPerfilEmpresarialAdicional, plano === 'business_pro' || plano === 'business_premium');
  }
});

test('perfil além da franquia do Business Pro ou Premium exige cobrança mensal e só libera após confirmação', async () => {
  const [sql, rota, webhook, resolvedor, referencia, web, mobile] = await Promise.all([
    readFile(new URL('../../supabase/migrations/20260922113000_perfis_adicionais_business_premium.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/perfis-adicionais/assinar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/webhook/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/cobranca-servidor.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/cobranca-referencia.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/gestao/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../public/mobile-app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(sql, /valor_mensal numeric\(10,2\) not null default 14\.99/);
  assert.match(sql, /v_limite_incluido := case when v_assinatura\.plano = 'business_premium' then 10 else 3 end/);
  assert.match(sql, /v_usados < v_limite_incluido/);
  assert.match(sql, /p_user_id, trim\(p_nome\), 'pendente_pagamento'/);
  assert.match(sql, /grant execute on function public\.criar_perfil_adicional_business_pendente[\s\S]*to service_role/);
  assert.match(rota, /VALOR_PERFIL_EMPRESARIAL_ADICIONAL_MENSAL/);
  assert.match(rota, /criarReferenciaPerfilAdicional/);
  assert.match(rota, /criar_perfil_adicional_business_pendente/);
  assert.match(webhook, /processarCobrancaPerfilAdicional/);
  assert.match(webhook, /status: 'ativa'/);
  assert.match(resolvedor, /assinaturas_perfis_adicionais/);
  assert.match(resolvedor, /adicionalVigente/);
  assert.match(await readFile(new URL('../../supabase/functions/conciliar-cobrancas/index.ts', import.meta.url), 'utf8'), /assinaturas_perfis_adicionais/);
  assert.match(referencia, /perfil_adicional:/);
  assert.match(web, /PerfilAdicionalPremiumModal/);
  assert.match(web, /perfilAdicionalEmpresarial/);
  assert.match(mobile, /contratarPerfilAdicionalPremiumMobile/);
  assert.match(mobile, /perfilAdicionalEmpresarial/);
});

test('empresa fora da quota segue independente sem herdar a assinatura', () => {
  const quotaCheia = avaliarQuotaParaCriacao({
    plano: 'business_pro',
    usados: 3,
    limite: 3,
    origemEmpresaId: 'limp-quality-id',
  }, 'empresa', ['empresa']);
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

test('criação e cupom são transacionais e restritos ao servidor', async () => {
  const [sql, rotaCriacao] = await Promise.all([
    readFile(
      new URL('../../supabase/migrations/20260817210000_auditoria_fluxo_assinaturas.sql', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../../app/api/criar-perfil/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(p_user_id::text, 0\)\)/);
  assert.match(sql, /create or replace function public\.criar_perfil_financeiro_seguro/);
  assert.match(sql, /create or replace function public\.resgatar_cupom_perfil/);
  assert.match(sql, /select \* into v_cupom[\s\S]*for update/);
  assert.match(sql, /revoke all on function public\.criar_perfil_financeiro_seguro[\s\S]*from authenticated/);
  assert.match(sql, /grant execute on function public\.criar_perfil_financeiro_seguro[\s\S]*to service_role/);
  assert.match(rotaCriacao, /rpc\('criar_perfil_financeiro_seguro'/);
  assert.doesNotMatch(rotaCriacao, /from\('empresas'\)\.insert/);
});

test('assinatura própria só libera a vaga depois do pagamento confirmado', async () => {
  const [sql, rotaAssinar, webhook, conciliacao, modal] = await Promise.all([
    readFile(
      new URL('../../supabase/migrations/20260817220000_assinatura_propria_perfil_compartilhado.sql', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../../app/api/cobranca/assinar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/webhook/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/conciliar-cobrancas/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/AssinaturaModal.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(sql, /select \* into v_empresa[\s\S]*for update/);
  assert.match(sql, /select \* into v_assinatura[\s\S]*for update/);
  assert.match(sql, /status = 'ativa'[\s\S]*assinatura_origem_empresa_id = null/);
  assert.match(sql, /assinatura_origem_anterior_empresa_id = v_origem_empresa_id/);
  assert.match(sql, /revoke all on function public\.ativar_assinatura_propria_perfil[\s\S]*from authenticated/);
  assert.match(sql, /grant execute on function public\.ativar_assinatura_propria_perfil[\s\S]*to service_role/);
  assert.doesNotMatch(rotaAssinar, /assinatura_origem_empresa_id:\s*null/);
  assert.match(rotaAssinar, /assinaturaPropriaSolicitada/);
  assert.match(rotaAssinar, /cortesiaVigente/);
  assert.match(rotaAssinar, /Cancele primeiro a renovação dos módulos avulsos/);
  assert.match(webhook, /rpc\('ativar_assinatura_propria_perfil'/);
  assert.match(conciliacao, /rpc\('ativar_assinatura_propria_perfil'/);
  assert.match(modal, /Criar assinatura própria/);
  assert.match(modal, /será mantido até a confirmação do pagamento/);
});
