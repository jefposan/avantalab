import type { MarketplaceAccount } from './Anunciados';

export type RenewalStatus = { status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'; account?: MarketplaceAccount; message?: string };

/** Confirmação no servidor, inclusive sem opener e com titular em outro aparelho. */
export function monitorAuthorizationRenewal({ read, onResult, onError, expiresAt }: {
  read: (signal: AbortSignal) => Promise<RenewalStatus>; onResult: (result: RenewalStatus) => void; onError: (error: unknown) => void; expiresAt: string;
}) {
  const controller = new AbortController();
  let checking = false;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true; controller.abort(); window.clearInterval(timer);
    window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check);
  };
  const check = async () => {
    if (stopped || checking || document.visibilityState === 'hidden') return;
    checking = true;
    try {
      const result = await read(AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]));
      if (stopped) return;
      if (!['pending', 'processing', 'completed', 'failed', 'expired'].includes(result.status)) throw new Error('Não foi possível confirmar a renovação.');
      if (['completed', 'failed', 'expired'].includes(result.status)) stop();
      onResult(result);
    } catch (error) {
      if (stopped) return;
      if (Date.parse(expiresAt) <= Date.now()) stop();
      onError(error);
    } finally { checking = false; }
  };
  const timer = window.setInterval(check, 3000);
  window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
  void check();
  return stop;
}

/** Reutilizado pelo botão local e pelo link do titular, com a mesma validação de destino. */
export async function renewalAuthorizationUrl(requestId: string, signal = AbortSignal.timeout(15_000)) {
  const response = await fetch('/api/marketplaces/renovar', {
    method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'autorizar', requestId }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || typeof payload?.authorizationUrl !== 'string') throw new Error(payload?.message || 'Não foi possível abrir o Mercado Livre.');
  let destination: URL;
  try { destination = new URL(payload.authorizationUrl); }
  catch { throw new Error('Destino de autorização inválido.'); }
  if (destination.origin !== 'https://auth.mercadolivre.com.br' || destination.pathname !== '/authorization' || destination.username || destination.password) throw new Error('Destino de autorização inválido.');
  return destination.toString();
}
