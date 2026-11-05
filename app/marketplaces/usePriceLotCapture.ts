'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PriceLotDetail } from '@/app/modules/marketplaces/price-lots';
export type LotRead = { companyId: string; lotId: string; itemId: string };
export type LotsRequest = (path: string, options?: RequestInit) => Promise<unknown>;
export const lotsPath = '/api/modulos/marketplaces/precos/lotes';

export default function usePriceLotCapture(companyId: string, request: LotsRequest) {
  const [active, setActive] = useState<PriceLotDetail | null>(null);
  const uncertain = useRef<{ read: LotRead; code: string } | null>(null);
  const context = useRef(companyId);
  useEffect(() => { context.current = companyId; uncertain.current = null; const frame = requestAnimationFrame(() => setActive(null)); return () => cancelAnimationFrame(frame); }, [companyId]);
  const activate = useCallback((detail: PriceLotDetail | null) => setActive(detail?.lot.empresa_id === context.current ? detail : null), []);
  const capture = useCallback(async (code: string): Promise<LotRead | null> => {
    if (!active || active.lot.empresa_id !== companyId) return null;
    if (uncertain.current && (uncertain.current.read.lotId !== active.lot.id || uncertain.current.code !== code)) throw new Error('A última leitura não teve confirmação de salvamento. Repita primeiro o mesmo código no mesmo lote para confirmá-la, sem duplicar.');
    const read = uncertain.current?.read || { companyId, lotId: active.lot.id, itemId: crypto.randomUUID() };
    uncertain.current = { read, code };
    // Não seguir silenciosamente quando não é possível salvar a leitura.
    const detail = await request(lotsPath, { method: 'PATCH', body: JSON.stringify({ empresaId: companyId, id: read.lotId, action: 'capture', itemId: read.itemId, scannedCode: code }) }) as PriceLotDetail;
    uncertain.current = null;
    if (context.current === companyId) setActive(current => current?.lot.id === read.lotId ? detail : current);
    return read;
  }, [active, companyId, request]);
  const resolve = useCallback(async (read: LotRead | null, historyId?: string) => {
    if (!read || !historyId) return;
    const detail = await request(lotsPath, { method: 'PATCH', body: JSON.stringify({ empresaId: read.companyId, id: read.lotId, action: 'resolve', itemId: read.itemId, historyId }) }) as PriceLotDetail;
    if (context.current === read.companyId) setActive(current => current?.lot.id === read.lotId ? detail : current);
  }, [request]);
  return { active: active?.lot.empresa_id === companyId ? active : null, activate, capture, resolve };
}
