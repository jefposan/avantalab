import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { criarClienteAsaas, criarAssinaturaAsaas, listarCobrancasAssinaturaAsaas } from '../../../lib/asaas';
import { PRECOS, type PlanoPago, type Ciclo } from '../../../lib/cobranca';

export const runtime = 'nodejs';

function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Inicia a assinatura: cria (ou reaproveita) o cliente na Asaas, cria a
// assinatura recorrente e devolve o link de pagamento (invoiceUrl).
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const plano = String(corpo.plano || '') as PlanoPago;
  const ciclo = String(corpo.ciclo || '') as Ciclo;
  if (!empresaId || !(plano in PRECOS) || (ciclo !== 'mensal' && ciclo !== 'anual')) {
    return NextResponse.json({ erro: true, mensagem: 'dados inválidos' }, { status: 400 });
  }

  // 1) Autentica o usuário e pega o e-mail.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true }, { status: 401 });
  let userId = '';
  let userEmail = '';
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ erro: true }, { status: 401 });
    userId = data.user.id;
    userEmail = data.user.email || '';
  } catch {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRole);

  // 2) Confirma vínculo e carrega dados do perfil.
  const { data: vinculo } = await admin
    .from('usuarios_empresa').select('id').eq('user_id', userId).eq('empresa_id', empresaId).limit(1).maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });

  const { data: emp } = await admin
    .from('empresas').select('nome, tipo_perfil').eq('id', empresaId).maybeSingle();
  const nomePerfil = emp?.nome || 'Cliente AvantaLab';
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

  // 3) Reaproveita o cliente Asaas se já houver; senão cria.
  const { data: assinExistente } = await admin
    .from('assinaturas').select('gateway_customer_id').eq('empresa_id', empresaId).maybeSingle();

  let clienteId = assinExistente?.gateway_customer_id || '';
  if (!clienteId) {
    const c = await criarClienteAsaas({ name: nomePerfil, email: userEmail || undefined, externalReference: empresaId });
    if (!c.ok || !c.data?.id) return NextResponse.json({ erro: true, mensagem: c.erro || 'falha ao criar cliente' }, { status: 502 });
    clienteId = c.data.id;
  }

  // 4) Cria a assinatura recorrente. billingType UNDEFINED = cliente escolhe
  //    (Pix/cartão/boleto) e informa os dados dele na página da Asaas.
  const valor = PRECOS[plano][ciclo];
  const a = await criarAssinaturaAsaas({
    customer: clienteId,
    billingType: 'UNDEFINED',
    value: valor,
    nextDueDate: hojeSaoPaulo(),
    cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
    description: `AvantaLab — ${plano} (${ciclo})`,
    externalReference: empresaId,
  });
  if (!a.ok || !a.data?.id) return NextResponse.json({ erro: true, mensagem: a.erro || 'falha ao criar assinatura' }, { status: 502 });
  const assinaturaGwId = a.data.id;

  // 5) Pega o link de pagamento da primeira cobrança.
  let invoiceUrl = '';
  const pgs = await listarCobrancasAssinaturaAsaas(assinaturaGwId);
  if (pgs.ok && pgs.data?.data?.length) invoiceUrl = pgs.data.data[0].invoiceUrl || '';

  // 6) Guarda os identificadores no nosso banco (status vira 'ativa' via webhook).
  const base = {
    empresa_id: empresaId,
    tipo_perfil: tipoPerfil,
    plano,
    ciclo,
    gateway: 'asaas',
    gateway_customer_id: clienteId,
    gateway_subscription_id: assinaturaGwId,
    atualizado_em: new Date().toISOString(),
  };
  if (assinExistente) {
    await admin.from('assinaturas').update(base).eq('empresa_id', empresaId);
  } else {
    // Novo registro aguardando pagamento (bloqueado até o webhook confirmar).
    await admin.from('assinaturas').insert({ ...base, status: 'expirada' });
  }

  return NextResponse.json({ ok: true, invoiceUrl, assinaturaId: assinaturaGwId });
}
