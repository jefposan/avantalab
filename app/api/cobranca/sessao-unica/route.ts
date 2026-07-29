import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, assinaturaVigente } from '../../../lib/cobranca';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';
import { normalizarPlanoComercial } from '../../../lib/planos-comerciais';

export const runtime = 'nodejs';

// No Business, o login atual revoga os refresh tokens das demais sessões do
// mesmo usuário. O Business Pro não passa por este fluxo.
export async function POST(request: Request) {
  if (!COBRANCA_ATIVA) return NextResponse.json({ ok: true, ignorado: true });
  const empresaId = String((await request.json().catch(() => ({}))).empresaId || '').trim();
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!empresaId || !token || !url || !anon || !service) return NextResponse.json({ erro: true }, { status: 400 });
  const publico = createClient(url, anon);
  const { data: auth, error } = await publico.auth.getUser(token);
  if (error || !auth.user) return NextResponse.json({ erro: true }, { status: 401 });
  const admin = createClient(url, service);
  const { data: vinculo } = await admin.from('usuarios_empresa').select('id').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('status', 'ativo').maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true }, { status: 403 });
  const estado = await resolverEstadoAcesso(empresaId);
  if (!estado || !assinaturaVigente(estado) || normalizarPlanoComercial(estado.plano) !== 'business') {
    return NextResponse.json({ ok: true, ignorado: true });
  }
  const { error: revogarErro } = await admin.auth.admin.signOut(token, 'others');
  if (revogarErro) return NextResponse.json({ erro: true, mensagem: 'Não foi possível encerrar as sessões anteriores.' }, { status: 502 });
  return NextResponse.json({ ok: true, encerradas: true });
}
