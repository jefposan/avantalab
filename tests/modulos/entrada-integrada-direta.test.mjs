import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const modulo = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('app/lib/acessos-usuario.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(() => ({ REGISTRO_MODULOS: [] }), modulo, modulo.exports);
const { areaDaApi } = modulo.exports;

const gestao = readFileSync(new URL('../../app/gestao/page.tsx', import.meta.url), 'utf8');
test('entrada integrada usa apenas o perfil selecionado, sessão confirmada e prévia visual', () => {
  const bloco = gestao.slice(gestao.indexOf('const areaInterna ='), gestao.indexOf('const hashConfirmacao ='));
  assert.match(bloco, /validarSessaoEntrada\(supabase.auth\)/);
  assert.match(readFileSync('app/lib/validar-sessao-entrada.ts','utf8'), /await auth.getSession\(\)/);
  assert.match(bloco, /consumirNavegacaoModulo\(areaInterna, empresaInterna\)/);
  assert.match(bloco, /buscarAcessosUsuario\(empresaInterna\)/);
  assert.doesNotMatch(bloco, /getUser|buscarEmpresasDoUsuario|signOut/);
  assert.ok(bloco.indexOf('if (previa) aplicar(previa)') < bloco.indexOf('await buscarAcessosUsuario'));
  assert.match(bloco, /acesso\?\.modulos.some/);
});
test('leitura empresarial de Vendas mantém concessão do módulo e não expõe escrita', () => {
  assert.equal(areaDaApi('/api/modulos/vendas/perfil'), 'vendas');
  assert.equal(areaDaApi('/api/perfil-cadastro'), 'dashboard');
  const rota = readFileSync(new URL('../../app/api/modulos/vendas/perfil/route.ts', import.meta.url), 'utf8');
  assert.match(rota, /export \{ GET \}/);
  assert.doesNotMatch(rota, /export.*(?:POST|PATCH|PUT|DELETE)/);
});
test('falha de carga autenticada não encerra sessão', () => {
  const bloco = gestao.slice(gestao.indexOf("console.error('Erro ao carregar pagina ja logada"), gestao.indexOf('const mesAtual = meses[new Date().getMonth()]', gestao.indexOf("console.error('Erro ao carregar pagina ja logada")));
  assert.match(bloco, /router.replace\('\/modulos'\)/);
  assert.doesNotMatch(bloco, /signOut|await voltarAoLoginAposSessaoInvalida/);
});
