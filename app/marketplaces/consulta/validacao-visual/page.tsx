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
  const headerSafeStyle = query.segura === 'iphone'
    ? ({ '--avanta-status-inset-top': '62px' } as CSSProperties)
    : undefined;
  const accessSafeStyle = query.segura === 'iphone'
    ? ({ '--avanta-access-viewport-height': 'calc(100dvh - 62px)', '--avanta-access-safe-extension': '62px' } as CSSProperties)
    : undefined;

  if (estado === 'pronto') {
    return (
      <div className={styles.page} data-avantaprecos-viewport="ready">
        <div className={`${styles.topbar} ${styles.topbarMobile}`} style={headerSafeStyle}>
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
          <section className={styles.manualCard} aria-labelledby="validacao-manual-title">
            <h2 id="validacao-manual-title">Consultar manualmente</h2>
            <form>
              <label htmlFor="validacao-ean">EAN / código de barras</label>
              <div className={styles.inputAction}><input id="validacao-ean" inputMode="numeric" placeholder="Ex.: 7898996110321" /><button type="button" aria-label="Consultar EAN">⌕</button></div>
            </form>
            <div className={styles.divider}><span>ou</span></div>
            <form>
              <label htmlFor="validacao-produto">Pesquisar produto</label>
              <div className={styles.inputAction}><input id="validacao-produto" placeholder="Nome, marca ou modelo" /><button type="button" aria-label="Pesquisar produto">⌕</button></div>
            </form>
          </section>
          <section className={styles.scanSection} aria-label="Ler EAN com a câmera">
            <button type="button" className={styles.scanButton}><span>◉</span><strong>Ler EAN</strong><small>Abrir câmera</small></button>
            <p className={styles.connectionOk}><span /> Mercado Livre conectado</p>
          </section>
          <button type="button" className={styles.allPricedProductsButton}>Ver produtos precificados</button>
          <section className={styles.historySection} aria-labelledby="validacao-history-title">
            <div className={styles.sectionTitle}><span><span aria-hidden="true">◷</span><h2 id="validacao-history-title">Últimas consultas</h2></span><button type="button" aria-label="Atualizar histórico">↻</button></div>
            <div className={styles.historyList}>
              <button type="button"><span className={styles.historyImage}>▥</span><span className={styles.historyText}><strong>Produto consultado recentemente</strong><small>EAN 7898996110321 · Pesquisa: hoje</small></span><span className={styles.historyPrice}>R$ 100,00</span></button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const carregando = estado === 'carregando';
  return (
    <main className={styles.loginWrap} data-avantaprecos-viewport="access" style={accessSafeStyle}>
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
