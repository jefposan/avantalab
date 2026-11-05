/** Contrato de apresentação do catálogo, independente dos códigos de cada marketplace. */
export type MarketplaceCatalogOutcome = 'checking' | 'empty' | 'found' | 'denied' | 'failed' | 'unverified';

export const MARKETPLACE_CATALOG_FEEDBACK: Record<MarketplaceCatalogOutcome, { account: string; panel: string }> = {
  checking: { account: 'Consultando anúncios da conta…', panel: 'Consultando anúncios desta conta…' },
  empty: { account: 'Sem anúncios para exibir · conta ainda sem anúncios', panel: 'Sem anúncios para exibir. A última consulta concluída não encontrou itens nesta conta.' },
  found: { account: 'Produtos encontrados na conta', panel: 'Há produtos cadastrados nesta conta.' },
  denied: { account: 'Consulta de anúncios não autorizada', panel: 'A plataforma não autorizou consultar os anúncios desta conta. Não é possível afirmar se há anúncios.' },
  failed: { account: 'Não foi possível confirmar os anúncios · tente atualizar contas', panel: 'Não foi possível confirmar a lista de anúncios agora. Tente atualizar; nenhum resultado foi presumido.' },
  unverified: { account: 'Anúncios ainda não verificados', panel: 'Os anúncios desta conta ainda não foram verificados. Atualize para consultar a plataforma.' },
};

/** A lista local vazia do ML só comprova conta vazia após sincronização completa. */
export function marketplaceListingEmptyOutcome(input: {
  loading: boolean;
  syncing: boolean;
  failed: boolean;
  filtered: boolean;
  connectedAccounts: Array<{ last_synced_at: string | null }>;
}): MarketplaceCatalogOutcome | 'filtered_empty' {
  if (input.loading || input.syncing) return 'checking';
  if (input.failed) return 'failed';
  if (input.filtered) return 'filtered_empty';
  if (!input.connectedAccounts.length || input.connectedAccounts.some(account => !account.last_synced_at)) return 'unverified';
  return 'empty';
}

export function marketplaceListingEmptyMessage(outcome: MarketplaceCatalogOutcome | 'filtered_empty'): string {
  return outcome === 'filtered_empty' ? 'Nenhum anúncio nos filtros selecionados.' : MARKETPLACE_CATALOG_FEEDBACK[outcome].panel;
}
