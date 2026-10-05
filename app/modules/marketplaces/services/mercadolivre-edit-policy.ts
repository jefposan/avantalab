import type { ListingEditor, FieldPermission } from '../listing-editor';
import { objectValue } from './listing-model';

export function stockModelFromResponse(value: unknown, sellerReference: string): 'single' | 'multi' | 'unknown' {
  const stock = objectValue(value);
  if (String(stock.user_id ?? '') !== sellerReference || !Array.isArray(stock.locations) || stock.locations.length === 0) return 'unknown';
  return stock.locations.length === 1 && objectValue(stock.locations[0]).type === 'selling_address' ? 'single' : 'multi';
}

export function titleAssociationFromResponse(value: unknown, sellerReference: string, itemId: string): 'single' | 'shared' | 'unknown' {
  const search = objectValue(value), paging = objectValue(search.paging);
  if ((search.seller_id != null && String(search.seller_id) !== sellerReference) || !Array.isArray(search.results) || typeof paging.total !== 'number' || !Number.isSafeInteger(paging.total) || paging.total < 1) return 'unknown';
  if (paging.total > 1) return 'shared';
  return search.results.length === 1 && search.results[0] === itemId ? 'single' : 'unknown';
}

export function mercadoLivreEditPolicy(item: Record<string, unknown>, category: Record<string, unknown>, user: Record<string, unknown>, description: string | null, automation: 'active' | 'none' | 'unknown', stockModel: 'single' | 'multi' | 'unknown', titleAssociation: 'single' | 'shared' | 'unknown'): Omit<ListingEditor, 'revision'> {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const userTags = Array.isArray(user.tags) ? user.tags : [];
  const shipping = objectValue(item.shipping), settings = objectValue(category.settings);
  const variants = Array.isArray(item.variations) && item.variations.length > 0;
  const up = Boolean(item.user_product_id) || tags.includes('user_product_listing') || typeof item.family_name === 'string';
  const kit = tags.includes('bundle') || objectValue(item.bundle).type === 'kit';
  const catalog = item.catalog_listing !== false; // Ausente não é autorização para editar conteúdo.
  const closed = !['active', 'paused'].includes(String(item.status)) || (Array.isArray(item.sub_status) && item.sub_status.includes('deleted'));
  const permission = (reason?: string, limits: Omit<FieldPermission, 'editable' | 'reason'> = {}): FieldPermission => ({ editable: !reason, ...(reason ? { reason } : {}), ...limits });
  const stateReason = closed ? 'Este anúncio não está ativo ou pausado.' : undefined;
  const maxTitle = typeof settings.max_title_length === 'number' ? settings.max_title_length : undefined;
  const minPrice = typeof settings.minimum_price === 'number' ? settings.minimum_price : .01;
  const maxPrice = typeof settings.maximum_price === 'number' ? settings.maximum_price : undefined;
  const stockLimit = typeof settings.maximum_quantity === 'number' ? settings.maximum_quantity : undefined;
  const familyName = typeof item.family_name === 'string' ? item.family_name : null;
  const titleReason = stateReason || (catalog ? 'O título é controlado pelo catálogo do Mercado Livre.'
    : up ? (!familyName ? 'O nome base do produto não está disponível para edição.'
      : typeof item.sold_quantity === 'number' && item.sold_quantity > 0 ? 'Este produto já teve vendas. O Mercado Livre não permite alterar o nome base.'
      : titleAssociation === 'shared' ? 'Há outros anúncios vinculados a este produto. O AvantaLab não altera o nome compartilhado; use “Abrir no Mercado Livre” para revisar. Se algum deles já vendeu, a plataforma não permite a mudança.'
      : titleAssociation === 'unknown' ? 'Não foi possível confirmar se este produto está vinculado a outros anúncios. Recarregue a edição.'
      : typeof item.sold_quantity !== 'number' ? 'Não foi possível confirmar as vendas deste produto.'
      : !maxTitle ? 'Limite de caracteres do título indisponível.' : undefined)
    : typeof item.sold_quantity !== 'number' ? 'Não foi possível confirmar as vendas deste anúncio.'
      : item.sold_quantity > 0 ? 'O Mercado Livre bloqueia o título após a primeira venda.'
      : !maxTitle ? 'Limite de caracteres do título indisponível.' : undefined);
  return {
    provider: 'mercado_livre', id: String(item.id), currency: String(item.currency_id || ''),
    values: { title: up ? familyName ?? '' : typeof item.title === 'string' ? item.title : '', price: typeof item.price === 'number' ? item.price : null,
      stock: typeof item.available_quantity === 'number' ? item.available_quantity : null, description: description ?? '' },
    fields: {
      title: permission(titleReason, { maxLength: maxTitle, ...(up ? { label: 'Nome base do título', notice: 'O Mercado Livre monta o título visível a partir deste nome e dos atributos do produto.' } : {}) }),
      price: permission(stateReason || (item.currency_id !== 'BRL' ? 'Moeda não suportada neste editor.' : item.buying_mode !== 'buy_it_now' ? 'Este editor atende anúncios de preço fixo.' : variants ? 'Preço com variações: gerencie no Mercado Livre nesta etapa.' : automation === 'active' || tags.includes('dynamic_standard_price') ? 'Preço controlado por automatização do Mercado Livre.' : automation === 'unknown' ? 'Não foi possível verificar a automatização de preço. Recarregue a edição.' : Array.isArray(item.deal_ids) && item.deal_ids.length ? 'Anúncio vinculado a oferta. Gerencie o preço no Mercado Livre.' : undefined), { min: Math.max(.01, minPrice), max: maxPrice }),
      stock: permission(stateReason || (kit ? 'O estoque deste kit virtual é calculado pelos produtos componentes.' : shipping.logistic_type === 'fulfillment' ? 'Estoque Full administrado pelos depósitos do Mercado Livre.' : user.id == null ? 'Não foi possível verificar o modelo de estoque da conta.' : userTags.includes('warehouse_management') || stockModel === 'multi' ? 'Estoque por depósitos: gerencie no Mercado Livre nesta etapa.' : stockModel === 'unknown' ? 'Não foi possível confirmar a localização do estoque. Recarregue a edição.' : variants ? 'Estoque por variação: gerencie no Mercado Livre nesta etapa.' : typeof item.available_quantity !== 'number' ? 'Estoque indisponível para esta conta.' : item.condition !== 'new' || item.listing_type_id === 'free' ? 'Condição ou tipo de anúncio exige gestão específica de estoque.' : undefined), { min: 0, max: stockLimit, ...(up ? { notice: 'Estoque compartilhado com outros anúncios deste produto. Zero pode pausar o anúncio.' } : {}) }),
      description: permission(stateReason || (catalog ? 'Conteúdo definido pelo catálogo do Mercado Livre.' : description == null ? 'Não foi possível consultar a descrição. Recarregue a edição.' : undefined), { maxLength: 50000 }),
    },
  };
}
