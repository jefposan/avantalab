import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
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

    // Verifica sessão do usuário
    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: erroUsuario,
    } = await supabaseUsuario.auth.getUser();

    if (erroUsuario || !user) {
      return respostaErro('Usuario autenticado nao encontrado.', 401);
    }

    const corpo = await request.json();
    const empresaId = String(corpo.empresaId || '').trim();
    const nome = String(corpo.nome || '').trim();
    const tipoPerfilSolicitado = corpo.tipoPerfil === 'pessoal'
      ? 'pessoal'
      : corpo.tipoPerfil === 'empresa'
        ? 'empresa'
        : null;

    if (!empresaId) return respostaErro('ID do perfil financeiro nao informado.');
    if (!nome) return respostaErro('Nome do perfil financeiro nao pode ser vazio.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verifica permissão: deve ser gestor_master ou administrador desta empresa
    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id, perfil, status')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();

    if (erroPermissao) {
      console.error('Erro ao validar permissao:', erroPermissao);
      return respostaErro('Nao foi possivel validar sua permissao.', 500);
    }

    if (!permissao) {
      return respostaErro('Voce nao tem permissao para editar este perfil financeiro.', 403);
    }

    const { data: empresaAtual, error: erroEmpresaAtual } = await supabaseAdmin
      .from('empresas')
      .select('tipo_perfil, assinatura_origem_empresa_id')
      .eq('id', empresaId)
      .maybeSingle();
    if (erroEmpresaAtual || !empresaAtual) {
      return respostaErro('Nao foi possivel localizar o perfil financeiro.', 404);
    }
    const tipoPerfil = tipoPerfilSolicitado || (empresaAtual.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa');

    if (tipoPerfil !== empresaAtual.tipo_perfil) {
      const agora = new Date();
      if (empresaAtual.assinatura_origem_empresa_id) {
        const { data: origem } = await supabaseAdmin
          .from('assinaturas')
          .select('plano, status, trial_fim, valido_ate')
          .eq('empresa_id', empresaAtual.assinatura_origem_empresa_id)
          .maybeSingle();
        const origemEmpresarial = origem?.plano === 'business'
          || origem?.plano === 'business_pro'
          || origem?.plano === 'empresa';
        if (!origemEmpresarial) {
          return respostaErro('O tipo deste perfil nao pode ser alterado enquanto ele utiliza uma assinatura Pessoal compartilhada.', 409);
        }
      } else {
        const [{ data: assinatura }, { data: assinaturaLoja }] = await Promise.all([
          supabaseAdmin
            .from('assinaturas')
            .select('status, trial_fim, valido_ate, gateway_subscription_id')
            .eq('empresa_id', empresaId)
            .maybeSingle(),
          supabaseAdmin
            .from('assinaturas_loja')
            .select('status, valido_ate')
            .eq('user_id', user.id)
            .eq('loja', 'apple_app_store')
            .eq('entitlement_id', 'pessoal_premium')
            .maybeSingle(),
        ]);
        const acessoLocalVigente = assinatura?.status === 'ativa'
          || (assinatura?.status === 'trial' && !!assinatura.trial_fim && new Date(assinatura.trial_fim) > agora)
          || (assinatura?.status === 'cortesia' && (!assinatura.valido_ate || new Date(assinatura.valido_ate) > agora))
          || ((assinatura?.status === 'cancelada' || assinatura?.status === 'inadimplente')
            && !!assinatura.valido_ate && new Date(assinatura.valido_ate) > agora);
        const acessoAppleVigente = empresaAtual.tipo_perfil === 'pessoal'
          && !!assinaturaLoja?.valido_ate
          && ['ativa', 'cancelada', 'inadimplente'].includes(assinaturaLoja.status || '')
          && new Date(assinaturaLoja.valido_ate) > agora;
        if (acessoLocalVigente || acessoAppleVigente || assinatura?.gateway_subscription_id) {
          return respostaErro('O tipo do perfil nao pode ser alterado enquanto houver uma assinatura vigente ou vinculada.', 409);
        }
      }
    }

    // Atualiza o perfil financeiro com service role (bypassa RLS).
    const { data: empresaAtualizada, error: erroAtualizar } = await supabaseAdmin
      .from('empresas')
      .update({ nome, tipo_perfil: tipoPerfil })
      .eq('id', empresaId)
      .select()
      .single();

    if (erroAtualizar) {
      console.error('Erro ao atualizar empresa:', erroAtualizar);
      return respostaErro(
        erroAtualizar.message || 'Nao foi possivel atualizar o perfil financeiro.',
        500
      );
    }

    return NextResponse.json({ erro: false, empresa: empresaAtualizada });
  } catch (error) {
    console.error('Erro inesperado ao atualizar empresa:', error);
    return respostaErro('Erro inesperado ao atualizar perfil financeiro.', 500);
  }
}
