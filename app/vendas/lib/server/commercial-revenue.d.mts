export const DEFAULT_REVENUE_SETTINGS:Readonly<{enabled:boolean;version:number}>;
export function createCommercialRevenueRepository(input:{pool:any}):{load(companyId:string):Promise<any>;save(companyId:string,actorId:string,values:any):Promise<any>};
export function handleCommercialRevenue(input:{request:Request;runtime:any}):Promise<Response>;
