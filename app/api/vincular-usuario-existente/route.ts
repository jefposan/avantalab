import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, podeUsar } from '../../lib/cobranca';
import { resolverEstadoAcessoParaUsuario } from '../../lib/cobranca-servidor';
import { validarLimiteDeUsuarios } from '../../lib/limites-comerciais-servidor';
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

  const { data: contaPorEmail, error: erroEmail } = await supabaseAdmin
    .from('usuarios_contas')
    .select('user_id, nome, email, login')
    .eq('email', termoLimpo)
    .maybeSingle();

  if (erroEmail) {
    console.error('Erro ao buscar usuario por email no diretorio global:', erroEmail);
    throw new Error('Nao foi possivel pesquisar o usuario.');
  }

  let usuario = contaPorEmail;

  if (!usuario) {
    const { data: contaPorLogin, error: erroLogin } = await supabaseAdmin
      .from('usuarios_contas')
      .select('user_id, nome, email, login')
      .eq('login', termoLimpo)
      .maybeSingle();

    if (erroLogin) {
      console.error(
        'Erro ao buscar usuario por login no diretorio global:',
        erroLogin
      );
      throw new Error('Nao foi possivel pesquisar o usuario.');
    }

    usuario = contaPorLogin;
  }

  if (!usuario && termoLimpo.includes('@')) {
    const contaAuth = await buscarContaAuthPorEmail(supabaseAdmin, termoLimpo);
    if (contaAuth) {
      const { data: authCompleto } = await supabaseAdmin.auth.admin.getUserById(
        contaAuth.id
      );
      const metadados = authCompleto?.user?.user_metadata || {};
      const contaRecuperada = {
        user_id: contaAuth.id,
        nome:
          metadados.nome ||
          metadados.full_name ||
          metadados.name ||
          termoLimpo.split('@')[0],
        email: termoLimpo,
        login: metadados.login || null,
      };
      const { error: erroRecuperacao } = await supabaseAdmin
        .from('usuarios_contas')
        .upsert(contaRecuperada, { onConflict: 'user_id' });
      if (erroRecuperacao) {
        console.error('Erro ao recuperar conta global:', erroRecuperacao);
        throw new Error('Nao foi possivel preparar esta conta para vinculo.');
      }
      usuario = contaRecuperada;
    }
  }

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

    // Cobrança: gerenciar usuários é recurso do Premium Pessoal (fail-open em falha).
    if (COBRANCA_ATIVA) {
      try {
        const estado = await resolverEstadoAcessoParaUsuario(empresaId, user.id);
        if (!podeUsar('usuarios_internos', estado)) {
          return respostaErro('Adicionar usuários faz parte do Premium Pessoal. Assine para desbloquear.', 403);
        }
        const limite = await validarLimiteDeUsuarios(supabaseAdmin, empresaId, estado);
        if (!limite.permitido) return respostaErro(limite.mensagem, 409);
      } catch (erroCobranca) {
        console.error('Erro ao validar Premium (vincular usuário):', erroCobranca);
      }
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
          .from('usuarios_contas')
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

      const loginOriginal = normalizarTexto(usuarioFonte.login);
      const email = normalizarTexto(usuarioFonte.email || loginOriginal);

      const { data: vinculoCriado, error: erroVinculo } = await supabaseAdmin
        .from('usuarios_empresa')
        .insert({
          empresa_id: empresaId,
          user_id: userId,
          nome: usuarioFonte.nome || loginOriginal || email || 'Usuario',
          email,
          login: null,
          perfil,
          status: 'ativo',
        })
        .select()
        .single();

      if (erroVinculo) {
        console.error('Erro ao vincular usuario existente:', erroVinculo);

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
            'Este usuario ja possui um login cadastrado no sistema. O vinculo nao deve duplicar o login. Atualize a pagina e tente novamente.'
          );
        }

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
