'use client';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import LoadingPontos from '@/app/components/LoadingPontos';
import { formatarMoeda } from '@/app/lib/formatters';
import { REPORT_MONTHS, reportTotal, toggleReportMonth, type SalesReport as Report } from '@/app/modules/marketplaces/sales-report';
import MarketplaceSelect from './MarketplaceSelect';
import MonthlySalesList from './MonthlySalesList';
import {emptyFinancialMonths,mergeFinancial,sumFinancial,type FinancialMonth,type FinancialEntry} from '@/app/modules/marketplaces/sales-financial';
import { marketplaceClientRequest } from './Anunciados';
import { MARKETPLACE_ACCOUNT_SYNCED } from './startup-account-sync';
import { PRODUCT_STOCK_CHANGED } from './product-stock-events';
import styles from './marketplaces.module.css';
import reportStyles from './sales-report.module.css';
import {usePanelExpansion,type PanelExpansionProps} from './panel-expansion';

type Props=PanelExpansionProps & {companyId:string;brand:string;dark:boolean;refreshKey?:number;request?:typeof marketplaceClientRequest};
export default function SalesReport({companyId,brand,dark,refreshKey=0,request=marketplaceClientRequest,panelExpanded,onPanelExpandedChange}:Props){
  const id=useId(),root=useRef<HTMLElement>(null);
  const [visible,setVisible]=useState(false);
  const [expanded,setExpanded]=usePanelExpansion({panelExpanded,onPanelExpandedChange});
  const [year,setYear]=useState(()=>Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date())));
  const [provider,setProvider]=useState(''),[accountId,setAccount]=useState(''),[warehouseId,setWarehouse]=useState(''),[month,setMonth]=useState<number|null>(null);
  const [data,setData]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const scope=JSON.stringify([companyId,year,provider,accountId,warehouseId]),[loadedScope,setLoadedScope]=useState('');
  const current=data&&scope===loadedScope?data:null;
  const [financialResult,setFinance]=useState<{scope:string;months:FinancialMonth[];entries:FinancialEntry[]}>({scope:'',months:emptyFinancialMonths(),entries:[]}),[financialBusy,setFinancialBusy]=useState(false),[financialIssues,setFinancialIssues]=useState<string[]>([]);
  const [salesListOpen,setSalesListOpen]=useState(false);
  useEffect(()=>{
    if(!current){setFinancialBusy(false);return;}
    const controller=new AbortController();
    const financialScope=`${scope}:${JSON.stringify(current.months)}`;
    const retainPrevious=financialResult.scope===financialScope&&financialResult.entries.length>0;
    setFinance(previous=>previous.scope===financialScope?previous:{scope:financialScope,months:emptyFinancialMonths(),entries:[]});setFinancialIssues([]);setFinancialBusy(true);
    void (async()=>{
      let cursor:string|null=null;
      let collectedMonths=emptyFinancialMonths();const collectedEntries:FinancialEntry[]=[];
      for(let batch=0;batch<100;batch++){
        const result=await request('relatorio-vendas',{empresaId:companyId,year,provider,accountId,warehouseId,cursor},AbortSignal.any([controller.signal,AbortSignal.timeout(30_000)])) as {months:FinancialMonth[];entries:FinancialEntry[];cursor:string|null;issues:string[]};
        if(controller.signal.aborted)return;
        collectedMonths=mergeFinancial(collectedMonths,result.months);collectedEntries.push(...(result.entries||[]));
        if(!retainPrevious||!result.cursor)setFinance({scope:financialScope,months:collectedMonths,entries:[...collectedEntries]});
        setFinancialIssues(previous=>[...new Set([...previous,...result.issues])].slice(0,3));
        if(!result.cursor)return;
        if(result.cursor===cursor)throw new Error('A consulta financeira não avançou. Tente atualizar.');
        cursor=result.cursor;
      }
      throw new Error('Filtre o período ou a conta para concluir a apuração.');
    })().catch(cause=>{if(!controller.signal.aborted)setFinancialIssues(['Consulta interrompida: '+(cause instanceof Error&&cause.name==='TimeoutError'?'O marketplace demorou para responder. Atualize para tentar novamente.':cause instanceof Error?cause.message:'Não foi possível consultar os custos.')]);}).finally(()=>{if(!controller.signal.aborted)setFinancialBusy(false);});
    return()=>controller.abort();
  },[current?.generatedAt,companyId,year,provider,accountId,warehouseId,request]);

  useEffect(()=>{
    if(!root.current)return;
    if(!('IntersectionObserver' in window)){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'200px'});
    observer.observe(root.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const refresh=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.companyId!==companyId)return;clearTimeout(timer);timer=setTimeout(()=>setRevision(n=>n+1),1000);};
    window.addEventListener(MARKETPLACE_ACCOUNT_SYNCED,refresh);window.addEventListener(PRODUCT_STOCK_CHANGED,refresh);return()=>{clearTimeout(timer);window.removeEventListener(MARKETPLACE_ACCOUNT_SYNCED,refresh);window.removeEventListener(PRODUCT_STOCK_CHANGED,refresh);};
  },[companyId]);
  useEffect(()=>{
    if(!visible)return;
    const controller=new AbortController();
    setLoading(true);setError('');
    const query=new URLSearchParams({empresaId:companyId,year:String(year),provider,accountId,warehouseId});
    void request(`relatorio-vendas?${query}`,undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(25_000)])).then(result=>{
      if(controller.signal.aborted)return;
      setData(result as Report);setLoadedScope(scope);setLoading(false);
    }).catch(cause=>{if(controller.signal.aborted)return;setError(cause instanceof Error&&['TimeoutError','AbortError'].includes(cause.name)?'O relatório demorou para responder. Tente novamente.':cause instanceof Error?cause.message:'Não foi possível carregar o relatório.');setLoading(false);});
    return()=>controller.abort();
  },[visible,companyId,year,provider,accountId,warehouseId,scope,request,refreshKey,revision]);
  const annual=useMemo(()=>current?reportTotal(current.months):null,[current]);
  const selected=current?(month===null?annual:current.months[month-1]):null;
  const maximum=Math.max(1,...(current?.months.map(m=>m.gross)||[]));
  const money=(value:number)=>formatarMoeda(value/100);
  const years=Array.from({length:new Date().getFullYear()-1999},(_,i)=>({value:String(new Date().getFullYear()-i),label:String(new Date().getFullYear()-i)}));
  const period=month===null?String(year):`${REPORT_MONTHS[month-1]} de ${year}`;
  const finance=financialResult.scope===`${scope}:${JSON.stringify(current?.months)}`?financialResult.months:emptyFinancialMonths();
  const costs=month===null?sumFinancial(finance):finance[month-1];
  const costLabel=(value:number,count:number)=>selected&&selected.orders>0&&count===0?'A apurar':money(value);
  const coverage=(count:number)=>selected&&count>0&&count<selected.orders?`${count}/${selected.orders} pedidos · parcial`:'';

  return <article ref={root} className={`${styles.panel} ${reportStyles.report} ${dark?reportStyles.dark:''}`} style={{'--brand':brand} as CSSProperties} aria-labelledby={`${id}-title`}>
    <div className={`${styles.panelHeading} ${reportStyles.heading}`}><div><h2 id={`${id}-title`}>Resultado de vendas</h2></div><div className={reportStyles.actions}>
      <BotaoAcaoCompacto disabled={loading||financialBusy} onClick={()=>setRevision(n=>n+1)}>{loading||financialBusy?'Atualizando…':'Atualizar'}</BotaoAcaoCompacto>
      {month!==null&&<BotaoAcaoCompacto variante="discreto" onClick={()=>setMonth(null)}>Ver ano inteiro</BotaoAcaoCompacto>}
      <BotaoExpandirCard variante="painel" modo="lista" somenteIcone contexto="Resultado de vendas" controlsId="sales-report-content" expandido={expanded} onClick={()=>setExpanded(v=>!v)} corPrimaria={brand} darkMode={dark}/>
    </div></div>
    <div id="sales-report-content" hidden={!expanded}>
      <div className={reportStyles.filters}>
        <MarketplaceSelect label="Marketplace" placeholder="Todos" options={[{value:'',label:'Todos'},{value:'mercado_livre',label:'Mercado Livre'},{value:'magalu',label:'Magalu'},{value:'direct',label:'Vendas diretas'}]} value={provider} onChange={value=>{setProvider(value);setAccount('');}}/>
        <MarketplaceSelect label="Conta" placeholder="Todas" disabled={provider==='direct'} options={[{value:'',label:'Todas'},...(data?.accounts||[]).filter(a=>!provider||a.provider===provider)]} value={accountId} onChange={setAccount}/>
        <MarketplaceSelect label="Estoque" placeholder="Todos" options={[{value:'',label:'Todos'},...(data?.warehouses||[])]} value={warehouseId} onChange={setWarehouse}/>
        <MarketplaceSelect label="Ano" placeholder="Selecione" options={years} value={String(year)} onChange={value=>{setYear(Number(value));setMonth(null);}}/>
      </div>
      {error&&<p role="alert" className={reportStyles.message}>{error} <BotaoAcaoCompacto onClick={()=>setRevision(n=>n+1)}>Tentar novamente</BotaoAcaoCompacto></p>}
      {loading&&!current&&<div role="status" className={reportStyles.wait}><LoadingPontos cor={brand}/>Carregando o resultado de vendas…</div>}
      {current&&annual&&selected&&<div aria-busy={loading}>
        
        <div className={reportStyles.metrics}>
          <div><span>Total em vendas · {month===null?year:REPORT_MONTHS[month-1]}</span><strong>{money(selected.gross)}</strong><small>{selected.orders} pedidos · {selected.units} unidades{selected.missingGross?' · total incompleto':''}</small></div>
          <div data-tone="fees"><span>Taxas</span><strong>{costLabel(costs.fees,costs.feeOrders)}</strong><small>{coverage(costs.feeOrders)}</small></div>
          <div data-tone="shipping"><span>Frete</span><strong>{costLabel(costs.freight,costs.freightOrders)}</strong><small>{coverage(costs.freightOrders)}</small></div>
          <div data-tone="net"><span>Líquido</span><strong>{costLabel(costs.net,costs.netOrders)}</strong><small>{coverage(costs.netOrders)}</small></div>
        </div>
        {!annual.orders&&<p role="status" className={reportStyles.message}>Nenhuma venda confirmada nos filtros selecionados.</p>}
        <div className={reportStyles.content}>
          <table className={reportStyles.table}><caption className={reportStyles.srOnly}>Vendas mensais de {year}. Selecione um mês no gráfico para detalhar a composição.</caption><thead><tr><th scope="col">Mês</th><th scope="col">{year}</th></tr></thead><tbody>
            {current.months.map(m=><tr key={m.month} data-selected={month===m.month}><th scope="row"><button type="button" className={reportStyles.monthButton} aria-pressed={month===m.month} aria-label={`Selecionar ${REPORT_MONTHS[m.month-1]} de ${year}`} onClick={()=>setMonth(toggleReportMonth(month,m.month))}>{REPORT_MONTHS[m.month-1]}</button></th><td>{m.missingGross?`${money(m.gross)} *`:money(m.gross)}</td></tr>)}
          </tbody><tfoot><tr><th scope="row">Total</th><td>{money(annual.gross)}{annual.missingGross?' *':''}</td></tr></tfoot></table>
          <div className={reportStyles.charts}>
            <section className={reportStyles.chart} aria-labelledby={`${id}-monthly`}><h3 id={`${id}-monthly`}>Desempenho mensal · {year}</h3><div className={reportStyles.bars}>
              {current.months.map(m=><button type="button" key={m.month} className={reportStyles.barButton} aria-pressed={month===m.month} aria-label={`${REPORT_MONTHS[m.month-1]}: ${money(m.gross)}, ${m.orders} pedidos${m.missingGross?', total incompleto':''}`} onClick={()=>setMonth(toggleReportMonth(month,m.month))}>
                <span className={reportStyles.barTrack}><span className={reportStyles.bar} style={{height:`${m.gross/maximum*100}%`}}/></span><span>{REPORT_MONTHS[m.month-1].slice(0,3).toUpperCase()}</span>
              </button>)}
            </div></section>
            <section className={reportStyles.chart} aria-labelledby={`${id}-composition`}><div className={reportStyles.compositionHeading}><h3 id={`${id}-composition`}>Do bruto ao líquido · {period}</h3>{month!==null&&<BotaoAcaoCompacto aria-expanded={salesListOpen} aria-controls={`${id}-sales-list`} onClick={()=>setSalesListOpen(open=>!open)}>{salesListOpen?'Ocultar vendas':'Ver vendas do mês'}</BotaoAcaoCompacto>}</div>
              {costs.netOrders===selected.orders&&!selected.missingGross?<FinancialWaterfall gross={selected.gross} fees={costs.fees} freight={costs.freight} adjustments={costs.adjustments} net={costs.net}/>:<div className={reportStyles.composition}>
                <div><span>Bruto</span><strong>{money(selected.gross)}</strong></div><div data-tone="fees"><span>Taxas</span><strong>{costLabel(costs.fees,costs.feeOrders)}</strong></div><div data-tone="shipping"><span>Frete</span><strong>{costLabel(costs.freight,costs.freightOrders)}</strong></div><div data-tone="net"><span>Líquido</span><strong>{costLabel(costs.net,costs.netOrders)}</strong></div>
              </div>}
              <p className={reportStyles.note} role="status">{financialBusy?'Consultando custos nos marketplaces…':selected.orders>costs.netOrders?`${selected.orders-costs.netOrders} pedido(s) com custos pendentes.${financialIssues[0]?' '+financialIssues[0]:''}`:financialIssues[0]?.startsWith('Consulta interrompida:')?`Últimos custos confirmados. ${financialIssues[0]}`:'Líquido após taxas e frete do vendedor.'}</p>

            </section>
          </div>
        </div>
        {month!==null&&salesListOpen&&<MonthlySalesList key={`${scope}:${month}`} refreshKey={revision} id={`${id}-sales-list`} companyId={companyId} year={year} month={month} filters={{provider,accountId,warehouseId}} brand={brand} request={request} entries={financialResult.scope===`${scope}:${JSON.stringify(current.months)}`?financialResult.entries:[]} totals={{...costs,gross:selected.gross,orders:selected.orders}} onClose={()=>setSalesListOpen(false)}/>}
        <p className={reportStyles.note}>Vendas confirmadas em reais · canceladas e pagamentos pendentes excluídos. {warehouseId==='unassigned'||!warehouseId?'Pedidos sem origem histórica ficam em “Origem não identificada”.':''}{annual.missingGross?' * Há pedidos sem valor bruto informado.':''}</p>
      </div>}
    </div>
  </article>;
}

function FinancialWaterfall({gross,fees,freight,adjustments,net}:{gross:number;fees:number;freight:number;adjustments:number;net:number}){
  const entries=[{label:'Bruto',from:0,to:gross,value:gross,tone:'gross'},{label:'Taxas',from:gross,to:gross-fees,value:-fees,tone:'fees'},{label:'Frete',from:gross-fees,to:gross-fees-freight,value:-freight,tone:'shipping'},...(adjustments?[{label:'Ajustes',from:gross-fees-freight,to:net,value:adjustments,tone:'adjustments'}]:[]),{label:'Líquido',from:0,to:net,value:net,tone:'net'}];
  const max=Math.max(1,...entries.flatMap(e=>[e.from,e.to])),min=Math.min(0,...entries.flatMap(e=>[e.from,e.to]));
  const y=(value:number)=>136-(value-min)/(max-min)*100;
  const step=760/entries.length,barWidth=Math.min(116,step*.68);
  return <svg className={reportStyles.waterfall} viewBox="0 0 800 176" role="img" aria-label={`Bruto ${formatarMoeda(gross/100)}, taxas ${formatarMoeda(fees/100)}, frete ${formatarMoeda(freight/100)}, ajustes ${formatarMoeda(adjustments/100)}, líquido ${formatarMoeda(net/100)}`}>
    <line x1="20" x2="780" y1={y(0)} y2={y(0)} className={reportStyles.axis}/>
    {entries.map((entry,i)=>{const x=20+step*i+(step-barWidth)/2,top=y(Math.max(entry.from,entry.to)),height=Math.abs(y(entry.from)-y(entry.to));return <g key={entry.label} data-tone={entry.tone}>
      {i<entries.length-1&&<line x1={x+barWidth} x2={20+step*(i+1)+(step-barWidth)/2} y1={y(entry.to)} y2={y(entry.to)} className={reportStyles.connector}/>}
      <rect x={x} y={top} width={barWidth} height={Math.max(1,height)} rx="3"/>
      <text x={x+barWidth/2} y={Math.max(15,top-9)} textAnchor="middle" className={reportStyles.amount}>{entry.value<0?'− ':''}{formatarMoeda(Math.abs(entry.value)/100)}</text>
      <text x={x+barWidth/2} y="165" textAnchor="middle">{entry.label}</text>
    </g>;})}
  </svg>;
}
