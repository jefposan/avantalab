import assert from 'node:assert/strict';
import test from 'node:test';
import { serviceFixture, ids, issue, state, syncOrder, listSales, parseSaleNotification, loadFiscalSale, reconcileFiscal, issueNfeForSale, importNfeForSale, fiscalDocumentForSale, FiscalProviderError } from './fiscal-service-harness.mjs';
test('DC-e real do serviço: reserva durável, exclusão mútua, sincronização e reload não perdem recibo',async()=>{
 const db=await serviceFixture();try{
  const results=await Promise.allSettled([issue(db),issue(db)]);
  assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(db.calls.filter(c=>c.method==='POST').length,1);
  assert.equal((await state(db)).dce.receiptId,'fiscal-receipt');
  // A sincronização substitui o snapshot logístico; o histórico fiscal continua independente.
  await syncOrder(db,db.connection,db.order.id);
  assert.equal((await state(db)).dce.receiptId,'fiscal-receipt');
  const row=(await db.sql.query('select snapshot from marketplace_sales')).rows[0];assert.equal(row.snapshot.dceEmission,undefined);
  const loaded=await listSales(db,ids.company,[ids.connection]);assert.equal(loaded[0].dceRequested,true);assert.equal(loaded[0].fiscal.dce.receiptId,'fiscal-receipt');
  await issue(db);assert.equal(db.calls.filter(c=>c.method==='POST').length,1);
 }finally{await db.sql.close();}
});
test('timeout e 5xx ficam incertos; 400/401/403/404/422/429 são recusas preservadas com recuperação',async()=>{
 for(const status of [0,400,401,403,404,409,422,429,500]){
  const db=await serviceFixture();try{
   db.postError=status?new FiscalProviderError(status,'invalid_parameter','request-1'):new Error('timeout');
   await assert.rejects(issue(db));const fiscal=(await state(db)).dce;
   const rejected=[400,401,403,404,422,429].includes(status);
   assert.equal(fiscal.retryAllowed===true,rejected,`HTTP ${status}`);
   if(!rejected){await assert.rejects(issue(db));assert.equal(db.calls.filter(c=>c.method==='POST').length,1);}
   else {db.postError=null;await issue(db);assert.equal(db.calls.filter(c=>c.method==='POST').length,2);}
  }finally{await db.sql.close();}
 }
});
test('sincronização iniciada antes da emissão não apaga confirmação gravada enquanto aguardava',async()=>{
 const db=await serviceFixture();try{
  let release,arrived;const gate=new Promise(r=>release=r), waiting=new Promise(r=>arrived=r);
  db.beforeSaleUpdate=async()=>{arrived();await gate;};
  const syncing=syncOrder(db,db.connection,db.order.id);await waiting;
  await issue(db);assert.equal((await state(db)).dce.receiptId,'fiscal-receipt');
  release();await syncing;assert.equal((await state(db)).dce.receiptId,'fiscal-receipt');
 }finally{await db.sql.close();}
});
test('consulta 404 não apaga legado; 403 não permite primeira emissão; pedido programado/alheio/Full não emite',async()=>{
 const legacy=await serviceFixture(true);try{assert.equal((await state(legacy)).dce.receiptId,'receipt-original');await issue(legacy);assert.equal(legacy.calls.filter(c=>c.method==='POST').length,0);}finally{await legacy.sql.close();}
 for(const mutate of [db=>db.shipment.substatus='buffered',db=>db.order.seller.id=999,db=>db.shipment.logistic_type='fulfillment',db=>db.dceHttp=403]){
  const db=await serviceFixture();try{mutate(db);await assert.rejects(issue(db));assert.equal(db.calls.filter(c=>c.method==='POST').length,0);}finally{await db.sql.close();}
 }
});
test('NF-e consultada é vinculada ao pedido; download usa caminho fixo e recusa identificador alheio',async()=>{
 const db=await serviceFixture();try{
  db.nfe={id:456,issuer:{user_id:'123'},status:'authorized',attributes:{danfe_location:'https://evil.invalid',xml_location:'https://evil.invalid'}};
  const {sale}=await loadFiscalSale(db,ids.company,ids.connection,ids.sale);const result=await reconcileFiscal(db,db.connection,sale,'555');assert.equal(result.nfe.status,'completed');
  let download='';db.download=async path=>{download=path;return new Uint8Array([37,80,68,70,45]);};
  await fiscalDocumentForSale(db,ids.company,ids.connection,ids.sale,'nfe','456','pdf');assert.equal(download,'/users/123/invoices/sites/MLB/documents/danfe/456');
  await assert.rejects(fiscalDocumentForSale(db,ids.company,ids.connection,ids.sale,'nfe','999','pdf'));assert.equal(download.includes('evil'),false);
  await assert.rejects(issueNfeForSale(db,ids.company,ids.connection,ids.sale,true));assert.equal(db.calls.filter(c=>c.method==='POST').length,0);
 }finally{await db.sql.close();}
});
test('Faturador exige confirmação; importação rejeita XML inválido antes de qualquer POST',async()=>{
 const db=await serviceFixture();try{
  await assert.rejects(issueNfeForSale(db,ids.company,ids.connection,ids.sale,false));
  await assert.rejects(importNfeForSale(db,ids.company,ids.connection,ids.sale,'<nfe/>'));
  assert.equal(db.calls.filter(c=>c.method==='POST').length,0);
  await issueNfeForSale(db,ids.company,ids.connection,ids.sale,true);assert.deepEqual(db.calls.find(c=>c.method==='POST').body,{orders:[2000019139347426]});
 }finally{await db.sql.close();}
});
test('erro de negócio documentado no corpo sem protocolo é recusa recuperável, mesmo com HTTP 200',async()=>{
 const db=await serviceFixture();try{
  db.postResponse={error_code:'14',message:'Dado privado do destinatário'};
  await assert.rejects(issueNfeForSale(db,ids.company,ids.connection,ids.sale,true),e=>e.providerCode==='14'&&!e.message.includes('Dado privado'));
  assert.equal((await state(db)).nfe.retryAllowed,true);
 }finally{await db.sql.close();}
});
test('notificação invoices valida aplicação, seller do recurso e formato sem aceitar URL arbitrária',()=>{
 const body={_id:'event',application_id:'app',user_id:123,topic:'invoices',resource:'/users/123/invoices/456'};
 assert.equal(parseSaleNotification(body,'app').topic,'invoices');
 for(const patch of [{resource:'/users/999/invoices/456'},{resource:'https://evil.invalid'},{resource:'/users/123/invoices/../tokens'},{application_id:'other'}])assert.equal(parseSaleNotification({...body,...patch},'app'),null);
});
const key='3'.repeat(44), issuer='1'.repeat(14);
const xml=`<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${key}"><ide><mod>55</mod><tpAmb>1</tpAmb></ide><emit><CNPJ>${issuer}</CNPJ></emit></infNFe><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/></NFe><protNFe><infProt><tpAmb>1</tpAmb><cStat>100</cStat><chNFe>${key}</chNFe></infProt></protNFe></nfeProc>`;
test('importação e substituição só concluem após consultar a chave esperada; impressão bloqueia alteração',async()=>{
 const db=await serviceFixture();try{
  await importNfeForSale(db,ids.company,ids.connection,ids.sale,xml);
  const {sale}=await loadFiscalSale(db,ids.company,ids.connection,ids.sale);
  db.imported={id:456,sender_id:123,shipment_id:555,status:'approved',fiscal_key:'4'.repeat(44)};
  await reconcileFiscal(db,db.connection,sale,'555');assert.equal((await state(db)).nfe.status,'pending');
  await assert.rejects(importNfeForSale(db,ids.company,ids.connection,ids.sale,xml));assert.equal(db.calls.filter(c=>c.method==='POST').length,1);
  db.imported.fiscal_key=key;await reconcileFiscal(db,db.connection,sale,'555');assert.equal((await state(db)).nfe.status,'completed');
  db.shipment.substatus='ready_to_print';
  const nextXml=xml.replaceAll(key,'5'.repeat(44));await importNfeForSale(db,ids.company,ids.connection,ids.sale,nextXml,'456');
  assert.equal(db.calls.filter(c=>c.method==='PUT').length,1);
  await reconcileFiscal(db,db.connection,sale,'555');assert.equal((await state(db)).nfe.status,'pending','a nota anterior não conclui a substituição');
  db.imported.fiscal_key='5'.repeat(44);await reconcileFiscal(db,db.connection,sale,'555');assert.equal((await state(db)).nfe.status,'completed');
  db.shipment.substatus='printed';await assert.rejects(importNfeForSale(db,ids.company,ids.connection,ids.sale,nextXml,'456'));assert.equal(db.calls.filter(c=>c.method==='PUT').length,1);
 }finally{await db.sql.close();}
});
test('carrinho do Faturador confere todas as orders e exclui outro vendedor',async()=>{
 const db=await serviceFixture();try{
  db.order.pack_id=777;const original=db.request.bind(db);
  db.request=async(p,m,b,o)=>{
   if(p==='/packs/777')return{id:777,orders:[{id:db.order.id},{id:'2000019139347427'},{id:'2000019139347428'}]};
   if(p==='/orders/2000019139347427')return{...db.order,id:'2000019139347427'};
   if(p==='/orders/2000019139347428')return{...db.order,id:'2000019139347428',seller:{id:999}};
   return original(p,m,b,o);
  };
  await issueNfeForSale(db,ids.company,ids.connection,ids.sale,true);
  assert.deepEqual(db.calls.find(c=>c.method==='POST').body,{orders:[2000019139347426,2000019139347427]});
 }finally{await db.sql.close();}
});
