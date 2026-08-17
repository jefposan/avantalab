import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import {
  consultarAssinanteRevenueCat,
  salvarEstadoRevenueCat,
} from '../../../../lib/revenuecat-servidor';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  if (!empresaId) {
    return NextResponse.json({ erro: true, mensagem: 'Perfil inválido.' }, { status: 400 });
  }

  // A compra pertence ao login da App Store/RevenueCat. Qualquer usuário com
  // vínculo ativo pode sincronizar a própria compra; a operação nunca altera a
  // assinatura de outro usuário nem exige papel administrativo no perfil.
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) {
    return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  }

  const { data: perfil } = await acesso.db
    .from('empresas')
    .select('tipo_perfil')
    .eq('id', empresaId)
    .maybeSingle();
  if (perfil?.tipo_perfil !== 'pessoal') {
    return NextResponse.json(
      { erro: true, mensagem: 'Compras no aplicativo estão disponíveis somente para o perfil pessoal.' },
      { status: 409 },
    );
  }

  try {
    const estado = await consultarAssinanteRevenueCat(acesso.usuario.id);
    await salvarEstadoRevenueCat(acesso.db, acesso.usuario.id, estado);
    return NextResponse.json({ ok: true, estado });
  } catch (erro) {
    console.error('Falha ao sincronizar assinatura Apple:', erro);
    return NextResponse.json(
      { erro: true, mensagem: 'Não foi possível validar a assinatura com a App Store.' },
      { status: 503 },
    );
  }
}
