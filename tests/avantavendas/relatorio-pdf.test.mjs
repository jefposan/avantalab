import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as PDFLib from 'pdf-lib';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['gerarBytesPdfRelatorioCliente','compartilharPdfRelatorioCliente','baixarPdfRelatorioCliente'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
test('gera PDF real paginado com acentos e textos longos, sem janela de impressão',async()=>{
 const ctx=vm.createContext({moeda:n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),dataBR:d=>new Date(d).toLocaleDateString('pt-BR')});vm.runInContext(code,ctx);
 const dados={cliente:{nome:'Júlia Gonçalves'},compras:50000,pagamentos:20000,pedidos:10,numeroPagamentos:5,unidades:140,meses:Array.from({length:12},(_,mes)=>({mes,compras:mes*100,pagamentos:50,pedidos:1})),anos:[{ano:2026,compras:50000,pagamentos:20000}],produtos:Array.from({length:140},(_,i)=>({nome:`Máscara Ônix reconstrutora - produto ${i} `+'texto longo '.repeat(5),quantidade:i+1,valor:1000})),bonificacoes:[{data:'2026-05-14T12:00:00',produto:'Brinde sérum',quantidade:2,valor:null}],referenciasAusentes:true};
 const bytes=await ctx.gerarBytesPdfRelatorioCliente(dados,2026,PDFLib);
 assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>2);assert.equal(pdf.getPage(0).getWidth(),595.28);
 if(process.env.AVANTA_PDF_TEST_PATH)writeFileSync(process.env.AVANTA_PDF_TEST_PATH,bytes);
 const print=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='imprimirRelatorioCliente').getText(ast);
 assert.doesNotMatch(print,/window\.open|\.print\(/);assert.match(print,/gerarBytesPdfRelatorioCliente/);
});
test('PDF preparado usa bridge nativa; cancelamento não gera download inesperado',async()=>{
 const arquivo={name:'relatorio.pdf',type:'application/pdf'};let compartilhado,downloads=0;
 const ctx=vm.createContext({window:{__avantavendasCompartilharArquivos:async p=>{compartilhado=p}},navigator:{},document:{getElementById:()=>({__arquivoRelatorioPdf:arquivo})},compartilhamentoCanceladoDivulgacao:e=>e.name==='AbortError',toast:()=>{},baixarArquivoGeradoVendas:()=>downloads++});vm.runInContext(code,ctx);
 const botao={disabled:false,isConnected:true};await ctx.compartilharPdfRelatorioCliente(botao);assert.equal(compartilhado.arquivos[0],arquivo);assert.equal(botao.disabled,false);
 ctx.window.__avantavendasCompartilharArquivos=async()=>{throw {name:'AbortError'}};await ctx.compartilharPdfRelatorioCliente(botao);assert.equal(downloads,0);
 ctx.baixarPdfRelatorioCliente();assert.equal(downloads,1);
});
