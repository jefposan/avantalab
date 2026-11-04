import 'server-only';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {ListingEditor} from '../listing-editor';
import {validateChanges} from '../listing-editor';
import {objectValue,uuidIsValid} from './listing-model';
import {MarketplaceError} from './management-access';
import type {MagaluConnection} from './magalu-request';
import {readMagaluListing,manageMagaluListing} from './magalu-listings';
import type {ListingSnapshot} from './listing-model';
import type {SaveListingInput} from './listing-edit-adapters';
export async function readMagaluEditor(db:SupabaseClient,connection:MagaluConnection,id:unknown):Promise<ListingEditor>{
 if(typeof id!=='string')throw new MarketplaceError(400,'invalid_item','Selecione um SKU.');
 const {listing}=await readMagaluListing(db,connection,id);
 return magaluEditorSnapshot(connection,listing);
}
export function magaluEditorSnapshot(connection:MagaluConnection,listing:ListingSnapshot):ListingEditor{
 const id=listing.id,canSku=connection.scopes.includes('open:portfolio-skus-seller:write'),canPrice=connection.scopes.includes('open:portfolio-prices-seller:write')&&listing.price!=null;
 const values={title:listing.title,description:listing.description||'',price:listing.price,stock:listing.stock,listingType:'Magalu'};
 const fields:ListingEditor['fields']={title:{editable:canSku,maxLength:150,...(!canSku?{reason:'Reautorize a mesma loja para editar SKUs.'}:{})},description:{editable:canSku,maxLength:7000,...(!canSku?{reason:'Reautorize a mesma loja para editar SKUs.'}:{})},price:{editable:canPrice,min:.01,max:999999.99,...(!canPrice?{reason:'Consulte o preço e confira a permissão de escrita.'}:{})},stock:{editable:false,reason:'Ajuste o estoque Online do cadastro e use Conferir saldos para sincronizar.'},listingType:{editable:false,reason:'Magalu não utiliza os tipos de anúncio Clássico/Premium do Mercado Livre.'}};
 const revision=createHash('sha256').update(JSON.stringify({id,values,fields,status:listing.status,updatedAt:listing.updatedAt})).digest('hex');
 return{provider:'magalu',id,revision,currency:'BRL',values,fields,listingTypes:[]};
}
export async function saveMagaluEditor(db:SupabaseClient,connection:MagaluConnection,actor:string,input:SaveListingInput){
 if(!uuidIsValid(input.requestKey)||typeof input.revision!=='string'||!/^[a-f0-9]{64}$/.test(input.revision))throw new MarketplaceError(400,'invalid_edit','Reabra a edição deste SKU.');
 const existing=await db.from('marketplace_listing_actions').select('request_payload,actor_id,connection_id,provider_listing_id').eq('empresa_id',connection.empresa_id).eq('request_key',input.requestKey).maybeSingle();
 if(existing.error)throw new MarketplaceError(503,'database','Não foi possível conferir a tentativa.');
 if(existing.data){const payload=objectValue(existing.data.request_payload);if(existing.data.actor_id!==actor||existing.data.connection_id!==connection.id||existing.data.provider_listing_id!==input.id||!isDeepStrictEqual(payload.editorChanges,input.changes))throw new MarketplaceError(409,'duplicate_edit','Esta tentativa já foi utilizada com outros dados.');return manageMagaluListing(db,connection,actor,{...payload,id:input.id,confirmation:input.id,requestKey:input.requestKey});}
 const editor=await readMagaluEditor(db,connection,input.id);
 if(editor.revision!==input.revision)throw new MarketplaceError(409,'edit_conflict','O SKU ou suas permissões mudaram. Recarregue antes de salvar; os campos foram preservados.');
 const {changes,errors}=validateChanges(editor,input.changes);if(Object.keys(errors).length)throw new MarketplaceError(400,'invalid_fields',Object.values(errors).join(' '),errors);
 if(changes.price!==undefined&&(changes.title!==undefined||changes.description!==undefined))throw new MarketplaceError(400,'magalu_separate_operations','O Magalu processa ficha e preço separadamente. Salve título/descrição antes de alterar o preço.');
 const action=changes.price!==undefined?'price':'edit';
 return manageMagaluListing(db,connection,actor,{id:input.id,confirmation:input.id,requestKey:input.requestKey,action,editorChanges:input.changes,...(action==='price'?{priceCents:Math.round(changes.price!*100)}:{title:changes.title??editor.values.title,...(changes.description!==undefined?{description:changes.description}:{})}),expectedRevision:input.revision});
}
