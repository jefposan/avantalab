import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validarNomeCompleto } from '../../lib/nome-pessoa';
import { normalizarEmail, validarEmail } from '../../lib/email';
import { buscarContaAuthPorEmail } from '../../lib/usuario-disponibilidade-servidor';

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

type CampoUsuario = 'nome' | 'email' | 'login' | 'senha' | 'perfil';

function respostaErro(mensagem: string, status = 400, campo?: CampoUsuario) {
  return NextResponse.json(
    {
      erro: true,
      mensagem,
      campo,
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
    const emailEnviado = normalizarEmail(corpo.email);
    const perfil = String(corpo.perfil || '') as PerfilUsuario;
    const novaSenha = String(corpo.novaSenha || '').trim();

    if (!acessoId) {
      return respostaErro('Usuario nao informado.');
    }

    if (!validarNomeCompleto(nome)) {
      return respostaErro('Informe o nome completo do usuario, com nome e sobrenome.', 400, 'nome');
    }

    if (!validarEmail(emailEnviado)) {
      return respostaErro('Informe um e-mail valido para o usuario.', 400, 'email');
    }

    if (!loginEnviado && corpo.login !== undefined) {
      return respostaErro('Informe um login valido.', 400, 'login');
    }

    if (!perfisValidos.includes(perfil)) {
      return respostaErro('Selecione um perfil de acesso valido.', 400, 'perfil');
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
      return respostaErro('A nova senha deve ter pelo menos 8 caracteres.', 400, 'senha');
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
    } = {
      nome,
      perfil,
    };
    let loginNormalizado = '';

    if (corpo.login === undefined && emailEnviado.includes('@')) {
      atualizacao.email = emailEnviado;
    } else {
      const login = normalizarLogin(corpo.login === undefined ? emailEnviado : loginEnviado);

      if (!login) {
        return respostaErro('Informe um login valido.', 400, 'login');
      }

      loginNormalizado = login;
    }

    if (corpo.login !== undefined && emailEnviado) {
      atualizacao.email = emailEnviado;
    }

    if (loginNormalizado) {
      const { data: conflitoLogin, error: erroConflitoLogin } = await supabaseAdmin
        .from('usuarios_contas')
        .select('user_id')
        .eq('login', loginNormalizado)
        .neq('user_id', usuarioAlvo.user_id)
        .limit(1)
        .maybeSingle();

      if (erroConflitoLogin) {
        console.error('Erro ao verificar login:', erroConflitoLogin);
        return respostaErro('Não foi possível verificar o login informado.', 500, 'login');
      }
      if (conflitoLogin) {
        return respostaErro('Este login já está em uso no sistema. Escolha outro.', 400, 'login');
      }
    }

    const { data: conflitoEmailVinculo, error: erroConflitoEmailVinculo } = await supabaseAdmin
      .from('usuarios_contas')
      .select('user_id')
      .eq('email', emailEnviado)
      .neq('user_id', usuarioAlvo.user_id)
      .limit(1)
      .maybeSingle();

    if (erroConflitoEmailVinculo) {
      console.error('Erro ao verificar e-mail:', erroConflitoEmailVinculo);
      return respostaErro('Não foi possível verificar o e-mail informado.', 500, 'email');
    }
    if (conflitoEmailVinculo) {
      return respostaErro('Este e-mail já está em uso por outra conta.', 400, 'email');
    }

    try {
      const conflitoEmailAuth = await buscarContaAuthPorEmail(
        supabaseAdmin,
        emailEnviado,
        usuarioAlvo.user_id
      );
      if (conflitoEmailAuth) {
        return respostaErro('Este e-mail já está em uso por outra conta.', 400, 'email');
      }
    } catch (erroConsultaAuth) {
      console.error('Erro ao verificar e-mail no Auth:', erroConsultaAuth);
      return respostaErro('Não foi possível verificar o e-mail informado.', 500, 'email');
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
          'Este login ou e-mail ja esta em uso no sistema. Escolha outro.',
          400,
          mensagemErro.includes('login') ? 'login' : 'email'
        );
      }

      return respostaErro(
        erroAtualizar.message || 'Nao foi possivel atualizar o usuario.',
        500
      );
    }

    if (loginNormalizado && usuarioAlvo.user_id) {
      const { data: loginSalvo, error: erroLogin } = await supabaseAdmin.rpc(
        'definir_login_conta_rpc',
        {
          p_user_id: usuarioAlvo.user_id,
          p_acesso_id: usuarioAlvo.id,
          p_login: loginNormalizado,
        }
      );
      if (erroLogin || loginSalvo !== true) {
        return respostaErro(
          erroLogin?.message || 'Não foi possível salvar o login da conta.',
          500,
          'login'
        );
      }
      usuarioAtualizado.login = loginNormalizado;
    }

    if (emailEnviado && emailEnviado.includes('@') && usuarioAlvo.user_id && emailEnviado !== String(usuarioAlvo.email || '').toLowerCase()) {
      const { error: erroAuth } = await supabaseAdmin.auth.admin.updateUserById(usuarioAlvo.user_id, {
        email: emailEnviado,
        email_confirm: true,
      });
      if (erroAuth) return respostaErro(erroAuth.message || 'Nao foi possivel atualizar o e-mail da conta.', 500, 'email');
      const { error: erroVinculos } = await supabaseAdmin.from('usuarios_empresa').update({ email: emailEnviado }).eq('user_id', usuarioAlvo.user_id);
      if (erroVinculos) return respostaErro('O e-mail da conta foi atualizado, mas alguns vinculos nao puderam ser sincronizados.', 500);
    }

    if (novaSenha && usuarioAlvo.user_id) {
      const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(usuarioAlvo.user_id, { password: novaSenha });
      if (erroSenha) return respostaErro('Os dados foram salvos, mas a senha nao pode ser atualizada.', 500, 'senha');
    }

    if (usuarioAlvo.user_id) {
      const { error: erroDiretorio } = await supabaseAdmin
        .from('usuarios_contas')
        .update({
          nome,
          email: emailEnviado,
          ...(loginNormalizado ? { login: loginNormalizado } : {}),
          atualizado_em: new Date().toISOString(),
        })
        .eq('user_id', usuarioAlvo.user_id);

      if (erroDiretorio) {
        console.error('Erro ao sincronizar diretorio global:', erroDiretorio);
        return respostaErro(
          'Os dados foram salvos, mas o diretório global da conta não pôde ser sincronizado.',
          500
        );
      }
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
