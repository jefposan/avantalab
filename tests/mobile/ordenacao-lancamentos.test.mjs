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
  assert.match(estilos, /\.av-mobile-lancamentos-pilula-expandida\s*\{[\s\S]*?width: 112px;[\s\S]*?flex-shrink: 0;/);
  assert.doesNotMatch(estilos, /animation: av-mobile-lancamentos-pilula-expandir/);
  assert.match(estilos, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.av-mobile-lancamentos-pilula-expandida[\s\S]*?animation: none;/);
});

test('mesmo dia mantém última inclusão acima nas duas direções, sem usar atualização', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const inicio = mobile.indexOf('function ordenarLancamentosPorDiaMobile(lista, ordem)');
  const fim = mobile.indexOf('function controlesUltimosLancamentosHtml', inicio);
  const ctx = {};
  vm.runInNewContext(mobile.slice(inicio, fim) + '\nthis.ordenar = ordenarLancamentosPorDiaMobile;', ctx);
  for (const tipo of ['despesa', 'receita']) {
    const itens = Array.from({length:10}, (_, i) => ({id: tipo + i, dia:1, criadoEm:`2026-11-03T10:${String(i).padStart(2,'0')}:00Z`, updated_at:'2099-01-01T00:00:00Z'}));
    const expected = itens.map(x=>x.id).reverse();
    const misturados = [itens[4], itens[0], itens[9], itens[2], itens[7], itens[1], itens[5], itens[3], itens[8], itens[6]];
    for(const ordem of ['asc','desc']) {
      const resultado = Array.from(ctx.ordenar([...misturados, {id:'outro-dia',dia:2,criadoEm:'2026-11-03T11:00:00Z'}], ordem));
      assert.deepEqual(resultado.filter(x=>x.dia===1).map(x=>x.id), expected);
      assert.equal(resultado[ordem==='asc'?10:0].id, 'outro-dia');
    }
    assert.equal(misturados[0], itens[4]);
  }
  assert.deepEqual(Array.from(ctx.ordenar([{id:'9007199254740993',dia:1},{id:'9007199254740994',dia:1}], 'asc'), x=>x.id), ['9007199254740994','9007199254740993']);
  assert.deepEqual(Array.from(ctx.ordenar([{id:'legado',dia:1,criadoEm:'inválido'},{id:'novo',dia:1,created_at:'2026-11-03T10:00:00Z'}], 'desc'), x=>x.id), ['novo','legado']);
  assert.match(mobile, /id: l\.id, criadoEm: l\.created_at/);
  assert.match(mobile, /id: e\.id, criadoEm: e\.created_at/);
  assert.match(mobile, /criadoEm: acao === 'incluir' \? new Date\(\)\.toISOString\(\) : l\.criadoEm/);
});
