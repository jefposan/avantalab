import 'server-only';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {uuidIsValid} from './listing-model';
import {validateProductPost,postPrimaryColor,type ProductPostDraft} from '../product-post';
const BUCKET='marketplace-product-posts';
const columns='id,empresa_id,product_id,revision,draft,image_path,source_path,content_hash,created_at,created_by';
type Row={id:string;empresa_id:string;product_id:string;revision:number;draft:Omit<ProductPostDraft,'image'>;image_path:string;source_path:string;content_hash:string;created_at:string;created_by:string};
const fail=()=>new MarketplaceError(503,'post_unavailable','Não foi possível acessar o post. Tente novamente.');
export async function postProduct(db:SupabaseClient,company:string,input:{productId?:unknown;historyId?:unknown}){
 let id=input.productId;
 if(!id&&input.historyId){
  if(!uuidIsValid(input.historyId))throw new MarketplaceError(400,'invalid_history','Selecione um produto válido.');
  const h=await db.from('marketplace_price_consultations').select('local_product_id').eq('empresa_id',company).eq('id',input.historyId).maybeSingle();
  if(h.error)throw fail();id=h.data?.local_product_id;
 }
 if(!uuidIsValid(id))throw new MarketplaceError(400,'invalid_product','Selecione um produto cadastrado para salvar o post.');
 const p=await db.from('marketplace_products').select('id,name').eq('empresa_id',company).eq('id',id).is('archived_at',null).maybeSingle();
 if(p.error)throw fail();if(!p.data)throw new MarketplaceError(404,'product_missing','Produto não encontrado nesta empresa.');return p.data;
}
export async function readProductPost(db:SupabaseClient,company:string,product:string){
 const r=await db.from('marketplace_product_posts').select(columns).eq('empresa_id',company).eq('product_id',product).order('revision',{ascending:false}).limit(1).maybeSingle();
 if(r.error)throw fail();return r.data as Row|null;
}
export async function postForClient(db:SupabaseClient,row:Row){
 const prefix=`${row.empresa_id}/${row.product_id}/${row.id}/`;
 if(row.image_path!==prefix+'post.png'||row.source_path!==prefix+'source.jpg')throw fail();
 const urls=await db.storage.from(BUCKET).createSignedUrls([row.image_path,row.source_path],300);
 if(urls.error||!urls.data?.[0]?.signedUrl||!urls.data?.[1]?.signedUrl)throw fail();
 return {id:row.id,productId:row.product_id,revision:row.revision,draft:row.draft,imageUrl:urls.data[0].signedUrl,sourceUrl:urls.data[1].signedUrl};
}
export function normalizePostDraft(raw:unknown):Omit<ProductPostDraft,'image'>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new MarketplaceError(400,'invalid_post','Confira os dados do post.');
 const d=raw as Record<string,unknown>;
 for(const key of ['company','name','description','voltage','condition','details','primaryColor'])if(typeof d[key]!=='string')throw new MarketplaceError(400,'invalid_post','Confira os campos do post.');
 const normalized={company:String(d.company).trim().slice(0,220),name:String(d.name).trim().slice(0,220),description:String(d.description).trim(),voltage:String(d.voltage),condition:String(d.condition),details:String(d.details).trim(),primaryColor:postPrimaryColor(d.primaryColor),priceCents:d.priceCents as number,originalPriceCents:d.originalPriceCents as number};
 const invalid=validateProductPost({...normalized,image:'stored'});
 if(invalid||!normalized.company||!normalized.name)throw new MarketplaceError(400,'invalid_post',invalid?.message||'Confira o nome do produto e perfil.');return normalized;
}
async function normalizedImage(file:File,kind:'post'|'source'){
 const bytes=Buffer.from(await file.arrayBuffer());
 try{
  const photo=sharp(bytes,{limitInputPixels:3_000_000,animated:false}),meta=await photo.metadata();
  if(kind==='post'){
   if(meta.format!=='png'||meta.width!==1080||meta.height!==1350)throw Error('size');
   return await photo.png().toBuffer();
  }
  if(!['jpeg','png','webp'].includes(meta.format||'')||!meta.width||!meta.height)throw Error('format');
  return await photo.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer();
 }catch{throw new MarketplaceError(400,'invalid_photo','A foto não pôde ser lida. Escolha outra e gere o post novamente.');}
}
async function uploadOnce(db:SupabaseClient,path:string,bytes:Buffer,type:string){
 const result=await db.storage.from(BUCKET).upload(path,bytes,{contentType:type,upsert:false});
 if(!result.error)return;
 // Repetição após resposta perdida: arquivo imutável precisa ser exatamente igual.
 if(String(result.error.statusCode)==='409'||/already exists|duplicate/i.test(result.error.message)){
  const old=await db.storage.from(BUCKET).download(path);
  if(!old.error&&old.data&&Buffer.from(await old.data.arrayBuffer()).equals(bytes))return;
  throw new MarketplaceError(409,'post_attempt_used','Esta tentativa já contém outra imagem. Feche e abra o post novamente.');
 }
 throw fail();
}
export async function saveProductPost(db:SupabaseClient,company:string,product:string,actor:string,input:{draft:unknown;image:File;source:File;requestKey:unknown;revision:unknown}){
 if(!uuidIsValid(input.requestKey)||!Number.isSafeInteger(input.revision)||Number(input.revision)<0)throw new MarketplaceError(400,'invalid_revision','Reabra o post antes de salvar.');
 if(!input.image.size||!input.source.size||input.image.size+input.source.size>3_500_000)throw new MarketplaceError(413,'post_too_large','A foto é muito grande. Escolha uma foto menor.');
 const draft=normalizePostDraft(input.draft),image=await normalizedImage(input.image,'post'),source=await normalizedImage(input.source,'source');
 if(image.length>3_145_728||source.length>3_145_728)throw new MarketplaceError(413,'post_too_large','Escolha uma foto menor e gere o post novamente.');
 const hash=createHash('sha256').update(JSON.stringify(draft)).update(image).update(source).digest('hex'),prefix=`${company}/${product}/${input.requestKey}`;
 const existing=await db.from('marketplace_product_posts').select(columns).eq('empresa_id',company).eq('id',input.requestKey).maybeSingle();
 if(existing.error)throw fail();
 if(existing.data){if(existing.data.content_hash!==hash||existing.data.product_id!==product||existing.data.created_by!==actor)throw new MarketplaceError(409,'post_attempt_used','Esta tentativa já foi usada com outros dados. Reabra o post.');return existing.data as Row;}
 // Antes de subir arquivos, recusa edição obsoleta. A RPC repete a checagem sob trava.
 const current=await readProductPost(db,company,product);
 if((current?.revision||0)!==input.revision)throw new MarketplaceError(409,'post_changed','Outro usuário atualizou o post. Feche e abra novamente antes de editar.');
 await uploadOnce(db,prefix+'/post.png',image,'image/png');await uploadOnce(db,prefix+'/source.jpg',source,'image/jpeg');
 const saved=await db.rpc('marketplace_product_post_save',{p_empresa:company,p_product:product,p_actor:actor,p_request:input.requestKey,p_revision:input.revision,p_draft:draft,p_hash:hash});
 if(saved.error)throw new MarketplaceError(saved.error.code==='P0001'?409:503,'post_save_failed',saved.error.code==='P0001'?saved.error.message:'Não foi possível confirmar o salvamento. Tente salvar novamente.');
 return saved.data as Row;
}
