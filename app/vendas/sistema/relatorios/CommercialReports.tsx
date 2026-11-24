'use client';
import {useEffect,useMemo,useRef,useState,type ReactNode,type SyntheticEvent} from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import CampoSelecaoPesquisavel from '@/app/components/CampoSelecaoPesquisavel';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {REPORT_AREAS,REPORT_TYPES,buildCommercialReport,freshReportFilters,reportFiltersSummary,validateReportFilters,type ReportDocument,type ReportFilters} from '../../lib/report-builder.mjs';
import {formatReportCell} from '../../lib/report-export';
import {normalizarTexto} from '@/app/lib/formatters';

type Item=Record<string,any>;
type Option={value:string;label:string};
function Multi({label,value,options,onChange}:{label:string;value:string[];options:Option[];onChange:(values:string[])=>void}){
 const [query,setQuery]=useState('');const root=useRef<HTMLDetailsElement>(null);
 const selected=options.filter(o=>value.includes(o.value));
 return <div className="report-filter"><span>{label}</span><details ref={root} className="report-multi" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();root.current?.removeAttribute('open');root.current?.querySelector('summary')?.focus();}}}>
  <summary aria-label={`${label}: ${selected.length?selected.map(o=>o.label).join(', '):'Todos'}`}>{selected.length?selected.map(o=>o.label).join(', '):'Todos'}</summary>
  <div className="report-multi-options"><CampoBusca value={query} onChange={setQuery} aria-label={`Pesquisar ${label.toLowerCase()}`} placeholder="Pesquisar"/><button type="button" className="report-text-button" onClick={()=>onChange([])}>Todos</button><div>{options.filter(o=>normalizarTexto(o.label).includes(normalizarTexto(query))).map(o=><label key={o.value}><input type="checkbox" checked={value.includes(o.value)} onChange={e=>onChange(e.target.checked?[...value,o.value]:value.filter(v=>v!==o.value))}/><span>{o.label}</span></label>)}{!options.length&&<p>Nenhuma opção disponível.</p>}</div></div>
 </details></div>;
}
function EntityFilter({label,value,options,onChange}:{label:string;value:string[];options:Option[];onChange:(values:string[])=>void}){
 return <div className="report-filter report-entity-filter"><span>{label}</span>
  <CampoSelecaoPesquisavel value="" label={`Pesquisar ${label.toLowerCase()}`} placeholder={`Digite para buscar ${label.toLowerCase()}`} searchOnTypeOnly options={options.filter(o=>!value.includes(o.value))} onChange={next=>{if(next&&!value.includes(next))onChange([...value,next]);}}/>
  {value.length>0&&<div className="report-selected-items" aria-label={`${label} selecionados`}>{value.map(key=><button key={key} type="button" onClick={()=>onChange(value.filter(v=>v!==key))} aria-label={`Remover ${options.find(o=>o.value===key)?.label||key}`}>{options.find(o=>o.value===key)?.label||key} ×</button>)}</div>}
 </div>;
}
const unique=(list:Option[])=>[...new Map(list.filter(o=>o.value).map(o=>[o.value,o])).values()].sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
export default function CommercialReports({operations,clients,catalog,receivables,fiscalDrafts,company,can,overview,renderIcon,onResultChange}:{operations:Item[];clients:Item[];catalog:Item[];receivables:Item[];fiscalDrafts:Item[];company:{name:string;document?:string;color?:string;logoUrl?:string};can:(permission:string)=>boolean;overview:ReactNode;renderIcon:(icon:string)=>ReactNode;onResultChange:(active:boolean)=>void}){
 const [area,setArea]=useState('overview'),[id,setId]=useState(''),[configs,setConfigs]=useState<Record<string,ReportFilters>>({});
 const [document,setDocument]=useState<ReportDocument|null>(null),[result,setResult]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(''),[page,setPage]=useState(0);
 const mounted=useRef(true),exporting=useRef(false),session=useRef(`reports-${Date.now()}-${Math.random()}`),backButton=useRef<HTMLButtonElement>(null),generateButton=useRef<HTMLButtonElement>(null);
 const allowed=REPORT_TYPES.filter(r=>can(r.permission)&&(!r.cost||can('catalog.view_cost'))&&(!r.financial||can('reports.view_financial')));
 const active=allowed.find(r=>r.id===id),filters=configs[id]||freshReportFilters();
 const currentCan=useRef(can);currentCan.current=can;
 const canAccess=(doc:ReportDocument)=>{const spec=REPORT_TYPES.find(r=>r.id===doc.id);return Boolean(currentCan.current('reports.view')&&spec&&currentCan.current(spec.permission)&&(!(spec.cost||doc.columns.some(c=>['cost','margin'].includes(c.id)))||currentCan.current('catalog.view_cost'))&&(!spec.financial||currentCan.current('reports.view_financial')));};
 useEffect(()=>{mounted.current=true;const onPop=()=>{const generated=window.history.state?.avantaReportSession===session.current;setResult(generated);onResultChange(generated);};window.addEventListener('popstate',onPop);return()=>{mounted.current=false;window.removeEventListener('popstate',onPop);if(window.history.state?.avantaReportSession===session.current){const state={...window.history.state};delete state.avantaReportSession;const url=new URL(window.location.href);url.hash='';window.history.replaceState(state,'',url);}onResultChange(false);};},[onResultChange]);
 useEffect(()=>{if(result)backButton.current?.focus();else generateButton.current?.focus({preventScroll:true});},[result]);
 const clientOptions=useMemo(()=>unique([...clients.map(c=>({value:c.id,label:c.legalName||c.name||c.tradeName||c.displayName||c.id})),...operations.map(o=>({value:o.customerId||o.persistence?.customerId||o.client,label:o.client}))]),[clients,operations]);
 const productOptions=useMemo(()=>unique([...catalog.filter(c=>c.kind!=='servico'&&c.category!=='Serviço').map(c=>({value:c.catalogItemId||c.sku,label:c.name})),...operations.flatMap(o=>(o.order?.lines||[]).filter((l:Item)=>l.kind!=='servico').map((l:Item)=>({value:l.catalogItemId||l.sku||l.name,label:l.name})))]),[catalog,operations]);
 const serviceOptions=useMemo(()=>unique([...catalog.filter(c=>c.kind==='servico'||c.category==='Serviço').map(c=>({value:c.catalogItemId||c.sku||c.name,label:c.name})),...operations.filter(o=>o.type==='ordem_servico').flatMap(o=>(o.serviceOrder?.lines||[]).map((l:Item)=>({value:l.catalogItemId||l.sku||l.name,label:l.name})))]),[catalog,operations]);
 const sellerOptions=unique(operations.map(o=>({value:o.order?.seller||o.serviceOrder?.technician||'Não informado',label:o.order?.seller||o.serviceOrder?.technician||'Não informado'})));
 const labels=Object.fromEntries([...clientOptions,...productOptions,...serviceOptions].map(o=>[o.value,o.label]));
 const change=(key:keyof ReportFilters,value:string|string[])=>{setConfigs(current=>({...current,[id]:{...(current[id]||freshReportFilters()),[key]:value}}));setError('');};
 const choose=(next:string)=>{setId(next);setError('');};
 const alignConfiguration=(event:SyntheticEvent<HTMLFormElement>)=>{
  const target=event.target;
  if(!(target instanceof HTMLElement)||!target.closest('.field,.report-filter')||target.closest('.report-multi-options,.report-selected-items'))return;
  const form=event.currentTarget;
  const topbar=form.closest('.commercial-app')?.querySelector('.topbar');
  const top=Math.max(0,topbar?.getBoundingClientRect().bottom||0)+12;
  if(Math.abs(form.getBoundingClientRect().top-top)>2)form.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };

 const input={id,filters,operations,clients,catalog,receivables,fiscalDrafts,canViewCosts:can('catalog.view_cost'),canViewFinancial:can('reports.view_financial')};
 const columnOptions=useMemo(()=>active?buildCommercialReport({...input,filters:freshReportFilters()}).columns:[],[id,Boolean(active),operations,clients,catalog,receivables,fiscalDrafts,can('catalog.view_cost'),can('reports.view_financial')]);
 const fixedBilled=['billing','products','client-products','clients-ranking','sellers','product-margin','services'].includes(id);
 const statuses=id==='receivables'?['Em aberto','Vence hoje','Atrasado','Recebido parcial','Recebido','Estornado']:id==='clients'?unique(clients.map(c=>({value:c.status,label:c.status}))).map(c=>c.value):id==='fiscal'?unique(fiscalDrafts.map(f=>({value:f.status,label:f.status}))).map(c=>c.value):['Rascunho','Confirmado','Em separação','Faturado','Cancelado','Devolvido','Concluído'];
 const methods=unique([...operations.map(o=>({value:o.order?.paymentMethod||o.serviceOrder?.paymentMethod,label:o.order?.paymentMethod||o.serviceOrder?.paymentMethod})),...receivables.map(r=>({value:r.method,label:r.method}))]);
 const generate=()=>{if(!active||!can('reports.view'))return;const message=validateReportFilters(filters);if(message){setError(message);return;}try{const snapshot=buildCommercialReport(input);setDocument(snapshot);setPage(0);setResult(true);setError('');const url=new URL(window.location.href);url.hash='relatorio-gerado';window.history.pushState({...window.history.state,avantaReportSession:session.current},'',url);onResultChange(true);window.scrollTo({top:0,behavior:'instant'});}catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar o relatório.');}};
 const back=()=>{if(busy)return;if(window.history.state?.avantaReportSession===session.current)window.history.back();else{setResult(false);onResultChange(false);}setError('');};
 const exportFile=async(format:'pdf'|'xlsx')=>{
  if(!document||!can('reports.export')||!canAccess(document)||exporting.current)return;
  exporting.current=true;setBusy(format);setError('');
  try{const {buildReportExcel,buildReportPdf,downloadReport}=await import('../../lib/report-export');const summary=reportFiltersSummary(document.filters,labels);let bytes:Uint8Array;
   if(format==='pdf'){const {prepareOrderLogo}=await import('../../lib/order-print');const logo=await prepareOrderLogo(company.logoUrl||'');bytes=await buildReportPdf(document,{...company,logo},summary);}else{const book=await buildReportExcel(document,company,summary);bytes=new Uint8Array(await book.xlsx.writeBuffer());}
   if(!mounted.current)return;
   if(!currentCan.current('reports.export')||!canAccess(document))throw Error('Seu acesso foi alterado. Gere novamente o relatório.');
   downloadReport(bytes,`avantalab-${document.id}-${document.generatedAt.slice(0,10)}.${format}`,format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Não foi possível exportar. Tente novamente.');}finally{exporting.current=false;if(mounted.current)setBusy('');}
 };
 if(result&&document){
  if(!canAccess(document))return <section className="report-result-page"><BotaoAcaoCompacto ref={backButton} onClick={back}>← Voltar</BotaoAcaoCompacto><p role="alert">Seu acesso a este relatório foi alterado. Volte para selecionar outro relatório.</p></section>;
  const count=Math.ceil(document.rows.length/50);
  return <section className="report-result-page" aria-label="Relatório gerado">
   <div className="report-result-toolbar"><BotaoAcaoCompacto ref={backButton} variante="secundario" disabled={Boolean(busy)} onClick={back}>← Voltar</BotaoAcaoCompacto><div><BotaoAcaoCompacto disabled={!can('reports.export')||Boolean(busy)} onClick={()=>void exportFile('pdf')}>{busy==='pdf'?'Gerando PDF…':'PDF'}</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={!can('reports.export')||Boolean(busy)} onClick={()=>void exportFile('xlsx')}>{busy==='xlsx'?'Gerando Excel…':'Excel'}</BotaoAcaoCompacto></div></div>
   <header><h1>{document.title}</h1><p>{reportFiltersSummary(document.filters,labels).join(' · ')}</p><small>Gerado em {new Date(document.generatedAt).toLocaleString('pt-BR')}</small></header>
   {error&&<p className="report-error" role="alert">{error}</p>}
   <div className="report-totals"><div><span>Registros</span><strong>{document.totals.records}</strong></div>{document.totals.value!==undefined&&<div><span>Valor total</span><strong>{formatReportCell(document.totals.value,'currency')}</strong></div>}{document.totals.balance!==undefined&&<div><span>Saldo pendente</span><strong>{formatReportCell(document.totals.balance,'currency')}</strong></div>}</div>
   {document.notes.map(n=><p key={n} className="report-note">{n}</p>)}
   <div className="report-full-table"><table><caption className="sr-only">{document.title}</caption><thead><tr>{document.columns.map(c=><th key={c.id} scope="col">{c.label}</th>)}</tr></thead><tbody>{document.rows.slice(page*50,page*50+50).map((row,i)=><tr key={page*50+i}>{document.columns.map(c=><td key={c.id} className={['number','currency'].includes(c.format)?'numeric':''}>{formatReportCell(row[c.id],c.format)}</td>)}</tr>)}</tbody></table>{!document.rows.length&&<p role="status" className="report-empty">Nenhum registro encontrado para os filtros selecionados.</p>}</div>
   {count>1&&<nav className="report-pagination" aria-label="Páginas do relatório"><BotaoAcaoCompacto disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</BotaoAcaoCompacto><span>Página {page+1} de {count} · {document.rows.length} registros</span><BotaoAcaoCompacto disabled={page+1>=count} onClick={()=>setPage(p=>p+1)}>Próxima</BotaoAcaoCompacto></nav>}
  </section>;
 }
 return <section className="report-config-page" aria-label="Configuração de relatórios">
  <header className="page-heading"><div><h1>Relatórios</h1></div></header>
  <nav className="report-area-nav" aria-label="Áreas de relatórios">{REPORT_AREAS.filter(([a])=>a==='overview'||allowed.some(r=>r.area===a)).map(([key,label,icon])=><button type="button" key={key} aria-pressed={area===key} className={area===key?'active':''} onClick={()=>{setArea(key);choose(allowed.find(r=>r.area===key)?.id||'');}}>{renderIcon(icon==='cart'?'sale':icon)}<span>{label}</span></button>)}</nav>
  {area==='overview'?overview:<>
   <nav className="report-type-nav" aria-label="Tipo de relatório">{allowed.filter(r=>r.area===area).map(r=><button key={r.id} type="button" aria-pressed={id===r.id} className={id===r.id?'active':''} onClick={()=>choose(r.id)}>{r.title}</button>)}</nav>
   {active?<form className="report-config-form" onPointerDownCapture={alignConfiguration} onFocusCapture={alignConfiguration} onSubmit={e=>{e.preventDefault();generate();}}>
    <h2>Configurar · {active.title}</h2>
    <div className="report-filter-grid">
     {!['stock','sellers'].includes(id)&&<EntityFilter key={`${id}-clients`} label="Clientes" value={filters.clients} options={clientOptions} onChange={v=>change('clients',v)}/>}
     {['orders','billing','products','client-products','product-margin','stock'].includes(id)&&<EntityFilter key={`${id}-products`} label="Produtos" value={filters.products} options={productOptions} onChange={v=>change('products',v)}/>}
     {id==='services'&&<EntityFilter key={`${id}-services`} label="Serviços" value={filters.products} options={serviceOptions} onChange={v=>change('products',v)}/>}
     {id!=='stock'&&<><label className="field"><span>Data inicial</span><input type="date" name="reportFrom" value={filters.from} onInput={e=>change('from',e.currentTarget.value)} onChange={e=>change('from',e.target.value)}/></label><label className="field"><span>Data final</span><input type="date" name="reportTo" value={filters.to} onInput={e=>change('to',e.currentTarget.value)} onChange={e=>change('to',e.target.value)}/></label></>}
     {['orders','quotes','billing','products','client-products','clients-ranking','sellers','product-margin','services'].includes(id)&&<Multi label={id==='services'?'Técnicos':'Vendedores'} value={filters.sellers} options={sellerOptions} onChange={v=>change('sellers',v)}/>}
     {!fixedBilled&&id!=='stock'&&<Multi label="Situação" value={filters.statuses} options={statuses.map(s=>({value:s,label:s}))} onChange={v=>change('statuses',v)}/>}
     {['orders','quotes','billing','receivables','clients-ranking','products','client-products'].includes(id)&&<Multi label="Forma de pagamento" value={filters.methods} options={methods} onChange={v=>change('methods',v)}/>}
     <label className="field"><span>Ordenar por</span><select value={filters.sort} onChange={e=>change('sort',e.target.value)}><option value="date-desc">Data mais recente</option><option value="name">Nome</option>{columnOptions.some(c=>c.id==='value')&&<option value="value-desc">Maior valor</option>}{columnOptions.some(c=>c.id==='quantity')&&<option value="quantity-desc">Quantidade vendida</option>}</select></label>
     <label className="field"><span>Agrupar por</span><select value={filters.group} onChange={e=>change('group',e.target.value)}><option value="none">Nenhum</option>{columnOptions.filter(c=>['client','seller','product'].includes(c.id)).map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label>
     <Multi label="Colunas" value={filters.columns} options={columnOptions.map(c=>({value:c.id,label:c.label}))} onChange={v=>change('columns',v)}/>
    </div>
    {fixedBilled&&<p className="report-note">{id==='services'?'Somente serviços concluídos.':'Somente vendas faturadas; cancelamentos e devoluções não compõem os totais.'} O período considera {id==='services'?'a data da operação':'a data do faturamento'}.</p>}
    {id==='stock'&&<p className="report-note">Posição atual do estoque.</p>}
    {error&&<p className="report-error" role="alert">{error}</p>}
    <footer><BotaoAcaoCompacto type="button" variante="secundario" onClick={()=>{setConfigs({});setError('');}}>Limpar filtros</BotaoAcaoCompacto><BotaoAcaoCompacto ref={generateButton} type="submit" variante="primario">Gerar relatório →</BotaoAcaoCompacto></footer>
   </form>:<p role="status">Nenhum relatório disponível com seu acesso atual.</p>}
  </>}
 </section>;
}
