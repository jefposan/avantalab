import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { aggregateSalesReport, type ReportFilters, type ReportLine, type SalesReport } from '../sales-report';
import { MarketplaceError } from './management-access';

const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const cents=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;
/** Narrow, bounded server-side reads; no products, EAN enrichment, remote API or inventory writes. */
export async function loadReportOptions(db:SupabaseClient,companyId:string,filters:ReportFilters){
  const [accounts,warehouses]=await Promise.all([
    db.from('marketplace_connections').select('id,provider,seller_name,seller_reference').eq('empresa_id',companyId).in('provider',['mercado_livre','magalu']).order('id'),
    db.from('marketplace_warehouses').select('id,name').eq('empresa_id',companyId).order('name'),
  ]);
  if(accounts.error||warehouses.error)throw new MarketplaceError(503,'report_unavailable','Não foi possível carregar os filtros do relatório.');
  const accountOptions=(accounts.data||[]).map(a=>({value:String(a.id),provider:String(a.provider),label:String(a.seller_name||a.seller_reference||'Conta')}));
  const warehouseOptions=[...(warehouses.data||[]).map(w=>({value:String(w.id),label:String(w.name)})),{value:'unassigned',label:'Origem não identificada'}];
  if(filters.accountId&&!accountOptions.some(a=>a.value===filters.accountId&&(!filters.provider||a.provider===filters.provider)) || filters.warehouseId&&!warehouseOptions.some(w=>w.value===filters.warehouseId))throw new MarketplaceError(400,'invalid_filter','Selecione uma conta e um estoque válidos.');
  return {accounts:accountOptions,warehouses:warehouseOptions};
}
export async function loadSalesReport(db:SupabaseClient,companyId:string,year:number,filters:ReportFilters):Promise<SalesReport> {
  const {accounts:accountOptions,warehouses:warehouseOptions}=await loadReportOptions(db,companyId,filters);
  const lines:ReportLine[]=[];
  // A wider UTC window accounts for São Paulo dates and provider offsets. Final grouping uses business time.
  const from=`${year-1}-12-31`,until=`${year+1}-01-02`;
  const deadline=Date.now()+18_000;
  async function read(kind:'online'|'direct') {
    for(let offset=0;offset<20_000;offset+=500){
      if(Date.now()>deadline)throw new MarketplaceError(503,'report_timeout','O relatório demorou para responder. Tente novamente.');
      const query=kind==='online'
        ? db.from('marketplace_sales').select('id,provider,connection_id,status,sold_at:snapshot->>soldAt,total:snapshot->total,items:snapshot->items,currency:snapshot->>currency').eq('empresa_id',companyId).in('status',['paid','confirmed']).gte('snapshot->>soldAt',from).lt('snapshot->>soldAt',until).order('id')
        : db.from('marketplace_direct_sales').select('id,warehouse_id,sold_on,total_cents,quantity,status').eq('empresa_id',companyId).eq('status','confirmed').gte('sold_on',`${year}-01-01`).lt('sold_on',`${year+1}-01-01`).order('id');
      if(kind==='online'){
        if(filters.provider)query.eq('provider',filters.provider);
        if(filters.accountId)query.eq('connection_id',filters.accountId);
      }else if(filters.warehouseId)query.eq('warehouse_id',filters.warehouseId);
      const {data,error}=await query.range(offset,offset+499).abortSignal(AbortSignal.timeout(Math.max(1,deadline-Date.now())));
      if(error)throw new MarketplaceError(503,'report_unavailable','Não foi possível consultar todas as vendas. Nenhum total parcial foi exibido.');
      for(const raw of data||[]){
        const row=record(raw);
        if(kind==='direct')lines.push({date:String(row.sold_on),provider:'direct',accountId:'',warehouseId:String(row.warehouse_id),gross:Number.isSafeInteger(Number(row.total_cents))?Number(row.total_cents):null,units:Number(row.quantity)||0,status:String(row.status),currency:'BRL'});
        else lines.push({date:String(row.sold_at||''),provider:String(row.provider),accountId:String(row.connection_id),warehouseId:'unassigned',gross:cents(row.total),units:(Array.isArray(row.items)?row.items:[]).reduce((sum,item)=>sum+(Number(record(item).quantity)||0),0),status:String(row.status),currency:String(row.currency||'')});
      }
      if(!data||data.length<500)return;
    }
    throw new MarketplaceError(503,'report_limit','O período excedeu o limite seguro de leitura. Nenhum total parcial foi exibido.');
  }
  // Online warehouse history was not persisted. Never infer it from today's Online warehouse.
  if(filters.provider!=='direct'&&(!filters.warehouseId||filters.warehouseId==='unassigned'))await read('online');
  if((!filters.provider||filters.provider==='direct')&&!filters.accountId&&filters.warehouseId!=='unassigned')await read('direct');
  return {year,months:aggregateSalesReport(lines,year,filters),accounts:accountOptions,warehouses:warehouseOptions,generatedAt:new Date().toISOString()};
}
