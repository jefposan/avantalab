'use client';

import { useMemo, useState, type ReactNode } from 'react';
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
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Vendas({ companyId, accountId, onAccountChange, group, onGroupChange, counts, total, accounts, sales, canManage, loading, error, warnings = [], awaitingUpdates, onRefresh, onSaleUpdated, expanded, onExpandedChange, dark, brand, reorderHandle }: {
  companyId: string; accountId: string; onAccountChange: (id: string) => void; accounts: MarketplaceAccount[];
  group: SaleGroup | ''; onGroupChange: (group: SaleGroup | '') => void; counts: Record<SaleGroup, number>; total: number;
  sales: Sale[]; canManage: boolean; loading: boolean; error: string; awaitingUpdates: number; onRefresh: () => void; onSaleUpdated: (sale: Sale) => void;
  expanded: boolean; onExpandedChange: (expanded: boolean) => void; dark: boolean; brand: string; reorderHandle?: ReactNode; warnings?: string[];
}) {
  const [printError, setPrintError] = useState('');
  const [open, setOpen] = useState('');
  const [printing, setPrinting] = useState('');
  const [order, setOrder] = useState<DateOrder>('desc');
  const orderedSales = useMemo(() => sortSalesByDate(sales, order), [sales, order]);

  async function printLabel(sale: Sale) {
    if (printing || !canManage) return;
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setPrintError('Permita abrir uma nova aba para imprimir a etiqueta.'); return; }
    popup.opener = null;
    setPrinting(sale.id); setPrintError('');
    try {
      const { data } = await (await import('@/app/lib/supabase')).supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Entre novamente para imprimir.');
      const response = await fetch('/api/modulos/marketplaces/vendas/etiqueta', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: companyId, connectionId: sale.connectionId, saleId: sale.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Não foi possível obter a etiqueta.'); }
      const url = URL.createObjectURL(await response.blob());
      if (popup) { popup.location.assign(url); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
      else { URL.revokeObjectURL(url); throw new Error('Permita a abertura da etiqueta no navegador e tente novamente.'); }
    } catch (err) { if (popup && !popup.closed) popup.close(); setPrintError(err instanceof Error ? err.message : 'Não foi possível obter a etiqueta.'); }
    finally { setPrinting(''); }
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
    {error ? <p className={styles.salesError} role="alert">{error}</p> : loading ? <p className={styles.salesEmpty} role="status">Carregando vendas…</p> : !sales.length ? <p className={styles.salesEmpty}>Nenhuma venda encontrada nos filtros selecionados.</p> : <div className={styles.salesList}>{orderedSales.map((sale) => <article key={sale.id} className={styles.saleCard}>
      <button type="button" className={styles.saleSummary} onClick={event => {
        const button = event.currentTarget;
        const opening = open !== sale.id;
        setOpen(opening ? sale.id : '');
        if (opening) requestAnimationFrame(() => { if (button.isConnected && button.getAttribute('aria-expanded') === 'true') scrollMarketplaceRow(button); });
      }} aria-expanded={open === sale.id} aria-controls={`sale-details-${sale.id}`}>
        <span><strong>Pedido #{sale.orderId}</strong><small>{accountDisplayName(accounts.find((account) => account.id === sale.connectionId))} · {date.format(new Date(sale.soldAt))}{sale.buyer ? ` · ${sale.buyer}` : ''}</small></span><span className={styles.saleStatusAction}><b data-status={sale.status === 'cancelled' ? 'cancelled' : sale.labelStatus}>{saleStatusText(sale)}</b><Icon name="chevron" size={16} className={styles.saleDisclosure} aria-hidden="true" /></span>
      </button>
      {open === sale.id && <div id={`sale-details-${sale.id}`} className={styles.saleDetails}><dl><div><dt>Itens</dt><dd>{sale.items.map((item) => <span key={`${item.title}-${item.quantity}`}>{item.quantity}× {item.title}{item.unitPrice != null ? ` · ${money.format(item.unitPrice)}` : ''}</span>)}</dd></div><div><dt>Total</dt><dd>{sale.total == null ? 'Indisponível' : money.format(sale.total)}</dd></div><div><dt>Situação do pedido</dt><dd>{orderStatusText(sale.status)}</dd></div><div><dt>Envio original ao comprador</dt><dd>{shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus) || 'Em atualização'}</dd></div></dl>
        {sale.warnings?.map(warning => <p key={warning} className={styles.salesError}>{warning}</p>)}
        {sale.deliveries?.map(pack => <section key={pack.id} className={styles.claimDetails} aria-label={`Entrega ${pack.code || pack.id}`}><h4>Entrega {pack.code || pack.id} · {pack.statusText}</h4>{pack.deadline && <p>Prazo de envio: {date.format(new Date(pack.deadline))}</p>}{pack.invoices.map((invoice, index) => <p key={index}>{invoice.statusText}{invoice.key && <span> · Chave: {invoice.key}</span>}</p>)}</section>)}
        {saleConflictText(sale) && <p className={styles.salesError}>{saleConflictText(sale)}</p>}
        {sale.dispatchDeadline && <p className={styles.salesScopeHelp}>Prazo de envio: {date.format(new Date(sale.dispatchDeadline))}</p>}
        {sale.provider === 'magalu' ? sale.status !== 'cancelled' && sale.deliveries?.some(pack => ['pending', 'handling', 'ready_to_ship', 'not_verified'].includes(pack.status || '')) ? <><p className={styles.labelUnavailable}>Por enquanto, a impressão desta etiqueta é feita no portal Magalu.</p><a className={styles.postSaleLink} href="https://seller.magalu.com" target="_blank" rel="noopener noreferrer">Abrir etiquetas no Magalu ↗</a></> : null : sale.labelStatus === 'ready' && sale.shipmentStatus === 'ready_to_ship' && sale.status !== 'cancelled' ? <button type="button" className={styles.primary} disabled={!canManage || printing === sale.id} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Preparando etiqueta…' : labelActionText(sale)}</button> : <>{labelUnavailableText(sale) && <p className={styles.labelUnavailable}>{labelUnavailableText(sale)}</p>}{canManage && ['paid', 'confirmed', 'partially_refunded'].includes(sale.status) && ['', 'pending', 'handling', 'ready_to_ship', 'not_verified'].includes(sale.shipmentStatus || '') && sale.labelStatus !== 'fulfilled' && <button type="button" className={styles.refreshSales} disabled={!!printing} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Consultando etiqueta…' : 'Consultar etiqueta no Mercado Livre'}</button>}</>}
        <SalePostSale key={`${companyId}:${sale.connectionId}:${sale.id}`} companyId={companyId} saleId={sale.id} connectionId={sale.connectionId} provider={sale.provider} onSaleUpdated={onSaleUpdated} />
      </div>}
    </article>)}</div>}
    <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" modo="lista" contexto="Vendas" controlsId="sales-content" expandido={expanded} onClick={() => collapseMarketplacePanel('sales-content', () => onExpandedChange(false))} corPrimaria={brand} darkMode={dark} /></div>
    </div>
  </section>;
}
