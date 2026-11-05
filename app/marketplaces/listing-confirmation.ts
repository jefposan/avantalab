import type {ListingSnapshot} from '@/app/modules/marketplaces/services/listing-model';
import type {GroupedListingRow,ListingGroup} from '@/app/modules/marketplaces/listing-groups';

export type ListingConfirmation={companyId:string;connectionId:string;listing:ListingSnapshot};
type Confirmed=ListingConfirmation&{sequence:number};
const key=(connectionId:string,id:string)=>`${connectionId}:${id}`;
export function mergeConfirmedListings<T extends GroupedListingRow>(rows:T[],updates:ListingConfirmation[]):T[]{
 const snapshots=new Map(updates.map(update=>[key(update.connectionId,update.listing.id),update.listing]));
 let changed=false;
 const next=rows.map(row=>{const listing=snapshots.get(key(row.connectionId,row.snapshot.id));if(!listing)return row;changed=true;return {...row,snapshot:listing,status:listing.substatus.includes('deleted')?'deleted':listing.status};});
 return changed?next:rows;
}
export function mergeConfirmedGroups(groups:ListingGroup[],updates:ListingConfirmation[]){
 return groups.map(group=>{const listings=mergeConfirmedListings(group.listings,updates);return listings===group.listings?group:{...group,listings};});
}
/** Somente respostas iniciadas antes da confirmação precisam deste retrato.
 * Leituras posteriores continuam mostrando alterações reais vindas do servidor. */
export function createListingConfirmationTracker(){
 let sequence=0,company='';const confirmed=new Map<string,Confirmed>();
 function scope(companyId:string){if(company!==companyId){company=companyId;sequence=0;confirmed.clear();}}
 return {
  beginRead(companyId:string){scope(companyId);return sequence;},
  confirm(update:ListingConfirmation){scope(update.companyId);confirmed.set(key(update.connectionId,update.listing.id),{...update,sequence:++sequence});if(confirmed.size>1000)confirmed.delete(confirmed.keys().next().value!);},
  updatesSince(companyId:string,readSequence:number){if(company!==companyId)return[];return [...confirmed.values()].filter(update=>update.sequence>readSequence);},
 };
}
