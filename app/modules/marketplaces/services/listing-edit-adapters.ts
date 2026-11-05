import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceId } from '../types';
import type { ListingEditor } from '../listing-editor';
import type { SellerConnection } from './mercadolivre-management';
import type { ListingSnapshot } from './listing-model';
import { readMercadoLivreEditor, saveMercadoLivreEditor } from './mercadolivre-editor';
import { MarketplaceError } from './management-access';
import type {MagaluConnection} from './magalu-request';
import {readMagaluEditor,saveMagaluEditor} from './magalu-editor';

export type SaveListingInput = { id: unknown; revision: unknown; changes: unknown; requestKey: unknown };
export type ListingEditAdapter = {
  read: (db: SupabaseClient, connection: SellerConnection|MagaluConnection, id: unknown) => Promise<ListingEditor>;
  save: (db: SupabaseClient, connection: SellerConnection|MagaluConnection, actor: string, input: SaveListingInput) => Promise<{ listing: ListingSnapshot;pending?:boolean;message?:string }>;
};
const adapters: Partial<Record<MarketplaceId, ListingEditAdapter>> = {
  mercado_livre: { read:(db,c,id)=>readMercadoLivreEditor(db,c as SellerConnection,id),save:(db,c,actor,input)=>saveMercadoLivreEditor(db,c as SellerConnection,actor,input) },
  magalu:{read:(db,c,id)=>readMagaluEditor(db,c as MagaluConnection,id),save:(db,c,actor,input)=>saveMagaluEditor(db,c as MagaluConnection,actor,input)},
};
export function listingEditAdapter(provider: MarketplaceId): ListingEditAdapter {
  const adapter = adapters[provider];
  if (!adapter) throw new MarketplaceError(409, 'editor_unavailable', 'A edição desta integração ainda não está disponível.');
  return adapter;
}
