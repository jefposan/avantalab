'use client';
import {useEffect,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import LoadingPontos from '@/app/components/LoadingPontos';
import {formatarMoeda} from '@/app/lib/formatters';
import {REPORT_MONTHS,type ReportFilters} from '@/app/modules/marketplaces/sales-report';
import {monthlySaleStatus,type MonthlySalesPage} from '@/app/modules/marketplaces/sales-report-list';
import type {FinancialEntry,FinancialMonth} from '@/app/modules/marketplaces/sales-financial';
import {marketplaceClientRequest} from './Anunciados';
import css from './sales-report.module.css';
type Props={id:string;refreshKey?:number;companyId:string;year:number;month:number;filters:ReportFilters;brand:string;entries:FinancialEntry[];totals:FinancialMonth&{gross:number;orders:number};request:typeof marketplaceClientRequest;onClose:()=>void};
export default function MonthlySalesList({id,refreshKey=0,companyId,year,month,filters,brand,entries,totals,request,onClose}:Props){
 const [page,setPage]=useState(1),[data,setData]=useState<MonthlySalesPage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const {provider,accountId,warehouseId}=filters;
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setData(null);
  const params=new URLSearchParams({empresaId:companyId,year:String(year),month:String(month),provider,accountId,warehouseId,list:'1',page:String(page)});
  void request(`relatorio-vendas?${params}`,undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(25_000)])).then(value=>{if(!controller.signal.aborted){setData(value as MonthlySalesPage);setLoading(false);}}).catch(cause=>{if(!controller.signal.aborted){setError(cause instanceof Error&&cause.name==='TimeoutError'?'A lista demorou para responder. Tente novamente.':cause instanceof Error?cause.message:'Não foi possível consultar as vendas.');setLoading(false);}});
  return()=>controller.abort();
 },[companyId,year,month,provider,accountId,warehouseId,page,retry,request,refreshKey]);
 const money=(v:number|null)=>v===null?'A apurar':formatarMoeda(v/100);
 const dateLabel=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value.length===10?`${value}T12:00:00Z`:value));
 const matches=!!data&&data.confirmedGross===totals.gross&&data.confirmedOrders===totals.orders;
 const complete=(value:number,count:number)=>matches&&data&&count===data.confirmedOrders?money(value):'A apurar';
 return <section id={id} className={css.monthSales} aria-labelledby={`${id}-title`}>
  <div className={css.monthSalesHeading}><div><h3 id={`${id}-title`}>Vendas de {REPORT_MONTHS[month-1]} de {year}</h3>{data&&<small>{data.total} registro(s) · {data.confirmedOrders} confirmado(s)</small>}</div><BotaoAcaoCompacto onClick={onClose}>Fechar lista</BotaoAcaoCompacto></div>
  {loading&&<div className={css.listLoading} role="status"><LoadingPontos compacto cor={brand}/>Carregando vendas do mês…</div>}
  {error&&<p role="alert" className={css.message}>{error} <BotaoAcaoCompacto onClick={()=>setRetry(n=>n+1)}>Tentar novamente</BotaoAcaoCompacto></p>}
  {data&&<>
   {data.total===0?<p role="status" className={css.message}>Nenhuma venda neste mês e filtros.</p>:<>
    <div className={css.monthSalesScroll} role="region" aria-label="Lista de vendas do mês" tabIndex={0}>
     <table className={css.monthSalesTable}><caption className={css.srOnly}>Pedidos do mês. Canceladas, estornadas e pagamentos pendentes não entram no total confirmado.</caption>
      <thead><tr>{['Data','Produto / pedido','Marketplace / conta','Estoque','Qtd.','Bruto','Taxas','Frete','Líquido','Situação'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{data.rows.map(row=>{
       const financial=entries.find(entry=>entry.id===row.id&&entry.revision===row.revision)?.value||row.financial;
       return <tr key={row.id} data-excluded={!row.included}>
        <td>{dateLabel(row.date)}</td><td><details><summary>{row.items.map(item=>item.title).join(' · ')||'Pedido'}</summary><div className={css.saleDetails}><strong>Pedido {row.orderId}</strong>{row.items.map((item,i)=><p key={i}>{item.quantity} × {item.title}<br/>Unitário: {money(item.unitPrice)}</p>)}</div></details></td>
        <td>{row.provider==='mercado_livre'?'Mercado Livre':row.provider==='magalu'?'Magalu':'Venda direta'}<small>{row.account}</small></td><td>{row.warehouse}</td><td>{row.units}</td><td>{money(row.gross)}</td>
        <td>{money(row.included?financial?.fees??null:null)}</td><td>{money(row.included?financial?.freight??null:null)}</td><td>{money(row.included?financial?.net??null:null)}</td>
        <td><strong>{monthlySaleStatus(row.status)}</strong>{!row.included&&<small>Fora do total</small>}</td>
       </tr>;
      })}</tbody>
     </table>
    </div>
    <div className={css.monthSalesFooter}><strong>Total confirmado do mês{data.missingGross?' (incompleto)':''}</strong><span>Bruto <b>{money(data.confirmedGross)}</b></span><span>Taxas <b>{complete(totals.fees,totals.feeOrders)}</b></span><span>Frete <b>{complete(totals.freight,totals.freightOrders)}</b></span><span>Líquido <b>{complete(totals.net,totals.netOrders)}</b></span></div>
    {!matches&&<p className={css.note}>As vendas mudaram desde a consulta do quadro. Atualize-o para conferir os custos do total atual.</p>}
    <div className={css.listPagination}><BotaoAcaoCompacto disabled={page<=1} onClick={()=>setPage(n=>n-1)}>Anterior</BotaoAcaoCompacto><span>Página {data.page} de {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><BotaoAcaoCompacto disabled={data.page*data.pageSize>=data.total} onClick={()=>setPage(n=>n+1)}>Próxima</BotaoAcaoCompacto></div>
   </>}
  </>}
 </section>;
}
