import { readFileSync } from 'node:fs';
import ts from 'typescript';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nomes = ['mostrarCardPedidoCliente', 'selecionarTipoPedidoCliente', 'totaisPedidoClienteRascunho', 'abrirConsignadoCliente'];
const funcoes = ast.statements.filter(s => ts.isFunctionDeclaration(s) && nomes.includes(s.name?.text));
if (funcoes.length !== nomes.length) throw new Error('Função do formulário não localizada.');

// Mesmas funções e marcação do aplicativo; somente dados e persistência são fictícios.
export const roteiroTemaConsignado = `
var state = { clientes: [{ id: 'cliente-qa', nome: 'Cliente de teste' }] };
var pedidoClienteRascunho;
var ultimaTela;
function escapeHtml(v) { return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
var escapeAttr = escapeHtml;
function moeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function numeroParaCampoMoeda(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function produtosDisponiveisPedido() { return [{ id: 'produto-qa', nome: 'Produto de teste' }]; }
function campoDataCentralizado(id, data, rotulo) { return '<label class="transaction-date-field"><span>'+rotulo+'</span><button type="button" class="date-picker-button">'+data.split('-').reverse().join('/')+'</button></label>'; }
function campoBuscaClienteLancamento() { return ''; }
function focarBuscaClienteLancamento() {}
function dataComprovante(data) { return data; }
function svgIcon() { return ''; }
function sheet(html, classes) { ultimaTela = { html, classes }; }
${funcoes.map(s => s.getText(ast)).join('\n')}
function prepararPedidoQa(tipo = 'venda', editando = false, quantidadeItens = 2) {
  pedidoClienteRascunho = {
    idPersistencia: 'pedido-qa', clienteId: 'cliente-qa', tipo, data: '2026-10-22',
    editandoId: editando ? 'pedido-qa' : '', produtoId: 'produto-qa', produtoBusca: 'Produto de teste',
    quantidade: 3, preco: 56, bonificado: false, desconto: 10, descontoTipo: 'valor', descontoPercentual: 0,
    itens: Array.from({length: quantidadeItens}, (_, i) => ({produto_id: 'produto-'+i, produto_nome: i ? 'Brinde de teste' : 'Produto de teste', quantidade: 2, preco: 56, bonificado: i === 1}))
  };
  mostrarCardPedidoCliente();
}
function visualizarConsignadoQa() {
  abrirConsignadoCliente({ id: 'pedido-qa', cliente_id: 'cliente-qa', total: 102,
    criado_em: '22/10/2026', itens: [{ produto_nome: 'Produto de teste', quantidade: 2 }] });
}
`;
