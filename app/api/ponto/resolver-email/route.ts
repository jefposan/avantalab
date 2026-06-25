import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function soDigitos(v: string) {
  return String(v || '').replace(/\D/g, '');
}

// Recebe o CPF e devolve o e-mail interno do funcionário de ponto correspondente.
// Login único em /ponto: o CPF é único globalmente, então resolve a empresa sem ambiguidade.
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ erro: true }, { status: 500 });
    }

    const corpo = await request.json().catch(() => ({}));
    const cpf = soDigitos(corpo.cpf || '');
    if (cpf.length !== 11) {
      return NextResponse.json({ erro: true, mensagem: 'CPF inválido.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('email')
      .eq('login', cpf)
      .eq('perfil', 'funcionario_ponto')
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();

    // Resposta genérica para não vazar se um CPF existe ou não.
    if (error || !data || !data.email) {
      return NextResponse.json({ erro: true, mensagem: 'CPF ou senha inválidos.' }, { status: 404 });
    }

    return NextResponse.json({ erro: false, email: data.email });
  } catch (error) {
    console.error('Erro ao resolver e-mail do funcionário de ponto:', error);
    return NextResponse.json({ erro: true, mensagem: 'Erro ao validar o acesso.' }, { status: 500 });
  }
}
