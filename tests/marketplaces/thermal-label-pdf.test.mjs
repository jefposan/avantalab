import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFRawStream,decodePDFRawStream,PDFArray,rectangle,stroke} from 'pdf-lib';
import {thermalLabelPdf} from '../../app/modules/marketplaces/thermal-label-pdf.ts';
async function fixture({frames=2,portrait=false}={}) {
 const doc=await PDFDocument.create();const page=doc.addPage(portrait?[595.276,841.89]:[841.89,595.276]);
 for(let i=0;i<frames;i++){page.pushOperators(rectangle(31+i*265,145,256,422),stroke());page.drawText(i?'DACE RESUMIDA TESTE':'ENVIO QR TESTE',{x:40+i*265,y:540,size:10});}
 doc.addPage().drawText('CONTROLE NAO IMPRIMIR');return doc.save();
}
test('PDF térmico separa os dois documentos vetoriais em 100 × 150, sem página de controle',async()=>{
 const source=await fixture();const original=Buffer.from(source);const result=await PDFDocument.load(await thermalLabelPdf(source));
 assert.equal(result.getPageCount(),2);for(const p of result.getPages()){assert.ok(Math.abs(p.getWidth()-100/25.4*72)<0.001);assert.ok(Math.abs(p.getHeight()-150/25.4*72)<0.001);const resources=p.node.Resources();assert.ok(resources.lookupMaybe);}
 const forms=result.context.enumerateIndirectObjects().filter(([,v])=>v instanceof PDFRawStream && v.dict.toString().includes('/Subtype /Form')).map(([,v])=>Buffer.from(decodePDFRawStream(v).decode()).toString('latin1')).join('\n');
 assert.ok(forms.includes('re'));assert.ok(!forms.includes('CONTROLE NAO IMPRIMIR'));assert.deepEqual(Buffer.from(source),original);
});
test('PDF desconhecido, incompleto, corrompido ou acima do limite é recusado sem corte arbitrário',async()=>{
 for(const bytes of [await fixture({frames:1}),await fixture({portrait:true}),new Uint8Array([1,2]),new Uint8Array(15*1024*1024+1)])await assert.rejects(()=>thermalLabelPdf(bytes));
});
