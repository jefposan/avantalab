import {allocateFreight,mlFees,mlSellerFreight,toCents} from './sales-financial.ts';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const numericId=(v:unknown)=>/^\d{1,24}$/.test(String(v))?String(v):'';
export type PurchaseConditions={currency:string;payments:Array<{method:string;installments:number|null;amount:number|null;status:string}>;buyerFreight:number|null;sellerFreight:number|null;fees:number|null;net:number|null;issues:string[]};
const labels:Record<string,string>={credit_card:'Cartão de crédito',debit_card:'Cartão de débito',prepaid_card:'Cartão pré-pago',account_money:'Saldo do Mercado Pago',ticket:'Boleto',bank_transfer:'Transferência bancária',digital_currency:'Moeda digital',consumer_credits:'Crédito Mercado Pago'};
const states:Record<string,string>={approved:'Aprovado',pending:'Pendente',in_process:'Em processamento',in_mediation:'Em mediação',rejected:'Recusado',cancelled:'Cancelado',refunded:'Reembolsado',charged_back:'Contestado'};
/** Valores em centavos. Não retorna cartão, dados do pagador ou códigos de autorização. */
export async function readMlPurchaseConditions(order:Record<string,unknown>,seller:string,read:(path:string)=>Promise<unknown>,deadline=Date.now()+25_000):Promise<PurchaseConditions>{
 const payments=(Array.isArray(order.payments)?order.payments:[]).slice(0,100).map(object);
 const unique=[...new Map(payments.map((p,i)=>[numericId(p.id)||`row-${i}`,p])).values()];
 const result:PurchaseConditions={currency:typeof order.currency_id==='string'&&/^[A-Z]{3}$/.test(order.currency_id)?order.currency_id:'',payments:unique.map(p=>({method:p.payment_method_id==='pix'?'PIX':labels[String(p.payment_type??p.payment_type_id)]||'Não informado pelo Mercado Livre',installments:Number.isSafeInteger(p.installments)&&Number(p.installments)>0&&Number(p.installments)<=120?Number(p.installments):null,amount:order.currency_id==='BRL'?toCents(p.transaction_amount):null,status:states[String(p.status)]||'Não informado pelo Mercado Livre'})),buyerFreight:null,sellerFreight:null,fees:null,net:null,issues:[]};
 const id=numericId(order.id),shipping=numericId(object(order.shipping).id),gross=toCents(order.total_amount);
 if(!id||numericId(object(order.seller).id)!==seller||order.currency_id!=='BRL'){result.issues.push('Os valores deste pedido não foram confirmados em reais para esta conta.');return result;}
 result.fees=mlFees(order);
 const approved=unique.filter(p=>p.status==='approved');
 // Dado explícito de um pagamento deste pedido; não somar novamente em pagamentos divididos.
 if(approved.length===1)result.buyerFreight=toCents(approved[0].shipping_cost);
 try{
  if(!shipping||Date.now()>deadline-9000)throw Error('shipping_pending');
  const [costs,items]=await Promise.all([read(`/shipments/${shipping}/costs`),read(`/shipments/${shipping}/items`)]);
  if(!Array.isArray(items)||!items.length)throw Error('shipping_pending');
  const ids=[...new Set(items.map(object).map(item=>numericId(item.order_id)))];
  if(!ids.includes(id)||ids.some(v=>!v)||ids.length>8)throw Error('shared_shipping');
  if(ids.length===1&&result.buyerFreight===null)result.buyerFreight=toCents(object(object(costs).receiver).cost);
  const cost=mlSellerFreight(costs,seller);
  if(cost===null||gross===null)throw Error('shipping_pending');
  const orders=[{id,gross}];
  for(const otherId of ids.filter(v=>v!==id)){
   if(Date.now()>deadline-9000)throw Error('shared_shipping');
   const other=object(await read(`/orders/${otherId}`)),amount=toCents(other.total_amount);
   if(numericId(other.id)!==otherId||numericId(object(other.seller).id)!==seller||numericId(object(other.shipping).id)!==shipping||other.currency_id!=='BRL'||other.status!=='paid'||amount===null)throw Error('shared_shipping');
   orders.push({id:otherId,gross:amount});
  }
  result.sellerFreight=ids.length===1?cost:allocateFreight(cost,orders).get(id)??null;
 }catch{result.issues.push('Frete ainda não confirmado; envios compartilhados exigem rateio entre os pedidos.');}
 if(result.fees===null)result.issues.push('Taxas ainda não informadas pelo Mercado Livre.');
 if(order.status==='paid'&&gross!==null&&result.fees!==null&&result.sellerFreight!==null)result.net=gross-result.fees-result.sellerFreight;
 return result;
}
