import webpush from 'npm:web-push@3.6.7';

type AssinaturaPush = {
  id: string;
  user_id?: string | null;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  canal?: 'web' | 'apns' | 'fcm';
  apns_token?: string | null;
  fcm_token?: string | null;
};

type MensagemPush = {
  titulo?: string;
  corpo?: string;
  title?: string;
  body?: string;
  url?: string;
  perfil?: string;
  badge?: number;
};

type CacheBadges = Map<string, number | null>;

function base64Url(valor: Uint8Array | string) {
  const bytes = typeof valor === 'string' ? new TextEncoder().encode(valor) : valor;
  let texto = '';
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function tokenApns() {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const chave = Deno.env.get('APNS_PRIVATE_KEY')?.replaceAll('\\n', '\n');
  if (!keyId || !teamId || !chave) return null;

  const pem = chave.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, '');
  const dados = Uint8Array.from(atob(pem), (caractere) => caractere.charCodeAt(0));
  const chavePrivada = await crypto.subtle.importKey(
    'pkcs8', dados, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const carga = base64Url(JSON.stringify({ iss: teamId, iat: agora }));
  const assinatura = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, chavePrivada, new TextEncoder().encode(`${cabecalho}.${carga}`),
  ));
  return `${cabecalho}.${carga}.${base64Url(assinatura)}`;
}

async function enviarApns(token: string, mensagem: MensagemPush) {
  const jwt = await tokenApns();
  const bundleId = Deno.env.get('APNS_BUNDLE_ID');
  if (!jwt || !bundleId) return { entregue: false, expirou: false };
  const ambiente = Deno.env.get('APNS_ENVIRONMENT') === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const titulo = mensagem.titulo || mensagem.title || 'AvantaLab';
  const corpo = mensagem.corpo || mensagem.body || '';
  const aps: Record<string, unknown> = {
    alert: { title: titulo, body: corpo },
    sound: 'default',
  };
  if (typeof mensagem.badge === 'number' && Number.isFinite(mensagem.badge)) {
    aps.badge = Math.max(0, Math.trunc(mensagem.badge));
  }
  const resposta = await fetch(`https://${ambiente}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps,
      url: mensagem.url || '/mobile', perfil: mensagem.perfil || '',
    }),
  });
  return { entregue: resposta.ok, expirou: resposta.status === 400 || resposta.status === 410 };
}

async function tokenFcm() {
  const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL');
  const chave = Deno.env.get('FCM_PRIVATE_KEY')?.replaceAll('\\n', '\n');
  if (!clientEmail || !chave) return null;

  const pem = chave.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, '');
  const dados = Uint8Array.from(atob(pem), (caractere) => caractere.charCodeAt(0));
  const chavePrivada = await crypto.subtle.importKey(
    'pkcs8', dados, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const carga = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  }));
  const assinatura = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', chavePrivada, new TextEncoder().encode(`${cabecalho}.${carga}`),
  ));
  const assertion = `${cabecalho}.${carga}.${base64Url(assinatura)}`;
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!resposta.ok) return null;
  const json = await resposta.json().catch(() => ({}));
  return typeof json.access_token === 'string' ? json.access_token : null;
}

async function enviarFcm(token: string, mensagem: MensagemPush) {
  const projeto = Deno.env.get('FCM_PROJECT_ID');
  const acesso = await tokenFcm();
  if (!projeto || !acesso) return { entregue: false, expirou: false };
  const titulo = mensagem.titulo || mensagem.title || 'AvantaLab';
  const corpo = mensagem.corpo || mensagem.body || '';
  const resposta = await fetch(`https://fcm.googleapis.com/v1/projects/${projeto}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${acesso}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: titulo, body: corpo },
        data: { url: mensagem.url || '/mobile', perfil: mensagem.perfil || '' },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'avantalab_avisos',
            sound: 'default',
            notification_count: typeof mensagem.badge === 'number' ? Math.max(0, Math.trunc(mensagem.badge)) : undefined,
          },
        },
      },
    }),
  });
  // Tokens inválidos do FCM retornam 404 (UNREGISTERED) ou 400 (INVALID_ARGUMENT).
  return { entregue: resposta.ok, expirou: resposta.status === 404 || resposta.status === 400 };
}

async function contarAvisosPendentes(db: any, userId: string, cache?: CacheBadges) {
  if (cache?.has(userId)) return cache.get(userId) ?? null;

  try {
    const { data: vinculos, error: erroVinculos } = await db
      .from('usuarios_empresa')
      .select('empresa_id, perfil')
      .eq('user_id', userId);
    if (erroVinculos) throw erroVinculos;

    const empresasIds = Array.from(new Set(
      (vinculos || [])
        .filter((vinculo: any) => vinculo.perfil !== 'funcionario_ponto')
        .map((vinculo: any) => vinculo.empresa_id)
        .filter(Boolean),
    ));
    const consultas = [
      db.from('notificacoes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ];
    if (empresasIds.length) {
      consultas.push(
        db.from('notificacoes').select('id', { count: 'exact', head: true }).is('user_id', null).in('empresa_id', empresasIds),
      );
    }
    const respostas = await Promise.all(consultas);
    if (respostas.some((resposta: any) => resposta.error)) throw new Error('Não foi possível contar os avisos pendentes.');

    const total = respostas.reduce((soma: number, resposta: any) => soma + Number(resposta.count || 0), 0);
    cache?.set(userId, total);
    return total;
  } catch (_) {
    // Sem uma contagem confirmada, não alteramos o selo já existente no iPhone.
    // A Gestão o reconcilia assim que voltar a ter conexão.
    cache?.set(userId, null);
    return null;
  }
}

export async function enviarPush(db: any, assinatura: AssinaturaPush, mensagem: MensagemPush, cacheBadges?: CacheBadges) {
  if (assinatura.canal === 'apns' && assinatura.apns_token) {
    const badge = assinatura.user_id
      ? await contarAvisosPendentes(db, assinatura.user_id, cacheBadges)
      : null;
    const resultado = await enviarApns(
      assinatura.apns_token,
      badge === null ? mensagem : { ...mensagem, badge },
    );
    if (resultado.expirou) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return resultado.entregue;
  }

  if (assinatura.canal === 'fcm' && assinatura.fcm_token) {
    const badge = assinatura.user_id
      ? await contarAvisosPendentes(db, assinatura.user_id, cacheBadges)
      : null;
    const resultado = await enviarFcm(
      assinatura.fcm_token,
      badge === null ? mensagem : { ...mensagem, badge },
    );
    if (resultado.expirou) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return resultado.entregue;
  }

  const publico = Deno.env.get('VAPID_PUBLIC_KEY');
  const privado = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publico || !privado || !assinatura.p256dh || !assinatura.auth) return false;
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@avantalab.com.br', publico, privado);
  try {
    await webpush.sendNotification(
      { endpoint: assinatura.endpoint, keys: { p256dh: assinatura.p256dh, auth: assinatura.auth } },
      JSON.stringify(mensagem),
    );
    return true;
  } catch (erro: any) {
    if ([404, 410].includes(erro?.statusCode)) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return false;
  }
}
