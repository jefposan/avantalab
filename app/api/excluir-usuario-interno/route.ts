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

    if (
      usuarioAlvo.perfil === 'gestor_master' &&
      permissao.perfil !== 'gestor_master'
    ) {
      return respostaErro(
        'Somente o gestor master pode excluir outro gestor master.',
        403
      );
    }

    if (usuarioAlvo.perfil === 'gestor_master') {
      const { count, error: erroContagem } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', usuarioAlvo.empresa_id)
        .eq('perfil', 'gestor_master')
        .eq('status', 'ativo');

      if (erroContagem) {
        console.error('Erro ao contar gestores master:', erroContagem);
        return respostaErro(
          'Não foi possível validar os gestores master.',
          500
        );
      }

      if ((count || 0) <= 1) {
        return respostaErro(
          'A empresa precisa manter pelo menos um gestor master ativo.',
          403
        );
      }
    }

    const { error: erroExcluirVinculo } = await supabaseAdmin
      .from('usuarios_empresa')
      .delete()
      .eq('id', acessoId);

    if (erroExcluirVinculo) {
      console.error('Erro ao excluir vínculo do usuário:', erroExcluirVinculo);
      return respostaErro('Não foi possível excluir o usuário da empresa.', 500);
    }

    return NextResponse.json({
      erro: false,
      mensagem: 'Acesso removido deste perfil. A conta da Gestão foi preservada.',
    });
  } catch (error) {
    console.error('Erro inesperado ao excluir usuário interno:', error);

    return respostaErro('Erro inesperado ao excluir usuário interno.', 500);
  }
}
