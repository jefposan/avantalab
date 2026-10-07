import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { calculatePriceSuggestions } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';

export const runtime = 'nodejs';

function toCents(value: unknown) {
  if (typeof value === 'string') value = value.trim().replace(/\./g, '').replace(',', '.');
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return null;
  return Math.round(amount * 100);
}

function historyFields() {
  return 'id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,currency,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,source_offers,created_at,updated_at,last_researched_at,manually_updated_at';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId');
    const { db } = await authorizePriceConsultation(request, empresaId);
    const ean = url.searchParams.get('ean')?.replace(/\D/g, '') || '';
    const catalog = url.searchParams.get('view') === 'catalog';
    const sort = url.searchParams.get('sort') === 'date' ? 'date' : 'alpha';
    let query = db.from('marketplace_price_consultations').select(historyFields()).eq('empresa_id', empresaId);
    if (ean) query = query.eq('ean', ean);
    query = !catalog && !ean
      ? query.order('last_researched_at', { ascending: false }).order('created_at', { ascending: false })
      : sort === 'date'
      ? query.order('last_researched_at', { ascending: false }).order('created_at', { ascending: false })
      : query.order('product_name', { ascending: true }).order('created_at', { ascending: false });
    const { data, error } = await query.limit(ean ? 1 : catalog ? 1_000 : 20);
    if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível carregar as últimas consultas.');
    return NextResponse.json({ history: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizePriceConsultation(request, body.empresaId);
    const ean = typeof body.ean === 'string' ? body.ean.replace(/\D/g, '') : null;
    const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 180) : '';
    const description = typeof body.productDescription === 'string' ? body.productDescription.trim().slice(0, 2_000) : null;
    const referenceCents = toCents(body.marketPrice);
    if (ean && !/^\d{8,14}$/.test(ean)) throw new MarketplaceError(400, 'invalid_ean', 'Informe um EAN válido para registrar este cálculo.');
    if (!productName) throw new MarketplaceError(400, 'manual_product_name_required', 'Informe o nome do produto para criar o cálculo manual.');
    if (referenceCents == null) throw new MarketplaceError(400, 'invalid_manual_price', 'Informe um preço médio válido, com até duas casas decimais.');
    const prices = calculatePriceSuggestions([referenceCents]);
    const now = new Date().toISOString();
    const { data, error } = await db.from('marketplace_price_consultations').insert({
      empresa_id: empresaId,
      created_by: usuario.id,
      input_type: ean ? 'ean' : 'text',
      input_value: ean || productName,
      ean,
      provider_product_id: `MANUAL:${crypto.randomUUID()}`,
      product_name: productName,
      product_description: description || null,
      currency: 'BRL',
      market_price_cents: referenceCents,
      minimum_price_cents: Math.round(prices.minimum * 100),
      medium_price_cents: Math.round(prices.medium * 100),
      ideal_price_cents: Math.round(prices.ideal * 100),
      sample_count: 1,
      sample_min_cents: referenceCents,
      sample_max_cents: referenceCents,
      sample_source: 'manual_reference',
      source_offers: [],
      created_at: now,
      updated_at: now,
      last_researched_at: now,
      manually_updated_at: now,
    }).select(historyFields()).single();
    if (error || !data) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível salvar o cálculo manual. Tente novamente.');
    return NextResponse.json({ history: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizePriceConsultation(request, body.empresaId);
    const historyId = typeof body.historyId === 'string' ? body.historyId : '';
    const referenceCents = toCents(body.marketPrice);
    if (!historyId) throw new MarketplaceError(400, 'history_required', 'Selecione uma consulta do histórico para atualizar.');
    if (referenceCents == null) throw new MarketplaceError(400, 'invalid_manual_price', 'Informe um preço médio válido, com até duas casas decimais.');
    const prices = calculatePriceSuggestions([referenceCents]);
    const now = new Date().toISOString();
    const { data, error } = await db.from('marketplace_price_consultations').update({
      market_price_cents: referenceCents,
      minimum_price_cents: Math.round(prices.minimum * 100),
      medium_price_cents: Math.round(prices.medium * 100),
      ideal_price_cents: Math.round(prices.ideal * 100),
      sample_count: 1,
      sample_min_cents: referenceCents,
      sample_max_cents: referenceCents,
      sample_source: 'manual_reference',
      source_offers: [],
      updated_at: now,
      manually_updated_at: now,
    }).eq('id', historyId).eq('empresa_id', empresaId).select(historyFields()).maybeSingle();
    if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível atualizar o cálculo. Tente novamente.');
    if (!data) throw new MarketplaceError(404, 'history_not_found', 'Esta consulta não está disponível para esta empresa.');
    return NextResponse.json({ history: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
