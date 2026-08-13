import { NextResponse } from 'next/server';
import { obterContextoContaVendas, podeGerirBackup } from '../_lib/contexto-conta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function GET(request: Request) {
  const contaId = new URL(request.url).searchParams.get('contaId') || '';
  const contexto = await obterContextoContaVendas(request, contaId);
  if (!contexto || !podeGerirBackup(contexto.papel)) {
    return erro('Acesso permitido somente ao proprietário ou administrador desta conta.', 403);
  }
  const { data, error } = await contexto.admin
    .from('vendas_mobile_pontos_restauracao')
    .select('id,nome,origem,schema_versao,tamanho_bytes,criado_por,criado_em')
    .eq('conta_id', contaId)
    .order('criado_em', { ascending: false });
  if (error) return erro(error.message, 500);
  return NextResponse.json({ pontos: data || [], papel: contexto.papel });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const contaId = String(corpo.contaId || '');
  const contexto = await obterContextoContaVendas(request, contaId);
  if (!contexto || !podeGerirBackup(contexto.papel)) {
    return erro('Acesso permitido somente ao proprietário ou administrador desta conta.', 403);
  }

  if (corpo.acao === 'criar') {
    const { data, error } = await contexto.admin.rpc('criar_ponto_restauracao_vendas_mobile', {
      p_conta_id: contaId,
      p_origem: 'manual',
      p_criado_por: contexto.userId,
      p_nome: String(corpo.nome || ''),
    });
    if (error) return erro(error.message, 500);
    return NextResponse.json({ ok: true, id: data });
  }

  if (corpo.acao === 'restaurar') {
    if (contexto.papel !== 'proprietario') return erro('Somente o proprietário pode restaurar esta conta.', 403);
    if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'RESTAURAR') {
      return erro('Digite RESTAURAR para confirmar.', 400);
    }
    const { data, error } = await contexto.admin.rpc('restaurar_ponto_restauracao_vendas_mobile', {
      p_conta_id: contaId,
      p_ponto_id: String(corpo.pontoId || ''),
      p_criado_por: contexto.userId,
    });
    if (error) return erro(error.message, 500);
    return NextResponse.json({ ok: true, pontoSegurancaId: data });
  }

  return erro('Ação inválida.', 400);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const contaId = url.searchParams.get('contaId') || '';
  const pontoId = url.searchParams.get('pontoId') || '';
  const contexto = await obterContextoContaVendas(request, contaId);
  if (!contexto) return erro('Conta de vendas não encontrada ou sem acesso.', 403);
  if (contexto.papel !== 'proprietario') return erro('Somente o proprietário pode excluir um ponto.', 403);
  const { error } = await contexto.admin
    .from('vendas_mobile_pontos_restauracao')
    .delete()
    .eq('id', pontoId)
    .eq('conta_id', contaId);
  if (error) return erro(error.message, 500);
  return NextResponse.json({ ok: true });
}
