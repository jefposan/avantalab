// ─────────────────────────────────────────────────────────────
// Edge Function: processar-despesas-dia
// Cria a notificacao (sininho) + envia push para as despesas
// "previsto", "fixa" e "parcela" que vencem HOJE e ainda estao agendadas.
//
// Agende para rodar 1x/dia logo apos 00:00 (ex.: 00:05) via
// Supabase Scheduled Functions ou pg_cron. Assim o aviso aparece
// "desde as 00:00" do dia da despesa.
//
// Secrets esperados (Project Settings > Edge Functions > Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT   (ex.: "mailto:contato@avantalab.com.br")
//
// Observacao: o sininho (web e mobile) conta as linhas nao lidas da
// tabela `notificacoes`, entao a simples insercao ja atualiza o sino.
// O push usa a mesma tabela `push_subscriptions` da agenda.
// ─────────────────────────────────────────────────────────────

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@avantalab.com.br',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    const partesHoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const parte = (tipo: string) => partesHoje.find((item) => item.type === tipo)?.value || '';
    const ano = Number(parte('year'));
    const mesIndice = Number(parte('month')) - 1;
    const mesNome = MESES[mesIndice];
    const dia = Number(parte('day'));
    const refData = `${parte('year')}-${parte('month')}-${parte('day')}`;

    // Despesas agendadas que vencem hoje. Parcelas nao pedem confirmacao,
    // mas tambem geram o lembrete de pagamento no PWA.
    const { data: despesas, error } = await supabase
      .from('lancamentos')
      .select('id, empresa_id, despesa_nome, valor, tipo_obs, status')
      .eq('ano', ano)
      .eq('mes', mesNome)
      .eq('dia', dia)
      .or('status.is.null,status.neq.cancelada')
      .in('tipo_obs', ['previsto', 'fixa', 'parcela']);

    if (error) throw error;
    const lista = despesas || [];

    let notificadas = 0;
    let pushesEnviados = 0;
    const empresasAfetadas = new Set<string>();

    for (const d of lista) {
      if (!d.empresa_id) continue;
      const valorFmt = Number(d.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const pedeConfirmacao = d.tipo_obs !== 'parcela' && d.status === 'prevista';
      const titulo = pedeConfirmacao ? 'Despesa para confirmar hoje' : 'Pagamento agendado para hoje';
      const corpo = pedeConfirmacao
        ? `${d.despesa_nome} - ${valorFmt}. Toque para confirmar, ajustar ou excluir.`
        : `${d.despesa_nome} - ${valorFmt}.`;

      // Dedup por (origem_id, ref_data): no maximo 1 notificacao por despesa por dia.
      const { error: nErr } = await supabase
        .from('notificacoes')
        .upsert({
          empresa_id: d.empresa_id,
          user_id: null, // empresa-wide (todos os usuarios da empresa)
          titulo,
          corpo,
          url: '/mobile',
          tipo: 'despesa',
          origem_id: String(d.id),
          ref_data: refData,
        }, { onConflict: 'origem_id,ref_data', ignoreDuplicates: true });

      if (!nErr) {
        notificadas++;
        empresasAfetadas.add(d.empresa_id);
      }
    }

    // Push para todos os aparelhos inscritos das empresas afetadas.
    for (const empresaId of empresasAfetadas) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('empresa_id', empresaId);

      const despesasEmpresa = lista.filter((x) => x.empresa_id === empresaId);
      const qtd = despesasEmpresa.length;
      const payload = JSON.stringify({
        title: qtd > 1 ? `${qtd} pagamentos agendados para hoje` : 'Pagamento agendado para hoje',
        body: qtd > 1 ? 'Abra o app para consultar os pagamentos do dia.' : (despesasEmpresa[0]?.despesa_nome || 'Despesa do dia'),
        url: '/mobile',
      });

      for (const s of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          pushesEnviados++;
        } catch (e: any) {
          // 404/410 = inscricao expirada: remove.
          const code = e && (e.statusCode || e.status);
          if (code === 404 || code === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, despesas: lista.length, notificadas, pushesEnviados }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, erro: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
