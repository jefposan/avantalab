import { NextResponse } from 'next/server';
import { managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { listPriceCompanies } from '@/app/modules/marketplaces/services/price-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    return NextResponse.json({ companies: await listPriceCompanies(request) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
