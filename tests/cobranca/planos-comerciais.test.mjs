import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLANOS_COMERCIAIS,
  VALOR_MODULO_AVULSO_MENSAL,
  normalizarPlanoComercial,
} from '../../app/lib/planos-comerciais.ts';
import { PRECOS, assinaturaVigente, rotuloPlano } from '../../app/lib/cobranca.ts';

test('catálogo comercial mantém preços e limites aprovados', () => {
  assert.deepEqual(PLANOS_COMERCIAIS.pessoal_premium.precos, { mensal: 9.9, anual: 99.9 });
  assert.deepEqual(PLANOS_COMERCIAIS.business.precos, { mensal: 34.9, anual: 249.9 });
  assert.deepEqual(PLANOS_COMERCIAIS.business_pro.precos, { mensal: 49.9, anual: 359.9 });
  assert.equal(VALOR_MODULO_AVULSO_MENSAL, 14.9);

  assert.deepEqual(PLANOS_COMERCIAIS.free.limites, {
    usuarios: 1,
    perfis: 1,
    tiposDePerfilPermitidos: ['pessoal'],
    funcionarios: 0,
    permiteWeb: false,
    permiteSessoesSimultaneasDoMesmoUsuario: false,
    incluiTodosModulos: false,
    permiteModulosAvulsos: false,
    temTrial: false,
  });
  assert.equal(PLANOS_COMERCIAIS.pessoal_premium.limites.usuarios, 2);
  assert.equal(PLANOS_COMERCIAIS.pessoal_premium.limites.perfis, 3);
  assert.deepEqual(PLANOS_COMERCIAIS.pessoal_premium.limites.tiposDePerfilPermitidos, ['pessoal']);
  assert.equal(PLANOS_COMERCIAIS.business.limites.usuarios, 3);
  assert.equal(PLANOS_COMERCIAIS.business.limites.perfis, 3);
  assert.equal(PLANOS_COMERCIAIS.business.limites.funcionarios, null);
  assert.equal(PLANOS_COMERCIAIS.business.limites.permiteModulosAvulsos, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.usuarios, 10);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.perfis, 10);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.permiteSessoesSimultaneasDoMesmoUsuario, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.incluiTodosModulos, true);
  assert.equal(PLANOS_COMERCIAIS.business_pro.limites.temTrial, true);
});

test('camada de cobrança usa a mesma tabela de preços do catálogo', () => {
  for (const plano of ['pessoal_premium', 'business', 'business_pro']) {
    assert.deepEqual(PRECOS[plano], PLANOS_COMERCIAIS[plano].precos);
  }
  assert.deepEqual(PRECOS.empresa, PLANOS_COMERCIAIS.business.precos);
  assert.equal(normalizarPlanoComercial('empresa'), 'business');
  assert.equal(normalizarPlanoComercial('business_pro'), 'business_pro');
  assert.equal(normalizarPlanoComercial('invalido'), null);
  assert.equal(rotuloPlano('business_pro', 'anual'), 'Business Pro · Anual');
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
