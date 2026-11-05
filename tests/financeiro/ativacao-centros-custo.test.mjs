import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const fonte = readFileSync('app/api/centros-custo/configurar/route.ts', 'utf8');
function carregar({ autorizado = true, plano = true, ativo = true, erroConfig = false, erroPrincipal = false } = {}) {
  const chamadas = [];
  const dbUsuario = {
    from(tabela) { chamadas.push(['tabela', tabela]); return {
      upsert(dados, opcoes) { chamadas.push(['upsert', dados, opcoes]); return { select: () => ({ single: async () => ({ data: { centros_custo_ativo: ativo }, error: erroConfig ? {} : null }) }) }; },
      update(dados) { chamadas.push(['compensar', dados]); return { eq: async () => ({ error: null }) }; },
    }; },
    rpc: async (nome, args) => { chamadas.push(['rpc', nome, args]); return { data: erroPrincipal ? null : 'principal-ja-existente', error: erroPrincipal ? {} : null }; },
  };
  const modulo = { exports: {} };
  const imports = {
    'next/server': { NextResponse: { json: (json, options) => ({ json, status: options?.status || 200 }) } },
    '@supabase/supabase-js': { createClient: (...args) => { chamadas.push(['cliente-usuario', ...args]); return dbUsuario; } },
    '@/app/lib/cobranca-servidor': {
      autenticarPerfilCobranca: async (_request, empresa, exigirGestao) => { chamadas.push(['autorizar', empresa, exigirGestao]); return autorizado ? { db: { from() { throw Error('Service role não pode gravar'); }, rpc() { throw Error('Service role não pode executar RPC'); } } } : null; },
      resolverEstadoAcesso: async () => ({}),
    },
    '@/app/lib/limites-comerciais-servidor': { planoPermiteCentrosDeCusto: () => plano },
  };
  new Function('require', 'module', 'exports', 'process', ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(id => imports[id], modulo, modulo.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://banco.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'chave-publica' } });
  const executar = (body = { empresaId: 'tridium', ativo }) => modulo.exports.POST(new Request('https://avantalab.test/api/centros-custo/configurar', { method: 'POST', headers: { authorization: 'Bearer sessao-validada', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { executar, chamadas };
}
test('ativação mantém JWT do gestor/administrador, RLS e Principal existente', async () => {
  const a = carregar(); const r = await a.executar(); assert.equal(r.status, 200); assert.equal(r.json.centroPrincipalId, 'principal-ja-existente');
  assert.deepEqual(a.chamadas[0], ['autorizar', 'tridium', true]);
  const cliente = a.chamadas.find(c => c[0] === 'cliente-usuario');
  assert.equal(cliente[2], 'chave-publica'); assert.equal(cliente[3].global.headers.Authorization, 'Bearer sessao-validada');
  assert.equal(cliente[3].auth.persistSession, false);
  assert.deepEqual(a.chamadas.find(c => c[0] === 'upsert')[1], { empresa_id: 'tridium', centros_custo_ativo: true });
  assert.deepEqual(a.chamadas.find(c => c[0] === 'rpc'), ['rpc', 'garantir_centro_custo_principal', { p_empresa_id: 'tridium' }]);
  assert.doesNotMatch(fonte, /\.delete\(|\.from\('(?:lancamentos|faturamentos_entradas|centros_custo)'\)/);
});
test('papel sem gestão, Dashboard negada ou vínculo inválido não grava', async () => { const a = carregar({ autorizado: false }); assert.equal((await a.executar()).status, 403); assert.equal(a.chamadas.length, 1); });
test('plano sem centros não grava', async () => { const a = carregar({ plano: false }); assert.equal((await a.executar()).status, 409); assert.equal(a.chamadas.length, 1); });
test('desativação não recria Principal nem apaga dados', async () => { const a = carregar({ ativo: false, plano: false }); assert.equal((await a.executar()).status, 200); assert.ok(!a.chamadas.some(c => c[0] === 'rpc')); });
test('falha ao gravar não executa RPC', async () => { const a = carregar({ erroConfig: true }); assert.equal((await a.executar()).status, 500); assert.ok(!a.chamadas.some(c => c[0] === 'rpc')); });
test('falha no Principal é informada e usa o mesmo usuário para compensar', async () => { const a = carregar({ erroPrincipal: true }); assert.equal((await a.executar()).status, 500); assert.deepEqual(a.chamadas.find(c => c[0] === 'compensar')[1], { centros_custo_ativo: false }); });
test('entrada inválida não autentica nem grava', async () => { const a = carregar(); assert.equal((await a.executar({ empresaId: 'tridium', ativo: 'sim' })).status, 400); assert.equal(a.chamadas.length, 0); });
