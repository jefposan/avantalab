import type { Metadata, Viewport } from 'next';
import AvaMobileBridge from './AvaMobileBridge';
import BackupMobileBridge from './BackupMobileBridge';
import VendasMobileConteudoBridge from './VendasMobileConteudoBridge';
import { APP_VERSION } from '../lib/version';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://avantalab.com.br';
const shareImage = 'https://avantalab.com.br/images/avantalab-share-meta-safe-center-v2.jpg';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AvantaLab Gestão Mobile',
  description:
    'Controle entradas, despesas e saldo do seu negócio ou das suas finanças pessoais pelo celular.',
  manifest: '/mobile-manifest.json',
  openGraph: {
    title: 'AvantaLab Gestão',
    description:
      'Descubra quanto realmente sobra no seu negócio ou nas suas despesas pessoais.',
    type: 'website',
    siteName: 'AvantaLab Gestão',
    images: [
      {
        url: shareImage,
        secureUrl: shareImage,
        width: 1200,
        height: 628,
        alt: 'AvantaLab Gestão',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab Gestão',
    description:
      'Controle entradas, despesas e saldo de forma simples pelo celular.',
    images: [shareImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AvantaLab',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'overlays-content',
  themeColor: '#003E73',
};

export default function MobilePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const cobrancaAtiva = process.env.NEXT_PUBLIC_COBRANCA_ATIVA === 'true' ? 'true' : 'false';
  const mobileAssetVersion = '309';
  const bootstrapCarregamento = `
    (function () {
      var pesos = { shell: 5, scripts: 15, auth: 10, profiles: 20, access: 10, data: 40 };
      var progresso = window.__AVANTALAB_MOBILE_PROGRESSO__ || { grupos: {}, valor: 0, rotulo: 'Iniciando a Gestão Mobile' };
      window.__AVANTALAB_MOBILE_PROGRESSO__ = progresso;
      window.__avantalabAtualizarProgressoMobile = function (grupo, concluido, total, rotulo) {
        var fracao = total > 0 ? Math.max(0, Math.min(1, Number(concluido || 0) / Number(total))) : 0;
        progresso.grupos[grupo] = Math.max(Number(progresso.grupos[grupo] || 0), fracao);
        var calculado = Object.keys(pesos).reduce(function (soma, chave) {
          return soma + pesos[chave] * Number(progresso.grupos[chave] || 0);
        }, 0);
        progresso.valor = Math.max(progresso.valor, Math.min(100, Math.round(calculado)));
        if (rotulo) progresso.rotulo = rotulo;
        var barra = document.getElementById('mobileAccessProgressBar');
        var texto = document.getElementById('mobileAccessProgressValue');
        var etapa = document.getElementById('mobileAccessProgressLabel');
        if (barra) barra.style.width = progresso.valor + '%';
        if (texto) texto.textContent = progresso.valor + '%';
        if (etapa) etapa.textContent = progresso.rotulo;
      };
      window.__avantalabReiniciarProgressoMobile = function (rotulo) {
        progresso.grupos = {
          shell: Number(progresso.grupos.shell || 0),
          scripts: Number(progresso.grupos.scripts || 0),
        };
        progresso.valor = Math.round(
          pesos.shell * progresso.grupos.shell +
          pesos.scripts * progresso.grupos.scripts
        );
        progresso.rotulo = rotulo || 'Validando sua sessão';
        window.__avantalabAtualizarProgressoMobile('auth', 0, 1, progresso.rotulo);
      };
      window.__avantalabAtualizarProgressoMobile('shell', 1, 1, 'Preparando recursos do aplicativo');

      var arquivos = ['/mobile-supabase.js', '/mobile-app.js'];
      function falhar(arquivo) {
        var root = document.getElementById('mobile-root');
        if (root) root.innerHTML = '<section class="fixed inset-0 grid place-items-center bg-slate-100 px-5 text-slate-900"><div class="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl"><h1 class="text-lg font-black">Não foi possível carregar a Gestão Mobile.</h1><button class="mt-4 rounded-full bg-cyan-700 px-5 py-3 text-xs font-black uppercase text-white" onclick="window.location.reload()">Tentar novamente</button></div></section>';
        console.error('Falha ao carregar ' + arquivo);
      }
      function carregar(indice) {
        if (indice >= arquivos.length) return;
        var script = document.createElement('script');
        script.src = arquivos[indice] + '?v=${mobileAssetVersion}';
        script.onload = function () {
          window.__avantalabAtualizarProgressoMobile(
            'scripts',
            indice + 1,
            arquivos.length,
            indice + 1 === arquivos.length ? 'Aplicativo carregado' : 'Carregando conexão segura'
          );
          carregar(indice + 1);
        };
        script.onerror = function () { falhar(arquivos[indice]); };
        document.body.appendChild(script);
      }
      carregar(0);
    })();
  `;

  return (
    <main className="min-h-screen bg-slate-950 text-white" style={{overflow:'visible'}}>
      <link
        rel="preload"
        href="/images/bg-avantalab-mobile.webp"
        as="image"
        type="image/webp"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes avaBounce { 0%,80%,100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-5px); opacity: 1; } }
            @keyframes avaPulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); } 70% { box-shadow: 0 0 0 9px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
            @keyframes avaFadeUp { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes avaSpin { to { transform: rotate(360deg); } }
            @keyframes avaSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            @keyframes avaSlideOut { from { transform: translateX(0); } to { transform: translateX(100%); } }
            @keyframes menuSlideIn { from { transform: translate3d(-100%,0,0); } to { transform: translate3d(0,0,0); } }
            @keyframes menuSlideOut { from { transform: translate3d(0,0,0); } to { transform: translate3d(-100%,0,0); } }
            @keyframes menuOverlayIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes menuOverlayOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes configSubIn { from { max-height: 0; opacity: 0; transform: translateY(-6px); } to { max-height: 720px; opacity: 1; transform: translateY(0); } }
            @keyframes configSubOut { from { max-height: 720px; opacity: 1; transform: translateY(0); } to { max-height: 0; opacity: 0; transform: translateY(-6px); } }
            @keyframes agendaInProx { from { opacity: .35; transform: translateX(26px); } to { opacity: 1; transform: none; } }
            @keyframes agendaInPrev { from { opacity: .35; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
            @keyframes pullRefreshSpin { to { transform: rotate(270deg); } }
            @keyframes pullRefreshReady { 0%,100% { filter: drop-shadow(0 0 5px rgba(56,189,248,.35)); } 50% { filter: drop-shadow(0 0 12px rgba(56,189,248,.78)); } }
            .agenda-anim-prox { animation: agendaInProx .24s ease-out; }
            .agenda-anim-prev { animation: agendaInPrev .24s ease-out; }
            #chat-ia-input::placeholder { color: #94a3b8; opacity: 1; }
            #chat-ia-input { background: transparent !important; border: 0 !important; box-shadow: none !important; }
            #chat-ia-input:empty::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
            #chat-ia-msgs { scroll-behavior: smooth; }
            .avantalab-mobile-bg {
              background-color: #eef6fb;
              background-image: var(--avantalab-mobile-bg-overlay, none), image-set(url('/images/bg-avantalab-mobile.webp') type('image/webp'), url('/images/bg-avantalab-mobile.png') type('image/png'));
              background-position: center bottom;
              background-repeat: no-repeat;
              background-size: cover;
              background-attachment: fixed;
            }

            .avantalab-mobile-bg-login {
              background-image: var(--avantalab-mobile-bg-overlay, none), image-set(url('/images/bg-avantalab-mobile-1080x1920.webp') type('image/webp'), url('/images/bg-avantalab-mobile-1080x1920.png') type('image/png'));
              background-size: 100% auto;
            }

            @media (min-aspect-ratio: 9/16) {
              .avantalab-mobile-bg-login {
                background-size: auto 100%;
              }
            }

            @media (max-aspect-ratio: 9/18) {
              .avantalab-mobile-bg-login {
                background-size: auto 100%;
              }
            }

            @supports (-webkit-touch-callout: none) {
              .avantalab-mobile-bg {
                background-attachment: scroll;
              }
            }

            .mobile-dark .bg-white,
            .mobile-dark .bg-white\\/90,
            .mobile-dark .bg-slate-50,
            .mobile-dark .bg-slate-100 {
              background-color: #0f172a !important;
            }

            .mobile-dark .bg-cyan-50,
            .mobile-dark .bg-cyan-50\\/70,
            .mobile-dark .bg-cyan-50\\/90,
            .mobile-dark .bg-red-50,
            .mobile-dark .bg-red-50\\/60,
            .mobile-dark .bg-emerald-50,
            .mobile-dark .bg-emerald-50\\/60,
            .mobile-dark .bg-rose-50 {
              background-color: rgba(15, 23, 42, 0.92) !important;
            }

            .mobile-dark .border-slate-100,
            .mobile-dark .border-slate-200,
            .mobile-dark .border-slate-300,
            .mobile-dark .border-cyan-100,
            .mobile-dark .border-cyan-200,
            .mobile-dark .border-emerald-100,
            .mobile-dark .border-emerald-200,
            .mobile-dark .border-red-100,
            .mobile-dark .border-rose-100,
            .mobile-dark .border-rose-200 {
              border-color: rgba(148, 163, 184, 0.28) !important;
            }

            .mobile-dark .text-slate-900,
            .mobile-dark .text-slate-800,
            .mobile-dark .text-slate-700 {
              color: #f8fafc !important;
            }

            .mobile-dark .text-slate-600,
            .mobile-dark .text-slate-500,
            .mobile-dark .text-slate-400 {
              color: #cbd5e1 !important;
            }

            .mobile-dark .mobile-config-main-btn {
              background: linear-gradient(90deg, #0f766e 0%, #075985 100%) !important;
              border-color: rgba(125, 211, 252, 0.42) !important;
              color: #f8fafc !important;
              box-shadow: 0 8px 18px rgba(8, 47, 73, 0.28) !important;
            }

            .mobile-dark .mobile-config-main-btn .mobile-config-main-title,
            .mobile-dark .mobile-config-main-btn .mobile-config-main-subtitle,
            .mobile-dark .mobile-config-main-btn .text-slate-600 {
              color: #f8fafc !important;
            }

            .mobile-dark input,
            .mobile-dark select,
            .mobile-dark textarea {
              background-color: #0f172a !important;
              border-color: rgba(148, 163, 184, 0.32) !important;
              color: #f8fafc !important;
            }

            .mobile-dark input::placeholder,
            .mobile-dark textarea::placeholder {
              color: #94a3b8 !important;
            }

            /* Sub-botoes de Configuracoes: aparencia de sub-itens com bolinha */
            .cfg-sub-group > button {
              position: relative;
            }
            .cfg-sub-group > button::before {
              content: '\\2022';
              position: absolute;
              left: -13px;
              top: 50%;
              transform: translateY(-50%);
              color: #0f172a;
              font-weight: 900;
              font-size: 14px;
              line-height: 1;
            }
            .mobile-dark .cfg-sub-group > button::before {
              color: #cbd5e1;
            }
          `,
        }}
      />
      <div
        id="mobile-root"
        data-supabase-url={supabaseUrl}
        data-supabase-anon-key={supabaseAnonKey}
        data-cobranca-ativa={cobrancaAtiva}
        data-app-version={APP_VERSION}
      >
        <section
          className="avantalab-mobile-bg fixed inset-0 flex items-center justify-center overflow-hidden px-4"
          style={{
            height: '100dvh',
            backgroundPosition: 'center bottom',
            backgroundSize: 'cover',
          }}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-white/40 bg-white/25 p-5 text-center text-slate-900 shadow-2xl backdrop-blur-xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
              AvantaLab
            </p>
            <h1 className="mt-2 text-xl font-black">
              Preparando acesso
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              <span id="mobileAccessProgressLabel">Iniciando a Gestão Mobile</span>
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-900/10" aria-label="Carregando acesso">
              <i id="mobileAccessProgressBar" className="block h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 transition-[width] duration-200" style={{ width: '5%' }} />
            </div>
            <b id="mobileAccessProgressValue" className="mt-1 block text-[11px] font-black text-cyan-700">5%</b>
          </div>
        </section>
      </div>
      <AvaMobileBridge />
      <BackupMobileBridge />
      <VendasMobileConteudoBridge />

      <script dangerouslySetInnerHTML={{ __html: bootstrapCarregamento }} />
    </main>
  );
}
