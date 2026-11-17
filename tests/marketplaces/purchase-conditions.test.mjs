import test from 'node:test';
import assert from 'node:assert/strict';
import {readMlPurchaseConditions} from '../../app/modules/marketplaces/purchase-conditions.ts';
const base={id:100,seller:{id:10},shipping:{id:200},status:'paid',currency_id:'BRL',total_amount:100,order_items:[{quantity:2,sale_fee:5}],payments:[{id:1,status:'approved',payment_type:'credit_card',installments:3,transaction_amount:100,shipping_cost:0,card:{number:'secret'},payer:{email:'secret'},authorization_code:'secret'}]};
const single=async path=>path.endsWith('/costs')?{senders:[{user_id:10,cost:12}],receiver:{cost:8}}:[{order_id:100}];
test('condições mostram valores explícitos e parcelas sem divulgar dados de cartão ou pagador',async()=>{
 const value=await readMlPurchaseConditions(base,'10',single);assert.equal(value.payments[0].method,'Cartão de crédito');assert.equal(value.payments[0].installments,3);assert.equal(value.buyerFreight,0);assert.equal(value.sellerFreight,1200);assert.equal(value.fees,1000);assert.equal(value.net,7800);assert.ok(!JSON.stringify(value).includes('secret'));
 const pix=await readMlPurchaseConditions({...base,payments:[{...base.payments[0],payment_method_id:'pix',payment_type:'bank_transfer'}]},'10',single);assert.equal(pix.payments[0].method,'PIX');
});
test('ausência, moeda divergente e frete não confirmado não viram zero nem pagamento presumido',async()=>{
 const result=await readMlPurchaseConditions({...base,payments:[{}],order_items:[]},'10',async()=>{throw Error('unavailable');});assert.equal(result.fees,null);assert.equal(result.sellerFreight,null);assert.equal(result.buyerFreight,null);assert.equal(result.net,null);assert.equal(result.payments[0].installments,null);assert.match(result.payments[0].method,/Não informado/);
 let calls=0;const foreign=await readMlPurchaseConditions({...base,currency_id:'USD'},'10',async()=>calls++);assert.equal(calls,0);assert.equal(foreign.net,null);assert.equal(foreign.payments[0].amount,null);
 const cancelled=await readMlPurchaseConditions({...base,status:'cancelled'},'10',single);assert.equal(cancelled.net,null);
});
test('rateio do vendedor conserva o total do envio; comprador compartilhado não herda o frete inteiro',async()=>{
 const read=async path=>path.endsWith('/costs')?{senders:[{user_id:10,cost:30}],receiver:{cost:15}}:path.endsWith('/items')?[{order_id:100},{order_id:101}]:{id:101,seller:{id:10},shipping:{id:200},status:'paid',currency_id:'BRL',total_amount:200};
 const result=await readMlPurchaseConditions({...base,payments:[]},'10',read);assert.equal(result.sellerFreight,1000);assert.equal(result.buyerFreight,null);assert.equal(result.net,8000);
 const otherSeller=await readMlPurchaseConditions({...base,payments:[]},'10',async path=>path.startsWith('/orders/')?{id:101,seller:{id:99},shipping:{id:200},status:'paid',currency_id:'BRL',total_amount:200}:read(path));assert.equal(otherSeller.sellerFreight,null);assert.equal(otherSeller.net,null);
});
