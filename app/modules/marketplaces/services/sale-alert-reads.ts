import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';

/** Fecha os avisos já existentes desta empresa somente para o usuário autenticado.
 * Pagina no servidor, incluindo os avisos além dos vinte exibidos pelo feed.
 * Novas vendas após o início da operação continuam sem leitura.
 */
export async function acknowledgeAllSaleAlerts(db: SupabaseClient, company: string, user: string) {
  const before = new Date().toISOString();
  const pageSize = 200;
  let after: string | null = null;
  for (;;) {
    let query = db.from('marketplace_sale_alerts').select('id').eq('empresa_id', company)
      .lte('created_at', before).order('id', { ascending: true }).limit(pageSize);
    if (after) query = query.gt('id', after);
    const page = await query;
    if (page.error || !page.data) throw new MarketplaceError(503, 'database', 'Não foi possível consultar todos os avisos. Tente novamente.');
    if (!page.data.length) break;
    const saved = await db.from('marketplace_sale_alert_reads').upsert(
      page.data.map(row => ({ empresa_id: company, alert_id: row.id, user_id: user })),
      { onConflict: 'alert_id,user_id', ignoreDuplicates: true },
    );
    if (saved.error) throw new MarketplaceError(503, 'database', 'Não foi possível fechar todos os avisos. Tente novamente.');
    if (page.data.length < pageSize) break;
    after = page.data[page.data.length - 1].id;
  }
  return { ok: true, acknowledgedBefore: before };
}
