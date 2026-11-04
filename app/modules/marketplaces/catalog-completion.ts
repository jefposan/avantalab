import {attributeChanges,type ContentEditor} from './listing-content.ts';
import {validEan,catalogGtins} from './services/catalog-publication.ts';

export type CatalogFact={id:string;name:string;value:string;valueId?:string};
export type CatalogCompletionSource={id:string;name?:string;ean:string;description:string;attributes:CatalogFact[];pictures:{id:string;url:string}[];photoMode?:'catalog'|'custom'};
/** O detalhe pode omitir GTIN; aceitar a prova da busca exata, nunca uma busca por nome. */
export function catalogEanConfirmed(result:{status:string;identifierEvidence?:{ean:string;productId:string};product?:{id:string;raw:Record<string,unknown>}},ean:unknown){
 const code=validEan(ean);if(!code||result.status!=='found'||!result.product)return false;
 const same=(value:string)=>value.replace(/^0+/,'')===code.replace(/^0+/,'');
 const gtins=catalogGtins(result.product.raw.attributes);
 if(gtins.length)return gtins.some(same);
 return result.identifierEvidence?.productId===result.product.id&&!!validEan(result.identifierEvidence.ean)&&same(result.identifierEvidence.ean);
}
/** Dados comerciais, identidade de estoque e embalagem de envio pertencem ao vendedor. */
export const catalogTechnicalFact=(id:string)=>! /^(GTIN|EAN|SELLER_|PACKAGE_|WARRANTY|SALE_|PRICE|STOCK|AVAILABLE_QUANTITY|SHIPPING|DELIVERY|LISTING_TYPE|ITEM_CONDITION|CONDITION)/.test(id);
export function catalogFirstPictures(current:{id?:string;url:string}[],source:CatalogCompletionSource,max:number){
 const pictures:{id?:string;url:string}[]=[];
 for(const photo of [...source.pictures,...current]){
  if(pictures.length>=max)break;
  if(!pictures.some(p=>p.id&&p.id===photo.id||p.url===photo.url||photo.id&&p.url.includes(photo.id)))pictures.push(photo);
 }
 return pictures;
}
const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const identity=/^(BRAND|MODEL|MPN|COLOR|SIZE|VOLTAGE|CAPACITY|TOTAL_CAPACITY|MEMORY_CAPACITY|STORAGE_CAPACITY|OPERATING_VOLTAGE)$/;
/** Um valor local diferente também impede importar outra versão para o anúncio. */
export function compatibleCatalogSource(source:CatalogCompletionSource,attributes:CatalogFact[],description:string){
 return {...source,description:description.trim()&&description.trim()!==source.description.trim()?'':source.description,
  attributes:source.attributes.filter(fact=>{const local=attributes.find(a=>a.id===fact.id&&(a.value.trim()||a.valueId));return !local||(local.valueId&&fact.valueId?local.valueId===fact.valueId:normalize(local.value)===normalize(fact.value)||local.value===fact.valueId);}),
 };
}
export function assertCompletionIdentity(ean:unknown,attributes:CatalogFact[],source:CatalogCompletionSource,name=''){
 const code=validEan(ean);
 if(!code||code.replace(/^0+/,'')!==source.ean.replace(/^0+/,''))throw Error('EAN não confirmado para complementar este produto.');
 const volts=(value:string)=>[...value.matchAll(/\b(\d{2,3})\s*v(?:olts?)?\b/gi)].map(m=>m[1]);
 const catalogVolts=volts([source.name,...source.attributes.filter(a=>/VOLTAGE/.test(a.id)).map(a=>a.value)].join(' '));
 if(volts(name).some(v=>!catalogVolts.includes(v)))throw Error('A voltagem do nome não foi confirmada na ficha do catálogo.');
 for(const current of attributes.filter(a=>identity.test(a.id)&&a.value.trim())){
  const fact=source.attributes.find(a=>a.id===current.id);
  if(!fact)throw Error(`A variante ${current.name||current.id} não foi confirmada no catálogo.`);
  if(fact&&(current.valueId&&fact.valueId?current.valueId!==fact.valueId:normalize(current.value)!==normalize(fact.value)))throw Error(`Variante divergente em ${current.name||current.id}. Confira o cadastro e a ficha do catálogo.`);
 }
}
/** Fotos atuais e capa nunca saem; compara também o ID em URLs de outros tamanhos. */
export function missingCatalogPictures(current:{id?:string;url:string}[],source:CatalogCompletionSource,max:number){
 const result:{id:string;url:string}[]=[];
 for(const photo of source.pictures){
  if(current.length+result.length>=max)break;
  if([...current,...result].some(p=>p.id===photo.id||p.url===photo.url||p.url.includes(photo.id)))continue;
  result.push(photo);
 }
 return result;
}
export function missingCatalogAttributes(editor:ContentEditor,source:CatalogCompletionSource,replace=false){
 const values:Record<string,string>={};
 for(const field of editor.attributes){
  if(!field.editable||!catalogTechnicalFact(field.id)||!replace&&(field.value.trim()||field.valueId))continue;
  const fact=source.attributes.find(a=>a.id===field.id);if(!fact?.value.trim())continue;
  let value=fact.value;
  if(['list','boolean'].includes(field.type)){
   const options=field.options.filter(o=>o.id===fact.valueId||normalize(o.name)===normalize(fact.value));
   if(options.length!==1)continue;value=options[0].id;
  }
  if(field.valueId===value||field.value===value)continue;
  try{attributeChanges({...editor,attributes:[field]},{[field.id]:value});values[field.id]=value;}catch{/* Um formato não comprovado permanece preservado. */}
 }
 return values;
}
