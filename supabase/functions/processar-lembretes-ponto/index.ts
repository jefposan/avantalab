import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const TIME_ZONE = 'America/Sao_Paulo';

type Funcionario = {
  id: string;
  user_id: string;
  empresa_id: string;
  nome: string;
  dias_trabalho: number[] | null;
  hora_entrada: string | null;
  hora_saida: string | null;
};

type TipoPonto = 'entrada' | 'saida';
type MomentoLembrete = 'antes' | 'horario';

function partesAgora() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minutes: get('hour') * 60 + get('minute'),
  };
}

function minutosHorario(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function momentoDevido(now: number, target: number): MomentoLembrete | null {
  if (now >= target - 10 && now < target) return 'antes';
  if (now >= target && now < target + 10) return 'horario';
  return null;
}

Deno.serve(async () => {
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@avantalab.com.br',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    const now = partesAgora();
    const { data: funcionarios, error: funcionariosError } = await db
      .from('ponto_funcionarios')
      .select('id, user_id, empresa_id, nome, dias_trabalho, hora_entrada, hora_saida')
      .eq('ativo', true);
    if (funcionariosError) throw funcionariosError;

    const elegiveis = ((funcionarios || []) as Funcionario[]).filter((funcionario) => (
      funcionario.user_id
      && Array.isArray(funcionario.dias_trabalho)
      && funcionario.dias_trabalho.includes(now.weekday)
    ));
    if (!elegiveis.length) return json({ ok: true, processados: 0, enviados: 0 });

    const userIds = elegiveis.map((item) => item.user_id);
    const [{ data: registros, error: registrosError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
      db.from('ponto_registros').select('user_id, tipo').eq('dia', now.iso).in('user_id', userIds),
      db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds),
    ]);
    if (registrosError) throw registrosError;
    if (subscriptionsError) throw subscriptionsError;

    const registrados = new Set((registros || []).map((item) => `${item.user_id}:${item.tipo}`));
    const subscriptionsByUser = new Map<string, NonNullable<typeof subscriptions>>();
    for (const subscription of subscriptions || []) {
      const list = subscriptionsByUser.get(subscription.user_id) || [];
      list.push(subscription);
      subscriptionsByUser.set(subscription.user_id, list);
    }

    let reminders = 0;
    let sent = 0;
    for (const funcionario of elegiveis) {
      for (const type of ['entrada', 'saida'] as TipoPonto[]) {
        if (registrados.has(`${funcionario.user_id}:${type}`)) continue;
        const configuredTime = type === 'entrada' ? funcionario.hora_entrada : funcionario.hora_saida;
        const target = minutosHorario(configuredTime);
        if (target == null) continue;
        const moment = momentoDevido(now.minutes, target);
        if (!moment) continue;

        const userSubscriptions = subscriptionsByUser.get(funcionario.user_id) || [];
        if (!userSubscriptions.length) continue;

        const { data: inserted, error: reminderError } = await db
          .from('ponto_lembretes_enviados')
          .upsert({ user_id: funcionario.user_id, empresa_id: funcionario.empresa_id, dia: now.iso, tipo: type, momento: moment }, {
            onConflict: 'user_id,dia,tipo,momento',
            ignoreDuplicates: true,
          })
          .select('id');
        if (reminderError) throw reminderError;
        if (!inserted?.length) continue;
        reminders++;

        const action = type === 'entrada' ? 'entrada' : 'saída';
        const shortTime = configuredTime?.slice(0, 5) || '--:--';
        const remaining = Math.max(1, target - now.minutes);
        const title = moment === 'antes' ? `Ponto em ${remaining} minutos` : `Hora de registrar a ${action}`;
        const body = moment === 'antes'
          ? `${funcionario.nome}, sua ${action} está configurada para ${shortTime}.`
          : `${funcionario.nome}, registre sua ${action} no Avanta Ponto.`;
        const payload = JSON.stringify({
          title,
          body,
          url: '/ponto',
          icon: '/images/ponto-icon-192.png',
          badge: '/images/ponto-icon-192.png',
          tag: `ponto-${type}-${now.iso}-${moment}`,
        });

        for (const subscription of userSubscriptions) {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            }, payload);
            sent++;
          } catch (error) {
            const status = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 0;
            if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', subscription.id);
          }
        }
      }
    }

    return json({ ok: true, processados: elegiveis.length, lembretes: reminders, enviados: sent });
  } catch (error) {
    return json({ ok: false, erro: String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
