import { NextResponse } from 'next/server';
import { autenticarCarteira, CABECALHOS_PRIVADOS } from '@/app/lib/carteira-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId') || '';
  const contexto = await autenticarCarteira(request, empresaId);
  if (!contexto) return NextResponse.json({ success: false, message: 'Sessão ou perfil inválido.' }, { status: 401, headers: CABECALHOS_PRIVADOS });
  const { db } = contexto;
  const [{ data: carteira }, { data: movimentos }, { data: recargas }] = await Promise.all([
    db.from('carteiras').select('saldo_centavos,atualizado_em').eq('empresa_id', empresaId).maybeSingle(),
    db.from('carteira_movimentacoes').select('id,tipo,valor_centavos,saldo_apos_centavos,servico_codigo,descricao,criado_em').eq('empresa_id', empresaId).order('criado_em', { ascending: false }).limit(30),
    db.from('carteira_recargas').select('id,valor_centavos,status,forma_pagamento,invoice_url,vencimento,criado_em').eq('empresa_id', empresaId).order('criado_em', { ascending: false }).limit(10),
  ]);
  return NextResponse.json({ success: true, data: { saldoCentavos: carteira?.saldo_centavos || 0, movimentos: movimentos || [], recargas: recargas || [], podeGerenciar: contexto.podeGerenciar } }, { headers: CABECALHOS_PRIVADOS });
}
