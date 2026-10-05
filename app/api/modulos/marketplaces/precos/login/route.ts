import { NextResponse } from 'next/server';
import { priceAdminClient } from '@/app/modules/marketplaces/services/price-access';

export const runtime = 'nodejs';

function normalizeLogin(value: unknown) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
}

export async function POST(request: Request) {
  try {
    const login = normalizeLogin((await request.json().catch(() => ({}))).login);
    if (login.length < 3) return NextResponse.json({ message: 'Informe seu login.' }, { status: 400 });
    const db = priceAdminClient();
    const { data, error } = await db.from('marketplace_price_users').select('email,empresa_id').eq('login', login).eq('ativo', true).maybeSingle();
    if (error) return NextResponse.json({ message: 'Não foi possível validar o acesso agora.' }, { status: 503 });
    if (!data?.email) return NextResponse.json({ message: 'Login ou senha inválidos.' }, { status: 404 });
    const { data: module } = await db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', data.empresa_id).eq('modulo_id', 'marketplaces').maybeSingle();
    if (!module?.ativo || (module.expira_em && new Date(module.expira_em).getTime() <= Date.now())) return NextResponse.json({ message: 'O AvantaPreços está indisponível para esta empresa.' }, { status: 403 });
    return NextResponse.json({ email: data.email }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Não foi possível validar o acesso agora.' }, { status: 503 });
  }
}
