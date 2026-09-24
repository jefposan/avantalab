import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId')?.trim() || '';
  if (!empresaId) return NextResponse.json({ ok: false, mensagem: 'Selecione o perfil empresarial.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return NextResponse.json({ ok: false, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  const { data: instalacao } = await acesso.db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'custos').maybeSingle();
  if (!instalacao?.ativo || (instalacao.expira_em && instalacao.expira_em <= new Date().toISOString())) {
    return NextResponse.json({ ok: false, mensagem: 'Custos e Precificação não está ativo neste perfil.' }, { status: 403 });
  }

  const { data: fornecedores, error } = await acesso.db
    .from('vendas_fornecedores')
    .select('id,codigo,razao_social,situacao')
    .eq('empresa_id', empresaId)
    .eq('situacao', 'ativo')
    .order('razao_social');
  if (error) return NextResponse.json({ ok: false, mensagem: 'Não foi possível carregar os fornecedores.' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    fornecedores: (fornecedores || []).map((fornecedor) => ({
      id: String(fornecedor.id),
      codigo: String(fornecedor.codigo || ''),
      nome: String(fornecedor.razao_social || ''),
    })),
  }, { headers: { 'Cache-Control': 'no-store, private' } });
}
