import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

function canvasDeTeste() {
  const textos = [];
  const preenchimentos = [];
  let caminho = [];
  const contexto = {
    arc() {},
    arcTo(...argumentos) { caminho.push(['arcTo', ...argumentos]); },
    beginPath() { caminho = []; },
    closePath() {},
    drawImage() {},
    fill() { preenchimentos.push({ cor: this.fillStyle, caminho: [...caminho] }); },
    fillRect() {}, lineTo() {},
    moveTo(...argumentos) { caminho.push(['moveTo', ...argumentos]); },
    restore() {}, save() {}, stroke() {}, strokeRect() {}, translate() {},
    fillText(texto) { textos.push(String(texto)); },
    measureText(texto) { return { width: String(texto).length * 13 }; },
  };
  return { canvas: { width: 0, height: 0, getContext: () => contexto }, preenchimentos, textos };
}

test('OrderReceiptV2 mantém itens, bonificações e valores já formatados', async () => {
  const codigo = await readFile(new URL('../../app/avantavendas/sistema/order-receipt-v2.js', import.meta.url), 'utf8');
  const { canvas, preenchimentos, textos } = canvasDeTeste();
  class ImagemFalsa { set src(valor) { this.url = valor; queueMicrotask(() => this.onload?.()); } }
  const janela = { __VENDAS_MOBILE_VERSION__: '1.7.0.28.08-av30' };
  vm.runInNewContext(codigo, { Image: ImagemFalsa, Object, Promise, encodeURIComponent, queueMicrotask, window: janela, document: { createElement: () => canvas } });
  const resultado = await janela.OrderReceiptV2.criarCanvas({
    empresa: 'Tridium Cosméticos', cliente: 'Isa (mitsutani)', data: '06/08/2026', saldoAnterior: 'R$ 1.283,50', valorPedido: 'R$ 100,00', saldoAtual: 'R$ 1.383,50', desconto: 'R$ 10,00',
    itens: [
      { principal: 'Shampoo', secundario: '2 × R$ 30,00', valor: 'R$ 60,00' },
      { principal: 'Brinde', secundario: '', valor: 'R$ 0,00', bonificado: true },
    ],
  });
  assert.equal(resultado, canvas);
  assert.ok(canvas.height >= 1700 && canvas.height < 1920, 'o comprovante compacto deve ser menor que a altura anterior de 1920 px');
  for (const valor of ['TRIDIUM COSMÉTICOS', 'Cliente: Isa', 'R$ 1.283,50', 'R$ 10,00', 'R$ 100,00', 'R$ 1.383,50', 'Shampoo', '2 × R$ 30,00', 'Brinde', 'BONIFICADO', 'Comprovante de pedido • Isa']) assert.ok(textos.some((texto) => texto.includes(valor)), `deveria manter ${valor}`);
  assert.ok(textos.every((texto) => !texto.includes('(mitsutani)')), 'observações posteriores ao primeiro nome não devem aparecer no comprovante');
  assert.ok(textos.every((texto) => !texto.includes('1 ×')), 'um item com quantidade 1 não deve exibir a linha de quantidade');
  for (const textoRemovido of ['Pedido confirmado', 'Valor que permanece em aberto', 'Seu pedido foi confirmado no sistema.']) assert.ok(!textos.includes(textoRemovido), `não deveria exibir ${textoRemovido}`);
  assert.match(codigo, /retangulo\(ctx, 44, 42, 992, 260, 36/);
  assert.match(codigo, /retangulo\(ctx, 236, 326, 608, 82, 26/);
  assert.match(codigo, /'Pedido registrado com sucesso!', 570, 367/);
  assert.match(codigo, /alinhamento: 'center', largura: 460, linhaBase: 'middle'/);
  assert.match(codigo, /'Valor do pedido', 276, yPedido \+ 137/);
  assert.match(codigo, /'Saldo atual', 276, ySaldo \+ 137/);
  assert.match(codigo, /card\(ctx, yPedido, alturaCardValor, '', 'PEDIDO REGISTRADO'\)/);
  assert.match(codigo, /card\(ctx, ySaldo, alturaCardValor, '', 'SITUAÇÃO APÓS O LANÇAMENTO'\)/);
  assert.match(codigo, /card\(ctx, yDetalhes, alturaDetalhes, '', titulo === 'Pedido consignado' \? 'DETALHES DO CONSIGNADO' : 'DETALHES DO PEDIDO'\)/);
  assert.doesNotMatch(codigo, /icone\(ctx, 'itens',/);
  assert.match(codigo, /texto\(ctx, titulo, LARGURA \/ 2, y \+ 43, \{ tamanho: 28, peso: 800, cor: '#0A2F6B', alinhamento: 'center', largura: 880, linhaBase: 'middle' \}\)/);
  assert.match(codigo, /function primeiroNomeClienteComprovante/);
  assert.match(codigo, /function desenharRodapeEmPilula/);
  assert.match(codigo, /'#FFFFFF', '#DCE6F0'/);
  assert.doesNotMatch(codigo, /yRodape \+ 35/);
  const pilula = preenchimentos.find(({ cor, caminho }) => (
    cor === '#FFFFFF'
    && caminho.some(([comando, , , , altura, raio]) => comando === 'arcTo' && altura - caminho[0][2] === 72 && raio === 36)
  ));
  assert.ok(pilula, 'deveria desenhar a pílula branca opaca com 72 px de altura e raio de 36 px');
  const [, inicioX] = pilula.caminho[0];
  const [, direita, , , , raio] = pilula.caminho.find(([comando]) => comando === 'arcTo');
  const larguraPilula = direita - (inicioX - raio);
  assert.ok(larguraPilula >= 360 && larguraPilula <= 936, 'a pílula deve respeitar a largura segura do comprovante');
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
