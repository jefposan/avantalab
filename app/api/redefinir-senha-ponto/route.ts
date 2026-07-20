import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return respostaErro('Configuração do servidor incompleta.', 500);
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return respostaErro('Sessão não encontrada.', 401);

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: erroUsuario } = await supabaseUsuario.auth.getUser();
    if (erroUsuario || !user) return respostaErro('Usuário autenticado não encontrado.', 401);

    const corpo = await request.json();
    const empresaId = String(corpo.empresaId || '').trim();
    const funcionarioUserId = String(corpo.funcionarioUserId || '').trim();
    const novaSenha = String(corpo.novaSenha || '');

    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!funcionarioUserId) return respostaErro('Funcionário não informado.');
    if (!novaSenha || novaSenha.length < 8) return respostaErro('A senha deve ter pelo menos 8 caracteres.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Quem chama precisa ser gestor/admin da empresa
    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();

    if (erroPermissao) return respostaErro('Não foi possível validar sua permissão.', 500);
    if (!permissao) return respostaErro('Você não tem permissão para alterar a senha.', 403);

    // O funcionário precisa pertencer à mesma empresa e ser do tipo ponto
    const { data: alvo, error: erroAlvo } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', funcionarioUserId)
      .eq('perfil', 'funcionario_ponto')
      .eq('status', 'ativo')
      .maybeSingle();

    if (erroAlvo) return respostaErro('Não foi possível validar o funcionário.', 500);
    if (!alvo) return respostaErro('Funcionário ativo não encontrado nesta empresa.', 404);

    const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(funcionarioUserId, { password: novaSenha });
    if (erroSenha) {
      console.error('Erro ao redefinir senha do funcionário de ponto:', erroSenha);
      return respostaErro('Não foi possível alterar a senha. Tente novamente.', 500);
    }

    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao redefinir senha de funcionário de ponto:', error);
    return respostaErro('Erro inesperado ao alterar a senha.', 500);
  }
}
