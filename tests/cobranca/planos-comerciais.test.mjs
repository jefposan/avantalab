import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLANOS_EMPRESARIAIS,
  PLANOS_COMERCIAIS,
  VALOR_MODULO_AVULSO_MENSAL,
  normalizarPlanoComercial,
  resolverPlanoCortesia,
} from '../../app/lib/planos-comerciais.ts';
import { PRECOS, assinaturaVigente, rotuloPlano } from '../../app/lib/cobranca.ts';

test('catálogo comercial mantém preços e limites aprovados', () => {
  assert.deepEqual(PLANOS_EMPRESARIAIS, ['business', 'business_pro', 'business_premium']);
  assert.deepEqual(PLANOS_COMERCIAIS.pessoal_premium.precos, { mensal: 9.9, anual: 99.9 });
  assert.deepEqual(PLANOS_COMERCIAIS.business.precos, { mensal: 34.9, anual: 249.9 });
  assert.deepEqual(PLANOS_COMERCIAIS.business_pro.precos, { mensal: 49.9, anual: 359.9 });
  assert.deepEqual(PLANOS_COMERCIAIS.business_premium.precos, { mensal: 99.9, anual: 719.9 });
  assert.equal(VALOR_MODULO_AVULSO_MENSAL, 14.9);

  assert.deepEqual(PLANOS_COMERCIAIS.free.limites, {
    usuarios: 1,
    perfis: 1,
    perfisEmpresa: null,
    tiposDePerfilPermitidos: ['pessoal'],
    funcionarios: 0,
    centrosDeCustoAtivos: false,
    permiteWeb: false,
    permiteSessoesSimultaneasDoMesmoUsuario: false,
    incluiTodosModulos: false,
    permiteModulosAvulsos: false,
    temTrial: false,
  });
  assert.equal(PLANOS_COMERCIAIS.pessoal_premium.limites.usuarios, 2);
  assert.equal(PLANOS_COMERCIAIS.pessoal_premium.limites.perfis, 3);
  assert.deepEqual(PLANOS_COMERCIAIS.pessoal_premium.limites.tiposDePerfilPermitidos, ['pessoal']);
  assert.equal(PLANOS_COMERCIAIS.business.nome, 'Business Básico');
  assert.equal(PLANOS_COMERCIAIS.business.limites.usuarios, 1);
  assert.equal(PLANOS_COMERCIAIS.business.limites.perfisEmpresa, 1);
  assert.equal(PLANOS_COMERCIAIS.business.limites.funcionarios, 10);
  assert.equal(PLANOS_COMERCIAIS.business.limites.centrosDeCustoAtivos, false);
  assert.equal(PLANOS_COMERCIAIS.business.limites.permiteModulosAvulsos, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.usuarios, 3);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.perfisEmpresa, 3);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.funcionarios, 30);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.centrosDeCustoAtivos, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.permiteSessoesSimultaneasDoMesmoUsuario, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.incluiTodosModulos, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.temTrial, true);
  assert.equal(PLANOS_COMERCIAIS.business_premium.limites.usuarios, 10);
  assert.equal(PLANOS_COMERCIAIS.business_premium.limites.perfisEmpresa, 10);
  assert.equal(PLANOS_COMERCIAIS.business_premium.limites.funcionarios, null);
  assert.equal(PLANOS_COMERCIAIS.business_premium.limites.centrosDeCustoAtivos, true);
});

test('interfaces públicas e autenticadas oferecem os três planos empresariais', async () => {
  const { readFile } = await import('node:fs/promises');
  const [landing, landingCss, interactionCss, paywall, modal, checkout] = await Promise.all([
    readFile(new URL('../../app/components/AvaPlansPreview.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/AvaPlansCommerce.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/AvaPlansCommercePolish.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/PaywallEmpresa.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/components/AssinaturaModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/assinar/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(landing, /<h3>Business<\/h3>/);
  assert.match(landing, /Business Pro/);
  assert.match(landing, /Business Premium/);
  assert.match(landing, /Teste por 7 dias grátis/);
  assert.doesNotMatch(landing, /Testar Business Pro/);
  assert.doesNotMatch(landing, /<h3>Business Básico<\/h3>/);
  assert.match(landing, /polish\.personalBadge/);
  assert.equal((landing.match(/<AcessoPublicoLink className=\{polish\.cardLink\}/g) ?? []).length, 5);
  assert.match(landingCss, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(landingCss, /@media\(max-width:1100px\).*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(interactionCss, /cardLink:hover \.clickablePlan\{transform:translateY\(-8px\)/);
  assert.match(interactionCss, /prefers-reduced-motion:reduce/);

  for (const conteudo of [paywall, modal]) {
    assert.match(conteudo, /Business Básico/);
    assert.match(conteudo, /Business Pro/);
    assert.match(conteudo, /Business Premium/);
  }
  assert.match(checkout, /'business_premium'/);
  assert.match(checkout, /PRECOS\[plano\]\[ciclo\]/);
});

test('camada de cobrança usa a mesma tabela de preços do catálogo', () => {
  for (const plano of ['pessoal_premium', 'business', 'business_pro', 'business_premium']) {
    assert.deepEqual(PRECOS[plano], PLANOS_COMERCIAIS[plano].precos);
  }
  assert.deepEqual(PRECOS.empresa, PLANOS_COMERCIAIS.business.precos);
  assert.equal(normalizarPlanoComercial('empresa'), 'business');
  assert.equal(normalizarPlanoComercial('business_pro'), 'business_pro');
  assert.equal(normalizarPlanoComercial('business_premium'), 'business_premium');
  assert.equal(normalizarPlanoComercial('invalido'), null);
  assert.equal(rotuloPlano('business_pro', 'anual'), 'Business Pro · Anual');
  assert.equal(rotuloPlano('business', 'mensal'), 'Business Básico · Mensal');
  assert.equal(rotuloPlano('business_premium', 'anual'), 'Business Premium · Anual');
});

test('cortesia respeita plano escolhido e preserva legado como Business Pro', () => {
  assert.equal(resolverPlanoCortesia('pessoal', null), 'pessoal_premium');
  assert.equal(resolverPlanoCortesia('empresa', 'business'), 'business');
  assert.equal(resolverPlanoCortesia('empresa', 'business_pro'), 'business_pro');
  assert.equal(resolverPlanoCortesia('empresa', 'business_premium'), 'business_premium');
  assert.equal(resolverPlanoCortesia('empresa', null), 'business_pro');
  assert.equal(resolverPlanoCortesia('empresa', 'invalido'), 'business_pro');
});

test('vigência respeita trial, carência e cancelamento até o fim pago', () => {
  const agora = new Date('2026-07-29T12:00:00Z');
  const base = { tipoPerfil: 'empresa', plano: 'business_pro', ciclo: 'mensal', validoAte: null, trialFim: null };

  assert.equal(assinaturaVigente({ ...base, status: 'trial', trialFim: '2026-07-30T12:00:00Z' }, agora), true);
  assert.equal(assinaturaVigente({ ...base, status: 'trial', trialFim: '2026-07-29T12:00:00Z' }, agora), false);
  assert.equal(assinaturaVigente({ ...base, status: 'inadimplente', validoAte: '2026-08-01T12:00:00Z' }, agora), true);
  assert.equal(assinaturaVigente({ ...base, status: 'cancelada', validoAte: '2026-08-01T12:00:00Z' }, agora), true);
  assert.equal(assinaturaVigente({ ...base, status: 'expirada' }, agora), false);
});
