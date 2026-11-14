import Image from 'next/image';
import { AVANTAVENDAS_APP_STORE_URL_PADRAO, AVANTAVENDAS_PLAY_STORE_URL_PADRAO, obterLinksDownloadAvantaVendas } from '../lib/avantavendas-download';
import styles from '../styles/landing/landing-apps.module.css';

type AppAvanta = {
  nome: string;
  contexto: string;
  descricao: string;
  icone: string;
  tela: string;
  appStoreUrl: string;
  googlePlayUrl?: string;
  recursos: readonly string[];
};

const aplicativos: readonly AppAvanta[] = [
  {
    nome: 'AvantaLab Gestão',
    contexto: 'Gestão financeira e operacional',
    descricao: 'Organize o financeiro, acompanhe indicadores, agenda, equipe e avisos em uma experiência feita para o celular.',
    icone: '/images/avantalab-icon-512.png',
    tela: '/images/landing/avantalab-gestao-dashboard.jpg',
    appStoreUrl: 'https://apps.apple.com/br/app/avantalab/id6793744930',
    googlePlayUrl: 'https://play.google.com/store/apps/details?id=br.com.avantalab.app',
    recursos: ['Receitas e despesas', 'Agenda e indicadores', 'Equipe e notificações'],
  },
  {
    nome: 'AvantaVendas',
    contexto: 'Sua rotina comercial no celular',
    descricao: 'Cuide de clientes, produtos, pedidos, pagamentos e materiais de divulgação sem depender do computador.',
    icone: '/images/avanta-vendas-pwa-512.png',
    tela: '/images/landing/avantavendas-dashboard.jpg',
    appStoreUrl: AVANTAVENDAS_APP_STORE_URL_PADRAO,
    googlePlayUrl: AVANTAVENDAS_PLAY_STORE_URL_PADRAO,
    recursos: ['Clientes e produtos', 'Pedidos e pagamentos', 'Conteúdos de divulgação'],
  },
];

function IconeApple() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-store-logo="apple">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.5 7.59 9.04 7.31c1.35.07 2.29.77 3.08.83 1.18-.24 2.31-.96 3.57-.87 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.1l.01-.02ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function IconeGooglePlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-store-logo="google-play">
      <path fill="#4285F4" d="M3.4 2.1a1.4 1.4 0 0 0-.4 1v17.8c0 .4.1.7.4 1L13.3 12Z" />
      <path fill="#34A853" d="m3.4 2.1 9.9 9.9 3.2-3.2L5 2a1.4 1.4 0 0 0-1.6.1Z" />
      <path fill="#FBBC04" d="m16.5 8.8-3.2 3.2 3.2 3.2 4-2.3a1 1 0 0 0 0-1.8Z" />
      <path fill="#EA4335" d="m3.4 21.9 9.9-9.9 3.2 3.2L5 22a1.4 1.4 0 0 1-1.6-.1Z" />
    </svg>
  );
}

export default function LandingAppsSection() {
  const linksAvantaVendas = obterLinksDownloadAvantaVendas();
  return (
    <section className={styles.section} id="nossos-apps" aria-labelledby="titulo-aplicativos">
      <div className={styles.wrap} data-scroll-target>
        <div className={styles.intro}>
          <div>
            <p className={styles.kicker}>Aplicativos AvantaLab</p>
            <h2 id="titulo-aplicativos">AvantaLab no seu celular.</h2>
          </div>
          <p>Baixe nossos aplicativos oficiais e acompanhe sua gestão e suas vendas onde estiver.</p>
        </div>

        <div className={styles.grid}>
          {aplicativos.map((aplicativo) => {
            const ehAvantaVendas = aplicativo.nome === 'AvantaVendas';
            const appStoreUrl = ehAvantaVendas ? linksAvantaVendas.appStoreUrl : aplicativo.appStoreUrl;
            const googlePlayUrl = ehAvantaVendas ? linksAvantaVendas.playStoreUrl : aplicativo.googlePlayUrl;
            return (
            <article
              className={styles.card}
              id={ehAvantaVendas ? 'avantavendas' : undefined}
              key={aplicativo.nome}
            >
              <div className={styles.cardContent}>
                <header className={styles.cardHeader}>
                  <Image src={aplicativo.icone} alt="" width={512} height={512} sizes="72px" />
                  <div>
                    <p>{aplicativo.contexto}</p>
                    <h3>{aplicativo.nome}</h3>
                  </div>
                </header>
                <p className={styles.description}>{aplicativo.descricao}</p>
                <ul>
                  {aplicativo.recursos.map((recurso) => <li key={recurso}>{recurso}</li>)}
                </ul>
                <div className={styles.storeActions}>
                  <a
                    className={styles.appStoreButton}
                    href={appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Baixar ${aplicativo.nome} na App Store (abre em nova aba)`}
                  >
                    <IconeApple />
                    <span><small>Baixar na</small><strong>App Store</strong></span>
                  </a>
                  {googlePlayUrl ? (
                    <a
                      className={styles.googlePlayButton}
                      href={googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Baixar ${aplicativo.nome} no Google Play (abre em nova aba)`}
                    >
                      <IconeGooglePlay />
                      <span><small>Baixar no</small><strong>Google Play</strong></span>
                    </a>
                  ) : (
                    <span className={styles.googlePlaySoon} aria-label="Google Play: em breve">
                      <IconeGooglePlay />
                      <span><small>Em breve na</small><strong>Google Play</strong></span>
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.preview} aria-hidden="true">
                <Image src={aplicativo.tela} alt="" fill sizes="(max-width: 640px) 120px, (max-width: 1050px) 132px, 170px" />
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
