export const RESERVATIONS_PATH='/api/modulos/marketplaces/reservas';
export type StockReservation={id:string;productId:string;warehouseId:string;actorId:string;buyer:string;note:string;quantity:number;status:'active'|'cancelled'|'sold';revision:number;saleId:string|null;createdAt:string};
