import type { PaymentSettings } from '../payment-methods.mjs';
export function createCommercialPolicyRepository(input:any):{loadPayments(companyId:string):Promise<{payments:PaymentSettings|null;version:number}>;savePayments(companyId:string,actorId:string,settings:PaymentSettings,version:number):Promise<{payments:PaymentSettings;version:number}>;load(companyId:string):Promise<{maxDiscountPercent:number;version:number}>;save(companyId:string,actorId:string,value:number,version:number):Promise<any>};
export function handleCommercialPolicy(input:any):Promise<Response>;
