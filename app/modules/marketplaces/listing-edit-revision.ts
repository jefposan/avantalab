import type {ListingEditor} from './listing-editor';

/** Horário de consulta, textos auxiliares e estimativas não são alterações publicáveis.
 * Mantém identidade, permissões e valores editáveis na conferência sob bloqueio. */
export function individualListingRevisionState(connection:string,item:Record<string,unknown>,editor:Omit<ListingEditor,'revision'>){
 const keys=['title','price','listingType','stock','description'] as const;
 return {
  connection,id:editor.id,seller:item.seller_id,currency:editor.currency,
  category:item.category_id,buyingMode:item.buying_mode,condition:item.condition,
  userProduct:item.user_product_id??null,catalog:item.catalog_listing,status:item.status,
  subStatus:Array.isArray(item.sub_status)?[...item.sub_status].sort():[],
  values:Object.fromEntries(keys.filter(key=>editor.fields[key].editable).map(key=>[key,editor.values[key]])),
  fields:Object.fromEntries(keys.map(key=>{const rule=editor.fields[key];return [key,{editable:rule.editable,maxLength:rule.maxLength,min:rule.min,max:rule.max}];})),
  listingTypes:editor.fields.listingType.editable?editor.listingTypes.map(option=>option.id).sort():[],
 };
}

/** A edição comum não envia preço/estoque nem as estimativas de tarifa.
 * Metadados de consulta não representam uma alteração nos campos publicados. */
export function commonListingRevisionState(connection:string,item:Record<string,unknown>,editor:Omit<ListingEditor,'revision'>){
 const fields=['title','description','listingType'] as const;
 return {
  connection,id:editor.id,seller:item.seller_id,currency:editor.currency,
  userProduct:item.user_product_id??null,catalog:item.catalog_listing,status:item.status,
  subStatus:Array.isArray(item.sub_status)?[...item.sub_status].sort():[],
  values:Object.fromEntries(fields.map(key=>[key,editor.values[key]])),
  fields:Object.fromEntries(fields.map(key=>{const rule=editor.fields[key];return [key,{editable:rule.editable,maxLength:rule.maxLength,min:rule.min,max:rule.max}];})),
  listingTypes:editor.listingTypes.map(option=>option.id).sort(),
 };
}
