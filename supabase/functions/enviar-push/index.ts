// Edge Function: enviar-push
// Envia notificacao Web Push (VAPID) para as inscricoes de um usuario.
//
// Invocacao (POST JSON), duas formas:
//   1) { "notificacao_id": "<uuid>" }  -> carrega titulo/corpo/url da tabela
//   2) { "user_id": "<uuid>", "titulo": "...", "corpo": "...", "url": "/mobile", "empresa_id": "<uuid>" }
//
// Secrets necessarios (painel: Edge Functions > enviar-push > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex: mailto:contato@avantalab.com.br)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ja sao injetados automaticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import { enviarPush } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));

    let userId = body.user_id as string | undefined;
    let titulo = body.titulo as string | undefined;
    let corpo = (body.corpo as string | undefined) || "";
    let url = (body.url as string | undefined) || "/mobile";
    let empresaId = body.empresa_id as string | undefined;
    let perfil = (body.perfil as string | undefined) || "";

    // Forma 1: carregar dados a partir de uma notificacao existente
    if (body.notificacao_id) {
      const { data: notif, error } = await db
        .from("notificacoes")
        .select("user_id, empresa_id, titulo, corpo, url")
        .eq("id", body.notificacao_id)
        .single();
      if (error || !notif) {
        return json({ ok: false, erro: "Notificacao nao encontrada." }, 404);
      }
      titulo = notif.titulo;
      corpo = notif.corpo;
      url = notif.url || "/mobile";
      userId = notif.user_id || undefined;
      empresaId = notif.empresa_id || undefined;
      perfil = await buscarNomePerfil(db, empresaId);

      // Notificacao geral da empresa: envia para todos os usuarios vinculados
      if (!userId && notif.empresa_id) {
        const { data: vinculos } = await db
          .from("usuarios_empresa")
          .select("user_id")
          .eq("empresa_id", notif.empresa_id);
        const ids = (vinculos || []).map((v: any) => v.user_id);
        return await enviarParaUsuarios(db, ids, titulo!, corpo, url, perfil);
      }
    }

    if (!userId || !titulo) {
      return json({ ok: false, erro: "Informe notificacao_id, ou user_id + titulo." }, 400);
    }

    if (!perfil) perfil = await buscarNomePerfil(db, empresaId);

    return await enviarParaUsuarios(db, [userId], titulo, corpo, url, perfil);
  } catch (e) {
    return json({ ok: false, erro: String(e) }, 500);
  }
});

async function buscarNomePerfil(db: any, empresaId?: string) {
  if (!empresaId) return "";
  const { data } = await db
    .from("empresas")
    .select("nome")
    .eq("id", empresaId)
    .maybeSingle();
  return String(data?.nome || "").trim();
}

async function enviarParaUsuarios(
  db: any,
  userIds: string[],
  titulo: string,
  corpo: string,
  url: string,
  perfil = "",
) {
  if (!userIds.length) return json({ ok: true, enviados: 0, total: 0 });

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, canal, apns_token")
    .in("user_id", userIds)
    .eq("app_origem", "mobile");

  let enviados = 0;

  for (const s of subs || []) {
    if (await enviarPush(db, s, { titulo, corpo, url, perfil })) enviados++;
  }

  return json({ ok: true, enviados, total: (subs || []).length });
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
