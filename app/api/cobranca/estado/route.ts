import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';
import { precisaPaywallEmpresa, PRECOS } from '../../../lib/cobranca';
import { listarCobrancasAssinaturaAsaas } from '../../../lib/asaas';

export const runtime = 'nodejs';
const STATUS_FATURA_PAGAVEL = new Set(['PENDING', 'OVERDUE']);

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

  // 3) Resolve e devolve o estado. `precisaPaywall` é calculado no servidor
  //    (já considera a flag COBRANCA_ATIVA) — usado pelo app mobile.
  const estado = await resolverEstadoAcesso(empresaId);
  let faturaPendente: { invoiceUrl: string; valor: number | null; vencimento: string | null; status: string | null } | null = null;
  const { data: assinatura } = await admin
    .from('assinaturas')
    .select('id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (assinatura?.gateway_subscription_id) {
    const cobrancas = await listarCobrancasAssinaturaAsaas(assinatura.gateway_subscription_id);
    const cobranca = cobrancas.ok
      ? (cobrancas.data?.data || []).find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''))
      : null;
    if (cobranca?.invoiceUrl) {
      faturaPendente = {
        invoiceUrl: cobranca.invoiceUrl,
        valor: cobranca.value === null || cobranca.value === undefined ? null : Number(cobranca.value),
        vencimento: cobranca.dueDate || null,
        status: cobranca.status || null,
      };
    }
  }

  if (!assinatura?.gateway_subscription_id) {
    const { data: faturas } = await admin
    .from('assinatura_faturas')
    .select('invoice_url, valor, vencimento, status, atualizado_em')
    .eq('empresa_id', empresaId)
    .not('invoice_url', 'is', null)
    .order('atualizado_em', { ascending: false })
    .limit(8);
    const fatura = (faturas || []).find((item) => item.invoice_url && STATUS_FATURA_PAGAVEL.has(item.status || ''));
    if (fatura?.invoice_url) {
      faturaPendente = {
        invoiceUrl: fatura.invoice_url,
        valor: fatura.valor === null || fatura.valor === undefined ? null : Number(fatura.valor),
        vencimento: fatura.vencimento || null,
        status: fatura.status || null,
      };
    }
  }
  return NextResponse.json({ estado, precisaPaywall: precisaPaywallEmpresa(estado), precos: PRECOS, faturaPendente });
}
