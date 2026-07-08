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

// Os lancamentos gravam o mes por extenso em MAIUSCULO (ex.: 'JULHO'). Precisa casar exatamente.
const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

Deno.serve(async (request) => {
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

    let body: { data?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const dataTeste = typeof body.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.data)
      ? body.data
      : null;
    const partesHoje = dataTeste
      ? dataTeste.split('-')
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date()).split('-');
    const [anoTexto, mesTexto, diaTexto] = partesHoje;
    const ano = Number(anoTexto);
    const mesIndice = Number(mesTexto) - 1;
    const mesNome = MESES[mesIndice];
    const dia = Number(diaTexto);
    const refData = `${anoTexto}-${mesTexto}-${diaTexto}`;

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
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nome')
        .eq('id', empresaId)
        .maybeSingle();
      const nomePerfil = empresa?.nome || 'Perfil financeiro';

      const { data: vinculos } = await supabase
        .from('usuarios_empresa')
        .select('user_id')
        .eq('empresa_id', empresaId);
      const usuariosEmpresa = Array.from(new Set(
        (vinculos || []).map((item) => item.user_id).filter(Boolean),
      ));
      if (!usuariosEmpresa.length) continue;

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .in('user_id', usuariosEmpresa)
        .eq('app_origem', 'mobile');

      const despesasEmpresa = lista.filter((x) => x.empresa_id === empresaId);
      const qtd = despesasEmpresa.length;
      const payload = JSON.stringify({
        title: qtd > 1 ? `${qtd} pagamentos agendados para hoje` : 'Pagamento agendado para hoje',
        body: qtd > 1
          ? `${nomePerfil}: abra o app para consultar os pagamentos do dia.`
          : `${nomePerfil}: ${despesasEmpresa[0]?.despesa_nome || 'Despesa do dia'}`,
        url: '/mobile',
        perfil: nomePerfil,
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
      JSON.stringify({ ok: true, data: refData, modoTeste: Boolean(dataTeste), despesas: lista.length, notificadas, pushesEnviados }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, erro: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
