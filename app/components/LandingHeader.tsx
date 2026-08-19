'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AcessoPublicoLink from './AcessoPublicoLink';
import { rolarParaSecaoPublica } from '../lib/rolagem-publica';
import landingStyles from '../styles/landing/landing.module.css';
import styles from './LandingHeader.module.css';

type ContextoLanding = 'laboratorio' | 'gestao';

export default function LandingHeader({ contexto }: { contexto: ContextoLanding }) {
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
    <header data-public-header data-contexto={contexto} className={`${landingStyles.header} ${styles.header} ${rolado ? styles.rolado : ''}`}>
      <nav className={`${landingStyles.nav} ${styles.nav}`} aria-label="Navegação principal">
        <Link className={landingStyles.brand} href="/" aria-label="AvantaLab — voltar ao início" onClick={voltarAoInicio}>
          <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
        </Link>
        <div className={styles.contextSwitcher} aria-label="Área do site">
          <Link href="/" aria-current={contexto === 'laboratorio' ? 'page' : undefined}>Laboratório de marcas</Link>
          <Link href="/gestao-financeira" aria-current={contexto === 'gestao' ? 'page' : undefined}>Gestão financeira</Link>
        </div>
        {contexto === 'gestao' && <button type="button" className={styles.menuButton} aria-expanded={menuAberto} aria-controls="menu-publico-mobile" aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuAberto((aberto) => !aberto)}><span /><span /><span /></button>}
        {contexto === 'gestao' && <div className={`${landingStyles.navActions} ${styles.gestaoActions}`}>
          <AcessoPublicoLink className={`${landingStyles.entrar} ${styles.mobileEntrar}`} modo="entrar">Entrar</AcessoPublicoLink>
          <AcessoPublicoLink className={landingStyles.primaryButton} modo="cadastro">Começar grátis <span aria-hidden="true">→</span></AcessoPublicoLink>
        </div>}
      </nav>
      {contexto === 'gestao' && <nav className={styles.gestaoSubnav} aria-label="Navegação da Gestão Financeira">
        <div>
          {itensGestao.map(([href, texto]) => <a key={href} href={href} onClick={(event) => rolarParaSecao(event, href)}>{texto}</a>)}
        </div>
      </nav>}
      {contexto === 'gestao' && <div id="menu-publico-mobile" className={`${styles.mobileMenu} ${menuAberto ? styles.mobileMenuAberto : ''}`} aria-hidden={!menuAberto}>
        <AcessoPublicoLink modo="entrar" tabIndex={menuAberto ? 0 : -1} onClick={() => setMenuAberto(false)}>Entrar no sistema</AcessoPublicoLink>
        <AcessoPublicoLink modo="cadastro" tabIndex={menuAberto ? 0 : -1} onClick={() => setMenuAberto(false)}>Começar grátis</AcessoPublicoLink>
      </div>}
    </header>
  );
}
