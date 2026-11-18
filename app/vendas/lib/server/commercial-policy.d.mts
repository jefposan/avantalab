export function createCommercialPolicyRepository(input:any):{load(companyId:string):Promise<{maxDiscountPercent:number;version:number}>;save(companyId:string,actorId:string,value:number,version:number):Promise<any>};
export function handleCommercialPolicy(input:any):Promise<Response>;
