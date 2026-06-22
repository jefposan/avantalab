// Edge Function: broadcast
// Dispara um aviso para TODOS os usuarios do app:
//  - cria uma notificacao (sino) para cada usuario
//  - envia push para todas as inscricoes
// Protegida pela senha de admin (mesma do /admin).
//
// Secrets (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ja existem)
//   ADMIN_FEEDBACKS_TOKEN  (a mesma senha usada no /admin)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetados automaticamente.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@avantalab.com.br";
const ADMIN_TOKEN = Deno.env.get("ADMIN_FEEDBACKS_TOKEN") || "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));

    if (!ADMIN_TOKEN || String(body.token || "") !== ADMIN_TOKEN) {
      return json({ ok: false, erro: "Nao autorizado." }, 401);
    }

    const titulo = String(body.titulo || "").trim();
    const corpo = String(body.corpo || "").trim();
    if (!titulo) return json({ ok: false, erro: "Informe a mensagem." }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Usuarios do app (distinct user_id dos vinculos de empresa)
    const { data: vinc } = await db.from("usuarios_empresa").select("user_id");
    const userIds = Array.from(
      new Set((vinc || []).map((v: any) => v.user_id).filter(Boolean)),
    );

    // Cria a notificacao (sino) para cada usuario
    if (userIds.length) {
      const rows = userIds.map((uid) => ({
        empresa_id: null,
        user_id: uid,
        titulo,
        corpo,
        url: "/mobile",
        tipo: "novidade",
      }));
      await db.from("notificacoes").insert(rows);
    }

    // Push para todas as inscricoes
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    const payload = JSON.stringify({ titulo, corpo, url: "/mobile" });
    let enviados = 0;

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

    return json({
      ok: true,
      usuarios: userIds.length,
      enviados,
      total: (subs || []).length,
    });
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
