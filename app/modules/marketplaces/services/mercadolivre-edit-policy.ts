import type { ListingEditor, FieldPermission } from '../listing-editor';
import { objectValue } from './listing-model';

export function mercadoLivreEditPolicy(item: Record<string, unknown>, category: Record<string, unknown>, user: Record<string, unknown>, description: string | null, automation: 'active' | 'none' | 'unknown'): Omit<ListingEditor, 'revision'> {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const userTags = Array.isArray(user.tags) ? user.tags : [];
  const shipping = objectValue(item.shipping), settings = objectValue(category.settings);
  const variants = Array.isArray(item.variations) && item.variations.length > 0;
  const up = Boolean(item.user_product_id) || tags.includes('user_product_listing');
  const catalog = item.catalog_listing !== false; // Ausente não é autorização para editar conteúdo.
  const closed = !['active', 'paused'].includes(String(item.status)) || (Array.isArray(item.sub_status) && item.sub_status.includes('deleted'));
  const permission = (reason?: string, limits: Omit<FieldPermission, 'editable' | 'reason'> = {}): FieldPermission => ({ editable: !reason, ...(reason ? { reason } : {}), ...limits });
  const stateReason = closed ? 'Este anúncio não está ativo ou pausado.' : undefined;
  const maxTitle = typeof settings.max_title_length === 'number' ? settings.max_title_length : undefined;
  const minPrice = typeof settings.minimum_price === 'number' ? settings.minimum_price : .01;
  const maxPrice = typeof settings.maximum_price === 'number' ? settings.maximum_price : undefined;
  const stockLimit = typeof settings.maximum_quantity === 'number' ? settings.maximum_quantity : undefined;
  return {
    provider: 'mercado_livre', id: String(item.id), currency: String(item.currency_id || ''),
    values: { title: typeof item.title === 'string' ? item.title : '', price: typeof item.price === 'number' ? item.price : null,
      stock: typeof item.available_quantity === 'number' ? item.available_quantity : null, description: description ?? '' },
    fields: {
      title: permission(stateReason || (catalog ? 'Título definido pelo catálogo do Mercado Livre.' : up ? 'Título gerado ou compartilhado pelo Mercado Livre (User Products).' : typeof item.sold_quantity !== 'number' ? 'Não foi possível verificar as vendas deste anúncio.' : item.sold_quantity > 0 ? 'O Mercado Livre bloqueia o título após a primeira venda.' : !maxTitle ? 'Limite de título da categoria indisponível.' : undefined), { maxLength: maxTitle }),
      price: permission(stateReason || (item.currency_id !== 'BRL' ? 'Moeda não suportada neste editor.' : item.buying_mode !== 'buy_it_now' ? 'Este editor atende anúncios de preço fixo.' : variants ? 'Preço com variações: gerencie no Mercado Livre nesta etapa.' : automation === 'active' || tags.includes('dynamic_standard_price') ? 'Preço controlado por automatização do Mercado Livre.' : automation === 'unknown' ? 'Não foi possível verificar a automatização de preço. Recarregue a edição.' : Array.isArray(item.deal_ids) && item.deal_ids.length ? 'Anúncio vinculado a oferta. Gerencie o preço no Mercado Livre.' : undefined), { min: Math.max(.01, minPrice), max: maxPrice }),
      stock: permission(stateReason || (shipping.logistic_type === 'fulfillment' ? 'Estoque Full administrado pelos depósitos do Mercado Livre.' : up || userTags.includes('warehouse_management') ? 'Estoque compartilhado ou por depósitos: gerencie no Mercado Livre nesta etapa.' : user.id == null ? 'Não foi possível verificar o modelo de estoque da conta.' : variants ? 'Estoque por variação: gerencie no Mercado Livre nesta etapa.' : typeof item.available_quantity !== 'number' ? 'Estoque indisponível para esta conta.' : item.condition !== 'new' || item.listing_type_id === 'free' ? 'Condição ou tipo de anúncio exige gestão específica de estoque.' : undefined), { min: 0, max: stockLimit }),
      description: permission(stateReason || (catalog ? 'Conteúdo definido pelo catálogo do Mercado Livre.' : up ? 'Conteúdo compartilhado (User Products): gerencie no Mercado Livre nesta etapa.' : description == null ? 'Não foi possível consultar a descrição. Recarregue a edição.' : undefined), { maxLength: 50000 }),
    },
  };
}
