import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import ConstelacaoAvanta from './ConstelacaoAvanta';
import styles from './constelacao-avanta.module.css';

export const metadata: Metadata = {
  title: 'Protótipo Constelação Avanta',
  description: 'A marca AvantaLab completa formada por partículas interativas, com o A oficial.',
  robots: { index: false, follow: false },
};

export default function PrototipoConstelacaoAvantaPage() {
  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#experimento">Pular para o experimento</a>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Voltar para a página inicial do AvantaLab">
          <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
        </Link>
        <span>Protótipo visual</span>
      </header>

      <section className={styles.intro} aria-labelledby="titulo-prototipo">
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Constelação Avanta</p>
          <h1 id="titulo-prototipo">Do disperso à <em>forma.</em></h1>
          <p>
            Role a página para reunir os pontos na marca AvantaLab, com seu “A” original.
            Passe o mouse para espalhar as estrelas e veja o nome se formar novamente.
          </p>
        </div>
        <a className={styles.scrollCue} href="#experimento">
          <span aria-hidden="true">↓</span>
          Iniciar experiência
        </a>
      </section>

      <ConstelacaoAvanta />

      <section className={styles.outro} aria-labelledby="titulo-final">
        <p className={styles.kicker}>Fim do ensaio</p>
        <h2 id="titulo-final">Uma marca ganha força quando cada ponto encontra seu lugar.</h2>
        <p>Este ambiente é isolado e ainda não faz parte da landing page oficial.</p>
        <Link href="/">Voltar ao AvantaLab</Link>
      </section>
    </main>
  );
}
