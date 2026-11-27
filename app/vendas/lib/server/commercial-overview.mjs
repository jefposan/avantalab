import {calculateCommercialReport} from '../domain.mjs';
const date=value=>String(value||'').slice(0,10);
const businessDate=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date(value));
export {validOverviewPeriod} from '../commercial-overview-period.mjs';
import {validOverviewPeriod} from '../commercial-overview-period.mjs';
/** Projeção mínima, sem clientes, eventos, anexos ou nomes de produtos na resposta. */
export function buildCommercialOverview({operations=[],items=[],services=[],receivables=[],start,end,today,permissions={}}){
 if(!validOverviewPeriod(start,end))throw Error('AV-OVERVIEW-PERIOD');
 const inPeriod=value=>value>=start&&value<=end;
 const allowed=operations.filter(row=>['pedido','orcamento','ordem_servico'].includes(row.tipo)&&(row.tipo==='ordem_servico'?permissions['services.view']:permissions['sales.view']));
 const lines=new Map(),serviceById=new Map(services.map(row=>[row.operacao_id,row]));
 for(const row of items){const existing=lines.get(row.operacao_id)||[];existing.push({quantity:Number(row.quantidade),unitPrice:0,cost:Number(row.custo_unitario_retrato||0)});lines.set(row.operacao_id,existing);}
 const statuses={faturado:'Faturado',concluido:'Concluído'};
 const projected=allowed.filter(row=>inPeriod(row.tipo==='pedido'?(date(row.entrega_retrato?.orderDate)||date(row.criado_em)):date(row.criado_em))).map(row=>({type:row.tipo,total:Number(row.total),status:statuses[row.situacao]||row.situacao,order:row.tipo==='pedido'?{lines:lines.get(row.id)||[]}:undefined,serviceOrder:row.tipo==='ordem_servico'?{lines:[],actualCostTotal:Number(serviceById.get(row.id)?.custo_real_total||0)}:undefined}));
 const operationById=new Map(operations.map(row=>[row.id,row]));
 const financial=permissions['receivables.view']?receivables.filter(row=>{const op=operationById.get(row.operacao_id);return op&&inPeriod(date(op.entrega_retrato?.orderDate)||businessDate(op.criado_em));}).map(row=>({method:row.meio_pagamento||operationById.get(row.operacao_id)?.pagamento_retrato?.method,value:Number(row.valor_original),received:Number(row.valor_recebido),refunded:Number(row.valor_estornado),reversed:row.situacao==='cancelado'?Number(row.valor_original):0,dueDate:date(row.vencimento)})):[];
 const report=calculateCommercialReport({operations:projected,receivables:financial,todayIso:today});
 return {start,end,revenue:report.revenue,openReceivables:report.openReceivables,receivedNet:report.receivedNet,overdueReceivables:report.overdueReceivables,...(permissions['catalog.view_cost']?{cost:report.cost}:{}),counts:{quotes:projected.filter(row=>row.type==='orcamento').length,orders:projected.filter(row=>row.type==='pedido').length,services:projected.filter(row=>row.type==='ordem_servico').length,invoiced:projected.filter(row=>row.status==='Faturado').length}};
}
