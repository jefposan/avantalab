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
  app_origem?: 'mobile' | 'ponto' | 'avantavendas';
};

type MensagemPush = {
  titulo?: string;
  corpo?: string;
  title?: string;
  body?: string;
  url?: string;
  perfil?: string;
  badge?: number;
  appOrigem?: 'mobile' | 'ponto' | 'avantavendas';
};

type CacheBadges = Map<string, number | null>;
export type ResultadoEnvioPush = {
  entregue: boolean;
  expirou: boolean;
  canal: 'web' | 'apns' | 'fcm';
  status: number;
  motivo: string;
  idProvedor: string | null;
};
let tokenFcmCache: { token: string; expiraEm: number } | null = null;
let tokenApnsCache: { token: string; expiraEm: number } | null = null;

function base64Url(valor: Uint8Array | string) {
  const bytes = typeof valor === 'string' ? new TextEncoder().encode(valor) : valor;
  let texto = '';
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function tokenApns() {
  if (tokenApnsCache && tokenApnsCache.expiraEm > Date.now() + 5 * 60_000) {
    return tokenApnsCache.token;
  }
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
  const token = `${cabecalho}.${carga}.${base64Url(assinatura)}`;
  // A Apple permite reutilizar o provider token por até uma hora e pode
  // bloquear trocas sucessivas com TooManyProviderTokenUpdates.
  tokenApnsCache = { token, expiraEm: (agora + 50 * 60) * 1000 };
  return token;
}

async function tokenFcm() {
  if (tokenFcmCache && tokenFcmCache.expiraEm > Date.now() + 60_000) return tokenFcmCache.token;
  const segredo = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON_AVANTAVENDAS');
  if (!segredo) return null;
  const conta = JSON.parse(segredo);
  const email = String(conta.client_email || '');
  const projeto = String(conta.project_id || '');
  const chave = String(conta.private_key || '').replaceAll('\\n', '\n');
  if (!email || !projeto || !chave) return null;
  const pem = chave.replace(/-----(BEGIN|END) PRIVATE KEY-----|\s/g, '');
  const dados = Uint8Array.from(atob(pem), (caractere) => caractere.charCodeAt(0));
  const chavePrivada = await crypto.subtle.importKey(
    'pkcs8', dados, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const carga = base64Url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  }));
  const assinatura = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', chavePrivada, new TextEncoder().encode(`${cabecalho}.${carga}`),
  ));
  const jwt = `${cabecalho}.${carga}.${base64Url(assinatura)}`;
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!resposta.ok) return null;
  const json = await resposta.json();
  const token = String(json.access_token || '');
  if (!token) return null;
  tokenFcmCache = { token, expiraEm: Date.now() + Number(json.expires_in || 3600) * 1000 };
  return token;
}

async function enviarFcm(tokenDispositivo: string, mensagem: MensagemPush) {
  const segredo = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON_AVANTAVENDAS');
  if (!segredo) return { entregue: false, expirou: false, canal: 'fcm' as const, status: 0, motivo: 'ConfiguracaoFCMAusente', idProvedor: null };
  const projeto = String(JSON.parse(segredo).project_id || '');
  const acesso = await tokenFcm();
  if (!projeto || !acesso) return { entregue: false, expirou: false, canal: 'fcm' as const, status: 0, motivo: 'AutenticacaoFCMIndisponivel', idProvedor: null };
  const resposta = await fetch(`https://fcm.googleapis.com/v1/projects/${projeto}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: tokenDispositivo,
        notification: {
          title: mensagem.titulo || mensagem.title || 'AvantaVendas',
          body: mensagem.corpo || mensagem.body || '',
        },
        data: { url: mensagem.url || '/avantavendas' },
        android: { priority: 'high' },
      },
    }),
  });
  const detalhe = resposta.ok ? '' : await resposta.text().catch(() => '');
  const respostaJson: Record<string, unknown> = resposta.ok
    ? await resposta.json().catch(() => ({} as Record<string, unknown>))
    : {};
  return {
    entregue: resposta.ok,
    expirou: resposta.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(detalhe),
    canal: 'fcm' as const,
    status: resposta.status,
    motivo: resposta.ok ? '' : detalhe.slice(0, 240),
    idProvedor: String(respostaJson?.name || '') || null,
  };
}

async function enviarApns(token: string, mensagem: MensagemPush) {
  const jwt = await tokenApns();
  const bundleId = mensagem.appOrigem === 'avantavendas'
    ? Deno.env.get('APNS_BUNDLE_ID_AVANTAVENDAS') || 'br.com.avantalab.vendas'
    : Deno.env.get('APNS_BUNDLE_ID');
  if (!jwt || !bundleId) return { entregue: false, expirou: false, canal: 'apns' as const, status: 0, motivo: 'ConfiguracaoAPNSAusente', idProvedor: null };
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
  const detalhe: Record<string, unknown> = resposta.ok
    ? {}
    : await resposta.json().catch(() => ({} as Record<string, unknown>));
  return {
    entregue: resposta.ok,
    expirou: resposta.status === 400 || resposta.status === 410,
    canal: 'apns' as const,
    status: resposta.status,
    motivo: String(detalhe?.reason || ''),
    idProvedor: resposta.headers.get('apns-id'),
  };
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

export async function enviarPushDetalhado(db: any, assinatura: AssinaturaPush, mensagem: MensagemPush, cacheBadges?: CacheBadges): Promise<ResultadoEnvioPush> {
  if (assinatura.canal === 'fcm' && assinatura.fcm_token) {
    const resultado = await enviarFcm(assinatura.fcm_token, mensagem);
    if (resultado.expirou) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return resultado;
  }
  if (assinatura.canal === 'apns' && assinatura.apns_token) {
    const origem = mensagem.appOrigem || assinatura.app_origem;
    const badge = assinatura.user_id && origem !== 'avantavendas'
      ? await contarAvisosPendentes(db, assinatura.user_id, cacheBadges)
      : null;
    const resultado = await enviarApns(
      assinatura.apns_token,
      badge === null ? mensagem : { ...mensagem, badge },
    );
    if (resultado.expirou) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return resultado;
  }

  const publico = Deno.env.get('VAPID_PUBLIC_KEY');
  const privado = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publico || !privado || !assinatura.p256dh || !assinatura.auth) {
    return { entregue: false, expirou: false, canal: 'web', status: 0, motivo: 'ConfiguracaoWebPushIncompleta', idProvedor: null };
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@avantalab.com.br', publico, privado);
  try {
    await webpush.sendNotification(
      { endpoint: assinatura.endpoint, keys: { p256dh: assinatura.p256dh, auth: assinatura.auth } },
      JSON.stringify(mensagem),
    );
    return { entregue: true, expirou: false, canal: 'web', status: 201, motivo: '', idProvedor: null };
  } catch (erro: any) {
    if ([404, 410].includes(erro?.statusCode)) await db.from('push_subscriptions').delete().eq('id', assinatura.id);
    return {
      entregue: false,
      expirou: [404, 410].includes(erro?.statusCode),
      canal: 'web',
      status: Number(erro?.statusCode || 0),
      motivo: String(erro?.body || erro?.message || '').slice(0, 240),
      idProvedor: null,
    };
  }
}

export async function enviarPush(db: any, assinatura: AssinaturaPush, mensagem: MensagemPush, cacheBadges?: CacheBadges) {
  return (await enviarPushDetalhado(db, assinatura, mensagem, cacheBadges)).entregue;
}
