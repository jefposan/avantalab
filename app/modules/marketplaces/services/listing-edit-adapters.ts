import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceId } from '../types';
import type { ListingEditor } from '../listing-editor';
import type { SellerConnection } from './mercadolivre-management';
import type { ListingSnapshot } from './listing-model';
import { readMercadoLivreEditor, saveMercadoLivreEditor } from './mercadolivre-editor';
import { MarketplaceError } from './management-access';

export type SaveListingInput = { id: unknown; revision: unknown; changes: unknown; requestKey: unknown };
export type ListingEditAdapter = {
  read: (db: SupabaseClient, connection: SellerConnection, id: unknown) => Promise<ListingEditor>;
  save: (db: SupabaseClient, connection: SellerConnection, actor: string, input: SaveListingInput) => Promise<{ listing: ListingSnapshot }>;
};
const adapters: Partial<Record<MarketplaceId, ListingEditAdapter>> = {
  mercado_livre: { read: readMercadoLivreEditor, save: saveMercadoLivreEditor },
};
export function listingEditAdapter(provider: MarketplaceId): ListingEditAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new MarketplaceError(409, 'editor_unavailable', 'A edição desta integração ainda não está disponível.');
  return adapter;
}
