import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadConnection,mlRequest} from './mercadolivre-management';
import {listingIdIsValid,normalizeListing,objectValue} from './listing-model';
import {MarketplaceError} from './management-access';
import {normalizeListingQuality,type ListingQuality} from '../listing-quality';

export async function readListingQuality(db:SupabaseClient,company:string,connectionId:unknown,id:unknown){
 if(!listingIdIsValid(id))throw new MarketplaceError(400,'invalid_item','Identificador do anúncio inválido.');
 const connection=await loadConnection(db,company,connectionId);
 const item=objectValue(await mlRequest(db,connection,`/items/${id}`));
 if(item.id!==id||String(item.seller_id)!==connection.seller_reference)throw new MarketplaceError(403,'seller_mismatch','Este anúncio não pertence à conta selecionada.');
 const snapshot=normalizeListing(item,connection.seller_reference);
 const up=typeof item.user_product_id==='string'&&/^MLBU\d{1,25}$/.test(item.user_product_id)?item.user_product_id:null;
 const entities=[{id,type:'ITEM' as const,path:`/item/${id}/performance`},...(up?[{id:up,type:'USER_PRODUCT' as const,path:`/user-product/${up}/performance`}]:[])];
 const results=await Promise.allSettled(entities.map(async entity=>normalizeListingQuality(await mlRequest(db,connection,entity.path),entity.id,entity.type)));
 const quality:ListingQuality[]=[],notices:string[]=[];
 results.forEach((result,index)=>{
  if(result.status==='fulfilled')quality.push(result.value);
  else {const reason=result.reason;const name=entities[index].type==='ITEM'?'anúncio':'produto';
   notices.push(reason instanceof MarketplaceError&&reason.code==='provider_404'?`O Mercado Livre ainda não gerou a avaliação deste ${name}.`:reason instanceof MarketplaceError&&(['provider_401','provider_403','reconnect'].includes(reason.code)||[401,403].includes(reason.status))?`O Mercado Livre não permitiu consultar a qualidade deste ${name}. Confira as permissões da conta.`:reason instanceof MarketplaceError&&reason.status===429?'Limite de consultas do Mercado Livre atingido. Aguarde antes de atualizar os objetivos.':`Não foi possível consultar a qualidade deste ${name}. Tente atualizar os objetivos.`);
  }
 });
 const checkedAt=new Date().toISOString(),result={listingId:id,connectionId:connection.id,snapshot,quality,notices,checkedAt};
 const primary=quality.find(q=>q.entityType==='ITEM')||quality[0];
 // Uma falha temporária nunca transforma a última pontuação conhecida em zero.
 const saved=await db.rpc('marketplace_quality_save',{p_company:company,p_connection:connection.id,p_listing:id,p_result:result,p_issue:primary?.score!=null?null:notices.join(' ')||'O Mercado Livre ainda não informou a pontuação.'});
 if(saved.error)throw new MarketplaceError(503,'quality_save','A consulta ocorreu, mas não foi possível confirmar a gravação da avaliação.');
 return result;
}
