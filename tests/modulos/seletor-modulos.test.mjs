import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', code)(id => imports[id], module, module.exports);
  return module.exports;
}
const registro = load('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
const acessos = load('app/lib/acessos-usuario.ts', { './modulos-registro': registro });
const { opcoesSeletorModulos } = load('app/lib/seletor-modulos.ts', { './acessos-usuario': acessos, './modulos-registro': registro });
const perfil = (id, ids, papel = 'administrador', ativo = true) => ({ empresa: { id }, perfil: papel, planoAtivo: ativo, modulos: ids.map(id => ({ id })) });

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
  assert.match(code, /void consultar\(opcao.id\)/);
  assert.match(code, /window.top \|\| window/);
  assert.match(code, /location.assign\(opcao.href\)/);
  assert.match(code, /ocupadoAtual.current/);
  assert.match(code, /sequencia !== pedido.current/);
  assert.doesNotMatch(code, /lerPreviaModulos|postMessage|<footer/);
  assert.match(code, /event.key === 'Escape'/);
  assert.match(code, /aria-expanded/);
});
test('seletor precede ajustes nos cabeçalhos com ajustes existentes', () => {
  for (const [file, inicio, ajustes] of [
    ['app/custos/CustosClient.tsx', '<ModuloHeader', 'Abrir ajustes de Custos'],
    ['app/projetos/ProjetosClient.tsx', '<div className={styles.moduleHeaderActions}', 'Abrir ajustes do AvantaProjetos'],
    ['app/recebimentos/RecebimentosPaginaClient.tsx', '<header className={styles.cabecalhoModulo}', 'Abrir ajustes de Operações'],
    ['app/vendas/sistema/VendasServicosPrototype.tsx', '<div className="topbar-actions">', 'Abrir ajustes de Vendas'],
  ]) {
    const code = readFileSync(file, 'utf8').split(inicio)[1];
    assert.ok(code.indexOf('<SeletorModulos') < code.indexOf(ajustes), file);
  }
});
