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
    const loginOuEmail = String(corpo.email || '').trim().toLowerCase();
    const perfil = String(corpo.perfil || '') as PerfilUsuario;

    if (!acessoId) {
      return respostaErro('Usuario nao informado.');
    }

    if (!nome) {
      return respostaErro('Informe o nome do usuario.');
    }

    if (!loginOuEmail) {
      return respostaErro('Informe o login/email deste usuario.');
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
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissao:', erroPermissao);
      return respostaErro('Nao foi possivel validar sua permissao.', 500);
    }

    if (!permissao) {
      return respostaErro('Voce nao tem permissao para atualizar usuarios.', 403);
    }

    const solicitanteEhGestorMaster = permissao.perfil === 'gestor_master';

    if (perfil === 'gestor_master' && !solicitanteEhGestorMaster) {
      return respostaErro(
        'Somente o gestor master pode transformar outro usuario em gestor master.',
        403
      );
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

    if (loginOuEmail.includes('@')) {
      atualizacao.email = loginOuEmail;
      if (!usuarioAlvo.login) {
        atualizacao.login = null;
      }
    } else {
      const login = normalizarLogin(loginOuEmail);

      if (!login) {
        return respostaErro('Informe um login valido.');
      }

      atualizacao.login = login;
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

    return NextResponse.json({
      erro: false,
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error('Erro inesperado ao atualizar usuario:', error);

    return respostaErro('Erro inesperado ao atualizar usuario.', 500);
  }
}
