import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authorizePriceConsultation } from './price-access';
import { authorizeMarketplace, MarketplaceError } from './management-access';
import { parseLotCost, type PriceLot, type PriceLotItem } from '../price-lots';
import { uuidIsValid } from './listing-model';

export async function authorizePriceLots(request: Request, company: unknown, write = false) {
  const access = await authorizePriceConsultation(request, company);
  // Usuário exclusivo AvantaPreços opera lotes, mas não ganha administração de anúncios.
  if (!access.dedicated) await authorizeMarketplace(request, company, write ? 'manage' : 'view');
  return { ...access, canEdit: access.dedicated || ['gestor_master', 'administrador', 'operador_completo'].includes(access.perfil) };
}
export function lotId(value: unknown) {
  if (!uuidIsValid(value)) throw new MarketplaceError(400, 'invalid_lot', 'Identificador do lote ou da leitura inválido.');
  return String(value);
}
export function lotMetadata(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const supplier = typeof body.supplier === 'string' ? body.supplier.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const receivedOn = typeof body.receivedOn === 'string' ? body.receivedOn : '';
  if (!name || name.length > 120 || supplier.length > 180 || notes.length > 2000) throw new MarketplaceError(400, 'invalid_lot_data', 'Informe o nome do lote (até 120 caracteres) e confira os limites das informações.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn) || !Number.isFinite(Date.parse(receivedOn)) || new Date(receivedOn).toISOString().slice(0, 10) !== receivedOn) throw new MarketplaceError(400, 'invalid_lot_date', 'Informe uma data válida de recebimento.');
  let cost;
  try { cost = parseLotCost(body.purchaseCost ?? null); } catch (error) { throw new MarketplaceError(400, 'invalid_lot_cost', (error as Error).message); }
  return { name, supplier, notes, received_on: receivedOn, purchase_cost_cents: cost };
}
export async function readPriceLot(db: SupabaseClient, company: string, id: string) {
  const { data: lot, error } = await db.from('marketplace_price_lots').select('*').eq('empresa_id', company).eq('id', id).maybeSingle();
  if (error) throw new MarketplaceError(503, 'lots_unavailable', 'Não foi possível carregar o lote. Verifique se a atualização dos lotes foi instalada.');
  if (!lot) throw new MarketplaceError(404, 'lot_not_found', 'Lote não encontrado nesta empresa.');
  const items: PriceLotItem[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await db.from('marketplace_price_lot_items').select('*').eq('empresa_id', company).eq('lot_id', id).order('created_at').order('id').range(offset, offset + 999);
    if (page.error) throw new MarketplaceError(503, 'lots_unavailable', 'Não foi possível carregar todos os produtos do lote. Tente novamente.');
    items.push(...(page.data || []) as PriceLotItem[]);
    if ((page.data || []).length < 1000) break;
  }
  const check = await db.from('marketplace_price_lots').select('revision').eq('empresa_id', company).eq('id', id).maybeSingle();
  if (check.error) throw new MarketplaceError(503, 'lots_unavailable', 'Não foi possível confirmar a conferência do lote. Tente novamente.');
  if (!check.data || check.data.revision !== lot.revision) throw new MarketplaceError(409, 'lot_changed', 'Este lote foi atualizado durante a leitura. Atualize e tente novamente para usar os totais mais recentes.');
  return { lot: lot as PriceLot, items };
}
