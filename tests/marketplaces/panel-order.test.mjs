import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import { DEFAULT_MARKETPLACE_PANEL_ORDER, MARKETPLACE_PANEL_ORDER_VERSION, marketplacePanelOrderKey, parseMarketplacePanelOrder } from '../../app/modules/marketplaces/panel-order.ts';
import { posicoesVerticaisKanbanEstavel, moverItemNaOrdem } from '../../app/lib/dnd.ts';

test('ordem inicial: Vendas antes de Anunciados, independente de preferência inválida', () => {
  assert.deepEqual(DEFAULT_MARKETPLACE_PANEL_ORDER, ['sales', 'announced', 'warehouses', 'products']);
  for (const value of [null, '', 'bad', '[]', 'null', '{"version":2,"order":["announced","sales"]}', '{"version":1,"order":["sales","sales"]}', '{"version":1,"order":["sales","other"]}', '{"version":1,"order":["sales"]}', '{"version":1,"order":"sales"}']) {
    assert.deepEqual(parseMarketplacePanelOrder(value), DEFAULT_MARKETPLACE_PANEL_ORDER);
  }
});

test('preferência antiga preserva ordem relativa e insere Estoques antes de Produtos', () => {
  assert.deepEqual(parseMarketplacePanelOrder('{"version":1,"order":["announced","sales"]}'), ['announced', 'sales', 'warehouses', 'products']);
  assert.deepEqual(parseMarketplacePanelOrder('{"version":2,"order":["products","sales","announced"]}'), ['warehouses', 'products', 'sales', 'announced']);
  assert.deepEqual(parseMarketplacePanelOrder('{"version":2,"order":["sales","products","announced"]}'), DEFAULT_MARKETPLACE_PANEL_ORDER);
  assert.deepEqual(parseMarketplacePanelOrder('{"version":2,"order":["products","products","sales"]}'), DEFAULT_MARKETPLACE_PANEL_ORDER);
  const value = parseMarketplacePanelOrder(null);
  value.reverse();
  assert.deepEqual(DEFAULT_MARKETPLACE_PANEL_ORDER, ['sales', 'announced', 'warehouses', 'products']);
});

test('versão nova preserva as 24 ordens possíveis; dados inválidos não duplicam ou perdem cards', () => {
  assert.equal(MARKETPLACE_PANEL_ORDER_VERSION, 3);
  const permutations = a => a.length ? a.flatMap((id,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[id,...rest])) : [[]];
  for(const order of permutations(DEFAULT_MARKETPLACE_PANEL_ORDER)) assert.deepEqual(parseMarketplacePanelOrder(JSON.stringify({version:3,order})), order);
  for(const order of [['sales','announced','products'],['sales','sales','warehouses','products'],['sales','announced','other','products']]) assert.deepEqual(parseMarketplacePanelOrder(JSON.stringify({version:3,order})),DEFAULT_MARKETPLACE_PANEL_ORDER);
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
  assert.deepEqual(moverItemNaOrdem(DEFAULT_MARKETPLACE_PANEL_ORDER, 2, 0), ['warehouses', 'sales', 'announced', 'products']);
  assert.deepEqual(moverItemNaOrdem(DEFAULT_MARKETPLACE_PANEL_ORDER, 0, 9), DEFAULT_MARKETPLACE_PANEL_ORDER);
});

test('Estoques está dentro do Kanban oficial e recebe handle, sem bloco fixo duplicado',()=>{
  const client=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');
  const kanban=client.slice(client.indexOf('<AvantaKanban'),client.indexOf('{panelOrder.notice'));
  assert.match(kanban,/id: 'warehouses', title: 'Estoques', render: \(handle\) => <WarehousesPanel[^\n]*reorderHandle=\{handle\}/);
  assert.equal((client.match(/<WarehousesPanel/g)||[]).length,1);
  const hook=readFileSync('app/marketplaces/usePanelOrder.ts','utf8');
  assert.equal((hook.match(/version: MARKETPLACE_PANEL_ORDER_VERSION/g)||[]).length,2);
});
