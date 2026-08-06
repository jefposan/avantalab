import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

function contextoDeCanvas() {
  const textos = [];
  const ctx = {
    arc() {}, arcTo() {}, beginPath() {}, closePath() {}, drawImage() {}, fill() {}, fillRect() {}, lineTo() {}, moveTo() {}, restore() {}, save() {}, stroke() {}, strokeRect() {}, translate() {},
    fillText(texto) { textos.push(String(texto)); },
    measureText(texto) { return { width: String(texto).length * 13 }; },
  };
  return { ctx, textos };
}

test('PaymentReceiptV2 compõe o comprovante com os valores formatados sem cálculo próprio', async () => {
  const codigo = await readFile(
    new URL('../../app/avantavendas/sistema/payment-receipt-v2.js', import.meta.url),
    'utf8',
  );
  const { ctx, textos } = contextoDeCanvas();
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  class ImagemFalsa {
    set src(valor) { this.url = valor; queueMicrotask(() => this.onload?.()); }
  }
  const janela = { __VENDAS_MOBILE_VERSION__: '1.7.0.28.07-av29' };
  vm.runInNewContext(codigo, {
    Image: ImagemFalsa,
    Object,
    Promise,
    encodeURIComponent,
    queueMicrotask,
    window: janela,
    document: { createElement: (nome) => { assert.equal(nome, 'canvas'); return canvas; } },
  });

  const resultado = await janela.PaymentReceiptV2.criarCanvas({
    empresa: 'Tridium Cosméticos',
    cliente: 'Isa (mitsutani)',
    data: '06/08/2026',
    saldoAnterior: 'R$ 1.283,50',
    valorPago: 'R$ 100,00',
    saldoAtual: 'R$ 1.183,50',
    formaPagamento: 'Pix',
  });

  assert.equal(resultado, canvas);
  assert.equal(canvas.width, 1080);
  assert.equal(canvas.height, 1920);
  for (const valor of ['TRIDIUM COSMÉTICOS', 'Cliente: Isa (mitsutani)', '06/08/2026', 'R$ 1.283,50', 'R$ 100,00', 'R$ 1.183,50', 'Pix']) {
    assert.ok(textos.some((texto) => texto.includes(valor)), `deveria manter ${valor}`);
  }
  assert.ok(!codigo.includes('atesta o registro do pagamento'));
  assert.match(codigo, /assets\/receipts\/avantalab-receipt-bg\.webp/);
  assert.doesNotMatch(codigo, /https?:\/\//);
});

test('o PWA carrega e coloca em cache o renderizador e o fundo fixo', async () => {
  const [bootstrap, serviceWorker] = await Promise.all([
    readFile(new URL('../../app/avantavendas/AvantaVendasBootstrap.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sw.js/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(bootstrap, /payment-receipt-v2\.js/);
  assert.match(serviceWorker, /payment-receipt-v2\.js\?v=/);
  assert.match(serviceWorker, /assets\/receipts\/avantalab-receipt-bg\.webp\?v=/);
});
