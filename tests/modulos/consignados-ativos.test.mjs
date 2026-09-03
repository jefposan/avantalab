import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const caminhoApp = new URL('../../app/avantavendas/sistema/app.js', import.meta.url);
const app = await readFile(caminhoApp, 'utf8');

const inicioFuncoes = app.indexOf('function pedidoEhConsignado(venda)');
const fimFuncoes = app.indexOf('\nfunction listaPedidosClienteHtml', inicioFuncoes);
assert.ok(inicioFuncoes >= 0 && fimFuncoes > inicioFuncoes, 'As regras de consignado devem existir no aplicativo.');

const normalizar = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();
const criarRegras = new Function('normalizar', `${app.slice(inicioFuncoes, fimFuncoes)}; return { pedidoEhConsignado, pedidoConsignadoAtivo };`);
const { pedidoEhConsignado, pedidoConsignadoAtivo } = criarRegras(normalizar);

test('mantém somente consignados ativos com saldo de itens', () => {
  assert.equal(pedidoConsignadoAtivo({ forma_pagamento: 'Consignado', status: 'concluida', itens: [{ quantidade: 3 }] }), true);
  assert.equal(pedidoConsignadoAtivo({ forma_pagamento: 'Consignado', status: 'convertida', itens: [{ quantidade: 3 }] }), false);
  assert.equal(pedidoConsignadoAtivo({ forma_pagamento: 'Consignado', status: 'cancelada', itens: [{ quantidade: 3 }] }), false);
  assert.equal(pedidoConsignadoAtivo({ forma_pagamento: 'Consignado', status: 'concluida', itens: [{ quantidade: 0 }] }), false);
  assert.equal(pedidoConsignadoAtivo({ forma_pagamento: 'Venda', status: 'concluida', itens: [{ quantidade: 3 }] }), false);
});

test('preserva consignados separados mesmo quando pertencem ao mesmo cliente', () => {
  const registros = [
    { id: 'consignado-1', cliente_id: 'cliente-1', forma_pagamento: 'Consignado', status: 'concluida', itens: [{ quantidade: 2 }] },
    { id: 'consignado-2', cliente_id: 'cliente-1', forma_pagamento: 'Consignado', status: 'concluida', itens: [{ quantidade: 5 }] },
  ];
  assert.deepEqual(registros.filter(pedidoConsignadoAtivo).map(({ id }) => id), ['consignado-1', 'consignado-2']);
});

test('aplica a mesma regra às listas, ao cliente e ao dashboard', () => {
  assert.match(app, /const consignadosAtivos = state\.vendas\.filter\(pedidoConsignadoAtivo\)/);
  assert.match(app, /const pedidos = state\.vendas\.filter\(pedidoConsignadoAtivo\)/);
  assert.match(app, /const consignados = todosPedidos\.filter\(pedidoConsignadoAtivo\)/);
  assert.match(app, /\.filter\(\(venda\) => !pedidoEhConsignado\(venda\) \|\| pedidoConsignadoAtivo\(venda\)\)/);
});

test('o card ativo mostra somente o rótulo Consignado', () => {
  assert.match(app, /const consignado = tipo === 'consignados';/);
  assert.match(app, /\$\{consignado \? '' : `<span class="status-pill/);
  assert.equal(pedidoEhConsignado({ forma_pagamento: 'Consignado' }), true);
});
