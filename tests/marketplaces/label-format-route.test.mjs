import {zipSync,strToU8} from 'fflate';
import {thermalLabelText} from '../../app/modules/marketplaces/thermal-label.ts';
import {shippingLabelFilename} from '../../app/modules/marketplaces/label-download.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('rota entrega somente TXT térmico ou PDF sem cache e recusa formatos arbitrários',async()=>{
 const calls=[],exported={};class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
 vm.runInNewContext(ts.transpileModule(readFileSync('app/api/modulos/marketplaces/vendas/etiqueta/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exported,require(name){
  if(name.endsWith('/thermal-label-pdf'))return{thermalLabelPdf:async bytes=>bytes};if(name.endsWith('/thermal-label'))return{thermalLabelText};if(name.endsWith('/label-download'))return{shippingLabelFilename};if(name==='next/server')return{NextResponse:Response};
  if(name.endsWith('management-access'))return{MarketplaceError,authorizeMarketplace:async(_request,empresaId,role)=>{assert.equal(role,'manage');return{db:{},empresaId};},managementFailure:error=>Response.json({code:error.code},{status:error.status||500})};
  if(name.endsWith('mercadolivre-sales'))return{labelForSale:async(_db,company,connection,sale,format)=>{calls.push({company,connection,sale,format});return format==='zpl2'?zipSync({'Etiqueta.txt':strToU8('^XA\n^FO10,10^FDTESTE^FS\n^XZ'),'controle.pdf':strToU8('%PDF-controle')}):strToU8('%PDF-teste');}};
  throw Error(name);
 }});
 for(const format of [undefined,'pdf','zpl2']){
  const response=await exported.POST(new Request('https://example.test/label',{method:'POST',body:JSON.stringify({empresaId:'company',connectionId:'account',saleId:'sale',format})}));
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),format==='zpl2'?'text/plain; charset=utf-8':'application/pdf');
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  if(format==='zpl2'){assert.match(response.headers.get('content-disposition'),/etiqueta-pedido-sale\.txt/);assert.equal(await response.text(),'^XA\n^FO10,10^FDTESTE^FS\n^XZ');}
  assert.equal(calls.at(-1).format,format||'pdf');assert.equal(calls.at(-1).company,'company');
 }
 const rejected=await exported.POST(new Request('https://example.test/label',{method:'POST',body:JSON.stringify({empresaId:'company',format:'exe'})}));
 assert.equal(rejected.status,400);assert.equal(calls.length,3);
});
