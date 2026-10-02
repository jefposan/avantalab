import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const raiz = new URL('../..', import.meta.url);

test('Gestão Mobile alterna despesas e receitas entre datas recentes e antigas', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const inicio = mobile.indexOf('function ordenarLancamentosPorDiaMobile(lista, ordem)');
  const fim = mobile.indexOf('function controlesUltimosLancamentosHtml', inicio);
  const ordenar = mobile.slice(inicio, fim);
  const contexto = {};

  vm.runInNewContext(`${ordenar}\nthis.ordenar = ordenarLancamentosPorDiaMobile;`, contexto);

  const lancamentos = [{ dia: 12 }, { dia: 3 }, { dia: 27 }];
  assert.deepEqual(
    Array.from(contexto.ordenar(lancamentos, 'desc'), (item) => item.dia),
    [27, 12, 3],
  );
  assert.deepEqual(
    Array.from(contexto.ordenar(lancamentos, 'asc'), (item) => item.dia),
    [3, 12, 27],
  );
  assert.deepEqual(lancamentos.map((item) => item.dia), [12, 3, 27]);

  assert.match(mobile, /ultimasDespesasOrdem: 'desc'/);
  assert.match(mobile, /ultimasReceitasOrdem: 'desc'/);
  assert.match(mobile, /id="ordenar-ultimas-' \+ plural/);
  assert.match(mobile, /bind\('ordenar-ultimas-despesas'[^]*?ultimasDespesasOrdem === 'desc' \? 'asc' : 'desc'/);
  assert.match(mobile, /bind\('ordenar-ultimas-receitas'[^]*?ultimasReceitasOrdem === 'desc' \? 'asc' : 'desc'/);
});

test('Recolher e lupa formam uma única pílula nos dois cards de lançamentos', async () => {
  const [mobile, estilos] = await Promise.all([
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
    readFile(new URL('app/globals.css', raiz), 'utf8'),
  ]);
  const inicio = mobile.indexOf('function controlesUltimosLancamentosHtml(configuracao)');
  const fim = mobile.indexOf('function recorteHeaderLancamentosHtml', inicio);
  const controles = mobile.slice(inicio, fim);

  assert.match(controles, /av-mobile-lancamentos-pilula-expandida/);
  assert.match(controles, /id="toggle-ultimas-' \+ plural[\s\S]*?Recolher[\s\S]*?id="buscar-ultimas-' \+ plural/);
  assert.match(controles, /role="group" aria-label="Ações da lista de /);
  assert.match(estilos, /\.av-mobile-lancamentos-pilula\s*\{[\s\S]*?width: 32px;[\s\S]*?max-width: 32px;/);
  assert.match(estilos, /\.av-mobile-lancamentos-pilula-expandida\s*\{[\s\S]*?animation: av-mobile-lancamentos-pilula-expandir/);
  assert.match(estilos, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.av-mobile-lancamentos-pilula-expandida[\s\S]*?animation: none;/);
});
