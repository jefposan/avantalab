import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { anexarLiberacoesUsuarios } from '@/app/lib/usuarios-empresa-liberacoes';
import { podeRedefinirSenhaEquipe } from '../../lib/usuarios-senha-equipe';

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
    const atorSenha = { userId: auth.user.id, perfil: solicitante.data.perfil, empresaId };
    const usuario = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    // A RPC existente define quais usuários e dados de conta podem ser listados.
    const lista = await usuario.rpc('listar_usuarios_empresa_contas_rpc', { p_empresa_id: empresaId });
    if (lista.error) throw lista.error;
    const usuarios = (lista.data || []).filter((u: { perfil: string }) => u.perfil !== 'funcionario_ponto') as { id: string; user_id?: string; empresa_id?: string; perfil: string; status?: string }[];
    const ids = usuarios.map((u: { id: string }) => u.id);
    const vinculos = ids.length ? await admin.from('usuarios_empresa').select('id,dashboard_liberada,modulos_liberados').eq('empresa_id', empresaId).in('id', ids) : { data: [], error: null };
    if (vinculos.error) throw vinculos.error;
    const userIds: string[] = ['gestor_master', 'administrador'].includes(atorSenha.perfil) ? [...new Set<string>(usuarios.map(u => u.user_id).filter((id): id is string => typeof id === 'string' && Boolean(id)))] : [];
    // Apresentação apenas: o POST repete todas as conferências e valida o Auth.
    // Falha desta consulta não bloqueia a edição de nome/acessos; só oculta senha.
    const [contas, acessosGlobais] = userIds.length ? await Promise.all([
      admin.from('usuarios_contas').select('user_id,origem,empresa_origem_id').in('user_id', userIds),
      admin.from('usuarios_empresa').select('user_id,empresa_id,perfil,status').in('user_id', userIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    const listaComAcessos = anexarLiberacoesUsuarios(usuarios, vinculos.data || []);
    return NextResponse.json({ usuarios: listaComAcessos.map(u => ({
      ...u,
      pode_redefinir_senha: !contas.error && !acessosGlobais.error && podeRedefinirSenhaEquipe(
        atorSenha, u,
        contas.data?.find(c => c.user_id === u.user_id), acessosGlobais.data || [],
      ),
    })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ mensagem: 'Não foi possível carregar os usuários e suas liberações. Tente novamente.' }, { status: 503 });
  }
}
