import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';

// Informa ao app o estado de acesso (trial/ativa/expirada...) de um perfil.
// Exige usuário autenticado e que ele pertença à empresa consultada.
export async function GET(request: Request) {
  const empresaId = (new URL(request.url).searchParams.get('empresaId') || '').trim();
  if (!empresaId) {
    return NextResponse.json({ erro: true, mensagem: 'empresaId ausente' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return NextResponse.json({ erro: true }, { status: 500 });
  }

  // 1) Autentica o usuário pelo token da sessão.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true }, { status: 401 });

  let userId = '';
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ erro: true }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  // 2) Confirma que o usuário pertence à empresa consultada.
  const admin = createClient(supabaseUrl, serviceRole);
  const { data: vinculo } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('user_id', userId)
    .eq('empresa_id', empresaId)
    .limit(1)
    .maybeSingle();
  if (!vinculo) {
    return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });
  }

  // 3) Resolve e devolve o estado.
  const estado = await resolverEstadoAcesso(empresaId);
  return NextResponse.json({ estado });
}
