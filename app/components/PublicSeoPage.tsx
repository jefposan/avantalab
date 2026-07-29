import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './PublicSeoPage.module.css';

const siteUrl = 'https://avantalab.com.br';

export type PublicSeoPageData = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  benefits: Array<[string, string]>;
  steps: Array<[string, string]>;
  faq: Array<[string, string]>;
  cta: string;
};

export function metadataPublicSeoPage(data: PublicSeoPageData): Metadata {
  const url = `${siteUrl}/${data.slug}`;
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: url },
    openGraph: { title: `${data.title} | AvantaLab`, description: data.description, url, siteName: 'AvantaLab', locale: 'pt_BR', type: 'website', images: [{ url: '/images/avantalab-share-meta-safe-center-v2.jpg', width: 1200, height: 628, alt: 'AvantaLab Gestão' }] },
    twitter: { card: 'summary_large_image', title: `${data.title} | AvantaLab`, description: data.description, images: ['/images/avantalab-share-meta-safe-center-v2.jpg'] },
  };
}

export default function PublicSeoPage({ data }: { data: PublicSeoPageData }) {
  const url = `${siteUrl}/${data.slug}`;
  const structuredData = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: data.title, description: data.description, url, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'AvantaLab', url: siteUrl } },
      { '@type': 'FAQPage', mainEntity: data.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
    ],
  };
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <header className={styles.header}><nav className={styles.nav} aria-label="Navegação principal"><Link className={styles.brand} href="/" aria-label="AvantaLab — página inicial"><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority /></Link><div className={styles.navActions}><Link className={styles.login} href="/gestao?entrar=1">Entrar</Link><Link className={styles.button} href="/gestao?cadastro=1">Começar grátis</Link></div></nav></header>
    <section className={styles.hero}><div className={styles.wrap}><p className={styles.eyebrow}>{data.eyebrow}</p><h1>{data.title}</h1><p className={styles.lead}>{data.intro}</p><div className={styles.heroActions}><Link className={styles.button} href="/gestao?cadastro=1">Começar grátis</Link><Link className={styles.secondary} href="/">Conhecer o AvantaLab</Link></div></div></section>
    <section className={styles.section}><div className={styles.wrap}><h2>Informações organizadas para a rotina real.</h2><p className={styles.sectionIntro}>{data.description}</p><div className={styles.grid}>{data.benefits.map(([title, text], index) => <article className={styles.card} key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className={`${styles.section} ${styles.sectionAlt}`}><div className={styles.wrap}><h2>Um caminho simples para começar.</h2><div className={styles.steps}>{data.steps.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className={styles.section}><div className={styles.wrap}><h2>Perguntas frequentes</h2><div className={styles.faq}>{data.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>
    <section className={styles.cta}><div className={styles.wrap}><h2>{data.cta}</h2><p>Comece pelo Free para uso pessoal ou conheça os planos empresariais para acompanhar uma operação em crescimento.</p><Link className={styles.button} href="/gestao?cadastro=1">Criar conta grátis</Link></div></section>
    <footer className={styles.footer}><div className={`${styles.wrap} ${styles.footerContent}`}><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} /><div className={styles.footerLinks}><Link href="/suporte">Suporte</Link><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/cookies">Cookies</Link></div><small>© 2026 AvantaLab. Todos os direitos reservados.</small></div></footer>
  </main>;
}
