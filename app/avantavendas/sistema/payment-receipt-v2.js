/* Comprovante de pagamento V2: somente composição visual do Canvas. */
(function registrarComprovantePagamentoV2() {
  'use strict';

  const LARGURA = 1080;
  const MARGEM_INFERIOR_RODAPE = 78;
  const COR_BORDA_CARD = '#C7D8E8';
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

  function desenharFundoAncoradoNoRodape(ctx, fundo, altura) {
    const larguraFonte = Number(fundo.naturalWidth || fundo.width) || LARGURA;
    const alturaFonte = Number(fundo.naturalHeight || fundo.height) || 1920;
    const alturaVisivel = Math.min(alturaFonte, altura);
    // Quando o comprovante é menor, o corte vem do topo. Em listas longas,
    // a arte mantém o rodapé e a área nova nasce acima dela.
    ctx.drawImage(fundo, 0, alturaFonte - alturaVisivel, larguraFonte, alturaVisivel, 0, altura - alturaVisivel, LARGURA, alturaVisivel);
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

  function texto(ctx, valor, x, y, { tamanho = 28, peso = 600, cor = '#0A1F44', alinhamento = 'left', largura = 0, linhaBase = 'alphabetic' } = {}) {
    ctx.fillStyle = cor;
    ctx.font = `${peso} ${tamanho}px ${FONTE}`;
    ctx.textAlign = alinhamento; ctx.textBaseline = linhaBase;
    ctx.fillText(largura ? textoLimitado(ctx, valor, largura) : String(valor || ''), x, y);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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
    } else if (nome === 'pix') {
      // Símbolo Pix em três áreas preenchidas, preservando a geometria da marca
      // também em tamanhos pequenos no comprovante.
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.moveTo(p(5.283), p(18.36)); ctx.lineTo(p(7.776), p(17.328)); ctx.lineTo(p(11.376), p(13.728));
      ctx.quadraticCurveTo(p(11.85), p(13.254), p(12.322), p(13.728)); ctx.lineTo(p(15.935), p(17.341));
      ctx.lineTo(p(18.428), p(18.373)); ctx.lineTo(p(19.138), p(18.373)); ctx.lineTo(p(14.578), p(22.933));
      ctx.quadraticCurveTo(p(12), p(25.511), p(9.422), p(22.933)); ctx.lineTo(p(4.85), p(18.36));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p(18.428), p(5.627)); ctx.lineTo(p(15.935), p(6.659)); ctx.lineTo(p(12.322), p(10.273));
      ctx.quadraticCurveTo(p(11.85), p(10.727), p(11.376), p(10.273)); ctx.lineTo(p(7.776), p(6.673));
      ctx.lineTo(p(5.283), p(5.64)); ctx.lineTo(p(4.849), p(5.64)); ctx.lineTo(p(9.422), p(1.068));
      ctx.quadraticCurveTo(p(12), p(-1.51), p(14.578), p(1.068)); ctx.lineTo(p(19.137), p(5.627));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p(1.068), p(9.422)); ctx.lineTo(p(3.79), p(6.699)); ctx.lineTo(p(5.282), p(6.699));
      ctx.quadraticCurveTo(p(6.154), p(6.699), p(7.026), p(7.421)); ctx.lineTo(p(10.626), p(11.021));
      ctx.quadraticCurveTo(p(11.848), p(12.243), p(13.069), p(11.021)); ctx.lineTo(p(16.683), p(7.408));
      ctx.quadraticCurveTo(p(17.555), p(6.685), p(18.427), p(6.685)); ctx.lineTo(p(20.194), p(6.685));
      ctx.lineTo(p(22.931), p(9.422)); ctx.quadraticCurveTo(p(24.754), p(12), p(22.931), p(14.578));
      ctx.lineTo(p(20.195), p(17.314)); ctx.lineTo(p(18.427), p(17.314)); ctx.quadraticCurveTo(p(17.555), p(17.314), p(16.683), p(16.592));
      ctx.lineTo(p(13.07), p(12.979)); ctx.quadraticCurveTo(p(11.848), p(11.757), p(10.626), p(12.979));
      ctx.lineTo(p(7.026), p(16.579)); ctx.quadraticCurveTo(p(6.154), p(17.301), p(5.282), p(17.301));
      ctx.lineTo(p(3.791), p(17.301)); ctx.lineTo(p(1.068), p(14.578)); ctx.quadraticCurveTo(p(-0.755), p(12), p(1.068), p(9.422));
      ctx.closePath();
      ctx.fill();
    } else if (nome === 'boleto') {
      [4, 7, 10, 13, 16, 19].forEach((x, indice) => linha(ctx, p(x), p(4), p(x), p(20), cor, p(indice % 2 ? 1.5 : 2.5)));
    } else if (nome === 'cartao') {
      caminhoArredondado(ctx, p(2), p(5), p(20), p(14), p(2)); ctx.stroke(); linha(ctx, p(3), p(10), p(21), p(10), cor, p(2)); linha(ctx, p(6), p(15), p(12), p(15), cor, p(2));
    } else if (nome === 'dinheiro') {
      caminhoArredondado(ctx, p(2), p(5), p(20), p(14), p(2)); ctx.stroke(); ctx.beginPath(); ctx.arc(p(12), p(12), p(3), 0, Math.PI * 2); ctx.stroke();
    } else if (nome === 'cheque') {
      caminhoArredondado(ctx, p(2), p(5), p(20), p(14), p(2)); ctx.stroke(); linha(ctx, p(5), p(10), p(14), p(10), cor, p(2)); linha(ctx, p(5), p(15), p(11), p(15), cor, p(2));
    } else if (nome === 'detalhes') {
      ctx.strokeRect(p(5), p(2), p(14), p(20)); linha(ctx, p(9), p(8), p(16), p(8), cor, p(2)); linha(ctx, p(9), p(12), p(16), p(12), cor, p(2)); linha(ctx, p(9), p(16), p(14), p(16), cor, p(2));
    }
    ctx.restore();
  }

  function blocoIcone(ctx, nome, x, y, cor = '#126ED1') {
    ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fillStyle = '#EDF5FF'; ctx.fill(); icone(ctx, nome, x, y, 43, cor);
  }

  function card(ctx, y, altura, nomeIcone, titulo) {
    retangulo(ctx, 44, y, 992, altura, 34, '#FFFFFF', COR_BORDA_CARD);
    if (nomeIcone) {
      blocoIcone(ctx, nomeIcone, 105, y + 64);
      texto(ctx, titulo, 172, y + 76, { tamanho: 28, peso: 800, cor: '#0A2F6B' });
      return;
    }
    texto(ctx, titulo, LARGURA / 2, y + 43, { tamanho: 28, peso: 800, cor: '#0A2F6B', alinhamento: 'center', largura: 880, linhaBase: 'middle' });
  }

  function fundoDeValor(ctx, y, altura, cor) { retangulo(ctx, 146, y, 810, altura, 26, cor); }
  function primeiroNomeClienteComprovante(nome) { return String(nome || '').trim().split(/\s+/)[0] || 'Cliente'; }
  function iconeFormaPagamento(formaPagamento) {
    const forma = String(formaPagamento || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (forma.includes('pix')) return 'pix';
    if (forma.includes('boleto')) return 'boleto';
    if (forma.includes('cartao')) return 'cartao';
    if (forma.includes('dinheiro')) return 'dinheiro';
    if (forma.includes('cheque')) return 'cheque';
    return 'carteira';
  }
  function desenharRodapeEmPilula(ctx, conteudo, y) {
    ctx.font = `700 28px ${FONTE}`;
    const conteudoLimitado = textoLimitado(ctx, conteudo, 820);
    const larguraPilula = Math.min(936, Math.max(360, Math.ceil(ctx.measureText(conteudoLimitado).width) + 88));
    const xPilula = (LARGURA - larguraPilula) / 2;
    retangulo(ctx, xPilula, y - 47, larguraPilula, 72, 36, '#FFFFFF', '#DCE6F0');
    texto(ctx, conteudoLimitado, LARGURA / 2, y, { tamanho: 28, peso: 700, cor: '#0A2F6B', alinhamento: 'center' });
  }

  async function criarCanvas({ empresa = 'AvantaLab', cliente = 'Cliente não informado', data = 'Data não informada', saldoAnterior = 'R$ 0,00', valorPago = 'R$ 0,00', saldoAtual = 'R$ 0,00', formaPagamento = 'Não informado', desconto = '', rotuloValorPago = 'Valor pago' } = {}) {
    const clienteExibido = primeiroNomeClienteComprovante(cliente);
    const ySaldoAnterior = 440;
    const alturaSaldoAnterior = 112;
    const espacoEntreCards = 24;
    const temDesconto = Boolean(desconto);
    const alturaCardPagamento = temDesconto ? 334 : 276;
    const alturaCardSaldo = 218;
    const yPagamento = ySaldoAnterior + alturaSaldoAnterior + espacoEntreCards;
    const ySaldo = yPagamento + alturaCardPagamento + espacoEntreCards;
    const yRodape = ySaldo + alturaCardSaldo + 70;
    // A base acompanha o rodapé: não há sobra em pagamentos curtos e a
    // distância inferior continua estável em qualquer composição.
    const altura = yRodape + MARGEM_INFERIOR_RODAPE;
    const canvas = document.createElement('canvas');
    canvas.width = LARGURA; canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível gerar o comprovante.');
    ctx.fillStyle = '#F4F8FC'; ctx.fillRect(0, 0, LARGURA, altura);
    const fundo = await carregarFundo();
    if (fundo) desenharFundoAncoradoNoRodape(ctx, fundo, altura);

    // Cabeçalho sólido: sem textura ou gradiente para garantir leitura.
    retangulo(ctx, 44, 42, 992, 260, 36, '#063B72');
    ctx.beginPath(); ctx.arc(132, 122, 54, 0, Math.PI * 2); ctx.fillStyle = '#0B5EAA'; ctx.fill(); icone(ctx, 'documento', 132, 122, 60, '#FFFFFF');
    const nomeEmpresa = String(empresa || 'AvantaLab').toUpperCase();
    texto(ctx, nomeEmpresa, 575, 145, { tamanho: nomeEmpresa.length > 31 ? 38 : nomeEmpresa.length > 23 ? 44 : 51, peso: 800, cor: '#FFFFFF', alinhamento: 'center', largura: 730 });
    icone(ctx, 'usuario', 93, 235, 38, '#3FE3E8'); texto(ctx, `Cliente: ${clienteExibido}`, 125, 248, { tamanho: 29, peso: 700, cor: '#FFFFFF', largura: 510 });
    linha(ctx, 654, 194, 654, 266, 'rgba(255,255,255,.68)', 2);
    icone(ctx, 'calendario', 714, 235, 38, '#3FE3E8'); texto(ctx, data, 1000, 248, { tamanho: 29, peso: 700, cor: '#FFFFFF', alinhamento: 'right', largura: 275 });

    // É o status de confirmação do pagamento; o aviso de autenticação não existe no V2.
    retangulo(ctx, 236, 326, 608, 82, 26, '#F1FBF5', '#BDEBD3');
    icone(ctx, 'confirmado', 288, 367, 44, '#168448'); texto(ctx, 'Pagamento registrado com sucesso!', 570, 367, { tamanho: 24, peso: 800, cor: '#16773F', alinhamento: 'center', largura: 460, linhaBase: 'middle' });

    // Saldo anterior é uma informação isolada, não um resumo financeiro.
    retangulo(ctx, 44, ySaldoAnterior, 992, alturaSaldoAnterior, 34, '#FFFFFF', COR_BORDA_CARD);
    texto(ctx, 'Saldo anterior', 112, ySaldoAnterior + 70, { tamanho: 28, peso: 600, cor: '#425675' });
    texto(ctx, saldoAnterior, 968, ySaldoAnterior + 70, { tamanho: 35, peso: 800, cor: '#0A2F6B', alinhamento: 'right', largura: 390 });

    card(ctx, yPagamento, alturaCardPagamento, '', 'PAGAMENTO REGISTRADO'); fundoDeValor(ctx, yPagamento + 72, temDesconto ? 238 : 180, '#1674D1');
    icone(ctx, 'confirmado', 208, yPagamento + 124, 58, '#FFFFFF'); texto(ctx, rotuloValorPago, 276, yPagamento + 133, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, valorPago, 922, yPagamento + 137, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });
    linha(ctx, 180, yPagamento + 154, 922, yPagamento + 154, 'rgba(255,255,255,.42)', 2);
    icone(ctx, iconeFormaPagamento(formaPagamento), 208, yPagamento + 206, 48, '#FFFFFF');
    texto(ctx, 'Forma de pagamento', 276, yPagamento + 195, { tamanho: 21, peso: 600, cor: '#D9F0FF', largura: 400 });
    texto(ctx, formaPagamento, 276, yPagamento + 226, { tamanho: 30, peso: 800, cor: '#FFFFFF', largura: 500 });
    if (temDesconto) {
      linha(ctx, 180, yPagamento + 246, 922, yPagamento + 246, 'rgba(255,255,255,.42)', 2);
      texto(ctx, 'Desconto concedido', 276, yPagamento + 287, { tamanho: 24, peso: 600, cor: '#D9F0FF', largura: 390 });
      texto(ctx, desconto, 922, yPagamento + 287, { tamanho: 31, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 330 });
    }

    card(ctx, ySaldo, alturaCardSaldo, '', 'SITUAÇÃO APÓS O LANÇAMENTO'); fundoDeValor(ctx, ySaldo + 72, 112, '#0A2F6B');
    icone(ctx, 'grafico', 208, ySaldo + 128, 56, '#46B7FF'); texto(ctx, 'Saldo atual', 276, ySaldo + 137, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, saldoAtual, 922, ySaldo + 141, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });
    desenharRodapeEmPilula(ctx, `Comprovante de pagamento • ${clienteExibido}`, yRodape);
    return canvas;
  }

  window.PaymentReceiptV2 = Object.freeze({ criarCanvas });
}());
