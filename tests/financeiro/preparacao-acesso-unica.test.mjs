import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const nativeRequire = createRequire(import.meta.url);
const loading = {};
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/LoadingPontos.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:loading,require:nativeRequire});
const require = id=>id==='./LoadingPontos'?loading:nativeRequire(id);
const exports = {};
const source = readFileSync('app/components/TelaCarregandoAcesso.tsx', 'utf8');
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText, {exports,require});
const render = props => renderToStaticMarkup(React.createElement(exports.default, props));

test('espera social, sessão e empresa mantêm o mesmo card de preparação', () => {
  const mensagens = ['Aguardando a confirmação do login social.', 'Verificando sua sessão...', 'Carregando empresa...'];
  const cenas = mensagens.map(mensagem => render({preparandoAcesso:true,mensagem}));
  assert.equal(new Set(cenas).size, 1);
  assert.match(cenas[0], /Preparando acesso/);
  assert.match(cenas[0], /Aguarde um instante/);
  assert.equal((cenas[0].match(/avanta-loading-pontos-trajeto/g)||[]).length, 1);
  assert.match(cenas[0], /role="status" aria-busy="true"/);
  assert.doesNotMatch(cenas[0], /\d+%/);
});
test('preparação não mostra cancelar nem reserva espaço para botão removido', () => {
  const social = render({preparandoAcesso:true,mensagem:'social',onCancelar:()=>{}});
  const sessao = render({preparandoAcesso:true,mensagem:'sessão'});
  assert.doesNotMatch(social, /Cancelar e voltar ao login/);
  assert.equal(social, sessao);
  assert.doesNotMatch(sessao, /<button|invisible/);
  assert.match(readFileSync('app/globals.css','utf8'), /prefers-reduced-motion:reduce/);
});
test('outras telas mantêm títulos e mensagens próprios; Gestão e retorno OAuth optam pela cena única', () => {
  assert.match(render({titulo:'Outro carregamento',mensagem:'Outro estado'}), /Outro carregamento/);
  for (const file of ['app/gestao/page.tsx','app/components/RedirecionamentoPosOAuth.tsx']) assert.match(readFileSync(file,'utf8'), /<TelaCarregandoAcesso\s+preparandoAcesso/);
});
