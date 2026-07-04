import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Verifica se o módulo Controle de Ponto está ativo para a empresa informada.
// Usado pelo app do funcionário (/ponto) para bloquear sessões já abertas
// quando o gestor remove (desativa) o módulo. Não expõe nenhum dado sensível:
// devolve apenas { ativo: boolean }.
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ erro: true }, { status: 500 });
    }

    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId || '').trim();
    if (!empresaId) {
      return NextResponse.json({ erro: true, mensagem: 'Empresa não informada.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabaseAdmin
      .from('empresa_modulos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('modulo_id', 'ponto')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Em caso de erro de leitura, não bloqueia (fail-open) para evitar
      // travar funcionários por instabilidade momentânea do banco.
      console.error('Erro ao verificar acesso ao ponto:', error);
      return NextResponse.json({ ativo: true, indeterminado: true });
    }

    return NextResponse.json({ ativo: Boolean(data) });
  } catch (error) {
    console.error('Erro inesperado ao verificar acesso ao ponto:', error);
    return NextResponse.json({ ativo: true, indeterminado: true });
  }
}
