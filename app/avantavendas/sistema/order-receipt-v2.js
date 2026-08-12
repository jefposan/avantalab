/* Comprovante de pedido V2: composição visual, sem cálculos ou acesso a dados. */
(function registrarComprovantePedidoV2() {
  'use strict';

  const LARGURA = 1080;
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
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + largura, y, x + largura, y + altura, r); ctx.arcTo(x + largura, y + altura, x, y + altura, r);
    ctx.arcTo(x, y + altura, x, y, r); ctx.arcTo(x, y, x + largura, y, r); ctx.closePath();
  }

  function retangulo(ctx, x, y, largura, altura, raio, cor, borda = '') {
    caminhoArredondado(ctx, x, y, largura, altura, raio); ctx.fillStyle = cor; ctx.fill();
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
    ctx.fillStyle = cor; ctx.font = `${peso} ${tamanho}px ${FONTE}`; ctx.textAlign = alinhamento; ctx.textBaseline = linhaBase;
    ctx.fillText(largura ? textoLimitado(ctx, valor, largura) : String(valor || ''), x, y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function linha(ctx, x1, y1, x2, y2, cor, largura = 4) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = cor; ctx.lineWidth = largura; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function icone(ctx, nome, x, y, tamanho, cor) {
    const s = tamanho / 24; const p = (valor) => valor * s;
    ctx.save(); ctx.translate(x - tamanho / 2, y - tamanho / 2); ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = Math.max(2.6, p(2)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (nome === 'documento') {
      ctx.strokeRect(p(4), p(2), p(13), p(20)); linha(ctx, p(8), p(7), p(14), p(7), cor, p(2)); linha(ctx, p(8), p(11), p(14), p(11), cor, p(2)); linha(ctx, p(8), p(15), p(12), p(15), cor, p(2));
      ctx.beginPath(); ctx.arc(p(18), p(17), p(4), 0, Math.PI * 2); ctx.stroke(); linha(ctx, p(16.2), p(17), p(17.5), p(18.3), cor, p(2)); linha(ctx, p(17.5), p(18.3), p(20.1), p(15.6), cor, p(2));
    } else if (nome === 'usuario') {
      ctx.beginPath(); ctx.arc(p(12), p(7), p(4), 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(p(12), p(20), p(7), Math.PI, 0); ctx.stroke();
    } else if (nome === 'calendario') {
      ctx.strokeRect(p(3), p(5), p(18), p(16)); linha(ctx, p(3), p(10), p(21), p(10), cor, p(2)); linha(ctx, p(8), p(2), p(8), p(7), cor, p(2)); linha(ctx, p(16), p(2), p(16), p(7), cor, p(2)); ctx.fillRect(p(7), p(13), p(3), p(3)); ctx.fillRect(p(14), p(13), p(3), p(3));
    } else if (nome === 'carteira') {
      ctx.strokeRect(p(3), p(6), p(18), p(14)); ctx.beginPath(); ctx.arc(p(17), p(13), p(1.5), 0, Math.PI * 2); ctx.fill(); linha(ctx, p(3), p(9), p(15), p(9), cor, p(2));
    } else if (nome === 'confirmado') {
      ctx.beginPath(); ctx.arc(p(12), p(12), p(9), 0, Math.PI * 2); ctx.stroke(); linha(ctx, p(7), p(12), p(10.5), p(15.5), cor, p(2.4)); linha(ctx, p(10.5), p(15.5), p(17.5), p(8.5), cor, p(2.4));
    } else if (nome === 'grafico') {
      linha(ctx, p(4), p(20), p(4), p(15), cor, p(2)); linha(ctx, p(10), p(20), p(10), p(10), cor, p(2)); linha(ctx, p(16), p(20), p(16), p(5), cor, p(2)); linha(ctx, p(2), p(20), p(21), p(20), cor, p(2)); linha(ctx, p(4), p(9), p(10), p(6), cor, p(2)); linha(ctx, p(10), p(6), p(16), p(2), cor, p(2)); linha(ctx, p(16), p(2), p(20), p(2), cor, p(2)); linha(ctx, p(20), p(2), p(20), p(6), cor, p(2));
    } else if (nome === 'itens') {
      ctx.strokeRect(p(4), p(3), p(16), p(18)); ctx.fillRect(p(7), p(7), p(3), p(3)); linha(ctx, p(13), p(8.5), p(17), p(8.5), cor, p(2)); ctx.fillRect(p(7), p(13), p(3), p(3)); linha(ctx, p(13), p(14.5), p(17), p(14.5), cor, p(2));
    }
    ctx.restore();
  }

  function blocoIcone(ctx, nome, x, y, cor = '#126ED1') { ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.fillStyle = '#EDF5FF'; ctx.fill(); icone(ctx, nome, x, y, 43, cor); }
  function card(ctx, y, altura, nomeIcone, titulo) {
    retangulo(ctx, 44, y, 992, altura, 34, '#FFFFFF', '#E4ECF4');
    if (nomeIcone) {
      blocoIcone(ctx, nomeIcone, 105, y + 64);
      texto(ctx, titulo, 172, y + 76, { tamanho: 28, peso: 800, cor: '#0A2F6B' });
      return;
    }
    texto(ctx, titulo, LARGURA / 2, y + 43, { tamanho: 28, peso: 800, cor: '#0A2F6B', alinhamento: 'center', largura: 880, linhaBase: 'middle' });
  }
  function fundoDeValor(ctx, y, altura, cor) { retangulo(ctx, 146, y, 810, altura, 26, cor); }
  function primeiroNomeClienteComprovante(nome) { return String(nome || '').trim().split(/\s+/)[0] || 'Cliente'; }
  function desenharRodapeEmPilula(ctx, conteudo, y) {
    ctx.font = `700 28px ${FONTE}`;
    const conteudoLimitado = textoLimitado(ctx, conteudo, 820);
    const larguraPilula = Math.min(936, Math.max(360, Math.ceil(ctx.measureText(conteudoLimitado).width) + 88));
    const xPilula = (LARGURA - larguraPilula) / 2;
    retangulo(ctx, xPilula, y - 47, larguraPilula, 72, 36, '#FFFFFF', '#DCE6F0');
    texto(ctx, conteudoLimitado, LARGURA / 2, y, { tamanho: 28, peso: 700, cor: '#0A2F6B', alinhamento: 'center' });
  }

  async function criarCanvas({ empresa = 'AvantaLab', cliente = 'Cliente não informado', data = 'Data não informada', saldoAnterior = 'R$ 0,00', valorPedido = 'R$ 0,00', saldoAtual = 'R$ 0,00', desconto = '', titulo = 'Comprovante de pedido', itens = [] } = {}) {
    const clienteExibido = primeiroNomeClienteComprovante(cliente);
    const itensExibidos = itens.slice(0, 44);
    if (itens.length > itensExibidos.length) itensExibidos.push({ principal: `+ ${itens.length - itensExibidos.length} itens adicionais`, secundario: '', valor: '' });
    const temDesconto = Boolean(desconto);
    const alturaResumo = temDesconto ? 273 : 205;
    const yPedido = 548 + alturaResumo + 31;
    const ySaldo = yPedido + 282;
    const yDetalhes = ySaldo + 282;
    const alturaItens = Math.max(82, 26 + itensExibidos.length * 82);
    const alturaDetalhes = 106 + alturaItens;
    const yRodape = yDetalhes + alturaDetalhes + 92;
    const altura = Math.min(5400, Math.max(1920, yRodape + 78));
    const canvas = document.createElement('canvas'); canvas.width = LARGURA; canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível gerar o comprovante.');
    ctx.fillStyle = '#F4F8FC'; ctx.fillRect(0, 0, LARGURA, altura);
    const fundo = await carregarFundo(); if (fundo) ctx.drawImage(fundo, 0, 0, LARGURA, altura);

    retangulo(ctx, 44, 42, 992, 304, 36, '#063B72');
    ctx.beginPath(); ctx.arc(132, 134, 58, 0, Math.PI * 2); ctx.fillStyle = '#0B5EAA'; ctx.fill(); icone(ctx, 'documento', 132, 134, 64, '#FFFFFF');
    const nomeEmpresa = String(empresa || 'AvantaLab').toUpperCase(); texto(ctx, nomeEmpresa, 575, 157, { tamanho: nomeEmpresa.length > 31 ? 38 : nomeEmpresa.length > 23 ? 44 : 51, peso: 800, cor: '#FFFFFF', alinhamento: 'center', largura: 730 });
    icone(ctx, 'usuario', 93, 255, 41, '#3FE3E8'); texto(ctx, `Cliente: ${clienteExibido}`, 125, 269, { tamanho: 31, peso: 700, cor: '#FFFFFF', largura: 510 }); linha(ctx, 654, 213, 654, 288, 'rgba(255,255,255,.68)', 2); icone(ctx, 'calendario', 714, 255, 40, '#3FE3E8'); texto(ctx, data, 1000, 269, { tamanho: 31, peso: 700, cor: '#FFFFFF', alinhamento: 'right', largura: 275 });

    retangulo(ctx, 216, 385, 648, 118, 26, '#F1FBF5', '#BDEBD3'); icone(ctx, 'confirmado', 269, 444, 54, '#168448'); texto(ctx, 'Pedido registrado com sucesso!', LARGURA / 2, 444, { tamanho: 25, peso: 800, cor: '#16773F', alinhamento: 'center', largura: 500, linhaBase: 'middle' });

    card(ctx, 548, alturaResumo, 'carteira', 'RESUMO FINANCEIRO'); fundoDeValor(ctx, 660, temDesconto ? 136 : 68, '#F3F7FC'); texto(ctx, 'Saldo anterior', 180, 704, { tamanho: 26, peso: 600, cor: '#425675' }); texto(ctx, saldoAnterior, 928, 704, { tamanho: 31, peso: 800, cor: '#0A2F6B', alinhamento: 'right', largura: 340 });
    if (temDesconto) { linha(ctx, 180, 728, 928, 728, '#DCE6F0', 2); texto(ctx, 'Desconto concedido', 180, 772, { tamanho: 24, peso: 600, cor: '#425675' }); texto(ctx, desconto, 928, 772, { tamanho: 29, peso: 800, cor: '#0A2F6B', alinhamento: 'right', largura: 300 }); }

    card(ctx, yPedido, 251, '', 'PEDIDO REGISTRADO'); fundoDeValor(ctx, yPedido + 86, 130, '#1674D1'); icone(ctx, 'confirmado', 208, yPedido + 151, 66, '#FFFFFF'); texto(ctx, titulo === 'Pedido consignado' ? 'Pedido consignado' : 'Valor do pedido', 276, yPedido + 160, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, valorPedido, 922, yPedido + 164, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });

    card(ctx, ySaldo, 251, '', 'SITUAÇÃO APÓS O LANÇAMENTO'); fundoDeValor(ctx, ySaldo + 86, 130, '#0A2F6B'); icone(ctx, 'grafico', 208, ySaldo + 151, 63, '#46B7FF'); texto(ctx, 'Saldo atual', 276, ySaldo + 160, { tamanho: 26, peso: 700, cor: '#FFFFFF', largura: 370 }); texto(ctx, saldoAtual, 922, ySaldo + 164, { tamanho: 43, peso: 800, cor: '#FFFFFF', alinhamento: 'right', largura: 355 });

    card(ctx, yDetalhes, alturaDetalhes, 'itens', titulo === 'Pedido consignado' ? 'ITENS DO CONSIGNADO' : 'DETALHES DO PEDIDO'); fundoDeValor(ctx, yDetalhes + 86, alturaItens, '#F3F7FC');
    let yItem = yDetalhes + 126;
    itensExibidos.forEach((item, indice) => {
      if (indice) linha(ctx, 180, yItem - 30, 922, yItem - 30, '#DCE6F0', 2);
      texto(ctx, item.principal || 'Produto', 180, yItem, { tamanho: 24, peso: 700, cor: '#223858', largura: item.bonificado ? 365 : 500 });
      if (item.bonificado) { retangulo(ctx, 555, yItem - 27, 156, 31, 15, '#FFF1DE'); texto(ctx, 'BONIFICADO', 633, yItem - 5, { tamanho: 15, peso: 800, cor: '#9A5315', alinhamento: 'center' }); }
      if (item.secundario) texto(ctx, item.secundario, 180, yItem + 34, { tamanho: 19, peso: 500, cor: '#60738D', largura: 470 });
      texto(ctx, item.valor || '', 922, yItem + 8, { tamanho: 25, peso: 800, cor: '#126ED1', alinhamento: 'right', largura: 260 });
      yItem += 82;
    });
    desenharRodapeEmPilula(ctx, `${titulo} • ${clienteExibido}`, yRodape);
    return canvas;
  }

  window.OrderReceiptV2 = Object.freeze({ criarCanvas });
}());
