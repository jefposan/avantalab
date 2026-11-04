import {objectValue,type ListingSnapshot} from './services/listing-model';
import {safeText,validEan} from './services/catalog-publication';
import {validProductPictures} from './product-photos';
import {MAGALU_CHANNEL_ID} from './magalu-publication-model';
export const magaluSku=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(value);
export function magaluStock(value:unknown){
 const root=objectValue(value);if(!Array.isArray(root.results))throw Error('magalu_stock_incomplete');
 const rows=root.results.map(objectValue).filter(r=>objectValue(r.channel).id===MAGALU_CHANNEL_ID&&r.type==='AVAILABLE');
 if(rows.length!==1||Object.keys(objectValue(rows[0]?.branch)).length)throw Error('magalu_stock_origin');
 const quantity=rows[0].quantity;if(!Number.isSafeInteger(quantity)||(quantity as number)<0||(quantity as number)>99999)throw Error('magalu_stock_incomplete');
 return quantity as number;
}
export function magaluPrice(value:unknown){
 const data=objectValue(value);if(!Array.isArray(data.results))return null;
 const rows=data.results.map(objectValue).filter(r=>objectValue(r.channel).id===MAGALU_CHANNEL_ID&&r.currency==='BRL');
 if(rows.length!==1||!Number.isSafeInteger(rows[0].price)||(rows[0].price as number)<0||!Number.isSafeInteger(rows[0].normalizer)||(rows[0].normalizer as number)<1)return null;
 return (rows[0].price as number)/(rows[0].normalizer as number);
}
export function normalizeMagaluListing(raw:unknown,expectedSku:string,stockValue?:unknown,priceValue?:unknown):ListingSnapshot{
 const row=objectValue(raw),channels=Array.isArray(row.channels)?row.channels.map(objectValue):[];
 if(!magaluSku(row.sku)||row.sku!==expectedSku||!channels.some(c=>c.id===MAGALU_CHANNEL_ID)||typeof row.active!=='boolean'||!safeText(row.title,220))throw Error('magalu_listing_identity');
 const rawStatus=String(row.status||'').toLowerCase();
 const status=['deleted','deleting'].includes(rawStatus)?'deleted':row.active===false?'paused':['published','active'].includes(rawStatus)?'active':['new','draft','under_review','publishing','policies_info','policies_warn'].includes(rawStatus)?'under_review':'inactive';
 let stock:number|null=null;const warnings=['Comissão, frete e total vendido não são informados por esta consulta do Magalu.'];
 try{if(stockValue!==undefined)stock=magaluStock(stockValue);}catch{warnings.push('Estoque indisponível ou Multi-Origem: não foi presumido saldo zero.');}
 if(row.fulfillment===true)warnings.push('Fulfillment: estoque operado pelo Magalu; ajuste local automático não permitido.');
 const identifiers=Array.isArray(row.identifiers)?row.identifiers.map(objectValue):[];
 const urls=Array.isArray(row.url_marketplace)?row.url_marketplace.map(objectValue):[];let permalink:string|null=null;
 for(const entry of urls){try{const u=new URL(String(entry.url));if(u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='magazineluiza.com.br'||u.hostname.endsWith('.magazineluiza.com.br')||u.hostname==='magalu.com')){permalink=u.href;break;}}catch{}}
 const attributes=[...(Array.isArray(row.attributes)?row.attributes:[]),...(Array.isArray(row.datasheet)?row.datasheet:[])].map(objectValue).map(a=>({name:safeText(a.name,100),value:safeText(a.value,500)})).filter(a=>a.name&&a.value);
 return{id:expectedSku,title:safeText(row.title,220),status,substatus:[rawStatus],permalink,price:magaluPrice(priceValue),currency:'BRL',stock,sold:null,category:safeText(objectValue(row.category).id,100),listingType:'Magalu',condition:String(row.condition||'').toLowerCase(),ean:validEan(identifiers.find(i=>i.type==='ean')?.value)||null,sku:expectedSku,pictures:validProductPictures((Array.isArray(row.images)?row.images:[]).map(i=>objectValue(i).reference)),shipping:{mode:'',logisticType:row.fulfillment===true?'fulfillment':'',free:null,dimensions:null,pickup:null},feeEstimate:null,feePercent:null,freightEstimate:null,attributes,variations:[],createdAt:typeof row.created_at==='string'?row.created_at:null,updatedAt:typeof row.updated_at==='string'?row.updated_at:null,endsAt:null,syncedAt:new Date().toISOString(),warnings};
}
/** O link next é conferido, nunca buscado como URL fornecida pelo provedor. */
export function magaluListingPage(value:unknown,offset:number,limit=10){
 const root=objectValue(value),info=objectValue(objectValue(root.meta).page),links=objectValue(objectValue(root.meta).links);
 if(!Array.isArray(root.results)||root.results.length>limit)throw Error('magalu_catalog_page');
 if(!root.results.length){if(links.next||Number(info.total||0)>0||Number(info.count||0)>0)throw Error('magalu_catalog_page');return{rows:[],next:null as number|null};}
 if(!Object.hasOwn(links,'next')||(info.offset!=null&&info.offset!==offset))throw Error('magalu_catalog_page');
 let next:number|null=null;if(links.next){const u=new URL(String(links.next),'https://api.magalu.com/seller/v1/portfolios/skus');next=Number(u.searchParams.get('_offset'));if(u.origin!=='https://api.magalu.com'||u.pathname!=='/seller/v1/portfolios/skus'||!u.searchParams.has('_offset')||!Number.isSafeInteger(next)||next<=offset||next>1000000)throw Error('magalu_catalog_page');}
 if(root.results.some(r=>!magaluSku(objectValue(r).sku)))throw Error('magalu_catalog_identity');
 return{rows:root.results.map(objectValue),next};
}
