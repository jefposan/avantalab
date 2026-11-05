import {object,type ContentAttribute,type ContentEditor} from './listing-content';
import {validateChanges,type ListingEditor} from './listing-editor';
export type ProductCommonKind='pictures'|'attributes'|'details';
export type CommonTarget={connectionId:string;id:string;label:string;revision:string;affectedIds:string[];content?:ContentEditor;details?:ListingEditor};
export type CommonProductEditor=ContentEditor&{scopeHash:string;productId:string;destinations:string[];different:boolean;restrictions?:{connectionId:string;id:string;message:string}[];reviewTargets?:CommonTarget[];pictureAppendTargets?:string[];pictureSource?:{connectionId:string;id:string}};
export const commonKinds=['pictures','attributes','details'] as const;
export function commonAttributeRules(editors:ContentEditor[]):ContentAttribute[]{
 const first=editors[0];if(!first)return [];
 const union=[...new Map(editors.flatMap(e=>e.attributes).map(a=>[a.id,a])).keys()].map(id=>editors.flatMap(e=>e.attributes).find(a=>a.id===id)!);
 return union.map(rule=>{
  const peers=editors.map(e=>e.attributes.find(a=>a.id===rule.id));
  const blocked=peers.find(p=>!p?.editable||p.type!==rule.type);
  const options=rule.options.filter(o=>peers.every(p=>p?.options.some(v=>v.id===o.id&&v.name===o.name)));
  const units=rule.units.filter(u=>peers.every(p=>p?.units.includes(u)));
  const reason=peers.some(p=>!p)?'Característica não disponível em todos os anúncios.':blocked?.reason||((blocked||peers.some(p=>p?.type!==rule.type))?'Formato diferente entre anúncios.':(['list','boolean'].includes(rule.type)&&!options.length?'Não há opções comuns a todos os anúncios.':rule.type==='number_unit'&&!units.length?'Não há unidade comum a todos os anúncios.':''));
  return {...rule,options,units,required:peers.some(p=>p?.required),editable:!reason,reason,maxLength:Math.min(...peers.map(p=>p?.maxLength??rule.maxLength))};
 });
}
const detailFields={TITLE:'title',DESCRIPTION:'description',LISTING_TYPE:'listingType'} as const;
export function detailAttributeRules(editors:ListingEditor[]):ContentAttribute[]{
 const first=editors[0];if(!first)return [];
 return Object.entries(detailFields).map(([id,field])=>{
  const rules=editors.map(e=>e.fields[field]),blocked=rules.find(r=>!r.editable);
  const options=field==='listingType'?first.listingTypes.filter(t=>editors.every(e=>e.listingTypes.some(p=>p.id===t.id))).map(t=>({id:t.id,name:t.name})):[];
  const reason=blocked?.reason||(field==='listingType'&&!options.length?'Tipo indisponível em todos os anúncios.':'');
  return {id,name:field==='title'?'Título / nome base':field==='description'?'Descrição':'Tipo de anúncio',type:field==='description'?'text':field==='listingType'?'list':'string',value:String(first.values[field]||''),valueId:field==='listingType'?first.values.listingType:null,editable:!reason,reason,required:true,maxLength:Math.min(...rules.map(r=>r.maxLength??(field==='description'?50000:field==='title'?60:255))),options,units:[]};
 });
}
/** Só converte dados comuns; preço, saldo, conta e identidade não são aceitos. */
export function commonDetailChanges(editor:ListingEditor,values:unknown){
 const changes:Record<string,string>={};
 for(const [key,value]of Object.entries(object(values))){
  const field=detailFields[key as keyof typeof detailFields];
  if(!field||typeof value!=='string')throw new Error('A edição única não aceita preço, estoque ou campos desconhecidos.');
  if(editor.values[field]!==value)changes[field]=value;
 }
 if(!Object.keys(changes).length)return null;
 const checked=validateChanges(editor,changes);
 if(Object.keys(checked.errors).length)throw new Error(Object.values(checked.errors).join(' '));
 return checked.changes;
}
export function commonTargetValues(target:CommonTarget,kind:ProductCommonKind,input:unknown){
 if(kind==='details')return commonDetailChanges(target.details!,input);
 if(kind==='pictures')return JSON.stringify(input)===JSON.stringify(target.content!.pictures.map(p=>p.id))?null:input;
 const values:Record<string,string>={};
 for(const [key,value]of Object.entries(object(input))){
  const rule=target.content!.attributes.find(a=>a.id===key);
  if(!rule?.editable||typeof value!=='string')throw new Error(`${key}: campo não permitido em todos os anúncios.`);
  const current=['list','boolean'].includes(rule.type)?rule.valueId||'':rule.value;
  if(value!==current)values[key]=value;
 }
 return Object.keys(values).length?values:null;
}
