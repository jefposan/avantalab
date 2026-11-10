'use client';
import { useCallback, useEffect, useState } from 'react';
import { validPriceSettings, type PriceSettings } from '@/app/modules/marketplaces/price-settings';
export type PriceSettingsRequest = (path: string, options?: RequestInit) => Promise<unknown>;
export const priceSettingsPath = '/api/modulos/marketplaces/precos/configuracoes';
export default function usePriceSettings(companyId: string, request: PriceSettingsRequest) {
  const [state, setState] = useState<{ companyId: string; settings: PriceSettings | null; error: string }>({ companyId: '', settings: null, error: '' });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    void request(`${priceSettingsPath}?empresaId=${encodeURIComponent(companyId)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) }).then(body => {
      const settings = (body as { settings?: unknown })?.settings;
      if (!validPriceSettings(settings)) throw new Error('Não foi possível validar os percentuais recebidos. Tente novamente.');
      if (!controller.signal.aborted) setState({ companyId, settings, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setState({ companyId, settings: null, error: error instanceof Error ? error.message : 'Não foi possível carregar os percentuais.' }); });
    return () => controller.abort();
  }, [companyId, request, reload]);
  const accept = useCallback((settings: PriceSettings) => setState(current => current.companyId === companyId ? { companyId, settings: { ...settings, profileDark: current.settings?.profileDark, profileColor: current.settings?.profileColor }, error: '' } : current), [companyId]);
  return { settings: state.companyId === companyId ? state.settings : null, error: state.companyId === companyId ? state.error : '', refresh: () => { setState({ companyId, settings: null, error: '' }); setReload(value => value + 1); }, accept };
}
