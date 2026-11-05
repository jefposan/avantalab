import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '@/app/lib/cobranca-servidor';
import { planoPermiteCentrosDeCusto } from '@/app/lib/limites-comerciais-servidor';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const ativo = corpo.ativo;
  if (!empresaId || typeof ativo !== 'boolean') {
    return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  }

  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) {
    return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  }

  if (ativo && !planoPermiteCentrosDeCusto(await resolverEstadoAcesso(empresaId))) {
    return NextResponse.json({
      erro: true,
      mensagem: 'Centros de custo estão disponíveis a partir do Business Pro.',
    }, { status: 409 });
  }

  // Os triggers/RPCs usam auth.uid(). A service role serve à validação acima,
  // mas a alteração precisa preservar o usuário e suas políticas RLS.
  const dbUsuario = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: request.headers.get('authorization')! } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { data: configuracao, error } = await dbUsuario
    .from('configuracoes')
    .upsert({ empresa_id: empresaId, centros_custo_ativo: ativo }, { onConflict: 'empresa_id' })
    .select('centros_custo_ativo')
    .single();
  if (error) {
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar a configuração de Centros de custo.' }, { status: 500 });
  }

  let centroPrincipalId: string | null = null;
  if (ativo) {
    const { data, error: erroPrincipal } = await dbUsuario.rpc('garantir_centro_custo_principal', {
      p_empresa_id: empresaId,
    });
    if (erroPrincipal || !data) {
      await dbUsuario.from('configuracoes').update({ centros_custo_ativo: false }).eq('empresa_id', empresaId);
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível preparar o centro Principal.' }, { status: 500 });
    }
    centroPrincipalId = String(data);
  }

  return NextResponse.json({
    erro: false,
    configuracao,
    centroPrincipalId,
  });
}
