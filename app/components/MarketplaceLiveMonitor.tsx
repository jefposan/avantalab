'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ModalConfirmacao from './ModalConfirmacao';
import { supabase } from '@/app/lib/supabase';
import { marketplaceClientRequest } from '@/app/marketplaces/Anunciados';
import { providerName, type MarketplaceLiveFeed, type SaleAlert } from '@/app/modules/marketplaces/live-feed';

/** Cada empresa/usuário tem leitura persistida no servidor. Este monitor pertence apenas ao módulo Marketplace do perfil aberto. */
export function MarketplaceLiveMonitor({ companyId, brand = '#003E73', dark = false, onOpenSale }: { companyId: string; brand?: string; dark?: boolean; onOpenSale: (alert: SaleAlert) => void }) {
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
      // Não disputar foco com uma edição ou confirmação já aberta no próprio módulo.
      if ([...document.querySelectorAll('[aria-modal="true"]')].some(element => {
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
  async function openSale() {
    if (!current || busy) return;
    setBusy(true); setMessage('');
    try {
      await marketplaceClientRequest('avisos', { empresaId: companyId, alertId: current.id, action: 'acknowledge' });
      alerts.current = alerts.current.filter(alert => alert.id !== current.id);
      const alert = current;
      currentRef.current = null; setCurrent(null); onOpenSale(alert); reloadRef.current();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível abrir a venda. Tente novamente.');
    } finally { setBusy(false); }
  }
  if (!current) return null;
  return createPortal(<MarketplaceSaleAlertView alert={current} remaining={remaining} message={message} busy={busy} brand={brand} dark={dark} onAcknowledge={acknowledge} onOpen={openSale} />, document.body);
}

export function MarketplaceSaleAlertView({ alert, remaining = 0, message = '', busy = false, brand = '#003E73', dark = false, onAcknowledge, onOpen }: {
  alert: SaleAlert; remaining?: number; message?: string; busy?: boolean; brand?: string; dark?: boolean; onAcknowledge: () => void | Promise<void>; onOpen: () => void | Promise<void>;
}) {
  const date = new Date(alert.sold_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = `${alert.account_name || 'Conta conectada'} · ${providerName(alert.provider)}\nPedido #${alert.order_id} · ${date}\n\n${alert.quantity} × ${alert.title}\n\n${alert.kind === 'pending_dispatch' ? 'Esta venda ainda aguarda envio. Confira o pedido e a etiqueta.' : 'Confira o pedido e a liberação do envio na plataforma.'}${remaining ? `\nMais ${remaining} aviso(s) aguardando.` : ''}${message ? `\n\n${message}` : ''}`;
  return <ModalConfirmacao aberto titulo={alert.kind === 'pending_dispatch' ? 'Venda pendente' : 'Nova venda'} rotuloCabecalho="Marketplaces" mensagem={text} variante="primaria"
    textoCancelar="Entendi" textoConfirmar="Ver venda no AvantaLab" carregando={busy}
    corPrimaria={brand} darkMode={dark} aoCancelar={onAcknowledge} aoConfirmar={onOpen} />;
}
