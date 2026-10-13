'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import ModalConfirmacao from './ModalConfirmacao';
import { supabase } from '@/app/lib/supabase';
import { marketplaceClientRequest } from '@/app/marketplaces/Anunciados';
import { alertLink, providerName, type MarketplaceLiveFeed, type SaleAlert } from '@/app/modules/marketplaces/live-feed';
import { safeMarketplaceLink } from '@/app/modules/marketplaces/services/inventory-model';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';

/** Cada empresa/usuário tem leitura persistida no servidor. Nenhum filtro de mês/conta oculta novas vendas. */
export function MarketplaceLiveMonitor({ companyId, brand = '#003E73', dark = false }: { companyId: string; brand?: string; dark?: boolean }) {
  const [current, setCurrent] = useState<SaleAlert | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(0);
  const alerts = useRef<SaleAlert[]>([]);
  const currentRef = useRef<SaleAlert | null>(null);
  const reloadRef = useRef<() => void>(() => {});
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => {
    let stopped = false, running = false, denied = false;
    const controller = new AbortController();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const showNext = () => {
      if (stopped || currentRef.current || document.visibilityState !== 'visible') return;
      // Não disputar foco com uma edição/confirmação. A Gestão deixa o próprio iframe exibir o aviso.
      if ([...document.querySelectorAll('[aria-modal="true"], iframe[title="Anúncios em marketplaces"]')].some(element => {
        const bounds = element.getBoundingClientRect(); return bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== 'hidden';
      })) return;
      const next = alerts.current[0];
      if (next) { currentRef.current = next; setRemaining(Math.max(0, alerts.current.length - 1)); setCurrent(next); }
    };
    const poll = async () => {
      if (stopped || denied || running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const feed = await marketplaceClientRequest(`avisos?empresaId=${encodeURIComponent(companyId)}`, undefined, controller.signal) as MarketplaceLiveFeed;
        if (stopped) return;
        alerts.current = feed.alerts;
        window.dispatchEvent(new CustomEvent('avanta:marketplace-live-feed', { detail: { companyId, feed } }));
        if (currentRef.current && !feed.alerts.some(alert => alert.id === currentRef.current?.id)) { currentRef.current = null; setCurrent(null); }
        showNext();
        if (!channel) {
          const session = await supabase.auth.getSession();
          if (stopped || !session.data.session) return;
          await supabase.realtime.setAuth(session.data.session.access_token);
          if (stopped) return;
          channel = supabase.channel(`marketplace:${companyId}`, { config: { private: true } })
            .on('broadcast', { event: 'changed' }, () => { void poll(); }).subscribe();
        }
      } catch (error) {
        if (!stopped) {
          if ((error as { code?: string }).code === 'forbidden' || (error as { code?: string }).code === 'module_inactive') {
            denied = true; alerts.current = []; currentRef.current = null; setCurrent(null);
          }
          window.dispatchEvent(new CustomEvent('avanta:marketplace-live-feed', { detail: { companyId, unavailable: true } }));
        }
      } finally { running = false; }
    };
    reloadRef.current = () => { void poll(); };
    void poll();
    const timer = window.setInterval(() => { showNext(); void poll(); }, 10_000);
    const observer = new MutationObserver(showNext);
    observer.observe(document.body, { childList: true, subtree: true });
    const focus = () => { showNext(); void poll(); };
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    const auth = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { denied = true; alerts.current = []; currentRef.current = null; setCurrent(null); }
      else { denied = false; window.setTimeout(() => { void poll(); }, 0); }
    });
    return () => {
      stopped = true; controller.abort(); window.clearInterval(timer); observer.disconnect();
      window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus);
      auth.data.subscription.unsubscribe(); if (channel) void supabase.removeChannel(channel);
    };
  }, [companyId]);
  async function acknowledge() {
    if (!current || busy) return;
    setBusy(true); setMessage('');
    try {
      await marketplaceClientRequest('avisos', { empresaId: companyId, alertId: current.id, action: 'acknowledge' });
      alerts.current = alerts.current.filter(alert => alert.id !== current.id);
      currentRef.current = null; setCurrent(null); reloadRef.current();
    } catch { setMessage('Não foi possível confirmar a leitura. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function openListing() {
    if (!current || busy) return;
    const tab = window.open('about:blank', '_blank');
    if (!tab) { setMessage('Permita abrir uma nova aba para consultar o anúncio.'); return; }
    tab.opener = null;
    setBusy(true); setMessage('');
    try {
      let link = alertLink(current);
      if (!link) {
        const result = await marketplaceClientRequest('avisos', { empresaId: companyId, alertId: current.id, action: 'resolve_link' }) as { link: string };
        link = safeMarketplaceLink(current.provider, result.link);
      }
      if (!link) throw new Error('Não foi possível abrir o anúncio nesta plataforma.');
      tab.location.replace(link);
      await marketplaceClientRequest('avisos', { empresaId: companyId, alertId: current.id, action: 'acknowledge' });
      alerts.current = alerts.current.filter(alert => alert.id !== current.id);
      currentRef.current = null; setCurrent(null); reloadRef.current();
    } catch (error) {
      try { if (tab.location.href === 'about:blank') tab.close(); } catch { /* Aba já navegou para a plataforma. */ }
      setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o anúncio. Tente novamente.');
    } finally { setBusy(false); }
  }
  if (!current) return null;
  return createPortal(<MarketplaceSaleAlertView alert={current} remaining={remaining} message={message} busy={busy} brand={brand} dark={dark} onAcknowledge={acknowledge} onOpen={openListing} />, document.body);
}

export function MarketplaceSaleAlertView({ alert, remaining = 0, message = '', busy = false, brand = '#003E73', dark = false, onAcknowledge, onOpen }: {
  alert: SaleAlert; remaining?: number; message?: string; busy?: boolean; brand?: string; dark?: boolean; onAcknowledge: () => void | Promise<void>; onOpen: () => void | Promise<void>;
}) {
  const date = new Date(alert.sold_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = `${alert.account_name || 'Conta conectada'} · ${providerName(alert.provider)}\nPedido #${alert.order_id} · ${date}\n\n${alert.quantity} × ${alert.title}\n\n${alert.kind === 'pending_dispatch' ? 'Esta venda ainda aguarda envio. Confira o pedido e a etiqueta.' : 'Confira o pedido e a liberação do envio na plataforma.'}${remaining ? `\nMais ${remaining} aviso(s) aguardando.` : ''}${message ? `\n\n${message}` : ''}`;
  return <ModalConfirmacao aberto titulo={alert.kind === 'pending_dispatch' ? 'Venda pendente' : 'Nova venda'} rotuloCabecalho="Marketplaces" mensagem={text} variante="primaria"
    textoCancelar="Entendi" textoConfirmar={alert.provider === 'magalu' ? 'Ver pedido no Magalu' : `Ver anúncio no ${providerName(alert.provider)}`} carregando={busy}
    corPrimaria={brand} darkMode={dark} aoCancelar={onAcknowledge} aoConfirmar={onOpen} />;
}

/** Demais módulos com empresa na URL; Gestão fornece o perfil ativo explicitamente. */
export default function MarketplaceLiveScope() {
  const pathname = usePathname(), params = useSearchParams(), companyId = params.get('empresaId');
  if (!companyId || !uuidIsValid(companyId) || pathname === '/gestao' || pathname.startsWith('/mobile') || pathname.startsWith('/marketplaces')) return null;
  return <MarketplaceLiveMonitor key={companyId} companyId={companyId} />;
}
