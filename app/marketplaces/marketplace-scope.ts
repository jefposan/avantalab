import type { MarketplaceId } from '@/app/modules/marketplaces/types';

type Account = { id: string; provider?: MarketplaceId; status: string };

/** Payloads antigos pertenciam exclusivamente ao Mercado Livre. */
export function accountsForMarketplace<T extends Account>(accounts: T[], marketplace: MarketplaceId): T[] {
  return accounts.filter(account => (account.provider ?? 'mercado_livre') === marketplace);
}

export function publicationAccount(accounts: Account[], selectedId: string): string {
  const connected = accounts.filter(publicationAccountAvailable);
  return connected.find(account => account.id === selectedId)?.id ?? connected[0]?.id ?? '';
}

export function publicationAccountAvailable(account: Account): boolean {
  return account.status === 'connected' || (account.provider === 'magalu' && account.status === 'attention'
    && 'last_error_code' in account && account.last_error_code === 'magalu_connector_pending');
}
