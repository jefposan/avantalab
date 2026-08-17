import { NextResponse } from 'next/server';
import { criarAssinaturaAsaas, listarCobrancasAssinaturaAsaas, removerAssinaturaAsaas } from '../../../../lib/asaas';
import { calcularFimPeriodoPago, STATUS_FATURA_PAGA } from '../../../../lib/cobranca-fluxo';
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

  const { data: perfil } = await acesso.db.from('empresas')
    .select('assinatura_origem_empresa_id').eq('id', empresaId).maybeSingle();
  const empresaCobrancaId = perfil?.assinatura_origem_empresa_id || empresaId;
  const [{ data: modulo }, { data: assinaturaPrincipal }, { data: existente }] = await Promise.all([
    acesso.db.from('modulos').select('id, nome, disponivel').eq('id', moduloId).maybeSingle(),
    acesso.db.from('assinaturas').select('gateway_customer_id').eq('empresa_id', empresaCobrancaId).maybeSingle(),
    acesso.db.from('assinaturas_modulos').select('status, gateway_subscription_id, valido_ate').eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle(),
  ]);
  if (!modulo?.disponivel) return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível.' }, { status: 404 });
  if (!assinaturaPrincipal?.gateway_customer_id) return NextResponse.json({ erro: true, mensagem: 'Não foi possível localizar o cadastro de cobrança deste perfil.' }, { status: 409 });

  if (existente?.status === 'ativa' || existente?.status === 'inadimplente') {
    return NextResponse.json({ erro: true, mensagem: 'Este módulo já possui uma assinatura. Use o gerenciamento do módulo.' }, { status: 409 });
  }
  if (existente?.status === 'cancelada') {
    if (existente.valido_ate && new Date(existente.valido_ate) > new Date()) {
      return NextResponse.json({ erro: true, mensagem: 'O cancelamento já está agendado e o acesso permanece ativo até o fim do período pago.' }, { status: 409 });
    }
  }

  if (existente?.gateway_subscription_id) {
    const cobrancas = await listarCobrancasAssinaturaAsaas(existente.gateway_subscription_id);
    if (!cobrancas.ok) {
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível verificar a cobrança anterior do módulo.' }, { status: 502 });
    }
    const pagamentos = cobrancas.data?.data || [];
    const possuiPagamentoVigente = pagamentos.some((item) => STATUS_FATURA_PAGA.has(item.status || ''))
      && !!calcularFimPeriodoPago(pagamentos, 'mensal', existente.valido_ate);
    if (possuiPagamentoVigente) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Este módulo já possui pagamento registrado. Atualize a página antes de tentar novamente.',
      }, { status: 409 });
    }
    const pendente = cobrancas.data?.data?.find((item) => item.invoiceUrl && STATUS_PAGAVEL.has(item.status || ''));
    if (pendente?.invoiceUrl && existente.status !== 'cancelada') {
      return NextResponse.json({ ok: true, reutilizada: true, invoiceUrl: pendente.invoiceUrl, assinaturaId: existente.gateway_subscription_id });
    }
    const removida = await removerAssinaturaAsaas(existente.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível substituir a cobrança anterior do módulo.' }, { status: 502 });
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
  const { error: erroPersistencia } = await acesso.db.from('assinaturas_modulos').upsert(base, { onConflict: 'empresa_id,modulo_id' });
  if (erroPersistencia) {
    await removerAssinaturaAsaas(criada.data.id).catch(() => null);
    return NextResponse.json({
      erro: true,
      mensagem: 'A cobrança foi desfeita porque não foi possível registrar a assinatura do módulo.',
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invoiceUrl: pendente?.invoiceUrl || null, assinaturaId: criada.data.id });
}
