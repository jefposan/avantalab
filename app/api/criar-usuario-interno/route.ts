import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PerfilUsuario =
  | 'administrador'
  | 'operador_completo'
  | 'operador_simples';

function normalizarLogin(login: string) {
  return login
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}

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

    const empresaId = String(corpo.empresaId || '').trim();
    const nome = String(corpo.nome || '').trim();
    const loginOriginal = String(corpo.login || '').trim();
    const senha = String(corpo.senha || '');
    const perfil = String(corpo.perfil || '') as PerfilUsuario;

    const login = normalizarLogin(loginOriginal);

    if (!empresaId) {
      return respostaErro('Empresa não informada.');
    }

    if (!nome) {
      return respostaErro('Informe o nome do usuário.');
    }

    if (!login) {
      return respostaErro('Informe um login válido.');
    }

    if (!senha || senha.length < 8) {
      return respostaErro('A senha deve ter pelo menos 8 caracteres.');
    }

    if (!['administrador', 'operador_completo', 'operador_simples'].includes(perfil)) {
      return respostaErro('Perfil inválido.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, perfil, status')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissão:', erroPermissao);
      return respostaErro('Não foi possível validar sua permissão.', 500);
    }

    if (!permissao) {
      return respostaErro('Você não tem permissão para criar usuários.', 403);
    }

    const { data: loginExistente, error: erroLoginExistente } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, empresa_id')
      .eq('login', login)
      .limit(1)
      .maybeSingle();

    if (erroLoginExistente) {
      console.error('Erro ao verificar login:', erroLoginExistente);
      return respostaErro('Não foi possível verificar o login informado.', 500);
    }

    if (loginExistente) {
      return respostaErro(
        'Este login já está em uso no sistema. Escolha outro login para criar o usuário.'
      );
    }

    const emailInterno = `${login}+${empresaId}@usuarios.avantalab.local`;

    const { data: usuarioCriado, error: erroCriarAuth } =
      await supabaseAdmin.auth.admin.createUser({
        email: emailInterno,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          login,
          empresa_id: empresaId,
          tipo: 'usuario_interno',
        },
      });

    if (erroCriarAuth || !usuarioCriado.user) {
  console.error('Erro ao criar usuário interno no Auth:', erroCriarAuth);

  const mensagemOriginal = erroCriarAuth?.message || '';

  if (
    mensagemOriginal.includes('already been registered') ||
    mensagemOriginal.includes('already registered') ||
    mensagemOriginal.includes('email address has already')
  ) {
    return respostaErro(
      'Este login já foi criado anteriormente. Exclua o usuário antigo completamente ou escolha outro login.',
      400
    );
  }

  return respostaErro(
    'Não foi possível criar o usuário interno.',
    500
  );
}

    const { data: vinculoCriado, error: erroVinculo } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        empresa_id: empresaId,
        user_id: usuarioCriado.user.id,
        nome,
        email: emailInterno,
        login,
        perfil,
        status: 'ativo',
      })
      .select()
      .single();

    if (erroVinculo) {
      console.error('Erro ao criar vínculo do usuário:', erroVinculo);

      await supabaseAdmin.auth.admin.deleteUser(usuarioCriado.user.id);

      const mensagemErro = String(
        erroVinculo.message || erroVinculo.code || ''
      ).toLowerCase();

      if (
        erroVinculo.code === '23505' ||
        mensagemErro.includes('usuarios_empresa_login_unico_idx') ||
        mensagemErro.includes('duplicate key') ||
        mensagemErro.includes('unique constraint')
      ) {
        return respostaErro(
          'Este login já está em uso no sistema. Escolha outro login para criar o usuário.'
        );
      }

      return respostaErro(
        erroVinculo.message || 'Não foi possível vincular o usuário à empresa.',
        500
      );
    }

    return NextResponse.json({
      erro: false,
      usuario: vinculoCriado,
    });
  } catch (error) {
    console.error('Erro inesperado ao criar usuário interno:', error);

    return respostaErro('Erro inesperado ao criar usuário interno.', 500);
  }
}
