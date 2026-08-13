import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA } from '../../../lib/cobranca';
import { resolverDireitoDePerfisDoPerfil } from '../../../lib/cobranca-servidor';

export const runtime = 'nodejs';

// Informa a franquia da conta antes da criação de um perfil. Não expõe dados
// de cobrança: apenas plano, quantidade usada e vagas disponíveis.
export async function GET(request: Request) {
  if (!COBRANCA_ATIVA) return NextResponse.json({ ativo: false, compartilhaAcesso: false });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const empresaId = new URL(request.url).searchParams.get('empresaId') || null;
  if (!url || !anon || !service || !token) return NextResponse.json({ erro: true }, { status: 401 });
  const cliente = createClient(url, anon);
  const { data: auth, error } = await cliente.auth.getUser(token);
  if (error || !auth.user) return NextResponse.json({ erro: true }, { status: 401 });
  const direito = await resolverDireitoDePerfisDoPerfil(createClient(url, service), auth.user.id, empresaId);
  const disponiveis = Math.max(0, direito.limite - direito.usados);
  return NextResponse.json({
    ativo: true,
    plano: direito.plano,
    usados: direito.usados,
    limite: direito.limite,
    disponiveis,
    compartilhaAcesso: direito.origemEmpresaId !== null && disponiveis > 0,
  });
}
