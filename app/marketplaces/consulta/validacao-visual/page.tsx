import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import styles from '../marketplaces-mobile.module.css';
import '../viewport-shell.css';

export const metadata: Metadata = {
  title: 'Validação visual do AvantaPreços',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AvantaPreços' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003E73',
};

type Props = { searchParams: Promise<{ estado?: string; segura?: string }> };

export default async function MarketplaceViewportValidationPage({ searchParams }: Props) {
  const query = await searchParams;
  const estado = query.estado;
  const safeStyle = query.segura === 'sim' ? ({ '--avanta-safe-top': '47px' } as CSSProperties) : undefined;

  if (estado === 'pronto') {
    return (
      <div className={styles.page} data-avantaprecos-viewport="ready" style={safeStyle}>
        <div className={`${styles.topbar} ${styles.topbarMobile}`}>
          <div className={styles.topbarInner}>
            <div className={styles.brand}>
              <span className={styles.brandTitle}>TRIDIUM COSMETICOS</span>
              <span className={styles.brandSubtitle}>Consulta rápida de produtos e preços</span>
            </div>
            <button type="button" className={styles.logoutButton}>Sair</button>
          </div>
        </div>
        <main className={styles.content}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Consulta rápida</p>
            <h1>Qual é o preço?</h1>
            <p>Leia o código do produto e compare em poucos segundos.</p>
          </section>
        </main>
      </div>
    );
  }

  const carregando = estado === 'carregando';
  return (
    <main className={styles.loginWrap} data-avantaprecos-viewport="access">
      {carregando ? (
        <section className={styles.loadingStage} role="status">
          <img src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" />
          <span aria-hidden="true" />
          <p>Preparando seu acesso…</p>
        </section>
      ) : (
        <><img className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" /><section className={styles.loginContent}><div className={styles.loginCard}>
          <h1>AvantaPreços</h1>
          <p>Entre para consultar produtos e preços.</p>
          <label htmlFor="validacao-login">Login</label>
          <input id="validacao-login" placeholder="Digite seu login" />
          <label htmlFor="validacao-senha">Senha</label>
          <input id="validacao-senha" type="password" placeholder="Digite sua senha" />
          <button type="button">Entrar</button>
        </div></section></>
      )}
    </main>
  );
}
