import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {getLocalProduct} from './local-products';
import {loadConnection,mlRequest} from './mercadolivre-management';
import {objectValue,uuidIsValid} from './listing-model';
import {physicalQuantity} from './local-product-model';
import {listingStockPolicy} from './inventory-model';
import {stockModelFromResponse} from './mercadolivre-edit-policy';
import {stockIncreaseBlocker} from './inventory-product-guard';
import type {StockSyncContext,StockSyncSource} from '../stock-reconciliation';
async function syncProduct(db:SupabaseClient,company:string,id:string){
 const product=await getLocalProduct(db,company,id);
 const links=await db.from('marketplace_product_links').select('*').eq('empresa_id',company).eq('product_id',product.id).order('id').limit(31);
 if(links.error)throw new MarketplaceError(503,'stock_links_unavailable','Não foi possível conferir os vínculos deste produto.');
 return{...product,links:links.data||[]};
}

export async function readStockSource(db:SupabaseClient,company:string,link:{id:string;provider:string;connection_id:string;provider_listing_id:string;product_id:string},owned=false):Promise<StockSyncSource>{
 const row:StockSyncSource={id:link.id,account:'Conta vinculada',listingId:link.provider_listing_id,connectionId:link.connection_id,provider:link.provider,quantity:null,status:'unknown',eligible:false,pausedBySystem:owned};
 try{
  if(link.provider==='magalu'){
   const {loadMagaluConnection,readMagaluListing}=await import('./magalu-listings');
   const connection=await loadMagaluConnection(db,company,link.connection_id),current=await readMagaluListing(db,connection,link.provider_listing_id);
   const eligible=current.raw.fulfillment===false&&current.listing.stock!=null&&['active','paused'].includes(current.listing.status);
   return{...row,account:connection.seller_name||connection.seller_reference,quantity:current.listing.stock,status:current.listing.status,eligible,...(!eligible?{issue:'Saldo/canal, Multi-Origem, Fulfillment ou moderação precisam de conferência específica.'}:{})};
  }
  if(link.provider!=='mercado_livre')return{...row,issue:'Conector de estoque ainda indisponível para esta plataforma.'};
  const connection=await loadConnection(db,company,link.connection_id);
  row.account=connection.seller_name||connection.seller_reference;
  const item=objectValue(await mlRequest(db,connection,`/items/${link.provider_listing_id}`));
  if(item.id!==link.provider_listing_id||String(item.seller_id)!==connection.seller_reference)throw Error('O anúncio não foi confirmado nesta conta.');
  const seller=objectValue(await mlRequest(db,connection,`/users/${connection.seller_reference}`));
  if(String(seller.id)!==connection.seller_reference)throw Error('Conta não confirmada.');
  const qty=physicalQuantity(item.available_quantity),status=String(item.status||'unknown');
  // A conferência manual verifica o mesmo modelo suportado pelo sincronizador,
  // em vez de bloquear todo anúncio que tenha user_product_id.
  let modelIssue='';
  if(item.user_product_id!=null){
   if(typeof item.user_product_id!=='string'||!/^MLB[A-Z]?\d+$/.test(item.user_product_id))modelIssue='Não foi possível identificar o modelo de estoque deste produto.';
   else{
    const stock=await mlRequest(db,connection,`/user-products/${item.user_product_id}/stock`);
    if(stockModelFromResponse(stock,connection.seller_reference)!=='single')modelIssue='Estoque Full, por depósitos ou localização não confirmada: confira no Mercado Livre.';
    const associated=objectValue(await mlRequest(db,connection,`/users/${connection.seller_reference}/items/search?${new URLSearchParams({user_product_id:item.user_product_id,limit:'100'})}`));
    const ids=associated.results,paging=objectValue(associated.paging);
    if(!Array.isArray(ids)||!Number.isSafeInteger(paging.total)||paging.total!==ids.length||!ids.length||ids.length>100||new Set(ids).size!==ids.length||!ids.includes(item.id)||ids.some(id=>typeof id!=='string'||!/^MLB\d{6,20}$/.test(id))||(associated.seller_id!=null&&String(associated.seller_id)!==connection.seller_reference))modelIssue||='Não foi possível conferir todos os anúncios que compartilham este estoque.';
    else{
     const related=await db.from('marketplace_product_links').select('provider_listing_id,product_id').eq('empresa_id',company).eq('connection_id',link.connection_id).in('provider_listing_id',ids).limit(101);
     if(related.error)throw Error('Não foi possível conferir os vínculos do estoque compartilhado.');
     if(!link.product_id||related.data?.length!==ids.length||related.data.some(row=>row.product_id!==link.product_id))modelIssue||='Há anúncios deste estoque compartilhado sem vínculo com o mesmo cadastro. Confira os vínculos antes de sincronizar.';
    }
   }
  }
  const pausedStockOnly=status==='paused'&&Array.isArray(item.sub_status)&&item.sub_status.every(s=>['out_of_stock','paused_by_seller'].includes(String(s)));
  const policy=listingStockPolicy(pausedStockOnly?{...item,status:'active'}:item,seller.tags,qty??0,false);
  const eligible=qty!=null&&!modelIssue&&['write','equal'].includes(policy)&&['active','paused'].includes(status);
  const issue=modelIssue||({variations:'Estoque por variação: confira no Mercado Livre.',warehouse:'Estoque por depósitos ou localização não confirmada: confira no Mercado Livre.',fulfillment:'Estoque Full é administrado pelo Mercado Livre.',virtual_kit:'O estoque deste kit é calculado pelos componentes.',inactive:'A situação deste anúncio impede a sincronização de estoque.'} as Record<string,string>)[policy]||'Não foi possível confirmar o saldo e o modelo de estoque deste anúncio.';
  return{...row,quantity:qty,status,eligible,...(!eligible?{issue}:{})};
 }catch(error){return{...row,issue:error instanceof Error?error.message:'Não foi possível consultar este anúncio.'};}
}
export async function reviewStockSync(db:SupabaseClient,company:string,actor:string,productId:string,canManage:boolean):Promise<StockSyncContext>{
 const product=await syncProduct(db,company,productId);
 if(product.links.length>30)throw new MarketplaceError(409,'stock_review_limit','Este produto tem mais de trinta vínculos. Revise os anúncios antes de sincronizar este conjunto.');
 const [controls,jobs]=await Promise.all([db.from('marketplace_listing_stock_control').select('link_id,paused_by_system').eq('empresa_id',company).eq('product_id',product.id),db.from('marketplace_inventory_outbox').select('link_id').eq('empresa_id',company).eq('product_id',product.id).eq('state','pending')]);
 if(controls.error||jobs.error)throw new MarketplaceError(503,'stock_sync_setup','A conferência precisa da migração de sincronização. Nenhum saldo foi alterado.');
 const sources:StockSyncSource[]=[];
 // Limita concorrência/carga; falhas de uma conta não escondem as demais.
 for(let i=0;i<product.links.length;i+=6)sources.push(...await Promise.all(product.links.slice(i,i+6).map(link=>readStockSource(db,company,link,controls.data?.some(c=>c.link_id===link.id&&c.paused_by_system)))));
 const saved=await db.from('marketplace_stock_sync_reviews').insert({empresa_id:company,actor_id:actor,product_id:product.id,revision:product.revision,sources}).select('id,created_at').single();
 if(saved.error||!saved.data)throw new MarketplaceError(503,'stock_sync_setup','Não foi possível registrar a conferência. Nenhum saldo foi alterado.');
 return{actorId:actor,productId:product.id,name:product.name,localQuantity:product.stock_quantity,localConfirmed:product.stock_confirmed_at!=null,revision:product.revision,canManage,checkedAt:saved.data.created_at,reviewId:saved.data.id,sources,pending:!!jobs.data?.length};
}
export async function applyStockSync(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 if(!uuidIsValid(input.reviewId)||!uuidIsValid(input.requestKey)||!['listing_to_local','local_to_listings'].includes(String(input.direction))||input.confirmation!==true)throw new MarketplaceError(400,'invalid_stock_sync','Confira a direção e confirme a sincronização.');
 const payload={reviewId:input.reviewId,direction:input.direction,sourceId:typeof input.sourceId==='string'?input.sourceId:'',confirmation:true,confirmZero:input.confirmZero===true};
 const existing=await db.from('marketplace_stock_sync_operations').select('actor_id,payload,result').eq('empresa_id',company).eq('request_key',input.requestKey).maybeSingle();
 if(existing.error)throw new MarketplaceError(503,'stock_sync_setup','Não foi possível conferir a tentativa. Repita com os mesmos dados.');
 if(existing.data){const receipt=existing.data;if(receipt.actor_id!==actor||JSON.stringify(receipt.payload)!==JSON.stringify(payload)){
  // JSONB não preserva ordem de chaves.
  if(receipt.actor_id!==actor||Object.keys(payload).some(k=>receipt.payload[k]!==payload[k as keyof typeof payload]))throw new MarketplaceError(409,'stock_sync_key','Tentativa já utilizada com outros dados.');
 }return receipt.result;}
 const reviewed=await db.from('marketplace_stock_sync_reviews').select('*').eq('empresa_id',company).eq('actor_id',actor).eq('id',input.reviewId).maybeSingle();
 if(reviewed.error||!reviewed.data||Date.now()-Date.parse(reviewed.data.created_at)>300000)throw new MarketplaceError(409,'stock_review_expired','Consulte os saldos novamente; a conferência expirou.');
 const product=await syncProduct(db,company,reviewed.data.product_id);
 if(product.revision!==reviewed.data.revision)throw new MarketplaceError(409,'stock_changed','O saldo local mudou. Consulte novamente.');
 const blocker=await stockIncreaseBlocker(db,company,product.id);
 if(blocker)throw new MarketplaceError(409,blocker,'Há pedidos ou vendas aguardando conferência. Atualize os avisos antes de sincronizar.');
 const sources=reviewed.data.sources as StockSyncSource[];
 if(product.links.length!==sources.length||sources.some(source=>!product.links.some(link=>link.id===source.id&&link.provider===source.provider&&link.provider_listing_id===source.listingId&&(!source.connectionId||source.connectionId===link.connection_id))))throw new MarketplaceError(409,'stock_source_changed','Os vínculos do produto mudaram. Consulte os saldos novamente.');
 if(!sources.some(s=>s.eligible)||sources.some(s=>['mercado_livre','magalu'].includes(s.provider)&&!s.eligible&&!['closed','deleted'].includes(s.status)))throw new MarketplaceError(409,'stock_source_incomplete','Conclua a conferência dos anúncios vinculados antes de sincronizar.');
 // Uma venda ou edição externa ocorrida depois da revisão exige nova confirmação.
 await Promise.all(sources.filter(s=>s.eligible).map(async source=>{
  const link=product.links.find(l=>l.id===source.id);
  if(!link)throw new MarketplaceError(409,'stock_source_missing','Um vínculo mudou. Consulte os saldos novamente.');
  const current=await readStockSource(db,company,link);
  if(!current.eligible||current.quantity!==source.quantity||current.status!==source.status)throw new MarketplaceError(409,'remote_stock_changed','O saldo ou a situação de um anúncio mudou. Consulte novamente antes de sincronizar.');
 }));
 if(input.direction==='listing_to_local'){
  const source=sources.find(s=>s.id===input.sourceId&&s.eligible),link=product.links.find(l=>l.id===input.sourceId);
  if(!source||!link)throw new MarketplaceError(409,'stock_source_missing','Selecione um anúncio vinculado elegível.');
 }
 const result=await db.rpc('marketplace_stock_sync_command',{p_empresa:company,p_actor:actor,p_key:input.requestKey,p_payload:payload});
 if(result.error)throw new MarketplaceError(result.error.code==='P0001'?409:503,'stock_sync_command',result.error.code==='P0001'?result.error.message:'Não foi possível confirmar. Repita a mesma tentativa, sem trocar os dados.');
 return result.data;
}
