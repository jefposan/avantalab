import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { loadSalesReport } from '@/app/modules/marketplaces/services/sales-report';
import { loadMonthlySales } from '@/app/modules/marketplaces/services/sales-report-list';
import { loadFinancialBatch } from '@/app/modules/marketplaces/services/sales-financial';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams;
    const {db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'));
    const year=Number(params.get('year')),provider=params.get('provider')||'',accountId=params.get('accountId')||'',warehouseId=params.get('warehouseId')||'';
    if(!Number.isInteger(year)||year<2000||year>new Date().getFullYear()+1||!['','mercado_livre','magalu','direct'].includes(provider)||accountId&&!uuidIsValid(accountId)||warehouseId&&warehouseId!=='unassigned'&&!uuidIsValid(warehouseId))throw new MarketplaceError(400,'invalid_filter','Confira os filtros do relatório.');
    if(params.get('list')==='1'){
      const month=Number(params.get('month')),page=Number(params.get('page')||'1');
      if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(page)||page<1||page>800)throw new MarketplaceError(400,'invalid_filter','Confira o mês e a página da lista.');
      return NextResponse.json(await loadMonthlySales(db,empresaId,year,month,{provider,accountId,warehouseId},page),{headers:{'Cache-Control':'private, no-store'}});
    }
    return NextResponse.json(await loadSalesReport(db,empresaId,year,{provider,accountId,warehouseId}),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return managementFailure(error);}
}

/** Read-only provider consultation in small batches, separate from the report's first paint. */
export async function POST(request:Request){
  try{
    const body=await request.json();
    const {db,empresaId}=await authorizeMarketplace(request,body.empresaId);
    const year=Number(body.year),provider=body.provider||'',accountId=body.accountId||'',warehouseId=body.warehouseId||'',cursor=body.cursor||'';
    if(!Number.isInteger(year)||year<2000||year>new Date().getFullYear()+1||!['','mercado_livre','magalu','direct'].includes(provider)||typeof accountId!=='string'||accountId&&!uuidIsValid(accountId)||typeof warehouseId!=='string'||warehouseId&&warehouseId!=='unassigned'&&!uuidIsValid(warehouseId)||typeof cursor!=='string'||cursor&&!uuidIsValid(cursor))throw new MarketplaceError(400,'invalid_filter','Confira os filtros da consulta financeira.');
    return NextResponse.json(await loadFinancialBatch(db,empresaId,year,{provider,accountId,warehouseId},cursor),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return managementFailure(error);}
}
