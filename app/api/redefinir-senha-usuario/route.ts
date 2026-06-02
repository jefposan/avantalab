import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json(
    {
      erro: true,
      mensagem,
    },
    { status }
  );
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

    if (!authHeader) {
      return respostaErro('Sessão não encontrada.', 401);
    }

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: erroUsuario,
    } = await supabaseUsuario.auth.getUser();

    if (erroUsuario || !user) {
      return respostaErro('Usuário autenticado não encontrado.', 401);
    }

    const corpo = await request.json();

    const acessoId = String(corpo.acessoId || '').trim();
    const novaSenha = String(corpo.novaSenha || '').trim();

    if (!acessoId) {
      return respostaErro('Usuário não informado.');
    }

    if (!novaSenha || novaSenha.length < 8) {
      return respostaErro('A nova senha deve ter pelo menos 8 caracteres.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: usuarioAlvo, error: erroUsuarioAlvo } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, empresa_id, user_id, nome, email, login, perfil, status')
      .eq('id', acessoId)
      .maybeSingle();

    if (erroUsuarioAlvo) {
      console.error('Erro ao buscar usuário alvo:', erroUsuarioAlvo);
      return respostaErro('Não foi possível localizar o usuário.', 500);
    }

    if (!usuarioAlvo) {
      return respostaErro('Usuário não encontrado.');
    }

    if (usuarioAlvo.perfil === 'gestor_master') {
      return respostaErro('A senha do gestor master deve ser redefinida pelo email de recuperação.', 403);
    }

    if (!usuarioAlvo.user_id) {
      return respostaErro('Este usuário ainda não possui login ativo.', 400);
    }

    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, perfil, status')
      .eq('empresa_id', usuarioAlvo.empresa_id)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissão:', erroPermissao);
      return respostaErro('Não foi possível validar sua permissão.', 500);
    }

    if (!permissao) {
      return respostaErro('Você não tem permissão para redefinir senhas.', 403);
    }

    const { error: erroAtualizarSenha } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioAlvo.user_id,
      {
        password: novaSenha,
      }
    );

    if (erroAtualizarSenha) {
      console.error('Erro ao redefinir senha:', erroAtualizarSenha);
      return respostaErro('Não foi possível redefinir a senha do usuário.', 500);
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Senha redefinida com sucesso.',
    });
  } catch (error) {
    console.error('Erro inesperado ao redefinir senha:', error);
    return respostaErro('Erro inesperado ao redefinir senha.', 500);
  }
}