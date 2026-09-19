import { NextResponse } from 'next/server';
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

  const { data: configuracao, error } = await acesso.db
    .from('configuracoes')
    .upsert({ empresa_id: empresaId, centros_custo_ativo: ativo }, { onConflict: 'empresa_id' })
    .select('centros_custo_ativo')
    .single();
  if (error) {
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível salvar a configuração de Centros de custo.' }, { status: 500 });
  }

  let centroPrincipalId: string | null = null;
  if (ativo) {
    const { data, error: erroPrincipal } = await acesso.db.rpc('garantir_centro_custo_principal', {
      p_empresa_id: empresaId,
    });
    if (erroPrincipal || !data) {
      await acesso.db.from('configuracoes').update({ centros_custo_ativo: false }).eq('empresa_id', empresaId);
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
