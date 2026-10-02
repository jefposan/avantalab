import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('campos de e-mail dos cadastros normalizam letras para minúsculas ao digitar', async () => {
  const [vendas, gestao, perfil, autenticacao, cobranca, paywall, adicional, projetos, recebimentos] = await Promise.all([
    read('../../app/vendas/sistema/VendasServicosPrototype.tsx'),
    read('../../app/gestao/page.tsx'),
    read('../../app/components/CadastroPerfilModal.tsx'),
    read('../../app/components/AuthCard.tsx'),
    read('../../app/components/AssinaturaModal.tsx'),
    read('../../app/components/PaywallEmpresa.tsx'),
    read('../../app/components/PerfilAdicionalPremiumModal.tsx'),
    read('../../app/projetos/components/ProjectHome.tsx'),
    read('../../app/recebimentos/components/ListaColaboradores.tsx'),
  ]);

  for (const source of [vendas, gestao, perfil, autenticacao, cobranca, paywall, adicional, projetos, recebimentos]) {
    assert.match(source, /normalizarEmail/);
  }
  assert.equal((vendas.match(/normalizarEmail\(event\.target\.value\)/g) || []).length, 3);
  assert.match(gestao, /setEditUsuarioEmail\(normalizarEmail\(e\.target\.value\)\)/);
  assert.match(gestao, /setUsuarioEmail\(normalizarEmail\(e\.target\.value\)\)/);
  assert.match(perfil, /set\('email_empresa', normalizarEmail\(e\.target\.value\)\)/);
  assert.match(autenticacao, /setCadastroEmail\(normalizarEmail\(e\.target\.value\)\)/);
  assert.match(cobranca, /setEmailCobranca\(normalizarEmail\(e\.target\.value\)\)/);
  assert.match(paywall, /setEmailCobranca\(normalizarEmail\(e\.target\.value\)\)/);
  assert.match(adicional, /setEmail\(normalizarEmail\(event\.target\.value\)\)/);
  assert.match(projetos, /email: normalizarEmail\(event\.target\.value\)/);
  assert.match(recebimentos, /setEmail\(normalizarEmail\(e\.target\.value\)\)/);
});

test('cadastros móveis e do AvantaVendas também convertem e-mail durante a digitação', async () => {
  const [mobile, avantaVendas] = await Promise.all([
    read('../../public/mobile-app.js'),
    read('../../app/avantavendas/sistema/app.js'),
  ]);

  assert.equal((mobile.match(/oninput="this\.value=this\.value\.toLowerCase\(\)"/g) || []).length, 5);
  assert.equal((avantaVendas.match(/oninput="this\.value=this\.value\.toLowerCase\(\)"/g) || []).length, 2);
});
