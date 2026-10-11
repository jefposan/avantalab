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

test('detalhe orienta próximo responsável e separa opção disponível de pendência', () => {
  const claim = { ...fixtureDetails.claims[0], detailComplete: true, stageText: 'Mediação do Mercado Livre', problemText: 'O produto não funciona.', responsibleText: 'Vendedor — sua conta', dueAt: '2026-10-13T12:00:00Z', actions: [{ text: 'Responder ao comprador no Mercado Livre', required: true, dueAt: null }, { text: 'Avaliar reembolso no Mercado Livre', required: false, dueAt: null }] };
  const html = renderPostSale({ details: { ...fixtureDetails, claims: [claim] } });
  for (const expected of ['Etapa do processo', 'Problema relatado', 'Vendedor — sua conta', 'Prazo informado', 'Pendente: Responder', 'Disponível: Avaliar']) assert.ok(html.includes(expected), expected);
  const closed = renderPostSale({ details: { ...fixtureDetails, claims: [{ ...claim, statusText: 'Encerrada', actions: [], dueAt: null }] } });
  assert.match(closed, /Caso encerrado — confira a resolução/);
  assert.ok(!closed.includes('Prazo informado'));
});

test('acesso negado oferece orientação sem declarar ausência nem autorizar reembolso', () => {
  const html = renderPostSale({ details: { ...fixtureDetails, claims: [], claimsComplete: false, returnsComplete: false, accessIssues: [{ area: 'busca de reclamações', permissionDenied: true, policyDenied: false }] } });
  assert.match(html, /Como liberar a consulta do pós-venda/);
  assert.match(html, /claims e returns/);
  assert.match(html, /Não é necessário excluir a conta/);
  assert.ok(!html.includes('Nenhuma reclamação vinculada'));
  assert.match(html, /Não foi possível confirmar se existe devolução/);
});
