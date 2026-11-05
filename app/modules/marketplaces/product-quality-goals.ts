import type {ListingQuality} from './listing-quality';
import type {ProductCommonKind} from './product-common-content';
export type ProductQualityRecord={connection_id:string;listing_id:string;checked_at:string|null;issue:string|null;quality:ListingQuality[]|null};
export function productQualityGoals(records:ProductQualityRecord[],links:{connection_id:string;provider_listing_id:string}[]){
 const keys=new Set(links.map(l=>`${l.connection_id}:${l.provider_listing_id}`)),groups=new Map<string,{key:string;title:string;kind:ProductCommonKind|null}>();
 let known=0;
 for(const row of records){
  if(!keys.has(`${row.connection_id}:${row.listing_id}`)||!Array.isArray(row.quality)||!row.quality.length)continue;
  known++;
  for(const quality of row.quality)for(const goal of quality.goals||[]){
   if(goal.completed)continue;
   const kind:ProductCommonKind|null=/PICTURE/.test(goal.id)?'pictures':/TECHNICAL|ATTRIBUTE|UNIVERSAL_CODE|GTIN/.test(goal.id)?'attributes':['title','description','listingType'].includes(goal.field||'')?'details':null;
   const key=kind||goal.id;
   if(!groups.has(key))groups.set(key,{key,kind,title:kind==='pictures'?'Fotos do produto':kind==='attributes'?'Ficha técnica':kind==='details'?'Informações do anúncio':goal.title});
  }
 }
 return {goals:[...groups.values()],unknown:Math.max(0,keys.size-known),stale:records.some(r=>keys.has(`${r.connection_id}:${r.listing_id}`)&&(!!r.issue||!r.checked_at||Date.now()-Date.parse(r.checked_at)>26*3600000))};
}
