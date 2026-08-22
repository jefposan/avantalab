import { createClient } from 'npm:@supabase/supabase-js@2';
import { enviarPush } from '../_shared/push.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { solicitacao_id: solicitacaoId } = await req.json().catch(() => ({}));
    if (!solicitacaoId) throw new Error('Solicitação não informada.');
    const db = createClient(url, chaveServico);
    const { data: solicitacao, error } = await db.from('vendas_mobile_solicitacoes_acesso')
      .select('id, empresa_id, nome, status').eq('id', solicitacaoId).maybeSingle();
    if (error) throw error;
    if (!solicitacao || solicitacao.status !== 'pendente') return json({ ok: true, criadas: 0, enviadas: 0 });

    const { data: gestores, error: erroGestores } = await db.from('usuarios_empresa')
      .select('user_id').eq('empresa_id', solicitacao.empresa_id).eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador']);
    if (erroGestores) throw erroGestores;

    const titulo = 'Novo pedido de conteúdo do Vendas';
    const corpo = `${solicitacao.nome || 'Um vendedor'} solicitou Notícias, Divulgação e Catálogo.`;
    let criadas = 0;
    let enviadas = 0;
    const cacheBadges = new Map<string, number | null>();
    for (const gestor of gestores || []) {
      const origemId = `vendas-solicitacao:${solicitacao.id}:${gestor.user_id}`;
      const { data: notificacao, error: erroNotificacao } = await db.from('notificacoes').upsert({
        empresa_id: solicitacao.empresa_id, user_id: gestor.user_id, titulo, corpo,
        url: '/mobile', tipo: 'vendas', origem_id: origemId, ref_data: new Date().toISOString().slice(0, 10),
      }, { onConflict: 'origem_id,ref_data', ignoreDuplicates: true }).select('id').maybeSingle();
      if (erroNotificacao) throw erroNotificacao;
      if (!notificacao?.id) continue;
      criadas++;
      const { data: inscricoes } = await db.from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth, canal, apns_token').eq('user_id', gestor.user_id).eq('app_origem', 'mobile');
      for (const inscricao of inscricoes || []) {
        if (await enviarPush(db, inscricao, { titulo, corpo, url: '/mobile' }, cacheBadges)) enviadas++;
      }
    }
    return json({ ok: true, criadas, enviadas });
  } catch (erro) { return json({ ok: false, erro: String(erro) }, 500); }
});

function json(valor: unknown, status = 200) {
  return new Response(JSON.stringify(valor), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
