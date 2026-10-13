'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import Tooltip from '@/app/components/Tooltip';
import { Icon } from '@/app/projetos/components/Icon';
import { labelActionText, labelUnavailableText, saleStatusText, shipmentStatusText, orderStatusText, saleConflictText, orderedSaleGroups, type SaleGroup } from '@/app/modules/marketplaces/sales-status';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import type { MarketplaceAccount } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import { accountDisplayName } from './account-identification';
import SalePostSale from './SalePostSale';
import DateOrderButton from './DateOrderButton';
import { collapseMarketplacePanel } from './collapse-panel';
import { scrollMarketplaceRow } from './scroll-panel-row';
import { sortSalesByDate, type DateOrder } from '@/app/modules/marketplaces/date-order';
import styles from './marketplaces.module.css';

type Sale = MarketplaceSale;
type LabelPreview = { saleId: string; url: string };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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

export default function Vendas({ companyId, accountId, onAccountChange, group, onGroupChange, counts, total, accounts, sales, canManage, loading, error, warnings = [], awaitingUpdates, onRefresh, onSaleUpdated, expanded, onExpandedChange, saleToOpen, dark, brand, reorderHandle }: {
  companyId: string; accountId: string; onAccountChange: (id: string) => void; accounts: MarketplaceAccount[];
  group: SaleGroup | ''; onGroupChange: (group: SaleGroup | '') => void; counts: Record<SaleGroup, number>; total: number;
  sales: Sale[]; canManage: boolean; loading: boolean; error: string; awaitingUpdates: number; onRefresh: () => void; onSaleUpdated: (sale: Sale) => void;
  expanded: boolean; onExpandedChange: (expanded: boolean) => void; saleToOpen: string; dark: boolean; brand: string; reorderHandle?: ReactNode; warnings?: string[];
}) {
  const [printError, setPrintError] = useState('');
  const [open, setOpen] = useState(() => saleToOpen && sales.some(sale => sale.id === saleToOpen) ? saleToOpen : '');
  const [printing, setPrinting] = useState('');
  const [labelPreview, setLabelPreview] = useState<LabelPreview | null>(null);
  const [copiedOrder, setCopiedOrder] = useState('');
  const [copyError, setCopyError] = useState('');
  const [order, setOrder] = useState<DateOrder>('desc');
  const alertScrollDone = useRef(false);
  const orderedSales = useMemo(() => sortSalesByDate(sales, order), [sales, order]);

  async function printLabel(sale: Sale) {
    if (printing || !canManage) return;
    setPrinting(sale.id); setPrintError('');
    try {
      const { data } = await (await import('@/app/lib/supabase')).supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Entre novamente para imprimir.');
      const response = await fetch('/api/modulos/marketplaces/vendas/etiqueta', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Não foi possível obter a etiqueta.'); }
      const pdf = await response.blob();
      if (!pdf.size || !pdf.type.includes('pdf')) throw new Error('O Mercado Livre não retornou uma etiqueta em PDF válida.');
      const url = URL.createObjectURL(pdf);
      setLabelPreview(current => { if (current) URL.revokeObjectURL(current.url); return { saleId: sale.id, url }; });
    } catch (err) { setPrintError(err instanceof Error ? err.message : 'Não foi possível obter a etiqueta.'); }
    finally { setPrinting(''); }
  }

  async function copyOrder(sale: Sale) {
    setCopyError('');
    try {
      await copyOrderReference(sale.orderId);
      setCopiedOrder(sale.id);
      window.setTimeout(() => setCopiedOrder(current => current === sale.id ? '' : current), 2_500);
    } catch { setCopyError(sale.id); }
  }

  function closeLabelPreview() {
    setLabelPreview(current => { if (current) URL.revokeObjectURL(current.url); return null; });
  }

  return <section className={`${styles.panel} ${styles.salesPanel}`} aria-labelledby="sales-title">
    <div className={`${styles.panelHeading} ${!expanded ? styles.panelHeadingCollapsed : ''}`}><div><h2 id="sales-title">Vendas · {sales.length}</h2></div><div className={styles.panelHeadingActions}>{reorderHandle}<DateOrderButton context="Vendas" order={order} onChange={setOrder} disabled={loading} /><Tooltip texto="Atualizar vendas e envios"><button type="button" className={styles.refreshSales} onClick={onRefresh} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar'}</button></Tooltip><BotaoExpandirCard variante="painel" modo="lista" contexto="Vendas" controlsId="sales-content" expandido={expanded} onClick={() => onExpandedChange(!expanded)} corPrimaria={brand} darkMode={dark} /></div></div>
    <div id="sales-content" hidden={!expanded}>
    <div className={styles.salesListFilters}>
      <MarketplaceSelect label="Conta das vendas" value={accountId} placeholder="Todas as contas" onChange={onAccountChange} options={[{ value: '', label: 'Todas as contas' }, ...accounts.map((account) => ({ value: account.id, label: accountDisplayName(account) }))]} className={styles.salesAccountFilter} />
      <MarketplaceSelect label="Situação" value={group} placeholder="Todas as situações" leadingIcon={<Icon name="filter" size={16} />} detailAsBadge onChange={value => onGroupChange(value as SaleGroup | '')} options={[
        { value: '', label: 'Todas', detail: String(total) },
        ...orderedSaleGroups(counts).map(({ value, label }) => ({ value, label, detail: String(counts[value]) })),
      ]} />
    </div>
    <p className={styles.salesScopeHelp}>Vale a última situação escolhida, aqui ou no cabeçalho. O período é o mesmo.</p>
    {awaitingUpdates > 0 && <p className={styles.salesScopeHelp} role="status">Há atualizações de vendas em processamento. Use Atualizar para conferir novamente.</p>}
    {printError && <p className={styles.salesError} role="alert">{printError}</p>}
    {warnings.map(warning => <p key={warning} className={styles.salesError} role="status">{warning}</p>)}
    {error ? <p className={styles.salesError} role="alert">{error}</p> : loading ? <p className={styles.salesEmpty} role="status">Carregando vendas…</p> : !sales.length ? <p className={styles.salesEmpty}>Nenhuma venda encontrada nos filtros selecionados.</p> : <div className={styles.salesList}>{orderedSales.map((sale) => { const provider = providerBrand(sale.provider); return <article key={sale.id} className={styles.saleCard} ref={sale.id === saleToOpen && open === sale.id ? row => { if (row && !alertScrollDone.current) { alertScrollDone.current = true; requestAnimationFrame(() => { if (row.isConnected) scrollMarketplaceRow(row); }); } } : undefined}>
      <div className={`${styles.saleSummary} ${open === sale.id ? styles.saleSummaryExpanded : ''}`} onClick={event => {
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
        </div>
        <span className={styles.saleStatusAction} title={saleStatusText(sale)}><b data-status={sale.status === 'cancelled' ? 'cancelled' : sale.labelStatus}>{saleStatusText(sale)}</b><Icon name="chevron" size={16} className={styles.saleDisclosure} aria-hidden="true" /></span>
      </div>
      {copyError === sale.id && <p className={styles.saleCopyError} role="alert">Não foi possível copiar o número do pedido.</p>}
      {open === sale.id && <div id={`sale-details-${sale.id}`} className={styles.saleDetails}><dl><div><dt>Itens</dt><dd>{sale.items.map((item) => <span key={`${item.title}-${item.quantity}`}>{item.quantity}× {item.title}{item.unitPrice != null ? ` · ${money.format(item.unitPrice)}` : ''}</span>)}</dd></div><div><dt>Total</dt><dd>{sale.total == null ? 'Indisponível' : money.format(sale.total)}</dd></div><div><dt>Situação do pedido</dt><dd>{orderStatusText(sale.status)}</dd></div><div><dt>Envio original ao comprador</dt><dd>{shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus) || 'Em atualização'}</dd></div></dl>
        {sale.warnings?.map(warning => <p key={warning} className={styles.salesError}>{warning}</p>)}
        {sale.deliveries?.map(pack => <section key={pack.id} className={styles.claimDetails} aria-label={`Entrega ${pack.code || pack.id}`}><h4>Entrega {pack.code || pack.id} · {pack.statusText}</h4>{pack.deadline && <p>Prazo de envio: {date.format(new Date(pack.deadline))}</p>}{pack.invoices.map((invoice, index) => <p key={index}>{invoice.statusText}{invoice.key && <span> · Chave: {invoice.key}</span>}</p>)}</section>)}
        {saleConflictText(sale) && <p className={styles.salesError}>{saleConflictText(sale)}</p>}
        {sale.dispatchDeadline && <p className={styles.salesScopeHelp}>Prazo de envio: {date.format(new Date(sale.dispatchDeadline))}</p>}
        {sale.provider === 'magalu' ? sale.status !== 'cancelled' && sale.deliveries?.some(pack => ['pending', 'handling', 'ready_to_ship', 'not_verified'].includes(pack.status || '')) ? <><p className={styles.labelUnavailable}>Por enquanto, a impressão desta etiqueta é feita no portal Magalu.</p><a className={styles.postSaleLink} href="https://seller.magalu.com" target="_blank" rel="noopener noreferrer">Abrir etiquetas no Magalu ↗</a></> : null : sale.labelStatus === 'ready' && sale.shipmentStatus === 'ready_to_ship' && sale.status !== 'cancelled' ? <button type="button" className={styles.primary} disabled={!canManage || printing === sale.id} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Preparando etiqueta…' : labelActionText(sale)}</button> : <>{labelUnavailableText(sale) && <p className={styles.labelUnavailable}>{labelUnavailableText(sale)}</p>}{canManage && ['paid', 'confirmed', 'partially_refunded'].includes(sale.status) && ['', 'pending', 'handling', 'ready_to_ship', 'not_verified'].includes(sale.shipmentStatus || '') && sale.labelStatus !== 'fulfilled' && <button type="button" className={styles.refreshSales} disabled={!!printing} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Consultando etiqueta…' : 'Consultar etiqueta no Mercado Livre'}</button>}</>}
        {labelPreview?.saleId === sale.id && <section className={styles.labelPreview} aria-label={`Etiqueta do Pedido #${sale.orderId}`}><div><strong>Etiqueta do Mercado Livre</strong><button type="button" className={styles.refreshSales} onClick={closeLabelPreview}>Fechar etiqueta</button></div><iframe title={`Etiqueta do Pedido #${sale.orderId}`} src={labelPreview.url} /><a className={styles.postSaleLink} href={labelPreview.url} target="_blank" rel="noopener noreferrer">Abrir o PDF em nova guia ↗</a></section>}
        <SalePostSale key={`${companyId}:${sale.connectionId}:${sale.id}`} companyId={companyId} saleId={sale.id} connectionId={sale.connectionId} provider={sale.provider} onSaleUpdated={onSaleUpdated} />
      </div>}
    </article>; })}</div>}
    <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" modo="lista" contexto="Vendas" controlsId="sales-content" expandido={expanded} onClick={() => collapseMarketplacePanel('sales-content', () => onExpandedChange(false))} corPrimaria={brand} darkMode={dark} /></div>
    </div>
  </section>;
}
