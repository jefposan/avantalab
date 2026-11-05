export type DirectSale = {
 id:string; productId:string; warehouseId:string; warehouseName:string; productName:string; ean:string|null; picture:string|null;
 quantity:number; unitPriceCents:number; totalCents:number; soldOn:string; status:'confirmed'|'cancelled'; returnedQuantity:number;
 note:string; cancellationNote:string|null; revision:number; createdAt:string; updatedAt:string;
};
export const DIRECT_SALES_PATH='/api/modulos/marketplaces/vendas-diretas';
export const DIRECT_SALES_CHANGED='avanta:marketplace-direct-sales-changed';
export function notifyDirectSalesChanged(companyId:string) {
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(DIRECT_SALES_CHANGED,{detail:{companyId}}));
}
export function saleToday() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function validSoldOn(value:unknown) {
 return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value && value>='2000-01-01' && value<=saleToday();
}
export const WITHDRAW_REASONS={loss:'Perda',damage:'Avaria',internal:'Uso interno'} as const;
