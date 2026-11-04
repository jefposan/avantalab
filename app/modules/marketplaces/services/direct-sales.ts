import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {objectValue,uuidIsValid} from './listing-model';
import {safeHttpsImage} from './catalog-publication';
import {validSoldOn,WITHDRAW_REASONS,type DirectSale} from '../direct-sales';
import type {MarketplaceSale} from './mercadolivre-sales';

export async function directSalePermission(db:SupabaseClient,companyId:string,actor:string,profile:string) {
 const r=await db.from('marketplace_price_users').select('can_register_sales').eq('empresa_id',companyId).eq('user_id',actor).eq('ativo',true).maybeSingle();
 if(r.error)throw new MarketplaceError(503,'direct_sales_migration','Vendas diretas indisponíveis. Confira a atualização do banco antes de continuar.');
 return ['gestor_master','administrador','operador_completo'].includes(profile)||r.data?.can_register_sales===true;
}
export function publicDirectSale(input:unknown):DirectSale {
 const r=objectValue(input);
 const iso=(v:unknown)=>v instanceof Date?v.toISOString():String(v);
 return {id:String(r.id),productId:String(r.product_id),warehouseId:String(r.warehouse_id),warehouseName:String(r.warehouse_name),productName:String(r.product_name),ean:typeof r.ean==='string'?r.ean:null,picture:safeHttpsImage(r.picture),quantity:Number(r.quantity),unitPriceCents:Number(r.unit_price_cents),totalCents:Number(r.total_cents),soldOn:iso(r.sold_on).slice(0,10),status:r.status==='cancelled'?'cancelled':'confirmed',returnedQuantity:Number(r.returned_quantity),note:String(r.note||''),cancellationNote:typeof r.cancellation_note==='string'?r.cancellation_note:null,revision:Number(r.revision),createdAt:iso(r.created_at),updatedAt:iso(r.updated_at)};
}
export async function listDirectSales(db:SupabaseClient,companyId:string,productId?:string) {
 if(productId&&!uuidIsValid(productId))throw new MarketplaceError(400,'invalid_product','Produto inválido.');
 const rows:DirectSale[]=[];
 for(let offset=0;;offset+=500){
  let query=db.from('marketplace_direct_sales').select('*').eq('empresa_id',companyId);
  if(productId)query=query.eq('product_id',productId);
  const r=await query.order('sold_on',{ascending:false}).order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(20_000));
  if(r.error)throw new MarketplaceError(503,['42P01','PGRST205'].includes(r.error.code)?'direct_sales_migration':'direct_sales_database','Não foi possível consultar as vendas diretas. Confira a atualização do banco e tente novamente.');
  rows.push(...(r.data||[]).map(publicDirectSale));if((r.data||[]).length<500)return rows;
 }
}
export function directSaleAsMarketplace(s:DirectSale):MarketplaceSale {
 return {provider:'direct',directSale:s,id:s.id,connectionId:`warehouse:${s.warehouseId}`,orderId:s.id,soldAt:`${s.soldOn}T12:00:00-03:00`,status:s.status==='cancelled'?'cancelled':'paid',shipmentId:null,shipmentStatus:null,shipmentSubstatus:null,labelStatus:'unavailable',seenAt:null,createdAt:s.createdAt,updatedAt:s.updatedAt,buyer:null,total:s.totalCents/100,currency:'BRL',items:[{title:s.productName,quantity:s.quantity,unitPrice:s.unitPriceCents/100,ean:s.ean}]};
}
export function directCommandData(input:unknown) {
 const b=objectValue(input),d:Record<string,unknown>={};
 if(!['sell','withdraw','cancel','return'].includes(String(b.action))||!uuidIsValid(b.requestKey))throw new MarketplaceError(400,'invalid_direct_command','Atualize o formulário antes de continuar.');
 const qty=b.quantity;
 if(!Number.isSafeInteger(qty)||Number(qty)<(b.action==='cancel'?0:1)||Number(qty)>99999)throw new MarketplaceError(400,'invalid_quantity','Informe uma quantidade inteira válida.');
 d.quantity=qty;
 if(typeof b.note!=='string'||b.note.trim().length>500)throw new MarketplaceError(400,'invalid_note','Use até 500 caracteres na observação.');
 d.note=b.note.trim();
 if(['cancel','return'].includes(String(b.action))){
  if(!uuidIsValid(b.saleId)||!Number.isSafeInteger(b.saleRevision)||Number(b.saleRevision)<1||!d.note)throw new MarketplaceError(400,'invalid_sale','Confira a venda e informe o motivo.');
  Object.assign(d,{saleId:b.saleId,saleRevision:b.saleRevision});
 }else{
  if(!uuidIsValid(b.productId))throw new MarketplaceError(400,'invalid_product','Produto inválido.');
  d.productId=b.productId;
 }
 if(!['cancel','return'].includes(String(b.action))||Number(qty)>0){
  if(!uuidIsValid(b.warehouseId)||!Number.isSafeInteger(b.revision)||Number(b.revision)<1)throw new MarketplaceError(400,'invalid_warehouse','Selecione o estoque e atualize o saldo.');
  Object.assign(d,{warehouseId:b.warehouseId,revision:b.revision});
 }
 if(b.action==='sell'){
  if(!Number.isSafeInteger(b.unitPriceCents)||Number(b.unitPriceCents)<1||Number(b.unitPriceCents)>999999999||!validSoldOn(b.soldOn))throw new MarketplaceError(400,'invalid_price_date','Informe o preço vendido e uma data válida, não futura.');
  Object.assign(d,{unitPriceCents:b.unitPriceCents,soldOn:b.soldOn});
 }
 if(b.action==='withdraw'){
  if(typeof b.reason!=='string'||!Object.hasOwn(WITHDRAW_REASONS,b.reason))throw new MarketplaceError(400,'invalid_reason','Selecione o motivo da saída.');
  d.reason=b.reason;
 }
 return {action:String(b.action),data:d,requestKey:String(b.requestKey)};
}
export async function directSaleCommand(db:SupabaseClient,companyId:string,actor:string,input:unknown){
 const c=directCommandData(input);
 const r=await db.rpc('marketplace_direct_sale_command',{p_empresa_id:companyId,p_actor_id:actor,p_action:c.action,p_data:c.data,p_request_key:c.requestKey});
 if(r.error)throw new MarketplaceError(r.error.code==='P0001'?409:503,'direct_sale_command',r.error.code==='P0001'?r.error.message:'Não foi possível confirmar a operação. Repita a mesma tentativa para conferir, sem duplicar.');
 try{const {dispatchStockAfterCommit}=await import('./inventory-dispatch');dispatchStockAfterCommit(db,companyId);}catch{console.error('marketplace_stock_delivery_pending');}
 return r.data;
}
