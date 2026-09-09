import { NextResponse } from 'next/server';
import { getVoiceSalesContext, isVoiceCommandEnabled } from '@/app/lib/vendas-voice/auth';
import { listVoiceCatalogProducts } from '@/app/lib/vendas-voice/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = String(body?.accountId || '').trim();
    const context = await getVoiceSalesContext(request, accountId);
    if (!context) return NextResponse.json({ message: 'Sua sessão do Avanta Vendas expirou.' }, { status: 401 });
    if (!await isVoiceCommandEnabled(context)) return NextResponse.json({ message: 'Ative a Solicitação por Voz nas Configurações do Avanta Vendas.' }, { status: 403 });
    const query = String(body?.query || '').trim().slice(0, 120);
    const offset = Math.max(0, Math.min(5000, Number(body?.offset) || 0));
    const result = await listVoiceCatalogProducts(context.db, context.contaId, query, offset, 40);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível abrir o catálogo de produtos.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
