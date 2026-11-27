export const COMMERCIAL_CUSTOMER_PAGE_SIZE: number;
export function fetchCommercialPages(input:{url:string;key:string;token:string;fetcher?:typeof fetch;pageSize?:number}):Promise<any[]>;
