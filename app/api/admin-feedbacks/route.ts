import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const tokenRecebido = request.headers
      .get('authorization')
      ?.replace('Bearer ', '')
      .trim();

    const tokenAdmin = process.env.ADMIN_FEEDBACKS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!tokenAdmin) {
      console.error('ADMIN_FEEDBACKS_TOKEN não configurado.');

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Configuração administrativa incompleta.',
        },
        { status: 500 }
      );
    }

    if (!tokenRecebido || tokenRecebido !== tokenAdmin) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Acesso não autorizado.',
        },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Configuração do Supabase Admin incompleta.');

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Configuração do Supabase incompleta.',
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .select(
        `
        id,
        empresa_id,
        usuario_id,
        acesso_id,
        nome_empresa,
        nome_usuario,
        email_usuario,
        tipo,
        mensagem,
        status,
        created_at
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar feedbacks administrativos:', error);

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Não foi possível carregar os feedbacks.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      erro: false,
      feedbacks: data || [],
    });
  } catch (error) {
    console.error('Erro geral na rota admin-feedbacks:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Erro inesperado ao carregar feedbacks.',
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const tokenRecebido = request.headers
      .get('authorization')
      ?.replace('Bearer ', '')
      .trim();

    const tokenAdmin = process.env.ADMIN_FEEDBACKS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!tokenAdmin) {
      console.error('ADMIN_FEEDBACKS_TOKEN não configurado.');

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Configuração administrativa incompleta.',
        },
        { status: 500 }
      );
    }

    if (!tokenRecebido || tokenRecebido !== tokenAdmin) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Acesso não autorizado.',
        },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Configuração do Supabase Admin incompleta.');

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Configuração do Supabase incompleta.',
        },
        { status: 500 }
      );
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'ID e status são obrigatórios.',
        },
        { status: 400 }
      );
    }

    if (!['novo', 'em_analise', 'respondido', 'arquivado'].includes(status)) {
      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Status inválido.',
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status do feedback:', error);

      return NextResponse.json(
        {
          erro: true,
          mensagem: 'Não foi possível atualizar o feedback.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      erro: false,
      feedback: data,
    });
  } catch (error) {
    console.error('Erro geral ao atualizar feedback:', error);

    return NextResponse.json(
      {
        erro: true,
        mensagem: 'Erro inesperado ao atualizar feedback.',
      },
      { status: 500 }
    );
  }
}