import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

async function fontes() {
  const [gestao, ponteGestao, vendas, vendasDb, ponteVendas] = await Promise.all([
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
    readFile(new URL('app/mobile/NativePushNotificationsBridge.tsx', raiz), 'utf8'),
    readFile(new URL('app/avantavendas/sistema/app.js', raiz), 'utf8'),
    readFile(new URL('app/avantavendas/sistema/supabase-client.js', raiz), 'utf8'),
    readFile(new URL('app/avantavendas/NativePushNotificationsBridge.tsx', raiz), 'utf8'),
  ]);
  return { gestao, ponteGestao, vendas, vendasDb, ponteVendas };
}

test('a Gestão pede autorização uma vez por usuário e aparelho após preparar o acesso', async () => {
  const { gestao } = await fontes();

  assert.match(gestao, /PREFIXO_PROMPT_NOTIF_ANTERIOR = 'avantalab:notificacoes-primeiro-acesso:v1:gestao:';/);
  assert.match(gestao, /PREFIXO_PROMPT_NOTIF = 'avantalab:notificacoes-primeiro-acesso:v2:gestao:';/);
  assert.match(gestao, /PREFIXO_PROMPT_NOTIF \+ state\.usuario\.id/);
  assert.match(gestao, /atualizarEstadoNotificacoesMobile\(false\)\.then\(avaliarPromptNotificacoes\)/);
  assert.match(gestao, /suporteNativo = typeof window\.__avantalabAtivarPushNativoMobile === 'function'/);
  assert.match(gestao, /Receba lembretes e avisos importantes da sua gestão/);
  assert.match(gestao, /marcarPromptNotifVisto\('adiado'\)/);
  assert.match(gestao, /marcarPromptNotifVisto\(ativadas \? 'ativado' : 'negado'\)/);
  assert.match(gestao, /marcarPromptNotifVisto\('desativado'\)/);
});

test('a Gestão sincroniza automaticamente permissões nativas já concedidas em APNs e FCM', async () => {
  const { gestao, ponteGestao } = await fontes();

  assert.match(ponteGestao, /__avantalabSincronizarPushNativoMobile/);
  assert.match(ponteGestao, /Capacitor\.getPlatform\(\) === 'android' \? 'fcm' : 'apns'/);
  assert.match(gestao, /__avantalabSincronizarPushNativoMobile\(\)/);
  assert.match(gestao, /endpoint: tokenNativo\.canal \+ ':' \+ tokenNativo\.token/);
  assert.match(gestao, /fcm_token: tokenNativo\.canal === 'fcm' \? tokenNativo\.token : null/);
});

test('o AvantaVendas sincroniza permissões concedidas e oferece o consentimento no primeiro acesso', async () => {
  const { vendas, vendasDb, ponteVendas } = await fontes();

  assert.match(vendas, /PREFIXO_PROMPT_NOTIFICACOES_VENDAS_ANTERIOR = 'avantalab:notificacoes-primeiro-acesso:v1:avantavendas:';/);
  assert.match(vendas, /PREFIXO_PROMPT_NOTIFICACOES_VENDAS = 'avantalab:notificacoes-primeiro-acesso:v2:avantavendas:';/);
  assert.match(vendas, /estadoNotificacoes\?\.\(permiteSincronizarNotificacoesVendas\(\)\)/);
  assert.match(vendas, /Primeiro acesso neste aparelho/);
  assert.match(vendas, /Receba lembretes e avisos importantes das suas vendas/);
  assert.match(vendas, /confirmarNotificacoesPrimeiroAcessoVendas/);
  assert.match(vendas, /adiarNotificacoesPrimeiroAcessoVendas/);
  assert.match(ponteVendas, /__avantavendasSincronizarPushNativo/);
  assert.match(vendasDb, /__avantavendasSincronizarPushNativo\(\)/);
  assert.match(vendasDb, /await salvarInscricaoNativa\(user, registroNativo\)/);
  assert.match(vendasDb, /await salvarInscricaoWeb\(user, inscricao\)/);
});

test('uma desativação explícita não é revertida silenciosamente no login seguinte', async () => {
  const { gestao, vendas, vendasDb } = await fontes();

  assert.match(gestao, /notificacoesDesativadasExplicitamenteMobile/);
  assert.match(gestao, /valorAtual === 'desativado' \|\| valorAnterior === 'desativado'/);
  assert.match(vendas, /notificacoesDesativadasExplicitamenteVendas/);
  assert.match(vendas, /valorAtual === 'desativado' \|\| valorAnterior === 'desativado'/);
  assert.match(vendasDb, /async function estadoNotificacoes\(sincronizar = true\) \{\s*if \(!sincronizar\) return false;/);
});

test('usuários que adiaram o convite anterior recebem uma nova oportunidade', async () => {
  const { gestao, vendas } = await fontes();

  assert.match(gestao, /PREFIXO_PROMPT_NOTIF_ANTERIOR/);
  assert.match(gestao, /PREFIXO_PROMPT_NOTIF = .*:v2:gestao:/);
  assert.doesNotMatch(gestao, /return \['adiado', 'negado', 'negado-sistema', 'desativado'\]/);
  assert.match(vendas, /PREFIXO_PROMPT_NOTIFICACOES_VENDAS_ANTERIOR/);
  assert.match(vendas, /PREFIXO_PROMPT_NOTIFICACOES_VENDAS = .*:v2:avantavendas:/);
  assert.doesNotMatch(vendas, /\['adiado', 'negado', 'negado-sistema', 'desativado'\]\.includes/);
});
