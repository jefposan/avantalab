import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { corEhClara } from '../../app/lib/formatters.ts';

const require = createRequire(import.meta.url);
export const pagina = readFileSync('app/gestao/page.tsx', 'utf8');
export const css = readFileSync('app/globals.css', 'utf8');
const ast = ts.createSourceFile('page.tsx', pagina, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let mapa, misturar;
function visitar(n) {
  if (ts.isCallExpression(n) && n.expression.getText(ast) === 'empresasDoUsuario.map' && n.getText(ast).includes('perfilAtualInativo')) mapa = n.getText(ast);
  if (ts.isVariableDeclaration(n) && n.name.getText(ast) === 'corComFundo') misturar = 'const ' + n.getText(ast) + ';';
  ts.forEachChild(n, visitar);
}
visitar(ast);
if (!mapa || !misturar) throw Error('Seletor real não encontrado.');
const exports = {};
const componente = readFileSync('app/components/SeloPerfilEmUso.tsx', 'utf8');
vm.runInNewContext(ts.transpileModule(componente, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require });
export const Selo = exports.default;
const nome = 'TRIDIUM COSMETICOS';
const perfil = (id, cor) => ({ id, cor_primaria: cor, nome: id === 'ativo' ? nome : 'Outro perfil', tipo_perfil: 'empresa', perfil: 'administrador' });
export function web({ cor = '#00aaaa', dark = false, modo = 'troca', nomeAtual = nome } = {}) {
  const efeitos = [];
  const empresas = [perfil('ativo', cor), perfil('outro', cor)]; empresas[0].nome = nomeAtual;
  const ctx = vm.createContext({ require, exports: {}, SeloPerfilEmUso: Selo, empresasDoUsuario: empresas, empresaId: 'ativo',
    modoSelecaoPerfil: modo, empresaParaSelecionar: null, darkMode: dark, corEhClara,
    rotuloTipoPerfil: () => 'Empresa', setEmpresaParaSelecionar: p => efeitos.push(p.id),
  });
  const js = ts.transpileModule(misturar + '\nglobalThis.elementos = (' + mapa + ');', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInContext(js, ctx);
  return { elementos: ctx.elementos, efeitos, html: ctx.elementos.map(e => renderToStaticMarkup(e)).join('') };
}
export function mobile({ atual = 'ativo', pendente = '' } = {}) {
  const fonte = readFileSync('public/mobile-app.js', 'utf8');
  const ast = ts.createSourceFile('mobile.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let funcao;
  function visitar(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === 'trocarEmpresaHtml') funcao = n.getText(ast); ts.forEachChild(n, visitar); } visitar(ast);
  const ctx = vm.createContext({ state: { empresas: [perfil('ativo', '#00aaaa'), perfil('outro', '#00aaaa')], empresa: { id: atual }, perfilSelecionandoId: pendente },
    rotuloTipoPerfil: () => 'Empresa', perfilFormatado: () => 'Administrador', nomeEmpresa: e => e.nome,
    escapeHtml: s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  });
  vm.runInContext(funcao, ctx);
  return ctx.trocarEmpresaHtml();
}
export const renderSelo = () => renderToStaticMarkup(React.createElement(Selo, { id: 'teste' }));
