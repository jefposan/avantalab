import {parse} from 'parse5';
import {sourceUrl} from './services/web-product-facts';
import {priceModelCodes,matchesPriceOffer} from './price-offer-identity';
import type {QualityFact} from './quality-ai';
type Node={tagName?:string;nodeName:string;value?:string;attrs?:{name:string;value:string}[];childNodes?:Node[]};
const compact=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const words=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export type QualityWebCandidate={field:string;value:string;source_url:string;evidence:string};
export type QualityIdentity={name:string;ean:string|null;brand?:string;model?:string};
/** Verifica a página lida, não apenas a URL declarada pelo modelo. Sem JS ou inferências. */
export function verifyQualityWebFacts(html:string,input:QualityIdentity,candidates:QualityWebCandidate[],url:string):QualityFact[]{
 const canonical=sourceUrl(url);if(!canonical||html.length>2_000_000)return [];
 let title='',visible='',structured='';const products:Record<string,unknown>[]=[];
 const walkJson=(value:unknown,depth=0)=>{if(depth>15||products.length>20)return;if(Array.isArray(value)){value.forEach(v=>walkJson(v,depth+1));return;}const row=obj(value);if([row['@type']].flat().some(v=>typeof v==='string'&&/(?:^|[/#])Product$/.test(v)))products.push(row);else for(const v of Object.values(row))if(v&&typeof v==='object')walkJson(v,depth+1);};
 const nodeText=(node:Node):string=>['script','style','noscript','template'].includes(node.tagName||'')?'':node.value||(node.childNodes||[]).map(nodeText).join(' ');
 const walk=(node:Node,depth=0)=>{if(depth>120)return;const tag=node.tagName;if(tag==='script'){if(node.attrs?.some(a=>a.name==='type'&&a.value==='application/ld+json'))try{walkJson(JSON.parse((node.childNodes||[]).map(n=>n.value||'').join('')));}catch{}return;}if(['style','noscript','template'].includes(tag||''))return;if(tag==='h1'&&!title)title=nodeText(node);if(node.nodeName==='#text')visible+=' '+(node.value||'');for(const child of node.childNodes||[])walk(child,depth+1);};
 walk(parse(html));
 // Várias fichas numa vitrine não comprovam características de um único produto.
 if(products.length>1)return [];
 const product=products[0];const gtins=product?['gtin','gtin8','gtin12','gtin13','gtin14'].map(k=>String(product[k]||'')).filter(Boolean):[];
 if(input.ean&&gtins.length&&!gtins.some(v=>v.replace(/^0+/,'')===input.ean!.replace(/^0+/,'')))return [];
 if(product){title=text(product.name)||title;structured=JSON.stringify(product);}
 const identity=[title,product?text(product.model):'',product?(text(product.brand)||text(obj(product.brand).name)):''].join(' ');
 const all=visible+' '+structured;
 const hasEan=!!input.ean&&(gtins.some(v=>v.replace(/^0+/,'')===input.ean!.replace(/^0+/,''))||new RegExp(`(?:^|\\D)${input.ean}(?:\\D|$)`).test(all));
 const models=input.model?[compact(input.model)]:priceModelCodes(input.name);
 const observedModels=priceModelCodes(title);
 if(models.length&&observedModels.length&&observedModels.some(model=>!models.includes(model)))return [];
 const colors=[/\b(?:branc[oa]|white)\b/i,/\b(?:pret[oa]|black)\b/i,/\b(?:prata|silver)\b/i,/\b(?:azul|blue)\b/i,/\b(?:vermelh[oa]|red)\b/i];
 const expectedColors=colors.filter(c=>c.test(input.name)),seenColors=colors.filter(c=>c.test(title));
 if(expectedColors.length&&seenColors.length&&!expectedColors.some(c=>seenColors.includes(c)))return [];
 const exactModel=models.length>0&&models.every(m=>compact(identity).includes(m))&&!!input.brand&&compact(identity).includes(compact(input.brand));
 const ignored=new Set(['para','com','sem','dos','das','cor','novo','nova','produto','original','preto','preta','branco','branca','prata']);
 const anchors=[...new Set(words(input.name).match(/[a-z]{3,}/g)||[])].filter(w=>!ignored.has(w));
 const hits=anchors.filter(w=>words(identity).includes(w)).length;
 if(!exactModel&&(hits<Math.min(2,anchors.length)||hits<anchors.length/2||!anchors.length))return [];
 if(!title||(!hasEan&&!exactModel)||!matchesPriceOffer(identity,input.name))return [];
 const corpus=words(all);
 return candidates.flatMap((candidate,i)=>{
  const quote=text(candidate.evidence),value=text(candidate.value);
  if(!value||value.length>1000||quote.length<8||quote.length>800||!corpus.includes(words(quote))||!compact(quote).includes(compact(value)))return [];
  return [{key:`web-${i}`,field:candidate.field,name:candidate.field,value,source:`Fonte consultada: ${new URL(canonical).hostname}`,sourceUrl:canonical,evidence:quote}];
 });
}
