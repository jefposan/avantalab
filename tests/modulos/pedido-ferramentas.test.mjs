import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument, PDFRawStream, decodePDFRawStream} from 'pdf-lib';
import {buildOrderPdf,copyOrderPdf,orderContactLink,orderMessage,orderStatusActions} from '../../app/vendas/lib/order-tools.ts';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const company={name:'Empresa fictícia',document:'Documento de teste'};
const record={id:'2026/10',client:'Cliente fictício',customerId:'cliente-1',createdAt:'2026-11-19T15:00:00Z',status:'Faturado',total:123.45,
 persistence:{operationId:'original',customerId:'cliente-1',version:9},events:[{label:'Histórico original'}],
 order:{lines:Array.from({length:75},(_,i)=>({sku:`ITEM-${i}`,name:`Produto ${i} com nome extenso para verificar a quebra sem remover itens`,unit:'un',quantity:2,unitPrice:4,unitDiscount:1,cost:999})),commercialTotals:{products:450,orderDiscount:2,freight:3,insurance:1,other:4},paymentMethod:'pix',installments:1,firstDueDate:'2026-11-20',notes:'Observação de teste',reserveStock:true,stockState:'Baixado'}};
test('PDF do pedido pagina todos os itens sem depender de serviço externo',async()=>{
 const bytes=await buildOrderPdf(record,company,{legalName:'Razão social de teste',city:'Cidade/UF'});
 const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>2);assert.ok(bytes.length>1000);
 const text=pdf.context.enumerateIndirectObjects().filter(([,value])=>value instanceof PDFRawStream).map(([,value])=>{
   const content=Buffer.from(decodePDFRawStream(value).decode()).toString('latin1');
   return [...content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map(m=>Buffer.from(m[1],'hex').toString('latin1')).join(' ');
 }).join(' ');
 assert.match(text,/ITEM-74/);assert.match(text,/123,45/);assert.doesNotMatch(text,/999|Observação de teste/);
});
test('copiar PDF escreve arquivo real e informa incompatibilidade/recusa sem falso sucesso',async()=>{
 const blob=new Blob(['PDF fictício'],{type:'application/pdf'});let written;
 class Item {constructor(data){this.data=data;}static supports(type){return type==='application/pdf';}}
 await copyOrderPdf(blob,{Item,clipboard:{write:async data=>{written=data;}}});assert.equal(written[0].data['application/pdf'],blob);
 await assert.rejects(copyOrderPdf(blob,{}),/não permite copiar/);
 class Unsupported extends Item {static supports(){return false;}}
 await assert.rejects(copyOrderPdf(blob,{Item:Unsupported,clipboard:{write:async()=>assert.fail('não suportado')}}),/Baixar PDF/);
 await assert.rejects(copyOrderPdf(blob,{Item,clipboard:{write:async()=>{throw Error('NotAllowedError');}}}),/nenhum PDF foi copiado/);
});
test('contatos são validados e mensagem não expõe custo nem gera URL executável',()=>{
 const email=orderContactLink('email',{email:'cliente@example.test'},record,company);
 assert.match(email,/^mailto:cliente%40example.test\?subject=/);
 assert.match(orderContactLink('whatsapp',{phone:'(11) 99999-0000'},record,company),/^https:\/\/wa.me\/5511999990000\?text=/);
 for(const invalid of ['javascript:alert(1)','x@example.test\r\nBcc:x@test.com','x@example.test?bcc=x'])assert.throws(()=>orderContactLink('email',{email:invalid},record,company),/e-mail válido/);
 assert.throws(()=>orderContactLink('whatsapp',{phone:'123'},record,company),/DDD/);
 const message=orderMessage(record,company);assert.match(message,/Mais 67 itens/);assert.doesNotMatch(message,/999|cost|custo/i);assert.match(message,/123,45/);
});
test('status oferece somente transições operacionais válidas e permissões do servidor',()=>{
 assert.deepEqual(orderStatusActions('Cancelado'),[]);assert.deepEqual(orderStatusActions('Devolvido'),[]);
 assert.ok(orderStatusActions('Confirmado').some(c=>c.action==='faturar'));
 assert.ok(!orderStatusActions('Faturado').some(c=>c.action==='editar'||c.action==='faturar'));
 assert.deepEqual(orderStatusActions('Faturado').find(c=>c.action==='devolver').permissions,['sales.cancel','stock.adjust','receivables.refund','fiscal.cancel']);
});
test('Copiar pedido cria outro rascunho sem IDs, histórico, estoque ou financeiro da origem',()=>{
 const file=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');const ast=ts.createSourceFile('view.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
 function visit(node){if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='onCopy'&&node.initializer?.expression?.parameters?.[0]?.name.getText(ast)==='record')handler=node.initializer.expression.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
 let copied;const ctx={authorize:()=>true,crypto:{randomUUID:(()=>{let n=0;return()=>`new-${++n}`;})()},structuredClone,setStandaloneFiscal(){},setNewType(){},setEditingOrder:value=>copied=value,setCommercialClient(){},setCommercialSku(){},setCommercialReturnView(){},setView(){}};
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(`var copy=${handler}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 ctx.copy(record);assert.notEqual(copied.id,record.id);assert.equal(copied.persistence,undefined);assert.equal(copied.status,'Rascunho');assert.equal(copied.order.reserveStock,false);assert.equal(copied.order.stockState,'Sem movimentação');assert.equal(copied.events.length,1);assert.equal(copied.order.deliveryDate,'');
 copied.order.lines[0].quantity=50;assert.equal(record.order.lines[0].quantity,2);
 copied=undefined;ctx.authorize=()=>false;ctx.copy(record);assert.equal(copied,undefined);
});
