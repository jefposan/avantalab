import {shippingLabelFilename} from '../../app/modules/marketplaces/label-download.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('Vendas.tsx',readFileSync('app/marketplaces/Vendas.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='printLabel')fn=node;ts.forEachChild(node,visit);}visit(source);
for(const format of ['zpl2','pdf'])test(`download ${format} usa conta/pedido exatos e entrega o arquivo correto`,async()=>{
 const calls=[],downloads=[],errors=[],states=[],labelRequest={current:null};let preview;
 const exported={};vm.runInNewContext(ts.transpileModule(fn.getText(source)+';exports.printLabel=printLabel;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:exported,shippingLabelFilename,AbortController,companyId:'company',canManage:true,canPrintSaleLabel:()=>true,printing:'',labelFormat:format,labelRequest,
  setPrinting:value=>states.push(value),setPrintError:value=>errors.push(value),setLabelPreview:value=>{preview=value;},
  require:()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}}}),
  fetch:async(path,options)=>{calls.push({path,body:JSON.parse(options.body),headers:options.headers});return new Response(new Uint8Array([80,75,3,4]),{headers:{'Content-Type':format==='zpl2'?'text/plain':'application/pdf'}});},
  URL:{createObjectURL:file=>{assert.equal(file.type,format==='zpl2'?'text/plain':'application/pdf');return'blob:test';}},
  document:{body:{append(){}},createElement:()=>({click(){downloads.push({href:this.href,filename:this.download});},remove(){}})},
 });
 const sale={id:'sale',connectionId:'account',orderId:'123',items:[{title:'Aquecedor Cadência'}]};
 const pending=exported.printLabel(sale);await exported.printLabel(sale);await pending;
 assert.equal(calls.length,1,'envio duplicado é bloqueado enquanto prepara o arquivo');
 assert.deepEqual(calls[0].body,{empresaId:'company',connectionId:'account',saleId:'sale',format,orderId:'123',productName:'Aquecedor Cadência'});
 assert.equal(preview.saleId,'sale');assert.equal(preview.companyId,'company');assert.equal(preview.format,format);
 assert.equal(downloads.length,format==='zpl2'?1:0);
 if(format==='zpl2')assert.equal(downloads[0].filename,'etiqueta-pedido-123-aquecedor-cadencia.txt');
 assert.deepEqual(states,['sale','']);assert.deepEqual(errors,['']);assert.equal(labelRequest.current,null);
});

test('Baixar PDF transfere o mesmo arquivo e não dispara impressão nativa',async()=>{
 const downloads=[];let preview;const exported={};
 vm.runInNewContext(ts.transpileModule(fn.getText(source)+';exports.printLabel=printLabel;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:exported,shippingLabelFilename,AbortController,companyId:'company',canManage:true,canPrintSaleLabel:()=>true,printing:'',labelFormat:'pdf',labelRequest:{current:null},setPrinting(){},setPrintError(){},setLabelPreview:value=>preview=value,
  require:()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'token'}}})}}}),fetch:async()=>new Response('%PDF-fixture',{headers:{'Content-Type':'application/pdf'}}),URL:{createObjectURL:()=> 'blob:pdf-original'},document:{body:{append(){}},createElement:()=>({click(){downloads.push({href:this.href,name:this.download});},remove(){}})},
 });
 await exported.printLabel({id:'sale',connectionId:'account',orderId:'123',items:[{title:'Produto teste'}]},'pdf',true);
 assert.equal(preview.downloadOnly,true);assert.deepEqual(downloads,[{href:'blob:pdf-original',name:'etiqueta-pedido-123-produto-teste.pdf'}]);
});
