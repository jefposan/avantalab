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

function normalizarTexto(valor: unknown) {
  return String(valor || '').trim().toLowerCase();
}

async function buscarUsuarioPorTermo(supabaseAdmin: any, termo: string) {
  const termoLimpo = normalizarTexto(termo);

  const { data: porEmail, error: erroEmail } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('id, user_id, nome, email, login')
    .eq('email', termoLimpo)
    .limit(10);

  if (erroEmail) {
    console.error('Erro ao buscar usuario por email:', erroEmail);
    throw new Error('Nao foi possivel pesquisar o usuario.');
  }

  const { data: porLogin, error: erroLogin } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('id, user_id, nome, email, login')
    .eq('login', termoLimpo)
    .limit(10);

  if (erroLogin) {
    console.error('Erro ao buscar usuario por login:', erroLogin);
    throw new Error('Nao foi possivel pesquisar o usuario.');
  }

  const candidatos = [...(porEmail || []), ...(porLogin || [])];
  const usuario = candidatos.find((item) => item.user_id);

  if (!usuario) return null;

  return {
    userId: usuario.user_id,
    nome: usuario.nome || '',
    email: usuario.email || '',
    login: usuario.login || '',
  };
}

async function buscarVinculoExistente(
  supabaseAdmin: any,
  empresaId: string,
  userId: string
) {
  const { data, error } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao verificar vinculo existente:', error);
    throw new Error('Nao foi possivel verificar se o usuario ja esta vinculado.');
  }

  return data;
}

async function validarPermissaoGestao(
  supabaseAdmin: any,
  empresaId: string,
  userId: string
) {
  const { data, error } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador'])
    .maybeSingle();

  if (error) {
    console.error('Erro ao validar permissao:', error);
    throw new Error('Nao foi possivel validar sua permissao.');
  }

  return data;
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
    const acao = String(corpo.acao || '').trim();
    const empresaId = String(corpo.empresaId || '').trim();

    if (!empresaId) {
      return respostaErro('Empresa nao informada.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const permissao = await validarPermissaoGestao(
      supabaseAdmin,
      empresaId,
      user.id
    );

    if (!permissao) {
      return respostaErro(
        'Voce nao tem permissao para gerenciar usuarios.',
        403
      );
    }

    if (acao === 'buscar') {
      const termo = normalizarTexto(corpo.termo);

      if (!termo) {
        return respostaErro('Informe o email ou login do usuario.');
      }

      const usuario = await buscarUsuarioPorTermo(supabaseAdmin, termo);

      if (!usuario) {
        return NextResponse.json({
          erro: false,
          encontrado: false,
          mensagem: 'Nenhum usuario encontrado com este email ou login.',
        });
      }

      const vinculoExistente = await buscarVinculoExistente(
        supabaseAdmin,
        empresaId,
        usuario.userId
      );

      return NextResponse.json({
        erro: false,
        encontrado: true,
        jaVinculado: Boolean(vinculoExistente),
        mensagem: vinculoExistente
          ? 'Este usuario ja esta vinculado a esta empresa.'
          : '',
        usuario: {
          id: usuario.userId,
          user_id: usuario.userId,
          nome: usuario.nome,
          email: usuario.email,
          login: usuario.login,
        },
      });
    }

    if (acao === 'vincular') {
      const userId = String(corpo.userId || '').trim();
      const perfil = String(corpo.perfil || '') as PerfilUsuario;

      if (!userId) {
        return respostaErro('Usuario nao informado.');
      }

      if (!perfisValidos.includes(perfil)) {
        return respostaErro('Selecione um perfil de acesso valido.');
      }

      const vinculoExistente = await buscarVinculoExistente(
        supabaseAdmin,
        empresaId,
        userId
      );

      if (vinculoExistente) {
        return respostaErro('Este usuario ja esta vinculado a esta empresa.');
      }

      const { data: usuarioFonte, error: erroUsuarioFonte } =
        await supabaseAdmin
          .from('usuarios_empresa')
          .select('user_id, nome, email, login')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

      if (erroUsuarioFonte) {
        console.error('Erro ao buscar usuario fonte:', erroUsuarioFonte);
        return respostaErro('Nao foi possivel localizar o usuario.', 500);
      }

      if (!usuarioFonte) {
        return respostaErro('Usuario nao encontrado.');
      }

      const login = normalizarTexto(usuarioFonte.login || usuarioFonte.email);
      const email = normalizarTexto(usuarioFonte.email || login);

      if (login) {
        const { data: loginExistente, error: erroLoginExistente } =
          await supabaseAdmin
            .from('usuarios_empresa')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('login', login)
            .limit(1)
            .maybeSingle();

        if (erroLoginExistente) {
          console.error('Erro ao verificar login existente:', erroLoginExistente);
          return respostaErro('Nao foi possivel verificar o login informado.', 500);
        }

        if (loginExistente) {
          return respostaErro(
            'Este login ja esta em uso nesta empresa. O usuario nao pode ser vinculado com login duplicado.'
          );
        }
      }

      const { data: vinculoCriado, error: erroVinculo } = await supabaseAdmin
        .from('usuarios_empresa')
        .insert({
          empresa_id: empresaId,
          user_id: userId,
          nome: usuarioFonte.nome || login || email || 'Usuario',
          email,
          login,
          perfil,
          status: 'ativo',
        })
        .select()
        .single();

      if (erroVinculo) {
        console.error('Erro ao vincular usuario existente:', erroVinculo);
        return respostaErro(
          erroVinculo.message ||
            'Nao foi possivel vincular o usuario a empresa.',
          500
        );
      }

      return NextResponse.json({
        erro: false,
        mensagem: 'Usuario vinculado com sucesso.',
        usuario: vinculoCriado,
      });
    }

    return respostaErro('Acao invalida.');
  } catch (error: any) {
    console.error('Erro inesperado ao vincular usuario existente:', error);

    return respostaErro(
      error?.message || 'Erro inesperado ao vincular usuario existente.',
      500
    );
  }
}
