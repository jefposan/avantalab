import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {StockReservation} from '../stock-reservations';
import {MarketplaceError} from './management-access';
import {objectValue,uuidIsValid} from './listing-model';
import {validSoldOn} from '../direct-sales';
export function publicReservation(input:unknown):StockReservation {
 const r=objectValue(input);
 return {id:String(r.id),productId:String(r.product_id),warehouseId:String(r.warehouse_id),actorId:String(r.actor_id),buyer:String(r.buyer),note:String(r.note||''),quantity:Number(r.quantity),status:r.status as StockReservation['status'],revision:Number(r.revision),saleId:r.sale_id?String(r.sale_id):null,createdAt:r.created_at instanceof Date?r.created_at.toISOString():String(r.created_at)};
}
export function reservationCommandData(input:unknown){
 const b=objectValue(input),data:Record<string,unknown>={};
 if(!['reserve','cancel','sell'].includes(String(b.action))||!uuidIsValid(b.requestKey))throw new MarketplaceError(400,'invalid_reservation','Atualize a reserva antes de continuar.');
 if(b.action==='reserve'){
  if(!uuidIsValid(b.productId)||!uuidIsValid(b.warehouseId)||!Number.isSafeInteger(b.revision)||Number(b.revision)<1)throw new MarketplaceError(400,'invalid_reservation_stock','Escolha o estoque e atualize o saldo.');
  if(!Number.isSafeInteger(b.quantity)||Number(b.quantity)<1||Number(b.quantity)>99999)throw new MarketplaceError(400,'invalid_reservation_quantity','Informe uma quantidade inteira disponível.');
  if(typeof b.buyer!=='string'||!b.buyer.trim()||b.buyer.trim().length>120||typeof b.note!=='string'||b.note.length>500)throw new MarketplaceError(400,'invalid_reservation_buyer','Identifique o comprador em até 120 caracteres; observação até 500.');
  Object.assign(data,{productId:b.productId,warehouseId:b.warehouseId,revision:b.revision,quantity:b.quantity,buyer:b.buyer.trim(),note:b.note.trim()});
 }else{
  if(!uuidIsValid(b.reservationId)||!Number.isSafeInteger(b.reservationRevision)||Number(b.reservationRevision)<1)throw new MarketplaceError(400,'invalid_reservation','Atualize a lista de reservas.');
  Object.assign(data,{reservationId:b.reservationId,reservationRevision:b.reservationRevision});
  if(b.action==='sell'){
   if(!Number.isSafeInteger(b.unitPriceCents)||Number(b.unitPriceCents)<1||Number(b.unitPriceCents)>999999999||!validSoldOn(b.soldOn))throw new MarketplaceError(400,'invalid_reservation_sale','Informe o valor unitário e uma data de venda válida, não futura.');
   Object.assign(data,{unitPriceCents:b.unitPriceCents,soldOn:b.soldOn});
  }
 }
 return {action:String(b.action),data,requestKey:String(b.requestKey)};
}
export async function listReservations(db:SupabaseClient,companyId:string,productId:string){
 if(!uuidIsValid(productId))throw new MarketplaceError(400,'invalid_product','Produto inválido.');
 const reservations:StockReservation[]=[];
 for(let offset=0;;offset+=500){
  const r=await db.from('marketplace_stock_reservations').select('*').eq('empresa_id',companyId).eq('product_id',productId).eq('status','active').order('created_at',{ascending:false}).order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(20_000));
  if(r.error)throw new MarketplaceError(503,'reservation_database','Não foi possível consultar as reservas. Confira a atualização do banco e tente novamente.');
  reservations.push(...(r.data||[]).map(publicReservation));if((r.data||[]).length<500)return reservations;
 }
}
export async function reservationCommand(db:SupabaseClient,companyId:string,actor:string,input:unknown){
 const c=reservationCommandData(input);
 const receipt=await db.from('marketplace_warehouse_operations').select('request_key').eq('empresa_id',companyId).eq('request_key',c.requestKey).maybeSingle();
 if(receipt.error)throw new MarketplaceError(503,'reservation_receipt','Não foi possível conferir a tentativa anterior.');
 if(c.action==='reserve'&&!receipt.data){
  // Com anúncios ligados, reservar Online só é permitido com sincronização ativa.
  const w=await db.from('marketplace_warehouses').select('is_online').eq('empresa_id',companyId).eq('id',c.data.warehouseId).is('archived_at',null).maybeSingle();
  if(w.error)throw new MarketplaceError(503,'reservation_stock','Não foi possível conferir o estoque.');
  if(w.data?.is_online){
   const links=await db.from('marketplace_product_links').select('id',{count:'exact',head:true}).eq('empresa_id',companyId).eq('product_id',c.data.productId).not('status','in','(deleted,closed,cancelled)');
   if(links.error)throw new MarketplaceError(503,'reservation_stock','Não foi possível conferir os anúncios.');
   if(links.count){
    const settings=await db.from('marketplace_inventory_settings').select('enabled').eq('empresa_id',companyId).maybeSingle();
    if(settings.error||!settings.data?.enabled)throw new MarketplaceError(409,'reservation_sync_disabled','Ative a sincronização do estoque Online antes de reservar unidades anunciadas.');
   }
  }
 }
 const r=await db.rpc('marketplace_reservation_command',{p_empresa_id:companyId,p_actor_id:actor,p_action:c.action,p_data:c.data,p_request_key:c.requestKey});
 if(r.error)throw new MarketplaceError(r.error.code==='P0001'?409:503,'reservation_command',r.error.code==='P0001'?r.error.message:'A resposta não foi confirmada. Repita a mesma tentativa para recuperar o resultado, sem duplicar.');
 try{const {dispatchStockAfterCommit}=await import('./inventory-dispatch');dispatchStockAfterCommit(db,companyId);}catch{console.error('marketplace_reservation_sync_pending');}
 return r.data;
}

export async function reservationSyncStatus(db:SupabaseClient,companyId:string,productId:string){
 const [links,jobs,product]=await Promise.all([
  db.from('marketplace_product_links').select('id,reported_stock,status').eq('empresa_id',companyId).eq('product_id',productId).not('status','in','(deleted,closed,cancelled)'),
  db.from('marketplace_inventory_outbox').select('link_id,state,issue').eq('empresa_id',companyId).eq('product_id',productId),
  db.from('marketplace_products').select('stock_quantity').eq('empresa_id',companyId).eq('id',productId).maybeSingle()
 ]);
 if(links.error||jobs.error||product.error||!product.data)return {status:'pending' as const,message:'Reserva local mantida. Não foi possível conferir a sincronização dos anúncios.'};
 if(!links.data?.length)return {status:'none' as const,message:'Sem anúncios vinculados a este produto.'};
 const mismatch=links.data.filter(l=>l.reported_stock!==product.data!.stock_quantity||product.data!.stock_quantity===0&&l.status!=='paused');
 const pending=(jobs.data||[]).filter(j=>links.data.some(l=>l.id===j.link_id)&&!['synced','excluded'].includes(j.state));
 return pending.length||mismatch.length?{status:'pending' as const,message:`Reserva local mantida. ${Math.max(pending.length,mismatch.length)} anúncio(s) aguardando confirmação de saldo${pending.some(j=>j.issue)?' ou resolução da pendência':''}.`}:{status:'synced' as const,message:'Último envio de saldo confirmado nos anúncios vinculados.'};
}
