'use client';

import { useCallback, useEffect, useState } from 'react';
import { marketplaceClientRequest } from './Anunciados';
import styles from './marketplaces.module.css';

type Sale = { id: string; orderId: string; status: string; shipmentId: string | null; shipmentStatus: string | null; shipmentSubstatus: string | null; labelStatus: 'ready' | 'unavailable' | 'fulfilled'; seenAt: string | null; createdAt: string; updatedAt: string; buyer: string | null; total: number | null; currency: string; items: Array<{ title: string; quantity: number; unitPrice: number | null }> };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function saleStatus(sale: Sale) {
  if (sale.labelStatus === 'ready') return 'Etiqueta pronta';
  if (sale.labelStatus === 'fulfilled') return 'Envio Full';
  if (sale.shipmentStatus === 'shipped') return 'Enviado';
  return sale.status === 'paid' ? 'Venda confirmada' : sale.status || 'Em atualização';
}

export default function Vendas({ companyId, accountId, canManage, refreshKey, onPendingChange }: { companyId: string; accountId: string; canManage: boolean; refreshKey: number; onPendingChange: (counts: Record<string, number>) => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [printing, setPrinting] = useState('');

  const load = useCallback(async (markSeen = false) => {
    if (!accountId) { setSales([]); return; }
    setLoading(true); setError('');
    try {
      const data = await marketplaceClientRequest(`vendas?empresaId=${encodeURIComponent(companyId)}&connectionId=${encodeURIComponent(accountId)}${markSeen ? '&markSeen=true' : ''}`) as { sales: Sale[]; pendingByConnection: Record<string, number> };
      setSales(Array.isArray(data.sales) ? data.sales : []); onPendingChange(data.pendingByConnection || {});
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar as vendas.'); }
    finally { setLoading(false); }
  }, [accountId, companyId, onPendingChange]);

  useEffect(() => { void load(true); }, [load, refreshKey]);

  async function printLabel(sale: Sale) {
    if (printing || !canManage) return;
    const popup = window.open('', '_blank', 'noopener');
    setPrinting(sale.id); setError('');
    try {
      const { data } = await (await import('@/app/lib/supabase')).supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Entre novamente para imprimir.');
      const response = await fetch('/api/modulos/marketplaces/vendas/etiqueta', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: companyId, connectionId: accountId, saleId: sale.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || 'Não foi possível obter a etiqueta.'); }
      const url = URL.createObjectURL(await response.blob());
      if (popup) { popup.location.assign(url); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); }
      else { URL.revokeObjectURL(url); throw new Error('Permita a abertura da etiqueta no navegador e tente novamente.'); }
    } catch (err) { if (popup && !popup.closed) popup.close(); setError(err instanceof Error ? err.message : 'Não foi possível obter a etiqueta.'); }
    finally { setPrinting(''); }
  }

  return <section className={`${styles.panel} ${styles.salesPanel}`} aria-labelledby="sales-title">
    <div className={styles.panelHeading}><div><p className={styles.step}>3</p><h2 id="sales-title">Vendas da conta</h2></div><button type="button" className={styles.refreshSales} onClick={() => void load()} disabled={loading || !accountId}>{loading ? 'Atualizando…' : 'Atualizar'}</button></div>
    {!accountId ? <p className={styles.help}>Selecione uma conta conectada para acompanhar as vendas.</p> : error ? <p className={styles.salesError} role="alert">{error}</p> : !sales.length ? <p className={styles.salesEmpty}>Nenhuma venda recebida nesta conta ainda.</p> : <div className={styles.salesList}>{sales.map((sale) => <article key={sale.id} className={styles.saleCard}>
      <button type="button" className={styles.saleSummary} onClick={() => setOpen((current) => current === sale.id ? '' : sale.id)} aria-expanded={open === sale.id}>
        <span><strong>Pedido #{sale.orderId}</strong><small>{date.format(new Date(sale.updatedAt))}{sale.buyer ? ` · ${sale.buyer}` : ''}</small></span><b data-status={sale.labelStatus}>{saleStatus(sale)}</b>
      </button>
      {open === sale.id && <div className={styles.saleDetails}><dl><div><dt>Itens</dt><dd>{sale.items.map((item) => <span key={`${item.title}-${item.quantity}`}>{item.quantity}× {item.title}{item.unitPrice != null ? ` · ${money.format(item.unitPrice)}` : ''}</span>)}</dd></div><div><dt>Total</dt><dd>{sale.total == null ? 'Indisponível' : money.format(sale.total)}</dd></div><div><dt>Envio</dt><dd>{sale.shipmentStatus || 'Em atualização'}{sale.shipmentSubstatus ? ` · ${sale.shipmentSubstatus}` : ''}</dd></div></dl>
        {sale.labelStatus === 'ready' ? <button type="button" className={styles.primary} disabled={!canManage || printing === sale.id} onClick={() => void printLabel(sale)}>{printing === sale.id ? 'Preparando etiqueta…' : 'Imprimir etiqueta'}</button> : <p className={styles.labelUnavailable}>{sale.labelStatus === 'fulfilled' ? 'Envio Full: a etiqueta é operada pelo Mercado Livre.' : 'A etiqueta aparecerá aqui quando o envio estiver pronto para impressão.'}</p>}
      </div>}
    </article>)}</div>}
  </section>;
}
