// Edge Function: broadcast
// Dispara um aviso para TODOS os usuarios do aplicativo selecionado:
//  - cria uma notificacao (sino) para cada usuario
//  - envia push para todas as inscricoes
// Protegida pela senha de admin (mesma do /admin).
//
// Secrets (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ja existem)
//   ADMIN_FEEDBACKS_TOKEN  (a mesma senha usada no /admin)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetados automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import { enviarPush } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_FEEDBACKS_TOKEN") || "";

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
    const aplicativo = body.aplicativo === "avantavendas" ? "avantavendas" : "gestao";
    if (!titulo || !corpo) return json({ ok: false, erro: "Informe titulo e mensagem." }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    let userIds: string[] = [];
    if (aplicativo === "avantavendas") {
      const { data: membros, error: erroMembros } = await db
        .from("vendas_mobile_contas_usuarios")
        .select("conta_id, user_id")
        .eq("status", "ativo");
      if (erroMembros) throw erroMembros;
      const contasIds = Array.from(new Set((membros || []).map((item: any) => item.conta_id).filter(Boolean)));
      const { data: contas, error: erroContas } = contasIds.length
        ? await db.from("vendas_mobile_contas").select("id").in("id", contasIds).is("arquivada_em", null)
        : { data: [], error: null };
      if (erroContas) throw erroContas;
      const contasAtivas = new Set((contas || []).map((item: any) => item.id));
      userIds = Array.from(new Set((membros || []).filter((item: any) => contasAtivas.has(item.conta_id)).map((item: any) => item.user_id).filter(Boolean)));
    } else {
      const { data: vinculos, error: erroVinculos } = await db
        .from("usuarios_empresa")
        .select("user_id")
        .eq("status", "ativo")
        .neq("perfil", "funcionario_ponto");
      if (erroVinculos) throw erroVinculos;
      userIds = Array.from(new Set((vinculos || []).map((item: any) => item.user_id).filter(Boolean)));
    }
    const usuariosSolicitados = Array.isArray(body.usuariosIds)
      ? new Set(body.usuariosIds.map((item: unknown) => String(item)))
      : null;
    const destinatarios = usuariosSolicitados
      ? userIds.filter((userId) => usuariosSolicitados.has(String(userId)))
      : userIds;
    const destino = aplicativo === "avantavendas" ? "/avantavendas" : "/mobile";
    const origemPush = aplicativo === "avantavendas" ? "avantavendas" : "mobile";

    // Cria a notificacao (sino) para cada usuario
    if (aplicativo === "gestao" && destinatarios.length) {
      const rows = destinatarios.map((uid) => ({
        empresa_id: null,
        user_id: uid,
        titulo,
        corpo,
        url: destino,
        tipo: "novidade",
      }));
      await db.from("notificacoes").insert(rows);
    }

    // Push para todas as inscricoes
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, canal, apns_token, fcm_token, app_origem")
      .in("user_id", destinatarios)
      .eq("app_origem", origemPush);

    let enviados = 0;
    const cacheBadges = new Map<string, number | null>();

    for (const s of subs || []) {
      if (await enviarPush(db, s, { titulo, corpo, url: destino, appOrigem: origemPush }, cacheBadges)) enviados++;
    }

    return json({
      ok: true,
      aplicativo,
      usuarios: destinatarios.length,
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
