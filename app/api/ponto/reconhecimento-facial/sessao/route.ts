import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '../../../../lib/cobranca-servidor';
import { criarSessaoProvaDeVida, infraestruturaFacialDisponivel } from '../../../../lib/reconhecimento-facial-servidor';

function erro(mensagem: string, status = 400) { return NextResponse.json({ erro: true, mensagem }, { status }); }

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const tipo = corpo.tipo === 'cadastro' ? 'cadastro' : 'marcacao';
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return erro('Acesso não autorizado.', 403);
  if (!infraestruturaFacialDisponivel()) return erro('Reconhecimento facial ainda não está disponível.', 503);

  const { data: configuracao } = await acesso.db.from('ponto_config')
    .select('reconhecimento_facial_status').eq('empresa_id', empresaId).maybeSingle();
  if (!configuracao || configuracao.reconhecimento_facial_status === 'desativado' || configuracao.reconhecimento_facial_status === 'suspenso') {
    return erro('O reconhecimento facial não está habilitado para esta empresa.', 403);
  }
  const { data: funcionario } = await acesso.db.from('ponto_facial_funcionarios')
    .select('status').eq('empresa_id', empresaId).eq('funcionario_user_id', acesso.usuario.id).maybeSingle();
  if (!funcionario || funcionario.status === 'removido' || funcionario.status === 'suspenso') return erro('Seu reconhecimento facial não está habilitado.', 403);
  if (tipo === 'marcacao' && funcionario.status !== 'ativo') return erro('Seu reconhecimento facial não está habilitado.', 403);
  if (tipo === 'cadastro' && funcionario.status !== 'pendente_cadastro' && funcionario.status !== 'ativo') return erro('Seu reconhecimento facial não está habilitado.', 403);

  try {
    const sessaoId = await criarSessaoProvaDeVida();
    await acesso.db.from('ponto_facial_verificacoes').insert({ empresa_id: empresaId, funcionario_user_id: acesso.usuario.id, tipo, sessao_provedor_id: sessaoId, status: 'iniciada' });
    return NextResponse.json({ erro: false, sessaoId, regiao: process.env.AWS_REGION || 'us-east-1' });
  } catch (cause) {
    console.error('Falha ao iniciar prova de vida:', cause);
    return erro('Não foi possível iniciar a prova de vida.', 502);
  }
}
