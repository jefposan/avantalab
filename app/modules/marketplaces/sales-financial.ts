/** Monetary values in cents. Provider fees and seller freight, never listing estimates. */
export type FinancialValue={fees:number|null;freight:number|null;adjustments:number;net:number|null;issue?:string};
export type FinancialMonth={month:number;fees:number;freight:number;adjustments:number;net:number;feeOrders:number;freightOrders:number;netOrders:number};
export const emptyFinancialMonths=():FinancialMonth[]=>Array.from({length:12},(_,i)=>({month:i+1,fees:0,freight:0,adjustments:0,net:0,feeOrders:0,freightOrders:0,netOrders:0}));
export function sumFinancial(months:FinancialMonth[]):FinancialMonth{return months.reduce((a,b)=>({month:0,fees:a.fees+b.fees,freight:a.freight+b.freight,adjustments:a.adjustments+b.adjustments,net:a.net+b.net,feeOrders:a.feeOrders+b.feeOrders,freightOrders:a.freightOrders+b.freightOrders,netOrders:a.netOrders+b.netOrders}),{month:0,fees:0,freight:0,adjustments:0,net:0,feeOrders:0,freightOrders:0,netOrders:0});}
export function mergeFinancial(a:FinancialMonth[],b:FinancialMonth[]):FinancialMonth[]{return a.map((month,i)=>({...sumFinancial([month,b[i]]),month:i+1}));}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function toCents(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;}
export function mlFees(order:Record<string,unknown>):number|null{
  if(order.currency_id!=='BRL'||!Array.isArray(order.order_items)||!order.order_items.length)return null;
  let total=0;
  for(const item of order.order_items){const row=object(item),fee=toCents(row.sale_fee);if(fee===null||!Number.isSafeInteger(row.quantity)||Number(row.quantity)<1)return null;total+=fee*Number(row.quantity);}
  return Number.isSafeInteger(total)?total:null;
}
export function mlSellerFreight(costs:unknown,seller:string):number|null{
  const rows=object(costs).senders;if(!Array.isArray(rows))return null;
  const own=rows.map(object).filter(row=>String(row.user_id)===seller);
  // Missing sender is unknown, not zero. An explicit cost=0 is a valid free shipment.
  if(own.length!==1)return null;
  return toCents(own[0].cost);
}
/** Deterministic largest-remainder allocation. Totals always match the single shipment cost. */
export function allocateFreight(cost:number,orders:{id:string;gross:number}[]):Map<string,number>{
  const total=orders.reduce((n,o)=>n+o.gross,0);
  if(!Number.isSafeInteger(cost)||cost<0||total<=0||!orders.length||new Set(orders.map(o=>o.id)).size!==orders.length||orders.some(o=>!Number.isSafeInteger(o.gross)||o.gross<0))throw Error('invalid_allocation');
  const values=orders.map(o=>({id:o.id,value:Math.floor(cost*o.gross/total),remainder:cost*o.gross%total}));
  let remaining=cost-values.reduce((n,o)=>n+o.value,0);
  values.sort((a,b)=>b.remainder-a.remainder||a.id.localeCompare(b.id));
  for(const entry of values){if(remaining<=0)break;entry.value++;remaining--;}
  return new Map(values.map(o=>[o.id,o.value]));
}
export function magaluFinancial(reports:unknown[],seller:string,orderId:string,gross:number):FinancialValue{
  let fees=0,freight=0,net=0,count=0;
  const seen=new Set<string>();
  if(!Number.isSafeInteger(gross)||gross<0)throw Error('financial_amount');
  if(!reports.length)throw Error('financial_pending');
  for(const raw of reports){const report=object(raw);if(String(report.external_id)!==orderId||![seller,seller.replace(/^GENPUB\./,'')].includes(String(object(report.seller).id))||!Array.isArray(report.transactions))throw Error('financial_identity');
    for(const rawTransaction of report.transactions){const t=object(rawTransaction);
      if(t.type==='INFORMATIVE')continue;
      if(!['CREDIT','DEBIT'].includes(String(t.type))||t.currency!=='BRL'||!Number.isSafeInteger(t.value)||Number(t.value)<0||!Number.isSafeInteger(t.normalizer)||Number(t.normalizer)<=0)throw Error('financial_amount');
      if(!['ready','payment_requested','concluded'].includes(String(t.status)))throw Error('financial_status');
      // Documented promotional price already reduced the item's sale price.
      if(t.type==='DEBIT'&&t.category==='PROMOTION'&&t.subcategory==='ABSOLUTE_DISCOUNT')continue;
      const identity=typeof t.identifier==='string'?`${String(report.id)}:${t.batch_id}:${t.identifier}:${t.type}:${t.category}:${object(t.entity).id}`:'';
      if(identity){if(seen.has(identity))throw Error('financial_duplicate');seen.add(identity);}
      const amount=Math.round(Number(t.value)*100/Number(t.normalizer)),signed=t.type==='CREDIT'?amount:-amount;
      if(!Number.isSafeInteger(amount))throw Error('financial_amount');
      net+=signed;count++;
      if(['COMMISSION','FEES','FEE'].includes(String(t.category)))fees-=signed;
      else if(['SHIPPING_COST','SHIPPING_SHARE','SHIPPING_SUBSIDY'].includes(String(t.category))||t.category==='MARKETPLACE'&&t.subcategory==='SHIPPING_SUBSIDY')freight-=signed;
    }
  }
  if(!count)throw Error('financial_pending');
  return {fees,freight,net,adjustments:net-gross+fees+freight};
}

export type FinancialEntry={id:string;revision:string;value:FinancialValue};
