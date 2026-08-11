import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respostaErro('Configuração do servidor incompleta.', 500);
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return respostaErro('Sua sessão expirou. Entre novamente.', 401);

  const clienteUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: autenticacao, error: erroAutenticacao } = await clienteUsuario.auth.getUser(token);
  if (erroAutenticacao || !autenticacao.user) {
    return respostaErro('Sua sessão expirou. Entre novamente.', 401);
  }

  const corpo = await request.json().catch(() => ({}));
  if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'EXCLUIR') {
    return respostaErro('Confirmação de segurança inválida.', 400);
  }

  const { data, error } = await clienteUsuario.rpc('excluir_conta_avantavendas_rpc', {
    p_confirmacao: 'EXCLUIR',
  });
  if (error) {
    console.error('Falha ao excluir a conta do AvantaVendas:', error);
    return respostaErro(error.message || 'Não foi possível excluir a conta do Vendas.', 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const uploads = Array.isArray(data?.uploads_para_excluir)
    ? data.uploads_para_excluir.filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
    : [];

  for (let inicio = 0; inicio < uploads.length; inicio += 100) {
    const { error: erroStorage } = await admin.storage
      .from('vendas-produtos')
      .remove(uploads.slice(inicio, inicio + 100));
    if (erroStorage) {
      console.error('Conta do Vendas excluída, mas a limpeza de uploads precisa ser repetida:', erroStorage);
      return respostaErro('A conta foi excluída, mas alguns arquivos ainda estão sendo removidos. Tente novamente.', 503);
    }
  }

  return NextResponse.json({
    ok: true,
    excluido: data?.excluido === true,
    contasExcluidas: Number(data?.contas_excluidas || 0),
    contasTransferidas: Number(data?.contas_transferidas || 0),
    loginAvantaLabPreservado: data?.login_avantalab_preservado === true,
    gestaoPreservado: data?.gestao_preservado === true,
    historicoFinanceiroPreservado: data?.historico_financeiro_preservado === true,
  });
}
