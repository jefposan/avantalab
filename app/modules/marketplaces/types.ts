export const MARKETPLACES = [
  'mercado_livre',
  'shopee',
  'tiktok_shop',
  'magalu',
  'casas_bahia',
  'amazon',
] as const;

export type MarketplaceId = (typeof MARKETPLACES)[number];
export type MarketplaceConnectionStatus = 'not_connected' | 'connecting' | 'connected' | 'expired' | 'attention';
export type MarketplacePublicationStatus = 'draft' | 'needs_information' | 'validated' | 'publishing' | 'published' | 'failed';

export type MarketplaceDefinition = {
  id: MarketplaceId;
  name: string;
  connection: 'oauth' | 'planned';
  supportsEanPriceFlow: boolean;
};

export type PublicationDraft = {
  empresaId: string;
  marketplace: MarketplaceId;
  connectionId?: string;
  ean: string;
  priceInCents: number;
  currency: 'BRL';
};

export type PublicationRequirement = {
  field: string;
  label: string;
  message: string;
  input: 'text' | 'number' | 'select' | 'file';
};

export type PublicationPreparation = {
  status: MarketplacePublicationStatus;
  normalizedEan?: string;
  priceInCents?: number;
  requirements: PublicationRequirement[];
  message: string;
};
