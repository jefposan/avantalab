import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

function carregar(path, dependencias = {}) {
  const exports = {};
  const codigo = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(codigo, { exports, Buffer, process, Request, Response, URL,
    require: nome => { if (!(nome in dependencias)) throw new Error(`Dependência não simulada: ${nome}`); return dependencias[nome]; } });
  return exports;
}
const politica = carregar('app/lib/sessao-perfil.ts');
const usuario = '00000000-0000-4000-8000-000000000001';
const sessao = '00000000-0000-4000-8000-000000000002';
const token = `cabecalho.${Buffer.from(JSON.stringify({ sub: usuario, session_id: sessao })).toString('base64url')}.assinatura`;
function rota({ tipoPerfil = 'empresa', plano = 'business', erroAuth = null, erroVinculo = null, vinculo = { id: 'vinculo' }, ativa = true, erroRpc = null } = {}) {
  const chamadas = [];
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: vinculo, error: erroVinculo }) };
  const cliente = { auth: { getUser: async () => ({ data: { user: { id: usuario } }, error: erroAuth }),
    admin: { signOut() { throw new Error('Logout global proibido'); } } },
    from() { return query; }, rpc: async (nome, args) => { chamadas.push({ nome, args }); return { data: ativa, error: erroRpc }; } };
  class NextResponse extends Response { static json(data, opcoes) { return new NextResponse(JSON.stringify(data), opcoes); } }
  const mod = carregar('app/api/cobranca/sessoes/route.ts', {
    'next/server': { NextResponse }, '@supabase/supabase-js': { createClient: () => cliente },
    '../../../lib/cobranca': { COBRANCA_ATIVA: true, assinaturaVigente: () => true },
    '../../../lib/cobranca-servidor': { resolverEstadoAcesso: async () => ({ plano, tipoPerfil }) },
    '../../../lib/planos-comerciais': { normalizarPlanoComercial: p => p, PLANOS_COMERCIAIS: Object.fromEntries(['business','free','pessoal_premium','business_pro','business_premium'].map(p => [p, { limites: { permiteSessoesSimultaneasDoMesmoUsuario: p === 'business_pro' || p === 'business_premium' } }])) },
    '../../../lib/sessao-perfil': politica,
  });
  return { chamadas, post: async () => mod.POST(new Request('https://teste/api/cobranca/sessoes', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ empresaId: 'perfil', dispositivoId: 'aparelho', sessaoAuthId: 'forjada', acao: 'entrar' }),
  })) };
}

test('política pessoal não limita sessões empresariais; Pro/Premium permitem simultâneas', async () => {
  const anteriores = { ...process.env };
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'teste', SUPABASE_SERVICE_ROLE_KEY: 'teste' });
  try {
    for (const [tipoPerfil, plano, simultaneas] of [['pessoal','free',true], ['pessoal','pessoal_premium',true], ['empresa','business',false], ['empresa','business_pro',true], ['empresa','business_premium',true]]) {
      const r = rota({ tipoPerfil, plano });
      assert.equal((await r.post()).status, 200);
      assert.equal(r.chamadas[0].args.p_simultaneas, simultaneas);
      assert.equal(r.chamadas[0].args.p_sessao_auth_id, sessao, 'não confiar no session_id enviado no corpo');
      assert.equal(r.chamadas[0].args.p_empresa_id, 'perfil');
    }
  } finally { process.env = anteriores; }
});

test('sessão inexistente é 401; indisponibilidade auth/banco é 503; sem vínculo é 403', async () => {
  const anteriores = { ...process.env };
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'teste', SUPABASE_SERVICE_ROLE_KEY: 'teste' });
  try {
    for (const [config, status] of [[{ erroAuth: { status: 403, code: 'session_not_found' } },401], [{ erroAuth: { status: 503 } },503], [{ erroVinculo: {} },503], [{ vinculo: null },403], [{ erroRpc: {} },503]]) {
      const r = rota(config); assert.equal((await r.post()).status, status);
    }
    const r = rota({ ativa: false });
    const resposta = await r.post();
    assert.equal(resposta.status, 200);
    assert.equal((await resposta.json()).codigo, 'perfil_em_outro_dispositivo');
  } finally { process.env = anteriores; }
});

test('session_id só é aceito com sub do usuário autenticado e formato UUID', () => {
  assert.equal(politica.idSessaoAutenticada(token, usuario), sessao);
  assert.equal(politica.idSessaoAutenticada(token, 'outro'), null);
  assert.equal(politica.idSessaoAutenticada('invalido', usuario), null);
});

test('rota legada de sessão única não encerra nenhum login', async () => {
  class NextResponse extends Response { static json(data, opcoes) { return new NextResponse(JSON.stringify(data), opcoes); } }
  const legado = carregar('app/api/cobranca/sessao-unica/route.ts', { 'next/server': { NextResponse } });
  const r = await legado.POST();
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ignorado, true);
  assert.doesNotMatch(readFileSync('app/api/cobranca/sessao-unica/route.ts','utf8'), /signOut\(/);
});

test('cadastro GET/PUT mantém distintos os erros 401, 403, 409 e 503', async () => {
  class NextResponse extends Response { static json(data, opcoes) { return new NextResponse(JSON.stringify(data), opcoes); } }
  for (const [status, codigo] of [[401,'sessao_expirada'],[403,'perfil_nao_autorizado'],[409,'perfil_em_outro_dispositivo'],[503,'servico_indisponivel']]) {
    const cadastro = carregar('app/api/perfil-cadastro/route.ts', {
      'next/server': { NextResponse },
      '../../lib/cobranca-servidor': { autenticarPerfilCobrancaDetalhado: async () => ({ acesso: null, erro: { status, codigo, mensagem: 'Orientação' } }) },
      '../../lib/conta-revisao': {},
      '../../lib/cadastro-perfil': { ESTADOS_BRASIL: [], REGIMES_TRIBUTARIOS: [], TIPOS_EMPRESA: [] },
    });
    const get = await cadastro.GET(new Request('https://teste/api/perfil-cadastro?empresaId=perfil'));
    const put = await cadastro.PUT(new Request('https://teste/api/perfil-cadastro', { method: 'PUT', body: JSON.stringify({ empresaId: 'perfil' }) }));
    assert.equal(get.status, status); assert.equal(put.status, status);
    assert.equal((await get.json()).codigo, codigo);
  }
});

test('autorização compartilhada bloqueia só sessões revogadas/concorrentes daquele perfil', async () => {
  const anteriores = { ...process.env };
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'teste', SUPABASE_SERVICE_ROLE_KEY: 'teste' });
  try {
    for (const [sessoes, bloqueada] of [
      [[],false],
      [[{ sessao_auth_id: sessao, status: 'ativa', simultaneas: false }],false],
      [[{ sessao_auth_id: sessao, status: 'revogada', simultaneas: false }],true],
      [[{ sessao_auth_id: 'outra', status: 'ativa', simultaneas: false }],true],
      [[{ sessao_auth_id: 'outra', status: 'ativa', simultaneas: true }],false],
    ]) {
      const query = tabela => ({ select() { return this; }, eq() { return this; }, limit() { return this; },
        maybeSingle: async () => ({ data: { id: 'vinculo', perfil: 'gestor_master' }, error: null }),
        or: async () => { assert.equal(tabela, 'sessoes_acesso_perfil'); return { data: sessoes, error: null }; } });
      const helper = carregar('app/lib/cobranca-servidor.ts', {
        '@supabase/supabase-js': { createClient: () => ({ from: query, auth: { getUser: async () => ({ data: { user: { id: usuario } }, error: null }) } }) },
        './sessao-perfil': politica, './cobranca': {}, './conta-revisao': {}, './cobranca-fluxo': {}, './planos-comerciais': {}, './perfis-quota': {},
      });
      const r = await helper.autenticarPerfilCobrancaDetalhado(new Request('https://teste', { headers: { authorization: `Bearer ${token}` } }), 'perfil');
      assert.equal(Boolean(r.erro), bloqueada);
      if (bloqueada) assert.equal(r.erro.status, 409);
      else assert.equal(r.acesso.usuario.id, usuario);
    }
  } finally { process.env = anteriores; }
});
