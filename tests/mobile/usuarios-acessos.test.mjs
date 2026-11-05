import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';

const fonte = readFileSync('public/mobile-app.js', 'utf8');
const ast = ts.createSourceFile('mobile.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const funcoes = new Map();
function visitar(no) { if (ts.isFunctionDeclaration(no) && no.name) funcoes.set(no.name.text, no.getText(ast)); ts.forEachChild(no, visitar); }
visitar(ast);
function carregar(file, deps) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => deps[id] });
  return exports;
}
const registro = carregar('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
const domain = carregar('app/lib/acessos-usuario.ts', { './modulos-registro': registro });

function ambiente(papel = 'gestor_master', alvoPerfil = 'administrador') {
  const alvo = { id: 'alvo', nome: 'Usuário Teste', email: 'teste@example.com', login: 'teste', perfil: alvoPerfil, dashboard_liberada: true, modulos_liberados: ['ponto', 'projetos'] };
  const state = { empresa: { id: 'empresa', acessoId: 'solicitante', perfil: papel }, usuario: { id: 'solicitante' }, autenticado: true, usuariosEmpresa: [alvo], usuariosConsulta: 0, carregando: false, usuarioEditandoId: '', usuarioModo: '', usuarioExistenteResultado: { id: 'existente' }, loginConta: 'meu-login' };
  const eventos = {}, enviados = [], erros = [], avisos = [];
  const campos = { 'edit-usuario-nome': alvo.nome, 'edit-usuario-email': alvo.email, 'edit-usuario-login': alvo.login, 'edit-usuario-perfil': alvo.perfil, 'edit-usuario-senha': '', 'edit-usuario-confirmar-senha': '', 'usuario-nome': alvo.nome, 'usuario-email': alvo.email, 'usuario-login': alvo.login, 'usuario-perfil': 'administrador', 'usuario-senha': 'senha-ficticia', 'usuario-existente-perfil': 'administrador' };
  const contexto = { state, console, encodeURIComponent, window: { __avantaAcessosUsuario: { padrao: () => ({ dashboard: true, modulos: [...domain.LIBERACOES_PADRAO.modulos] }), doVinculo: domain.liberacoesDoVinculo, validar: domain.validarLiberacoes }, addEventListener: (tipo, fn) => { eventos[tipo] = fn; } }, render() {}, campo: id => campos[id] || '', emailRealUsuario: u => u.email || '', nomeCompletoValido: () => true, emailCadastroValido: () => true, tokenSessao: async () => 'teste', setErro: e => erros.push(e), setErroCampoUsuarioMobile: e => erros.push(e), idCampoUsuarioMobile: () => '', mostrarToast: e => avisos.push(e), salvarRascunhoUsuarioMobile() {}, limparRascunhoUsuarioMobile() {}, lerResposta: async r => r.json(), escapeHtml: s => String(s).replaceAll('"', '&quot;'),
    fetch: async (url, opts = {}) => {
      if (opts.method === 'POST') {
        const body = JSON.parse(opts.body); enviados.push({ url, body });
        Object.assign(alvo, { dashboard_liberada: body.liberacoes?.dashboard ?? alvo.dashboard_liberada, modulos_liberados: body.liberacoes?.modulos ?? alvo.modulos_liberados });
        return { ok: true, json: async () => ({ erro: false, usuario: { ...alvo } }) };
      }
      enviados.push({ url, opts }); return { ok: true, json: async () => ({ usuarios: [{ ...alvo }] }) };
    },
  };
  vm.createContext(contexto);
  const nomes = ['podeGerenciarUsuarios', 'podeAlterarAcessosUsuarioMobile', 'validarAcessosUsuarioMobile', 'acessosUsuarioSlotMobile', 'editarUsuarioMobile', 'salvarUsuarioMobile', 'carregarUsuariosMobile', 'criarUsuarioMobile', 'confirmarVinculoUsuarioExistenteMobile'];
  vm.runInContext(nomes.map(n => funcoes.get(n)).join('\n'), contexto);
  const registroEvento = ast.statements.find(n => ts.isExpressionStatement(n) && n.getText(ast).startsWith("window.addEventListener('avantalab:usuario-liberacoes'"));
  // O registro fica dentro da IIFE; localiza também seus descendentes.
  let eventoNo = registroEvento;
  function encontrar(no) { if (ts.isExpressionStatement(no) && no.getText(ast).startsWith("window.addEventListener('avantalab:usuario-liberacoes'")) eventoNo = no; ts.forEachChild(no, encontrar); }
  encontrar(ast); vm.runInContext(eventoNo.getText(ast), contexto);
  return { contexto, state, alvo, enviados, erros, avisos, eventos };
}

test('edição mobile desativa, salva, relê e reabre sem reativar acessos', async () => {
  const a = ambiente(); a.contexto.editarUsuarioMobile('alvo');
  a.eventos['avantalab:usuario-liberacoes']({ detail: { contexto: 'editar', empresaId: 'empresa', acessoId: 'alvo', value: { dashboard: false, modulos: ['ponto'] } } });
  await a.contexto.salvarUsuarioMobile();
  const post = a.enviados.find(e => e.body);
  assert.deepEqual(post.body.liberacoes, { dashboard: false, modulos: ['ponto'] });
  assert.equal(a.state.usuarioEditandoId, '');
  assert.equal(a.state.loginConta, 'meu-login');
  assert.equal(a.avisos.length, 1);
  assert.equal(a.enviados.at(-1).opts.cache, 'no-store');
  a.contexto.editarUsuarioMobile('alvo');
  assert.equal(a.state.editUsuarioLiberacoes.dashboard, false);
  assert.deepEqual(Array.from(a.state.editUsuarioLiberacoes.modulos), ['ponto']);
});

test('Master altera todos; administrador somente operadores; operadores nunca alteram', () => {
  for (const papel of ['gestor_master', 'administrador', 'operador_completo', 'operador_simples']) {
    const a = ambiente(papel);
    for (const perfil of ['gestor_master', 'administrador', 'operador_completo', 'operador_simples']) {
      assert.equal(a.contexto.podeAlterarAcessosUsuarioMobile({ perfil }), papel === 'gestor_master' || (papel === 'administrador' && perfil.startsWith('operador_')));
    }
  }
});

test('evento antigo/de outro perfil não altera formulário atual; admin não altera outro admin', () => {
  const a = ambiente('administrador'); a.contexto.editarUsuarioMobile('alvo');
  const original = JSON.stringify(a.state.editUsuarioLiberacoes);
  for (const empresaId of ['outra', 'empresa']) a.eventos['avantalab:usuario-liberacoes']({ detail: { contexto: 'editar', empresaId, acessoId: 'alvo', value: { dashboard: false, modulos: [] } } });
  assert.equal(JSON.stringify(a.state.editUsuarioLiberacoes), original);
  a.state.empresa.perfil = 'gestor_master';
  a.eventos['avantalab:usuario-liberacoes']({ detail: { contexto: 'editar', empresaId: 'empresa', acessoId: 'anterior', value: { dashboard: false, modulos: [] } } });
  assert.equal(JSON.stringify(a.state.editUsuarioLiberacoes), original);
});

test('criação e vínculo enviam as mesmas liberações pelo contrato existente', async () => {
  for (const modo of ['criar', 'existente']) {
    const a = ambiente(); a.state.usuarioModo = modo;
    a.state.usuarioLiberacoes = { dashboard: true, modulos: [] };
    if (modo === 'criar') await a.contexto.criarUsuarioMobile(); else await a.contexto.confirmarVinculoUsuarioExistenteMobile();
    assert.deepEqual(a.enviados.find(e => e.body).body.liberacoes, { dashboard: true, modulos: [] });
    assert.equal(a.erros.length, 0);
  }
});

test('zero áreas recusa submissão; bridge indisponível não libera tudo por padrão', async () => {
  const a = ambiente(); a.contexto.editarUsuarioMobile('alvo');
  a.state.editUsuarioLiberacoes = { dashboard: false, modulos: [] };
  await a.contexto.salvarUsuarioMobile();
  assert.match(a.erros[0], /Financeiro/);
  assert.equal(a.enviados.length, 0);
  delete a.contexto.window.__avantaAcessosUsuario;
  assert.throws(() => a.contexto.validarAcessosUsuarioMobile({}, 'administrador'), /Aguarde/);
});

test('falha de lista não mostra permissões padrão nem fica carregando; resposta antiga é descartada', async () => {
  const a = ambiente();
  a.contexto.fetch = async () => ({ ok: false, json: async () => ({ mensagem: 'Falha controlada' }) });
  assert.equal(await a.contexto.carregarUsuariosMobile(), false);
  assert.equal(a.state.usuariosEmpresa.length, 0);
  assert.equal(a.state.usuariosCarregando, false);
  a.contexto.fetch = async () => { a.state.empresa = { id: 'outra', perfil: 'gestor_master' }; return { ok: true, json: async () => ({ usuarios: [{ dashboard_liberada: true }] }) }; };
  await a.contexto.carregarUsuariosMobile();
  assert.equal(a.state.usuariosEmpresa.length, 0);
});

test('três formulários reutilizam o seletor React oficial sem duplicar catálogo de módulos', () => {
  const bridge = readFileSync('app/mobile/AcessosUsuarioMobileBridge.tsx', 'utf8');
  assert.match(bridge, /import AcessosUsuarioCampos/);
  assert.match(bridge, /createPortal/);
  assert.match(bridge, /validarLiberacoes/);
  assert.match(bridge, /!slot.node.isConnected/);
  for (const contexto of ['criar', 'existente', 'editar']) assert.match(fonte, new RegExp("acessosUsuarioSlotMobile\\('" + contexto + "'"));
  assert.match(readFileSync('app/mobile/page.tsx', 'utf8'), /<AcessosUsuarioMobileBridge \/>/);
});

test('ponte mantém alterações no mesmo formulário e descarta controles desconectados', () => {
  let slots = [], montado = false, limpar;
  const eventos = [], listeners = {};
  const node = { isConnected: true, dataset: { mobileAcessosUsuario: JSON.stringify({ contexto: 'editar', empresaId: 'empresa', acessoId: 'alvo', perfil: 'administrador', disabled: false, value: { dashboard: true, modulos: ['ponto'] } }) } };
  const window = { addEventListener: (tipo, fn) => { listeners[tipo] = fn; }, removeEventListener: tipo => delete listeners[tipo], dispatchEvent: evento => eventos.push(evento) };
  const exports = {};
  const deps = {
    react: { useState: () => [slots, valor => { slots = typeof valor === 'function' ? valor(slots) : valor; }], useEffect: fn => { if (!montado) { montado = true; limpar = fn(); } } },
    'react-dom': { createPortal: (child, target) => ({ child, target }) },
    'react/jsx-runtime': jsxRuntime,
    '../components/AcessosUsuarioCampos': { default: () => null },
    '../lib/acessos-usuario': domain,
  };
  const contexto = { exports, window, document: { querySelectorAll: () => [node] }, Event: class { constructor(type) { this.type = type; } }, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, require: id => deps[id] };
  vm.runInNewContext(ts.transpileModule(readFileSync('app/mobile/AcessosUsuarioMobileBridge.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, contexto);
  exports.default();
  const portal = exports.default()[0];
  assert.equal(portal.target, node);
  const value = { dashboard: false, modulos: ['ponto'] };
  portal.child.props.onChange(value);
  assert.equal(JSON.parse(node.dataset.mobileAcessosUsuario).value.dashboard, false);
  assert.equal(exports.default()[0].child.props.value.dashboard, false);
  assert.equal(eventos.at(-1).type, 'avantalab:usuario-liberacoes');
  assert.equal(eventos.at(-1).detail.acessoId, 'alvo');
  const total = eventos.length;
  node.isConnected = false;
  portal.child.props.onChange({ dashboard: true, modulos: [] });
  assert.equal(eventos.length, total);
  limpar();
  assert.equal(window.__avantaAcessosUsuario, undefined);
});

test('erro de gravação mantém edição aberta e desativação selecionada para tentar novamente', async () => {
  const a = ambiente(); a.contexto.editarUsuarioMobile('alvo');
  a.state.editUsuarioLiberacoes = { dashboard: false, modulos: ['ponto'] };
  a.contexto.fetch = async () => ({ ok: false, json: async () => ({ erro: true, mensagem: 'Falha controlada' }) });
  await a.contexto.salvarUsuarioMobile();
  assert.equal(a.state.usuarioEditandoId, 'alvo');
  assert.equal(a.state.editUsuarioLiberacoes.dashboard, false);
  assert.equal(a.state.carregando, false);
  assert.equal(a.avisos.length, 0);
  assert.match(a.erros[0], /Falha controlada/);
});
