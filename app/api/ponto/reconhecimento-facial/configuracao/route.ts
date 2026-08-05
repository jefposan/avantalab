import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import { montarEstadoCobrancaFacial } from '../../../../lib/ponto-facial-cobranca-servidor';

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = url.searchParams.get('empresaId')?.trim() || '';
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return respostaErro('Acesso não autorizado.', 403);

  const [{ data, error }, cobranca] = await Promise.all([
    acesso.db.from('ponto_facial_funcionarios')
      .select('funcionario_user_id, status')
      .eq('empresa_id', empresaId)
      .neq('status', 'removido'),
    montarEstadoCobrancaFacial(acesso.db, empresaId),
  ]);
  if (error) return respostaErro('Não foi possível carregar a configuração facial.', 500);
  return NextResponse.json({ erro: false, funcionarios: data || [], cobranca });
}

// A seleção deixou de ser gravada diretamente. Toda alteração passa pelo fluxo
// financeiro para impedir liberação sem pagamento ou manipulação pelo cliente.
export async function POST() {
  return respostaErro('Use o fluxo de contratação do reconhecimento facial.', 409);
}
