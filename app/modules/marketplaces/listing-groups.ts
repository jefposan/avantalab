import type {ListingSnapshot} from './services/listing-model';
export type GroupedListingRow={snapshot:ListingSnapshot;status:string;operationalStatus?:string;connectionId:string;operations?:{count:number;labels:string[]}};
export type ListingGroup={key:string;productId:string|null;title:string;ean:string|null;pictures:string[];stockQuantity:number|null;stockPending:boolean;referencePriceCents?:number|null;listings:GroupedListingRow[]};
export function listingGroupSummary(group:ListingGroup){
 const accounts=new Set(group.listings.map(row=>row.connectionId)).size;
 const statuses=new Map<string,number>();
 const prices=new Map<string,number[]>();
 for(const row of group.listings){
  const status=row.snapshot.substatus?.includes('deleted')?'deleted':row.status;
  statuses.set(status,(statuses.get(status)||0)+1);
  if(row.snapshot.price!=null){const currency=row.snapshot.currency||'BRL';prices.set(currency,[...(prices.get(currency)||[]),row.snapshot.price]);}
 }
 return{accounts,statuses:[...statuses],prices:[...prices].map(([currency,values])=>({currency,min:Math.min(...values),max:Math.max(...values)}))};
}
/** Resposta antiga/sem vínculo nunca é agrupada por nome, EAN ou semelhança. */
export function unlinkedListingGroups(rows:GroupedListingRow[]):ListingGroup[]{
 return rows.map(row=>({key:`listing:${row.connectionId}:${row.snapshot.id}`,productId:null,title:row.snapshot.title,ean:row.snapshot.ean,pictures:row.snapshot.pictures||[],stockQuantity:null,stockPending:true,listings:[row]}));
}
