import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { podeRedefinirSenhaEquipe } from '../../lib/usuarios-senha-equipe';

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

    if (!usuarioAlvo.user_id) {
      return respostaErro('Este usuário ainda não possui login ativo.', 400);
    }

    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, perfil, status')
      .eq('empresa_id', usuarioAlvo.empresa_id)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissão:', erroPermissao);
      return respostaErro('Não foi possível validar sua permissão.', 500);
    }

    const proprio = usuarioAlvo.user_id === user.id;
    const alvoOperador = ['operador_completo', 'operador_simples'].includes(usuarioAlvo.perfil);
    const permitido = permissao && (
      permissao.perfil === 'gestor_master' ||
      (permissao.perfil === 'administrador' && (proprio || alvoOperador)) ||
      (permissao.perfil === 'operador_completo' && proprio)
    );
    if (!permitido) {
      return respostaErro('Você não tem permissão para redefinir senhas.', 403);
    }

    let registroAdministrativo;
    if (!proprio) {
      const [conta, vinculos, identidade] = await Promise.all([
        supabaseAdmin.from('usuarios_contas').select('user_id,origem,empresa_origem_id').eq('user_id', usuarioAlvo.user_id).maybeSingle(),
        supabaseAdmin.from('usuarios_empresa').select('user_id,empresa_id,perfil,status').eq('user_id', usuarioAlvo.user_id),
        supabaseAdmin.auth.admin.getUserById(usuarioAlvo.user_id),
      ]);
      if (conta.error || vinculos.error || identidade.error || !identidade.data?.user || !vinculos.data) {
        return respostaErro('Não foi possível conferir a origem e os vínculos desta conta. Nenhuma senha foi alterada. Tente novamente.', 503);
      }
      const authAlvo = identidade.data.user;
      if (!podeRedefinirSenhaEquipe({ userId: user.id, perfil: permissao.perfil, empresaId: usuarioAlvo.empresa_id }, usuarioAlvo, conta.data, vinculos.data)
        || (authAlvo.app_metadata?.origem_avantalab && authAlvo.app_metadata.origem_avantalab !== 'usuario_interno')
        || (authAlvo.app_metadata?.empresa_origem_id && authAlvo.app_metadata.empresa_origem_id !== usuarioAlvo.empresa_id)
        || !Array.isArray(authAlvo.identities) || !authAlvo.identities.length
        || authAlvo.identities.some(i => i.provider !== 'email')) {
        return respostaErro('Esta conta é titular, pessoal, usa outro provedor ou está vinculada a outra empresa. Somente o próprio usuário pode alterar sua senha.', 403);
      }
      registroAdministrativo = {
        ...authAlvo.app_metadata,
        ultima_redefinicao_empresa: { empresa_id: usuarioAlvo.empresa_id, ator_user_id: user.id, em: new Date().toISOString() },
      };
    }

    const { error: erroAtualizarSenha } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioAlvo.user_id,
      {
        password: novaSenha,
        ...(registroAdministrativo ? { app_metadata: registroAdministrativo } : {}),
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
