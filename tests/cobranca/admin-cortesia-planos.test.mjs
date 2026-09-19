import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Admin exige e envia o plano da cortesia empresarial', async () => {
  const pagina = await readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8');

  assert.match(pagina, /const \[liberarPlano, setLiberarPlano\]/);
  assert.match(pagina, /\['business', '1 usuário · 1 empresa'\]/);
  assert.match(pagina, /\['business_pro', '3 usuários · 3 empresas'\]/);
  assert.match(pagina, /\['business_premium', '10 usuários · 10 empresas'\]/);
  assert.match(pagina, /plano, duracaoValor/);
  assert.match(pagina, /disabled=\{liberarPerfil\.tipo_perfil !== 'pessoal' && !liberarPlano\}/);
});

test('API persiste o plano selecionado e protege duração inválida', async () => {
  const api = await readFile(new URL('../../app/api/admin-perfis/route.ts', import.meta.url), 'utf8');

  assert.match(api, /Selecione o plano da cortesia empresarial/);
  assert.match(api, /plano: acao === 'liberar' \? planoCortesia : null/);
  assert.match(api, /Informe uma duração válida para a cortesia/);
  assert.match(api, /resolverPlanoCortesia\(tipoPerfil, row\.plano\)/);
  assert.match(api, /\.in\('origem', \['plano_business_pro', 'cortesia', 'assinatura_modulo'\]\)/);
});

test('acesso efetivo usa o plano persistido da cortesia', async () => {
  const [servidor, modulos] = await Promise.all([
    readFile(new URL('../../app/lib/cobranca-servidor.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/lib/modulos-acesso-comercial.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(servidor, /resolverPlanoCortesia\(tipoPerfil, assin\.plano\)/);
  assert.match(modulos, /plano === 'business' \|\| plano === 'business_pro' \|\| plano === 'business_premium'/);
});
