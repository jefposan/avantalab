import { validEan, safeText, type CatalogAttribute } from './catalog-publication';

export type WebProductFacts = { ean: string | null; description: string; image: string | null; attributes: CatalogAttribute[]; sources: string[] };
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
export function sourceUrl(value: unknown): string | null {
  try { const url=new URL(String(value)); if(url.protocol!=='https:'||url.username||url.password||url.hostname==='localhost'||!url.hostname.includes('.')||/^[\d.:]+$/.test(url.hostname))return null;url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|gclid$|fbclid$|srsltid$)/i.test(key))url.searchParams.delete(key);return url.toString().slice(0,2048); } catch { return null; }
}
const identityText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

/** Dados são opcionais: fonte ausente, variante incerta ou GTIN conflitante não viram cadastro. */
export function readWebProductFacts(value: unknown, input:{ean:string|null;productName:string}, cited:readonly string[]): WebProductFacts | null {
  const product=record(value),name=safeText(product.name,220);
  if(product.exact_match!==true||!name)return null;
  const canonical=identityText(name),tokens=input.productName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g)||[];
  if(!tokens.filter(token=>token.length>2&&!['com','para','sem','dos','das','uma'].includes(token)).every(token=>canonical.includes(identityText(token))))return null;
  const allowed=new Set(cited.map(sourceUrl).filter(Boolean));
  const sources=new Set<string>();
  const proven=(raw:unknown,max:number)=>{const field=record(raw),url=sourceUrl(field.source_url),value=safeText(field.value,max);if(!url||!allowed.has(url)||!value)return '';sources.add(url);return value;};
  const rawEan=proven(product.ean,30),ean=/^\d{8,14}$/.test(rawEan)?validEan(rawEan):null;
  if(input.ean&&ean&&input.ean.replace(/^0+/,'')!==ean.replace(/^0+/,''))return null;
  const description=proven(product.description,5000),image=sourceUrl(proven(product.image,2048));
  const attributes:CatalogAttribute[]=[];
  for(const raw of (Array.isArray(product.attributes)?product.attributes:[]).slice(0,80)){
    const item=record(raw),id=safeText(item.id,80).toUpperCase(),name=safeText(item.name,120),value=proven(item,300);
    if(!/^[A-Z][A-Z0-9_]*$/.test(id)||!name||!value||['GTIN','EAN','UPC','ISBN'].includes(id)||attributes.some(a=>a.id===id))continue;
    attributes.push({id,name,value});
  }
  if(ean)attributes.push({id:'GTIN',name:'EAN',value:ean});
  return ean||description||image||attributes.length ? {ean,description,image,attributes:attributes.slice(0,80),sources:[...sources].slice(0,20)} : null;
}

/** Aceita os formatos da API ML e o formato canônico já normalizado, sem perder value. */
export function canonicalProductAttributes(value:unknown):CatalogAttribute[]{
  return (Array.isArray(value)?value:[]).slice(0,80).flatMap(raw=>{const item=record(raw),id=safeText(item.id,80).toUpperCase(),name=safeText(item.name,120)||id,value=safeText(item.value_name,300)||safeText(item.value,300);return id&&value?[{id,name,value}]:[];});
}
export function completeProductFacts<T extends {description?:string;image?:string|null;attributes?:unknown}>(product:T,facts?:WebProductFacts|null){
  const attributes=canonicalProductAttributes(product.attributes),existing=new Set(attributes.map(a=>a.id));
  return {...product,description:product.description||facts?.description||'',image:product.image||facts?.image||null,attributes:[...attributes,...(facts?.attributes||[]).filter(a=>!existing.has(a.id))].slice(0,80),...(facts?.sources.length?{sources:facts.sources}:{})};
}
