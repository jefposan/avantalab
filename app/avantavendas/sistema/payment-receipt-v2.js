/* Comprovante de pagamento V2: somente composição visual do Canvas. */
(function registrarComprovantePagamentoV2() {
  'use strict';

  const LARGURA = 1080;
  const ALTURA = 1920;
  const FONTE = 'Inter, Arial, sans-serif';
  const FUNDO_URL = './assets/receipts/avantalab-receipt-bg.webp';
  let carregamentoFundo;

  function carregarFundo() {
    if (carregamentoFundo) return carregamentoFundo;
    carregamentoFundo = new Promise((resolve) => {
      const imagem = new Image();
      imagem.decoding = 'async';
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => resolve(null);
      imagem.src = `${FUNDO_URL}?v=${encodeURIComponent(window.__VENDAS_MOBILE_VERSION__ || '')}`;
    });
    return carregamentoFundo;
  }

  function caminhoArredondado(ctx, x, y, largura, altura, raio) {
    const r = Math.min(raio, largura / 2, altura / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + largura, y, x + largura, y + altura, r);
    ctx.arcTo(x + largura, y + altura, x, y + altura, r);
    ctx.arcTo(x, y + altura, x, y, r);
    ctx.arcTo(x, y, x + largura, y, r);
    ctx.closePath();
  }

  function retangulo(ctx, x, y, largura, altura, raio, cor, borda = '') {
    caminhoArredondado(ctx, x, y, largura, altura, raio);
    ctx.fillStyle = cor;
    ctx.fill();
    if (borda) { ctx.strokeStyle = borda; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function textoLimitado(ctx, texto, largura) {
    const valor = String(texto || '');
    if (ctx.measureText(valor).width <= largura) return valor;
    let reduzido = valor;
    while (reduzido.length > 1 && ctx.measureText(`${reduzido}…`).width > largura) reduzido = reduzido.slice(0, -1);
    return `${reduzido}…`;
  }

  function texto(ctx, valor, x, y, { tamanho = 28, peso = 600, cor = '#0A1F44', alinhamento = 'left', largura = 0 } = {}) {
    ctx.fillStyle = cor;
    ctx.font = `${peso} ${tamanho}px ${FONTE}`;
    ctx.textAlign = alinhamento;
    ctx.fillText(largura ? textoLimitado(ctx, valor, largura) : String(valor || ''), x, y);
    ctx.textAlign = 'left';
  }

  function linha(ctx, x1, y1, x2, y2, cor, largura = 4) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function icone(ctx, nome, x, y, tamanho, cor) {
    const s = tamanho / 24;
    const p = (valor) => valor * s;
    ctx.save(); ctx.translate(x - tamanho / 2, y - tamanho / 2);
    ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = Math.max(2.6, p(2)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (nome === 'documento') {
      ctx.strokeRect(p(4), p(2), p(13), p(20));
      linha(ctx, p(8), p(7), p(14), p(7), cor, p(2)); linha(ctx, p(8), p(11), p(14), p(11), cor, p(2)); linha(ctx, p(8), p(15), p(12), p(15), cor, p(2));
      ctx.beginPath(); ctx.arc(p(18), p(17), p(4), 0, Math.PI * 2); ctx.stroke();
      linha(ctx, p(16.2), p(17), p(17.5), p(18.3), cor, p(2)); linha(ctx, p(17.5), p(18.3), p(20.1), p(15.6), cor, p(2));
    } else if (nome === 'usuario') {
      ctx.beginPath(); ctx.arc(p(12), p(7), p(4), 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p(12), p(20), p(7), Math.PI, 0); ctx.stroke();
    } else if (nome === 'calendario') {
      ctx.strokeRect(p(3), p(5), p(18), p(16)); linha(ctx, p(3), p(10), p(21), p(10), cor, p(2)); linha(ctx, p(8), p(2), p(8), p(7), cor, p(2)); linha(ctx, p(16), p(2), p(16), p(7), cor, p(2));
      ctx.fillRect(p(7), p(13), p(3), p(3)); ctx.fillRect(p(14), p(13), p(3), p(3));
    } else if (nome === 'carteira') {
      ctx.strokeRect(p(3), p(6), p(18), p(14)); ctx.beginPath(); ctx.arc(p(17), p(13), p(1.5), 0, Math.PI * 2); ctx.fill(); linha(ctx, p(3), p(9), p(15), p(9), cor, p(2));
    } else if (nome === 'confirmado') {
      ctx.beginPath(); ctx.arc(p(12), p(12), p(9), 0, Math.PI * 2); ctx.stroke(); linha(ctx, p(7), p(12), p(10.5), p(15.5), cor, p(2.4)); linha(ctx, p(10.5), p(15.5), p(17.5), p(8.5), cor, p(2.4));
    } else if (nome === 'grafico') {
      linha(ctx, p(4), p(20), p(4), p(15), cor, p(2)); linha(ctx, p(10), p(20), p(10), p(10), cor, p(2)); linha(ctx, p(16), p(20), p(16), p(5), cor, p(2)); linha(ctx, p(2), p(20), p(21), p(20), cor, p(2));
      linha(ctx, p(4), p(9), p(10), p(6), cor, p(2)); linha(ctx, p(10), p(6), p(16), p(2), cor, p(2)); linha(ctx, p(16), p(2), p(20), p(2), cor, p(2)); linha(ctx, p(20), p(2), p(20), p(6), cor, p(2));
    } else if (nome === 'detalhes') {
      ctx.strokeRect(p(5), p(2), p(14), p(20)); linha(ctx, p(9), p(8), p(16), p(8), cor, p(2)); linha(ctx, p(9), p(12), p(16), p(12), cor, p(2)); linha(ctx, p(9), p(16), p(14), p(16), cor, p(2));
    }
    ctx.restore();
  }

  function blocoIcone(ctx, nome, x, y, cor = '#126ED1') {
    ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fillStyle = '#EDF5FF'; ctx.fill(); icone(ctx, nome, x, y, 43, cor);
  }

  function card(ctx, y, altura, nomeIcone, titulo) {
    retangulo(ctx, 44, y, 992, altura, 34, '#FFFFFF', '#E4ECF4');
    blocoIcone(ctx, nomeIcone, 105, y + 64);
    texto(ctx, titulo, 172, y + 76, { tamanho: 28, peso: 800, cor: '#0A2F6B' });
  }

  function fundoDeValor(ctx, y, altura, cor) { retangulo(ctx, 146, y, 810, altura, 26, cor); }

  async function criarCanvas({ empresa = 'AvantaLab', cliente = 'Cliente não informado', data = 'Data não informada', saldoAnterior = 'R$ 0,00', valorPago = 'R$ 0,00', saldoAtual = 'R$ 0,00', formaPagamento = 'Não informado', desconto = '', rotuloValorPago = 'Valor pago' } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = LARGURA; canvas.height = ALTURA;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível gerar o comprovante.');
    ctx.fillStyle = '#F4F8FC'; ctx.fillRect(0, 0, LARGURA, ALTURA);
    const fundo = await carregarFundo();
    if (fundo) ctx.drawImage(fundo, 0, 0, LARGURA, ALTURA);

    // Cabeçalho sólido: sem textura ou gradiente para garantir leitura.
    retangulo(ctx, 44, 42, 992, 304, 36, '#063B72');
    ctx.beginPath(); ctx.arc(132, 134, 58, 0, Math.PI * 2); ctx.fillStyle = '#0B5EAA'; ctx.fill(); icone(ctx, 'documento', 132, 134, 64, '#FFFFFF');
    const nomeEmpresa = String(empresa || 'AvantaLab').toUpperCase();
    texto(ctx, nomeEmpresa, 575, 157, { tamanho: nomeEmpresa.length > 31 ? 38 : nomeEmpresa.length > 23 ? 44 : 51, peso: 800, cor: '#FFFFFF', alinhamento: 'center', largura: 730 });
    icone(ctx, 'usuario', 93, 255, 41, '#3FE3E8'); texto(ctx, `Cliente: ${cliente}`, 125, 269, { tamanho: 31, peso: 700, cor: '#FFFFFF', largura: 510 });
    linha(ctx, 654, 213, 654, 288, 'rgba(255,255,255,.68)', 2);
    icone(ctx, 'calendario', 714, 255, 40, '#3FE3E8'); texto(ctx, data, 1000, 269, { tamanho: 31, peso: 700, cor: '#FFFFFF', alinhamento: 'right', largura: 275 });

    // É o status de confirmação do pagamento; o aviso de autenticação não existe no V2.
    retangulo(ctx, 216, 385, 648, 118, 26, '#F1FBF5', '#BDEBD3');
    icone(ctx, 'confirmado', 269, 444, 54, '#168448'); texto(ctx, 'Pagamento registrado com sucesso!', 320, 432, { tamanho: 25, peso: 800, cor: '#16773F', largura: 500 }); texto(ctx, 'Seu pagamento foi confirmado no sistema.', 320, 471, { tamanho: 20, peso: 500, cor: '#31567F', largura: 500 });

    card(ctx, 548, 205, 'carteira', 'RESUMO FINANCEIRO'); fundoDeValor(ctx, 660, 68, '#F3F7FC');
    texto(ctx, 'Saldo anterior', 180, 704, { tamanho: 26, peso: 600, cor: '#425675' }); texto(ctx, saldoAnterior, 928, 704, { tamanho: 31, peso: 800, cor: '#0A2F6B', alinhamento: 'right', largura: 340 });

    card(ctx, 784, 251, 'confirmado', 'PAGAMENTO REGISTRADO'); fundoDeValor(ctx, 870, 130, '#1674D1');
    icone(ctx, 'confirmado', 208, 935, 66, '#FFFFFF'); texto(ctx, rotuloValorPago, 276, 926, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, 'Pagamento confirmado', 276, 966, { tamanho: 19, peso: 500, cor: '#E5F3FF', largura: 370 }); texto(ctx, valorPago, 922, 948, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });

    card(ctx, 1066, 251, 'grafico', 'SITUAÇÃO APÓS O LANÇAMENTO'); fundoDeValor(ctx, 1152, 130, '#0A2F6B');
    icone(ctx, 'grafico', 208, 1217, 63, '#46B7FF'); texto(ctx, 'Saldo atual', 276, 1208, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, 'Valor que permanece em aberto', 276, 1248, { tamanho: 19, peso: 500, cor: '#D6EDFF', largura: 370 }); texto(ctx, saldoAtual, 922, 1230, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });

    const temDesconto = Boolean(desconto); const alturaDetalhes = temDesconto ? 255 : 187;
    card(ctx, 1348, alturaDetalhes, 'detalhes', 'DETALHES DO PAGAMENTO'); fundoDeValor(ctx, 1434, temDesconto ? 136 : 68, '#F3F7FC');
    texto(ctx, 'Forma de pagamento', 180, 1478, { tamanho: 25, peso: 600, cor: '#425675' }); texto(ctx, formaPagamento, 922, 1478, { tamanho: 30, peso: 800, cor: '#126ED1', alinhamento: 'right', largura: 330 });
    if (temDesconto) { linha(ctx, 180, 1502, 922, 1502, '#DCE6F0', 2); texto(ctx, 'Desconto concedido', 180, 1545, { tamanho: 24, peso: 600, cor: '#425675' }); texto(ctx, desconto, 922, 1545, { tamanho: 29, peso: 800, cor: '#0A2F6B', alinhamento: 'right', largura: 300 }); }
    const yRodape = temDesconto ? 1715 : 1648;
    texto(ctx, `Comprovante de pagamento • ${cliente}`, LARGURA / 2, yRodape, { tamanho: 28, peso: 700, cor: '#0A2F6B', alinhamento: 'center', largura: 890 }); linha(ctx, 486, yRodape + 35, 594, yRodape + 35, '#126ED1', 6);
    return canvas;
  }

  window.PaymentReceiptV2 = Object.freeze({ criarCanvas });
}());
