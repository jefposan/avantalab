'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { rolarParaSecaoPublica } from '../lib/rolagem-publica';
import landingStyles from '../styles/landing/landing.module.css';
import styles from './LandingHeader.module.css';

export default function LandingHeader() {
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const itensMenu = [
    ['#recursos', 'Recursos'],
    ['#como-funciona', 'Como funciona'],
    ['#ia-ava', 'IA Ava'],
    ['#planos', 'Planos'],
    ['#calculadoras', 'Calculadoras'],
    ['#perguntas', 'Dúvidas'],
  ] as const;

  useEffect(() => {
    const atualizar = () => setRolado(window.scrollY > 24);
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
    return () => window.removeEventListener('scroll', atualizar);
  }, []);

  useEffect(() => {
    const fecharNoDesktop = () => {
      if (window.innerWidth > 900) setMenuAberto(false);
    };
    window.addEventListener('resize', fecharNoDesktop);
    return () => window.removeEventListener('resize', fecharNoDesktop);
  }, []);

  const voltarAoInicio = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname !== '/') return;
    event.preventDefault();
    const movimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: movimentoReduzido ? 'auto' : 'smooth' });
  };

  const rolarParaSecao = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();

    rolarParaSecaoPublica(href);
    setMenuAberto(false);
  };

  return (
    <header data-public-header className={`${landingStyles.header} ${styles.header} ${rolado ? styles.rolado : ''}`}>
      <nav className={landingStyles.nav} aria-label="Navegação principal">
        <Link className={landingStyles.brand} href="/" aria-label="AvantaLab — voltar ao início" onClick={voltarAoInicio}>
          <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
        </Link>
        <div className={landingStyles.navLinks}>
          {itensMenu.map(([href, texto]) => <a key={href} href={href} onClick={(event) => rolarParaSecao(event, href)}>{texto}</a>)}
        </div>
        <button type="button" className={styles.menuButton} aria-expanded={menuAberto} aria-controls="menu-publico-mobile" aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuAberto((aberto) => !aberto)}><span /><span /><span /></button>
        <div className={landingStyles.navActions}>
          <Link className={landingStyles.entrar} href="/gestao?entrar=1">Entrar</Link>
          <Link className={landingStyles.primaryButton} href="/gestao?cadastro=1">Começar grátis <span aria-hidden="true">→</span></Link>
        </div>
      </nav>
      <div id="menu-publico-mobile" className={`${styles.mobileMenu} ${menuAberto ? styles.mobileMenuAberto : ''}`} aria-hidden={!menuAberto}>
        {itensMenu.map(([href, texto]) => <a key={href} href={href} tabIndex={menuAberto ? 0 : -1} onClick={(event) => rolarParaSecao(event, href)}>{texto}</a>)}
        <Link href="/gestao?entrar=1" tabIndex={menuAberto ? 0 : -1} onClick={() => setMenuAberto(false)}>Entrar no sistema</Link>
      </div>
    </header>
  );
}
