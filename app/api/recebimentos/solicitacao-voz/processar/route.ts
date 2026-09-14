import { NextResponse } from 'next/server';
import { contextoVozCampo } from '../_auth';
import { interpretarVozCampo } from '@/app/recebimentos/voice/interpreter';
import { validarRascunhoVozCampo } from '@/app/recebimentos/voice/schema';
import type { ModoVozCampo } from '@/app/recebimentos/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestStartedAt = performance.now();
  try {
    const body = await request.json().catch(() => ({}));
    const empresaId = String(body.empresaId || '').trim();
    const mode = String(body.mode || '') as ModoVozCampo;
    const authStartedAt = performance.now();
    const context = await contextoVozCampo(request, empresaId, mode);
    if (!context) return NextResponse.json({ message: 'Sua sessão expirou ou não possui permissão para esta operação.' }, { status: 403 });
    const authMs = Math.round(performance.now() - authStartedAt);
    const transcription = String(body.transcription || '').trim().slice(0, 1000);
    if (!transcription) return NextResponse.json({ message: 'Fale sua solicitação para continuar.' }, { status: 400 });
    const previousDraft = body.previousDraft ? validarRascunhoVozCampo(body.previousDraft) : null;
    const result = await interpretarVozCampo({ transcription, mode, previousDraft });
    const totalMs = Math.round(performance.now() - requestStartedAt);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, private',
        'Server-Timing': `auth;dur=${authMs}, interpret;dur=${result.metrics.interpretationMs}, total;dur=${totalMs}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível entender sua solicitação.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
