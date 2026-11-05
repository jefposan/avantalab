import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadConnection} from './mercadolivre-management';
import {identifyMercadoLivreCatalog} from './mercadolivre-catalog';
import {catalogGtins,validEan} from './catalog-publication';
import {pictureId,pictureUrl,rows} from '../listing-content';

/** A mesma consulta por EAN do cadastro: nunca pesquisa imagens por nome aproximado. */
export async function qualityCatalogPictures(db:SupabaseClient,company:string,connectionId:string,ean:unknown){
 const code=validEan(ean);if(!code)return [];
 const connection=await loadConnection(db,company,connectionId);
 const result=await identifyMercadoLivreCatalog(db,connection,{ean:code});
 if(result.status!=='found'||!result.product||!catalogGtins(result.product.raw.attributes).some(value=>value.replace(/^0+/,'')===code.replace(/^0+/,'')))return [];
 return rows(result.product.raw.pictures).flatMap(p=>{const url=pictureUrl(p.secure_url||p.url);return pictureId(p.id)&&url?[{id:String(p.id),url}]:[];}).slice(0,12);
}
