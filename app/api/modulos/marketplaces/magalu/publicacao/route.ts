import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { continueMagaluPublication, createMagaluPublication, latestMagaluPublication } from '@/app/modules/marketplaces/services/magalu-publication';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    return NextResponse.json({ publication: await latestMagaluPublication(db, empresaId, params.get('connectionId')) }, { headers });
  } catch (error) { return managementFailure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const publication = body.action === 'create'
      ? await createMagaluPublication(db, empresaId, body.connectionId, usuario.id, body.requestKey, body.form)
      : body.action === 'advance'
        ? await continueMagaluPublication(db, empresaId, body.connectionId, body.requestKey)
        : null;
    if (!publication) return NextResponse.json({ message: 'Ação de publicação inválida.', code: 'invalid_action' }, { status: 400, headers });
    return NextResponse.json({ publication }, { headers });
  } catch (error) { return managementFailure(error); }
}
