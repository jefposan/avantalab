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

    const { data: contaGlobal, error: erroContaGlobal } = usuarioAlvo.user_id
      ? await supabaseAdmin
          .from('usuarios_contas')
          .select('origem')
          .eq('user_id', usuarioAlvo.user_id)
          .maybeSingle()
      : { data: null, error: null };

    if (erroContaGlobal) {
      console.error('Erro ao consultar a conta global:', erroContaGlobal);
      return respostaErro(
        'Não foi possível verificar os outros vínculos deste usuário.',
        500
      );
    }

    let auditoria = {
      pode_excluir_total: false,
      bloqueios: [] as Array<{ origem?: string; quantidade?: number }>,
    };

    if (usuarioAlvo.user_id) {
      const { data, error: erroAuditoria } = await supabaseAdmin.rpc(
        'auditar_exclusao_total_usuario_rpc',
        {
          p_user_id: usuarioAlvo.user_id,
          p_acesso_ignorado: acessoId,
        }
      );

      if (erroAuditoria) {
        console.error('Erro ao auditar vínculos do usuário:', erroAuditoria);
        return respostaErro(
          'Não foi possível verificar todos os vínculos deste usuário. Nenhuma alteração foi realizada.',
          500
        );
      }

      auditoria = data || auditoria;
    }

    const contaCriadaInternamente =
      contaGlobal?.origem === 'usuario_interno';
    const podeExcluirTotal =
      Boolean(usuarioAlvo.user_id) &&
      contaCriadaInternamente &&
      auditoria.pode_excluir_total === true;

    if (podeExcluirTotal && usuarioAlvo.user_id) {
      const { error: erroExcluirAuth } =
        await supabaseAdmin.auth.admin.deleteUser(usuarioAlvo.user_id);

      if (!erroExcluirAuth) {
        return NextResponse.json({
          erro: false,
          exclusaoTotal: true,
          mensagem:
            'Usuário e login excluídos definitivamente. O e-mail e o login estão livres para novo cadastro.',
        });
      }

      console.error(
        'Erro ao excluir conta global; preservando o login:',
        erroExcluirAuth
      );
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
      exclusaoTotal: false,
      mensagem:
        'Acesso removido deste perfil. A conta foi preservada porque possui outros vínculos, perfil próprio ou histórico no sistema.',
    });
  } catch (error) {
    console.error('Erro inesperado ao excluir usuário interno:', error);

    return respostaErro('Erro inesperado ao excluir usuário interno.', 500);
  }
}
