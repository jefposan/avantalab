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
