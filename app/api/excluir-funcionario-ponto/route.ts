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
      return respostaErro('Configuração do servidor incompleta.', 500);
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return respostaErro('Sessão não encontrada.', 401);

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: erroUsuario } = await supabaseUsuario.auth.getUser();
    if (erroUsuario || !user) return respostaErro('Usuário autenticado não encontrado.', 401);

    const corpo = await request.json();
    const empresaId = String(corpo.empresaId || '').trim();
    const funcionarioUserId = String(corpo.funcionarioUserId || '').trim();

    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!funcionarioUserId) return respostaErro('Funcionário não informado.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Quem chama precisa ser gestor/admin da empresa
    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();
    if (erroPermissao) return respostaErro('Não foi possível validar sua permissão.', 500);
    if (!permissao) return respostaErro('Você não tem permissão para inativar funcionários.', 403);

    // Mantido apenas como proteção para integrações antigas: a exclusão física
    // foi descontinuada para preservar o histórico de ponto.
    const { data: alvo, error: erroAlvo } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', funcionarioUserId)
      .eq('perfil', 'funcionario_ponto')
      .maybeSingle();
    if (erroAlvo) return respostaErro('Não foi possível localizar o funcionário.', 500);
    if (!alvo) return respostaErro('Funcionário não encontrado nesta empresa.', 404);

    return respostaErro('A exclusão de funcionários de ponto foi desativada. Use a inativação para preservar o histórico.', 409);
  } catch (error) {
    console.error('Erro ao proteger exclusão de funcionário de ponto:', error);
    return respostaErro('Erro inesperado ao proteger o histórico.', 500);
  }
}
