import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';
import { loadConnection } from './mercadolivre-management';
import { loadMagaluConnection } from './magalu-request';
export async function loadSalesProvider(db: SupabaseClient, companyId: string, id: unknown) {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'select_account', 'Selecione a conta da venda.');
  const result = await db.from('marketplace_connections').select('provider').eq('empresa_id', companyId).eq('id', id).maybeSingle();
  if (result.error) throw new MarketplaceError(503, 'database', 'Não foi possível conferir a conta da venda.');
  if (result.data?.provider === 'magalu') return { provider: 'magalu' as const, connection: await loadMagaluConnection(db, companyId, id) };
  if (result.data?.provider === 'mercado_livre') return { provider: 'mercado_livre' as const, connection: await loadConnection(db, companyId, id) };
  throw new MarketplaceError(404, 'account_not_found', 'Conta de vendas não encontrada nesta empresa.');
}
