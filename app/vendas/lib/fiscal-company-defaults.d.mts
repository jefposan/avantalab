export const DEFAULT_KEYS:string[];
export function defaultsVersion(value:unknown):string;
export function validateCompanyFiscalDefaults(input:unknown):string;
export function createCompanyFiscalDefaultsRepository(pool:any):any;
export function saveCompanyFiscalDefaultsWithAdmin(input:{client:any;companyId:string;values:Record<string,string>;version:string}):Promise<any>;
