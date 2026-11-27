import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFRawStream,PDFName,decodePDFRawStream} from 'pdf-lib';
import {buildOrderPdf} from '../../app/vendas/lib/order-document-pdf.ts';
const lines=Array.from({length:14},(_,i)=>({sku:`T${String(i+1).padStart(3,'0')}`,name:`Produto comercial ${i+1}`,unit:'UN',quantity:1,unitPrice:10,unitDiscount:0}));
const record={id:'2026/18',client:'Cliente demonstrativo',createdAt:'2026-11-26',status:'Faturado',total:140,order:{lines,commercialTotals:{products:140,orderDiscount:0,freight:0,insurance:0,other:0},paymentMethod:'pix',installments:1,firstDueDate:'2026-11-26'}};
const company={name:'Empresa demonstrativa',legalName:'Empresa demonstrativa Ltda.'};
function streams(pdf){return pdf.context.enumerateIndirectObjects().filter(([,obj])=>obj instanceof PDFRawStream&&String(obj.dict.get(PDFName.of('Subtype')))!=='/Image').map(([,obj])=>Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1'));}
function texts(stream){return [...stream.matchAll(/BT\b([\s\S]*?)\bET/g)].map(match=>{const content=match[1],matrix=content.match(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/);return{text:[...content.matchAll(/<([0-9a-f]+)>\s*Tj/gi)].map(m=>Buffer.from(m[1],'hex').toString('latin1')).join(''),x:Number(matrix?.[1]),y:Number(matrix?.[2])};});}
test('A4 compacto: 14 itens em uma página, totais íntegros e sem linha acima da assinatura',async()=>{
 const pdf=await PDFDocument.load(await buildOrderPdf(record,company));assert.equal(pdf.getPageCount(),1);
 const stream=streams(pdf).join('\n'),content=texts(stream);
 for(const item of lines)assert.ok(content.some(t=>t.text===item.sku),item.sku);
 assert.ok(content.some(t=>t.text==='140,00'||t.text==='R$ 140,00'));
 const receipt=content.find(t=>t.text.startsWith('Recebido por:'));assert.ok(receipt);assert.ok(content.some(t=>t.text.startsWith('Data:')));
 const drawnLines=[...stream.matchAll(/([\d.-]+) ([\d.-]+) m\s+([\d.-]+) ([\d.-]+) l/g)].map(m=>({x:Number(m[1]),y:Number(m[2]),x2:Number(m[3]),y2:Number(m[4])}));
 assert.ok(!drawnLines.some(l=>l.y===l.y2&&l.y>receipt.y&&l.y<receipt.y+28),'não há divisor horizontal junto à assinatura');
 const itemYs=lines.map(item=>content.find(t=>t.text===item.sku).y);assert.ok(itemYs.every((y,i)=>i===0||itemYs[i-1]-y<=24),'linhas compactas');
});
test('descrições longas e desconto continuam completos em A4/A5',async()=>{
 const long={...record,total:120,order:{...record.order,commercialTotals:{...record.order.commercialTotals,orderDiscount:20},lines:[{...lines[0],name:'Descrição completa '.repeat(250),unitDiscount:1},...lines.slice(1)]}};
 for(const paperSize of ['A4','A5']){const pdf=await PDFDocument.load(await buildOrderPdf(long,company,{}, {paperSize}));const content=streams(pdf).flatMap(texts);assert.ok(content.some(t=>t.text==='T014'));assert.ok(content.some(t=>t.text==='R$ 120,00'));assert.equal(content.filter(t=>t.text.startsWith('Recebido por:')).length,1);assert.ok(content.every(t=>Number.isFinite(t.y)&&t.y>=0&&t.y<=pdf.getPage(0).getHeight()));}
});
