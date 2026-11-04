import { MARKETPLACE_CATALOG_FEEDBACK, type MarketplaceCatalogOutcome } from './catalog-feedback';

export type MagaluCatalogCheck = MarketplaceCatalogOutcome;

/** Adapta a resposta técnica Magalu ao contrato comum antes de chegar à tela. */
export function magaluCatalogOutcome(status: unknown): MagaluCatalogCheck {
  return status === 'empty' ? 'empty' : status === 'has_skus' ? 'found' : 'failed';
}

export const MAGALU_CATALOG_MESSAGES: Record<MagaluCatalogCheck, { account: string; panel: string }> = {
  ...MARKETPLACE_CATALOG_FEEDBACK,
  found: {
    account: `${MARKETPLACE_CATALOG_FEEDBACK.found.account} · listagem não integrada`,
    panel: `${MARKETPLACE_CATALOG_FEEDBACK.found.panel} A listagem do Magalu ainda não está integrada ao AvantaLab.`,
  },
};
