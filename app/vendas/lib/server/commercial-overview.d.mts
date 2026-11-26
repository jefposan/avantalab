export type CommercialOverview={start:string;end:string;revenue:number;openReceivables:number;receivedNet:number;overdueReceivables:number;cost?:number;counts:{quotes:number;orders:number;services:number;invoiced:number}};
export function validOverviewPeriod(start:string,end:string):boolean;
export function buildCommercialOverview(input:{operations?:any[];items?:any[];services?:any[];receivables?:any[];start:string;end:string;today:string;permissions?:Record<string,boolean>}):CommercialOverview;
