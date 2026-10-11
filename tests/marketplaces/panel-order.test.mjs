import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MARKETPLACE_PANEL_ORDER, marketplacePanelOrderKey, parseMarketplacePanelOrder } from '../../app/modules/marketplaces/panel-order.ts';
import { posicoesVerticaisKanbanEstavel, moverItemNaOrdem } from '../../app/lib/dnd.ts';

test('ordem inicial: Vendas antes de Anunciados, independente de preferência inválida', () => {
  assert.deepEqual(DEFAULT_MARKETPLACE_PANEL_ORDER, ['sales', 'products', 'announced']);
  for (const value of [null, '', 'bad', '[]', 'null', '{"version":2,"order":["announced","sales"]}', '{"version":1,"order":["sales","sales"]}', '{"version":1,"order":["sales","other"]}', '{"version":1,"order":["sales"]}', '{"version":1,"order":"sales"}']) {
    assert.deepEqual(parseMarketplacePanelOrder(value), ['sales', 'products', 'announced']);
  }
});

test('preferência antiga preserva sua ordem e acrescenta Produtos; a nova aceita os três blocos', () => {
  assert.deepEqual(parseMarketplacePanelOrder('{"version":1,"order":["announced","sales"]}'), ['announced', 'sales', 'products']);
  assert.deepEqual(parseMarketplacePanelOrder('{"version":2,"order":["products","sales","announced"]}'), ['products', 'sales', 'announced']);
  assert.deepEqual(parseMarketplacePanelOrder('{"version":2,"order":["products","products","sales"]}'), DEFAULT_MARKETPLACE_PANEL_ORDER);
  const value = parseMarketplacePanelOrder(null);
  value.reverse();
  assert.deepEqual(DEFAULT_MARKETPLACE_PANEL_ORDER, ['sales', 'products', 'announced']);
});

test('chave da ordem isola usuário e empresa e não salva preferência anônima', () => {
  assert.notEqual(marketplacePanelOrderKey('a', 'x'), marketplacePanelOrderKey('b', 'x'));
  assert.notEqual(marketplacePanelOrderKey('a', 'x'), marketplacePanelOrderKey('a', 'y'));
  assert.notEqual(marketplacePanelOrderKey('a:b', 'x'), marketplacePanelOrderKey('a', 'b:x'));
  assert.equal(marketplacePanelOrderKey('', 'x'), null);
  assert.equal(marketplacePanelOrderKey('a', ''), null);
});

test('prévia de blocos com alturas diferentes conserva espaços sem sobreposição', () => {
  const slots = [{ left: 0, top: 500, width: 400, height: 1000 }, { left: 0, top: 1524, width: 400, height: 100 }];
  assert.deepEqual(posicoesVerticaisKanbanEstavel(slots, 0, 1), [{ index: 1, top: 500 }, { index: 0, top: 624 }]);
  assert.deepEqual(posicoesVerticaisKanbanEstavel(slots, 1, 0), [{ index: 1, top: 500 }, { index: 0, top: 624 }]);
  assert.deepEqual(posicoesVerticaisKanbanEstavel(slots, 0, 0), [{ index: 0, top: 500 }, { index: 1, top: 1524 }]);
  assert.equal(slots[1].top, 1524);
  assert.deepEqual(posicoesVerticaisKanbanEstavel([], 0, 0), []);
});

test('reordenação não remove nem duplica blocos', () => {
  assert.deepEqual(moverItemNaOrdem(DEFAULT_MARKETPLACE_PANEL_ORDER, 1, 0), ['products', 'sales', 'announced']);
  assert.deepEqual(moverItemNaOrdem(DEFAULT_MARKETPLACE_PANEL_ORDER, 0, 9), DEFAULT_MARKETPLACE_PANEL_ORDER);
});
