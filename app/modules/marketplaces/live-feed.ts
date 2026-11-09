export type SaleAlert = { id: string; sale_id?: string; kind?: 'new_sale' | 'pending_dispatch'; connection_id: string; provider: string; listing_id: string; title: string; quantity: number; sold_at: string; order_id: string; account_name: string; permalink: string | null };
export type InventoryNotice = { id: string; source: 'sale' | 'stock' | 'account'; code: string; productId: string | null; productName: string | null; ean: string | null; listingId: string | null; accountName: string | null; connectionId?: string | null; orderId: string | null; provider: string; nextAttemptAt?: string | null; candidateProducts?:Array<{id:string;name:string;ean:string|null;sku?:string|null}> };
export type MarketplaceLiveFeed = { alerts: SaleAlert[]; pendingStock: number; pendingSales: number; issues: Array<{ issue: string; total: number }>; notices?: InventoryNotice[]; noticesUnavailable?: boolean; noticeDismissalsUnavailable?: boolean; checkedAt?: string; updatedAt: string | null; workerFinishedAt: string | null; workerHealthy: boolean; enabled: boolean };
const informationalInventoryIssues = new Set([
  'out_of_stock', 'fulfillment', 'virtual_kit', 'variations', 'warehouse',
  'magalu_stock_origin', 'magalu_listing_blocked', 'provider_not_supported', 'sales_history_setup',
]);

/** A dispensa é uma confirmação de leitura, não encerra uma pendência operacional. */
export function inventoryNoticeDismissAction(notice: InventoryNotice): 'OK' | 'Dispensar aviso' | null {
  if (notice.source === 'sale' && ['cancelled_requires_manual_return', 'cancelled_stock_review'].includes(notice.code)) return 'OK';
  return informationalInventoryIssues.has(notice.code) ? 'Dispensar aviso' : null;
}

export function inventoryNoticeDismissKey(notice: Pick<InventoryNotice, 'id' | 'code'>) {
  return JSON.stringify([notice.id, notice.code]);
}

/** Conta os avisos da lista, sem somar novamente o estoque já detalhado em notices. */
export function inventoryNoticeCount(feed: MarketplaceLiveFeed | null, unavailable: boolean) {
  let count = unavailable ? 1 : 0;
  if (!feed) return count;
  count += feed.notices?.length || 0;
  count += Math.max(0, feed.pendingSales || 0);
  if (!feed.enabled || !feed.workerHealthy) count++;
  if (feed.noticesUnavailable || !feed.notices) count++;
  else if (!feed.notices.length && feed.pendingStock > 0) count++;
  return count;
}
const messages: Record<string, string> = {
  out_of_stock:'Sem estoque Online. Anúncios pausados/inativos e saldo remoto zero na última conferência.',
  zero_stock_pause_pending:'Sem estoque Online. Pausa dos anúncios ainda pendente de confirmação; confira o retorno de cada conta.',
  zero_stock_review:'Sem estoque Online informado (0). Confira fisicamente e confirme saldo zero para concluir a conferência e liberar a pausa dos anúncios elegíveis.',
  listing_quality_low: 'Este anúncio tem qualidade abaixo de 70 no Mercado Livre. Confira os objetivos e revise as melhorias sugeridas.',
  import_stock_review:'Estoque a confirmar. Confira o saldo Online e use Confirmar saldo nos detalhes do produto.',
  listing_refresh_partial:'Há anúncios desta conta sem conferência recente. O sistema tentará novamente; os últimos dados confirmados foram preservados.',
  listing_pause_unconfirmed:'Pausa ainda não confirmada pelo marketplace. Confira a situação do anúncio; não repita o envio antes da releitura.',
  listing_resume_unconfirmed:'Reativação ainda não confirmada pelo marketplace. Confira a situação do anúncio.',
  listing_close_unconfirmed:'Encerramento ainda não confirmado pelo marketplace. Confira a situação do anúncio.',
  listing_delete_unconfirmed:'Exclusão ainda não confirmada pelo marketplace. Confira a situação do anúncio.',
  listing_edit_unconfirmed:'Alteração de dados ainda não confirmada pelo marketplace. Confira os valores no anúncio.',
  import_identity_ambiguous:'Mais de um cadastro possível ou identificação insuficiente. Vincule o produto correto; nenhum duplicado foi criado.',
  import_identity_conflict:'EAN, SKU ou condição divergente. Confira a identidade do produto antes de vincular o anúncio.',
  import_variations_review:'Anúncio com variações: confira o cadastro de cada variação antes de vincular ou movimentar estoque.',
  stock_divergence:'O saldo Online e a quantidade de um anúncio estão diferentes. Confira e escolha a direção da sincronização.',
  local_stock_unset:'Saldo Online ainda não informado. Confira o estoque físico ou importe uma única origem, sem somar as contas.',
  pause_unconfirmed:'Pausa pendente. O Mercado Livre ainda não confirmou que o anúncio está pausado.',
  paused_listing_review:'Anúncio pausado. Confira a pausa no Mercado Livre antes de reativar; o sistema não desfaz pausas manuais.',
  magalu_stock_processing:'Magalu aceitou a atualização de estoque. Aguardando a quantidade ser confirmada por uma nova consulta.',
  magalu_pause_processing:'Magalu aceitou a pausa. Aguardando confirmar que o SKU está inativo e com saldo zero.',
  magalu_stock_origin:'Saldo do Magalu não confirmado ou Multi-Origem. Confira canal, depósito e permissões antes de sincronizar.',
  magalu_listing_blocked:'SKU Magalu em moderação, bloqueado ou fora do estado elegível. Confira o anúncio.',
  pause_stock_unconfirmed:'Pausa e saldo zero ainda não foram confirmados juntos. A tentativa será repetida, sem reativar o anúncio.',
  paused_quantity_unconfirmed:'Anúncio protegido por pausa confirmada, mas a quantidade zero não pôde ser confirmada neste modelo de estoque. Mantenha-o pausado até concluir a conferência.',
  queued: 'Atualização de estoque na fila; aguardando a próxima tentativa automática.',
  pending_sales: 'A última tentativa aguardou conferência de vendas. A próxima tentativa verificará novamente o bloqueio.',
  pending_product_sales: 'Atualização de estoque aguarda uma venda deste mesmo produto ser conferida.',
  pending_unidentified_sales: 'A conta tem notificação de pedido/envio ainda sem produtos identificados. Aumento de estoque aguarda essa leitura para evitar reposição indevida.',
  remote_stock_unconfirmed: 'O Mercado Livre ainda não confirmou a quantidade enviada. O saldo será relido antes de repetir o envio.',
  baseline_reconciliation: 'O saldo físico já foi confirmado. A venda anterior aguarda conciliação automática, sem nova baixa desse saldo.',
  sale_reconciliation: 'Saldo informado; a venda deste produto aguarda processamento para conferir a baixa.',
  stock_changed: 'O saldo local mudou durante a conferência. A próxima tentativa usará a revisão atual.',
  worker_time_limit: 'A rodada automática terminou antes do envio. A atualização continuará na próxima tentativa.',
  inventory_database: 'Não foi possível conferir ou registrar o estoque no banco. Aguarde e atualize os avisos.',
  processing: 'A tentativa anterior não foi concluída. A causa específica não foi identificada; atualize os avisos ou solicite suporte se persistir.',
  invalid_listing: 'O anúncio não pôde ser confirmado na conta vinculada. Confira o vínculo e a conexão.',
  invalid_seller: 'A identidade da conta vendedora não pôde ser confirmada.',
  expired: 'A autorização da conta expirou. Renove a conexão para continuar.',
  incomplete_listing: 'O retorno do anúncio está incompleto; nenhuma quantidade foi enviada.',
  reconnect: 'A autorização da conta precisa ser renovada. Reconecte a conta indicada.',
  provider_unavailable: 'Não foi possível consultar o Mercado Livre nesta tentativa. A atualização será tentada novamente.',
  mutation_uncertain: 'A resposta do envio de estoque não chegou. O anúncio será relido antes de repetir a alteração.',
  database: 'Não foi possível ler ou registrar os dados no banco nesta tentativa.',
  refresh_busy: 'A autorização da conta está sendo renovada. Aguarde a próxima tentativa.',
  provider_policy_403: 'A política de acesso do Mercado Livre recusou a consulta. Confira as permissões desta conta.',
  provider_rejected: 'O Mercado Livre recusou a operação deste anúncio. Confira os dados e as restrições da conta indicada.',
  invalid_response: 'A consulta ao Mercado Livre retornou dados incompletos. Aguarde uma nova leitura.',
  sales_history_setup: 'A recuperação das vendas anteriores precisa ser ativada no banco pelo administrador do sistema.',
  product_not_linked: 'Há venda sem produto local vinculado. Vincule o anúncio em Produtos e estoque.',
  stock_not_confirmed: 'Há produto vendido sem estoque inicial confirmado. Confira o saldo local.',
  variation_not_linked: 'Há venda com variação ainda sem estoque próprio vinculado.',
  insufficient_stock: 'Uma venda ultrapassou o saldo local. Confira o estoque físico antes do envio.',
  cancelled_requires_manual_return: 'Pedido cancelado após etiqueta, despacho ou outro avanço logístico. Não houve retorno automático ao estoque; faça a entrada manual somente após avaliar a unidade física.',
  cancelled_stock_review: 'Pedido cancelado, mas o cadastro local não permite liberar o saldo automaticamente. Confira a unidade física antes de qualquer entrada.',
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
export const inventoryIssueMessage = (code: string) => messages[code] || 'A operação não foi concluída e o motivo ainda não possui uma descrição específica. Atualize os avisos; se persistir, solicite suporte.';
export const providerName = (provider: string) => ({ mercado_livre: 'Mercado Livre', shopee: 'Shopee', amazon: 'Amazon', magalu: 'Magalu', tiktok_shop: 'TikTok Shop', casas_bahia: 'Casas Bahia' })[provider] || 'Marketplace';
