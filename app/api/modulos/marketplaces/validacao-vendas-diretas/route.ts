import {NextResponse} from 'next/server';
import {createDirectSalesFixture} from '@/app/modules/marketplaces/dev/direct-sales-fixture';
import {directCommandData,publicDirectSale,directSaleAsMarketplace} from '@/app/modules/marketplaces/services/direct-sales';
import {MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
export const runtime='nodejs';
export const maxDuration=60;
// Hot reload da interface não reinicializa o banco fictício nem troca seus IDs.
const local=globalThis as typeof globalThis&{__avantaDirectSalesFixture?:ReturnType<typeof createDirectSalesFixture>};
export async function POST(request:Request){
 if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(new URL(request.url).hostname))return new NextResponse(null,{status:404});
 try{
  const {path,body={},method='POST'}=await request.json();
  local.__avantaDirectSalesFixture??=createDirectSalesFixture();const f=await local.__avantaDirectSalesFixture;
  const headers={'Cache-Control':'no-store'};
  if(body.empresaId&&body.empresaId!==f.company)throw new Error('Prévia restrita ao perfil fictício.');
  const context=async()=>({actorId:f.actor,canSell:true,canWithdraw:true,product:{id:f.product,name:'Air Fryer · Produto de teste local',ean:'7897180598754',picture:null,referenceCents:20000},percentages:{minimum:50,medium:70,ideal:90},warehousesReady:true,warehouses:await f.balances()});
  if(path==='bootstrap')return NextResponse.json({companyId:f.company,productId:f.product,offlineId:f.offline,onlineId:f.online},{headers});
  if(path==='sales-feed'){
   const r=await f.db.query('select * from marketplace_direct_sales order by sold_on desc,id');
   return NextResponse.json({sales:r.rows.map(publicDirectSale).map(directSaleAsMarketplace)},{headers});
  }
  if(String(path).startsWith('/api/modulos/marketplaces/vendas-diretas')){
   if(method==='GET'){
    const r=await f.db.query('select * from marketplace_direct_sales order by sold_on desc,id');
    return NextResponse.json({sales:r.rows.map(publicDirectSale),canSell:true},{headers});
   }
   if(body.action==='context')return NextResponse.json(await context(),{headers});
   const c=directCommandData(body);
   return NextResponse.json({result:await f.command(c.action,c.data,c.requestKey)},{headers});
  }
  if(path==='/api/modulos/marketplaces/precos/estoque'){
   if(body.action!=='context'){
    if(!['set','add','transfer'].includes(body.action))throw new Error('Operação indisponível na prévia.');
    await f.db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5)',[f.company,f.actor,body.action,JSON.stringify({...body,productId:f.product,warehouseId:body.warehouseId||f.online}),body.requestKey]);
   }
   const p=(await f.db.query<{stock_quantity:number;revision:number}>('select stock_quantity,revision from marketplace_products where id=$1',[f.product])).rows[0];
   return NextResponse.json({stock:{productId:f.product,quantity:p.stock_quantity,revision:p.revision,confirmed:true,canManage:true,warehousesReady:true,warehouses:await f.balances()}},{headers});
  }
  throw new Error('Operação indisponível na prévia.');
 }catch(e){
  const error=e as Error&{code?:string};
  if(e instanceof MarketplaceError||error.code==='P0001')return NextResponse.json({rejected:true,message:error.message},{headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({message:error.message||'Falha no banco local de teste.'},{status:503});
 }
}
