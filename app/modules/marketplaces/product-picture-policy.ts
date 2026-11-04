/** Referência de preparo; a meta específica devolvida pelo ML pode exigir mais. */
export const RECOMMENDED_PRODUCT_PICTURES=3;
export function proposedProductPictures(existing:{id:string;url:string}[],candidates:{id:string;url:string}[],limit:number){
 if(!Number.isSafeInteger(limit)||limit<1||existing.length>limit)return [];
 const merged=[...new Map([...existing,...candidates].map(p=>[p.id,p])).values()];
 return Math.min(merged.length,limit)>existing.length?merged.slice(0,limit):[];
}
