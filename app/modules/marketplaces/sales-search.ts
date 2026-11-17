import {normalizarTexto} from '../../lib/formatters.ts';

type SearchableSale={orderId:string;buyer?:string|null;total:number|null;items:ReadonlyArray<{title:string}>};
/** Pesquisa somente a lista do período/conta/situação atual, sem modificar os pedidos. */
export function saleMatchesSearch(sale:SearchableSale,query:string):boolean {
 const term=normalizarTexto(query).trim();
 if(!term)return true;
 const text=normalizarTexto([`Pedido #${sale.orderId}`,sale.orderId,sale.buyer||'',...sale.items.map(item=>item.title)].join(' '));
 if(text.includes(term))return true;
 if(sale.total===null||!Number.isFinite(sale.total))return false;
 const valueTerm=term.replace(/r\$/g,'').replace(/\s/g,'');
 if(!/^[\d.,]+$/.test(valueTerm))return false;
 return [sale.total.toFixed(2),sale.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})].some(value=>value.includes(valueTerm));
}
