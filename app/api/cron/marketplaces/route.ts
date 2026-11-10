import { after, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processPendingRevenueFinancial } from '@/app/modules/marketplaces/services/sales-financial';
import { runMarketplaceWorker } from '@/app/modules/marketplaces/services/inventory-worker';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!/^[0-9a-f-]{72}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorized = await db.rpc('marketplace_worker_authorized', { p_token: token });
  if (authorized.error) return NextResponse.json({ ok: false }, { status: 503 });
  if (!authorized.data) return NextResponse.json({ ok: false }, { status: 401 });
  after(async () => { try { await runMarketplaceWorker(db); } catch { console.error('marketplace_worker_failed'); } });
  after(async () => { try { const {resumeCatalogCompletion}=await import('@/app/modules/marketplaces/services/catalog-completion');await resumeCatalogCompletion(db); } catch { console.error('marketplace_catalog_completion_pending'); } });
  after(async () => {
    try {
      const { error } = await db.rpc('marketplace_processar_receitas').abortSignal(AbortSignal.timeout(12_000));
      if (error && error.code !== 'PGRST202') console.error('marketplace_revenue_pending', error.code);
    } catch { console.error('marketplace_revenue_pending'); }
  });
  after(async () => {
    try { await processPendingRevenueFinancial(db); }
    catch { console.error('marketplace_financial_pending'); }
  });
  return NextResponse.json({ accepted: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
