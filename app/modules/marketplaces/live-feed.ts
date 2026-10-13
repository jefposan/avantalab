import { safeMarketplaceLink } from './services/inventory-model.ts';

export type SaleAlert = { id: string; sale_id?: string; kind?: 'new_sale' | 'pending_dispatch'; connection_id: string; provider: string; listing_id: string; title: string; quantity: number; sold_at: string; order_id: string; account_name: string; permalink: string | null };
export type MarketplaceLiveFeed = { alerts: SaleAlert[]; pendingStock: number; pendingSales: number; issues: Array<{ issue: string; total: number }>; updatedAt: string | null; workerFinishedAt: string | null; workerHealthy: boolean; enabled: boolean };
const messages: Record<string, string> = {
  sales_history_setup: 'A recuperação das vendas anteriores precisa ser ativada no banco pelo administrador do sistema.',
  product_not_linked: 'Há venda sem produto local vinculado. Vincule o anúncio em Produtos e estoque.',
  stock_not_confirmed: 'Há produto vendido sem estoque inicial confirmado. Confira o saldo local.',
  variation_not_linked: 'Há venda com variação ainda sem estoque próprio vinculado.',
  insufficient_stock: 'Uma venda ultrapassou o saldo local. Confira o estoque físico antes do envio.',
  order_quantity_changed: 'A quantidade de um pedido mudou. Confira a venda e o saldo físico.',
  lower_remote_stock: 'Um anúncio tem menos unidades que o saldo local. Conferindo possíveis vendas; nenhuma unidade foi reposta.',
  warehouse: 'Estoque por depósitos precisa de vínculo com o depósito correto. Nenhum saldo foi enviado por tentativa.',
  fulfillment: 'Estoque Full é operado pelo Mercado Livre e precisa de controle separado.',
  variations: 'Anúncio com variações precisa de estoque por variação.',
  virtual_kit: 'Kit virtual precisa de estoque pelos produtos componentes.',
  user_product_not_unified: 'Vincule os anúncios que compartilham estoque no Mercado Livre ao mesmo produto local.',
  unknown_stock_model: 'O modelo de estoque do anúncio ainda não foi confirmado. Nenhum saldo foi enviado por tentativa.',
  provider_not_supported: 'Esta plataforma ainda precisa do conector de estoque.',
};
export const inventoryIssueMessage = (code: string) => messages[code] || 'Há atualização pendente. O sistema tentará novamente; confira a conexão e o anúncio se persistir.';
export const providerName = (provider: string) => ({ mercado_livre: 'Mercado Livre', shopee: 'Shopee', amazon: 'Amazon', magalu: 'Magalu', tiktok_shop: 'TikTok Shop', casas_bahia: 'Casas Bahia' })[provider] || 'Marketplace';
export function alertLink(alert: SaleAlert) { return safeMarketplaceLink(alert.provider, alert.permalink); }
