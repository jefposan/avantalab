import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, TRIAL_DIAS } from '../../../lib/cobranca';

export const runtime = 'nodejs';

// Define como começa a cobrança de um perfil EMPRESA recém-criado:
//   modo 'trial'   → teste de 7 dias exclusivo do Business Pro.
//   modo 'assinar' → não grava assinatura; o paywall orienta a contratação.
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
    .from('empresas').select('tipo_perfil, assinatura_origem_empresa_id').eq('id', empresaId).maybeSingle();
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  if (tipoPerfil !== 'empresa') return NextResponse.json({ ok: true, ignorado: true });
  if (emp?.assinatura_origem_empresa_id) {
    return NextResponse.json({ ok: true, ignorado: true, compartilhado: true });
  }

  // 4) Assinar agora é apenas uma intenção de navegação, nunca um bloqueio
  // persistido. A assinatura passa a existir somente após a contratação.
  if (modo === 'assinar') return NextResponse.json({ ok: true, modo, ignorado: true });

  // 5) O teste pode ser iniciado uma única vez. Exceção: perfis criados pela
  // versão anterior com "assinar" ganhavam um registro business/expirada sem
  // cobrança; eles podem corrigir essa escolha e iniciar o teste.
  const { data: existente } = await admin
    .from('assinaturas')
    .select('status, plano, trial_fim, valido_ate, gateway_customer_id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  const registroLegadoSemCobranca = existente
    && existente.status === 'expirada'
    && existente.plano === 'business'
    && !existente.trial_fim
    && !existente.valido_ate
    && !existente.gateway_customer_id
    && !existente.gateway_subscription_id;
  if (existente && !registroLegadoSemCobranca) return NextResponse.json({ ok: true, jaExiste: true, status: existente.status });

  // 6) Grava o teste do Business Pro.
  const fim = new Date();
  fim.setDate(fim.getDate() + TRIAL_DIAS);
  const trialFim = fim.toISOString();
  const status = 'trial';
  const plano = 'business_pro';

  const dadosTrial = {
    empresa_id: empresaId,
    tipo_perfil: 'empresa',
    plano,
    status,
    trial_fim: trialFim,
    valido_ate: null,
    gateway: 'asaas',
    atualizado_em: new Date().toISOString(),
  };
  const { error: erroGravacao } = registroLegadoSemCobranca
    ? await admin.from('assinaturas').update(dadosTrial).eq('empresa_id', empresaId)
    : await admin.from('assinaturas').insert(dadosTrial);
  if (erroGravacao) return NextResponse.json({ erro: true, mensagem: 'Não foi possível iniciar o período de teste.' }, { status: 500 });

  return NextResponse.json({ ok: true, modo: 'trial', status, trialFim });
}
