import { NextResponse } from 'next/server';
import { criarAssinaturaAsaas, listarCobrancasAssinaturaAsaas } from '../../../../lib/asaas';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { assinaturaVigente } from '../../../../lib/cobranca';
import { normalizarPlanoComercial, VALOR_MODULO_AVULSO_MENSAL } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

const STATUS_PAGAVEL = new Set(['PENDING', 'OVERDUE']);

function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Uma assinatura recorrente por módulo, exclusivamente para o Business.
// A ativação em empresa_modulos é feita apenas pelo webhook após pagamento.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const moduloId = String(corpo.moduloId || '').trim();
  if (!empresaId || !moduloId) return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });

  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const estado = await resolverEstadoAcesso(empresaId);
  if (!estado || !assinaturaVigente(estado) || normalizarPlanoComercial(estado.plano) !== 'business') {
    return NextResponse.json({ erro: true, mensagem: 'Módulos avulsos estão disponíveis apenas para uma assinatura Business ativa.' }, { status: 409 });
  }

  const [{ data: modulo }, { data: assinaturaPrincipal }, { data: existente }] = await Promise.all([
    acesso.db.from('modulos').select('id, nome, disponivel').eq('id', moduloId).maybeSingle(),
    acesso.db.from('assinaturas').select('gateway_customer_id').eq('empresa_id', empresaId).maybeSingle(),
    acesso.db.from('assinaturas_modulos').select('status, gateway_subscription_id').eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle(),
  ]);
  if (!modulo?.disponivel) return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível.' }, { status: 404 });
  if (!assinaturaPrincipal?.gateway_customer_id) return NextResponse.json({ erro: true, mensagem: 'Não foi possível localizar o cadastro de cobrança deste perfil.' }, { status: 409 });

  if (existente?.status === 'cancelada') {
    const { data: cancelada } = await acesso.db.from('assinaturas_modulos').select('valido_ate').eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle();
    if (cancelada?.valido_ate && new Date(cancelada.valido_ate) > new Date()) {
      return NextResponse.json({ erro: true, mensagem: 'O cancelamento já está agendado e o acesso permanece ativo até o fim do período pago.' }, { status: 409 });
    }
  }

  if (existente?.gateway_subscription_id && existente.status !== 'cancelada') {
    const cobrancas = await listarCobrancasAssinaturaAsaas(existente.gateway_subscription_id);
    const pendente = cobrancas.data?.data?.find((item) => item.invoiceUrl && STATUS_PAGAVEL.has(item.status || ''));
    if (cobrancas.ok && pendente?.invoiceUrl) {
      return NextResponse.json({ ok: true, reutilizada: true, invoiceUrl: pendente.invoiceUrl, assinaturaId: existente.gateway_subscription_id });
    }
  }

  const criada = await criarAssinaturaAsaas({
    customer: assinaturaPrincipal.gateway_customer_id,
    billingType: 'UNDEFINED',
    value: VALOR_MODULO_AVULSO_MENSAL,
    nextDueDate: hojeSaoPaulo(),
    cycle: 'MONTHLY',
    description: `AvantaLab — módulo ${modulo.nome} (mensal)`,
    externalReference: `modulo:${empresaId}:${moduloId}`,
  });
  if (!criada.ok || !criada.data?.id) return NextResponse.json({ erro: true, mensagem: criada.erro || 'Não foi possível criar a assinatura do módulo.' }, { status: 502 });

  const cobrancas = await listarCobrancasAssinaturaAsaas(criada.data.id);
  const pendente = cobrancas.data?.data?.find((item) => item.invoiceUrl && STATUS_PAGAVEL.has(item.status || ''));
  const base = {
    empresa_id: empresaId,
    modulo_id: moduloId,
    status: 'expirada',
    ciclo: 'mensal',
    valor: VALOR_MODULO_AVULSO_MENSAL,
    gateway: 'asaas',
    gateway_customer_id: assinaturaPrincipal.gateway_customer_id,
    gateway_subscription_id: criada.data.id,
    valido_ate: null,
    atualizado_em: new Date().toISOString(),
  };
  await acesso.db.from('assinaturas_modulos').upsert(base, { onConflict: 'empresa_id,modulo_id' });

  return NextResponse.json({ ok: true, invoiceUrl: pendente?.invoiceUrl || null, assinaturaId: criada.data.id });
}
