import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import { cobrancaFacialPermiteUso } from '../../../../lib/ponto-facial-cobranca';

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId')?.trim() || '';
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return erro('Acesso não autorizado.', 403);

  const [{ data: configuracao, error: erroConfiguracao }, { data: funcionario, error: erroFuncionario }, { data: assinatura }] = await Promise.all([
    acesso.db.from('ponto_config')
      .select('reconhecimento_facial_status').eq('empresa_id', empresaId).maybeSingle(),
    acesso.db.from('ponto_facial_funcionarios')
      .select('status').eq('empresa_id', empresaId).eq('funcionario_user_id', acesso.usuario.id).maybeSingle(),
    acesso.db.from('ponto_facial_assinaturas')
      .select('status, valido_ate').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  if (erroConfiguracao || erroFuncionario) return erro('Não foi possível consultar a habilitação facial.', 500);

  const statusEmpresa = configuracao?.reconhecimento_facial_status;
  const empresaHabilitada = Boolean(configuracao)
    && statusEmpresa !== 'desativado'
    && statusEmpresa !== 'suspenso'
    && cobrancaFacialPermiteUso(assinatura);
  const status = funcionario?.status || 'nao_habilitado';

  return NextResponse.json({
    erro: false,
    status,
    ativo: empresaHabilitada && status === 'ativo',
    podeCadastrar: empresaHabilitada && status === 'pendente_cadastro',
  });
}
