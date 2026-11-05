export type ContentKind='pictures'|'attributes';
export type ContentAttribute={id:string;name:string;type:string;value:string;valueId:string|null;editable:boolean;reason:string;required:boolean;maxLength:number;options:{id:string;name:string}[];units:string[]};
export type ListingContextField={id:string;name:string;value:string;reason:string};
export type ContentEditor={id:string;connectionId:string;revision:string;kind:ContentKind;title:string;affectedIds:string[];reason:string;maxPictures:number;pictures:{id:string;url:string}[];attributes:ContentAttribute[];contextFields?:ListingContextField[]};
export const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export const rows=(v:unknown)=>Array.isArray(v)?v.map(object):[];
export const pictureId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{6,180}$/.test(v);
export function pictureUrl(v:unknown){try{const u=new URL(String(v));if(u.protocol==='http:')u.protocol='https:';return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='mlstatic.com'||u.hostname.endsWith('.mlstatic.com'))?u.href:'';}catch{return '';}}
const identity=new Set(['GTIN','EAN','UPC','ISBN','SELLER_SKU','BRAND','MODEL','ITEM_CONDITION']);
export function contentAttributes(schema:unknown,current:unknown,globalReason=''):ContentAttribute[]{
 const values=rows(current);
 const result=rows(schema).filter(a=>typeof a.id==='string'&&/^[A-Z0-9_]{1,100}$/.test(a.id)).map(a=>{
  const old=values.find(v=>v.id===a.id)||{},tags=object(a.tags),type=String(a.value_type||''),multiple=rows(old.values).length>1;
  const reason=globalReason||(identity.has(String(a.id))||a.type==='product_identifier'?'A identificação do produto é preservada.':tags.read_only||tags.fixed?'Campo fixo ou somente leitura no Mercado Livre.':tags.parent_pk||tags.child_pk||tags.product_pk||tags.variation_attribute||tags.allow_variations||tags.defines_picture?'Característica de identidade/variação: não alterada por este editor.':tags.multivalued||multiple?'Campo com vários valores: preservado nesta edição.':!['string','number','number_unit','list','boolean'].includes(type)?'Formato ainda não suportado neste editor.':'');
  const display=(v:Record<string,unknown>)=>String(v.name||v.value_name||v.id||v.value_id||(object(v.struct||v.value_struct).number!=null?`${object(v.struct||v.value_struct).number} ${object(v.struct||v.value_struct).unit||''}`:''));
  const value=multiple?rows(old.values).map(display).join(' · '):typeof old.value_name==='string'?old.value_name:typeof old.value_id==='string'?String(rows(a.values).find(v=>v.id===old.value_id)?.name||old.value_id):rows(old.values).length?rows(old.values).map(display).join(' · '):display({value_struct:old.value_struct});
  return {id:String(a.id),name:String(a.name||a.id),type,value,valueId:typeof old.value_id==='string'?old.value_id:null,editable:!reason,reason,required:tags.required===true||tags.new_required===true||tags.conditional_required===true,maxLength:typeof a.value_max_length==='number'?Math.min(a.value_max_length,1000):255,options:rows(a.values).filter(v=>typeof v.id==='string'&&typeof v.name==='string').map(v=>({id:String(v.id),name:String(v.name)})),units:rows(a.allowed_units).map(u=>String(u.id||u.name||'')).filter(Boolean)};
 });
 // Valores antigos/fora do esquema continuam visíveis, mas nunca são reenviados.
 for(const old of values)if(typeof old.id==='string'&&!result.some(a=>a.id===old.id))result.push({id:old.id,name:String(old.name||old.id),type:'string',value:String(old.value_name||old.value_id||rows(old.values).map(v=>v.name||v.id||'').join(' · ')),valueId:null,editable:false,reason:'Característica fora do esquema atual: valor preservado.',required:false,maxLength:1000,options:[],units:[]});
 return result;
}
/** Somente dados comerciais públicos do item, nunca credenciais ou dados do comprador. */
export function listingContextFields(item:Record<string,unknown>):ListingContextField[]{
 const shipping=object(item.shipping),reason='Consulta: alteração deste campo não homologada neste editor. Preço e saldo são geridos por conta/estoque.';
 const value=(v:unknown)=>v==null?'':typeof v==='boolean'?(v?'Sim':'Não'):String(v);
 const fields:ListingContextField[]=[['category_id','Categoria',item.category_id],['condition','Condição',item.condition],['price','Preço por conta',item.price],['currency_id','Moeda',item.currency_id],['available_quantity','Saldo online',item.available_quantity],['status','Situação',item.status],['shipping_mode','Forma de envio',shipping.mode],['logistic_type','Logística',shipping.logistic_type],['free_shipping','Frete grátis',shipping.free_shipping],['dimensions','Dimensões de envio',shipping.dimensions],['warranty','Garantia',item.warranty],['seller_custom_field','Referência do vendedor',item.seller_custom_field],['catalog_product_id','Produto de catálogo',item.catalog_product_id],['user_product_id','Produto compartilhado',item.user_product_id]].map(([id,name,v])=>({id:String(id),name:String(name),value:value(v),reason}));
 for(const term of rows(item.sale_terms))fields.push({id:`term:${term.id}`,name:String(term.name||term.id),value:value(term.value_name||term.value_id||rows(term.values).map(v=>v.name||v.id||'').join(' · ')),reason});
 for(const variation of rows(item.variations)){
  const prefix=`variation:${variation.id}`;
  fields.push({id:prefix,name:`Variação ${variation.id}`,value:rows(variation.attribute_combinations).map(a=>`${a.name||a.id}: ${a.value_name||a.value_id||''}`).join(' · '),reason:'Identidade de variação preservada.'});
  for(const [id,name,v]of [['price','Preço',variation.price],['available_quantity','Saldo',variation.available_quantity],['picture_ids','Fotos',Array.isArray(variation.picture_ids)?variation.picture_ids.join(' · '):''],...rows(variation.attributes).map(a=>[String(a.id),String(a.name||a.id),a.value_name||a.value_id])])fields.push({id:`${prefix}:${id}`,name:`Variação ${variation.id} · ${name}`,value:value(v),reason:'Variação preservada; alteração não homologada neste editor.'});
 }
 return fields;
}
export function attributeChanges(editor:ContentEditor,input:unknown){
 const raw=object(input),changes:Record<string,unknown>[]=[];
 if(!Object.keys(raw).length||Object.keys(raw).length>300)throw new Error('Altere ao menos uma característica.');
 for(const [id,rawValue]of Object.entries(raw)){
  const rule=editor.attributes.find(a=>a.id===id);
  if(!rule?.editable||typeof rawValue!=='string')throw new Error(`${rule?.name||id}: campo não permitido nesta edição.`);
  const value=rawValue.trim();
  if(!value||value.length>rule.maxLength)throw new Error(`${rule.name}: informe um valor com até ${rule.maxLength} caracteres. Valores existentes não podem ser apagados por este editor.`);
  if(value===rule.value)continue;
  if(['boolean','list'].includes(rule.type)){
   const option=rule.options.find(o=>o.id===value);if(!option)throw new Error(`${rule.name}: selecione um valor permitido pelo ML.`);
   changes.push({id,value_id:option.id,value_name:option.name});
  }else{
   if(rule.type==='number'&&!/^-?\d+(?:[.,]\d+)?$/.test(value))throw new Error(`${rule.name}: informe um número.`);
   if(rule.type==='number_unit'){
    const match=value.match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/);
    const unit=match&&rule.units.find(u=>u.toLowerCase()===match[2].toLowerCase());
    if(!match||!unit)throw new Error(`${rule.name}: informe número e unidade permitida (${rule.units.join(', ')}).`);
    const number=Number(match[1].replace(',','.'));if(!Number.isFinite(number))throw new Error(`${rule.name}: número inválido.`);
    changes.push({id,value_name:`${number} ${unit}`,value_struct:{number,unit}});continue;
   }
   changes.push({id,value_name:rule.type==='number'||rule.type==='number_unit'?value.replace(',','.'):value});
  }
 }
 if(!changes.length)throw new Error('Nenhuma característica foi alterada.');
 return changes;
}
/** Não reconstrói os atributos intocados: mantém IDs, valores e estruturas originais. */
export function mergeContentAttributes(current:unknown,changes:Record<string,unknown>[]){
 const result=rows(current).map(old=>({...old}));
 for(const change of changes){const i=result.findIndex(a=>a.id===change.id);if(i>=0)result[i]={...change};else result.push({...change});}
 return result;
}
export function validatePictureIds(editor:ContentEditor,input:unknown,items:Record<string,unknown>[]){
 if(!Array.isArray(input)||!input.length||input.length>editor.maxPictures||input.some(id=>!pictureId(id))||new Set(input).size!==input.length)throw new Error(`Mantenha entre 1 e ${editor.maxPictures} fotos, sem repetir imagens.`);
 for(const item of items)for(const variation of rows(item.variations))for(const id of Array.isArray(variation.picture_ids)?variation.picture_ids:[])if(!input.includes(id))throw new Error('Uma foto está associada a uma variação. Preserve essa imagem para não quebrar o vínculo.');
 if(JSON.stringify(input)===JSON.stringify(editor.pictures.map(p=>p.id)))throw new Error('Nenhuma foto foi alterada.');
 return input as string[];
}
export function contentMatches(item:Record<string,unknown>,kind:ContentKind,desired:unknown){
 if(!Array.isArray(desired)||!desired.length)return false;
 if(kind==='pictures')return JSON.stringify(rows(item.pictures).map(p=>p.id))===JSON.stringify(desired);
 return rows(desired).every(change=>{
  const current=rows(item.attributes).find(a=>a.id===change.id);if(!current)return false;
  if(change.value_id!=null)return String(current.value_id)===String(change.value_id);
  if(change.value_struct){const wanted=object(change.value_struct),actual=object(current.value_struct),match=String(current.value_name||'').match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/);return Number(actual.number??match?.[1]?.replace(',','.'))===wanted.number&&String(actual.unit??match?.[2]??'').toLowerCase()===String(wanted.unit).toLowerCase();}
  return String(current.value_name||'').trim()===String(change.value_name||'').trim();
 });
}
export function contentAttributeFingerprint(value:unknown,ignore:string[]=[]){
 const atom=(id:unknown,name:unknown,struct:unknown)=>id!=null?{id:String(id)}:struct&&typeof struct==='object'?{struct:{number:object(struct).number,unit:String(object(struct).unit||'').toLowerCase()}}:{name:typeof name==='string'?name.trim():null};
 return JSON.stringify(rows(value).filter(a=>!ignore.includes(String(a.id))).map(a=>{
  const list=rows(a.values),v=list.length>1?list.map(v=>atom(v.id,v.name,v.struct)):a.value_id!=null||a.value_name!=null||a.value_struct?atom(a.value_id,a.value_name,a.value_struct):list.length?atom(list[0].id,list[0].name,list[0].struct):{name:null};
  return {id:a.id,value:v};
 }).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
}
export function contentBaseline(item:Record<string,unknown>){return {attributes:item.attributes,pictures:rows(item.pictures).map(p=>({id:p.id}))};}
export function contentPreserved(before:Record<string,unknown>,after:Record<string,unknown>,kind:ContentKind,desired:unknown){
 const ignore=kind==='attributes'?rows(desired).map(a=>String(a.id)):[];
 return contentAttributeFingerprint(before.attributes,ignore)===contentAttributeFingerprint(after.attributes,ignore)
  &&(kind==='pictures'||JSON.stringify(rows(before.pictures).map(p=>p.id))===JSON.stringify(rows(after.pictures).map(p=>p.id)));
}
