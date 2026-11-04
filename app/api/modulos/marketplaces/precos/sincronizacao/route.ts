import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {priceStockProduct} from '@/app/modules/marketplaces/services/price-product-stock';
import {reviewStockSync,applyStockSync} from '@/app/modules/marketplaces/services/stock-reconciliation';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){try{
 const body=await request.json();
 const {db,empresaId,usuario,perfil,stockPermission}=await authorizePriceConsultation(request,body.empresaId);
 const canManage=stockPermission||['gestor_master','administrador','operador_completo'].includes(perfil);
 if(!['review','apply'].includes(body.action))throw new MarketplaceError(400,'invalid_action','Operação inválida.');
 if(body.action==='apply'&&!canManage)throw new MarketplaceError(403,'forbidden','Solicite permissão Editar estoque para sincronizar.');
 if(body.action==='review')return NextResponse.json(await reviewStockSync(db,empresaId,usuario.id,(await priceStockProduct(db,empresaId,body)).id,canManage),{headers:{'Cache-Control':'no-store'}});
 try{return NextResponse.json({result:await applyStockSync(db,empresaId,usuario.id,body)},{headers:{'Cache-Control':'no-store'}});}
 catch(error){if(error instanceof MarketplaceError&&[400,409].includes(error.status))return NextResponse.json({rejected:true,message:error.message,code:error.code},{headers:{'Cache-Control':'no-store'}});throw error;}
}catch(error){return managementFailure(error);}}
