import { NextResponse } from 'next/server';
import { clientesServidor, erroValidacaoGestor, respostaErro, usuarioDaRequisicao, validarGestor } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);
    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    const colaboradorUserId = String(corpo.colaboradorUserId ?? '').trim();
    const novaSenha = String(corpo.novaSenha ?? '');
    if (!empresaId || !colaboradorUserId) return respostaErro('Empresa ou colaborador não informado.');
    if (novaSenha.length < 8) return respostaErro('A senha deve ter pelo menos 8 caracteres.');
    const validacao = await validarGestor(clientes.admin, user.id, empresaId);
    if (validacao !== 'ok') return erroValidacaoGestor(validacao);

    const { data: colaborador } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', colaboradorUserId)
      .maybeSingle();
    if (!colaborador) return respostaErro('Colaborador não encontrado nesta empresa.', 404);
    const { error } = await clientes.admin.auth.admin.updateUserById(colaboradorUserId, { password: novaSenha });
    if (error) return respostaErro('Não foi possível alterar a senha.', 500);
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro inesperado ao redefinir senha de recebimentos:', error);
    return respostaErro('Erro inesperado ao alterar a senha.', 500);
  }
}
