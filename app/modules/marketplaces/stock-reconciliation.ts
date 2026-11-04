export const STOCK_SYNC_PATH='/api/modulos/marketplaces/precos/sincronizacao';
/** Estado terminal confirmado: não há anúncio comercial para sincronizar. */
export function listingStockSyncTerminated(status:unknown) {
 return ['closed','deleted','excluded','unpublished','cancelled','canceled'].includes(String(status).trim().toLowerCase());
}
export type StockSyncSource={id:string;account:string;listingId:string;connectionId?:string;provider:string;quantity:number|null;status:string;eligible:boolean;issue?:string;pausedBySystem?:boolean};
export type StockSyncContext={actorId:string;productId:string;name:string;localQuantity:number|null;localConfirmed:boolean;revision:number;canManage:boolean;checkedAt:string;reviewId:string;sources:StockSyncSource[];pending:boolean};
/** Estado desconhecido continua exigindo conferência; somente desativações confirmadas são ignoradas. */
export function listingStockAlertsEnabled(status:unknown) {
 return !['paused','inactive','closed','deleted','excluded','unpublished','cancelled','canceled'].includes(String(status).trim().toLowerCase());
}
export function stockDivergence(quantity:number|null,links:Array<{provider:string;reported_stock:number|null;status:string}>){
 const ml=links.filter(link=>['mercado_livre','magalu'].includes(link.provider)&&listingStockAlertsEnabled(link.status));
 if(!ml.length)return '';
 if(quantity==null)return 'Saldo local não informado';
 if(ml.some(link=>link.reported_stock==null))return 'Conferir saldos';
 if(ml.some(link=>link.reported_stock!==quantity))return 'Divergência';
 if(quantity===0&&ml.some(link=>link.status==='active'))return 'Pausa pendente';
 return '';
}
export function syncTarget(context:StockSyncContext,direction:string,sourceId:string){return direction==='listing_to_local'?context.sources.find(source=>source.id===sourceId&&source.eligible)?.quantity:context.localQuantity;}
