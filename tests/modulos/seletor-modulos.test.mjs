import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(id => imports[id], module, module.exports);
  return module.exports;
}
const registro = load('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
const acessos = load('app/lib/acessos-usuario.ts', { './modulos-registro': registro });
const { opcoesSeletorModulos, opcoesNavegacao } = load('app/lib/seletor-modulos.ts', { './acessos-usuario': acessos, './modulos-registro': registro });
const perfil = (id, ids, papel = 'administrador', ativo = true) => ({ empresa: { id }, perfil: papel, planoAtivo: ativo, modulos: ids.map(id => ({ id })) });

test('acionador mantém rótulo Navegar, grade e seta independente do módulo atual', () => {
  const code = readFileSync('app/components/SeletorModulos.tsx', 'utf8');
  assert.match(code, /aria-label="Navegar"/);
  assert.match(code, /<Icon name="grid" size=\{18\} \/><span>Navegar<\/span><Icon name="chevron"/);
  assert.doesNotMatch(code, /atual\?\.nome/);
  assert.match(code, /opcao.id === moduloAtual \? <b>Atual<\/b>/);
});

test('seletor limita opções ao perfil consultado, sem concessões de outra empresa', () => {
  const lista = opcoesSeletorModulos([perfil('outra', ['vendas']), perfil('atual', ['custos', 'projetos', 'custos', 'inventado'])], 'atual');
  assert.deepEqual(lista.map(item => item.id), ['projetos', 'custos']);
  assert.ok(lista.every(item => item.href.endsWith('?empresaId=atual')));
  assert.deepEqual(opcoesSeletorModulos([perfil('outra', ['custos'])], 'atual'), []);
});
test('seletor respeita papel, plano e revogação, inclusive módulos integrados', () => {
  assert.deepEqual(opcoesSeletorModulos([perfil('e', ['ponto', 'recebimentos_presencial', 'custos'], 'operador_simples')], 'e').map(item => item.id), ['custos']);
  assert.deepEqual(opcoesSeletorModulos([perfil('e', ['custos'], 'administrador', false)], 'e'), []);
  assert.deepEqual(opcoesSeletorModulos([perfil('e', [])], 'e'), []);
  assert.equal(opcoesSeletorModulos([perfil('e', ['ponto'])], 'e')[0].href, '/gestao?empresaId=e&areaModulo=ponto');
});
test('destinos são locais do registro, ignorando URLs externas enviadas na lista', () => {
  const adulterado = perfil('a&b', ['custos']);
  adulterado.modulos[0].href = 'https://example.com';
  assert.equal(opcoesSeletorModulos([adulterado], 'a&b')[0].href, '/custos?empresaId=a%26b');
});
test('troca revalida acesso, preserva beforeunload e não usa cache visual ou mensagens irrestritas', () => {
  const code = readFileSync('app/components/SeletorModulos.tsx', 'utf8');
  assert.match(code, /cache: 'no-store'/);
  assert.match(code, /void consultar\(destino\)/);
  assert.match(code, /window.top \|\| window/);
  assert.match(code, /location.assign\(opcao.href\)/);
  assert.match(code, /ocupadoAtual.current/);
  assert.match(code, /sequencia !== pedido.current/);
  assert.doesNotMatch(code, /lerPreviaModulos|postMessage|<footer/);
  assert.match(code, /event.key === 'Escape'/);
  assert.match(code, /aria-expanded/);
});
test('Navegar ocupa lado esquerdo e não é duplicado nas ações da direita', () => {
  for (const [file, inicio, identidade, fim] of [
    ['app/projetos/ProjetosClient.tsx', 'return <header', '<div className={styles.moduleIdentity}', '</header>'],
    ['app/recebimentos/RecebimentosPaginaClient.tsx', '<header className={styles.cabecalhoModulo}', '<div className={styles.identidadeModulo}', '</header>'],
    ['app/vendas/sistema/VendasServicosPrototype.tsx', '<header className="topbar">', '<div className="module-brand">', '</header>'],
  ]) {
    const code = readFileSync(file, 'utf8').split(inicio)[1].split(fim)[0];
    assert.equal((code.match(/<SeletorModulos/g) || []).length, 1, file);
    assert.ok(code.indexOf('<SeletorModulos') < code.indexOf(identidade), file);
  }
  for (const file of ['app/custos/CustosClient.tsx', 'app/marketplaces/MarketplacesClient.tsx']) {
    const header = readFileSync(file, 'utf8').split('<ModuloHeader')[1].split('</ModuloHeader>')[0];
    assert.equal((header.match(/<SeletorModulos/g) || []).length, 1, file);
    assert.match(header, /navigation=\{<SeletorModulos/);
  }
});

test('Dashboard aparece primeiro somente quando concedida à empresa exata', () => {
  const atual = { ...perfil('a&b', ['custos']), dashboard: true };
  assert.deepEqual(opcoesNavegacao([atual], 'a&b').map(item => item.id), ['dashboard', 'custos']);
  assert.equal(opcoesNavegacao([atual], 'a&b')[0].href, '/gestao?inicio=1&empresaId=a%26b');
  assert.deepEqual(opcoesNavegacao([atual, perfil('outra', ['projetos'])], 'outra').map(item => item.id), ['projetos']);
  assert.deepEqual(opcoesNavegacao([{ ...atual, dashboard: false }], 'a&b').map(item => item.id), ['custos']);
  assert.deepEqual(opcoesNavegacao([{ ...atual, dashboard: 'true' }], 'a&b').map(item => item.id), ['custos']);
  assert.deepEqual(opcoesNavegacao([], 'a&b'), []);
});

test('concessão da Dashboard permanece independente da instalação/plano dos módulos', () => {
  const atual = { ...perfil('e', [], 'operador_simples', false), dashboard: true };
  assert.deepEqual(opcoesNavegacao([atual], 'e').map(item => item.id), ['dashboard']);
  assert.deepEqual(opcoesNavegacao([{ ...atual, dashboard: false }], 'e'), []);
});

test('cabeçalho compartilhado substitui retorno por navegação sem duplicar o botão', () => {
  const { default: Header } = load('app/components/ModuloHeader.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    '@/app/projetos/components/Icon': { Icon: () => null },
    '@/app/custos/custos.module.css': { default: {} }, './Tooltip': { default: ({ children }) => children },
  });
  const props = { empresa: { nome: 'Empresa de teste', corPrimaria: '#003e73', temaEscuro: false }, onBack() {} };
  const html = renderToStaticMarkup(React.createElement(Header, { ...props, navigation: React.createElement('button', null, 'Navegar') }, React.createElement('button', null, 'Ajustes')));
  assert.equal((html.match(/Navegar/g) || []).length, 1);
  assert.doesNotMatch(html, /Início/);
  assert.ok(html.indexOf('Navegar') < html.indexOf('Empresa de teste'));
  assert.ok(html.indexOf('Empresa de teste') < html.indexOf('Ajustes'));
  assert.match(renderToStaticMarkup(React.createElement(Header, props)), /Início/);
});

test('lista renderizada separa Dashboard e módulos, mantém Atual e bloqueia operações', () => {
  const { ListaDestinosNavegacao } = load('app/components/SeletorModulos.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-dom': {},
    '@/app/lib/supabase': {}, '@/app/lib/sessao-acesso-cliente': {},
    '@/app/lib/seletor-modulos': { opcoesNavegacao },
    '@/app/projetos/components/Icon': { Icon: () => null },
    './ModalConfirmacao': { default: () => null }, './SeletorModulos.module.css': { default: {} },
  });
  const opcoes = opcoesNavegacao([{ ...perfil('e', ['custos', 'projetos']), dashboard: true }], 'e');
  const props = { opcoes, moduloAtual: 'custos', bloqueado: false, onSelecionar() {} };
  const html = renderToStaticMarkup(React.createElement(ListaDestinosNavegacao, props));
  assert.ok(html.indexOf('Dashboard') < html.indexOf('MÓDULOS'));
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /disabled="" aria-current="page"/);
  assert.match(html, />Atual<\/b>/);
  const bloqueado = renderToStaticMarkup(React.createElement(ListaDestinosNavegacao, { ...props, bloqueado: true }));
  assert.equal((bloqueado.match(/disabled=""/g) || []).length, opcoes.length);
});
