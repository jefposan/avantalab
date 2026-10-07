import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Compatibilidade com versões antigas: esta rota não concede acesso e não
// modifica sessões. A política vigente usa /api/cobranca/sessoes, por perfil.
// Nunca voltar a revogar refresh tokens globais por causa de um plano.
export async function POST() {
  return NextResponse.json({ ok: true, ignorado: true });
}
