// ─────────────────────────────────────────────────────────────
// Edge Function: processar-despesas-dia
// Cria a notificacao (sininho) + envia push para as despesas
// "previsto" e "fixa" que vencem HOJE e ainda estao "prevista".
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

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

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

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesNome = MESES[hoje.getMonth()];
    const dia = hoje.getDate();
    const refData = hoje.toISOString().slice(0, 10); // YYYY-MM-DD

    // Despesas que vencem hoje e ainda estao previstas (previsto/fixa).
    const { data: despesas, error } = await supabase
      .from('lancamentos')
      .select('id, empresa_id, despesa_nome, valor, tipo_obs')
      .eq('ano', ano)
      .eq('mes', mesNome)
      .eq('dia', dia)
      .eq('status', 'prevista')
      .in('tipo_obs', ['previsto', 'fixa']);

    if (error) throw error;
    const lista = despesas || [];

    let notificadas = 0;
    let pushesEnviados = 0;
    const empresasAfetadas = new Set<string>();

    for (const d of lista) {
      if (!d.empresa_id) continue;
      const valorFmt = Number(d.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const titulo = d.tipo_obs === 'fixa' ? 'Despesa fixa para confirmar' : 'Despesa prevista para confirmar';
      const corpo = `${d.despesa_nome} - ${valorFmt}. Toque para confirmar, ajustar ou excluir.`;

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
        title: qtd > 1 ? `${qtd} despesas para confirmar hoje` : 'Despesa para confirmar hoje',
        body: qtd > 1 ? 'Abra o app para confirmar, ajustar ou excluir.' : (despesasEmpresa[0]?.despesa_nome || 'Despesa do dia'),
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
