import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

async function fontes() {
  const [mobile, ponteNativa, push, enviar, broadcast, agenda, despesas, assinaturas] = await Promise.all([
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
    readFile(new URL('app/mobile/NativePushNotificationsBridge.tsx', raiz), 'utf8'),
    readFile(new URL('supabase/functions/_shared/push.ts', raiz), 'utf8'),
    readFile(new URL('supabase/functions/enviar-push/index.ts', raiz), 'utf8'),
    readFile(new URL('supabase/functions/broadcast/index.ts', raiz), 'utf8'),
    readFile(new URL('supabase/functions/processar-agenda/index.ts', raiz), 'utf8'),
    readFile(new URL('supabase/functions/processar-despesas-dia/index.ts', raiz), 'utf8'),
    readFile(new URL('supabase/functions/processar-avisos-assinaturas/index.ts', raiz), 'utf8'),
  ]);
  return { mobile, ponteNativa, push, enviar, broadcast, agenda, despesas, assinaturas };
}

test('o APNs recebe a quantidade real, sem forçar badge 1', async () => {
  const { push } = await fontes();

  assert.doesNotMatch(push, /badge:\s*Math\.max\(1,/);
  assert.match(push, /async function contarAvisosPendentes/);
  assert.match(push, /\.eq\('user_id', userId\)/);
  assert.match(push, /\.is\('user_id', null\)\.in\('empresa_id', empresasIds\)/);
  assert.match(push, /aps\.badge = Math\.max\(0, Math\.trunc\(mensagem\.badge\)\)/);
});

test('todas as rotas de push identificam o usuário da inscrição antes de enviar ao APNs', async () => {
  const { enviar, broadcast, agenda, despesas, assinaturas } = await fontes();
  const funcoes = [enviar, broadcast, agenda, despesas, assinaturas];

  for (const funcao of funcoes) {
    assert.match(funcao, /user_id, endpoint, p256dh, auth, canal, apns_token/);
    assert.match(funcao, /enviarPush\([\s\S]*cacheBadges\)/);
  }
});

test('a Gestão sincroniza o selo na retomada e elimina a corrida com a ponte iOS', async () => {
  const { mobile, ponteNativa } = await fontes();

  assert.match(mobile, /var CHAVE_BADGE_APP_MOBILE = 'avantalab\.mobile\.badge'/);
  assert.match(mobile, /localStorage\.setItem\(CHAVE_BADGE_APP_MOBILE, String\(total\)\)/);
  assert.match(mobile, /if \(!state\.usuario \|\| !state\.usuario\.id\) \{[\s\S]*atualizarBadgeApp\(0\)/);
  assert.match(mobile, /window\.addEventListener\('pageshow', function \(\) \{[\s\S]*carregarNotificacoesNaoLidas\(\)/);
  assert.match(mobile, /if \(resposta\.error\) throw resposta\.error/);
  assert.match(ponteNativa, /const BADGE_KEY = 'avantalab\.mobile\.badge'/);
  assert.match(ponteNativa, /badgePersistido = Number\(localStorage\.getItem\(BADGE_KEY\)\)/);
  assert.match(ponteNativa, /NativeBadge\.set\(\{ count: total \}\)/);
});
