import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { garantirFixasDoMesAtual } from '@/app/lib/database';
import { liberacoesDoVinculo } from '@/app/lib/acessos-usuario';

// Manutenção já existente do mês corrente/próximo. O histórico de referência
// permanece no servidor; nenhum lançamento histórico é transferido ao app.
export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return NextResponse.json({ erro: true }, { status: 401 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
    });
    const { data: auth, error } = await db.auth.getUser();
    if (error || !auth.user) return NextResponse.json({ erro: true }, { status: 401 });
    const { empresaId } = await request.json();
    if (typeof empresaId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empresaId)) return NextResponse.json({ erro: true }, { status: 400 });
    const { data: acesso, error: erroAcesso } = await db.from('usuarios_empresa')
      .select('perfil,dashboard_liberada,modulos_liberados').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('status', 'ativo').maybeSingle();
    if (erroAcesso) return NextResponse.json({ erro: true }, { status: 503 });
    if (!acesso || !['gestor_master', 'administrador', 'operador_completo'].includes(acesso.perfil) || !liberacoesDoVinculo(acesso).dashboard) return NextResponse.json({ erro: true }, { status: 403 });
    // Cliente do próprio usuário: a manutenção não ganha privilégios de service role.
    await garantirFixasDoMesAtual(empresaId, 1, db);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ erro: true }, { status: 503 }); }
}
