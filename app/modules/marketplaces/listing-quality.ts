import type { EditField } from './listing-editor';

export type QualityGoal = { id:string; title:string; group:string; warning:boolean; completed:boolean; link:string|null; field:EditField|null };
export type ListingQuality = { entityId:string; entityType:'ITEM'|'USER_PRODUCT'; score:number|null; level:string; calculatedAt:string|null; goals:QualityGoal[] };
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=1000)=>typeof v==='string'?v.trim().slice(0,max):'';
export function qualityActionUrl(value:unknown):string|null {
 try { const url=new URL(text(value,2000));return url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='mercadolivre.com.br'||url.hostname.endsWith('.mercadolivre.com.br'))?url.href:null; } catch {return null;}
}
/** Only known editor capabilities; unknown/technical/photo/stock objectives never mutate local data. */
export function qualityEditField(key:string):EditField|null {
 if (/^(UP_)?TITLE($|_)/.test(key))return 'title';
 if (/^(UP_)?DESCRIPTION($|_)/.test(key))return 'description';
 if (/^(UP_)?PRICE($|_)/.test(key))return 'price';
 if (/^(UP_)?(LISTING_TYPE|UPGRADE_LISTING)($|_)/.test(key))return 'listingType';
 return null;
}
export function normalizeListingQuality(value:unknown,entityId:string,entityType:'ITEM'|'USER_PRODUCT'):ListingQuality {
 const data=record(value);
 if(data.entity_id!==entityId||data.entity_type!==entityType||!Array.isArray(data.buckets))throw new Error('Resposta de qualidade inválida ou de outro anúncio.');
 const goals:QualityGoal[]=[];const seen=new Set<string>();
 for(const rawBucket of data.buckets.slice(0,30)){
  const bucket=record(rawBucket);
  for(const rawVariable of (Array.isArray(bucket.variables)?bucket.variables:[]).slice(0,100)){
   const variable=record(rawVariable),rules=Array.isArray(variable.rules)?variable.rules:[];
   for(const rawRule of (rules.length?rules:variable.status==='PENDING'?[variable]:[]).slice(0,100)){
    const rule=record(rawRule),wordings=record(rule.wordings),key=text(rule.key,150),id=`${text(bucket.key,150)}:${text(variable.key,150)}:${key}`;
    if(!key||seen.has(id)||!['PENDING','COMPLETED'].includes(String(rule.status)))continue;
    seen.add(id);goals.push({id,title:text(wordings.title)||text(variable.title)||'Objetivo informado pelo Mercado Livre',group:text(variable.title)||text(bucket.title)||'Qualidade do anúncio',warning:rule.mode==='WARNING',completed:rule.status==='COMPLETED',link:qualityActionUrl(wordings.link),field:qualityEditField(key)});
   }
  }
 }
 const score=typeof data.score==='number'&&Number.isFinite(data.score)&&data.score>=0&&data.score<=100?data.score:null;
 const rawLevel=text(data.level_wording)||text(data.level);
 const level=({Good:'Profissional',Medium:'Satisfatória',Bad:'Básica',Profesional:'Profissional',Estándar:'Satisfatória',Básica:'Básica'} as Record<string,string>)[rawLevel]||rawLevel||'Classificação não informada';
 const calculated=text(data.calculated_at,100);
 return {entityId,entityType,score,level,calculatedAt:calculated&&!Number.isNaN(Date.parse(calculated))?calculated:null,goals};
}
