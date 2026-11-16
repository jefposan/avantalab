import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['normalizar','itemPedidoBonificado','pedidoSomenteBonificado','periodoRegistroRelatorio','dadosRelatorioCliente','renderRelatorioCliente','limparClienteRelatorio','escapeHtml','escapeAttr'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
function contexto(){
 const ctx=vm.createContext({state:{usuario:{id:'u'},contaVendasAtiva:{id:'p'},clientes:[{id:'a',nome:'<Ana>'},{id:'b',nome:'Bia'}],vendas:[
 {cliente_id:'a',criado_em:'2026-05-14T12:00:00',total:90,itens:[{produto_id:'p',produto_nome:'Produto',quantidade:2,preco:50,total:100},{produto_nome:'Brinde',quantidade:3,preco:10,total:0,bonificado:true}]},
 {cliente_id:'a',criado_em:'2026-06-15T12:00:00',total:0,itens:[{produto_nome:'Sem referência',quantidade:1,bonificado:true}]},
 {cliente_id:'a',criado_em:'2025-01-02T12:00:00',total:50,itens:[]},
 {cliente_id:'b',criado_em:'2026-05-01',total:999,itens:[]},
 {cliente_id:'a',status:'cancelada',criado_em:'2026-05-01',total:999,itens:[]},
 {cliente_id:'a',consignado:true,criado_em:'2026-05-01',total:999,itens:[{bonificado:true,quantidade:4,preco:80}]},
 ],pagamentos:[{cliente_id:'a',data_pagamento:'2026-05-14',valor:20.10,desconto:900},{cliente_id:'a',data_pagamento:'2026-05-15',valor:5.20},{cliente_id:'b',data_pagamento:'2026-05-01',valor:999}]},pedidoEhConsignado:v=>Boolean(v.consignado),relatorioClienteUI:{id:'a',ano:2026,mes:4,contexto:'u:p'},buscaAplicada:'',clientesFiltrados:()=>[],renderBarraBuscaClientes:()=>'<input placeholder="Pesquisar clientes">',svgIcon:()=>'<svg></svg>',moeda:n=>'R$ '+n.toFixed(2),kpi:(l,v)=>`<div>${l}:${v}</div>`});
 vm.runInContext(code,ctx);return ctx;
}
test('isola cliente e ano; exclui cancelados/consignados/brindes das compras e preserva dados',()=>{
 const c=contexto(),before=JSON.stringify(c.state),r=c.dadosRelatorioCliente('a',2026);
 assert.equal(r.compras,9000);assert.equal(r.pagamentos,2530);assert.equal(r.pedidos,1);assert.equal(r.numeroPagamentos,2);assert.equal(r.unidades,2);
 assert.equal(r.valorBonificado,3000);assert.equal(r.referenciasAusentes,true);assert.equal(r.bonificacoes.length,2);assert.equal(r.bonificacoes[0].data,'2026-06-15T12:00:00');assert.equal(r.bonificacoes[0].valor,null);
 assert.equal(r.meses[4].compras,9000);assert.equal(r.produtos[0].valor,10000);assert.equal(r.anos.find(a=>a.ano===2025).compras,5000);assert.equal(JSON.stringify(c.state),before);
 assert.equal(c.dadosRelatorioCliente('ausente',2026).cliente,null);
});
test('reutiliza pesquisa e torres, abre bonificações e não vaza seleção após trocar perfil',()=>{
 const c=contexto(),h=c.renderRelatorioCliente();
 assert.match(h,/Pesquisar clientes/);assert.match(h,/dashboard-sales-evolution-bars/);assert.match(h,/selecionarAnoClienteRelatorio/);assert.equal((h.match(/onclick="abrirBonificacoesClienteRelatorio\(\)"/g)||[]).length,2);assert.match(h,/&lt;Ana&gt;/);assert.doesNotMatch(h,/<Ana>/);
 c.state.contaVendasAtiva={id:'outra'};assert.match(c.renderRelatorioCliente(),/Selecione um cliente/);assert.equal(c.relatorioClienteUI.id,null);
});
test('mantém ID do menu, disponibiliza informações antigas e identifica Relatórios',()=>{
 assert.match(source,/\['informacoes', '9_Relatorios.svg', 'Relatórios'\]/);assert.match(source,/if \(state.aba === 'informacoes'\) return renderRelatorioCliente/);assert.match(source,/abrirInformacoesDoRelatorio/);
});

test('X limpa seleção/pesquisa e oculta relatório sem excluir dados nem alterar ano',()=>{
 const c=contexto(),antes=JSON.stringify(c.state.clientes),vendas=JSON.stringify(c.state.vendas);
 c.state.busca='Ana';c.buscaAplicada='Ana';let renders=0;
 c.render=()=>{renders++};c.requestAnimationFrame=f=>f();c.document={querySelector:()=>({focus(){}})};
 c.limparClienteRelatorio();
 assert.equal(c.relatorioClienteUI.id,null);assert.equal(c.relatorioClienteUI.mes,null);assert.equal(c.relatorioClienteUI.ano,2026);assert.equal(c.state.busca,'');assert.equal(c.buscaAplicada,'');assert.equal(renders,1);
 const html=c.renderRelatorioCliente();assert.match(html,/Selecione um cliente/);assert.doesNotMatch(html,/dashboard-sales-evolution-bars/);assert.doesNotMatch(html,/details class="relatorio-seletor" open/);assert.doesNotMatch(html,/class="relatorio-limpar-cliente"/);
 assert.equal(JSON.stringify(c.state.clientes),antes);assert.equal(JSON.stringify(c.state.vendas),vendas);
});
