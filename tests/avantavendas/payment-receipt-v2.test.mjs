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
  assert.equal(canvas.height, 1447, 'a altura deve terminar logo após a margem fixa do rodapé');
  for (const valor of ['TRIDIUM COSMÉTICOS', 'Cliente: Isa', '06/08/2026', 'R$ 1.283,50', 'R$ 100,00', 'R$ 1.183,50', 'Pix', 'Comprovante de pagamento • Isa']) {
    assert.ok(textos.some((texto) => texto.includes(valor)), `deveria manter ${valor}`);
  }
  assert.ok(textos.every((texto) => !texto.includes('(mitsutani)')), 'observações posteriores ao primeiro nome não devem aparecer no comprovante');
  for (const textoRemovido of ['Seu pagamento foi confirmado no sistema.', 'Pagamento confirmado', 'Valor que permanece em aberto']) assert.ok(!textos.includes(textoRemovido), `não deveria exibir ${textoRemovido}`);
  assert.match(codigo, /retangulo\(ctx, 236, 326, 608, 82, 26/);
  assert.match(codigo, /'Pagamento registrado com sucesso!', 570, 367/);
  assert.match(codigo, /card\(ctx, yPagamento, alturaCardValor, '', 'PAGAMENTO REGISTRADO'\)/);
  assert.match(codigo, /card\(ctx, ySaldo, alturaCardValor, '', 'SITUAÇÃO APÓS O LANÇAMENTO'\)/);
  assert.match(codigo, /card\(ctx, yResumo, alturaResumo, '', 'RESUMO FINANCEIRO'\)/);
  assert.match(codigo, /const alturaResumo = 184/);
  assert.match(codigo, /const altura = yRodape \+ MARGEM_INFERIOR_RODAPE/);
  assert.doesNotMatch(codigo, /const ALTURA = 1680/);
  assert.match(codigo, /function desenharFundoAncoradoNoRodape/);
  assert.match(codigo, /alturaFonte - alturaVisivel/);
  assert.match(codigo, /const COR_BORDA_CARD = '#C7D8E8'/);
  assert.match(codigo, /'#FFFFFF', COR_BORDA_CARD/);
  assert.match(codigo, /card\(ctx, yDetalhes, alturaDetalhes, '', 'DETALHES DO PAGAMENTO'\)/);
  assert.match(codigo, /function desenharRodapeEmPilula/);
  assert.doesNotMatch(codigo, /icone\(ctx, 'detalhes',/);
  assert.doesNotMatch(codigo, /card\(ctx, yResumo, 205, 'carteira'/);
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
