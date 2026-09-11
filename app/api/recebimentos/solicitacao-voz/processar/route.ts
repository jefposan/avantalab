import { NextResponse } from 'next/server';
import { contextoVozCampo } from '../_auth';
import { interpretarVozCampo } from '@/app/recebimentos/voice/interpreter';
import { validarRascunhoVozCampo } from '@/app/recebimentos/voice/schema';
import type { ModoVozCampo } from '@/app/recebimentos/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const empresaId = String(body.empresaId || '').trim();
    const mode = String(body.mode || '') as ModoVozCampo;
    const context = await contextoVozCampo(request, empresaId, mode);
    if (!context) return NextResponse.json({ message: 'Sua sessão expirou ou não possui permissão para esta operação.' }, { status: 403 });
    const transcription = String(body.transcription || '').trim().slice(0, 1000);
    if (!transcription) return NextResponse.json({ message: 'Fale sua solicitação para continuar.' }, { status: 400 });
    const previousDraft = body.previousDraft ? validarRascunhoVozCampo(body.previousDraft) : null;
    const result = await interpretarVozCampo({ transcription, mode, previousDraft });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
