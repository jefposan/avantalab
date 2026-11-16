import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as PDFLib from 'pdf-lib';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['prepararDadosPdfRelatorioCliente','gerarBytesPdfRelatorioCliente','compartilharPdfRelatorioCliente','baixarPdfRelatorioCliente'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
test('gera PDF real paginado com acentos e textos longos, sem janela de impressão',async()=>{
 const ctx=vm.createContext({moeda:n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dataBR:d=>new Date(d).toLocaleDateString('pt-BR')});vm.runInContext(code,ctx);
 const dados={cliente:{nome:'Júlia Gonçalves'},compras:50000,pagamentos:20000,pedidos:10,numeroPagamentos:5,unidades:140,meses:Array.from({length:12},(_,mes)=>({mes,compras:mes*100,pagamentos:50,pedidos:1})),anos:[{ano:2026,compras:50000,pagamentos:20000}],produtos:Array.from({length:140},(_,i)=>({nome:`Máscara Ônix reconstrutora - produto ${i} `+'texto longo '.repeat(5),quantidade:i+1,valor:1000})),bonificacoes:[{data:'2026-05-14T12:00:00',produto:'Brinde sérum',quantidade:2,valor:null}],referenciasAusentes:true};
 const logo=readFileSync(new URL('../../app/avantavendas/sistema/assets/logo-avantalab-relatorio.png',import.meta.url));
 const antes=JSON.stringify(dados);
 const bytes=await ctx.gerarBytesPdfRelatorioCliente(dados,2026,PDFLib,logo);
 assert.equal(JSON.stringify(dados),antes,'apresentação não altera valores de origem');
 assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>2);assert.equal(pdf.getPage(0).getWidth(),595.28);
 if(process.env.AVANTA_PDF_TEST_PATH)writeFileSync(process.env.AVANTA_PDF_TEST_PATH,bytes);
 const print=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='imprimirRelatorioCliente').getText(ast);
 assert.doesNotMatch(print,/window\.open|\.print\(/);assert.match(print,/gerarBytesPdfRelatorioCliente/);
});
test('últimos 12 meses respeitam São Paulo e o ano selecionado sem mudar resumo anual',()=>{
 const base=ano=>({cliente:{nome:'Teste'},compras:ano,meses:Array.from({length:12},(_,mes)=>({mes,compras:ano*100+mes,pagamentos:mes,pedidos:1}))});
 const ctx=vm.createContext({dadosRelatorioCliente:(id,ano)=>base(ano)});vm.runInContext(code,ctx);
 const dados=ctx.prepararDadosPdfRelatorioCliente('c',2026,new Date('2026-11-01T01:00:00Z'));
 assert.equal(dados.mesesPdf[0].ano,2025);assert.equal(dados.mesesPdf[0].mes,10);
 assert.equal(dados.mesesPdf[11].ano,2026);assert.equal(dados.mesesPdf[11].mes,9);
 assert.equal(dados.compras,2026);assert.equal(dados.meses.length,12);
 const passado=ctx.prepararDadosPdfRelatorioCliente('c',2024,new Date('2026-11-01T01:00:00Z'));
 assert.ok(passado.mesesPdf.every(m=>m.ano===2024));assert.equal(passado.mesesPdf[0].mes,0);
});
test('layout incorpora logo aprovado, setores, barras e continuação das tabelas',()=>{
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='gerarBytesPdfRelatorioCliente').getText(ast);
 for(const parte of ['doc.embedPng(logoBytes)','003E73','00BC89','Resumo por ano','Compras nos últimos 12 meses','Produtos mais comprados','Bonificações no período','(continuação)'])assert.ok(fn.includes(parte),parte);
 assert.match(source,/carregarLogoPdfRelatorio\(\)/);
});
test('modelo comum mantém duas páginas e aceita relatório vazio com valores zero',async()=>{
 const ctx=vm.createContext({moeda:n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dataBR:d=>d.split('-').reverse().join('/')});vm.runInContext(code,ctx);
 const logo=readFileSync(new URL('../../app/avantavendas/sistema/assets/logo-avantalab-relatorio.png',import.meta.url));
 const valores=[780,1250,620,980,1470,1100,1650,1320,1780,1440,1920,2160];
 const dados={cliente:{nome:'Mariana Costa'},meses:[],mesesPdf:valores.map((n,i)=>({mes:(i+10)%12,ano:i<2?2025:2026,compras:n*100,pagamentos:100000,pedidos:2})),anos:[{ano:2024,compras:924000,pagamentos:900000},{ano:2025,compras:1280000,pagamentos:1234000},{ano:2026,compras:1444000,pagamentos:1400000}],produtos:['Cronograma Capilar 150g','OverGloss 50ml','Shampoo Ônix 300ml','Máscara Reconstrutora Ônix 400g','Leave-in Ônix 150ml','Sérum Easy Repair 15ml'].map((nome,i)=>({nome,quantidade:18-i*2,valor:151200-i*10000})),bonificacoes:[{data:'2026-10-08',produto:'Leave-in Ônix 150ml',quantidade:2,valor:4600},{data:'2026-07-12',produto:'OverGloss 50ml',quantidade:2,valor:13000},{data:'2026-03-03',produto:'Mini Máscara Ônix',quantidade:2,valor:6000}],valorBonificado:23600};
 const bytes=await ctx.gerarBytesPdfRelatorioCliente(dados,2026,PDFLib,logo);
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),2);assert.ok(pdf.getPage(0).node.Resources().lookup(PDFLib.PDFName.of('XObject')));
 if(process.env.AVANTA_PDF_MODEL_PATH)writeFileSync(process.env.AVANTA_PDF_MODEL_PATH,bytes);
 const vazio={...dados,mesesPdf:dados.mesesPdf.map(m=>({...m,compras:0,pagamentos:0,pedidos:0})),anos:[],produtos:[],bonificacoes:[],valorBonificado:0};
 assert.equal((await PDFLib.PDFDocument.load(await ctx.gerarBytesPdfRelatorioCliente(vazio,2026,PDFLib,logo))).getPageCount(),2);
});
test('PDF preparado usa bridge nativa; cancelamento não gera download inesperado',async()=>{
 const arquivo={name:'relatorio.pdf',type:'application/pdf'};let compartilhado,downloads=0;
 const ctx=vm.createContext({window:{__avantavendasCompartilharArquivos:async p=>{compartilhado=p}},navigator:{},document:{getElementById:()=>({__arquivoRelatorioPdf:arquivo})},compartilhamentoCanceladoDivulgacao:e=>e.name==='AbortError',toast:()=>{},baixarArquivoGeradoVendas:()=>downloads++});vm.runInContext(code,ctx);
 const botao={disabled:false,isConnected:true};await ctx.compartilharPdfRelatorioCliente(botao);assert.equal(compartilhado.arquivos[0],arquivo);assert.equal(botao.disabled,false);
 ctx.window.__avantavendasCompartilharArquivos=async()=>{throw {name:'AbortError'}};await ctx.compartilharPdfRelatorioCliente(botao);assert.equal(downloads,0);
 ctx.baixarPdfRelatorioCliente();assert.equal(downloads,1);
});
