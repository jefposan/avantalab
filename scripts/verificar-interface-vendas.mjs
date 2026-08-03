import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [aplicacao, estilos, versao] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/version.ts'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

const acaoPagamento = '<button class="secondary quick-action-button quick-action-payment" onclick="abrirNovoPagamentoGeral()">';
const acaoPedido = '<button class="primary quick-action-button quick-action-order" onclick="abrirNovoPedidoGeral()">';

exigir(
  aplicacao.includes('<label for="cliNascimento">${svgIconEstavel(\'cake\')}<span>Data de Aniversário</span></label>')
    && aplicacao.includes("toast('Informe a data de aniversário no formato dd/mm.')"),
  'O cadastro do cliente deve identificar Data de Aniversário com o SVG de bolo.',
);
exigir(
  aplicacao.includes(acaoPagamento)
    && aplicacao.includes(acaoPedido)
    && aplicacao.indexOf(acaoPagamento) < aplicacao.indexOf(acaoPedido),
  'Pagamento deve ficar à esquerda e Pedido à direita no card do botão +.',
);
exigir(
  estilos.includes('.quick-action-button.quick-action-payment.secondary')
    && estilos.includes('--vendas-pagamento: #1F8A9E;')
    && estilos.includes('background: var(--vendas-pagamento);')
    && estilos.includes('.quick-action-button.quick-action-order.primary')
    && estilos.includes('--vendas-pedido: #1687D9;')
    && estilos.includes('background: var(--vendas-pedido);')
    && estilos.includes('.client-payment { background: var(--vendas-pagamento); }')
    && estilos.includes('.client-order { background: var(--vendas-pedido); }'),
  'As ações rápidas devem reutilizar as cores de Pagamento e Pedido do card do cliente.',
);
exigir(
  versao.includes("AVANTAVENDAS_ASSET_REVISION = '15'"),
  'A revisão estática do AvantaVendas deve invalidar o cache da interface anterior.',
);

if (falhas.length) {
  throw new Error(`Interface do AvantaVendas inválida:\n- ${falhas.join('\n- ')}`);
}

console.log('Interface do AvantaVendas validada.');
