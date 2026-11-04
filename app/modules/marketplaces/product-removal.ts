import type { LocalProduct } from './services/local-product-model';
import type {LocalProductLink} from './services/local-product-model';
export type RemovalTarget=LocalProductLink&{unlinked:boolean;conflict:boolean};
export const removalNeedsDeletion=(status:string)=>!['deleted','cancelled','canceled','unpublished'].includes(status);
export const REMOVAL_SAFE_STATUSES = ['closed','deleted','cancelled','canceled','unpublished'] as const;
export type RemovalProof = { linkId:string; connectionId:string; listingId:string; status:string; checkedAt:string; error?:string };
export type ProductRemovalReview = {
 product:LocalProduct; allocations:Array<{warehouseId:string;name:string;quantity:number|null;isOnline:boolean}>;
 accounts:Array<{id:string;provider:string;seller_reference:string;seller_name:string|null;status:string;last_synced_at:string|null;expires_at:string|null}>;
 mode:'deleted'|'archived'; history:boolean; stockBlocked:boolean; workBlocked:boolean; proofs:RemovalProof[]; blockers:string[];
 targets?:RemovalTarget[]; discoveryKey?:string; discoveryBlockers?:string[];
};
export function removalBlockers(review:Pick<ProductRemovalReview,'stockBlocked'|'workBlocked'|'proofs'>) {
 const errors:string[]=[];
 if(review.workBlocked)errors.push('Há publicação, alteração de anúncio ou sincronização pendente. Confira a conclusão antes de remover.');
 if(review.proofs.some(p=>p.error))errors.push('Não foi possível conferir todos os anúncios. Reconecte as contas indicadas ou tente novamente.');
 if(review.proofs.some(p=>!p.error&&!REMOVAL_SAFE_STATUSES.includes(p.status as typeof REMOVAL_SAFE_STATUSES[number])))errors.push('Este produto tem anúncios vinculados. Encerre ou exclua os anúncios indicados para concluir a exclusão do produto.');
 return errors;
}
