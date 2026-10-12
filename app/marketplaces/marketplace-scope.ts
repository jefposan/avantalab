import type { MarketplaceId } from '@/app/modules/marketplaces/types';

type Account = { id: string; provider?: MarketplaceId; status: string };

/** Payloads antigos pertenciam exclusivamente ao Mercado Livre. */
export function accountsForMarketplace<T extends Account>(accounts: T[], marketplace: MarketplaceId): T[] {
  return accounts.filter(account => (account.provider ?? 'mercado_livre') === marketplace);
}

export function publicationAccount(accounts: Account[], selectedId: string): string {
  const connected = accounts.filter(account => account.status === 'connected');
  return connected.find(account => account.id === selectedId)?.id ?? connected[0]?.id ?? '';
}
