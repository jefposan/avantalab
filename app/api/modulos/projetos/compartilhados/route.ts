import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listarProjetosCompartilhados } from '@/app/lib/projetos-compartilhados-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anon || !service) return NextResponse.json({ erro: true, mensagem: 'Serviço indisponível.' }, { status: 500 });
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const { data: auth, error: authError } = await createClient(url, anon).auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const db = createClient(url, service);
  try {
    const projetos = await listarProjetosCompartilhados(db, auth.user.id);
    const empresaId = String(new URL(request.url).searchParams.get('empresaId') || '').trim();
    let contexto = { id: empresaId, nome: 'Projetos compartilhados', corPrimaria: '#003E73', temaEscuro: false };
    if (empresaId) {
      const { data: membership } = await db.from('usuarios_empresa').select('id').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('status', 'ativo').limit(1).maybeSingle();
      if (membership) {
        const [{ data: company }, { data: config }] = await Promise.all([
          db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
          db.from('configuracoes').select('cor_primaria,dark_mode').eq('empresa_id', empresaId).maybeSingle(),
        ]);
        contexto = {
          id: empresaId,
          nome: company?.nome || 'Perfil empresarial',
          corPrimaria: config?.cor_primaria || '#003E73',
          temaEscuro: config?.dark_mode === true,
        };
      }
    }
    return NextResponse.json({ projetos, contexto }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ erro: true, mensagem: error instanceof Error ? error.message : 'Não foi possível carregar os projetos compartilhados.' }, { status: 500 });
  }
}
