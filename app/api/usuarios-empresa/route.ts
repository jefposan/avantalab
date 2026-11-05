import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { anexarLiberacoesUsuarios } from '@/app/lib/usuarios-empresa-liberacoes';

export async function GET(request: Request) {
  try {
    const empresaId = new URL(request.url).searchParams.get('empresaId') || '';
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(empresaId)) return NextResponse.json({ mensagem: 'Informe um perfil válido.' }, { status: 400 });
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ mensagem: 'Sessão não encontrada.' }, { status: 401 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } });
    const { data: auth, error: erroAuth } = await admin.auth.getUser(token);
    if (erroAuth && (erroAuth.name === 'AuthRetryableFetchError' || erroAuth.status === 0 || (erroAuth.status ?? 0) >= 500)) throw erroAuth;
    if (erroAuth || !auth.user) return NextResponse.json({ mensagem: 'Sessão inválida.' }, { status: 401 });
    const solicitante = await admin.from('usuarios_empresa').select('perfil').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('status', 'ativo').maybeSingle();
    if (solicitante.error) throw solicitante.error;
    if (!solicitante.data || !['gestor_master', 'administrador', 'operador_completo'].includes(solicitante.data.perfil)) return NextResponse.json({ mensagem: 'Você não pode listar os usuários deste perfil.' }, { status: 403 });
    const usuario = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    // A RPC existente define quais usuários e dados de conta podem ser listados.
    const lista = await usuario.rpc('listar_usuarios_empresa_contas_rpc', { p_empresa_id: empresaId });
    if (lista.error) throw lista.error;
    const usuarios = (lista.data || []).filter((u: { perfil: string }) => u.perfil !== 'funcionario_ponto');
    const ids = usuarios.map((u: { id: string }) => u.id);
    const vinculos = ids.length ? await admin.from('usuarios_empresa').select('id,dashboard_liberada,modulos_liberados').eq('empresa_id', empresaId).in('id', ids) : { data: [], error: null };
    if (vinculos.error) throw vinculos.error;
    return NextResponse.json({ usuarios: anexarLiberacoesUsuarios(usuarios, vinculos.data || []) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ mensagem: 'Não foi possível carregar os usuários e suas liberações. Tente novamente.' }, { status: 503 });
  }
}
