import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, TRIAL_DIAS } from '../../../lib/cobranca';

export const runtime = 'nodejs';

// Define como começa a cobrança de um perfil EMPRESA recém-criado:
//   modo 'trial'   → 7 dias grátis (status 'trial', trial_fim = agora + TRIAL_DIAS).
//   modo 'assinar' → já bloqueado (status 'expirada') → cai direto no paywall.
//
// Só age quando COBRANCA_ATIVA. Com a flag desligada é no-op (não grava nada,
// mantém o comportamento atual em produção). Grava uma linha em `assinaturas`,
// que tem precedência sobre a derivação padrão no resolverEstadoAcesso.
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  // Flag desligada → nada a fazer (não altera o fluxo atual).
  if (!COBRANCA_ATIVA) return NextResponse.json({ ok: true, ignorado: true });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const modo = corpo.modo === 'assinar' ? 'assinar' : 'trial';
  if (!empresaId) return NextResponse.json({ erro: true, mensagem: 'empresaId ausente' }, { status: 400 });

  // 1) Autentica o usuário.
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

  const admin = createClient(supabaseUrl, serviceRole);

  // 2) Confirma o vínculo do usuário com o perfil.
  const { data: vinculo } = await admin
    .from('usuarios_empresa').select('id').eq('user_id', userId).eq('empresa_id', empresaId).limit(1).maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });

  // 3) Só perfis EMPRESA entram nesse fluxo (pessoal tem núcleo grátis).
  const { data: emp } = await admin
    .from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle();
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  if (tipoPerfil !== 'empresa') return NextResponse.json({ ok: true, ignorado: true });

  // 4) Se já existe assinatura (ex.: cupom já aplicado), não sobrescreve.
  const { data: existente } = await admin
    .from('assinaturas').select('status').eq('empresa_id', empresaId).maybeSingle();
  if (existente) return NextResponse.json({ ok: true, jaExiste: true, status: existente.status });

  // 5) Grava o estado inicial escolhido.
  let trialFim: string | null = null;
  let status = 'expirada';
  if (modo === 'trial') {
    const fim = new Date();
    fim.setDate(fim.getDate() + TRIAL_DIAS);
    trialFim = fim.toISOString();
    status = 'trial';
  }

  await admin.from('assinaturas').insert({
    empresa_id: empresaId,
    tipo_perfil: 'empresa',
    status,
    trial_fim: trialFim,
    valido_ate: null,
    gateway: 'asaas',
    atualizado_em: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, modo, status });
}
