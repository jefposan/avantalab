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

    if (!empresaId) return respostaErro('ID da empresa nao informado.');
    if (!nome) return respostaErro('Nome da empresa nao pode ser vazio.');

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
      return respostaErro('Voce nao tem permissao para editar esta empresa.', 403);
    }

    // Atualiza nome da empresa com service role (bypassa RLS)
    const { data: empresaAtualizada, error: erroAtualizar } = await supabaseAdmin
      .from('empresas')
      .update({ nome })
      .eq('id', empresaId)
      .select()
      .single();

    if (erroAtualizar) {
      console.error('Erro ao atualizar empresa:', erroAtualizar);
      return respostaErro(
        erroAtualizar.message || 'Nao foi possivel atualizar a empresa.',
        500
      );
    }

    return NextResponse.json({ erro: false, empresa: empresaAtualizada });
  } catch (error) {
    console.error('Erro inesperado ao atualizar empresa:', error);
    return respostaErro('Erro inesperado ao atualizar empresa.', 500);
  }
}
