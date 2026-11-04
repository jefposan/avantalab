import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const fonte = readFileSync('app/api/mobile/preparar-recorrencias/route.ts', 'utf8');
const empresa = '11111111-1111-4111-8111-111111111111';
function ambiente({ perfil = 'administrador', dashboard = true, user = { id: 'user' }, erro = null } = {}) {
  const chamadas = [], filtros = {};
  const q = { select() { return q; }, eq(k,v) { filtros[k] = v; return q; }, maybeSingle: async () => ({ data: filtros.empresa_id === empresa ? { perfil, dashboard_liberada: dashboard } : null, error: null }) };
  const db = { auth: { getUser: async () => ({ data: { user }, error: erro }) }, from: () => q };
  const exports = {}, deps = { 'next/server': { NextResponse: { json: (b, o) => Response.json(b, o) } }, '@supabase/supabase-js': { createClient: (...args) => { chamadas.push(args); return db; } }, '@/app/lib/database': { garantirFixasDoMesAtual: async (...args) => chamadas.push(args) }, '@/app/lib/acessos-usuario': { liberacoesDoVinculo: p => ({ dashboard: p.perfil === 'gestor_master' || p.dashboard_liberada }) } };
  vm.runInNewContext(ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'publica' } }, require: id => deps[id], Response });
  return { db, chamadas, filtros, post: (id = empresa, token = 'Bearer teste') => exports.POST(new Request('https://teste/api/mobile/preparar-recorrencias', { method: 'POST', headers: { authorization: token }, body: JSON.stringify({ empresaId: id }) })) };
}
test('manutenção usa cliente do usuário e não retorna histórico ao aparelho', async () => {
  const a = ambiente(); const r = await a.post(); assert.equal(r.status, 200);
  assert.equal(a.chamadas[1][2], a.db); assert.equal(a.chamadas[1][1], 1);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(a.filtros.user_id, 'user'); assert.equal(a.filtros.status, 'ativo');
  assert.doesNotMatch(fonte, /SERVICE_ROLE/);
});
test('sem autenticação, vínculo, papel de escrita ou Financeiro, manutenção é bloqueada', async () => {
  assert.equal((await ambiente().post(empresa, '')).status, 401);
  assert.equal((await ambiente({ user: null }).post()).status, 401);
  assert.equal((await ambiente().post('22222222-2222-4222-8222-222222222222')).status, 403);
  for (const o of [{ perfil: 'operador_simples' }, { dashboard: false }]) {
    const a = ambiente(o); assert.equal((await a.post()).status, 403); assert.equal(a.chamadas.length, 1);
  }
  assert.equal((await ambiente().post('inválido')).status, 400);
});
