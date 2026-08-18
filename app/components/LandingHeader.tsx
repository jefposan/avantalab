'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AcessoPublicoLink from './AcessoPublicoLink';
import { rolarParaSecaoPublica } from '../lib/rolagem-publica';
import landingStyles from '../styles/landing/landing.module.css';
import styles from './LandingHeader.module.css';

export default function LandingHeader() {
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const itensGestao = [
    ['#recursos', 'Visão geral'],
    ['#nossos-apps', 'Aplicativos AvantaLab'],
    ['#como-funciona', 'Como funciona'],
    ['#ia-ava', 'IA Ava'],
    ['#planos', 'Planos'],
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
    event.currentTarget.closest('details')?.removeAttribute('open');
    setMenuAberto(false);
  };

  return (
    <header data-public-header className={`${landingStyles.header} ${styles.header} ${rolado ? styles.rolado : ''}`}>
      <nav className={landingStyles.nav} aria-label="Navegação principal">
        <Link className={landingStyles.brand} href="/" aria-label="AvantaLab — voltar ao início" onClick={voltarAoInicio}>
          <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
        </Link>
        <div className={landingStyles.navLinks}>
          <a href="#laboratorio-de-marcas" onClick={(event) => rolarParaSecao(event, '#laboratorio-de-marcas')}>Laboratório de marcas</a>
          <details className={styles.gestaoMenu}>
            <summary>Gestão financeira <span aria-hidden="true">⌄</span></summary>
            <div className={styles.gestaoLista}>
              {itensGestao.map(([href, texto]) => <a key={href} href={href} onClick={(event) => rolarParaSecao(event, href)}>{texto}</a>)}
            </div>
          </details>
        </div>
        <button type="button" className={styles.menuButton} aria-expanded={menuAberto} aria-controls="menu-publico-mobile" aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuAberto((aberto) => !aberto)}><span /><span /><span /></button>
        <div className={landingStyles.navActions}>
          <AcessoPublicoLink className={`${landingStyles.entrar} ${styles.mobileEntrar}`} modo="entrar">Entrar</AcessoPublicoLink>
          <AcessoPublicoLink className={landingStyles.primaryButton} modo="cadastro">Começar grátis <span aria-hidden="true">→</span></AcessoPublicoLink>
        </div>
      </nav>
      <div id="menu-publico-mobile" className={`${styles.mobileMenu} ${menuAberto ? styles.mobileMenuAberto : ''}`} aria-hidden={!menuAberto}>
        <a href="#laboratorio-de-marcas" tabIndex={menuAberto ? 0 : -1} onClick={(event) => rolarParaSecao(event, '#laboratorio-de-marcas')}>Laboratório de marcas</a>
        <details className={styles.mobileGestaoMenu}>
          <summary tabIndex={menuAberto ? 0 : -1}>Gestão financeira <span aria-hidden="true">⌄</span></summary>
          <div>
            {itensGestao.map(([href, texto]) => <a key={href} href={href} tabIndex={menuAberto ? 0 : -1} onClick={(event) => rolarParaSecao(event, href)}>{texto}</a>)}
          </div>
        </details>
        <AcessoPublicoLink modo="entrar" tabIndex={menuAberto ? 0 : -1} onClick={() => setMenuAberto(false)}>Entrar no sistema</AcessoPublicoLink>
      </div>
    </header>
  );
}
