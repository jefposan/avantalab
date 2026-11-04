import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';

/** Confirmar 0 → 0 não dispara o trigger de mudança de quantidade. Recria
 * somente a fila após a conferência física, nunca confirma estoque por leitura.
 * O RPC relê o saldo/revisão e o worker confirma cada pausa; não libera aumento. */
export async function enqueueConfirmedZero(db:SupabaseClient,company:string,product:{id:string;stock_quantity:number|null;stock_confirmed_at:string|null;listing_stock_review_at?:string|null}){
 if(product.stock_quantity!==0||!product.stock_confirmed_at||product.listing_stock_review_at)return;
 const result=await db.rpc('marketplace_enqueue_stock',{p_empresa:company,p_product:product.id,p_increase:false});
 if(result.error)throw new MarketplaceError(503,'zero_stock_queue_pending','O saldo zero foi confirmado, mas a fila de pausa não pôde ser registrada. Confira os avisos e tente a mesma confirmação novamente; não adicione unidades.');
}
