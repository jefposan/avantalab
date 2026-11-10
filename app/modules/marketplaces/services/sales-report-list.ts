import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadReportOptions} from './sales-report';
import {readStoredFinancial,sameFinancialRevision} from './sales-financial';
import {aggregateSalesReport,reportPeriod,type ReportFilters,type ReportLine} from '../sales-report';
import type {MonthlySaleRow,MonthlySalesPage} from '../sales-report-list';
import {MarketplaceError} from './management-access';
import {toCents} from '../sales-financial';
import {objectValue} from './listing-model';

/** Saved monthly orders only. Does not synchronize, enrich EANs, expose buyers or mutate data. */
export async function loadMonthlySales(db:SupabaseClient,companyId:string,year:number,month:number,filters:ReportFilters,page:number):Promise<MonthlySalesPage>{
  const options=await loadReportOptions(db,companyId,filters),rows:MonthlySaleRow[]=[],lines:ReportLine[]=[];
  const start=new Date(Date.UTC(year,month-1,1)),end=new Date(Date.UTC(year,month,1));
  const from=new Date(start.getTime()-86400000).toISOString().slice(0,10),until=new Date(end.getTime()+86400000).toISOString().slice(0,10),deadline=Date.now()+18_000;
  async function read(kind:'online'|'direct'){
    for(let offset=0;offset<20_000;offset+=500){
      if(Date.now()>deadline)throw new MarketplaceError(503,'report_timeout','A lista demorou para responder. Tente novamente.');
      const query=kind==='online'
        ?db.from('marketplace_sales').select('id,provider,connection_id,provider_order_id,status,updated_at,snapshot').eq('empresa_id',companyId).in('provider',filters.provider?[filters.provider]:['mercado_livre','magalu']).gte('snapshot->>soldAt',from).lt('snapshot->>soldAt',until).order('id')
        :db.from('marketplace_direct_sales').select('id,warehouse_id,warehouse_name,product_name,quantity,unit_price_cents,total_cents,sold_on,status,updated_at').eq('empresa_id',companyId).gte('sold_on',start.toISOString().slice(0,10)).lt('sold_on',end.toISOString().slice(0,10)).order('id');
      if(kind==='online'&&filters.accountId)query.eq('connection_id',filters.accountId);
      if(kind==='direct'&&filters.warehouseId)query.eq('warehouse_id',filters.warehouseId);
      const {data,error}=await query.range(offset,offset+499).abortSignal(AbortSignal.timeout(Math.max(1,deadline-Date.now())));
      if(error)throw new MarketplaceError(503,'report_list_unavailable','Não foi possível consultar todas as vendas do mês. Tente novamente.');
      for(const raw of data||[]){
        const row=objectValue(raw),snapshot=kind==='online'?objectValue(row.snapshot):{};
        const date=String(kind==='online'?snapshot.soldAt||'':row.sold_on),period=reportPeriod(date);
        if(!period||period.year!==year||period.month!==month||kind==='online'&&snapshot.currency!=='BRL')continue;
        const provider=kind==='online'?String(row.provider):'direct',accountId=kind==='online'?String(row.connection_id):'',warehouseId=kind==='online'?'unassigned':String(row.warehouse_id);
        if(filters.provider&&provider!==filters.provider||filters.accountId&&accountId!==filters.accountId||filters.warehouseId&&warehouseId!==filters.warehouseId)continue;
        const items=kind==='online'?(Array.isArray(snapshot.items)?snapshot.items:[]).slice(0,100).map(objectValue).map(item=>({title:String(item.title||'Produto').slice(0,500),quantity:Number(item.quantity)||0,unitPrice:toCents(item.unitPrice)})):[{title:String(row.product_name||'Produto').slice(0,500),quantity:Number(row.quantity)||0,unitPrice:Number.isSafeInteger(Number(row.unit_price_cents))?Number(row.unit_price_cents):null}];
        const gross=kind==='online'?toCents(snapshot.total):Number.isSafeInteger(Number(row.total_cents))?Number(row.total_cents):null;
        const line={date,provider,accountId,warehouseId,gross,units:items.reduce((n,item)=>n+item.quantity,0),status:String(row.status),currency:'BRL'};
        lines.push(line);
        const included=line.status==='paid'||line.status==='confirmed'&&['magalu','direct'].includes(provider);
        rows.push({id:String(row.id),revision:String(row.updated_at),orderId:kind==='online'?String(row.provider_order_id):String(row.id),date,provider,account:kind==='online'?options.accounts.find(a=>a.value===accountId)?.label||'Conta indisponível':'Venda direta',warehouse:kind==='online'?'Origem não identificada':String(row.warehouse_name||options.warehouses.find(w=>w.value===warehouseId)?.label||'Estoque'),status:line.status,included,gross,units:line.units,items,financial:null});
      }
      if(!data||data.length<500)return;
    }
    throw new MarketplaceError(503,'report_limit','O mês excedeu o limite seguro de leitura. Selecione uma conta ou estoque.');
  }
  if(filters.provider!=='direct'&&(!filters.warehouseId||filters.warehouseId==='unassigned'))await read('online');
  if((!filters.provider||filters.provider==='direct')&&!filters.accountId&&filters.warehouseId!=='unassigned')await read('direct');
  rows.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||a.id.localeCompare(b.id));
  const pageSize=25,total=rows.length,summary=aggregateSalesReport(lines,year,filters)[month-1];
  const actualPage=Math.min(page,Math.max(1,Math.ceil(total/pageSize)));
  const visible = rows.slice((actualPage - 1) * pageSize, actualPage * pageSize);
  const costs = await readStoredFinancial(db, companyId, visible.filter(row => row.provider !== 'direct' && row.included).map(row => row.id));
  for (const row of visible) row.financial = sameFinancialRevision(costs.get(row.id), row.revision)?.value ?? null;
  return { rows: visible, total, page: actualPage, pageSize, confirmedGross: summary.gross, confirmedOrders: summary.orders, missingGross: summary.missingGross };
}
