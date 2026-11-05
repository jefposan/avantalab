import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {loadConnection,mlRequest,type SellerConnection} from './mercadolivre-management';
import {listingIdIsValid,objectValue} from './listing-model';
import {mercadoLivrePictures,validProductPictures} from '../product-photos';
import type {LabelResult} from '../shipping-label';
import {saleItemEan,normalizedSaleItems} from '../sale-items';
const text=(raw:unknown)=>typeof raw==='string'?raw.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,1200):'';
/** A venda pertence ao perfil, não à conta selecionada nem à sessão OAuth atual. */
async function savedShippingLabel(db:SupabaseClient,company:string,id:string,deadline:number):Promise<LabelResult|null>{
 const saved=await db.from('marketplace_sales').select('id,connection_id,snapshot').eq('empresa_id',company).eq('provider','mercado_livre').eq('shipment_id',id).limit(101);
 if(saved.error)throw new MarketplaceError(503,'label_database','Não foi possível conferir as vendas registradas neste perfil.');
 if(!saved.data?.length)return null;
 if(saved.data.length>100)throw new MarketplaceError(503,'label_items','O envio possui mais pedidos do que o limite de conferência. Avise a gestão.');
 const products:LabelResult['products']=[],seen=new Set<string>();
 for(const sale of saved.data){
  const snapshot=objectValue(sale.snapshot),rawItems=Array.isArray(snapshot.items)?snapshot.items:[];
  if(!rawItems.length||rawItems.length>100||rawItems.some(raw=>!text(objectValue(raw).title))||(snapshot.shipmentId!=null&&String(snapshot.shipmentId)!==id))throw new MarketplaceError(503,'label_saved_items','Venda localizada, mas os dados dos produtos precisam ser atualizados no Marketplaces.');
  const items=normalizedSaleItems(rawItems,snapshot.inventoryLines);
  for(const [index,item]of items.entries()){
   const key=item.listingId?`${sale.connection_id}:${item.listingId}:${item.variationId||''}`:`${sale.id}:${index}`;
   if(seen.has(key))continue;seen.add(key);
   let image=validProductPictures([objectValue(rawItems[index]).image],true)[0]||null,ean=saleItemEan(item.ean),detail='';
   if(listingIdIsValid(item.listingId)&&Date.now()<deadline){
    const cached=await db.from('marketplace_listings').select('snapshot').eq('empresa_id',company).eq('connection_id',sale.connection_id).eq('provider','mercado_livre').eq('provider_listing_id',item.listingId).maybeSingle();
    const listing=cached.error?{}:objectValue(cached.data?.snapshot);
    const variation=(Array.isArray(listing.variations)?listing.variations:[]).map(objectValue).find(v=>String(v.id)===item.variationId);
    image=validProductPictures(item.variationId?variation?.pictures:listing.pictures,true)[0]||image;
    ean=ean||saleItemEan(item.variationId?variation?.ean:listing.ean);
    if(item.variationId)detail=text(variation?.attributes);
   }
   products.push({description:[text(item.title),detail].filter(Boolean).join(' · '),image,ean});
  }
 }
 return{shipmentId:id,products};
}
/** Consulta de etiqueta sem importar produto, consultar preço ou movimentar estoque/venda. */
export async function readShippingLabel(db:SupabaseClient,company:string,id:unknown):Promise<LabelResult>{
 const deadline=Date.now()+40_000;
 if(typeof id!=='string'||!/^[1-9]\d{5,19}$/.test(id))throw new MarketplaceError(400,'invalid_label','Leia o QR da etiqueta Mercado Livre.');
 const saved=await savedShippingLabel(db,company,id,deadline);
 if(saved)return saved;
 const accounts=await db.from('marketplace_connections').select('id').eq('empresa_id',company).eq('provider','mercado_livre').eq('status','connected').limit(21);
 if(accounts.error)throw new MarketplaceError(503,'database','Não foi possível conferir as contas deste perfil.');
 if(!accounts.data?.length)throw new MarketplaceError(409,'connect_account','Etiqueta não encontrada nas vendas registradas deste perfil. Conecte uma conta Mercado Livre somente para buscar envios ainda não sincronizados.');
 if(accounts.data.length>20)throw new MarketplaceError(409,'account_limit','A conferência deste perfil precisa de seleção de conta. Avise a gestão.');
 let failure=false;const owners:SellerConnection[]=[];
 // Limite de concorrência. Token e dados do destinatário nunca saem do servidor.
 for(let i=0;i<accounts.data.length;i+=4){await Promise.all(accounts.data.slice(i,i+4).map(async account=>{
  try{const c=await loadConnection(db,company,account.id),shipment=objectValue(await mlRequest(db,c,`/shipments/${id}`));
   if(String(shipment.id)!==id)throw Error('shipment_identity');
   if(String(shipment.sender_id)===c.seller_reference)owners.push(c);
 }catch(e){if(!(e instanceof MarketplaceError&&e.code==='provider_404'))failure=true;}
 }));if(owners.length)break;if(Date.now()>deadline-10_000){failure=true;break;}}
 if(!owners.length)throw new MarketplaceError(failure?503:404,failure?'label_unavailable':'label_not_found',failure?'Não foi possível conferir esta etiqueta agora. Feche e tente novamente.':'Etiqueta não encontrada nas contas conectadas deste perfil.');
 const connection=owners[0];
 const response=await mlRequest(db,connection,`/shipments/${id}/items`);
 if(!Array.isArray(response)||!response.length||response.length>50)throw new MarketplaceError(503,'label_items','O Mercado Livre não confirmou os produtos desta etiqueta.');
 const rows=response.map(objectValue);
 if(rows.some(row=>!listingIdIsValid(row.item_id)||(row.sender_id!=null&&String(row.sender_id)!==connection.seller_reference)||!text(row.description)))throw new MarketplaceError(503,'label_identity','Não foi possível confirmar os produtos desta etiqueta nesta conta.');
 const products:LabelResult['products']=[],seen=new Set<string>();
 for(const row of rows){
  const key=`${row.item_id}:${row.variation_id??''}`;if(seen.has(key))continue;seen.add(key);
  if(Date.now()>deadline){products.push({description:text(row.description),image:null,ean:null});continue;}
  const cached=await db.from('marketplace_listings').select('snapshot').eq('empresa_id',company).eq('connection_id',connection.id).eq('provider','mercado_livre').eq('provider_listing_id',row.item_id).maybeSingle();
  const snapshot=cached.error?{}:objectValue(cached.data?.snapshot);
  const variation=(Array.isArray(snapshot.variations)?snapshot.variations:[]).map(objectValue).find(v=>String(v.id)===String(row.variation_id));
  let detail=text(variation?.attributes),image=row.variation_id?null:validProductPictures(snapshot.pictures,true)[0]||null,ean=saleItemEan(row.variation_id?variation?.ean:snapshot.ean);
  if((!image||!ean||row.variation_id)&&Date.now()<deadline-10_000){try{const item=objectValue(await mlRequest(db,connection,`/items/${row.item_id}`));if(item.id===row.item_id&&String(item.seller_id)===connection.seller_reference){if(!row.variation_id)image=mercadoLivrePictures(item)[0]||image;const v=(Array.isArray(item.variations)?item.variations:[]).map(objectValue).find(v=>String(v.id)===String(row.variation_id)),pictureIds=v?.picture_ids;if(v&&Array.isArray(pictureIds)&&Array.isArray(item.pictures)){const pictures=item.pictures.map(objectValue).filter(p=>pictureIds.includes(p.id));image=mercadoLivrePictures({pictures})[0]||null;}if(v)detail=(Array.isArray(v.attribute_combinations)?v.attribute_combinations:[]).map(objectValue).map(a=>[text(a.name),text(a.value_name)].filter(Boolean).join(': ')).filter(Boolean).join(' · ')||detail;
   const attrs=row.variation_id?v?.attributes:item.attributes;
   ean=(Array.isArray(attrs)?attrs:[]).map(objectValue).filter(a=>a.id==='GTIN'||a.id==='EAN').map(a=>saleItemEan(a.value_name)).find(Boolean)||ean;
  }}catch{/* Sem foto/EAN não substitui produto nem tenta associação por nome/SKU. */}}
  products.push({description:[text(row.description),detail].filter(Boolean).join(' · '),image,ean});
 }
 return{shipmentId:id,products};
}
