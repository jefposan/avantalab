// Edge Function: processar-agenda
// Roda 1x por dia. Acha os lembretes da agenda que "vencem hoje",
// cria uma notificacao (sem duplicar) e dispara o push para o dono.
//
// Secrets (ja configurados no projeto): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetados automaticamente.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@avantalab.com.br";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hojeSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
  const [ano, mes, dia] = partes.split("-").map(Number);
  return { ano, mesIdx: mes - 1, dia, iso: partes };
}

function mesIndex(nome: string) {
  return MESES.indexOf(String(nome || "").toUpperCase());
}

function apareceHoje(item: any, hoje: any) {
  const mi = mesIndex(item.mes);
  if (mi < 0) return false;

  // Ocorrencia removida individualmente (exclusao de um unico dia no web)
  const chaveHoje = hoje.ano + "-" + hoje.mesIdx + "-" + hoje.dia;
  const excluir = Array.isArray(item.excluir_dias) ? item.excluir_dias : [];
  if (excluir.indexOf(chaveHoje) !== -1) return false;

  const inicio = Date.UTC(Number(item.ano) || hoje.ano, mi, Number(item.dia) || 1);
  const alvo = Date.UTC(hoje.ano, hoje.mesIdx, hoje.dia);
  const diff = Math.floor((alvo - inicio) / 86400000);
  if (diff < 0) return false;

  if (!item.repetir) {
    return String(item.ano) === String(hoje.ano) && mi === hoje.mesIdx && Number(item.dia) === hoje.dia;
  }
  switch (item.repeticao) {
    case "diaria": return true;
    case "semanal": return diff % 7 === 0;
    case "quinzenal": return diff % 14 === 0;
    case "mensal": return Number(item.dia) === hoje.dia;
    case "anual": return mi === hoje.mesIdx && Number(item.dia) === hoje.dia;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const hoje = hojeSaoPaulo();

    const { data: itens, error } = await db.from("agenda_itens").select("*");
    if (error) return json({ ok: false, erro: error.message }, 500);

    const devidos = (itens || []).filter((it: any) => apareceHoje(it, hoje));

    let criadas = 0;
    let enviados = 0;

    for (const item of devidos) {
      // Cria a notificacao (sem duplicar no mesmo dia)
      const { data: inseridas } = await db
        .from("notificacoes")
        .upsert({
          empresa_id: item.empresa_id,
          user_id: item.user_id,
          titulo: item.titulo,
          corpo: item.descricao || "Lembrete de hoje",
          url: "/mobile",
          tipo: "agenda",
          origem_id: item.id,
          ref_data: hoje.iso,
        }, { onConflict: "origem_id,ref_data", ignoreDuplicates: true })
        .select();

      // Se nada foi inserido, ja existia hoje: nao reenvia
      if (!inseridas || !inseridas.length) continue;
      criadas++;

      const { data: subs } = await db
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", item.user_id)
        .eq("app_origem", "mobile");

      const payload = JSON.stringify({
        titulo: item.titulo,
        corpo: item.descricao || "Lembrete de hoje",
        url: "/mobile",
      });

      for (const s of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          enviados++;
        } catch (err: any) {
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            await db.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      }
    }

    return json({ ok: true, data: hoje.iso, devidos: devidos.length, criadas, enviados });
  } catch (e) {
    return json({ ok: false, erro: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
