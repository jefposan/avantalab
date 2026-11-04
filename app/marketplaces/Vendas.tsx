'use client';

import LabelNativePrint from './LabelNativePrint';
import {shippingLabelFilename} from '@/app/modules/marketplaces/label-download';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import Tooltip from '@/app/components/Tooltip';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { Icon } from '@/app/projetos/components/Icon';
import { dceStatusText, canConsultSaleLabel, canIssueDce, canPrintSaleLabel, labelActionText, labelUnavailableText, saleStatusText, shipmentStatusText, orderStatusText, saleConflictText, orderedSaleGroups, type SaleGroup } from '@/app/modules/marketplaces/sales-status';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { emptyFiscal } from '@/app/modules/marketplaces/fiscal-state';
import type { MarketplaceAccount } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import { accountDisplayName } from './account-identification';
import SalePostSale from './SalePostSale';
import SaleItems from './SaleItems';
import SaleFiscalDocuments from './SaleFiscalDocuments';
import DateOrderButton from './DateOrderButton';
import { collapseMarketplacePanel } from './collapse-panel';
import { scrollMarketplaceRow } from './scroll-panel-row';
import { sortSalesByDate, type DateOrder } from '@/app/modules/marketplaces/date-order';
import type { SalesMarketplace, SalesView } from '@/app/modules/marketplaces/sales-marketplace-filter';
import {marketplaceClientRequest} from './Anunciados';
import {DirectSaleRow} from './DirectSalesHistory';
import type {LotsRequest} from './usePriceLotCapture';
import styles from './marketplaces.module.css';
import saleLayout from './sale-actions.module.css';
import { marketplaceDateTime as date } from '@/app/modules/marketplaces/date-format';

type Sale = MarketplaceSale;
type LabelPreview = { companyId: string; saleId: string; url: string; format: 'pdf' | 'zpl2'; filename: string; downloadOnly?: boolean };
type DceFeedback = { saleId: string; message: string };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const providerBrand = (provider: Sale['provider']) => provider === 'magalu'
  ? { name: 'Magalu', logo: '/images/marketplaces/magalu.svg' }
  : { name: 'Mercado Livre', logo: '/images/marketplaces/mercado-livre.png' };

async function copyOrderReference(orderId: string) {
  const value = `Pedido #${orderId}`;
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return; }
  const field = document.createElement('textarea');
  field.value = value; field.setAttribute('readonly', ''); field.style.position = 'fixed'; field.style.opacity = '0';
  document.body.append(field); field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('copy_failed');
}

export default function Vendas({ companyId, accountId, onAccountChange, group, onGroupChange, counts, total, accounts, marketplaceOptions, selectedMarketplaces, onMarketplacesChange, sales, canManage, loading, error, warnings = [], awaitingUpdates, onRefresh, onSaleUpdated, expanded, onExpandedChange, saleToOpen, dark, brand, reorderHandle, request, view = 'online', onViewChange }: {
  companyId: string; accountId: string; onAccountChange: (id: string) => void; accounts: MarketplaceAccount[];
  group: SaleGroup | ''; onGroupChange: (group: SaleGroup | '') => void; counts: Record<SaleGroup, number>; total: number;
  marketplaceOptions: Array<{ value: SalesMarketplace; label: string }>; selectedMarketplaces: SalesMarketplace[]; onMarketplacesChange: (values: SalesMarketplace[]) => void;
  sales: Sale[]; canManage: boolean; loading: boolean; error: string; awaitingUpdates: number; onRefresh: () => void; onSaleUpdated: (sale: Sale) => void;
  expanded: boolean; onExpandedChange: (expanded: boolean) => void; saleToOpen: string; dark: boolean; brand: string; reorderHandle?: ReactNode; warnings?: string[];request?:LotsRequest;
  view?: SalesView; onViewChange?: (view: SalesView) => void;
}) {
  const [printError, setPrintError] = useState('');
  const [open, setOpen] = useState(() => saleToOpen && sales.some(sale => sale.id === saleToOpen) ? saleToOpen : '');
  const [printing, setPrinting] = useState('');
  const [labelPreview, setLabelPreview] = useState<LabelPreview | null>(null);
  const [labelFormat] = useState<'pdf' | 'zpl2'>('pdf');
  const labelRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { labelRequest.current?.abort(); }, [companyId, accountId]);
  useEffect(() => () => { if (labelPreview) URL.revokeObjectURL(labelPreview.url); }, [labelPreview]);
  const [dceConfirmation, setDceConfirmation] = useState<Sale | null>(null);
  const [issuingDce, setIssuingDce] = useState('');
  const [dceFeedback, setDceFeedback] = useState<DceFeedback | null>(null);
  const dceLock = useRef(false);
  const [dceFinished, setDceFinished] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState('');
  const [copyError, setCopyError] = useState('');
  const [order, setOrder] = useState<DateOrder>('desc');
  const [nativePrintBusy,setNativePrintBusy]=useState(false);
  const alertScrollDone = useRef(false);
  const orderedSales = useMemo(() => sortSalesByDate(sales, order), [sales, order]);
  const directRequest=useCallback<LotsRequest>((path,options)=>request?request(path,options):marketplaceClientRequest(path.replace('/api/modulos/marketplaces/',''),options?.body?JSON.parse(String(options.body)):undefined,options?.signal||undefined,options?.method),[request]);
  const directAccounts=[...new Map(sales.filter(s=>s.directSale).map(s=>[s.connectionId,{value:s.connectionId,label:`${s.directSale!.warehouseName} · Venda direta`}])).values()];
  const confirmedTotal=sales.filter(s=>['paid','confirmed'].includes(s.status)).reduce((sum,s)=>sum+(s.total??0),0);

  async function printLabel(sale: Sale, selectedFormat?: 'pdf' | 'zpl2', downloadOnly = false) {
    if (labelRequest.current || printing || !canManage || !canPrintSaleLabel(sale)) return;
    const controller = new AbortController(); labelRequest.current = controller;
    const format = selectedFormat ?? labelFormat;
    setPrinting(sale.id); setPrintError('');
    try {
      const { data } = await (await import('@/app/lib/supabase')).supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Entre novamente para imprimir.');
      const response = await fetch('/api/modulos/marketplaces/vendas/etiqueta', { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id, format, orderId:sale.orderId, productName:sale.items[0]?.title||'' }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Não foi possível obter a etiqueta.'); }
      const file = await response.blob();
      if (!file.size || !file.type.includes(format === 'zpl2' ? 'text/plain' : 'pdf')) throw new Error('O Mercado Livre não retornou a etiqueta no formato escolhido.');
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(file);
      const filename = shippingLabelFilename(sale.orderId,sale.items,format==='zpl2'?'txt':'pdf');
      setLabelPreview({ companyId, saleId: sale.id, url, format, filename, downloadOnly });
      if (downloadOnly || format === 'zpl2') { const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); }
    } catch (err) { if (!controller.signal.aborted) setPrintError(err instanceof Error ? err.message : 'Não foi possível obter a etiqueta.'); }
    finally { if (labelRequest.current === controller) { labelRequest.current = null; setPrinting(''); } }
  }

  async function issueDce(sale: Sale) {
    if (dceLock.current || !canManage || !canIssueDce(sale)) return;
    dceLock.current = true;
    setIssuingDce(sale.id); setDceFeedback(null);
    try {
      const result = await marketplaceClientRequest('vendas/dce', { empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id, action: 'issue', confirmed: true, firstRequestConfirmed: true });
      onSaleUpdated({ ...sale, dceRequested: true, dceStatus: result.completed ? 'completed' : 'requested', fiscal: { ...sale.fiscal, nfe: sale.fiscal?.nfe || emptyFiscal(), dce: { ...sale.fiscal?.dce || emptyFiscal(), status: result.completed ? 'completed' : 'requested', requestedAt: new Date().toISOString(), receiptId: result.emissionId || undefined, query: undefined } } });
      setDceFeedback({ saleId: sale.id, message: String(result.message || 'A emissão da DC-e foi solicitada ao Mercado Livre. Atualize a venda para conferir a etiqueta.') });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (!code || ['dce_uncertain', 'dce_confirmation_missing', 'dce_receipt_pending', 'integration_unavailable'].includes(code)) onSaleUpdated({ ...sale, dceRequested: true, dceStatus: 'uncertain', fiscal: { ...sale.fiscal, nfe: sale.fiscal?.nfe || emptyFiscal(), dce: { ...sale.fiscal?.dce || emptyFiscal(), status: 'uncertain', requestedAt: new Date().toISOString() } } });
      setDceFeedback({ saleId: sale.id, message: err instanceof Error ? err.message : 'Não foi possível solicitar a emissão da DC-e.' });
    } finally { dceLock.current = false; setIssuingDce(''); setDceFinished(true); }
  }

  async function refreshDceSale(sale: Sale) {
    if (dceLock.current) return;
    dceLock.current = true; setIssuingDce(sale.id);
    try {
      const result = await marketplaceClientRequest('vendas/dce', { empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id, action: 'refresh' });
      onSaleUpdated(result.sale);
      setDceFeedback({ saleId: sale.id, message: canPrintSaleLabel(result.sale) ? 'Etiqueta liberada pelo Mercado Livre. Você já pode imprimir.' : 'Pedido atualizado. A etiqueta ainda aguarda liberação do Mercado Livre.' });
    } catch (err) { setDceFeedback({ saleId: sale.id, message: err instanceof Error ? err.message : 'Não foi possível atualizar o pedido.' }); }
    finally { dceLock.current = false; setIssuingDce(''); }
  }

  async function copyOrder(sale: Sale) {
    setCopyError('');
    try {
      await copyOrderReference(sale.orderId);
      setCopiedOrder(sale.id);
      window.setTimeout(() => setCopiedOrder(current => current === sale.id ? '' : current), 2_500);
    } catch { setCopyError(sale.id); }
  }

  return <section className={`${styles.panel} ${styles.salesPanel}`} aria-labelledby="sales-title">
    <div className={`${styles.panelHeading} ${!expanded ? styles.panelHeadingCollapsed : ''}`}><div className={styles.salesTitleAndView}><h2 id="sales-title">Vendas · {sales.length}</h2>{onViewChange && <div className={styles.salesViewSwitch} role="group" aria-label="Origem das vendas"><BotaoAcaoCompacto aria-pressed={view==='online'} onClick={()=>onViewChange('online')}>Online</BotaoAcaoCompacto><BotaoAcaoCompacto aria-pressed={view==='direct'} onClick={()=>onViewChange('direct')}>Saldão</BotaoAcaoCompacto></div>}</div><div className={styles.panelHeadingActions}>{reorderHandle}<DateOrderButton context="Vendas" order={order} onChange={setOrder} disabled={loading} /><Tooltip texto="Atualizar vendas e envios"><BotaoAcaoCompacto onClick={onRefresh} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar'}</BotaoAcaoCompacto></Tooltip><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="Vendas" controlsId="sales-content" expandido={expanded} onClick={() => onExpandedChange(!expanded)} corPrimaria={brand} darkMode={dark} /></div></div>
    <div id="sales-content" hidden={!expanded} aria-busy={loading}>
    <div className={view==='direct'?`${styles.salesListFilters} ${styles.salesDirectFilters}`:styles.salesListFilters}>
      {view === 'online' && <MarketplaceSelect label="Conta das vendas" value={accountId} placeholder="Todas as contas" onChange={onAccountChange} options={[{ value: '', label: 'Todas as contas' }, ...accounts.map((account) => ({ value: account.id, label: accountDisplayName(account) })),...directAccounts]} className={styles.salesAccountFilter} />}
      <MarketplaceSelect label="Situação" value={group} placeholder="Todas as situações" leadingIcon={<Icon name="filter" size={16} />} detailAsBadge onChange={value => onGroupChange(value as SaleGroup | '')} options={[
        { value: '', label: 'Todas', detail: String(total) },
        ...orderedSaleGroups(counts).map(({ value, label }) => ({ value, label, detail: String(counts[value]) })),
      ]} />
      <MarketplaceSelect label={view==='direct'?'Estoque de origem':'Canal de venda'} values={selectedMarketplaces} placeholder={view==='direct'?'Todos os estoques':'Todos os canais'} disabled={!marketplaceOptions.length} onValuesChange={values => onMarketplacesChange(values as SalesMarketplace[])} options={[{ value: '', label: view==='direct'?'Todos os estoques':'Todos os canais' }, ...marketplaceOptions]} />
    </div>
    <p className={styles.salesScopeHelp}>{view==='direct'?'Vendas manuais do período selecionado, identificadas pelo estoque de origem.':'Vale a última situação escolhida, aqui ou no cabeçalho. O período é o mesmo. A seleção de canais filtra esta lista de vendas.'}</p>
    {!loading&&!error&&<p className={styles.salesScopeHelp}>Total confirmado nos filtros: <strong>{money.format(confirmedTotal)}</strong> · Canceladas e pagamentos pendentes não entram neste total.</p>}
    {awaitingUpdates > 0 && <p className={styles.salesScopeHelp} role="status">Há atualizações de vendas em processamento. Use Atualizar para conferir novamente.</p>}
    {printError && <p className={styles.salesError} role="alert">{printError}</p>}
    {warnings.map(warning => <p key={warning} className={styles.salesError} role="status">{warning}</p>)}
    {loading ? <CarregamentoDadosModulo ativo variante="local" esqueletos titulo="Vendas" mensagem="Carregando vendas…" corPrimaria={brand} temaEscuro={dark} /> : error ? <p className={styles.salesError} role="alert">{error}</p> : !sales.length ? <p className={styles.salesEmpty}>Nenhuma venda encontrada nos filtros selecionados.</p> : <div className={styles.salesList}>{orderedSales.map((sale) => { if(sale.directSale)return <div className={styles.saleCard} key={sale.id}><DirectSaleRow sale={sale.directSale} companyId={companyId} request={directRequest} dark={dark} brand={brand} canSell={canManage} onUpdated={onRefresh}/></div>; const provider = providerBrand(sale.provider); return <article key={sale.id} className={styles.saleCard} ref={sale.id === saleToOpen && open === sale.id ? row => { if (row && !alertScrollDone.current) { alertScrollDone.current = true; requestAnimationFrame(() => { if (row.isConnected) scrollMarketplaceRow(row); }); } } : undefined}>
      <div id={`sale-header-${sale.id}`} className={`${styles.saleSummary} ${open === sale.id ? styles.saleSummaryExpanded : ''}`} onClick={event => {
        const row = event.currentTarget;
        const opening = open !== sale.id;
        setOpen(opening ? sale.id : '');
        if (opening) requestAnimationFrame(() => { if (row.isConnected && row.querySelector('[aria-expanded="true"]')) scrollMarketplaceRow(row); });
      }}>
        <span className={styles.accountMarketplaceBrand} data-provider={sale.provider ?? 'mercado_livre'}><img className={styles.saleProviderLogo} src={provider.logo} alt={provider.name} /></span>
        <div className={styles.saleOrderInfo}>
          <div className={styles.saleOrderHeading}>
            <button type="button" className={styles.saleSummaryOpen} aria-expanded={open === sale.id} aria-controls={`sale-details-${sale.id}`}>
              <strong>Pedido #{sale.orderId}</strong>
            </button>
            <button type="button" className={styles.copySaleOrder} aria-label={copiedOrder === sale.id ? `Pedido #${sale.orderId} copiado` : `Copiar Pedido #${sale.orderId}`} title={copiedOrder === sale.id ? 'Copiado' : 'Copiar pedido'} onClick={event => { event.stopPropagation(); void copyOrder(sale); }}><Icon name={copiedOrder === sale.id ? 'check' : 'copy'} size={15} /></button>
            <span className={styles.srOnly} role="status">{copiedOrder === sale.id ? 'Número do pedido copiado.' : ''}</span>
          </div>
          <small>{accountDisplayName(accounts.find((account) => account.id === sale.connectionId))} · {date.format(new Date(sale.soldAt))}{sale.buyer ? ` · ${sale.buyer}` : ''}</small>
          {open === sale.id && <p className={styles.salePinnedProduct}>{sale.items[0]?.title || 'Itens da venda'}{sale.items.length>1&&<small> +{sale.items.length-1} outro(s) item(ns)</small>}</p>}
        </div>
        <span className={styles.saleStatusAction} title={saleStatusText(sale)}><b data-status={sale.status === 'cancelled' ? 'cancelled' : sale.labelStatus}>{saleStatusText(sale)}</b><Icon name="chevron" size={16} className={styles.saleDisclosure} aria-hidden="true" /></span>
      </div>
      {copyError === sale.id && <p className={styles.saleCopyError} role="alert">Não foi possível copiar o número do pedido.</p>}
      {open === sale.id && <DetalhesRolaveis cabecalhoId={`sale-header-${sale.id}`} rotulo={`Detalhes do pedido ${sale.orderId}`} className={styles.saleDetailsScroll}><div id={`sale-details-${sale.id}`} className={styles.saleDetails}><dl><div><dt>Itens</dt><dd><SaleItems items={sale.items} /></dd></div><div><dt>Total</dt><dd>{sale.total == null ? 'Indisponível' : money.format(sale.total)}</dd></div><div><dt>Situação do pedido</dt><dd>{orderStatusText(sale.status)}</dd></div><div><dt>Envio original ao comprador</dt><dd>{shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus) || 'Em atualização'}</dd></div></dl>
        {sale.warnings?.map(warning => <p key={warning} className={styles.salesError}>{warning}</p>)}
        {sale.deliveries?.map(pack => <section key={pack.id} className={styles.claimDetails} aria-label={`Entrega ${pack.code || pack.id}`}><h4>Entrega {pack.code || pack.id} · {pack.statusText}</h4>{pack.deadline && <p>Prazo de envio: {date.format(new Date(pack.deadline))}</p>}{pack.invoices.map((invoice, index) => <p key={index}>{invoice.statusText}{invoice.key && <span> · Chave: {invoice.key}</span>}</p>)}</section>)}
        {saleConflictText(sale) && <p className={styles.salesError}>{saleConflictText(sale)}</p>}
        {sale.dispatchDeadline && <p className={styles.salesScopeHelp}>Prazo de envio: {date.format(new Date(sale.dispatchDeadline))}</p>}
        {sale.provider === 'magalu' ? sale.status !== 'cancelled' && sale.deliveries?.some(pack => ['pending', 'handling', 'ready_to_ship', 'not_verified'].includes(pack.status || '')) ? <><p className={styles.labelUnavailable}>Por enquanto, a impressão desta etiqueta é feita no portal Magalu.</p><a className={styles.postSaleLink} href="https://seller.magalu.com" target="_blank" rel="noopener noreferrer">Abrir etiquetas no Magalu ↗</a></> : null : (labelUnavailableText(sale) || canPrintSaleLabel(sale) || sale.dceRequested) && <section className={saleLayout.documentBand} data-dark={dark} aria-label="Documento e etiqueta">
          <div className={saleLayout.documentInfo}><span className={saleLayout.documentIcon}><Icon name="barcode" size={24} /></span><div><div className={saleLayout.documentTitle}><h3>Documento e etiqueta</h3>{canPrintSaleLabel(sale)&&(sale.fiscal?.dce?.status==='completed'||sale.dceStatus==='completed')?<span className={saleLayout.documentBadge}>DC-e emitida</span>:canPrintSaleLabel(sale)&&sale.dceRequested?<span className={saleLayout.documentBadge} data-pending={sale.fiscal?.dce?.status!=='requested'&&sale.dceStatus!=='requested'}>{sale.fiscal?.dce?.status==='requested'||sale.dceStatus==='requested'?'DC-e aceita':'DC-e solicitada'}</span>:null}</div><p>{canPrintSaleLabel(sale) ? sale.shipmentSubstatus === 'printed' ? 'Etiqueta disponível para reimpressão.' : 'Etiqueta liberada pelo Mercado Livre, pronta para impressão.' : labelUnavailableText(sale)}</p></div></div>
          <div className={saleLayout.documentActions}>
            {canManage && (canIssueDce(sale) || sale.dceRequested) && !canPrintSaleLabel(sale) && <BotaoAcaoCompacto variante="primario" disabled={!!sale.dceRequested || !!issuingDce || !!printing} onClick={sale.dceRequested ? undefined : () => setDceConfirmation(sale)}>{sale.dceRequested ? 'DC-e solicitada' : issuingDce === sale.id ? 'Solicitando DC-e…' : 'Solicitar DC-e'}</BotaoAcaoCompacto>}
            {canManage && canConsultSaleLabel(sale) && <BotaoAcaoCompacto disabled={!!issuingDce || !!printing} onClick={() => void refreshDceSale(sale)}><Icon name="refresh" size={16} />{issuingDce === sale.id ? 'Consultando…' : 'Consultar etiqueta'}</BotaoAcaoCompacto>}
            {canManage && canPrintSaleLabel(sale) && <><span className={saleLayout.documentFormat}>PDF · 100 × 150 mm</span><MarketplaceSelect id={`label-download-${sale.id}`} label="" ariaLabel="Baixar etiqueta" value="" onChange={value => void printLabel(sale,value as 'pdf'|'zpl2',true)} disabled={!!printing || !!issuingDce || nativePrintBusy} placeholder="Baixar" leadingIcon={<Icon name="download" size={16}/>} className={saleLayout.labelDownload} options={[{value:'pdf',label:'PDF · 100 × 150 mm'},{value:'zpl2',label:'TXT térmico (ZPL)'}]}/><BotaoAcaoCompacto variante="primario" aria-label={labelActionText(sale)} disabled={!!printing || !!issuingDce || nativePrintBusy} onClick={() => void printLabel(sale,'pdf')}>{printing === sale.id ? 'Preparando…' : nativePrintBusy ? 'Abrindo impressão…' : 'Imprimir'}</BotaoAcaoCompacto></>}

          </div>
          {!sale.fiscal && !canPrintSaleLabel(sale) && dceStatusText(sale) && <p className={saleLayout.documentFeedback} role="status">{dceStatusText(sale)}</p>}
          <SaleFiscalDocuments key={`${companyId}:${sale.connectionId}:${sale.id}`} sale={sale} companyId={companyId} canManage={canManage} dark={dark} brand={brand} onSaleUpdated={onSaleUpdated} />
          {dceFeedback?.saleId === sale.id && !canPrintSaleLabel(sale) && <p className={saleLayout.documentFeedback} role="status">{dceFeedback.message}</p>}
        </section>}
        {labelPreview?.saleId === sale.id && labelPreview.companyId === companyId && labelPreview.format==='pdf' && !labelPreview.downloadOnly && canManage && canPrintSaleLabel(sale) && <LabelNativePrint key={labelPreview.url} url={labelPreview.url} filename={labelPreview.filename} orderId={sale.orderId} onBusyChange={setNativePrintBusy}/>}
        <ModalConfirmacao aberto={dceConfirmation?.id === sale.id} titulo={dceFinished ? 'Resultado da solicitação' : 'Solicitar DC-e?'} rotuloCabecalho="Documento fiscal" mensagem={dceFinished ? dceFeedback?.message || 'Consulte a situação do pedido antes de repetir.' : `Solicitar ao Mercado Livre a DC-e do Pedido #${sale.orderId}?\n\nAo confirmar, você declara que esta conta é Pessoa Física ou PJ não contribuinte e que não há solicitação anterior sem confirmação. Se já solicitou, consulte o documento no Mercado Livre antes de repetir. Para PJ contribuinte, use NF-e.\n\nO Mercado Livre informa prazo de até 3 dias corridos após a venda para a emissão. A etiqueta será liberada após o processamento fiscal.`} textoCancelar="Voltar" textoConfirmar={dceFinished ? 'Fechar' : 'Solicitar DC-e'} ocultarCancelar={dceFinished} carregando={issuingDce === sale.id} mostrarProgresso corPrimaria={brand} darkMode={dark} variante="primaria" aoCancelar={() => { if (!dceLock.current) { setDceConfirmation(null); setDceFinished(false); } }} aoConfirmar={() => { if (dceFinished) { setDceConfirmation(null); setDceFinished(false); void refreshDceSale(sale); } else void issueDce(sale); }} />
        <SalePostSale key={`${companyId}:${sale.connectionId}:${sale.id}`} companyId={companyId} saleId={sale.id} connectionId={sale.connectionId} accountName={accountDisplayName(accounts.find(account => account.id === sale.connectionId))} provider={sale.provider==='direct'?undefined:sale.provider} onSaleUpdated={onSaleUpdated} />
      </div></DetalhesRolaveis>}
    </article>; })}</div>}
    <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="Vendas" controlsId="sales-content" expandido={expanded} onClick={() => collapseMarketplacePanel('sales-content', () => onExpandedChange(false))} corPrimaria={brand} darkMode={dark} /></div>
    </div>
  </section>;
}
