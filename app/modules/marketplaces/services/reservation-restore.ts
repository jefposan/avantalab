import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
type Job={empresa_id:string;product_id:string;link_id:string;revision:number;desired_quantity:number;allow_increase:boolean};
/** Somente cancelar uma reserva autoriza avaliar a pausa feita pelo próprio sistema.
 * Quantidade já deve estar confirmada no provedor. Pausa manual jamais é reativada.
 */
export async function reservationRestoreAllowed(db:SupabaseClient,job:Job,connectionId:string,listingId:string){
 if(!job.allow_increase||job.desired_quantity<=0)return false;
 const release=await db.from('marketplace_reservation_releases').select('revision,since_at').eq('empresa_id',job.empresa_id).eq('product_id',job.product_id).maybeSingle();
 if(release.error)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir a liberação da reserva.');
 if(!release.data||Number(release.data.revision)!==job.revision)return false;
 const control=await db.from('marketplace_listing_stock_control').select('paused_by_system,pause_requested_at,pause_confirmed_at').eq('empresa_id',job.empresa_id).eq('link_id',job.link_id).maybeSingle();
 if(control.error)throw new MarketplaceError(503,'inventory_database','Não foi possível confirmar a origem da pausa.');
 if(!control.data?.paused_by_system||!Number.isFinite(Date.parse(control.data.pause_confirmed_at))||!Number.isFinite(Date.parse(control.data.pause_requested_at))||!Number.isFinite(Date.parse(release.data.since_at))||Date.parse(control.data.pause_requested_at)<Date.parse(release.data.since_at))return false;
 const actions=await db.from('marketplace_listing_actions').select('id,created_at').eq('empresa_id',job.empresa_id).eq('connection_id',connectionId).eq('provider_listing_id',listingId).eq('action','pause').order('created_at',{ascending:false}).limit(1);
 if(actions.error)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir pausas manuais.');
 if(actions.data?.some(a=>Date.parse(a.created_at)>=Date.parse(control.data!.pause_requested_at)))return false;
 const p=await db.from('marketplace_products').select('stock_quantity,revision,listing_stock_review_at').eq('empresa_id',job.empresa_id).eq('id',job.product_id).is('archived_at',null).maybeSingle();
 if(p.error||p.data?.listing_stock_review_at||p.data?.revision!==job.revision||p.data?.stock_quantity!==job.desired_quantity)throw new MarketplaceError(409,'stock_changed','Saldo alterado antes de reativar. A nova revisão será conferida.');
 return true;
}

/** Não importar um saldo remoto ainda antigo e recolocar unidades já bloqueadas.
 * A revisão da conferência também é exigida pelo RPC; uma reserva concorrente
 * invalida essa revisão antes de qualquer substituição do saldo local.
 */
export async function assertNoOnlineReservationImport(db:SupabaseClient,company:string,product:string){
 const r=await db.from('marketplace_stock_reservations').select('id,warehouse:marketplace_warehouses!inner(is_online)').eq('empresa_id',company).eq('product_id',product).eq('status','active').eq('warehouse.is_online',true).limit(1);
 if(r.error)throw new MarketplaceError(503,'reservation_database','Não foi possível conferir as unidades reservadas.');
 if(r.data?.length)throw new MarketplaceError(409,'reserved_stock_import','Há unidades Online reservadas. Envie o saldo local disponível aos anúncios; para importar o saldo do anúncio, cancele ou conclua primeiro as reservas.');
}
