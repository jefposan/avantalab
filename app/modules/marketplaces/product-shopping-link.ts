import {productPostConditionIssue,productPostConditionLabel} from './product-post.ts';
import type {WarehouseContext} from './warehouses';
export type ProductShoppingLink={id:string;accountId:string;accountName:string;marketplace:string;listingId:string;url:string;priceCents:number};
export type ProductShoppingContext={stock:WarehouseContext;links:ProductShoppingLink[];referencePriceCents:number|null;caption?:{description:string;details:string}};
export function productPostDestinations(stock:WarehouseContext){
 if(!stock.warehousesReady)return {online:false,image:false};
 return {online:stock.warehouses.some(w=>w.is_online&&w.quantity!==null&&w.quantity>0),image:stock.warehouses.some(w=>!w.is_online&&w.quantity!==null&&w.quantity>0)};
}
export function productShoppingCaption(input:{description:string;details:string;condition:string;priceCents:number;referencePriceCents:number;url:string}){
 const issue=shoppingLinkPriceIssue(input.referencePriceCents,{priceCents:input.priceCents});if(issue)throw new Error(issue);
 const conditionIssue=productPostConditionIssue(input.condition,input.details);if(conditionIssue)throw new Error(conditionIssue.message);
 const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
 return [input.description.trim(),`Condição: ${productPostConditionLabel(input.condition)}`,...(input.details.trim()?[`Detalhe: ${input.details.trim()}`]:[]),`De: ~${money.format(input.referencePriceCents/100)}~`,`💰 *POR APENAS ${money.format(input.priceCents/100)}*`,`*Link de compra:*\n${input.url}`].join('\n\n');
}
export function validProductPostPrice(cents:unknown):cents is number{
 return typeof cents==='number'&&Number.isSafeInteger(cents)&&cents>0&&cents<=999999999;
}
export function shoppingLinkPriceIssue(meanCents:number|null|undefined,link:Pick<ProductShoppingLink,'priceCents'>|undefined):string|null{
 if(!validProductPostPrice(meanCents))return 'Não há média consultada válida para este produto. Consulte o preço no AvantaPreços antes de gerar o link.';
 if(!link)return 'Escolha a conta e o anúncio para gerar o link.';
 if(!validProductPostPrice(link.priceCents))return 'O anúncio não possui um preço de venda válido. Confira o anúncio antes de gerar o link.';
 return null;
}
