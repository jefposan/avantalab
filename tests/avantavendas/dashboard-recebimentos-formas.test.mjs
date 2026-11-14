import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['normalizar', 'pagamentosNoPeriodoDashboard', 'resumoRecebimentosDashboard', 'abrirRecebimentosDashboard', 'kpi', 'escapeHtml', 'escapeAttr'];
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(ast)).join('\n');
function contexto(pagamentos = []) {
  const ctx = vm.createContext({ state: { pagamentos, filtroInicio: '2026-11-14', filtroFim: '2026-11-14' } });
  vm.runInContext(code, ctx);
  return ctx;
}
test('popup e total usam o mesmo período, somam centavos e não contam desconto', () => {
  const pagamentos = [
    { data_pagamento: '2026-11-14', forma_pagamento: 'Pix', valor: '12.10', desconto: 100 },
    { data_pagamento: '2026-11-14', forma_pagamento: ' PIX ', valor: 2.2 },
    { data_pagamento: '2026-11-14', forma_pagamento: 'cartao credito', valor: 7 },
    { data_pagamento: '2026-11-14', forma_pagamento: 'Cartão de crédito', valor: 3 },
    { data_pagamento: '2026-11-14', forma_pagamento: 'Dinheiro', valor: 1 },
    { criado_em: '2026-11-14T12:00:00Z', valor: 4 },
    { data_pagamento: '2026-11-13', valor: 900 },
    { data_pagamento: '2026-11-15', valor: 800 },
  ];
  const before = JSON.stringify(pagamentos), ctx = contexto(pagamentos);
  const resumo = ctx.resumoRecebimentosDashboard();
  assert.equal(resumo.total, 29.3);
  assert.deepEqual(JSON.parse(JSON.stringify(resumo.formas)), [
    { nome: 'Pix', centavos: 1430 }, { nome: 'Cartão de crédito', centavos: 1000 },
    { nome: 'Não informado', centavos: 400 }, { nome: 'Dinheiro', centavos: 100 },
  ]);
  assert.equal(JSON.stringify(pagamentos), before);
  assert.equal(contexto().resumoRecebimentosDashboard().total, 0);
});
test('card nativo acessível abre popup, com X, Escape e foco inicial; fundo usa fechamento padrão', () => {
  const ctx = contexto([{ data_pagamento: '2026-11-14', forma_pagamento: '<img onerror=alert(1)>', valor: 10 }]);
  let html = '', classe = '', focos = 0, handler, fechamentos = 0;
  const origem = { isConnected: true };
  const button = { focus() { focos++; } };
  const atributos = {};
  const wrap = { querySelector: () => ({ setAttribute(k,v) { atributos[k] = v; }, querySelector: () => button }), addEventListener(k, fn) { handler = fn; } };
  Object.assign(ctx, {
    document: { activeElement: origem, getElementById: () => wrap },
    dataBR: x => x.slice(0,10), moeda: x => 'R$ ' + x.toFixed(2), svgIcon: () => '<svg></svg>',
    sheet(h,c) { html = h; classe = c; }, fecharSheet() { fechamentos++; },
  });
  ctx.abrirRecebimentosDashboard();
  assert.match(html, /Total recebido/);
  assert.match(html, /Nenhum recebimento|Recebimentos por forma/);
  assert.match(html, /onclick="fecharSheet\(\)"/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.equal(atributos.role, 'dialog');
  assert.equal(atributos['aria-modal'], 'true');
  assert.equal(wrap.__recebimentosOrigem, origem);
  assert.equal(focos, 1);
  handler({ key:'Escape', preventDefault() {} });
  assert.equal(fechamentos, 1);
  assert.equal(classe, 'sheet-backdrop-centered dashboard-received-backdrop');
  assert.match(ctx.kpi('Total Recebido', 'R$ 10', '', 'abrirRecebimentosDashboard()'), /^<button type="button"/);
  assert.match(ctx.kpi('Total Recebido', 'R$ 10', '', 'abrirRecebimentosDashboard()'), /Ver detalhes ›/);
  assert.doesNotMatch(ctx.kpi('Outro', '1'), /Ver detalhes/);
  assert.match(ctx.kpi('Outro', '1'), /^<article/);
  assert.match(source, /event\.target === wrap && !wrap\.classList\.contains\('sheet-backdrop-static'\)/);
  assert.match(source, /sheetAtual\?\.__recebimentosOrigem\?\.isConnected/);
});
