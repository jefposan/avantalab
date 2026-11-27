import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';

function carregar(file, deps = {}, ambiente = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', ...Object.keys(ambiente), code)(id => deps[id], module, module.exports, ...Object.values(ambiente));
  return module.exports;
}
function memoria() {
  const itens = new Map();
  const window = { sessionStorage: { getItem: k => itens.get(k) || null, setItem: (k,v) => itens.set(k,v), removeItem: k => itens.delete(k) } };
  return { ...carregar('app/lib/retorno-modulos.ts', {}, { window }), window };
}
const perfil = (id, modulos = ['custos']) => ({ empresa: { id }, perfil: 'administrador', planoAtivo: true, dashboard: true, modulos: modulos.map(id => ({ id })) });

test('prévia reativa notifica inclusão e remoção sem rede, isolando empresa e usuário', () => {
  const r = memoria(); let eventos = 0;
  const parar = r.observarPreviaModulos(() => eventos++);
  r.guardarPreviaModulos('u', [perfil('e')], 'e', 1);
  assert.equal(r.lerPreviaModulos('e', 'outro'), null);
  assert.equal(r.lerPreviaModulos('outra', 'u'), null);
  r.guardarPreviaModulos('u', [perfil('e', ['custos', 'projetos'])], 'e', 2);
  assert.equal(r.lerPreviaModulos('e', 'u').perfil.modulos.length, 2);
  r.guardarPreviaModulos('u', [perfil('e', [])], 'e', 3);
  assert.equal(r.lerPreviaModulos('e', 'u').perfil.modulos.length, 0);
  assert.equal(eventos, 3);
  let duranteLimpeza;
  r.observarPreviaModulos(() => { duranteLimpeza = r.lerPreviaModulos('e', 'u'); });
  r.limparPreviaModulos(); assert.equal(duranteLimpeza, null);
  parar();
});

test('resposta antiga não ressuscita módulos ou vínculos revogados', () => {
  const r = memoria();
  r.guardarPreviaModulos('u', [perfil('e')], 'e', 100);
  r.guardarPreviaModulos('u', [perfil('e', [])], 'e', 300);
  r.guardarPreviaModulos('u', [perfil('e')], 'e', 200);
  assert.equal(r.lerPreviaModulos('e', 'u').perfil.modulos.length, 0);
  r.guardarPreviaModulos('u', [], 'e', 500);
  r.guardarPreviaModulos('u', [perfil('e')], undefined, 400);
  assert.equal(r.lerPreviaModulos('e', 'u'), null);
});

test('storage de outra janela substitui memória local; login de outro usuário não reutiliza perfil', () => {
  const r = memoria();
  r.guardarPreviaModulos('u', [perfil('e')]);
  r.window.sessionStorage.setItem(r.CHAVE_PREVIA_MODULOS, JSON.stringify({ usuarioId: 'v', expiraEm: Date.now() + 10000, perfis: [perfil('nova')] }));
  r.sincronizarPreviaModulos();
  assert.equal(r.lerPreviaModulos('e', 'u'), null);
  assert.equal(r.lerPreviaModulos('nova', 'u'), null);
  assert.equal(r.lerPreviaModulos('nova', 'v').perfil.empresa.id, 'nova');
});

function componente({ fresco = [perfil('e')], sessaoAtiva = true, aberto = false, hospedeiro = false, editorAberto = false } = {}) {
  const chamadas = [], mudancas = [];
  const estados = [aberto, false, '', '', { top: 0, right: 8 }]; let indice = 0;
  const react = { ...React, useEffect() {}, useId: () => 'teste', useRef: value => ({ current: value }), useState: initial => {
    const atual = indice++; return [estados[atual] ?? initial, value => mudancas.push([atual, value])];
  } };
  const registro = carregar('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
  const acessos = carregar('app/lib/acessos-usuario.ts', { './modulos-registro': registro });
  const dominio = carregar('app/lib/seletor-modulos.ts', { './acessos-usuario': acessos, './modulos-registro': registro });
  const window = { location: { assign: href => chamadas.push(['navegar', href]) } };
  const { default: Seletor } = carregar('app/components/SeletorModulos.tsx', {
    react, 'react/jsx-runtime': jsx, 'react-dom': { createPortal: elemento => elemento },
    'next/navigation': { useRouter: () => ({ push: (...args) => chamadas.push(['navegar', ...args]) }) },
    '@/app/lib/navegacao-modulos': {
      MENSAGEM_TROCA_MODULO: 'trocar',
      editorBloqueiaNavegacao: () => editorAberto,
      solicitarTrocaAoHospedeiro: troca => {
        if (hospedeiro) chamadas.push(['hospedeiro', troca.destino, troca.empresaId]);
        return hospedeiro;
      },
    },
    '@/app/hooks/useAcessosNavegacao': { useAcessosNavegacao: () => ({ perfil: perfil('e'), usuarioId: 'u', atualizar() {}, erro: '' }) },
    '@/app/lib/navegacao-acessos-cliente': { atualizarAcessosNavegacao: async (...args) => { chamadas.push(['validar', ...args]); return fresco; } },
    '@/app/lib/sessao-acesso-cliente': { validarSessaoDoDispositivo: async (...args) => { chamadas.push(['sessao', ...args]); return { ok: sessaoAtiva, ativa: sessaoAtiva }; } },
    '@/app/lib/seletor-modulos': dominio, '@/app/projetos/components/Icon': { Icon: () => null },
    './ModalConfirmacao': { default: () => null }, './SeletorModulos.module.css': { default: {} },
  }, { window, document: { body: {} } });
  const arvore = Seletor({ empresaId: 'e', moduloAtual: 'projetos' });
  return { arvore, chamadas, mudancas };
}

test('abrir e reabrir Navegar apenas muda estado: zero consultas', () => {
  for (const aberto of [false, true, false]) {
    const c = componente({ aberto });
    c.arvore.props.children[0].props.onClick();
    assert.deepEqual(c.chamadas, []);
    assert.ok(c.mudancas.some(([indice, valor]) => indice === 0 && valor === !aberto));
  }
});

async function selecionar(c, id) {
  const painel = c.arvore.props.children[1];
  const lista = painel.props.children.at(-1);
  lista.props.onSelecionar(id);
  await new Promise(resolve => setImmediate(resolve));
}
test('prévia permitida nunca autoriza destino revogado, nem dispositivo recusado', async () => {
  for (const opcoes of [{ aberto: true, fresco: [] }, { aberto: true, sessaoAtiva: false }]) {
    const c = componente(opcoes); await selecionar(c, 'custos');
    assert.ok(c.chamadas.some(item => item[0] === 'validar' && item[3] === true));
    assert.ok(!c.chamadas.some(item => item[0] === 'navegar'));
    assert.ok(c.mudancas.some(([indice, valor]) => indice === 2 && typeof valor === 'string' && valor));
  }
});
test('seleção autorizada valida novamente e navega somente à rota oficial', async () => {
  const c = componente({ aberto: true }); await selecionar(c, 'custos');
  assert.deepEqual(c.chamadas.at(-1), ['navegar', '/custos?empresaId=e']);
});

test('broadcast do servidor não contém permissões, trata indisponibilidade e libera canal', async () => {
  const { notificarAcessosModulos } = carregar('app/lib/navegacao-acessos-servidor.ts');
  const eventos = []; const canal = { httpSend: async (...args) => { eventos.push(args); return { success: true }; } };
  let removido = false;
  await notificarAcessosModulos({ channel: nome => { assert.equal(nome, 'avantalab-acessos-modulos-v1:e'); return canal; }, removeChannel: async c => { removido = c === canal; } }, 'e');
  assert.deepEqual(eventos, [['atualizados', {}, { timeout: 1500 }]]);
  assert.equal(removido, true);
  const aviso = carregar('app/lib/navegacao-acessos-servidor.ts', {}, { console: { warn() {} } });
  await assert.doesNotReject(() => aviso.notificarAcessosModulos({ channel() { throw Error('offline'); } }, 'e'));
});

function cliente() {
  const r = memoria(); let usuario = 'u'; const requisicoes = [];
  const lib = carregar('app/lib/navegacao-acessos-cliente.ts', {
    './supabase': { supabase: { auth: { getSession: async () => ({ data: { session: usuario ? { user: { id: usuario }, access_token: 'token-sintetico' } : null } }) } } },
    './retorno-modulos': r,
  }, { fetch: (url, opts) => new Promise(resolve => requisicoes.push({ url, opts, resolve })) });
  return { ...lib, r, requisicoes, mudarUsuario: id => { usuario = id; } };
}
const ciclo = () => new Promise(resolve => setImmediate(resolve));
test('sincronizações concorrentes deduplicam HTTP, mas seleção exige consulta nova', async () => {
  const c = cliente();
  const a = c.atualizarAcessosNavegacao('e', 'u');
  const b = c.atualizarAcessosNavegacao('e', 'u');
  await ciclo(); assert.equal(c.requisicoes.length, 1);
  assert.equal(c.requisicoes[0].opts.cache, 'no-store');
  c.requisicoes[0].resolve(Response.json({ perfis: [perfil('e'), perfil('outra')] }));
  assert.equal((await a).length, 1); await b;
  const selecao = c.atualizarAcessosNavegacao('e', 'u', true);
  await ciclo(); assert.equal(c.requisicoes.length, 2);
  c.requisicoes[1].resolve(Response.json({ perfis: [] })); await selecao;
  assert.equal(c.r.lerPreviaModulos('e', 'u'), null);
});
test('resposta HTTP de sessão antiga não é registrada após trocar usuário', async () => {
  const c = cliente(); const consulta = c.atualizarAcessosNavegacao('e', 'u');
  await ciclo(); c.mudarUsuario('v'); c.requisicoes[0].resolve(Response.json({ perfis: [perfil('e')] }));
  await assert.rejects(consulta, /sessão foi alterada/);
  assert.equal(c.r.lerPreviaModulos('e'), null);
});
test('indisponibilidade HTTP não autoriza nem substitui lista anterior por dados inválidos', async () => {
  const c = cliente(); c.r.guardarPreviaModulos('u', [perfil('e')], 'e');
  const consulta = c.atualizarAcessosNavegacao('e', 'u', true); await ciclo();
  c.requisicoes[0].resolve(Response.json({ perfis: [perfil('outra')] }, { status: 503 }));
  await assert.rejects(consulta, /atualizar os acessos/);
  assert.equal(c.r.lerPreviaModulos('e', 'u').perfil.empresa.id, 'e');
  assert.equal(c.r.lerPreviaModulos('outra', 'u'), null);
});

test('fluxos confirmados notificam mudança, sem conceder direitos pelo broadcast', () => {
  for (const file of ['app/api/cobranca/modulos/ativar/route.ts', 'app/api/cobranca/modulos/remover/route.ts', 'app/api/cobranca/modulos/cancelar/route.ts', 'app/api/cobranca/webhook/route.ts', 'app/api/atualizar-usuario-empresa/route.ts']) assert.match(readFileSync(file, 'utf8'), /await notificarAcessosModulos\(/, file);
  const hook = readFileSync('app/hooks/useAcessosNavegacao.ts', 'utf8');
  assert.match(hook, /on\('broadcast', \{ event: EVENTO_ACESSOS_MODULOS \}, atualizarSilencioso\)/);
  assert.match(hook, /sincronizarPreviaModulos\(\)/);
  assert.match(hook, /evento === 'SIGNED_OUT'/);
  assert.doesNotMatch(hook, /setOpcoes\(|payload\.permissoes|payload\.modulos/);
  const mobile = readFileSync('public/mobile-app.js', 'utf8');
  assert.match(mobile, /db.channel\('avantalab-acessos-modulos-v1:' \+ empresaIdAtivacao\)/);
  assert.match(mobile, /type: 'broadcast', event: 'atualizados', payload: \{\}/);
});


test('seleção valida acesso e dispositivo juntos, sem recarregar o documento', async () => {
  let liberar;
  const fresco = new Promise(resolve => { liberar = resolve; });
  const c = componente({ aberto: true, fresco });
  const selecao = selecionar(c, 'custos');
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 0 && valor === false));
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 1 && valor === true));
  assert.ok(!c.chamadas.some(item => item[0] === 'navegar'));
  assert.ok(c.chamadas.some(item => item[0] === 'sessao' && item[2] === 'verificar'));
  liberar([perfil('e')]);
  await selecao;
  assert.deepEqual(c.chamadas.at(-1), ['navegar', '/custos?empresaId=e']);
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 1 && valor === false));
});
test('recusa restaura a lista com erro e encerra a preparação', async () => {
  const c = componente({ aberto: true, fresco: [] }); await selecionar(c, 'custos');
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 0 && valor === true));
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 1 && valor === false));
  const source = readFileSync('app/components/SeletorModulos.tsx', 'utf8');
  assert.doesNotMatch(source, /Validando acesso/);
  assert.doesNotMatch(source, /createPortal\(<CarregamentoDadosModulo ativo/);
  assert.match(source, /addEventListener\('pageshow', retomar\)/);
});

test('módulo embutido entrega a troca ao hospedeiro, sem navegar no próprio iframe', async () => {
  const c = componente({ aberto: true, hospedeiro: true });
  await selecionar(c, 'dashboard');
  assert.deepEqual(c.chamadas.at(-1), ['hospedeiro', 'dashboard', 'e']);
  assert.equal(c.chamadas.some(item => item[0] === 'navegar'), false);
});

test('proteção de editor legado impede troca de documento e de rota', async () => {
  const c = componente({ aberto: true, editorAberto: true });
  await selecionar(c, 'custos');
  assert.deepEqual(c.chamadas, []);
  assert.ok(c.mudancas.some(([indice, valor]) => indice === 2 && /editor aberto/.test(valor)));
});
