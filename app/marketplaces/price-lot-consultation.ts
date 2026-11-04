import type { PriceConsultationResult } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';
import { isValidEan, normalizeEan } from '@/app/modules/marketplaces/services/ean';
import type { LotsRequest } from './usePriceLotCapture';

export type LotPriceResult = { historyId?: string; localProductId?: string; revision?: number; name: string; prices?: { market: number; minimum: number; medium: number; ideal: number }; result?: PriceConsultationResult };
export async function consultLotPrice({ companyId, code, productId, request, signal, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), now = Date.now }: {
  companyId: string; code: string; productId?: string; request: LotsRequest; signal: AbortSignal; pause?: (ms: number) => Promise<void>; now?: () => number;
}): Promise<LotPriceResult> {
  const ean = normalizeEan(code);
  const byEan = isValidEan(ean) && ean === code;
  if (!byEan && code.trim().length < 3) throw new Error('Informe um EAN válido ou uma descrição com pelo menos três caracteres.');
  signal.throwIfAborted();
  if (byEan && !productId) {
    const cached = await request('/api/modulos/marketplaces/precos/produto', { method: 'POST', signal, body: JSON.stringify({ empresaId: companyId, ean }) }) as { result?: PriceConsultationResult | null };
    signal.throwIfAborted();
    const row = cached.result;
    if (row) return { historyId: row.historyId, localProductId: row.localProductId, revision: row.localProductRevision, name: row.product?.name || '', prices: row.prices, result: row };
  }
  const deadline = now() + 180_000;
  let continuation: unknown = null;
  while (now() < deadline) {
    signal.throwIfAborted();
    const body = await request('/api/modulos/marketplaces/precos', { method: 'POST', signal, body: JSON.stringify(continuation ? { continuation } : { empresaId: companyId, ...(byEan ? { ean } : { query: code.trim() }), ...(productId ? { productId } : {}) }) }) as { result: PriceConsultationResult; continuation?: unknown };
    signal.throwIfAborted();
    if (body.result.status !== 'found' || !body.continuation) return { result: body.result, historyId: body.result.historyId, localProductId: body.result.localProductId, revision: body.result.localProductRevision, name: body.result.product?.name || '', prices: body.result.prices };
    continuation = body.continuation;
    await pause(2000);
  }
  throw new Error('A pesquisa ainda não terminou. A leitura permanece salva sem preço; tente consultá-la novamente no lote.');
}
