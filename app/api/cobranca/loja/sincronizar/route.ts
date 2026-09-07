import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import {
  consultarAssinanteRevenueCat,
  lojaDaRevenueCat,
  salvarEstadoRevenueCat,
  type LojaAssinaturaNativa,
} from '../../../../lib/revenuecat-servidor';

export const runtime = 'nodejs';

function lojaValida(valor: unknown): valor is LojaAssinaturaNativa {
  return valor === 'apple_app_store' || valor === 'google_play';
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const loja = corpo.loja;
  if (!empresaId || !lojaValida(loja)) {
    return NextResponse.json({ erro: true, mensagem: 'Dados de assinatura inválidos.' }, { status: 400 });
  }

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
    await salvarEstadoRevenueCat(acesso.db, acesso.usuario.id, estado, lojaDaRevenueCat(estado.ambiente, loja));
    return NextResponse.json({ ok: true, estado });
  } catch (erro) {
    console.error('Falha ao sincronizar assinatura de loja:', erro);
    return NextResponse.json(
      { erro: true, mensagem: 'Não foi possível validar a assinatura na loja.' },
      { status: 503 },
    );
  }
}
