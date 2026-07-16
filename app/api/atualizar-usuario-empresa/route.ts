import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PerfilUsuario =
  | 'gestor_master'
  | 'administrador'
  | 'operador_completo'
  | 'operador_simples';

const perfisValidos: PerfilUsuario[] = [
  'gestor_master',
  'administrador',
  'operador_completo',
  'operador_simples',
];

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json(
    {
      erro: true,
      mensagem,
    },
    { status }
  );
}

function normalizarLogin(login: string) {
  return login
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return respostaErro('Configuracao do servidor incompleta.', 500);
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return respostaErro('Sessao nao encontrada.', 401);
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
      return respostaErro('Usuario autenticado nao encontrado.', 401);
    }

    const corpo = await request.json();
    const acessoId = String(corpo.acessoId || '').trim();
    const nome = String(corpo.nome || '').trim();
    const loginEnviado = corpo.login === undefined ? '' : String(corpo.login || '').trim().toLowerCase();
    const emailEnviado = corpo.login === undefined ? String(corpo.email || '').trim().toLowerCase() : String(corpo.email || '').trim().toLowerCase();
    const perfil = String(corpo.perfil || '') as PerfilUsuario;
    const novaSenha = String(corpo.novaSenha || '').trim();

    if (!acessoId) {
      return respostaErro('Usuario nao informado.');
    }

    if (!nome) {
      return respostaErro('Informe o nome do usuario.');
    }

    if (!loginEnviado && corpo.login !== undefined) {
      return respostaErro('Informe um login valido.');
    }

    if (!perfisValidos.includes(perfil)) {
      return respostaErro('Selecione um perfil de acesso valido.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: usuarioAlvo, error: erroUsuarioAlvo } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, empresa_id, user_id, nome, email, login, perfil, status')
      .eq('id', acessoId)
      .maybeSingle();

    if (erroUsuarioAlvo) {
      console.error('Erro ao buscar usuario alvo:', erroUsuarioAlvo);
      return respostaErro('Nao foi possivel localizar o usuario.', 500);
    }

    if (!usuarioAlvo) {
      return respostaErro('Usuario nao encontrado.');
    }

    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, perfil, status')
      .eq('empresa_id', usuarioAlvo.empresa_id)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissao:', erroPermissao);
      return respostaErro('Nao foi possivel validar sua permissao.', 500);
    }

    if (!permissao || permissao.perfil === 'operador_simples') {
      return respostaErro('Voce nao tem permissao para atualizar usuarios.', 403);
    }

    const solicitanteEhGestorMaster = permissao.perfil === 'gestor_master';
    const solicitanteEhAdministrador = permissao.perfil === 'administrador';
    const solicitanteEhOperadorCompleto = permissao.perfil === 'operador_completo';
    const editandoProprioUsuario = usuarioAlvo.user_id === user.id;
    const alvoEhOperador = ['operador_completo', 'operador_simples'].includes(usuarioAlvo.perfil);

    if (!solicitanteEhGestorMaster && !(
      (solicitanteEhAdministrador && (editandoProprioUsuario || alvoEhOperador)) ||
      (solicitanteEhOperadorCompleto && editandoProprioUsuario)
    )) {
      return respostaErro('Voce nao tem permissao para editar este usuario.', 403);
    }

    if (!solicitanteEhGestorMaster && perfil !== usuarioAlvo.perfil) {
      return respostaErro('Somente o Gestor Master pode alterar o perfil de acesso.', 403);
    }

    if (perfil === 'gestor_master' && !solicitanteEhGestorMaster) {
      return respostaErro(
        'Somente o gestor master pode transformar outro usuario em gestor master.',
        403
      );
    }

    if (novaSenha && novaSenha.length < 8) {
      return respostaErro('A nova senha deve ter pelo menos 8 caracteres.');
    }

    if (usuarioAlvo.perfil === 'gestor_master' && perfil !== 'gestor_master') {
      const { count, error: erroContagem } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', usuarioAlvo.empresa_id)
        .eq('perfil', 'gestor_master')
        .eq('status', 'ativo');

      if (erroContagem) {
        console.error('Erro ao contar gestores master:', erroContagem);
        return respostaErro('Nao foi possivel validar os gestores master.', 500);
      }

      if ((count || 0) <= 1) {
        return respostaErro(
          'A empresa precisa manter pelo menos um gestor master ativo.',
          403
        );
      }
    }

    const atualizacao: {
      nome: string;
      perfil: PerfilUsuario;
      email?: string;
      login?: string | null;
    } = {
      nome,
      perfil,
    };

    if (corpo.login === undefined && emailEnviado.includes('@')) {
      const { data: conflito } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const emailEmUso = (conflito?.users || []).some((item) => item.id !== usuarioAlvo.user_id && String(item.email || '').toLowerCase() === emailEnviado);
      if (emailEmUso) return respostaErro('Este e-mail ja esta em uso por outra conta.');
      atualizacao.email = emailEnviado;
    } else {
      const login = normalizarLogin(corpo.login === undefined ? emailEnviado : loginEnviado);

      if (!login) {
        return respostaErro('Informe um login valido.');
      }

      atualizacao.login = login;
    }

    if (corpo.login !== undefined && emailEnviado) {
      if (!emailEnviado.includes('@')) return respostaErro('Informe um e-mail valido.');
      const { data: conflito } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if ((conflito?.users || []).some((item) => item.id !== usuarioAlvo.user_id && String(item.email || '').toLowerCase() === emailEnviado)) return respostaErro('Este e-mail ja esta em uso por outra conta.');
      atualizacao.email = emailEnviado;
    }

    // O login é da conta, não do perfil financeiro. Ao editar outro vínculo
    // da mesma conta, move o login para o acesso editado sem duplicá-lo.
    if (corpo.login !== undefined && usuarioAlvo.user_id) {
      const { error: erroLimparLogin } = await supabaseAdmin
        .from('usuarios_empresa')
        .update({ login: null })
        .eq('user_id', usuarioAlvo.user_id)
        .neq('id', usuarioAlvo.id);
      if (erroLimparLogin) return respostaErro('Não foi possível preparar a alteração do login.', 500);
    }

    const { data: usuarioAtualizado, error: erroAtualizar } = await supabaseAdmin
      .from('usuarios_empresa')
      .update(atualizacao)
      .eq('id', acessoId)
      .select()
      .single();

    if (erroAtualizar) {
      console.error('Erro ao atualizar usuario:', erroAtualizar);

      const mensagemErro = String(
        erroAtualizar.message || erroAtualizar.code || ''
      ).toLowerCase();

      if (
        erroAtualizar.code === '23505' ||
        mensagemErro.includes('duplicate key') ||
        mensagemErro.includes('unique constraint')
      ) {
        return respostaErro(
          'Este login/email ja esta em uso no sistema. Escolha outro.'
        );
      }

      return respostaErro(
        erroAtualizar.message || 'Nao foi possivel atualizar o usuario.',
        500
      );
    }

    if (emailEnviado && emailEnviado.includes('@') && usuarioAlvo.user_id && emailEnviado !== String(usuarioAlvo.email || '').toLowerCase()) {
      const { error: erroAuth } = await supabaseAdmin.auth.admin.updateUserById(usuarioAlvo.user_id, {
        email: emailEnviado,
        email_confirm: true,
      });
      if (erroAuth) return respostaErro(erroAuth.message || 'Nao foi possivel atualizar o e-mail da conta.', 500);
      const { error: erroVinculos } = await supabaseAdmin.from('usuarios_empresa').update({ email: emailEnviado }).eq('user_id', usuarioAlvo.user_id);
      if (erroVinculos) return respostaErro('O e-mail da conta foi atualizado, mas alguns vinculos nao puderam ser sincronizados.', 500);
    }

    if (novaSenha && usuarioAlvo.user_id) {
      const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(usuarioAlvo.user_id, { password: novaSenha });
      if (erroSenha) return respostaErro('Os dados foram salvos, mas a senha nao pode ser atualizada.', 500);
    }

    return NextResponse.json({
      erro: false,
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro inesperado ao atualizar usuario:', error);

    return respostaErro('Erro inesperado ao atualizar usuario.', 500);
  }
}
