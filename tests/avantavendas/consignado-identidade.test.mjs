import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import sharp from 'sharp';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const funcao = (nome, proxima) => fonte.slice(fonte.indexOf(`async function ${nome}(`), fonte.indexOf(`async function ${proxima}(`));

test('compartilhamento distingue consignado, pedido e não altera os dados', async () => {
  for (const consignado of [false, true]) {
    const venda = { id: 'pedido-123', cliente_id: 'cliente', total: 378, desconto: 10, criado_em: '2026-10-16', itens: [{ produto_nome: 'Bóra Gin 700ml', quantidade: 6, preco: 63, total: 378 }] };
    const original = JSON.stringify(venda);
    let recebido, compartilhamento;
    const ctx = vm.createContext({
      state: { vendas: [venda], clientes: [{ id: 'cliente', nome: 'Jeff Ferreira' }] },
      window: { OrderReceiptV2: { criarCanvas: async dados => { recebido = dados; return 'canvas'; } } },
      resumoComprovantePedido: () => {
        assert.equal(consignado, false, 'consignação não consulta saldos para compartilhar');
        return { saldoAnterior: 0, creditoAnterior: 22, saldoAtual: 34 };
      },
      itemPedidoBonificado: () => false, detalheQuantidadeItemComprovante: () => '6 × R$ 63,00',
      pedidoEhConsignado: () => consignado, nomeEmpresaParaComprovantes: () => 'Bóra Bebidas',
      moeda: valor => Number(valor).toFixed(2), dataComprovante: x => x,
      compartilharCanvasComprovante: async (...args) => { compartilhamento = args; return true; }, fecharSheet() {},
    });
    vm.runInContext(funcao('compartilharPedido', 'compartilharPagamento'), ctx);
    assert.equal(await ctx.compartilharPedido(venda.id), true);
    assert.equal(recebido.tipo, consignado ? 'consignado' : 'pedido');
    assert.equal(recebido.titulo, consignado ? 'Comprovante de consignado' : 'Comprovante de pedido');
    assert.equal(recebido.saldoAnterior, consignado ? undefined : '22.00');
    assert.equal(recebido.saldoAnteriorCredito, consignado ? undefined : true);
    assert.equal(recebido.saldoAtual, consignado ? undefined : '34.00');
    assert.equal(recebido.valorPedido, '378.00');
    assert.equal(compartilhamento[2], recebido.titulo);
    assert.ok(compartilhamento[1].startsWith(consignado ? 'consignado-' : 'pedido-'));
    assert.equal(JSON.stringify(venda), original);
  }
});

test('marca oficial positiva/negativa mantém dimensão, transparência e azul-claro', async () => {
  const pasta = new URL('../../app/avantavendas/sistema/assets/', import.meta.url);
  const positivo = await sharp(new URL('logo-avantavendas-positivo.png', pasta).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const negativo = await sharp(new URL('logo-avantavendas-negativo.png', pasta).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(positivo.info.width, negativo.info.width);
  assert.equal(positivo.info.height, negativo.info.height);
  assert.equal(positivo.data[3], 0);
  let escuros = 0, escurosInterpolados = 0, azuis = 0, azuisInterpolados = 0;
  for (let i = 0; i < positivo.data.length; i += 4) {
    assert.equal(positivo.data[i + 3], negativo.data[i + 3], 'contorno/alpha preservado');
    if (positivo.data[i + 3] < 240) continue;
    if (positivo.data[i + 1] < 100) {
      if (negativo.data[i] < 250 || negativo.data[i + 1] < 250 || negativo.data[i + 2] < 250) escurosInterpolados++;
      escuros++;
    } else if (positivo.data[i] < 8 && positivo.data[i + 1] > 135 && positivo.data[i + 2] > 180) {
      if (Math.abs(positivo.data[i + 1] - negativo.data[i + 1]) >= 3) azuisInterpolados++;
      azuis++;
    }
  }
  assert.ok(escuros > 10000 && azuis > 10000);
  assert.ok(escurosInterpolados / escuros < .005, 'azul-escuro convertido em branco; tolerância de 0,5% para bordas reamostradas');
  assert.ok(azuisInterpolados / azuis < .002, 'azul-claro preservado; tolerância de 0,2% para interpolação nas junções com branco');
});

test('fallback entre versões de cache gera comprovante sem erro de altura', () => {
  const nomes = ['primeiroNomeClienteComprovante', 'criarCanvasComprovante', 'caminhoRetanguloArredondado', 'textoCanvasLimitado'];
  const textos = [];
  const contextoCanvas = new Proxy({
    measureText: texto => ({ width: String(texto).length * 12 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    fillText: texto => textos.push(texto),
  }, { get: (objeto, chave) => chave in objeto ? objeto[chave] : () => {} });
  const canvas = { getContext: () => contextoCanvas };
  const contexto = vm.createContext({ document: { createElement: () => canvas }, state: {} });
  for (const nome of nomes) {
    const inicio = fonte.indexOf(`function ${nome}(`);
    const fim = fonte.indexOf('\nfunction ', inicio + 1);
    vm.runInContext(fonte.slice(inicio, fim), contexto);
  }
  const retorno = contexto.criarCanvasComprovante({ empresa: 'Bóra Bebidas', titulo: 'Comprovante de pedido', tipo: 'pedido', cliente: 'Jeff Ferreira', data: '16/10/2026', linhas: [], resumo: [{ rotulo: 'Saldo anterior', valor: 'R$ 22,00', credito: true }] });
  assert.equal(retorno, canvas);
  assert.ok(canvas.height > 0);
  assert.ok(textos.includes('CRÉDITO'));
  textos.length = 0;
  contexto.criarCanvasComprovante({ empresa: 'Bóra Bebidas', titulo: 'Comprovante de consignado', tipo: 'consignado', cliente: 'Jeff Ferreira', data: '16/10/2026', linhas: [], resumo: [
    { rotulo: 'Saldo anterior', valor: 'R$ 182,00', credito: true },
    { rotulo: 'Valor do consignado', valor: 'R$ 787,50', destaque: 'principal', tituloDestaque: 'Consignado registrado' },
    { rotulo: 'Saldo atual', valor: 'R$ 182,00', destaque: 'saldo' },
  ] });
  assert.ok(textos.includes('R$ 787,50'));
  for (const removido of ['CRÉDITO', 'Saldo anterior', 'Saldo atual', 'R$ 182,00']) assert.ok(!textos.includes(removido), removido);
});

test('entrada, cabeçalho e cache usam a marca do Vendas sem trocar a do Gestão', () => {
  const pagina = readFileSync(new URL('../../app/avantavendas/page.tsx', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../../app/avantavendas/sw.js/route.ts', import.meta.url), 'utf8');
  assert.match(pagina, /logo-avantavendas-positivo-20261110\.png/);
  assert.doesNotMatch(pagina, /src="\/images\/logo-avantalab-oficial/);
  for (const variante of ['positivo', 'negativo']) {
    assert.ok(fonte.includes(`logo-avantavendas-${variante}-20261110.png`));
    assert.ok(sw.includes(`logo-avantavendas-${variante}-20261110.png`));
  }
  assert.ok(fonte.includes('aria-label="AvantaVendas"'));
});
