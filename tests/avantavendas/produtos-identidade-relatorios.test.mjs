import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['criarAgrupadorProdutosRelatorio','validarSkusProdutosVendas','dadosRelatorioCliente','periodoRegistroRelatorio','rankingProdutosDashboard','resumoConsignadosDashboard','clientesDoProdutoConsignadoDashboard'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
const item=(id,nome,sku,q=1)=>({produto_id:id,produto_nome:nome,produto_sku:sku,quantidade:q,preco:10,total:q*10});
const venda=(i,extra={})=>({cliente_id:'c',criado_em:'2026-05-14',total:i.quantidade*10,itens:[i],...extra});
function contexto(vendas,produtos=[]){const state={contaVendasAtiva:{id:'a'},clientes:[{id:'c',nome:'Cliente'}],vendas,produtos,pagamentos:[]};const ctx=vm.createContext({state,itemPedidoBonificado:i=>!!i.bonificado,pedidoSomenteBonificado:v=>v.itens.every(i=>i.bonificado),pedidoEhConsignado:v=>!!v.consignado,pedidoConsignadoAtivo:v=>!!v.consignado});vm.runInContext(code,ctx);return ctx;}
test('une por SKU OU nome, mesmo excluídos, por transitividade, sem alterar vendas/comprovantes',()=>{
 const c=contexto([venda(item('apagado','Progressiva Paladium','001',2)),venda(item('novo',' progressiva  paládium ','OUTRO',3)),venda(item('terceiro','Nome antigo','outro',4)),venda(item('distinto','Progressiva Paladium 500ml','500',5)),venda({...item('brinde','Brinde','BR',10),bonificado:true})]);
 const antes=JSON.stringify(c.state),r=c.dadosRelatorioCliente('c',2026);
 assert.equal(r.produtos.length,2);assert.equal(r.produtos.find(p=>p.nome==='Progressiva Paladium').quantidade,9);assert.equal(r.produtos.find(p=>p.nome==='Progressiva Paladium').valor,9000);
 assert.equal(r.compras,14000);assert.equal(r.unidades,14);assert.equal(r.bonificacoes.length,1);
 assert.equal(c.rankingProdutosDashboard(c.state.vendas)[0].qtd,9);assert.equal(JSON.stringify(c.state),antes);
});
test('identifica item antigo só por ID usando cadastro atual e não mistura contas nem zeros de SKU',()=>{
 const c=contexto([venda(item('p1',undefined,undefined)),venda(item('apagado','Mudou nome','SKU',2)),venda(item('zero','Outro','001')),venda(item('um','Mais outro','1'))],[{id:'p1',sku:'SKU',nome:'Nome atual',conta_id:'a'}]);
 assert.equal(c.dadosRelatorioCliente('c',2026).produtos.length,3);
 c.state.vendas.push(venda(item('fora','Nome atual','SKU'),{conta_id:'b'}));
 const chave=c.criarAgrupadorProdutosRelatorio();assert.notEqual(chave(c.state.vendas[0].itens[0],'a'),chave(c.state.vendas[4].itens[0],'b'));
});
test('estoque consignado e distribuição por cliente usam a mesma união',()=>{
 const c=contexto([venda(item('velho','Paladium','A',2),{consignado:true}),venda(item('novo','PALADIUM','B',3),{consignado:true})]);
 const antes=JSON.stringify(c.state),r=c.resumoConsignadosDashboard();assert.equal(r.produtos.length,1);assert.equal(r.produtos[0].quantidade,5);
 assert.equal(c.clientesDoProdutoConsignadoDashboard(r.produtos[0].chave)[0].quantidade,5);assert.equal(JSON.stringify(c.state),antes);
});
test('valida SKU em cadastro, edição e lote, sem bloquear nomes iguais nem mudar o texto',()=>{
 const c=contexto([],[{id:'p',sku:'001',conta_id:'a'},{id:'externo',sku:'FORA',conta_id:'b'}]);
 assert.throws(()=>c.validarSkusProdutosVendas([{sku:' 001 '}]),e=>e.code==='AVANTAVENDAS_SKU_REPETIDO');
 assert.doesNotThrow(()=>c.validarSkusProdutosVendas([{sku:'001'}],c.state.produtos,'p'));
 assert.doesNotThrow(()=>c.validarSkusProdutosVendas([{sku:'1'},{sku:'FORA'},{sku:''},{sku:''}]));
 assert.throws(()=>c.validarSkusProdutosVendas([{sku:'Abc'},{sku:'abc'}]),/SKU/);
 assert.doesNotThrow(()=>c.validarSkusProdutosVendas([{nome:'Igual',sku:'A'},{nome:'Igual',sku:'B'}]));
 const salvar=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='salvarProduto').getText(ast);
 assert.ok(salvar.indexOf('validarSkusProdutosVendas')<salvar.indexOf('uploadProductImage'));
 const lote=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='salvarPacoteImportado').getText(ast);
 assert.ok(lote.indexOf('validarSkusProdutosVendas')<lote.indexOf('createPackage'));
});
