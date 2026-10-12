import type { MarketplaceId } from '@/app/modules/marketplaces/types';

/** Cada plataforma tem destino OAuth próprio; opções futuras falham fechadas. */
export function connectionTarget(provider: MarketplaceId) {
  if (provider === 'mercado_livre') return { name: 'Mercado Livre', endpoint: '/api/modulos/marketplaces/conexoes/mercado-livre/iniciar', origin: 'https://auth.mercadolivre.com.br', path: '/authorization', popup: 'avantalab-mercado-livre-oauth' };
  if (provider === 'magalu') return { name: 'Magalu', endpoint: '/api/modulos/marketplaces/conexoes/magalu/iniciar', origin: 'https://id.magalu.com', path: '/login', popup: 'avantalab-magalu-oauth' };
  throw new Error('A conexão desta plataforma ainda não está disponível.');
}

export function validateConnectionAuthorization(provider: MarketplaceId, value: unknown) {
  if (typeof value !== 'string') throw new Error('Não foi possível iniciar a conexão.');
  const url = new URL(value);
  const target = connectionTarget(provider);
  if (url.origin !== target.origin || url.pathname !== target.path || url.username || url.password || url.hash) throw new Error('O destino da autorização não pôde ser confirmado.');
  return url.toString();
}
