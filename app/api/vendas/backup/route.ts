import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { obterContextoContaVendas, podeGerirBackup } from '../_lib/contexto-conta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

function checksum(snapshot: unknown) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export async function GET(request: Request) {
  const contaId = new URL(request.url).searchParams.get('contaId') || '';
  const contexto = await obterContextoContaVendas(request, contaId);
  if (!contexto || !podeGerirBackup(contexto.papel)) {
    return erro('Acesso permitido somente ao proprietário ou administrador desta conta.', 403);
  }

  const { data: snapshot, error } = await contexto.admin.rpc('exportar_snapshot_conta_vendas_mobile', {
    p_conta_id: contaId,
  });
  if (error || !snapshot) return erro(error?.message || 'Não foi possível preparar o backup.', 500);

  return NextResponse.json({
    manifest: {
      produto: 'AvantaVendas',
      formato: 'avantavendas-backup',
      formato_versao: 1,
      schema_versao: Number(snapshot.schema_versao || 1),
      conta_id: contaId,
      conta_nome: String(snapshot.conta_origem?.nome || 'Conta de vendas'),
      gerado_em: new Date().toISOString(),
      checksum_sha256: checksum(snapshot),
    },
    snapshot,
  });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const contaId = String(corpo.contaId || '');
  const contexto = await obterContextoContaVendas(request, contaId);
  if (!contexto) return erro('Conta de vendas não encontrada ou sem acesso.', 403);
  if (contexto.papel !== 'proprietario') return erro('Somente o proprietário pode restaurar esta conta.', 403);
  if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'SUBSTITUIR') {
    return erro('Digite SUBSTITUIR para confirmar a restauração.', 400);
  }
  const snapshot = corpo.snapshot;
  if (!snapshot || snapshot.produto !== 'AvantaVendas' || ![1, 2].includes(Number(snapshot.schema_versao))) {
    return erro('Arquivo de backup inválido ou incompatível.', 400);
  }
  if (String(snapshot.conta_origem?.id || '') !== contaId) {
    return erro('Este backup pertence a outra conta de vendas.', 400);
  }
  if (corpo.checksum && String(corpo.checksum) !== checksum(snapshot)) {
    return erro('O arquivo foi alterado ou está corrompido.', 400);
  }

  const { data: pontoSegurancaId, error } = await contexto.admin.rpc('restaurar_snapshot_conta_vendas_mobile', {
    p_conta_id: contaId,
    p_snapshot: snapshot,
    p_criado_por: contexto.userId,
    p_ponto_origem_id: null,
  });
  if (error) return erro(error.message || 'Não foi possível restaurar o backup.', 500);
  return NextResponse.json({ ok: true, pontoSegurancaId });
}
