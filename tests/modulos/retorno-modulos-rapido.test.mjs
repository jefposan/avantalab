import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

function carregar() {
  const exports = {};
  const itens = new Map();
  vm.runInNewContext(ts.transpileModule(readFileSync('app/lib/retorno-modulos.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, window: { sessionStorage: { getItem: k => itens.get(k), setItem: (k,v) => itens.set(k,v), removeItem: k => itens.delete(k) } },
  });
  return exports;
}
const perfil = (id, dashboard = false) => ({ empresa: { id, nome: 'Empresa', corPrimaria: '#003E73', temaEscuro: false }, nomeUsuario: 'Teste', perfil: 'administrador', dashboard, planoAtivo: true, modulos: [{ id: 'projetos', nome: 'Projetos', descricao: 'Teste', icone: 'projetos' }] });
test('Trocar perfil reutiliza a seleção pós-login da Gestão sem fixar uma empresa', () => {
  const tela = readFileSync('app/modulos/MeusModulos.tsx', 'utf8');
  assert.match(tela, /onTrocarPerfil=\{\(\) => router\.replace\('\/gestao'\)\}/);
  assert.doesNotMatch(tela, /onTrocarPerfil=\{[^}]*replace\('\/modulos'\)/);
});
test('clique navega antes da rede e transporta a identidade já carregada', () => {
  const fonte = readFileSync('app/modulos/MeusModulos.tsx', 'utf8');
  const funcao = fonte.slice(fonte.indexOf('  function abrir('), fonte.indexOf('  async function sair('));
  const eventos = [];
  const contexto = {
    perfil: perfil('restrita'), previa: null, opening: '',
    setOpening() {}, setError() {},
    REGISTRO_MODULOS: [{ id: 'projetos', permissoes: { administrador: 'administrar' } }],
    prepararNavegacaoModulo: c => eventos.push(['previa', c]),
    hrefModulo: (id, empresa) => `/${id}?empresaId=${empresa}`,
    router: { prefetch() {}, push: href => eventos.push(['navegar', href]), replace() {} },
    validarSessaoDoDispositivo: () => { eventos.push(['sessao']); return new Promise(() => {}); },
  };
  vm.runInNewContext(ts.transpileModule(`${funcao}\nabrir('projetos');`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contexto);
  assert.deepEqual(eventos.map(e => e[0]), ['previa', 'navegar', 'sessao']);
  assert.equal(eventos[0][1].empresaId, 'restrita');
  assert.equal(eventos[1][1], '/projetos?empresaId=restrita');
  eventos.length = 0;
  vm.runInNewContext(ts.transpileModule(`${funcao}\nabrir('custos');`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, contexto);
  assert.equal(eventos.length, 0, 'módulo ausente da lista não deve navegar');
});
test('Início retorna diretamente aos módulos restritos e preserva Dashboard de gestores', () => {
  const r = carregar();
  r.guardarPreviaModulos('usuario', [perfil('restrita'), perfil('completa', true)]);
  assert.equal(r.destinoInicioModulo('restrita'), '/modulos?empresaId=restrita&retorno=1');
  assert.equal(r.destinoInicioModulo('completa'), '/gestao?inicio=1&empresaId=completa');
  assert.equal(r.lerPreviaModulos('restrita').perfis.length, 2);
});
test('revalidação atualiza somente o selecionado; troca de usuário e logout apagam prévia anterior', () => {
  const r = carregar();
  r.guardarPreviaModulos('um', [perfil('a'), perfil('b')]);
  r.guardarPreviaModulos('um', [perfil('a', true)], 'a');
  assert.equal(r.lerPreviaModulos('a').perfis.length, 2);
  assert.equal(r.destinoInicioModulo('a'), '/gestao?inicio=1&empresaId=a');
  r.guardarPreviaModulos('outro', [perfil('c')], 'c');
  assert.equal(r.lerPreviaModulos('a'), null);
  r.limparPreviaModulos();
  assert.equal(r.lerPreviaModulos('c'), null);
});
test('retorno mostra prévia antes da pintura e revalida em segundo plano sem spinner', () => {
  const tela = readFileSync('app/modulos/MeusModulos.tsx', 'utf8');
  assert.match(tela, /useSyncExternalStore\(observarPrevia, perfilAnterior/);
  assert.match(tela, /if \(loading && !previa\)/);
  assert.match(tela, /if \(!silencioso\) setLoading\(true\)/);
  assert.match(tela, /buscarAcessosUsuario\(silencioso && solicitado \? solicitado : undefined\)/);
  assert.match(tela, /const escolhido = perfil \|\| previa/);
  const abrir = tela.slice(tela.indexOf('function abrir('), tela.indexOf('async function sair('));
  assert.doesNotMatch(abrir, /await|buscarAcessosUsuario/);
  assert.match(abrir, /prepararNavegacaoModulo/);
  assert.ok(abrir.indexOf('router.push') < abrir.indexOf('void validarSessaoDoDispositivo'));
  for (const arquivo of ['projetos/ProjetosClient.tsx', 'custos/CustosClient.tsx', 'recebimentos/RecebimentosPaginaClient.tsx', 'vendas/VendasIntegrado.tsx', 'marketplaces/MarketplacesClient.tsx']) assert.match(readFileSync(`app/${arquivo}`, 'utf8'), /destinoInicioModulo\(/);
});
