import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');

test('lista do pedido identifica os itens e preserva as ações existentes', () => {
  assert.match(app, /class="order-draft-heading"><h3>Itens adicionados<\/h3>/);
  assert.match(app, /rascunho\.itens\.length === 1 \? 'produto' : 'produtos'/);
  assert.match(app, /class="order-draft-quantity"/);
  assert.match(app, /onclick="ajustarItemPedidoCliente\(\$\{indice\},-1\)"/);
  assert.match(app, /onclick="ajustarItemPedidoCliente\(\$\{indice\},1\)"/);
  assert.match(app, /class="order-draft-remove" onclick="removerItemPedidoCliente\(\$\{indice\}\)"/);
});

test('cards dos itens seguem a hierarquia AvantaLab também no modo escuro', () => {
  assert.match(styles, /\.order-draft-heading > span/);
  assert.match(styles, /\.order-draft-items article::before[^}]+background: #1687D9/);
  assert.match(styles, /\.order-draft-items article[^}]+background: #f2f9fd/);
  assert.match(styles, /\.dark-theme \.order-bonus-toggle, \.dark-theme \.order-draft-items article[^}]+background: #122438/);
  assert.match(styles, /\.dark-theme \.order-draft-heading > span/);
});
