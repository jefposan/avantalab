import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [mobile, web, cabecalho, versao, ponteNativa, push, enviarPush, broadcast, agenda, despesas, assinaturas] = await Promise.all([
  readFile(resolve(raiz, 'public/mobile-app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/gestao/page.tsx'), 'utf8'),
  readFile(resolve(raiz, 'app/components/AppHeader.tsx'), 'utf8'),
  readFile(resolve(raiz, 'app/lib/version.ts'), 'utf8'),
  readFile(resolve(raiz, 'app/mobile/NativePushNotificationsBridge.tsx'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/_shared/push.ts'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/enviar-push/index.ts'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/broadcast/index.ts'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/processar-agenda/index.ts'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/processar-despesas-dia/index.ts'), 'utf8'),
  readFile(resolve(raiz, 'supabase/functions/processar-avisos-assinaturas/index.ts'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

function compararVersoes(atual, minima) {
  const atualPartes = atual.split('.').map((parte) => Number(parte) || 0);
  const minimaPartes = minima.split('.').map((parte) => Number(parte) || 0);
  const totalPartes = Math.max(atualPartes.length, minimaPartes.length);
  for (let indice = 0; indice < totalPartes; indice += 1) {
    const valorAtual = atualPartes[indice] || 0;
    const valorMinimo = minimaPartes[indice] || 0;
    if (valorAtual !== valorMinimo) return valorAtual > valorMinimo ? 1 : -1;
  }
  return 0;
}

exigir(
  mobile.includes("select('id, empresa_id, titulo, corpo, url, tipo, lida, criado_em')")
    && mobile.includes("db.from('empresas').select('id, nome').in('id', empresaIds)")
    && mobile.includes("perfil_nome: nomesPorEmpresa[empresaIdAviso]"),
  'A Gestão Mobile deve resolver e apresentar o perfil de origem de cada aviso.',
);
exigir(
  web.includes("select('id, empresa_id, titulo, corpo, tipo')")
    && web.includes("supabase.from('empresas').select('id, nome').in('id', empresaIds)")
    && web.includes('perfilNome: nomesPorEmpresa.get(notificacaoEmpresaId)'),
  'A Gestão Web deve resolver e apresentar o perfil de origem de cada aviso.',
);
exigir(
  mobile.includes('Perfil: ')
    && cabecalho.includes('Perfil: {aviso.perfilNome}'),
  'Web e Mobile devem identificar visualmente o perfil em cada aviso.',
);
exigir(
  !mobile.includes('function marcarNotificacoesComoLidas()')
    && !web.includes('function marcarNotificacoesLidasWeb()')
    && web.includes('notificacoesWeb.forEach((n) => {')
    && mobile.includes("state.visao === 'home' && state.notificacoesNaoLidas > 0"),
  'Abrir ou fechar o painel não pode remover nem ocultar avisos automaticamente.',
);
exigir(
  mobile.includes('aria-label="Fechar aviso"')
    && mobile.includes('Fechar todas')
    && cabecalho.includes('aria-label="Fechar aviso"')
    && cabecalho.includes('Fechar todos'),
  'O fechamento explícito de um ou de todos os avisos deve existir nos dois ambientes.',
);
exigir(
  !push.includes('badge: Math.max(1, Number(mensagem.badge || 1))')
    && push.includes('async function contarAvisosPendentes')
    && push.includes(".is('user_id', null).in('empresa_id', empresasIds)")
    && push.includes('aps.badge = Math.max(0, Math.trunc(mensagem.badge))'),
  'O APNs deve receber a contagem real de avisos, sem forçar o selo 1.',
);
exigir(
  [enviarPush, broadcast, agenda, despesas, assinaturas].every((funcao) =>
    funcao.includes('user_id, endpoint, p256dh, auth, canal, apns_token, fcm_token')
      && funcao.includes('cacheBadges'),
  ),
  'Todo envio de push da Gestão deve identificar o usuário da inscrição para calcular o selo correto.',
);
exigir(
  mobile.includes("var CHAVE_BADGE_APP_MOBILE = 'avantalab.mobile.badge'")
    && mobile.includes('localStorage.setItem(CHAVE_BADGE_APP_MOBILE, String(total))')
    && mobile.includes('window.addEventListener(\'pageshow\'')
    && mobile.includes('if (!state.usuario || !state.usuario.id) {\n      state.notificacoesNaoLidas = 0;\n      atualizarBadgeApp(0);')
    && ponteNativa.includes("const BADGE_KEY = 'avantalab.mobile.badge'")
    && ponteNativa.includes('badgePersistido = Number(localStorage.getItem(BADGE_KEY))')
    && ponteNativa.includes('limparEntregues && total === 0')
    && ponteNativa.includes('PushNotifications.removeAllDeliveredNotifications()')
    && ponteNativa.includes('badgeConfirmadoPelaGestao !== null')
    && ponteNativa.includes("window.dispatchEvent(new CustomEvent('avantalab:badge-nativo-pronto'))")
    && mobile.includes("window.addEventListener('avantalab:badge-nativo-pronto'")
    && mobile.includes('window.setTimeout(reconciliarBadgeQuandoPonteNativaPronta, 0)'),
  'A Gestão Mobile/iOS deve reconciliar o selo ao iniciar e ao retomar, inclusive quando a ponte nativa carregar depois da página.',
);
exigir(
  mobile.includes("padding-top:calc(env(safe-area-inset-top,0px) + 12px)")
    && mobile.includes("height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 106px);max-height:680px")
    && mobile.includes("? 'flex min-h-0 flex-1 flex-col overflow-hidden p-4'")
    && mobile.includes('id="notificacoes-lista-scroll" data-preserve-scroll')
    && mobile.includes('grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain')
    && mobile.includes('touch-action:pan-y')
    && mobile.includes('flex shrink-0 items-center justify-between gap-2 pb-2'),
  'O painel Mobile deve respeitar a área segura, manter o cabeçalho fixo e fornecer altura efetiva para a rolagem dos avisos.',
);
const versaoAtual = versao.match(/APP_VERSION\s*=\s*'([^']+)'/)?.[1] || '';
exigir(
  Boolean(versaoAtual) && compararVersoes(versaoAtual, '1.6.1.125') >= 0,
  'A versão precisa registrar a atualização nativa de avisos.',
);

if (falhas.length) {
  throw new Error(`Avisos por perfil inválidos:\n- ${falhas.join('\n- ')}`);
}

console.log('Avisos por perfil e fechamento explícito validados.');
