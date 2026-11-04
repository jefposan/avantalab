import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { readPriceSettings, savePriceSettings } from '@/app/modules/marketplaces/services/price-settings';
import {postPrimaryColor} from '@/app/modules/marketplaces/product-post';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const { db, empresaId } = await authorizePriceConsultation(request, new URL(request.url).searchParams.get('empresaId'));
    const settings = await readPriceSettings(db, empresaId);
    const { data: profile, error } = await db.from('configuracoes').select('dark_mode,cor_primaria').eq('empresa_id', empresaId).maybeSingle();
    if (error) throw new MarketplaceError(503, 'price_theme_unavailable', 'Não foi possível carregar a aparência do perfil. Tente novamente.');
    return NextResponse.json({ settings: { ...settings, profileDark: profile?.dark_mode === true,profileColor:postPrimaryColor(profile?.cor_primaria) } }, { headers });
  } catch (error) { return managementFailure(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    return NextResponse.json({ settings: await savePriceSettings(db, empresaId, usuario.id, body) }, { headers });
  } catch (error) { return managementFailure(error); }
}
