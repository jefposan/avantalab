import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListingEditor, ListingTypeOption } from '../listing-editor';
import { validateChanges } from '../listing-editor';
import { mercadoLivreEditPolicy, stockModelFromResponse, titleAssociationFromResponse } from './mercadolivre-edit-policy';
import { listingIdIsValid, normalizeListing, objectValue, uuidIsValid } from './listing-model';
import { estimateMercadoLivreListingTypeFee, mlRequest, recordPublishedListing, type SellerConnection } from './mercadolivre-management';
import { MarketplaceError } from './management-access';
import type { SaveListingInput } from './listing-edit-adapters';

async function freshEditor(db: SupabaseClient, connection: SellerConnection, id: unknown) {
  if (!listingIdIsValid(id)) throw new MarketplaceError(400, 'invalid_item', 'Identificador de anúncio inválido.');
  const item = objectValue(await mlRequest(db, connection, `/items/${id}`));
  normalizeListing(item, connection.seller_reference); // Nunca consultar dados complementares de anúncio alheio.
  if (!/^MLB\d+$/.test(String(item.category_id))) throw new MarketplaceError(409, 'invalid_category', 'Categoria do anúncio indisponível.');
  const [category, user, description, automation, stockModel, titleAssociation, availableListingTypes] = await Promise.all([
    mlRequest(db, connection, `/categories/${item.category_id}`).then(objectValue),
    mlRequest(db, connection, `/users/${connection.seller_reference}`).then(objectValue).catch(() => ({} as Record<string, unknown>)),
    mlRequest(db, connection, `/items/${id}/description`).then((value) => ({ text: typeof objectValue(value).plain_text === 'string' ? objectValue(value).plain_text as string : null, exists: true })).catch((error) => ({ text: error instanceof MarketplaceError && error.code === 'provider_404' ? '' : null, exists: false })),
    priceAutomation(db, connection, id),
    stockModelForItem(db, connection, item),
    titleAssociationForItem(db, connection, item),
    listingTypesForItem(db, connection, item),
  ]);
  if (user.id != null && String(user.id) !== connection.seller_reference) throw new MarketplaceError(409, 'seller_mismatch', 'Identidade da conta divergente. Reconecte a conta.');
  const editor = mercadoLivreEditPolicy(item, category, user, description.text, automation, stockModel, titleAssociation, availableListingTypes);
  const revision = createHash('sha256').update(JSON.stringify({ connection: connection.id, updated: item.last_updated, editor })).digest('hex');
  return { editor: { ...editor, revision } as ListingEditor, descriptionExists: description.exists, titleWriteField: item.user_product_id ? 'family_name' : 'title' };
}

const listingTypeNames: Record<string, string> = { gold_special: 'Clássico', gold_pro: 'Premium', gold_premium: 'Premium', free: 'Grátis' };

function listingTypeId(value: unknown) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{1,39}$/.test(value) ? value : '';
}

function listingTypesFromResponse(value: unknown, currentId: string) {
  const data = objectValue(value);
  const result = new Map<string, string>();
  for (const raw of Array.isArray(data.available) ? data.available : []) {
    const row = objectValue(raw), id = listingTypeId(row.id);
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 100) : '';
    if (id && (row.remaining_listings == null || Number(row.remaining_listings) > 0)) result.set(id, name || listingTypeNames[id] || id);
  }
  if (currentId && !result.has(currentId)) result.set(currentId, listingTypeNames[currentId] || currentId);
  return [...result].map(([id, name]) => ({ id, name }));
}

async function listingTypesForItem(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>): Promise<ListingTypeOption[]> {
  const currentId = listingTypeId(item.listing_type_id);
  try {
    const available = await mlRequest(db, connection, `/users/${connection.seller_reference}/available_listing_types?category_id=${encodeURIComponent(String(item.category_id))}`);
    const types = listingTypesFromResponse(available, currentId);
    return await Promise.all(types.map(async ({ id, name }) => {
      const estimate = await estimateMercadoLivreListingTypeFee(db, connection, item, id);
      return { id, name, ...estimate };
    }));
  } catch {
    return [];
  }
}

export async function readMercadoLivreListingTypeFee(db: SupabaseClient, connection: SellerConnection, id: unknown, listingType: unknown, price: unknown) {
  if (!listingIdIsValid(id)) throw new MarketplaceError(400, 'invalid_item', 'Identificador de anúncio inválido.');
  const selectedType = listingTypeId(listingType);
  if (!selectedType || typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || Math.round(price * 100) !== price * 100) {
    throw new MarketplaceError(400, 'invalid_fee_input', 'Informe um preço válido e um tipo de anúncio permitido.');
  }
  const item = objectValue(await mlRequest(db, connection, `/items/${id}`));
  normalizeListing(item, connection.seller_reference);
  if (!/^MLB\d+$/.test(String(item.category_id))) throw new MarketplaceError(409, 'invalid_category', 'Categoria do anúncio indisponível.');
  const types = await listingTypesForItem(db, connection, item);
  if (!types.some((option) => option.id === selectedType)) throw new MarketplaceError(400, 'invalid_listing_type', 'Este tipo de anúncio não está disponível para esta publicação.');
  const category = objectValue(await mlRequest(db, connection, `/categories/${item.category_id}`));
  const settings = objectValue(category.settings);
  const minimum = typeof settings.minimum_price === 'number' ? settings.minimum_price : .01;
  const maximum = typeof settings.maximum_price === 'number' ? settings.maximum_price : null;
  if (price < Math.max(.01, minimum) || (maximum != null && price > maximum)) throw new MarketplaceError(400, 'invalid_fee_price', 'O preço está fora dos limites informados pelo Mercado Livre para esta categoria.');
  const estimate = await estimateMercadoLivreListingTypeFee(db, connection, { ...item, price }, selectedType);
  return { listingType: selectedType, ...estimate };
}

async function titleAssociationForItem(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>): Promise<'single' | 'shared' | 'unknown'> {
  const upId = item.user_product_id;
  if (typeof upId !== 'string') return item.family_name || (Array.isArray(item.tags) && item.tags.includes('user_product_listing')) ? 'unknown' : 'single';
  if (!/^MLB[A-Z]?\d+$/.test(upId)) return 'unknown';
  try {
    const query = new URLSearchParams({ user_product_id: upId, limit: '2' });
    return titleAssociationFromResponse(await mlRequest(db, connection, `/users/${connection.seller_reference}/items/search?${query}`), connection.seller_reference, String(item.id));
  } catch { return 'unknown'; }
}

async function stockModelForItem(db: SupabaseClient, connection: SellerConnection, item: Record<string, unknown>): Promise<'single' | 'multi' | 'unknown'> {
  const upId = item.user_product_id;
  if (typeof upId !== 'string') return 'single';
  if (!/^MLB[A-Z]?\d+$/.test(upId)) return 'unknown';
  try {
    return stockModelFromResponse(await mlRequest(db, connection, `/user-products/${upId}/stock`), connection.seller_reference);
  } catch { return 'unknown'; }
}

async function priceAutomation(db: SupabaseClient, connection: SellerConnection, id: string): Promise<'active' | 'none' | 'unknown'> {
  // A lista oficial permite verificar ausência sem tratar qualquer 404 como permissão.
  try {
    for (let offset = 0; offset < 10000; offset += 100) {
      const page = objectValue(await mlRequest(db, connection, `/pricing-automation/users/${connection.seller_reference}/items?limit=100&offset=${offset}`));
      const paging = objectValue(page.paging);
      if (!Array.isArray(page.items) || typeof paging.total !== 'number' || !Number.isSafeInteger(paging.total) || paging.total < 0) return 'unknown';
      if (page.items.includes(id)) return 'active'; // Mesmo regra pausada é preservada, nunca desativada por esta edição.
      if (offset + page.items.length >= paging.total) return 'none';
      if (!page.items.length) return 'unknown';
    }
  } catch { /* Falha de consulta bloqueia somente o preço, não inventa permissão. */ }
  return 'unknown';
}

export async function readMercadoLivreEditor(db: SupabaseClient, connection: SellerConnection, id: unknown) {
  return (await freshEditor(db, connection, id)).editor;
}

export async function saveMercadoLivreEditor(db: SupabaseClient, connection: SellerConnection, actor: string, input: SaveListingInput) {
  if (!uuidIsValid(input.requestKey) || typeof input.revision !== 'string' || !/^[a-f0-9]{64}$/.test(input.revision)) throw new MarketplaceError(400, 'invalid_edit', 'Edição inválida. Reabra o anúncio.');
  const { editor, descriptionExists } = await freshEditor(db, connection, input.id);
  if (editor.revision !== input.revision) throw new MarketplaceError(409, 'edit_conflict', 'O anúncio ou suas permissões mudaram. Recarregue a edição antes de salvar; seus valores foram preservados.');
  const { changes, errors } = validateChanges(editor, input.changes);
  if (Object.keys(errors).length) throw new MarketplaceError(400, 'invalid_fields', Object.values(errors).join(' '), errors);
  const { data: audit, error } = await db.from('marketplace_listing_actions').insert({ empresa_id: connection.empresa_id, connection_id: connection.id,
    provider_listing_id: editor.id, action: 'edit', request_key: input.requestKey, actor_id: actor }).select('id').single();
  if (error || !audit) throw new MarketplaceError(error?.code === '23505' ? 409 : 503, error?.code === '23505' ? 'duplicate_edit' : 'edit_audit_unavailable',
    error?.code === '23505' ? 'Outra edição está em processamento ou esta tentativa já foi registrada. Recarregue o anúncio antes de repetir.' : 'A edição ainda não foi habilitada no banco deste ambiente. Nenhum dado foi enviado ao marketplace.');
  let applied = false;
  try {
    // Sob a exclusão mútua da auditoria, outra edição AvantaLab não pode ultrapassar esta validação.
    const locked = await freshEditor(db, connection, input.id);
    if (locked.editor.revision !== input.revision) throw new MarketplaceError(409, 'edit_conflict', 'O anúncio mudou durante a edição. Recarregue antes de salvar.');
    const body: Record<string, unknown> = {};
    if (changes.title !== undefined) body[locked.titleWriteField] = changes.title;
    if (changes.price !== undefined) body.price = changes.price;
    if (changes.stock !== undefined) body.available_quantity = changes.stock;
    if (Object.keys(body).length) {
      await mlRequest(db, connection, `/items/${editor.id}`, 'PUT', body);
      applied = true;
    }
    if (changes.listingType !== undefined) {
      // O Mercado Livre exige o recurso específico para mudar Clássico/Premium.
      await mlRequest(db, connection, `/items/${editor.id}/listing_type`, 'POST', { id: changes.listingType });
      applied = true;
    }
    if (changes.description !== undefined) {
      await mlRequest(db, connection, `/items/${editor.id}/description?api_version=2`, descriptionExists ? 'PUT' : 'POST', { plain_text: changes.description });
      applied = true;
    }
    const listing = await recordPublishedListing(db, connection, editor.id);
    const confirmed = await readMercadoLivreEditor(db, connection, editor.id);
    if (Object.entries(changes).some(([key, value]) => confirmed.values[key as keyof typeof changes] !== value)) throw new MarketplaceError(409, 'edit_not_confirmed', 'O marketplace não confirmou todos os valores enviados.');
    const recorded = await db.from('marketplace_listing_actions').update({ status: 'succeeded' }).eq('id', audit.id);
    if (recorded.error) throw new MarketplaceError(503, 'audit_update_failed', 'Não foi possível registrar a confirmação.');
    return { listing };
  } catch (failure) {
    const uncertain = applied || (failure instanceof MarketplaceError && failure.code === 'mutation_uncertain');
    await db.from('marketplace_listing_actions').update({ status: uncertain ? 'uncertain' : 'failed', error_code: failure instanceof MarketplaceError ? failure.code : 'integration' }).eq('id', audit.id);
    if (uncertain) throw new MarketplaceError(409, 'edit_uncertain', 'A alteração pode ter sido aplicada, total ou parcialmente. Recarregue a edição e confira os valores no marketplace antes de tentar novamente.');
    throw failure;
  }
}
