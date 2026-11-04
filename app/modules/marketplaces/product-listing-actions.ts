import {marketplaceCapabilities} from './integration-contract.ts';
import type {LocalProductLink} from './services/local-product-model';
import type {ListingAction} from './services/listing-model';
export const productListingActionNames:Record<ListingAction,string>={pause:'Pausar',resume:'Reativar',close:'Encerrar',delete:'Excluir anúncio'};
export function productListingActions(link:LocalProductLink,onlineQuantity:number|null):ListingAction[]{
 const status=link.status.toLowerCase(),capabilities=marketplaceCapabilities(link.provider);
 const candidates:ListingAction[]=status==='active'||status==='published'?['pause','close']:status==='paused'?[...(onlineQuantity!=null&&onlineQuantity>0?['resume' as const]:[]),'close']:status==='closed'?['delete']:[];
 return candidates.filter(action=>capabilities[action]==='api');
}
