import type {LocalProduct,LocalProductLink} from './services/local-product-model';
import type {ListingChanges,ListingEditor,ListingEditValues} from './listing-editor';
export type LocalListingField='name'|'description'|'price_cents'|'ean'|'pictures'|'category_id';
export type ListingUpdateRequest={id:string;productId:string;fields:LocalListingField[]};
/** Só uma edição local concluída dispara a pergunta; quantidade tem fluxo próprio. */
export function changedProductListingFields(before:LocalProduct,command:Record<string,unknown>):LocalListingField[]{
 const fields:LocalListingField[]=[];
 for(const [local,input]of [['name','name'],['description','description'],['ean','ean'],['pictures','pictures'],['category_id','categoryId']]as const){
  if(Object.hasOwn(command,input)&&JSON.stringify(before[local]??'')!==JSON.stringify(command[input]??''))fields.push(local);
 }
 if(Object.hasOwn(command,'price')&&before.price_cents!==(typeof command.price==='number'?Math.round(command.price*100):null))fields.push('price_cents');
 return fields;
}
export function proposedListingChanges(product:LocalProduct,fields:LocalListingField[],kind:'data'|'price',useReference:boolean):ListingChanges{
 if(kind==='price')return useReference&&product.price_cents!=null&&product.price_cents>0?{price:product.price_cents/100}:{};
 return {...(fields.includes('name')?{title:product.name}:{}),...(fields.includes('description')?{description:product.description}:{})};
}
export function seedListingValues(editor:ListingEditor,suggestion?:ListingChanges):{values:ListingEditValues;notice:string}{
 const values={...editor.values},blocked:string[]=[];
 for(const field of ['title','description','price']as const){
  if(!suggestion||!Object.hasOwn(suggestion,field))continue;
  if(!editor.fields[field].editable){blocked.push(editor.fields[field].reason||`${field}: edição indisponível neste anúncio.`);continue;}
  if(field==='price')values.price=suggestion.price??null;
  else values[field]=suggestion[field]??'';
 }
 return {values,notice:blocked.join(' ')};
}
export function productListingUrl(link:Pick<LocalProductLink,'provider'|'source_snapshot'>):string|null{
 try{const url=new URL(String(link.source_snapshot?.permalink||''));if(url.protocol!=='https:'||url.username||url.password)return null;
  const domains=link.provider==='mercado_livre'?['mercadolivre.com.br']:link.provider==='magalu'?['magazineluiza.com.br','magalu.com']:[];
  return domains.some(domain=>url.hostname===domain||url.hostname.endsWith('.'+domain))?url.toString():null;
 }catch{return null;}
}
