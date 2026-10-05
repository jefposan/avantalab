import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import { preparePublicationInput } from '@/app/modules/marketplaces/services/publication-intake';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const empresaId = typeof body?.empresaId === 'string' ? body.empresaId.trim() : '';
  const provider = body?.provider === 'mercado_livre' ? 'mercado_livre' : '';
  if (!empresaId || !provider) return NextResponse.json({ error: true, message: 'Empresa ou marketplace inválido.' }, { status: 400 });

  const access = await autenticarPerfilCobranca(request, empresaId);
  if (!access) return NextResponse.json({ error: true, message: 'Sua sessão não tem acesso a esta empresa.' }, { status: 403 });
  if (!['gestor_master', 'administrador', 'operador_completo'].includes(access.vinculo.perfil || '')) {
    return NextResponse.json({ error: true, message: 'Seu perfil pode consultar o módulo, mas não preparar anúncios.' }, { status: 403 });
  }

  const { data: installation } = await access.db.from('empresa_modulos')
    .select('ativo, expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'marketplaces').maybeSingle();
  const active = installation?.ativo === true && (!installation.expira_em || installation.expira_em > new Date().toISOString());
  if (!active) return NextResponse.json({ error: true, message: 'O módulo Anúncios em marketplaces não está instalado nesta empresa.' }, { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRole) return NextResponse.json({ error: true, message: 'A publicação ainda não está configurada no servidor.' }, { status: 503 });
  const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: connection } = await db.from('marketplace_connections')
    .select('id, status').eq('empresa_id', empresaId).eq('provider', provider).eq('status', 'connected').eq('id', typeof body.connectionId === 'string' ? body.connectionId : '00000000-0000-0000-0000-000000000000').maybeSingle();

  const result = preparePublicationInput({ ean: body?.ean, price: body?.price, connectionId: connection?.id });
  return NextResponse.json({ error: false, result });
}
