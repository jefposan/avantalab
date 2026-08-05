import { NextResponse } from 'next/server';
import { criarClienteAsaas, criarCobrancaAvulsaAsaas } from '@/app/lib/asaas';
import { VALORES_RECARGA_CENTAVOS } from '@/app/lib/carteira';
import { autenticarCarteira, CABECALHOS_PRIVADOS } from '@/app/lib/carteira-servidor';

export const runtime = 'nodejs';

function hojeMaisDias(dias: number) {
  const data = new Date(); data.setDate(data.getDate() + dias);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(data);
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const empresaId = String(corpo?.empresaId || '').trim();
  const valorCentavos = Number(corpo?.valorCentavos);
  if (!VALORES_RECARGA_CENTAVOS.includes(valorCentavos as never)) return NextResponse.json({ success: false, message: 'Escolha um valor de recarga disponível.' }, { status: 400, headers: CABECALHOS_PRIVADOS });
  const contexto = await autenticarCarteira(request, empresaId);
  if (!contexto) return NextResponse.json({ success: false, message: 'Sessão ou perfil inválido.' }, { status: 401, headers: CABECALHOS_PRIVADOS });
  if (!contexto.podeGerenciar) return NextResponse.json({ success: false, message: 'Somente gestores e administradores podem adicionar créditos.' }, { status: 403, headers: CABECALHOS_PRIVADOS });
  const { db, usuario } = contexto;
  const [{ data: empresa }, { data: cadastro }, { data: assinatura }] = await Promise.all([
    db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
    db.from('cadastros_perfil').select('nome_fantasia,razao_social,nome_responsavel,documento,email_empresa,telefone').eq('empresa_id', empresaId).maybeSingle(),
    db.from('assinaturas').select('gateway_customer_id').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  let clienteId = assinatura?.gateway_customer_id || '';
  if (!clienteId) {
    const cliente = await criarClienteAsaas({
      name: cadastro?.razao_social || cadastro?.nome_fantasia || cadastro?.nome_responsavel || empresa?.nome || 'Cliente AvantaLab',
      cpfCnpj: String(cadastro?.documento || '').replace(/\D/g, '') || undefined,
      email: cadastro?.email_empresa || usuario.email || undefined,
      mobilePhone: String(cadastro?.telefone || '').replace(/\D/g, '') || undefined,
      externalReference: empresaId,
    });
    if (!cliente.ok || !cliente.data?.id) return NextResponse.json({ success: false, message: 'Não foi possível iniciar o pagamento agora.' }, { status: 502, headers: CABECALHOS_PRIVADOS });
    clienteId = cliente.data.id;
  }
  const { data: recarga, error: erroRecarga } = await db.from('carteira_recargas').insert({ empresa_id: empresaId, criado_por: usuario.id, valor_centavos: valorCentavos, status: 'criando' }).select('id').single();
  if (erroRecarga || !recarga) return NextResponse.json({ success: false, message: 'Não foi possível iniciar o pagamento agora.' }, { status: 500, headers: CABECALHOS_PRIVADOS });
  const cobranca = await criarCobrancaAvulsaAsaas({ customer: clienteId, billingType: 'UNDEFINED', value: valorCentavos / 100, dueDate: hojeMaisDias(3), description: 'Créditos AvantaLab', externalReference: `carteira:${recarga.id}:${empresaId}` });
  if (!cobranca.ok || !cobranca.data?.id || !cobranca.data.invoiceUrl) {
    await db.from('carteira_recargas').update({ status: 'erro', atualizado_em: new Date().toISOString() }).eq('id', recarga.id);
    return NextResponse.json({ success: false, message: 'Não foi possível iniciar o pagamento agora.' }, { status: 502, headers: CABECALHOS_PRIVADOS });
  }
  await db.from('carteira_recargas').update({ status: 'pendente', gateway_payment_id: cobranca.data.id, forma_pagamento: cobranca.data.billingType || 'UNDEFINED', invoice_url: cobranca.data.invoiceUrl, vencimento: cobranca.data.dueDate, atualizado_em: new Date().toISOString() }).eq('id', recarga.id);
  return NextResponse.json({ success: true, data: { recargaId: recarga.id, invoiceUrl: cobranca.data.invoiceUrl } }, { status: 201, headers: CABECALHOS_PRIVADOS });
}
