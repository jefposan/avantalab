import assert from 'node:assert/strict';
import test from 'node:test';
import { fixtureDetails, renderPostSale } from './post-sale-render-harness.mjs';

test('apresentação mostra retorno, destino, dinheiro, valor, prazo e horário em português', () => {
  const html = renderPostSale();
  for (const expected of ['Pós-venda · Mercado Livre', '11/10/2026, 11:45', '20,15', 'Depósito do Mercado Livre', 'Revisar o produto', '13/10/2026, 09:00', 'Dinheiro retido', 'não confirma pagamento', 'Atualizar pós-venda']) assert.ok(html.includes(expected), expected);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /na mesma conta desta venda/);
});

test('carregamento e erro não inventam ausência de devolução', () => {
  const loading = renderPostSale({ details: null, loading: true });
  assert.match(loading, /disabled=""/);
  assert.match(loading, /role="status"/);
  assert.ok(!loading.includes('Nenhuma devolução'));
  const error = renderPostSale({ details: null, error: 'Consulta indisponível.' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Não foi possível confirmar devolução ou reembolso/);
});

test('ausência é exibida somente quando os casos e retornos foram consultados integralmente', () => {
  const details = { ...fixtureDetails, claims: [], cancellation: null };
  assert.match(renderPostSale({ details }), /Nenhuma devolução identificada nesta consulta/);
  assert.match(renderPostSale({ details: { ...details, returnsComplete: false } }), /Não foi possível confirmar se existe devolução/);
  assert.match(renderPostSale({ details: { ...details, claimsComplete: false } }), /Não foi possível confirmar se existe devolução/);
});
