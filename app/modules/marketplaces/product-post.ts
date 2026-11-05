export const POST_CONDITIONS = {new:'Novo',used:'Usado',refurbished:'Recondicionado',damaged:'Avaria',detailed:'Com detalhe'} as const;
export function productPostConditionLabel(value:unknown):string|null{
 return typeof value==='string'&&Object.hasOwn(POST_CONDITIONS,value)?POST_CONDITIONS[value as keyof typeof POST_CONDITIONS]:null;
}
export function productPostConditionIssue(condition:unknown,details:string):{field:'condition'|'details';message:string}|null{
 if(!productPostConditionLabel(condition))return {field:'condition',message:'Selecione a condição real do produto.'};
 if((condition==='damaged'||condition==='detailed')&&!details.trim())return {field:'details',message:condition==='damaged'?'Descreva a avaria do produto nos detalhes.':'Descreva o detalhe do produto antes de gerar o post.'};
 return null;
}
export const POST_VOLTAGES = ['127 V','220 V','110 V','Bivolt','Não se aplica'] as const;
export type ProductPostDraft = {company:string;name:string;image:string;description:string;voltage:string;condition:string;details?:string;damage?:string;priceCents:number;originalPriceCents:number;primaryColor:string};
// Compatibilidade com rascunhos antigos; novos formulários usam Detalhes.
export function productPostDetails(d:Pick<ProductPostDraft,'details'|'damage'>){return (d.details ?? d.damage ?? '').trim();}
export function postPrimaryColor(value:unknown){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:'#003E73';}
// A voltagem escolhida aparece na pílula, sem contradizer o título do cadastro.
export function postProductName(name:string){return name.replace(/\b(?:110|127|220)\s*(?:v|volts?)\b|\bbivolt\b/gi,'').replace(/\s+/g,' ').trim();}
export function postSummary(value:string,limit=180) {
 const clean=value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 if(clean.length<=limit)return clean;
 return clean.slice(0,limit-1).replace(/\s+\S*$/,'').trimEnd()+'…';
}
export function suggestedPostVoltage(name:string,attributes:Array<{id:string;name:string;value:string}>=[]) {
 const attribute=attributes.find(a=>/voltag|voltage|tens[aã]o/i.test(`${a.id} ${a.name}`));
 const text=attribute?.value||name;
 if(/\bbivolt\b/i.test(text))return 'Bivolt';
 if(attribute&&/^(?:110|127|220)$/.test(text.trim()))return `${text.trim()} V`;
 const matches=['127','220','110'].filter(v=>new RegExp(`\\b${v}\\s*v\\b`,'i').test(text));
 return matches.length===1?`${matches[0]} V`:'';
}
export function validateProductPost(d:ProductPostDraft):{field:'image'|'description'|'voltage'|'condition'|'details'|'price'|'original-price';message:string}|null {
 if(!d.image)return{field:'image',message:'Este produto está sem foto. Escolha uma foto antes de gerar o post.'};
 if(!d.description.trim()||d.description.length>180)return{field:'description',message:'Informe uma descrição de até 180 caracteres para o post.'};
 if(!POST_VOLTAGES.includes(d.voltage as typeof POST_VOLTAGES[number]))return{field:'voltage',message:'Selecione a voltagem ou Não se aplica.'};
 const conditionIssue=productPostConditionIssue(d.condition,productPostDetails(d));if(conditionIssue)return conditionIssue;
 const details=productPostDetails(d);
 if(details.length>160)return{field:'details',message:'Informe os detalhes em até 160 caracteres.'};
 if(!Number.isSafeInteger(d.priceCents)||d.priceCents<1||d.priceCents>999999999)return{field:'price',message:'Informe um preço válido, maior que zero.'};
 if(!Number.isSafeInteger(d.originalPriceCents)||d.originalPriceCents>999999999||d.originalPriceCents<=d.priceCents)return{field:'original-price',message:'Informe o preço anterior real (De), maior que o preço de venda (Por).'};
 return null;
}

/** Marcadores nativos do WhatsApp; a legenda não é incorporada à arte. */
export function productPostOfferContacts(companyId:string|undefined){
 // Contatos expressamente definidos para este perfil; nunca aplicar a outras empresas.
 if(companyId!=='baa8c115-634a-41d3-9e2a-8666dce11454')return [];
 return [
  {label:'Contato 1',url:'https://wa.me/5511983044391'},
  {label:'Contato 2',url:'https://wa.me/5511987885611'},
  {label:'Entre no nosso grupo de ofertas',url:'https://chat.whatsapp.com/HMoUgB9TLWvIm2kDWhiKjJ'},
 ];
}
export function productPostCaption(d:ProductPostDraft,companyId?:string){
 const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
 const details=productPostDetails(d);
 const contacts=productPostOfferContacts(companyId);
 if(contacts.length)return [
  d.description.trim(),
  `De: ~${money.format(d.originalPriceCents/100)}~\n💰 *POR APENAS ${money.format(d.priceCents/100)}*`,
  [productPostConditionLabel(d.condition)?`*Condição:* ${productPostConditionLabel(d.condition)}`:'',details?`*Detalhe:* ${details}`:''].filter(Boolean).join('\n'),
  '👉 *Faça sua oferta pelo WhatsApp:*',
  ...contacts.map((contact,index)=>`${index===2?'🛍️ ':''}*${contact.label}:*\n${contact.url}`),
 ].filter(Boolean).join('\n\n');
 return [d.description.trim(),...(productPostConditionLabel(d.condition)?[`Condição: ${productPostConditionLabel(d.condition)}`]:[]),...(details?[`Detalhe: ${details}`]:[]),`De: ~${money.format(d.originalPriceCents/100)}~\nPor: *${money.format(d.priceCents/100)}*`,...contacts.map(contact=>`${contact.label}:\n${contact.url}`)].join('\n\n');
}
