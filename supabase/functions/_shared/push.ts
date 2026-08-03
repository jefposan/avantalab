import webpush from 'npm:web-push@3.6.7';

type AssinaturaPush = {
  id: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  canal?: 'web' | 'apns';
  apns_token?: string | null;
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
  const resposta = await fetch(`https://${ambiente}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: { title: titulo, body: corpo }, badge: Math.max(1, Number(mensagem.badge || 1)), sound: 'default' },
      url: mensagem.url || '/mobile', perfil: mensagem.perfil || '',
    }),
  });
  return { entregue: resposta.ok, expirou: resposta.status === 400 || resposta.status === 410 };
}

export async function enviarPush(db: any, assinatura: AssinaturaPush, mensagem: MensagemPush) {
  if (assinatura.canal === 'apns' && assinatura.apns_token) {
    const resultado = await enviarApns(assinatura.apns_token, mensagem);
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
