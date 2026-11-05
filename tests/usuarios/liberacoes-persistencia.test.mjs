import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { createElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function carregar(arquivo, deps) {
  const exports = {};
  const process = { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://teste.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' } };
  vm.runInNewContext(ts.transpileModule(readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, process, Request, Response, URL, console, require: id => { if (!(id in deps)) throw Error('Dependência não simulada: ' + id); return deps[id]; } });
  return exports;
}
const registro = carregar('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
const domain = carregar('app/lib/acessos-usuario.ts', { './modulos-registro': registro });
const helper = carregar('app/lib/usuarios-empresa-liberacoes.ts', { './acessos-usuario': domain });
const nomes = carregar('app/lib/nome-pessoa.ts', {});
const empresa = '00000000-0000-4000-8000-000000000001';
const outra = '00000000-0000-4000-8000-000000000002';
class NextResponse extends Response { static json(body, opts) { return new NextResponse(JSON.stringify(body), opts); } }

function ambiente({ papel = 'gestor_master', omitir = false, persistir = true, authError = null } = {}) {
  const alvo = { id: 'alvo', empresa_id: empresa, user_id: 'alvo-user', nome: 'Usuário Teste', email: 'teste@example.com', login: 'teste', perfil: 'administrador', status: 'ativo', dashboard_liberada: true, modulos_liberados: registro.REGISTRO_MODULOS.map(m => m.id) };
  const solicitante = { id: 'solicitante', empresa_id: empresa, user_id: 'master', perfil: papel, status: 'ativo' };
  const listaLegada = [{ id: alvo.id, empresa_id: empresa, user_id: alvo.user_id, nome: alvo.nome, email: alvo.email, login: alvo.login, perfil: alvo.perfil, status: alvo.status }];
  const db = { auth: { getUser: async () => ({ data: { user: authError ? null : { id: 'master' } }, error: authError }), admin: { updateUserById: async () => ({ error: null }) } }, rpc: async nome => nome === 'listar_usuarios_empresa_contas_rpc' ? { data: listaLegada, error: null } : { data: true, error: null }, from(tabela) {
    let filtros = [], patch, colunas = '';
    const executar = () => {
      let linhas = tabela === 'usuarios_empresa' ? [solicitante, alvo] : [];
      linhas = linhas.filter(l => filtros.every(f => f(l)));
      if (patch && persistir) linhas.forEach(l => Object.assign(l, patch));
      if (omitir && colunas === 'id,dashboard_liberada,modulos_liberados') linhas = [];
      return { data: linhas.map(l => ({ ...l })), error: null };
    };
    const q = { select(c) { colunas = c; return q; }, eq(k,v) { filtros.push(l => l[k] === v); return q; }, neq(k,v) { filtros.push(l => l[k] !== v); return q; }, in(k,vs) { filtros.push(l => vs.includes(l[k])); return q; }, limit() { return q; }, update(v) { patch = v; return q; }, maybeSingle: async () => { const r = executar(); return { ...r, data: r.data[0] || null }; }, single: async () => { const r = executar(); return { ...r, data: r.data[0] || null }; }, then(resolve, reject) { return Promise.resolve(executar()).then(resolve, reject); } };
    return q;
  } };
  const deps = { 'next/server': { NextResponse }, '@supabase/supabase-js': { createClient: () => db }, '@/app/lib/acessos-usuario': domain, '@/app/lib/usuarios-empresa-liberacoes': helper, '../../lib/nome-pessoa': nomes, '../../lib/email': { normalizarEmail: e => e, validarEmail: () => true }, '../../lib/usuario-disponibilidade-servidor': { buscarContaAuthPorEmail: async () => null } };
  const get = carregar('app/api/usuarios-empresa/route.ts', deps).GET;
  const post = carregar('app/api/atualizar-usuario-empresa/route.ts', deps).POST;
  const listar = (id = empresa, token = 'teste') => get(new Request('https://teste/api/usuarios-empresa?empresaId=' + id, { headers: token ? { authorization: 'Bearer ' + token } : {} }));
  const salvar = (liberacoes, campos = {}) => post(new Request('https://teste/api/atualizar-usuario-empresa', { method: 'POST', headers: { authorization: 'Bearer teste', 'content-type': 'application/json' }, body: JSON.stringify({ acessoId: alvo.id, nome: alvo.nome, email: alvo.email, login: alvo.login, perfil: alvo.perfil, liberacoes, ...campos }) }));
  return { alvo, listar, salvar };
}

test('regressão: consulta parcial nunca reativa as permissões padrão', async () => {
  assert.throws(() => helper.anexarLiberacoesUsuarios([{ id: 'alvo' }], []), /confirmar as liberações/);
  const a = ambiente({ omitir: true });
  assert.equal((await a.listar()).status, 503);
});

test('alterar acesso sem nome preserva o nome pessoal legado; nome enviado continua validado', async () => {
  const a = ambiente();
  a.alvo.nome = 'Jeff';
  assert.equal((await a.salvar(undefined, { nome: undefined })).status, 200);
  assert.equal(a.alvo.nome, 'Jeff');
  for (const nome of ['', 'Jeff', 'BORA']) {
    const resposta = await a.salvar(undefined, { nome });
    assert.equal(resposta.status, 400);
    assert.equal((await resposta.json()).campo, 'nome');
  }
  assert.equal((await a.salvar(undefined, { nome: 'Jeff Silva' })).status, 200);
  assert.equal(a.alvo.nome, 'Jeff Silva');
  assert.equal((await ambiente({ papel: 'operador_simples' }).salvar(undefined, { nome: undefined })).status, 403);
});

test('salvar e reabrir conserva ativação/desativação de cada módulo e Dashboard', async () => {
  const a = ambiente();
  const todos = registro.REGISTRO_MODULOS.map(m => m.id);
  for (const id of todos) {
    for (const ativo of [false, true]) {
      const esperado = { dashboard: true, modulos: ativo ? todos : todos.filter(m => m !== id) };
      const salvo = await a.salvar(esperado);
      assert.equal(salvo.status, 200, await salvo.clone().text());
      const reaberto = await a.listar();
      assert.equal(reaberto.status, 200);
      const usuario = (await reaberto.json()).usuarios[0];
      assert.equal(usuario.modulos_liberados.includes(id), ativo, id);
      assert.equal(usuario.dashboard_liberada, true);
      assert.equal(reaberto.headers.get('cache-control'), 'no-store');
    }
  }
  for (const dashboard of [false, true]) {
    assert.equal((await a.salvar({ dashboard, modulos: ['ponto'] })).status, 200);
    assert.equal((await (await a.listar()).json()).usuarios[0].dashboard_liberada, dashboard);
  }
  assert.equal((await a.salvar({ dashboard: true, modulos: [] })).status, 200);
  assert.deepEqual((await (await a.listar()).json()).usuarios[0].modulos_liberados, []);
});

test('API não confirma sucesso se a gravação não persistiu', async () => {
  const a = ambiente({ persistir: false });
  assert.equal((await a.salvar({ dashboard: false, modulos: ['ponto'] })).status, 503);
});

test('listagem mantém autenticação, papel e isolamento empresarial', async () => {
  assert.equal((await ambiente().listar(empresa, '')).status, 401);
  assert.equal((await ambiente().listar(outra)).status, 403);
  assert.equal((await ambiente({ papel: 'operador_simples' }).listar()).status, 403);
  assert.equal((await ambiente({ authError: { status: 401 } }).listar()).status, 401);
  assert.equal((await ambiente({ authError: { status: 0, name: 'AuthRetryableFetchError' } }).listar()).status, 503);
  assert.equal((await ambiente().listar('inválida')).status, 400);
});

test('NULL legado mantém acesso, lista vazia mantém bloqueio, ordem não muda significado', () => {
  assert.ok(helper.liberacoesPersistidasIguais({ perfil: 'administrador', dashboard_liberada: true, modulos_liberados: null }, domain.LIBERACOES_PADRAO));
  assert.ok(helper.liberacoesPersistidasIguais({ dashboard_liberada: true, modulos_liberados: [] }, { dashboard: true, modulos: [] }));
  assert.ok(helper.liberacoesPersistidasIguais({ dashboard_liberada: false, modulos_liberados: ['custos', 'ponto'] }, { dashboard: false, modulos: ['ponto', 'custos'] }));
  assert.equal(helper.liberacoesPersistidasIguais({ dashboard_liberada: true }, { dashboard: true, modulos: [] }), false);
});

test('cliente carrega lista pelo servidor sem cache nem fallback pela tabela com RLS', async () => {
  const fonte = ts.createSourceFile('database.ts', readFileSync('app/lib/database.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = fonte.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'buscarUsuariosEmpresa');
  const js = ts.transpileModule(fn.getText(fonte).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const requisicoes = [];
  const ctx = { encodeURIComponent, supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'teste' } } }) }, from() { throw Error('Não usar leitura parcial no navegador'); } }, fetch: async (url, opts) => { requisicoes.push({ url, opts }); return { ok: true, json: async () => ({ usuarios: [{ id: 'alvo', dashboard_liberada: false, modulos_liberados: [] }] }) }; } };
  vm.createContext(ctx); vm.runInContext(js, ctx);
  const usuarios = await ctx.buscarUsuariosEmpresa(empresa);
  assert.equal(usuarios[0].dashboard_liberada, false);
  assert.equal(usuarios[0].modulos_liberados.length, 0);
  assert.equal(requisicoes[0].opts.cache, 'no-store');
  assert.equal(requisicoes[0].url, '/api/usuarios-empresa?empresaId=' + empresa);
  ctx.fetch = async () => ({ ok: false, json: async () => ({ mensagem: 'Falha na leitura' }) });
  await assert.rejects(ctx.buscarUsuariosEmpresa(empresa), /Falha na leitura/);
});

test('respostas anteriores e de outro perfil não sobrescrevem as permissões novas', async () => {
  const fonte = readFileSync('app/hooks/useEmpresas.ts', 'utf8');
  const codigo = fonte.slice(fonte.indexOf('const carregarUsuariosEmpresa = async'), fonte.indexOf('const abrirModalUsuarios ='));
  const resolvers = [], listas = [], avisos = [];
  const ctx = { empresaId: empresa, podeGerenciarUsuarios: true, consultaUsuariosRef: { current: 0 }, empresaUsuariosRef: { current: empresa }, buscarUsuariosEmpresa: () => new Promise(resolve => resolvers.push(resolve)), setUsuariosEmpresa: lista => listas.push(lista), setUsuariosCarregando() {}, abrirAviso: (...args) => avisos.push(args) };
  vm.createContext(ctx);
  vm.runInContext(ts.transpileModule(codigo + '\nglobalThis.carregar = carregarUsuariosEmpresa;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  const velha = ctx.carregar(), nova = ctx.carregar();
  resolvers[1]([{ dashboard_liberada: false, modulos_liberados: [] }]); await nova;
  resolvers[0]([{ dashboard_liberada: true, modulos_liberados: null }]); await velha;
  assert.equal(listas.length, 1);
  assert.equal(listas[0][0].dashboard_liberada, false);
  const anterior = ctx.carregar();
  ctx.empresaUsuariosRef.current = outra;
  resolvers[2]([{ dashboard_liberada: true }]); await anterior;
  assert.equal(listas.length, 1);
  assert.equal(avisos.length, 0);
});

test('numeração retomada permite evolução 3.x sem impedir atualização de app rotulado 4', () => {
  const version = readFileSync('app/lib/version.ts', 'utf8').match(/APP_VERSION = '(\d+\.\d+\.\d+(?:\.\d+)?)'/)?.[1];
  assert.ok(version);
  const [major, minor] = version.split('.').map(Number);
  assert.equal(major, 3);
  assert.ok(minor >= 1);
  assert.match(readFileSync('CHANGELOG.md', 'utf8'), /## 3\.1\.0\.01/);
  assert.match(readFileSync('app/mobile/page.tsx', 'utf8'), /versaoEncontrada === '\$\{mobileAssetVersion\}'/);
});

test('seletor exibe Financeiro e mantém contrato persistido e restrição do Master', () => {
  const Campos = carregar('app/components/AcessosUsuarioCampos.tsx', { 'react/jsx-runtime': jsxRuntime, '@/app/lib/modulos-registro': registro, '@/app/lib/acessos-usuario': domain }).default;
  for (const dashboard of [false, true]) {
    const html = renderToStaticMarkup(createElement(Campos, { value: { dashboard, modulos: [] }, perfil: 'administrador', onChange() {} }));
    assert.match(html, /<span>Financeiro<\/span>/);
    assert.doesNotMatch(html, /Dashboard/);
    assert.match(html, dashboard ? /checked=""\/><span>Financeiro/ : /type="checkbox"\/><span>Financeiro/);
  }
  const master = renderToStaticMarkup(createElement(Campos, { value: { dashboard: false, modulos: [] }, perfil: 'gestor_master', onChange() {} }));
  assert.match(master, /fieldset disabled=""/);
  assert.match(master, /checked=""\/><span>Financeiro/);
  assert.throws(() => domain.validarLiberacoes({ dashboard: false, modulos: [] }, 'administrador'), /Libere o Financeiro/);
});
