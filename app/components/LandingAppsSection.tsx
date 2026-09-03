import Image from 'next/image';
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
    recursos: ['Receitas e despesas', 'Agenda e indicadores', 'Equipe e notificações'],
  },
  {
    nome: 'AvantaVendas',
    contexto: 'Sua rotina comercial no celular',
    descricao: 'Cuide de clientes, produtos, pedidos, pagamentos e materiais de divulgação sem depender do computador.',
    icone: '/images/avanta-vendas-pwa-512.png',
    tela: '/images/landing/avantavendas-dashboard.jpg',
    appStoreUrl: 'https://apps.apple.com/br/app/avantavendas/id6797617650',
    googlePlayUrl: 'https://play.google.com/store/apps/details?id=br.com.avantalab.vendas',
    recursos: ['Clientes e produtos', 'Pedidos e pagamentos', 'Conteúdos de divulgação'],
  },
];

function IconeDownload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}

function IconeGooglePlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 4.8 11.2 6.3a1 1 0 0 1 0 1.8L6.5 19.2a1 1 0 0 1-1.5-.9V5.7a1 1 0 0 1 1.5-.9Z" />
      <path d="m6.2 5.1 7.2 6.9-7.2 6.9" />
    </svg>
  );
}

export default function LandingAppsSection() {
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
          {aplicativos.map((aplicativo) => (
            <article className={styles.card} key={aplicativo.nome}>
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
                    href={aplicativo.appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Baixar ${aplicativo.nome} na App Store (abre em nova aba)`}
                  >
                    <IconeDownload />
                    <span><small>Baixar na</small><strong>App Store</strong></span>
                  </a>
                  {aplicativo.googlePlayUrl ? (
                    <a
                      className={styles.googlePlayButton}
                      href={aplicativo.googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Baixar ${aplicativo.nome} na Google Play (abre em nova aba)`}
                    >
                      <IconeGooglePlay />
                      <span><small>Disponível na</small><strong>Google Play</strong></span>
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
          ))}
        </div>
      </div>
    </section>
  );
}
