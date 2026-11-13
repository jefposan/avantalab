import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { validAccountCleanupOptions, type AccountCleanupOptions, type AccountCleanupReview } from '../account-cleanup';
import { inventoryNoticeDismissKey } from '../live-feed';
import { readInventoryNotices } from './inventory-notices';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';

type CleanupPlan = Omit<AccountCleanupReview, 'counts' | 'retained'> & {
  products: { id: string; name: string; revision: number; reason: string | null }[];
  links: unknown[]; listings: unknown[]; alerts: string[]; noticeKeys: string[];
};
function failure(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (['PGRST202', '42883'].includes(error.code || '')) {
    throw new MarketplaceError(503, 'cleanup_installation_pending', 'A limpeza estará disponível após a atualização do banco.');
  }
  throw new MarketplaceError(error.code === 'P0001' ? 409 : 503, 'cleanup_failed',
    error.code === 'P0001' ? error.message || 'Confira os dados da conta.' : 'Não foi possível concluir a limpeza. Confira a conta antes de tentar novamente.');
}
function validInput(accountId: unknown, options: unknown): asserts options is AccountCleanupOptions {
  if (!uuidIsValid(accountId) || !validAccountCleanupOptions(options)) {
    throw new MarketplaceError(400, 'invalid_cleanup', 'Selecione a conta e as opções de limpeza.');
  }
}
async function noticeKeys(db: SupabaseClient, companyId: string, accountId: string) {
  return [...new Set((await readInventoryNotices(db, companyId))
    .filter(notice => notice.connectionId === accountId).map(inventoryNoticeDismissKey))].sort();
}
export async function reviewAccountCleanup(db: SupabaseClient, companyId: string, actorId: string, accountId: unknown, options: unknown): Promise<AccountCleanupReview> {
  validInput(accountId, options);
  const keys = await noticeKeys(db, companyId, String(accountId));
  const { data, error } = await db.rpc('marketplace_account_cleanup_plan', {
    p_company: companyId, p_actor: actorId, p_account: accountId, p_options: options, p_notices: keys,
  }).abortSignal(AbortSignal.timeout(20_000));
  failure(error);
  const plan = data as CleanupPlan;
  if (!plan?.reviewToken || !Array.isArray(plan.products) || !Array.isArray(plan.alerts)) {
    throw new MarketplaceError(503, 'cleanup_review_invalid', 'Não foi possível conferir os registros desta conta.');
  }
  const eligible = plan.products.filter(product => !product.reason);
  return {
    companyName: plan.companyName, accountName: plan.accountName, connectionId: plan.connectionId,
    status: plan.status, options, reviewToken: plan.reviewToken, blockers: plan.blockers,
    counts: {
      notices: options.clearNotices ? keys.length + plan.alerts.length : 0,
      links: options.removeListings ? plan.links.length : 0,
      listings: options.removeListings ? plan.listings.length : 0,
      products: options.removeProducts ? eligible.length : 0,
      retainedProducts: plan.products.length - (options.removeProducts ? eligible.length : 0),
    },
    retained: plan.products.filter(product => product.reason).map(({ id, name, reason }) => ({ id, name, reason: reason! })),
  };
}
export async function executeAccountCleanup(db: SupabaseClient, companyId: string, actorId: string, body: Record<string, unknown>) {
  validInput(body.connectionId, body.options);
  if (!uuidIsValid(body.requestKey) || typeof body.reviewToken !== 'string' || !/^[a-f0-9]{32}$/.test(body.reviewToken)
    || typeof body.confirmation !== 'string' || body.confirmation.length > 180) {
    throw new MarketplaceError(400, 'invalid_cleanup_confirmation', 'Confira a prévia e confirme o nome da conta.');
  }
  const keys = await noticeKeys(db, companyId, String(body.connectionId));
  const { data, error } = await db.rpc('marketplace_account_cleanup', {
    p_company: companyId, p_actor: actorId, p_account: body.connectionId, p_options: body.options,
    p_notices: keys, p_review: body.reviewToken, p_confirmation: body.confirmation, p_key: body.requestKey,
  }).abortSignal(AbortSignal.timeout(45_000));
  failure(error);
  if (!data?.counts || typeof data.archived !== 'boolean') {
    throw new MarketplaceError(503, 'cleanup_result_invalid', 'Não foi possível confirmar o resultado. Confira a conta antes de repetir.');
  }
  return data;
}
export async function enableAccountImport(db: SupabaseClient, companyId: string, actorId: string, body: Record<string, unknown>) {
  if (!uuidIsValid(body.connectionId) || typeof body.confirmation !== 'string' || body.confirmation.length > 180) {
    throw new MarketplaceError(400, 'invalid_import_confirmation', 'Confirme a conta que voltará a importar anúncios.');
  }
  const { data, error } = await db.rpc('marketplace_account_import_enable', {
    p_company: companyId, p_actor: actorId, p_account: body.connectionId, p_confirmation: body.confirmation,
  }).abortSignal(AbortSignal.timeout(8_000));
  failure(error);
  if (data !== true) throw new MarketplaceError(503, 'import_enable_failed', 'Não foi possível confirmar a importação.');
  return { enabled: true };
}
