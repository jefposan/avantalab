export function revenueLabKey(companyId:string):string;
export function localRevenueLabActive():boolean;
export function projectLocalRevenue(input:{operations:any[];companyId:string;year:number;enabled:boolean}):any[];
export function mergeLocalRevenueEntries(existing:any[],projected:any[],companyId:string,year:number,centerId?:string|null):any[];
export function mergeLocalRevenueTotals(existing:any[],previous:any[],projected:any[]):any[];
export function loadLocalRevenue(input:{companyId:string;year:number;token:string;fetcher?:typeof fetch}):Promise<any[]>;
