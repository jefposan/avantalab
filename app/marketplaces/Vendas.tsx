'use client';

import { useState } from 'react';
import { labelActionText, labelUnavailableText, saleStatusText, shipmentStatusText } from '@/app/modules/marketplaces/sales-status';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import type { MarketplaceAccount } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';

type Sale = MarketplaceSale;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Vendas({ companyId, accountId, onAccountChange, accounts, sales, canManage, loading, error, awaitingUpdates, onRefresh }: {
  companyId: string; accountId: string; onAccountChange: (id: string) => void; accounts: MarketplaceAccount[];
  sales: Sale[]; canManage: boolean; loading: boolean; error: string; awaitingUpdates: number; onRefresh: () => void;
}) {
  const [printError, setPrintError] = useState('');
  const [open, setOpen] = useState('');
  const [printing, setPrinting] = useState('');

  async function printLabel(sale: Sale) {
    if (printing || !canManage) return;
    const popup = window.open('', '_blank', 'noopener');
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
    <div className={styles.panelHeading}><div><p className={styles.step}>3</p><h2 id="sales-title">Vendas · {sales.length}</h2></div><button type="button" className={styles.refreshSales} onClick={onRefresh} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar'}</button></div>
    <MarketplaceSelect label="Conta das vendas" value={accountId} placeholder="Todas as contas" onChange={onAccountChange} options={[{ value: '', label: 'Todas as contas' }, ...accounts.map((account) => ({ value: account.id, label: account.seller_name || `Vendedor ${account.seller_reference}` }))]} className={styles.salesAccountFilter} />
    <p className={styles.salesScopeHelp}>Pedidos únicos no período e na situação selecionados no cabeçalho. O sino reúne todas as contas.</p>
    {awaitingUpdates > 0 && <p className={styles.salesScopeHelp} role="status">Há atualizações de vendas em processamento. Use Atualizar para conferir novamente.</p>}
    {printError && <p className={styles.salesError} role="alert">{printError}</p>}
    {error ? <p className={styles.salesError} role="alert">{error}</p> : loading ? <p className={styles.salesEmpty} role="status">Carregando vendas…</p> : !sales.length ? <p className={styles.salesEmpty}>Nenhuma venda encontrada nos filtros selecionados.</p> : <div className={styles.salesList}>{sales.map((sale) => <article key={sale.id} className={styles.saleCard}>
      <button type="button" className={styles.saleSummary} onClick={() => setOpen((current) => current === sale.id ? '' : sale.id)} aria-expanded={open === sale.id}>
        <span><strong>Pedido #{sale.orderId}</strong><small>{accounts.find((account) => account.id === sale.connectionId)?.seller_name || 'Mercado Livre'} · {date.format(new Date(sale.soldAt))}{sale.buyer ? ` · ${sale.buyer}` : ''}</small></span><b data-status={sale.labelStatus}>{saleStatusText(sale)}</b>
      </button>
      {open === sale.id && <div className={styles.saleDetails}><dl><div><dt>Itens</dt><dd>{sale.items.map((item) => <span key={`${item.title}-${item.quantity}`}>{item.quantity}× {item.title}{item.unitPrice != null ? ` · ${money.format(item.unitPrice)}` : ''}</span>)}</dd></div><div><dt>Total</dt><dd>{sale.total == null ? 'Indisponível' : money.format(sale.total)}</dd></div><div><dt>Situação do envio</dt><dd>{shipmentStatusText(sale.shipmentStatus, sale.shipmentSubstatus) || 'Em atualização'}</dd></div></dl>
        {sale.labelStatus === 'ready' && sale.shipmentStatus === 'ready_to_ship' && sale.status !== 'cancelled' ? <button type="button" className={styles.primary} disabled={!canManage || printing === sale.id} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Preparando etiqueta…' : labelActionText(sale)}</button> : labelUnavailableText(sale) ? <p className={styles.labelUnavailable}>{labelUnavailableText(sale)}</p> : null}
      </div>}
    </article>)}</div>}
  </section>;
}
