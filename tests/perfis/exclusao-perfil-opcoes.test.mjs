import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const rota = ler('../../app/api/conta/route.ts');
const web = ler('../../app/gestao/page.tsx');
const mobile = ler('../../public/mobile-app.js');
const migracao = ler('../../supabase/migrations/20260919153000_exclusao_perfil_definitiva.sql');

test('rota autenticada diferencia retenção e exclusão definitiva', () => {
  assert.match(rota, /corpo\.modo === 'definitiva'/);
  assert.match(rota, /validar_exclusao_perfil_definitiva/);
  assert.match(rota, /excluir_perfil_com_retencao/);
  assert.match(rota, /excluir_perfil_definitivamente/);
  assert.match(rota, /removerAssinaturaAsaas/);
});

test('web oferece as duas escolhas e exige confirmação final', () => {
  assert.match(web, /Guardar por 30 dias/);
  assert.match(web, /Excluir agora/);
  assert.match(web, /Digite EXCLUIR para confirmar/);
  assert.doesNotMatch(web, /supabase\.rpc\('excluir_empresa_rpc'/);
});

test('mobile usa o mesmo fluxo nas duas entradas de exclusão', () => {
  assert.match(mobile, /confirmar-exclusao-conta-retencao/);
  assert.match(mobile, /excluir-empresa-mobile-retencao/);
  assert.match(mobile, /confirmar-exclusao-conta-definitiva/);
  assert.match(mobile, /excluir-empresa-mobile-definitiva/);
  assert.doesNotMatch(mobile, /db\.rpc\('excluir_empresa_rpc'/);
});

test('purga remove pontos de restauração e preserva retenção legal', () => {
  assert.match(migracao, /delete from public\.pontos_restauracao where empresa_id = p_empresa_id/);
  assert.match(migracao, /delete from public\.pontos_restauracao_estado where empresa_id = p_empresa_id/);
  assert.match(migracao, /registros sujeitos à guarda legal/i);
  assert.match(migracao, /retencao_legal = true/);
  assert.match(migracao, /grant execute on function public\.excluir_perfil_definitivamente[\s\S]*service_role/);
});
