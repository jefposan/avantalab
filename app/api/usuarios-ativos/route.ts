import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { erro: true, mensagem: 'Configuracao do servidor incompleta.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { count, error } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ativo');

    if (error) {
      console.error('Erro ao contar usuarios ativos:', error);

      return NextResponse.json(
        { erro: true, mensagem: 'Nao foi possivel contar usuarios ativos.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { total: count || 0 },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Erro inesperado ao contar usuarios ativos:', error);

    return NextResponse.json(
      { erro: true, mensagem: 'Erro inesperado ao contar usuarios ativos.' },
      { status: 500 }
    );
  }
}
