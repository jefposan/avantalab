import { createClient } from 'jsr:@supabase/supabase-js@2';

type Assinatura = {
  id: string;
  empresa_id: string;
  status: string;
  valido_ate: string | null;
  gateway_subscription_id: string;
};

type AssinaturaFacial = Assinatura & {
  quantidade_atual: number;
  quantidade_proxima: number;
  valor_mensal_centavos: number;
  proximo_vencimento: string | null;
};

async function asaas(path: string, init: RequestInit = {}) {
  const ASAAS_API_KEY = normalizarSecret(Deno.env.get('ASAAS_API_KEY'));
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
  const ASAAS_URL = (Deno.env.get('ASAAS_BASE_URL') || (
    ASAAS_API_KEY.startsWith('$aact_prod_')
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3'
  )).replace(/\/$/, '');

  const response = await fetch(`${ASAAS_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      'User-Agent': 'AvantaLab',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Asaas ${response.status}: ${await response.text()}`);
  return response.json();
}

Deno.serve(async () => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data, error } = await db
      .from('assinaturas')
      .select('id, empresa_id, status, valido_ate, gateway_subscription_id')
      .not('gateway_subscription_id', 'is', null);
    if (error) throw error;

    let verificadas = 0;
    let atualizadas = 0;
    let faturasSincronizadas = 0;
    const falhas: Array<{ empresaId: string; erro: string }> = [];

    for (const assinatura of (data || []) as Assinatura[]) {
      if (assinatura.status === 'cancelada' || assinatura.status === 'cortesia') continue;
      verificadas++;
      try {
        const [detalhe, pagamentosResposta] = await Promise.all([
          asaas(`/subscriptions/${assinatura.gateway_subscription_id}`),
          asaas(`/subscriptions/${assinatura.gateway_subscription_id}/payments`),
        ]);
        const pagamentos = Array.isArray(pagamentosResposta?.data) ? pagamentosResposta.data : [];

        for (const pagamento of pagamentos) {
          if (!pagamento?.id) continue;
          const { error: faturaError } = await db.from('assinatura_faturas').upsert({
            empresa_id: assinatura.empresa_id,
            assinatura_id: assinatura.id,
            gateway_payment_id: pagamento.id,
            gateway_subscription_id: assinatura.gateway_subscription_id,
            status: pagamento.status || 'UNKNOWN',
            valor: Number(pagamento.value || 0),
            vencimento: pagamento.dueDate || null,
            pagamento_em: pagamento.paymentDate || pagamento.confirmedDate || null,
            forma_pagamento: pagamento.billingType || null,
            invoice_url: pagamento.invoiceUrl || null,
            payload: pagamento,
            atualizado_em: new Date().toISOString(),
          }, { onConflict: 'gateway_payment_id' });
          if (!faturaError) faturasSincronizadas++;
        }

        const temVencida = pagamentos.some((item: { status?: string }) => item.status === 'OVERDUE');
        const temPaga = pagamentos.some((item: { status?: string }) => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(item.status || ''));
        let status = assinatura.status;
        let validoAte = assinatura.valido_ate;
        if (detalhe?.status === 'INACTIVE' || detalhe?.status === 'EXPIRED') {
          status = 'cancelada';
          validoAte = new Date().toISOString();
        } else if (temVencida) {
          status = 'inadimplente';
          if (assinatura.status !== 'inadimplente' || !assinatura.valido_ate) {
            const carencia = new Date();
            carencia.setDate(carencia.getDate() + 3);
            validoAte = carencia.toISOString();
          }
        } else if (temPaga) {
          status = 'ativa';
          validoAte = null;
        }

        const ciclo = detalhe?.cycle === 'YEARLY' ? 'anual' : detalhe?.cycle === 'MONTHLY' ? 'mensal' : null;
        if (status !== assinatura.status || validoAte !== assinatura.valido_ate || ciclo) {
          await db.from('assinaturas').update({
            status,
            valido_ate: validoAte,
            ...(ciclo ? { ciclo } : {}),
            atualizado_em: new Date().toISOString(),
          }).eq('id', assinatura.id);
          atualizadas++;
        }
      } catch (error) {
        falhas.push({ empresaId: assinatura.empresa_id, erro: String(error) });
      }
    }

    const { data: assinaturasFaciais, error: erroFaciais } = await db
      .from('ponto_facial_assinaturas')
      .select('id, empresa_id, status, valido_ate, gateway_subscription_id, quantidade_atual, quantidade_proxima, valor_mensal_centavos, proximo_vencimento')
      .not('gateway_subscription_id', 'is', null)
      .neq('status', 'cancelada');
    if (erroFaciais) throw erroFaciais;

    let faciaisVerificadas = 0;
    let faciaisAtualizadas = 0;
    for (const assinatura of (assinaturasFaciais || []) as AssinaturaFacial[]) {
      faciaisVerificadas++;
      try {
        const [detalhe, pagamentosResposta] = await Promise.all([
          asaas(`/subscriptions/${assinatura.gateway_subscription_id}`),
          asaas(`/subscriptions/${assinatura.gateway_subscription_id}/payments`),
        ]);
        const pagamentos = Array.isArray(pagamentosResposta?.data) ? [...pagamentosResposta.data] : [];
        const { data: alteracoesPendentes } = await db.from('ponto_facial_alteracoes_cobranca')
          .select('gateway_payment_id').eq('assinatura_id', assinatura.id)
          .eq('status', 'pendente_pagamento').not('gateway_payment_id', 'is', null);
        for (const item of alteracoesPendentes || []) {
          if (!item.gateway_payment_id || pagamentos.some((pagamento: { id?: string }) => pagamento.id === item.gateway_payment_id)) continue;
          pagamentos.push(await asaas(`/payments/${item.gateway_payment_id}`));
        }
        for (const pagamento of pagamentos) {
          if (!pagamento?.id) continue;
          const { data: alteracao } = await db.from('ponto_facial_alteracoes_cobranca')
            .select('id').eq('gateway_payment_id', pagamento.id).maybeSingle();
          await db.from('ponto_facial_faturas').upsert({
            empresa_id: assinatura.empresa_id,
            assinatura_id: assinatura.id,
            alteracao_id: alteracao?.id || null,
            gateway_payment_id: pagamento.id,
            gateway_subscription_id: assinatura.gateway_subscription_id,
            status: pagamento.status || 'UNKNOWN',
            valor_centavos: Math.round(Number(pagamento.value || 0) * 100),
            vencimento: pagamento.dueDate || null,
            pagamento_em: pagamento.paymentDate || pagamento.confirmedDate || null,
            forma_pagamento: pagamento.billingType || null,
            invoice_url: pagamento.invoiceUrl || null,
            payload: pagamento,
            atualizado_em: new Date().toISOString(),
          }, { onConflict: 'gateway_payment_id' });
        }

        const pagos = pagamentos
          .filter((item: { status?: string }) => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(item.status || ''))
          .sort((a: { dueDate?: string }, b: { dueDate?: string }) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));
        const vencidas = pagamentos
          .filter((item: { status?: string }) => item.status === 'OVERDUE')
          .sort((a: { dueDate?: string }, b: { dueDate?: string }) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));
        const pagamentoMaisRecente = pagamentos
          .filter((item: { status?: string }) => item.status === 'OVERDUE'
            || ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(item.status || ''))
          .sort((a: { dueDate?: string }, b: { dueDate?: string }) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')))[0];
        const maisRecentePago = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(pagamentoMaisRecente?.status || '');
        const maisRecenteVencido = pagamentoMaisRecente?.status === 'OVERDUE';
        const agora = new Date().toISOString();

        if ((detalhe?.status === 'INACTIVE' || detalhe?.status === 'EXPIRED') && assinatura.status !== 'cancelamento_programado') {
          await db.from('ponto_facial_assinaturas').update({ status: 'cancelada', valido_ate: agora, atualizado_em: agora }).eq('id', assinatura.id);
          await db.from('ponto_config').update({ reconhecimento_facial_status: 'suspenso', atualizado_em: agora }).eq('empresa_id', assinatura.empresa_id);
          faciaisAtualizadas++;
          continue;
        }

        if (pagos.length && maisRecentePago) {
          const idsPagos = pagos.map((item: { id: string }) => item.id);
          const { data: alteracao } = await db.from('ponto_facial_alteracoes_cobranca')
            .select('id, tipo, quantidade_nova').eq('empresa_id', assinatura.empresa_id)
            .eq('status', 'pendente_pagamento').in('gateway_payment_id', idsPagos)
            .order('criado_em', { ascending: false }).limit(1).maybeSingle();
          const quantidade = Number(alteracao?.quantidade_nova ?? assinatura.quantidade_proxima ?? assinatura.quantidade_atual);
          if (alteracao) {
            await db.from('ponto_facial_funcionarios').update({ status: 'pendente_cadastro', removido_em: null, atualizado_em: agora })
              .eq('empresa_id', assinatura.empresa_id).eq('status', 'pendente_pagamento');
            await db.from('ponto_facial_funcionarios').update({ status: 'ativo', removido_em: null, atualizado_em: agora })
              .eq('empresa_id', assinatura.empresa_id).eq('status', 'pendente_cadastro').not('referencia_provedor_id', 'is', null);
            await db.from('ponto_facial_alteracoes_cobranca').update({ status: 'aplicada', aplicado_em: agora, atualizado_em: agora }).eq('id', alteracao.id);
            if (alteracao.tipo === 'aumento') {
              await asaas(`/subscriptions/${assinatura.gateway_subscription_id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  value: assinatura.valor_mensal_centavos / 100,
                  description: `AvantaLab — reconhecimento facial (${quantidade} funcionário${quantidade === 1 ? '' : 's'})`,
                  updatePendingPayments: false,
                }),
              });
            }
          }
          await db.from('ponto_facial_assinaturas').update({
            status: 'ativa', quantidade_atual: quantidade, quantidade_proxima: quantidade,
            valor_mensal_centavos: quantidade * 1490, valido_ate: null,
            proximo_vencimento: detalhe?.nextDueDate || assinatura.proximo_vencimento || null,
            atualizado_em: agora,
          }).eq('id', assinatura.id);
          await db.from('ponto_config').update({ reconhecimento_facial_status: quantidade ? 'ativo' : 'desativado', atualizado_em: agora }).eq('empresa_id', assinatura.empresa_id);
          faciaisAtualizadas++;
        } else if (vencidas.length && maisRecenteVencido) {
          const carencia = new Date(`${vencidas[0].dueDate}T00:00:00-03:00`);
          carencia.setDate(carencia.getDate() + 3);
          await db.from('ponto_facial_assinaturas').update({ status: 'inadimplente', valido_ate: carencia.toISOString(), atualizado_em: agora }).eq('id', assinatura.id);
          faciaisAtualizadas++;
        }
      } catch (error) {
        falhas.push({ empresaId: assinatura.empresa_id, erro: `Facial: ${String(error)}` });
      }
    }

    return resposta({ ok: true, verificadas, atualizadas, faturasSincronizadas, faciaisVerificadas, faciaisAtualizadas, falhas });
  } catch (error) {
    return resposta({ ok: false, erro: String(error) }, 500);
  }
});

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizarSecret(valor: string | undefined | null) {
  return (valor || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s/g, '')
    .replace(/[^\x21-\x7E]/g, '');
}
