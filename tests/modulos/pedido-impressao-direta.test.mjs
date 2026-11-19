import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {PDFDocument,PDFRawStream,PDFName,decodePDFRawStream} from 'pdf-lib';
import {buildOrderPdf} from '../../app/vendas/lib/order-tools.ts';
import {printOrderPdf,prepareOrderLogo} from '../../app/vendas/lib/order-print.ts';
const company={name:'Empresa fictícia',logo:{format:'png',bytes:new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'))}};
const record={id:'2026/001',client:'Cliente fictício',status:'Confirmado',createdAt:'2026-11-19T15:00:00Z',total:560.45,order:{lines:Array.from({length:75},(_,i)=>({sku:`T${i+1}`,name:`Produto ${i+1} com descrição extensa para preservar todas as linhas e valores sem sobreposição.`,unit:'un',quantity:2,unitPrice:100,unitDiscount:2,cost:888})),commercialTotals:{products:14700,orderDiscount:10,freight:15,insurance:5,other:8},paymentMethod:'Pix',installments:1,firstDueDate:'2026-11-26',seller:'Equipe',notes:'SEGREDO INTERNO'}};
function streams(pdf){return pdf.context.enumerateIndirectObjects().filter(([,obj])=>obj instanceof PDFRawStream&&String(obj.dict.get(PDFName.of('Subtype')))!=='/Image').map(([,obj])=>Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1'));}
test('A4/A5 têm dimensões próprias, logo e todas as linhas até o último item, sem custo/observação interna',async()=>{
 for(const size of ['A4','A5']){
  const pdf=await PDFDocument.load(await buildOrderPdf(record,company,{legalName:'Cliente fictício Ltda.'},{paperSize:size}));
  assert.ok(pdf.getPageCount()>1);assert.ok(Math.abs(pdf.getPage(0).getWidth()-(size==='A5'?419.53:595.28))<.1);
  assert.ok(pdf.context.enumerateIndirectObjects().some(([,obj])=>obj instanceof PDFRawStream&&String(obj.dict.get(PDFName.of('Subtype')))==='/Image'));
  const text=streams(pdf).map(stream=>[...stream.matchAll(/<([0-9a-f]+)>\s*Tj/gi)].map(m=>Buffer.from(m[1],'hex').toString('latin1')).join(' ')).join(' ');
  assert.match(text,/T75/);assert.match(text,/560,45/);assert.match(text,/TOTAL DO PEDIDO/);assert.doesNotMatch(text,/888|SEGREDO INTERNO/);
 }
});
function printFixture({throws=false}={}){
 const timers=new Map(),revoked=[],events={};let n=0,prints=0,removed=0,frame;
 const environment={document:{createElement:()=>frame={style:{},setAttribute(){},remove(){removed++;},contentWindow:{addEventListener:(name,fn)=>{events[name]=fn;},focus(){},print(){prints++;if(throws)throw Error('blocked');}}},body:{appendChild(){}}},createUrl:()=> 'blob:teste',revokeUrl:url=>revoked.push(url),timeout:(fn,ms)=>{timers.set(++n,{fn,ms});return n;},cancel:id=>timers.delete(id)};
 return{environment,events,timers,revoked,get frame(){return frame;},get prints(){return prints;},get removed(){return removed;}};
}
test('impressão espera PDF carregar, chama print uma vez e limpa depois, sem popup intermediário',async()=>{
 const f=printFixture();const pending=printOrderPdf(new Uint8Array([1]),f.environment);assert.equal(f.prints,0);assert.equal(f.frame.src,'blob:teste');
 f.frame.onload();f.frame.onload();assert.equal(f.prints,0);const readiness=[...f.timers.entries()].find(([,t])=>t.ms===1000);f.timers.delete(readiness[0]);readiness[1].fn();await pending;assert.equal(f.prints,1);assert.equal(f.removed,0);
 f.events.afterprint();[...f.timers.values()].find(t=>t.ms===1000).fn();assert.equal(f.removed,1);assert.deepEqual(f.revoked,['blob:teste']);
});
test('bloqueio/timeout limpa URL e iframe e não informa que foi impresso',async()=>{
 const f=printFixture({throws:true});const pending=printOrderPdf(new Uint8Array([1]),f.environment);f.frame.onload();[...f.timers.values()].find(t=>t.ms===1000).fn();await assert.rejects(pending,/navegador bloqueou/);assert.equal(f.removed,1);
 const timed=printFixture();const p=printOrderPdf(new Uint8Array([1]),timed.environment);[...timed.timers.values()].find(t=>t.ms===20000).fn();await assert.rejects(p,/demorou/);assert.deepEqual(timed.revoked,['blob:teste']);
});
test('ação do menu gera e imprime sem abrir OrderToolsDialog e bloqueia clique repetido',async()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='printDirect')fn=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(fn);
 let finish,prints=0;const context={printingRef:{current:false},printGeneration:{current:0},can:()=>true,onNotify(){},prepareOrderLogo:async()=>undefined,buildOrderPdf:()=>new Promise(resolve=>{finish=resolve;}),printOrderPdf:async()=>{prints++;},companyLogoUrl:'',company,clients:[],clienteDoRegistro:()=>undefined,paperSize:'A5'};
 vm.createContext(context);vm.runInContext(ts.transpileModule(`var run=${fn}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 const pending=context.run(record);await new Promise(setImmediate);await context.run(record);assert.equal(prints,0);finish(new Uint8Array([1]));await pending;assert.equal(prints,1);
 assert.match(source,/action==='print'\?void printDirect\(record\):setToolRequest/);
});
test('logo ausente não busca nada e esquemas executáveis não são aceitos',async()=>{
 assert.equal(await prepareOrderLogo(''),undefined);
 await assert.rejects(prepareOrderLogo('javascript:alert(1)'),/logo|endereço/);
});
