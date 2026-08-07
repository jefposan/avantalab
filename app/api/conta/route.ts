import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { criarSupabaseAdmin } from '../../lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

async function autenticar(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) return { erroResposta: erro('Configuração do servidor incompleta.', 500) };
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { erroResposta: erro('Sessão inválida.', 401) };
  const cliente = createClient(supabaseUrl, anonKey);
  const { data, error } = await cliente.auth.getUser(token);
  if (error || !data.user) return { erroResposta: erro('Sessão inválida.', 401) };
  return { usuario: data.user, db: criarSupabaseAdmin() };
}

// O login continua válido. Esta consulta só oferece ao próprio usuário um
// perfil que ele excluiu e que ainda está no período de restauração.
export async function GET(request: Request) {
  const acesso = await autenticar(request);
  if ('erroResposta' in acesso) return acesso.erroResposta;
  const { data, error } = await acesso.db.rpc('listar_perfis_excluidos_para_usuario', {
    p_usuario_id: acesso.usuario.id,
  });
  if (error) {
    console.error('Falha ao listar perfis excluídos:', error);
    return erro('Não foi possível consultar os perfis disponíveis para restauração.', 500);
  }
  return NextResponse.json({ ok: true, perfis: data || [] });
}

// Mantemos o caminho /api/conta por compatibilidade com o PWA já publicado,
// mas a operação agora exclui exclusivamente o perfil informado, jamais Auth.
export async function DELETE(request: Request) {
  const acesso = await autenticar(request);
  if ('erroResposta' in acesso) return acesso.erroResposta;
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  if (!empresaId) return erro('Perfil inválido.', 400);
  if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'EXCLUIR') {
    return erro('Confirmação inválida.', 400);
  }

  const { data, error } = await acesso.db.rpc('excluir_perfil_com_retencao', {
    p_empresa_id: empresaId,
    p_usuario_id: acesso.usuario.id,
    p_confirmacao: 'EXCLUIR',
  });
  if (error) {
    console.error('Falha ao excluir perfil:', error);
    const conflito = /outros usuários|Gestor Master|já está em processo/i.test(error.message || '');
    return erro(error.message || 'Não foi possível excluir este perfil.', conflito ? 409 : 500);
  }
  const resultado = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    perfilNome: resultado?.nome_perfil || null,
    restaurarAte: resultado?.restaurar_ate || null,
  });
}

export async function POST(request: Request) {
  const acesso = await autenticar(request);
  if ('erroResposta' in acesso) return acesso.erroResposta;
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  if (!empresaId) return erro('Perfil inválido.', 400);

  const { data, error } = await acesso.db.rpc('restaurar_perfil_excluido', {
    p_empresa_id: empresaId,
    p_usuario_id: acesso.usuario.id,
  });
  if (error) {
    console.error('Falha ao restaurar perfil:', error);
    return erro(error.message || 'Não foi possível restaurar este perfil.', 409);
  }
  const resultado = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, perfilNome: resultado?.nome_perfil || null });
}
