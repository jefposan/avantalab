import {normalizeSearch,receivableBalance} from './domain.mjs';
/** Read-only projection; never treats invoicing, a zero total or missing data as payment. */
export function orderFinancialStatus(order,receivables=[],{ready=true,failed=false,allowed=true}={}){
 if(!allowed||!order||['Cancelado','Devolvido'].includes(order.status)||order.status!=='Faturado')return '—';
 if(!ready)return failed?'Não disponível':'Consultando…';
 const nature=normalizeSearch(order.order?.operationNature||'');
 const explicitlyGifted=['bonificacao','remessa em bonificacao','bonificado'].includes(nature)||normalizeSearch(order.order?.paymentMethod||'')==='bonificado';
 if(explicitlyGifted&&Number(order.total)===0)return 'Bonificado';
 const operationId=order.persistence?.operationId;
 const linked=receivables.filter(row=>operationId?row.persistence?.operationId===operationId:!row.persistence?.operationId&&(row.origin===order.id||row.origin===`Pedido ${order.id}`));
 const active=linked.filter(row=>row.status!=='cancelado'&&row.status!=='estornado'&&Number(row.value)>Number(row.reversed||0));
 if(!active.length)return '—';
 const balance=active.reduce((sum,row)=>sum+Math.round(receivableBalance(row)*100),0);
 const received=active.reduce((sum,row)=>sum+Math.max(0,Math.round((Number(row.received||0)-Number(row.refunded||0))*100)),0);
 if(balance>0)return received>0?'Parcialmente pago':'Em aberto';
 return received>0?'Pago':'—';
}
