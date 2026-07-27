import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, podeUsar } from '../../lib/cobranca';
import { resolverEstadoAcessoParaUsuario } from '../../lib/cobranca-servidor';
import { validarNomeCompleto } from '../../lib/nome-pessoa';
import { normalizarEmail, validarEmail } from '../../lib/email';
import { buscarContaAuthPorEmail } from '../../lib/usuario-disponibilidade-servidor';

type PerfilUsuario =
  | 'administrador'
  | 'operador_completo'
  | 'operador_simples';

type CampoUsuario = 'nome' | 'email' | 'login' | 'senha' | 'perfil';

function normalizarLogin(login: string) {
  return login
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}

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
    const email = normalizarEmail(corpo.email);
    const loginOriginal = String(corpo.login || '').trim();
    const senha = String(corpo.senha || '');
    const perfil = String(corpo.perfil || '') as PerfilUsuario;

    const login = normalizarLogin(loginOriginal);

    if (!empresaId) {
      return respostaErro('Empresa não informada.');
    }

    if (!validarNomeCompleto(nome)) {
      return respostaErro('Informe o nome completo do usuário, com nome e sobrenome.', 400, 'nome');
    }

    if (!validarEmail(email)) {
      return respostaErro('Informe um e-mail válido para o usuário.', 400, 'email');
    }

    if (!login) {
      return respostaErro('Informe um login válido.', 400, 'login');
    }

    if (!senha || senha.length < 8) {
      return respostaErro('A senha deve ter pelo menos 8 caracteres.', 400, 'senha');
    }

    if (!['administrador', 'operador_completo', 'operador_simples'].includes(perfil)) {
      return respostaErro('Perfil inválido.', 400, 'perfil');
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

    // Cobrança: criar usuário é recurso do Premium Pessoal (fail-open em falha).
    if (COBRANCA_ATIVA) {
      try {
        const estado = await resolverEstadoAcessoParaUsuario(empresaId, user.id);
        if (!podeUsar('usuarios_internos', estado)) {
          return respostaErro('Criar usuários faz parte do Premium Pessoal. Assine para desbloquear.', 403);
        }
      } catch (erroCobranca) {
        console.error('Erro ao validar Premium (criar usuário):', erroCobranca);
      }
    }

    const { data: loginExistente, error: erroLoginExistente } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, empresa_id')
      .eq('login', login)
      .limit(1)
      .maybeSingle();

    if (erroLoginExistente) {
      console.error('Erro ao verificar login:', erroLoginExistente);
      return respostaErro('Não foi possível verificar o login informado.', 500, 'login');
    }

    if (loginExistente) {
      return respostaErro(
        'Este login já está em uso no sistema. Escolha outro login para criar o usuário.',
        400,
        'login'
      );
    }

    const { data: emailExistente, error: erroEmailExistente } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, empresa_id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (erroEmailExistente) {
      console.error('Erro ao verificar e-mail:', erroEmailExistente);
      return respostaErro('Não foi possível verificar o e-mail informado.', 500, 'email');
    }

    if (emailExistente) {
      return respostaErro(
        'Este e-mail já pertence a uma conta. Use “Adicionar usuário existente” para vinculá-la a este perfil.',
        400,
        'email'
      );
    }

    try {
      const contaAuthExistente = await buscarContaAuthPorEmail(supabaseAdmin, email);
      if (contaAuthExistente) {
        return respostaErro(
          'Este e-mail já pertence a uma conta. Use “Adicionar usuário existente” para vinculá-la a este perfil.',
          400,
          'email'
        );
      }
    } catch (erroConsultaAuth) {
      console.error('Erro ao verificar e-mail no Auth:', erroConsultaAuth);
      return respostaErro('Não foi possível verificar o e-mail informado.', 500, 'email');
    }

    const { data: usuarioCriado, error: erroCriarAuth } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome,
          email,
          login,
          empresa_id: empresaId,
          tipo: 'usuario_interno',
        },
      });

    if (erroCriarAuth || !usuarioCriado.user) {
  console.error('Erro ao criar usuário interno no Auth:', erroCriarAuth);

  const mensagemOriginal = String(erroCriarAuth?.message || '').toLowerCase();

  if (
    mensagemOriginal.includes('already been registered') ||
    mensagemOriginal.includes('already registered') ||
    mensagemOriginal.includes('email address has already')
  ) {
    return respostaErro(
      'Este e-mail já pertence a uma conta. Entre com ela na Gestão para concluir o cadastro antes de vinculá-la a outro perfil.',
      400,
      'email'
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
        email,
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
          'Este login já está em uso no sistema. Escolha outro login para criar o usuário.',
          400,
          'login'
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
