import { createClient } from '@supabase/supabase-js';
import { after, NextResponse } from 'next/server';
import { enrichCatalogVoiceIndex } from '@/app/lib/vendas-voice/catalog-index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!url || !anon || !service || !token) {
      return NextResponse.json({ message: 'A indexação de voz ainda não está configurada.' }, { status: 503 });
    }
    const body = await request.json().catch(() => null);
    const companyId = String(body?.companyId || '').trim();
    const productId = String(body?.productId || '').trim();
    if (!UUID.test(companyId) || (productId && !UUID.test(productId))) {
      return NextResponse.json({ message: 'Produto ou empresa inválidos.' }, { status: 400 });
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authentication, error: authenticationError } = await userClient.auth.getUser(token);
    if (authenticationError || !authentication.user) {
      return NextResponse.json({ message: 'Sua sessão expirou.' }, { status: 401 });
    }
    const { data: allowed, error: permissionError } = await userClient.rpc('vendas_mobile_pode_publicar_conteudo', {
      p_empresa_id: companyId,
    });
    if (permissionError || allowed !== true) {
      return NextResponse.json({ message: 'Você não tem permissão para atualizar este catálogo.' }, { status: 403 });
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    if (productId) {
      const { data: product, error: productError } = await admin.from('vendas_mobile_catalogo_produtos')
        .select('id,catalogo:vendas_mobile_catalogos!inner(empresa_id)')
        .eq('id', productId)
        .maybeSingle();
      const productCompanyId = String((product?.catalogo as unknown as { empresa_id?: string } | null)?.empresa_id || '');
      if (productError || !product || productCompanyId !== companyId) {
        return NextResponse.json({ message: 'Produto não localizado neste catálogo.' }, { status: 404 });
      }
    }

    after(async () => {
      try {
        await enrichCatalogVoiceIndex({
          admin,
          companyId,
          productIds: productId ? [productId] : undefined,
          limit: productId ? 1 : 24,
        });
      } catch (error) {
        console.error('[voice-catalog-index] Falha assíncrona:', error instanceof Error ? error.message : error);
      }
    });

    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { 'Cache-Control': 'no-store, private' } },
    );
  } catch {
    return NextResponse.json({ message: 'Não foi possível agendar a indexação de voz.' }, { status: 500 });
  }
}
