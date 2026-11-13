import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';
import type { ProductCleanupList, ProductCleanupReview, ProductCleanupResult } from '../product-cleanup';

function failure(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (['PGRST202', '42883'].includes(error.code || '')) throw new MarketplaceError(503, 'cleanup_installation_pending', 'A limpeza de cadastros depende da atualização do banco neste ambiente.');
  throw new MarketplaceError(error.code === 'P0001' ? 409 : 503, 'product_cleanup_failed', error.code === 'P0001'
    ? error.message || 'Revise a seleção antes de continuar.' : 'A limpeza não foi confirmada. Preserve esta tentativa e confira antes de repetir.');
}
function productIds(value: unknown): asserts value is string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000 || value.some(id => !uuidIsValid(id)) || new Set(value).size !== value.length) {
    throw new MarketplaceError(400, 'invalid_product_cleanup', 'Selecione de 1 a 1.000 cadastros diferentes.');
  }
}
function validList(value: unknown): value is ProductCleanupList {
  const list = value as ProductCleanupList;
  return !!list && typeof list.companyName === 'string' && !!list.companyName && Array.isArray(list.products) && list.products.length <= 1000
    && new Set(list.products.map(p => p.id)).size === list.products.length
    && list.products.every(p => uuidIsValid(p.id) && typeof p.name === 'string' && Number.isSafeInteger(p.revision) && p.revision > 0
      && ['avantaprecos','anuncio','local'].includes(p.origin) && typeof p.hasHistory === 'boolean' && typeof p.linked === 'boolean' && Array.isArray(p.blockers) && p.blockers.every(b => typeof b === 'string'));
}
export async function listProductCleanup(db: SupabaseClient, company: string, actor: string) {
  const { data, error } = await db.rpc('marketplace_product_cleanup_list', { p_company: company, p_actor: actor }).abortSignal(AbortSignal.timeout(25_000));
  failure(error);
  if (!validList(data)) throw new MarketplaceError(503, 'product_cleanup_invalid', 'A lista de cadastros veio incompleta. Tente novamente.');
  return data;
}
export async function reviewProductCleanup(db: SupabaseClient, company: string, actor: string, ids: unknown) {
  productIds(ids);
  const { data, error } = await db.rpc('marketplace_product_cleanup_review', { p_company: company, p_actor: actor, p_ids: ids }).abortSignal(AbortSignal.timeout(25_000));
  failure(error);
  if (!validList(data) || !/^[a-f0-9]{32}$/.test((data as ProductCleanupReview).reviewToken) || data.products.length !== ids.length
    || data.products.some(p => !ids.includes(p.id))) throw new MarketplaceError(503, 'product_cleanup_invalid', 'A prévia veio incompleta. Nenhum cadastro foi apagado.');
  return data as ProductCleanupReview;
}
export async function executeProductCleanup(db: SupabaseClient, company: string, actor: string, input: Record<string, unknown>) {
  productIds(input.productIds);
  if (input.acknowledged !== true || !uuidIsValid(input.requestKey) || typeof input.confirmation !== 'string'
    || !input.confirmation || input.confirmation.length > 220 || typeof input.reviewToken !== 'string' || !/^[a-f0-9]{32}$/.test(input.reviewToken)) {
    throw new MarketplaceError(400, 'product_cleanup_confirmation', 'Confirme que os cadastros serão apagados e digite o nome do perfil.');
  }
  const ids = input.productIds;
  const { data, error } = await db.rpc('marketplace_product_cleanup_execute', {
    p_company: company, p_actor: actor, p_ids: input.productIds, p_review: input.reviewToken,
    p_confirmation: input.confirmation, p_acknowledged: true, p_key: input.requestKey,
  }).abortSignal(AbortSignal.timeout(45_000));
  failure(error);
  if (!data || data.historyPreserved !== true || data.removed !== input.productIds.length || !Array.isArray(data.productIds)
    || data.productIds.length !== input.productIds.length || new Set(data.productIds).size !== ids.length || data.productIds.some((id: string) => !ids.includes(id))) {
    throw new MarketplaceError(503, 'product_cleanup_result', 'A resposta não confirmou a limpeza. Confira antes de repetir esta tentativa.');
  }
  return data as ProductCleanupResult;
}
