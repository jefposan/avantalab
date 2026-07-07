import { createClient } from 'jsr:@supabase/supabase-js@2';

type Assinatura = {
  id: string;
  empresa_id: string;
  status: string;
  valido_ate: string | null;
  gateway_subscription_id: string;
};

const ASAAS_URL = (Deno.env.get('ASAAS_BASE_URL') || (
  (Deno.env.get('ASAAS_API_KEY') || '').startsWith('$aact_prod_')
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3'
)).replace(/\/$/, '');

async function asaas(path: string) {
  const response = await fetch(`${ASAAS_URL}${path}`, {
    headers: {
      access_token: Deno.env.get('ASAAS_API_KEY') || '',
      'User-Agent': 'AvantaLab',
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
      if (assinatura.status === 'cancelada') continue;
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

    return resposta({ ok: true, verificadas, atualizadas, faturasSincronizadas, falhas });
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
