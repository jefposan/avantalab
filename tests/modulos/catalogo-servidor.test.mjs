import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const rota = readFileSync('app/api/cobranca/modulos/listar/route.ts', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');

test('listagem de módulos exige vínculo ativo validado no servidor', () => {
  assert.match(rota, /autenticarPerfilCobranca\(request, empresaId\)/);
  assert.match(rota, /from\('modulos'\)/);
  assert.match(rota, /from\('empresa_modulos'\)/);
  assert.match(rota, /from\('assinaturas_modulos'\)/);
});

test('catálogo completo fica com gestores e operadores recebem somente módulos instalados', () => {
  assert.match(rota, /acesso\.podeGerenciar/);
  assert.match(rota, /filter\(\(modulo\) => ativos\.includes\(String\(modulo\.id\)\)\)/);
});

test('Gestão carrega módulos pela rota protegida e não consulta o catálogo diretamente', () => {
  const inicio = gestao.indexOf('async function carregarModulos()');
  const fim = gestao.indexOf('async function instalarModulo', inicio);
  const carregamento = gestao.slice(inicio, fim);

  assert.ok(inicio >= 0 && fim > inicio);
  assert.match(carregamento, /\/api\/cobranca\/modulos\/listar\?empresaId=/);
  assert.doesNotMatch(carregamento, /supabase\.from\('modulos'\)/);
  assert.match(carregamento, /setModulosErro/);
});
