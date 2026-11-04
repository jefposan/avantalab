import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {loadConnection,mlRequest} from './mercadolivre-management';
import {loadMagaluConnection,magaluRequest} from './magalu-request';
import {magaluPage} from '../magalu-sales-model';
import {objectValue,uuidIsValid} from './listing-model';
import {reportPeriod,type ReportFilters} from '../sales-report';
import {allocateFreight,emptyFinancialMonths,magaluFinancial,mlFees,mlSellerFreight,toCents,type FinancialValue,type FinancialEntry} from '../sales-financial';

// Read-through optimization only: response carries the totals, so serverless instance changes cannot lose the result.
// Cache is bounded, company/account/order/revision-scoped; no provider tokens, raw orders or buyer details.
const cache=new Map<string,{expires:number;value:FinancialValue}>();
const financialKey=(companyId:string,row:Record<string,unknown>)=>{const snapshot=objectValue(row.snapshot);return JSON.stringify([companyId,row.connection_id,row.id,snapshot.providerUpdatedAt||row.updated_at,snapshot.total,row.status,snapshot.shipmentId]);};
export function cachedReportFinancial(companyId:string,row:Record<string,unknown>):FinancialValue|null{const saved=cache.get(financialKey(companyId,row));return saved&&saved.expires>Date.now()?saved.value:null;}
const ongoing=new Map<string,Promise<FinancialValue>>();
function remember(key:string,value:FinancialValue){if(cache.size>=2000)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+(value.net===null?60_000:60*60_000),value});return value;}
const pending=(issue:string):FinancialValue=>({fees:null,freight:null,adjustments:0,net:null,issue});
function safeIssue(error:unknown):string{
  if(!process.env.MARKETPLACE_SECRETS_KEY)return 'A chave de integração não está configurada neste ambiente.';
  if(error instanceof MarketplaceError&&['reconnect','vault_unavailable','provider_403','magalu_403','refresh_busy'].includes(error.code))return error.message;
  return 'O marketplace ainda não confirmou todos os custos de alguns pedidos.';
}
async function mlFinancial(db:SupabaseClient,companyId:string,row:Record<string,unknown>,deadline:number):Promise<FinancialValue>{
  const connection=await loadConnection(db,companyId,row.connection_id);
  if(!/^\d{1,24}$/.test(String(row.provider_order_id)))throw Error('invalid_order');
  const order=objectValue(await mlRequest(db,connection,`/orders/${row.provider_order_id}`)),snapshot=objectValue(row.snapshot);
  if(String(order.id)!==String(row.provider_order_id)||String(objectValue(order.seller).id)!==connection.seller_reference||order.status!=='paid'||order.currency_id!=='BRL'||toCents(order.total_amount)!==toCents(snapshot.total))throw Error('order_changed');
  const gross=toCents(order.total_amount);if(gross===null)throw Error('invalid_gross');
  const fees=mlFees(order),shippingId=String(objectValue(order.shipping).id||'');
  let freight:number|null=null,issue:string|undefined;
  try{
    if(!/^\d{1,24}$/.test(shippingId)||Date.now()>deadline-9000)throw Error('shipping_pending');
    const [costs,items]=await Promise.all([mlRequest(db,connection,`/shipments/${shippingId}/costs`),mlRequest(db,connection,`/shipments/${shippingId}/items`)]);
    const cost=mlSellerFreight(costs,connection.seller_reference);
    if(cost===null||!Array.isArray(items)||!items.length)throw Error('shipping_pending');
    const ids=[...new Set(items.map(objectValue).map(item=>String(item.order_id||'')))];
    if(!ids.includes(String(order.id))||ids.some(id=>!/^\d{1,24}$/.test(id))||ids.length>8)throw Error('shared_shipping');
    const orders=[{id:String(order.id),gross}];
    for(const id of ids.filter(id=>id!==String(order.id))){
      if(Date.now()>deadline-9000)throw Error('shared_shipping');
      const other=objectValue(await mlRequest(db,connection,`/orders/${id}`));
      if(String(other.id)!==id||String(objectValue(other.seller).id)!==connection.seller_reference||String(objectValue(other.shipping).id)!==shippingId||other.currency_id!=='BRL'||other.status!=='paid'||toCents(other.total_amount)===null)throw Error('shared_shipping');
      orders.push({id,gross:toCents(other.total_amount)!});
    }
    freight=allocateFreight(cost,orders).get(String(order.id))??null;
  }catch{issue='Frete ainda não confirmado; envios compartilhados exigem rateio entre os pedidos.';}
  const net=fees!==null&&freight!==null?gross-fees-freight:null;
  return {fees,freight,net,adjustments:0,...(net===null?{issue:issue||'Comissão ainda não informada no pedido.'}:{})};
}
async function readFinancial(db:SupabaseClient,companyId:string,row:Record<string,unknown>,deadline:number):Promise<FinancialValue>{
  if(row.provider==='mercado_livre')return mlFinancial(db,companyId,row,deadline);
  const connection=await loadMagaluConnection(db,companyId,row.connection_id),snapshot=objectValue(row.snapshot);
  const orderId=String(snapshot.providerOrderId||'');
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(orderId))throw Error('invalid_order');
  const reports:unknown[]=[];
  for(let offset=0;offset<500;offset+=100){
    if(Date.now()>deadline-9000)throw Error('financial_timeout');
    const page=magaluPage(await magaluRequest(db,connection,`/seller/v1/financial-analysis/orders?${new URLSearchParams({order_id:orderId,_limit:'100',_offset:String(offset)})}`),'/seller/v1/financial-analysis/orders',offset,100);
    reports.push(...page.rows);
    if(page.next===null)return magaluFinancial(reports,connection.seller_reference,orderId,toCents(snapshot.total)??NaN);
  }
  throw Error('financial_limit');
}
export async function loadFinancialBatch(db:SupabaseClient,companyId:string,year:number,filters:ReportFilters,cursor:string){
  if(cursor&&!uuidIsValid(cursor))throw new MarketplaceError(400,'invalid_cursor','Consulta financeira inválida.');
  const months=emptyFinancialMonths(),entries:FinancialEntry[]=[];
  if(filters.provider==='direct'||filters.warehouseId&&filters.warehouseId!=='unassigned')return{months,entries,cursor:null,issues:[]};
  const query=db.from('marketplace_sales').select('id,provider,connection_id,provider_order_id,status,updated_at,snapshot').eq('empresa_id',companyId).in('provider',filters.provider?[filters.provider]:['mercado_livre','magalu']).in('status',['paid','confirmed']).gte('snapshot->>soldAt',`${year-1}-12-31`).lt('snapshot->>soldAt',`${year+1}-01-02`).order('id').limit(4);
  if(filters.accountId)query.eq('connection_id',filters.accountId);
  if(cursor)query.gt('id',cursor);
  const {data,error}=await query.abortSignal(AbortSignal.timeout(8000));
  if(error)throw new MarketplaceError(503,'financial_unavailable','Não foi possível consultar os custos das vendas.');
  const rows=(data||[]).slice(0,3),deadline=Date.now()+23_000,issues=new Set<string>();
  await Promise.all(rows.map(async raw=>{
    const row=raw as Record<string,unknown>,snapshot=objectValue(row.snapshot),period=reportPeriod(String(snapshot.soldAt||''));
    if(!period||period.year!==year||snapshot.currency!=='BRL'||row.provider==='mercado_livre'&&row.status!=='paid')return;
    const key=financialKey(companyId,row);
    const saved=cache.get(key);
    let value=saved&&saved.expires>Date.now()?saved.value:undefined;
    if(!value){
      let promise=ongoing.get(key);
      if(!promise){promise=readFinancial(db,companyId,row,deadline).catch(error=>pending(safeIssue(error))).then(value=>remember(key,value));ongoing.set(key,promise);promise.finally(()=>ongoing.delete(key));}
      value=await promise;
    }
    entries.push({id:String(row.id),revision:String(row.updated_at),value});
    const month=months[period.month-1];
    if(value.fees!==null){month.fees+=value.fees;month.feeOrders++;}
    if(value.freight!==null){month.freight+=value.freight;month.freightOrders++;}
    if(value.net!==null){month.net+=value.net;month.adjustments+=value.adjustments;month.netOrders++;}
    if(value.issue)issues.add(value.issue);
  }));
  return{months,entries,cursor:data&&data.length>3?String(rows.at(-1)!.id):null,issues:[...issues].slice(0,3)};
}
