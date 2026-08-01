import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

async function contexto(request: Request, empresaId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !empresaId) return null;
  const cliente = createClient(url, anon);
  const { data } = await cliente.auth.getUser(token);
  if (!data.user) return null;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vinculo } = await admin.from('usuarios_empresa').select('perfil').eq('empresa_id', empresaId).eq('user_id', data.user.id).in('perfil', ['gestor_master', 'administrador', 'operador_completo']).eq('status', 'ativo').maybeSingle();
  return vinculo ? { admin, userId: data.user.id, perfil: vinculo.perfil } : null;
}

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId') || '';
  const ctx = await contexto(request, empresaId);
  if (!ctx) return NextResponse.json({ erro: true, mensagem: 'Acesso permitido apenas a gestores, administradores e operadores completos.' }, { status: 403 });
  const { data, error } = await ctx.admin.from('pontos_restauracao').select('id,nome,origem,criado_por,schema_versao,tamanho_bytes,criado_em').eq('empresa_id', empresaId).order('criado_em', { ascending: false });
  if (error) return NextResponse.json({ erro: true, mensagem: error.message }, { status: 500 });
  return NextResponse.json({ pontos: data || [] });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '');
  const ctx = await contexto(request, empresaId);
  if (!ctx) return NextResponse.json({ erro: true, mensagem: 'Acesso permitido apenas a gestores, administradores e operadores completos.' }, { status: 403 });
  if (corpo.acao === 'criar' || corpo.acao === 'criar_pre') {
    const { data, error } = await ctx.admin.rpc('criar_ponto_restauracao', { p_empresa_id: empresaId, p_origem: corpo.acao === 'criar_pre' ? 'pre_acao_destrutiva' : 'manual', p_criado_por: ctx.userId, p_nome: String(corpo.nome || '') });
    if (error) return NextResponse.json({ erro: true, mensagem: error.message }, { status: 500 });
    return NextResponse.json({ id: data });
  }
  if (corpo.acao === 'restaurar') {
    if (ctx.perfil !== 'gestor_master') return NextResponse.json({ erro: true, mensagem: 'Somente o Gestor Master pode restaurar um ponto.' }, { status: 403 });
    if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'RESTAURAR') return NextResponse.json({ erro: true, mensagem: 'Digite RESTAURAR para confirmar.' }, { status: 400 });
    const { data, error } = await ctx.admin.rpc('restaurar_ponto_restauracao', { p_ponto_id: String(corpo.pontoId || ''), p_criado_por: ctx.userId });
    if (error) return NextResponse.json({ erro: true, mensagem: error.message }, { status: 500 });
    return NextResponse.json({ pontoSegurancaId: data });
  }
  return NextResponse.json({ erro: true, mensagem: 'Ação inválida.' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId') || ''; const pontoId = url.searchParams.get('pontoId') || '';
  const ctx = await contexto(request, empresaId);
  if (!ctx) return NextResponse.json({ erro: true, mensagem: 'Acesso permitido apenas a gestores, administradores e operadores completos.' }, { status: 403 });
  if (ctx.perfil !== 'gestor_master') return NextResponse.json({ erro: true, mensagem: 'Somente o Gestor Master pode excluir um ponto.' }, { status: 403 });
  const { error } = await ctx.admin.from('pontos_restauracao').delete().eq('id', pontoId).eq('empresa_id', empresaId);
  if (error) return NextResponse.json({ erro: true, mensagem: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
