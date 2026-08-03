import { createClient } from 'npm:@supabase/supabase-js@2';
import { enviarPush } from '../_shared/push.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const marcos: Record<number, { chave: string; titulo: string; corpo: (valor: string) => string }> = {
  5: { chave: 'antes_5', titulo: 'Fatura vence em 5 dias', corpo: (valor) => `Sua fatura de ${valor} vence em 5 dias. Consulte a assinatura para pagar.` },
  2: { chave: 'antes_2', titulo: 'Fatura vence em 2 dias', corpo: (valor) => `Sua fatura de ${valor} vence em 2 dias. Consulte a assinatura para pagar.` },
  0: { chave: 'vence_hoje', titulo: 'Fatura vence hoje', corpo: (valor) => `Sua fatura de ${valor} vence hoje. Consulte a assinatura para pagar.` },
  '-1': { chave: 'atraso_1', titulo: 'Fatura em atraso', corpo: (valor) => `Sua fatura de ${valor} está em atraso há 1 dia. Regularize pela assinatura.` },
  '-3': { chave: 'atraso_3', titulo: 'Fatura em atraso', corpo: (valor) => `Sua fatura de ${valor} está em atraso há 3 dias. Regularize pela assinatura.` },
  '-7': { chave: 'atraso_7', titulo: 'Fatura em atraso', corpo: (valor) => `Sua fatura de ${valor} está em atraso há 7 dias. Regularize pela assinatura.` },
};

function hoje() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce<Record<string, string>>((resultado, parte) => {
    if (parte.type !== 'literal') resultado[parte.type] = parte.value;
    return resultado;
  }, {});
  return `${partes.year}-${partes.month}-${partes.day}`;
}
function diferencaDias(data: string, referencia: string) { return Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${referencia}T12:00:00Z`)) / 86400000); }
function dinheiro(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const db = createClient(url, chaveServico);
    const dataHoje = hoje();
    const { data: faturas, error } = await db.from('assinatura_faturas').select('gateway_payment_id, empresa_id, valor, vencimento, status').in('status', ['PENDING', 'OVERDUE']).not('gateway_payment_id', 'is', null).not('vencimento', 'is', null);
    if (error) throw error;
    let criadas = 0;
    let enviadas = 0;
    for (const fatura of faturas || []) {
      const marco = marcos[diferencaDias(fatura.vencimento, dataHoje)];
      if (!marco) continue;
      const { data: gestores, error: erroGestores } = await db.from('usuarios_empresa').select('user_id').eq('empresa_id', fatura.empresa_id).eq('status', 'ativo').in('perfil', ['gestor_master', 'administrador']);
      if (erroGestores) throw erroGestores;
      for (const gestor of gestores || []) {
        const identificador = `assinatura:${fatura.gateway_payment_id}:${marco.chave}:${gestor.user_id}`;
        const { error: erroAviso } = await db
          .from('assinatura_avisos')
          .upsert({ fatura_id: fatura.gateway_payment_id, empresa_id: fatura.empresa_id, user_id: gestor.user_id, marco: marco.chave }, { onConflict: 'fatura_id,user_id,marco', ignoreDuplicates: true });
        if (erroAviso) throw erroAviso;

        const { data: aviso, error: erroConsultaAviso } = await db
          .from('assinatura_avisos')
          .select('id, notificacao_id')
          .eq('fatura_id', fatura.gateway_payment_id)
          .eq('user_id', gestor.user_id)
          .eq('marco', marco.chave)
          .maybeSingle();
        if (erroConsultaAviso) throw erroConsultaAviso;
        if (!aviso?.id || aviso.notificacao_id) continue;
        const corpo = marco.corpo(dinheiro(Number(fatura.valor || 0)));
        const { data: notificacao, error: erroNotificacao } = await db
          .from('notificacoes')
          .upsert({
            empresa_id: fatura.empresa_id,
            user_id: gestor.user_id,
            titulo: marco.titulo,
            corpo,
            url: '/mobile?assinatura=1',
            tipo: 'assinatura',
            origem_id: identificador,
            ref_data: dataHoje,
          }, { onConflict: 'origem_id,ref_data', ignoreDuplicates: true })
          .select('id')
          .maybeSingle();
        if (erroNotificacao) throw erroNotificacao;
        let notificacaoId = notificacao?.id;
        if (!notificacaoId) {
          const { data: existente, error: erroExistente } = await db
            .from('notificacoes')
            .select('id')
            .eq('origem_id', identificador)
            .eq('ref_data', dataHoje)
            .maybeSingle();
          if (erroExistente) throw erroExistente;
          notificacaoId = existente?.id;
        }
        if (!notificacaoId) continue;
        criadas++;
        await db.from('assinatura_avisos').update({ notificacao_id: notificacaoId }).eq('id', aviso.id);
        const { data: assinaturas } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth, canal, apns_token').eq('user_id', gestor.user_id).eq('app_origem', 'mobile');
        for (const item of assinaturas || []) {
          if (await enviarPush(db, item, { titulo: marco.titulo, corpo, url: '/mobile?assinatura=1' })) enviadas++;
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, criadas, enviadas }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (erro) { return new Response(JSON.stringify({ ok: false, erro: String(erro) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }); }
});
