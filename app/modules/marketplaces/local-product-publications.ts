import type { LocalProductLink } from './services/local-product-model';
import { providerName } from './live-feed.ts';

export type ProductPublicationFilter = 'all' | 'advertised' | 'paused' | 'review' | 'disabled' | 'unadvertised';
export const PUBLICATION_PROVIDERS = ['mercado_livre', 'magalu', 'shopee', 'tiktok_shop', 'casas_bahia', 'amazon'];
// Anunciado significa publicação ativa; vínculos pausados permanecem no histórico.
export const PUBLICATION_STATUS_QUERY = 'status.in.(active,published,PUBLISHED,ACTIVE)';
export const PUBLICATION_STATES = {
  advertised: { label: 'Anunciado', statuses: ['active','published'] },
  paused: { label: 'Pausado', statuses: ['paused'] },
  review: { label: 'Em análise', statuses: ['under_review','in_review','pending','pending_review'] },
  disabled: { label: 'Desativado', statuses: ['inactive','closed','cancelled','canceled'] },
} as const;
export function publicationStatusesQuery(statuses: readonly string[]) {
  return `status.in.(${statuses.flatMap(s=>[s,s.toUpperCase()]).join(',')})`;
}
export function productPublicationState(links: Pick<LocalProductLink, 'provider' | 'provider_listing_id' | 'status'>[]) {
  const recognized=links.filter(l=>PUBLICATION_PROVIDERS.includes(l.provider)&&l.provider_listing_id.trim());
  for (const [key,state] of Object.entries(PUBLICATION_STATES)) {
    if(recognized.some(l=>(state.statuses as readonly string[]).includes(l.status.trim().toLowerCase())))return {key:key as keyof typeof PUBLICATION_STATES,label:state.label};
  }
  return null;
}
export function publicationFilterValue(value: string | null | undefined): ProductPublicationFilter | null {
  return value == null || value === 'all' ? 'all' : value === 'unadvertised' || Object.hasOwn(PUBLICATION_STATES,value) ? value as ProductPublicationFilter : null;
}

/** Somente vínculos com anúncio identificado e publicação reconhecida, nunca um rascunho. */
export function productPublicationChannels(links: LocalProductLink[]) {
  const channels = new Map<string, { provider: string; name: string; total: number; paused: number }>();
  const seen = new Set<string>();
  for (const link of links) {
    const name = providerName(link.provider);
    const status = link.status.trim().toLowerCase();
    if (!link.provider_listing_id.trim() || name === 'Marketplace' || (status !== 'active' && status !== 'published')) continue;
    const key = `${link.provider}:${link.connection_id}:${link.provider_listing_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const channel = channels.get(link.provider) || { provider: link.provider, name, total: 0, paused: 0 };
    channel.total++;
    channels.set(link.provider, channel);
  }
  const order = ['mercado_livre', 'magalu', 'shopee', 'tiktok_shop', 'casas_bahia', 'amazon'];
  return Array.from(channels.values()).sort((a, b) => order.indexOf(a.provider) - order.indexOf(b.provider));
}
