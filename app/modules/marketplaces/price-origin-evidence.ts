import { isProductOfferUrl, matchesPriceOffer } from './price-offer-identity';
import { parse } from 'parse5';
import { isValidEan } from './services/ean';

type RecordValue=Record<string,unknown>;
const record=(value:unknown):RecordValue=>value&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const types=(value:unknown)=>Array.isArray(value)?value.map(text):[text(value)];
const hasType=(value:RecordValue,type:string)=>types(value['@type']).some(t=>t.split(/[\/#]/).at(-1)===type);
const decode=(value:string)=>value.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
type HtmlNode={nodeName:string;tagName?:string;value?:string;attrs?:{name:string;value:string}[];childNodes?:HtmlNode[]};
const attribute=(node:HtmlNode,key:string)=>node.attrs?.find(attr=>attr.name===key)?.value;
const nodeText=(node:HtmlNode):string=>['script','style','noscript','template'].includes(node.tagName||'')?'':node.value||(node.childNodes||[]).map(nodeText).join(' ');
function microdataProducts(html:string){
  const products:RecordValue[]=[];
  const item=(node:HtmlNode,depth=0):RecordValue=>{
    if(depth>8)return {};
    const result:RecordValue={'@type':attribute(node,'itemtype')?.split(/[\/#]/).at(-1)};
    const add=(key:string,value:unknown)=>{if(result[key]===undefined)result[key]=value;else result[key]=Array.isArray(result[key])?[...result[key] as unknown[],value]:[result[key],value];};
    const visit=(child:HtmlNode)=>{
      if(['script','style','noscript','template'].includes(child.tagName||''))return;
      const names=(attribute(child,'itemprop')||'').split(/\s+/).filter(Boolean);
      if(attribute(child,'itemscope')!==undefined){for(const key of names)add(key,item(child,depth+1));return;}
      if(names.length){const value=attribute(child,'content')??attribute(child,'href')??attribute(child,'datetime')??nodeText(child).replace(/\s+/g,' ').trim();for(const key of names)add(key,value);}
      for(const next of child.childNodes||[])visit(next);
    };
    for(const child of node.childNodes||[])visit(child);
    return result;
  };
  const walk=(node:HtmlNode,depth=0)=>{
    if(depth>120||products.length>40||['script','style','noscript','template'].includes(node.tagName||''))return;
    const property=attribute(node,'itemprop');
    if(attribute(node,'itemscope')!==undefined&&/[/#]Product$/.test(attribute(node,'itemtype')||'')&&(!property||property==='mainEntity'))products.push(item(node));
    for(const child of node.childNodes||[])walk(child,depth+1);
  };
  walk(parse(html));return products;
}
function samePage(raw:unknown,page:string){
  if(!text(raw))return true;
  try{const a=new URL(text(raw),page),b=new URL(page);return a.origin===b.origin&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'')&&['variant','variation','variation_id','sku','idsku'].every(key=>!a.searchParams.has(key)||!b.searchParams.has(key)||a.searchParams.get(key)===b.searchParams.get(key));}catch{return false;}
}
const gtins=(value:RecordValue)=>['gtin','gtin8','gtin12','gtin13','gtin14'].flatMap(key=>{
 const code=String(value[key]??'').trim();return isValidEan(code)?[code.replace(/^0+/,'')]:[];
});
const colorGroups=[/\b(?:branc[oa]|white|bco|br)\b/i,/\b(?:pret[oa]|black|pto|pt)\b/i,/\b(?:prata|silver)\b/i,/\b(?:rosa|rose|pink)\b/i,/\b(?:vermelh[oa]|red)\b/i,/\b(?:azul|blue)\b/i];
function conflictingColors(expected:string,actual:string){
 const colors=colorGroups.filter(regex=>regex.test(expected.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
 const observed=colorGroups.filter(regex=>regex.test(actual.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
 return colors.length>0&&observed.length>0&&!colors.some(regex=>observed.includes(regex));
}
function exactIdentity(product:RecordValue,input:{productName:string;ean:string|null}){
  const name=text(product.name),brand=record(product.brand);
  const identity=[name,text(product.model),text(product.color),text(product.brand)||text(brand.name)].join(' ');
  if(!name||/\b(usad[oa]|seminov[oa]|recondicionad[oa]|avaria|refurbished|used)\b/i.test(name)||!matchesPriceOffer(identity,input.productName))return false;
  const tokens=input.productName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g)||[];
  if(conflictingColors(input.productName,identity))return false;
  const codes=gtins(product),wanted=input.ean?.replace(/^0+/,'');
  if(wanted&&codes.some(code=>code!==wanted))return false;
  // GTIN exato permite título abreviado, nunca volume/dose/variante conflitante.
  for(const measure of input.productName.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(ml|mg|g)\b/gi)){
    const measures=[...identity.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(ml|mg|g)\b/gi)];
    if(!measures.some(m=>m[2].toLowerCase()===measure[2].toLowerCase()&&Number(m[1].replace(',','.'))===Number(measure[1].replace(',','.'))))return false;
  }
  // Sinônimos de apresentação não são o identificador do modelo: "calculadora de
  // impressão"/"calculadora com bobina", "escova secadora"/"escova rotativa".
  // Marca/modelo e medidas continuam exigidos; cor explícita conflitante é recusada.
  const ignored=new Set(['de','da','do','das','dos','com','para','cor','marca','produto','voltagem','novo','nova','original','aquecedor','eletrico','eletrica','portatil','calculadora','impressao','mesa','escolar','escova','secadora','rotativa','preto','preta','prata','branco','branca','rosa','rose','azul','vermelho','vermelha']);
  const required=tokens.filter(token=>token.length>2&&!ignored.has(token)),actual=normalized(identity);
  if(wanted&&codes.length){
    if(required.some(token=>/\d/.test(token)&&!actual.includes(token)))return false;
    return required.some(token=>/^[a-z]{3,}$/.test(token)&&actual.includes(token));
  }
  return required.every(token=>actual.includes(token));
}

/** Date vale até o fim do dia UTC; DateTime conserva seu horário/fuso real.
 * Datas inválidas, horários sem fuso e calendários normalizados pelo JS falham. */
function offerExpiry(value:unknown){
 const raw=text(value),day=raw.slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return NaN;
 const calendar=new Date(day+'T00:00:00.000Z');
 if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day)return NaN;
 if(raw===day)return Date.parse(day+'T23:59:59.999Z');
 if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/i.test(raw))return NaN;
 return Date.parse(raw);
}

/** Preço total em formato canônico ou pt-BR; nunca parcela, faixa ou promoção textual. */
function priceValue(raw:unknown){
 if(typeof raw==='number')return raw;
 const value=text(raw);
 if(/^\d+(?:\.\d{1,2})?$/.test(value))return Number(value);
 if(/^(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}$/.test(value))return Number(value.replace(/\./g,'').replace(',','.'));
 return NaN;
}

export type OriginPriceEvidence={title:string;price:number;url:string;availability:'in_stock';checkedAt:string;method:'json_ld'|'microdata'|'primary_dom'};

/** Amazon não expõe Offer em todas as páginas. Ler somente a oferta principal da variante. */
function amazonPrimaryOffer(html:string,page:string,input:{productName:string;ean:string|null},now:Date):OriginPriceEvidence|null{
  const url=new URL(page),asin=url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1]?.toUpperCase();
  if(!['amazon.com.br','www.amazon.com.br'].includes(url.hostname)||!asin)return null;
  const nodes:HtmlNode[]=[];
  const walk=(node:HtmlNode,depth=0)=>{if(depth>120||['script','style','noscript','template'].includes(node.tagName||''))return;nodes.push(node);for(const child of node.childNodes||[])walk(child,depth+1);};
  walk(parse(html));
  const byId=(id:string)=>nodes.filter(node=>attribute(node,'id')===id);
  const identities=byId('ASIN');
  if(identities.length!==1||attribute(identities[0],'value')!==asin)return null;
  const titles=byId('productTitle'),title=titles.length===1?nodeText(titles[0]).replace(/\s+/g,' ').trim():'';
  if(!exactIdentity({name:title},input))return null;
  const availability=byId('availability');
  if(availability.length!==1)return null;
  const stock=nodeText(availability[0]).replace(/\s+/g,' ').trim();
  if(!/em estoque/i.test(stock)||/indispon[ií]vel|n[aã]o dispon[ií]vel|\b0\s+(?:unidades?\s+)?em estoque/i.test(stock))return null;
  const cart=byId('add-to-cart-button');
  if(cart.length!==1||attribute(cart[0],'disabled')!==undefined||attribute(cart[0],'aria-disabled')==='true')return null;
  const regions=[...byId('corePrice_feature_div'),...byId('corePriceDisplay_desktop_feature_div')];
  if(!regions.length||regions.some(node=>attribute(node,'data-csa-c-asin')!==asin))return null;
  const prices:number[]=[];
  const read=(node:HtmlNode)=>{
    const classes=(attribute(node,'class')||'').split(/\s+/);
    if(attribute(node,'id')==='apex-pricetopay-accessibility-label'||classes.includes('apex-pricetopay-value')){
      // a-offscreen contains the accessible full price; other descendants repeat it.
      const descendants:HtmlNode[]=[];
      const collect=(child:HtmlNode)=>{descendants.push(child);for(const next of child.childNodes||[])collect(next);};collect(node);
      const offscreen=descendants.find(child=>(attribute(child,'class')||'').split(/\s+/).includes('a-offscreen')&&nodeText(child).trim());
      const value=nodeText(offscreen||node).replace(/\s+/g,' ').trim();
      const match=value.match(/^R\$\s*(\d{1,3}(?:\.\d{3})*|\d+)\s*,\s*(\d{2})$/);
      if(match){const price=Number(match[1].replace(/\./g,''))+Number(match[2])/100;if(price>0&&price<1_000_000)prices.push(Math.round(price*100)/100);}
      return;
    }
    for(const child of node.childNodes||[])read(child);
  };
  for(const region of regions)read(region);
  return prices.length&&new Set(prices).size===1?{title,price:prices[0],url:page,availability:'in_stock',checkedAt:now.toISOString(),method:'primary_dom'}:null;
}

/** Somente evidência da página primária; nunca preço de snippet, recomendação ou parcela. */
export function readOriginPriceEvidence(html:string,page:string,input:{productName:string;ean:string|null},now=new Date()):OriginPriceEvidence|null{
  if(html.length>2_000_000||!isProductOfferUrl(page))return null;
  const visible=decode(html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ');
  if(/an[uú]ncio\s+(?:pausado|em pausa|inativo|finalizado|encerrado)|produto\s+(?:indispon[ií]vel|esgotado)|(?:fora|sem)\s+(?:de\s+)?estoque|out\s+of\s+stock|currently\s+unavailable/i.test(visible))return null;
  const products:RecordValue[]=[];
  const walk=(value:unknown,depth=0)=>{if(depth>8||products.length>40)return;if(Array.isArray(value)){for(const item of value.slice(0,60))walk(item,depth+1);return;}const node=record(value);if(hasType(node,'Product'))products.push(node);if(node['@graph'])walk(node['@graph'],depth+1);if(node.mainEntity)walk(node.mainEntity,depth+1);};
  for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{walk(JSON.parse(match[1]));}catch{try{walk(JSON.parse(decode(match[1])));}catch{/* Formato não verificável. */}}
  }
  const microdata=microdataProducts(html);
  const candidates=[...products,...microdata].filter(product=>samePage(product.url,page)&&exactIdentity(product,input));
  // Mais de uma ficha primária: não escolher silenciosamente outra variante.
  if(!candidates.length)return amazonPrimaryOffer(html,page,input,now);
  const allConfirmed:OriginPriceEvidence[]=[];
  for(const product of candidates){
  if(/^(paused|inactive|closed|cancelled|canceled|deleted)$/i.test(text(product.status)))return null;
  const offers=(Array.isArray(product.offers)?product.offers:[product.offers]).map(record).flatMap(offer=>{
   // AggregateOffer.lowPrice não é comprovação. Só aceitar suboferta real com
   // preço, moeda e disponibilidade próprios, da mesma página/variante.
   if(!hasType(offer,'AggregateOffer'))return [offer];
   if(!samePage(offer.url,page))return [];
   return (Array.isArray(offer.offers)?offer.offers:[]).map(record).map(child=>({...child,priceCurrency:child.priceCurrency??offer.priceCurrency}));
  });
  const confirmed:OriginPriceEvidence[]=[];
  for(const offer of offers){
    if(/^(paused|inactive|closed|cancelled|canceled|deleted)$/i.test(text(offer.status)))continue;
    if(hasType(offer,'AggregateOffer')||!hasType(offer,'Offer')||!samePage(offer.url,page))continue;
    const offerCodes=gtins(offer);
    if(input.ean&&offerCodes.some(code=>code!==input.ean!.replace(/^0+/,'')))continue;
    if(!['InStock','LimitedAvailability'].includes(text(offer.availability).split(/[\/#]/).at(-1)||''))continue;
    if(text(offer.priceCurrency)!=='BRL')continue;
    if(offer.itemCondition&&!/^(?:https?:\/\/schema.org\/)?NewCondition$/.test(text(offer.itemCondition)))continue;
    const inventory=record(offer.inventoryLevel).value;
    if(inventory!==undefined&&(!Number.isFinite(Number(inventory))||Number(inventory)<=0))continue;
    if(offer.priceValidUntil){const expiry=offerExpiry(offer.priceValidUntil);if(!Number.isFinite(expiry)||expiry<now.getTime())continue;}
    if(offer.eligibleCustomerType||offer.eligibleQuantity||offer.eligibleMembershipTier)continue;
    const value=priceValue(offer.price);
    if(!Number.isFinite(value)||value<=0||value>=1_000_000)continue;
    confirmed.push({title:text(product.name),price:Math.round(value*100)/100,url:page,availability:'in_stock',checkedAt:now.toISOString(),method:microdata.includes(product)?'microdata':'json_ld'});
  }
  // Preços concorrentes sem uma única oferta determinada exigem conferência, não média inventada.
  if(!confirmed.length||new Set(confirmed.map(offer=>offer.price)).size!==1)return null;
  allConfirmed.push(confirmed[0]);
  }
  return new Set(allConfirmed.map(offer=>offer.price)).size===1?allConfirmed[0]:null;
}
