const identity = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

/** Não aceitar uma vitrine/listagem como comprovação de preço de uma variante. */
export function isProductOfferUrl(value: string) {
  try {
    const url=new URL(value);
    return url.protocol==='https:' && !url.username && !url.password
      && !/^lista\./i.test(url.hostname)
      && !/(^|\/)(search|busca|buscar|pesquisa|s)(\/|$)/i.test(url.pathname)
      && !/(^|\/)(?:categorias?|categoria--[^/]*)(\/|$)/i.test(url.pathname)
      && (!/(^|\/)collections(\/|$)/i.test(url.pathname)||/\/collections\/[^/]+\/products\/[^/]+/i.test(url.pathname))
      && !/^\/(?:loja\/?)?$/i.test(url.pathname)
      && !['q','query','search','searchTerm','k'].some(key=>url.searchParams.has(key));
  } catch { return false; }
}

const measurePattern=/\b\d+(?:[.,]\d+)?\s*(?:volts?|v|watts?|kw|w|litros?|ml|l|kg|g|cm|mm|m|mb|gb|tb|hz|rpm|btu|mah)\b/gi;
/** Vitrines de peças não comprovam o preço do aparelho completo. */
export function matchesPriceOfferSource(value:string,input:string){
  const parts=/\b(?:pecas?|acessorios?|refis?|refil|reposicao)\b/;
  const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ');
  if(parts.test(normalize(input)))return true;
  try{
    const url=new URL(value);
    const listing=/^lista\./i.test(url.hostname)||/(^|\/)(?:search|busca|buscar|pesquisa|s)(\/|$)/i.test(url.pathname);
    return !listing||!parts.test(normalize(decodeURIComponent(url.pathname)+' '+[...url.searchParams.values()].join(' ')));
  }catch{return false;}
}
/** Códigos reais, separados de medidas: 900W e 220V não são modelos. */
export function priceModelCodes(input:string){
  const cleaned=input.replace(measurePattern,' ');
  const codes=(cleaned.match(/\b[a-z0-9]+(?:[-/][a-z0-9]+)*\b/gi)||[]).filter(token=>/[a-z]/i.test(token)&&/\d/.test(token)&&!/^\d+(?:em|in|x)\d+$/i.test(identity(token)));
  const ignored=new Set(['de','do','da','em','com','por','ate','sem']);
  for(const match of cleaned.matchAll(/\b([a-z]{1,3})\s+(\d{2,}[a-z0-9-]*)\b/gi))if(!ignored.has(match[1].toLowerCase()))codes.push(match[1]+match[2]);
  return [...new Set(codes.map(identity))];
}

export function priceSearchQuery(input:string){
  return input.replace(/\b\d+(?:[.,]\d+)?\s*(?:watts?|kw|w)\b/gi,' ').replace(/\b(?:cor|preto|preta|prata|branco|branca|cinza|original|novo|nova|com|para|de|do|da|e)\b/gi,' ').replace(/\s+/g,' ').trim();
}

export function matchesPriceOffer(title: string, input: string, variant='') {
  const evidence=title+' '+variant,normalized=identity(evidence);
  const models=priceModelCodes(input);
  if(models.some(model=>!normalized.includes(identity(model))))return false;
  const voltages=[...input.matchAll(/\b(\d{2,3})\s*(?:v|volts?)\b/gi)].map(match=>match[1]);
  // Mesmo "bivolt" não comprova uma variante específica solicitada.
  const titleVoltages=[...title.matchAll(/\b(\d{2,3})\s*(?:v|volts?)\b/gi)].map(match=>match[1]);
  const variantVoltages=[...new Set([...variant.matchAll(/\b(\d{2,3})\s*(?:v|volts?)\b/gi)].map(match=>match[1]))];
  const bareVoltage=title.match(/[-–—]\s*(110|127|220|230|240)\s*$/)?.[1];
  if(voltages.length&&(variantVoltages.length>1||bareVoltage&&!voltages.includes(bareVoltage)))return false;
  if(voltages.length&&titleVoltages.length===1&&!voltages.includes(titleVoltages[0]))return false;
  if(voltages.some(voltage=>!new RegExp(`\\b${voltage}\\s*(?:v|volts?)\\b`,'i').test(evidence)))return false;
  const powers=[...input.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:w|watts?)\b/gi)];
  const titlePowers=[...title.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:w|watts?)\b/gi)];
  if(powers.length&&titlePowers.length===1&&!powers.some(match=>Number(match[1].replace(',','.'))===Number(titlePowers[0][1].replace(',','.'))))return false;
  if(powers.some(match=>!new RegExp(`\\b${match[1].replace(/[.,]/g,'[.,]')}\\s*(?:w|watts?)\\b`,'i').test(evidence)))return false;
  const capacity=[...input.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(l|litros?|kg|gb|tb)\b/gi)];
  return capacity.every(match=>new RegExp(`\\b${match[1].replace(/[.,]/g,'[.,]')}\\s*${match[2].toLowerCase()==='l'||match[2].toLowerCase().startsWith('litro')?'(?:l|litros?)':match[2]}\\b`,'i').test(evidence));
}

/** Identificadores do cadastro enriquecem a busca de qualquer produto, sem regras por EAN. */
export function priceSearchDetails(attributes:readonly {id:string;value:string}[]=[],productName?:string){
  const value=(ids:string[])=>attributes.find(attribute=>ids.includes(attribute.id.toUpperCase())&&attribute.value.trim()&&!/^(n\/a|n[aã]o informado|sem marca|sem modelo)$/i.test(attribute.value.trim()))?.value.trim();
  const rawModel=value(['MPN'])||value(['MODEL','MODELO']),brand=value(['BRAND','MARCA']);
  const model=rawModel&&(!productName||identity(productName).includes(identity(rawModel)))?rawModel:undefined;
  const voltage=value(['VOLTAGE','VOLTAGEM']);
  const variant=voltage&&/^\s*(?:110|127|220|230|240)\s*v\s*$/i.test(voltage)?voltage:undefined;
  return {...(model?{model}:{}),...(brand?{brand}:{}),...(variant?{variant}:{})};
}
