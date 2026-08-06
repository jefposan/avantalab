import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

function canvasDeTeste() {
  const textos = [];
  const contexto = {
    arc() {}, arcTo() {}, beginPath() {}, closePath() {}, drawImage() {}, fill() {}, fillRect() {}, lineTo() {}, moveTo() {}, restore() {}, save() {}, stroke() {}, strokeRect() {}, translate() {},
    fillText(texto) { textos.push(String(texto)); },
    measureText(texto) { return { width: String(texto).length * 13 }; },
  };
  return { canvas: { width: 0, height: 0, getContext: () => contexto }, textos };
}

test('OrderReceiptV2 mantém itens, bonificações e valores já formatados', async () => {
  const codigo = await readFile(new URL('../../app/avantavendas/sistema/order-receipt-v2.js', import.meta.url), 'utf8');
  const { canvas, textos } = canvasDeTeste();
  class ImagemFalsa { set src(valor) { this.url = valor; queueMicrotask(() => this.onload?.()); } }
  const janela = { __VENDAS_MOBILE_VERSION__: '1.7.0.28.08-av30' };
  vm.runInNewContext(codigo, { Image: ImagemFalsa, Object, Promise, encodeURIComponent, queueMicrotask, window: janela, document: { createElement: () => canvas } });
  const resultado = await janela.OrderReceiptV2.criarCanvas({
    empresa: 'Tridium Cosméticos', cliente: 'Isa (mitsutani)', data: '06/08/2026', saldoAnterior: 'R$ 1.283,50', valorPedido: 'R$ 100,00', saldoAtual: 'R$ 1.383,50', desconto: 'R$ 10,00',
    itens: [
      { principal: 'Shampoo', secundario: '2 × R$ 30,00', valor: 'R$ 60,00' },
      { principal: 'Brinde', secundario: '1 × R$ 0,00', valor: 'R$ 0,00', bonificado: true },
    ],
  });
  assert.equal(resultado, canvas);
  assert.ok(canvas.height >= 1920);
  for (const valor of ['TRIDIUM COSMÉTICOS', 'Cliente: Isa (mitsutani)', 'R$ 1.283,50', 'R$ 10,00', 'R$ 100,00', 'R$ 1.383,50', 'Shampoo', '2 × R$ 30,00', 'Brinde', 'BONIFICADO']) assert.ok(textos.some((texto) => texto.includes(valor)), `deveria manter ${valor}`);
  assert.match(codigo, /assets\/receipts\/avantalab-receipt-bg\.webp/);
  assert.doesNotMatch(codigo, /https?:\/\//);
});

test('o PWA carrega e coloca em cache o renderizador de pedido', async () => {
  const [bootstrap, serviceWorker] = await Promise.all([
    readFile(new URL('../../app/avantavendas/AvantaVendasBootstrap.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sw.js/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(bootstrap, /order-receipt-v2\.js/);
  assert.match(serviceWorker, /order-receipt-v2\.js\?v=/);
});
