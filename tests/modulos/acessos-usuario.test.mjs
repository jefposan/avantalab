import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { readFileSync } = require('node:fs');
function load(file, imports = {}) { const module = { exports: {} }; const code = ts.transpileModule(readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; new Function('require','module','exports',code)(id => imports[id],module,module.exports); return module.exports; }
const registro = load('app/lib/modulos-registro.ts', { './planos-comerciais': { VALOR_MODULO_AVULSO_MENSAL: 14.9 } });
const a = load('app/lib/acessos-usuario.ts', { './modulos-registro': registro });
test('entrada com Dashboard, módulo único, múltiplos e acesso revogado', () => {
  assert.equal(a.destinoAposLogin('empresa',true,['projetos']),'/gestao?empresaId=empresa');
  assert.equal(a.destinoAposLogin('empresa',false,['projetos']),'/projetos?empresaId=empresa');
  assert.equal(a.destinoAposLogin('empresa',false,['ponto']),'/gestao?empresaId=empresa&areaModulo=ponto');
  assert.equal(a.destinoAposLogin('empresa',false,['projetos','custos']),'/modulos?empresaId=empresa');
  assert.equal(a.destinoAposLogin('empresa',false,[]),'/modulos?empresaId=empresa');
});
test('legado mantém acesso; Master não fica sem Gestão; papel não amplia concessões', () => {
  assert.equal(a.liberacoesDoVinculo({perfil:'administrador'}).dashboard,true);
  assert.equal(a.liberacoesDoVinculo({perfil:'gestor_master',dashboard_liberada:false,modulos_liberados:[]}).dashboard,true);
  assert.deepEqual(a.liberacoesDoVinculo({perfil:'operador_completo',dashboard_liberada:false,modulos_liberados:['projetos']}).modulos,['projetos']);
  assert.throws(() => a.validarLiberacoes({dashboard:false,modulos:[]}));
  assert.throws(() => a.validarLiberacoes({dashboard:false,modulos:['ponto']},'operador_completo'));
  assert.throws(() => a.validarLiberacoes({dashboard:false,modulos:['nao_existe']}));
});
test('APIs de módulos, administração e financeiro resolvem áreas independentes', () => {
  assert.equal(a.areaDaApi('/api/modulos/marketplaces/produtos'),'marketplaces');
  assert.equal(a.areaDaApi('/api/modulos/acesso','custos'),'custos');
  assert.equal(a.areaDaApi('/api/criar-funcionario-ponto'),'ponto');
  assert.equal(a.areaDaApi('/api/lancamentos/nota'),'dashboard');
  assert.equal(a.areaDaApi('/api/atualizar-usuario-empresa'),'dashboard');
});
