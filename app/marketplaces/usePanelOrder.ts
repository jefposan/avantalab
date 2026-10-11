'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { DEFAULT_MARKETPLACE_PANEL_ORDER, marketplacePanelOrderKey, parseMarketplacePanelOrder } from '@/app/modules/marketplaces/panel-order';

export default function usePanelOrder(companyId: string) {
  const [preference, setPreference] = useState<{ companyId: string; key: string | null; order: string[]; ready: boolean }>({ companyId, key: null, order: [...DEFAULT_MARKETPLACE_PANEL_ORDER], ready: false });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const load = (userId: string | undefined) => {
      if (!active) return;
      const key = marketplacePanelOrderKey(userId || '', companyId);
      let order = [...DEFAULT_MARKETPLACE_PANEL_ORDER];
      try { if (key) order = parseMarketplacePanelOrder(localStorage.getItem(key)); } catch { /* Navegador sem armazenamento: mantém ordem local. */ }
      setPreference({ companyId, key, order, ready: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { authRevision++; load(session?.user.id); });
    void supabase.auth.getSession().then(({ data }) => { if (!authRevision) load(data.session?.user.id); }).catch(() => { if (!authRevision) load(undefined); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [companyId]);
  const current = preference.companyId === companyId ? preference : { companyId, key: null, order: [...DEFAULT_MARKETPLACE_PANEL_ORDER], ready: false };
  function change(order: string[]) {
    const validated = parseMarketplacePanelOrder(JSON.stringify({ version: 2, order }));
    setPreference({ ...current, order: validated });
    setNotice('');
    if (!current.key) { setNotice('Ordem alterada apenas nesta abertura. Entre novamente para salvar a preferência.'); return; }
    try { localStorage.setItem(current.key, JSON.stringify({ version: 2, order: validated })); }
    catch { setNotice('Ordem alterada, mas este navegador não permitiu salvá-la.'); }
  }
  return { order: current.order, ready: current.ready, change, notice };
}
