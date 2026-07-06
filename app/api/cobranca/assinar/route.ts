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
  const cpfCnpj = String(corpo.cpfCnpj || '').replace(/\D/g, ''); // só dígitos
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
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('user_id', userId)
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });
  if (!['gestor_master', 'administrador'].includes(vinculo.perfil || '')) {
    return NextResponse.json({ erro: true, mensagem: 'Somente gestores e administradores podem contratar um plano.' }, { status: 403 });
  }

  const { data: emp } = await admin
    .from('empresas').select('nome, tipo_perfil').eq('id', empresaId).maybeSingle();
  const nomePerfil = emp?.nome || 'Cliente AvantaLab';
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const planoEsperado: PlanoPago = tipoPerfil === 'pessoal' ? 'pessoal_premium' : 'empresa';
  if (plano !== planoEsperado) {
    return NextResponse.json({ erro: true, mensagem: 'O plano informado não corresponde ao tipo deste perfil.' }, { status: 400 });
  }

  // 3) Reaproveita o cliente Asaas se já houver; senão cria.
  const { data: assinExistente } = await admin
    .from('assinaturas')
    .select('status, plano, ciclo, gateway_customer_id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  // Um segundo clique (ou uma repetição de rede) deve reutilizar a cobrança já
  // criada, nunca abrir outra assinatura recorrente para o mesmo perfil.
  if (
    assinExistente?.gateway_subscription_id
    && assinExistente.status !== 'cancelada'
  ) {
    if (assinExistente.plano !== plano || assinExistente.ciclo !== ciclo) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Já existe uma assinatura em andamento para este perfil. Conclua ou cancele essa cobrança antes de trocar o plano.',
      }, { status: 409 });
    }
    const existentes = await listarCobrancasAssinaturaAsaas(assinExistente.gateway_subscription_id);
    const cobranca = existentes.data?.data?.find((item) => item.invoiceUrl) || existentes.data?.data?.[0];
    if (existentes.ok && cobranca?.invoiceUrl) {
      return NextResponse.json({
        ok: true,
        reutilizada: true,
        invoiceUrl: cobranca.invoiceUrl,
        assinaturaId: assinExistente.gateway_subscription_id,
      });
    }
    return NextResponse.json({
      erro: true,
      mensagem: 'A assinatura já foi criada, mas o link de pagamento ainda não está disponível. Aguarde alguns instantes e tente novamente.',
    }, { status: 409 });
  }

  let clienteId = assinExistente?.gateway_customer_id || '';
  if (!clienteId) {
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return NextResponse.json({ erro: true, mensagem: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' }, { status: 400 });
    }
    const c = await criarClienteAsaas({ name: nomePerfil, email: userEmail || undefined, cpfCnpj, externalReference: empresaId });
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
