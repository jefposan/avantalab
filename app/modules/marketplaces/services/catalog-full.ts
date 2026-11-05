import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getLocalProduct} from './local-products';
import {loadConnection} from './mercadolivre-management';
import {identifyMercadoLivreCatalog} from './mercadolivre-catalog';
import {validEan} from './catalog-publication';
import {object,rows,pictureId,pictureUrl} from '../listing-content';
import {assertCompletionIdentity,catalogTechnicalFact,catalogEanConfirmed,type CatalogCompletionSource} from '../catalog-completion';
import {MarketplaceError} from './management-access';
import {catalogPhotoFromUrl,uniqueCatalogPhotos} from '../catalog-photos';
import {verifyCatalogPhoto} from './catalog-photo-receipt';
export async function previewFullCatalog(db:SupabaseClient,company:string,id:unknown){
 const product=await getLocalProduct(db,company,id);
 if(!validEan(product.ean)||product.publication_form.condition&&product.publication_form.condition!=='new')throw new MarketplaceError(409,'catalog_identity','Confirme o EAN e a condição nova antes de usar uma ficha de catálogo.');
 const accounts=await db.from('marketplace_connections').select('id').eq('empresa_id',company).eq('provider','mercado_livre').eq('status','connected').order('id').limit(1);
 if(accounts.error||!accounts.data?.length)throw new MarketplaceError(409,'catalog_account','Conecte uma conta do Mercado Livre para consultar a ficha.');
 const connection=await loadConnection(db,company,accounts.data[0].id);
 const result=await identifyMercadoLivreCatalog(db,connection,{ean:product.ean,...(product.catalog_product_id?{productId:product.catalog_product_id}:{})});
 if(result.status!=='found'||!result.product)throw new MarketplaceError(409,'catalog_ambiguous','Não foi encontrada uma ficha única e confirmada para este EAN.');
 if(!catalogEanConfirmed(result,product.ean))throw new MarketplaceError(409,'catalog_ean','A ficha não confirmou o EAN exato.');
 const source:CatalogCompletionSource={id:result.product.id,name:result.product.name,ean:product.ean!,description:result.product.description,
  attributes:rows(result.product.raw.attributes).filter(a=>typeof a.id==='string'&&catalogTechnicalFact(a.id)&&rows(a.values).length<2).map(a=>({id:String(a.id),name:String(a.name||a.id),value:String(a.value_name||rows(a.values)[0]?.name||''),...(typeof a.value_id==='string'?{valueId:a.value_id}:{})})).filter(a=>/^[A-Z0-9_]{1,80}$/.test(a.id)&&a.name.length<=120&&a.value.trim()&&a.value.length<=1000).slice(0,100),
  pictures:rows(result.product.raw.pictures).flatMap(p=>{const url=pictureUrl(p.secure_url||p.url);return pictureId(p.id)&&url?[{id:String(p.id),url}]:[];}).slice(0,12)};
 const attrs=[...product.attributes,...Object.entries(product.publication_form.attributes||{}).filter(([key])=>!product.attributes.some(a=>a.id===key&&a.value.trim())).map(([key,value])=>{const a=source.attributes.find(a=>a.id===key);return{id:key,name:key,value:a?.valueId===value?a.value:value,...(a?.valueId===value?{valueId:value}:{})};})];
 assertCompletionIdentity(product.ean,attrs,source,product.name);
 if(!source.name?.trim()||source.name.length>220||source.description.length>50000)throw new MarketplaceError(409,'catalog_content','A ficha não retornou conteúdo válido para esta atualização.');
 const fingerprint=createHash('sha256').update(JSON.stringify({product:product.id,revision:product.revision,source})).digest('hex');
 return {productId:product.id,revision:product.revision,fingerprint,connectionId:connection.id,source,before:{name:product.name,description:product.description,pictures:product.pictures,attributes:product.attributes},pictures:uniqueCatalogPhotos([...source.pictures,...product.pictures.map(catalogPhotoFromUrl)])};
}
export async function confirmFullCatalog(db:SupabaseClient,company:string,actor:string,body:unknown){
 const input=object(body);
 if(input.confirm!==true||!Number.isSafeInteger(input.revision)||typeof input.fingerprint!=='string')throw new MarketplaceError(400,'catalog_confirmation','Confira a prévia e confirme a atualização.');
 const preview=await previewFullCatalog(db,company,input.productId);
 if(preview.revision!==input.revision||preview.fingerprint!==input.fingerprint)throw new MarketplaceError(409,'catalog_changed','O cadastro ou a ficha mudou. Abra uma nova prévia antes de confirmar.');
 if(input.photoMode==='catalog'){
  if(!preview.source.pictures.length)throw new MarketplaceError(400,'catalog_photos','O catálogo não tem fotos. Personalize para adicionar.');
  preview.source.photoMode='catalog';
 }else if(input.photoMode==='custom'){
  if(!Array.isArray(input.photos)||!input.photos.length||input.photos.length>12)throw new MarketplaceError(400,'catalog_photos','Selecione entre 1 e 12 fotos.');
  try{
   const allowed=uniqueCatalogPhotos([...preview.source.pictures,...preview.before.pictures.map(catalogPhotoFromUrl)],100);
   preview.source.pictures=input.photos.map(raw=>{const photo=object(raw);if(photo.receipt)return verifyCatalogPhoto({company,actor,product:preview.productId},photo.receipt);const known=allowed.find(p=>p.url===photo.url&&p.id===photo.id);if(!known?.id||!pictureId(known.id)||!pictureUrl(known.url))throw Error('Adicione novamente a foto sem confirmação.');return{id:known.id,url:known.url};});
   if(uniqueCatalogPhotos(preview.source.pictures).length!==preview.source.pictures.length)throw Error('Remova as fotos repetidas.');
   preview.source.photoMode='custom';
  }catch(e){throw new MarketplaceError(400,'catalog_photos',e instanceof Error?e.message:'Fotos inválidas.');}
 }else if(input.photoMode!==undefined)throw new MarketplaceError(400,'catalog_photos','Escolha como importar as fotos.');
 const result=await db.rpc('marketplace_catalog_confirm_full',{p_company:company,p_actor:actor,p_product:preview.productId,p_revision:preview.revision,p_source:preview.source});
 if(result.error)throw new MarketplaceError(409,'catalog_queue','Existe uma atualização em andamento ou o cadastro mudou. Aguarde e confira a nova prévia.');
 return {queued:true};
}
