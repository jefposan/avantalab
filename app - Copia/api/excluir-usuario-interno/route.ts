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

    if (!acessoId) {
      return respostaErro('Usuário não informado.');
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
      return respostaErro('O gestor master não pode ser excluído.', 403);
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
      return respostaErro('Você não tem permissão para excluir usuários.', 403);
    }

    const ehUsuarioInterno =
      usuarioAlvo.email?.endsWith('@usuarios.avantalab.local') ||
      usuarioAlvo.email?.includes('@usuarios.avantalab.local');

    const { error: erroExcluirVinculo } = await supabaseAdmin
      .from('usuarios_empresa')
      .delete()
      .eq('id', acessoId);

    if (erroExcluirVinculo) {
      console.error('Erro ao excluir vínculo do usuário:', erroExcluirVinculo);
      return respostaErro('Não foi possível excluir o usuário da empresa.', 500);
    }

    if (ehUsuarioInterno && usuarioAlvo.user_id) {
      const { error: erroExcluirAuth } = await supabaseAdmin.auth.admin.deleteUser(
        usuarioAlvo.user_id
      );

      if (erroExcluirAuth) {
        console.error('Erro ao excluir usuário interno do Auth:', erroExcluirAuth);

        return respostaErro(
          'O usuário foi removido da empresa, mas não foi possível remover o login interno.',
          500
        );
      }
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Usuário excluído com sucesso.',
    });
  } catch (error) {
    console.error('Erro inesperado ao excluir usuário interno:', error);

    return respostaErro('Erro inesperado ao excluir usuário interno.', 500);
  }
}