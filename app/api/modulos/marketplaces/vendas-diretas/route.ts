import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {authorizeMarketplace,MarketplaceError,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {directSalePermission,directSaleCommand,listDirectSales} from '@/app/modules/marketplaces/services/direct-sales';
import {priceStockProduct} from '@/app/modules/marketplaces/services/price-product-stock';
import {warehouseContext} from '@/app/modules/marketplaces/services/warehouses';
import {readPriceSettings} from '@/app/modules/marketplaces/services/price-settings';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 try{
  const p=new URL(request.url).searchParams;
  const a=await authorizePriceConsultation(request,p.get('empresaId'));
  if(!a.dedicated)await authorizeMarketplace(request,a.empresaId,'view');
  const canSell=await directSalePermission(a.db,a.empresaId,a.usuario.id,a.perfil);
  if(!canSell)await authorizeMarketplace(request,a.empresaId,'view');
  return NextResponse.json({sales:await listDirectSales(a.db,a.empresaId,p.get('productId')||undefined),canSell},{headers});
 }catch(e){return managementFailure(e);}
}
export async function POST(request:Request){
 try{
  const b=await request.json(),a=await authorizePriceConsultation(request,b.empresaId);
  if(!a.dedicated)await authorizeMarketplace(request,a.empresaId,b.action==='context'?'view':'manage');
  const canSell=await directSalePermission(a.db,a.empresaId,a.usuario.id,a.perfil);
  const canWithdraw=a.stockPermission||['gestor_master','administrador','operador_completo'].includes(a.perfil);
  if(b.action==='context'){
   const product=await priceStockProduct(a.db,a.empresaId,b);
   const settings=await readPriceSettings(a.db,a.empresaId);
   return NextResponse.json({actorId:a.usuario.id,canSell,canWithdraw,product:{id:product.id,name:product.name,ean:product.ean,picture:product.pictures[0]||null,referenceCents:product.price_cents},percentages:settings.percentages,...await warehouseContext(a.db,a.empresaId,product.id)},{headers});
  }
  if(b.action==='withdraw'?!canWithdraw:!canSell)throw new MarketplaceError(403,'forbidden','Seu acesso não permite esta operação.');
  // Resolver história no servidor; o ator e a empresa nunca vêm do formulário.
  const input=b.historyId?{...b,productId:(await priceStockProduct(a.db,a.empresaId,b)).id}:b;
  return NextResponse.json({result:await directSaleCommand(a.db,a.empresaId,a.usuario.id,input)},{headers});
 }catch(e){
  // Rejeição de validação/rollback é diferente de resposta perdida. Não libera
  // uma nova tentativa quando há falha de rede, autenticação ou erro desconhecido.
  if(e instanceof MarketplaceError&&[400,409].includes(e.status))return NextResponse.json({rejected:true,message:e.message},{headers});
  return managementFailure(e);
 }
}
