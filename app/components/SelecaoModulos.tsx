'use client';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { FundoAcessoResponsivo } from '@/app/components/TelaCarregandoAcesso';
import { AdaptiveModuleLogo } from '@/app/components/ModuloHeader';
import { Icon } from '@/app/projetos/components/Icon';
import { corEhClara } from '@/app/lib/formatters';
import type { PerfilModulos } from '@/app/modulos/MeusModulos';
import styles from '@/app/modulos/modulos.module.css';
const icons: Record<string, string> = { ponto: 'calendar', vendas_mobile: 'people', recebimentos_presencial: 'map', projetos: 'layout', custos: 'barcode', vendas: 'shoppingBag', marketplaces: 'storefront' };
const labels: Record<string, string> = { gestor_master: 'Gestor Master', administrador: 'Administrador', operador_completo: 'Operador completo', operador_simples: 'Operador simples' };
type Props = { perfis: PerfilModulos[]; perfil: PerfilModulos | null; error: string; opening: string; onAbrir: (id: string) => void; onSelecionarPerfil: (p: PerfilModulos) => void; onTrocarPerfil: () => void; onTentarNovamente: () => void; onSair: () => void };
export default function SelecaoModulos({ perfis, perfil, error, opening, onAbrir, onSelecionarPerfil, onTrocarPerfil, onTentarNovamente, onSair }: Props) {
  const escuro = perfil?.empresa.temaEscuro;
  const temLogo = Boolean(perfil?.empresa.logoUrl && perfil.empresa.logoUrl !== '__blank__');
  return <main className={`${styles.scene} ${escuro ? styles.dark : ''} typography-system`} style={{ '--modulos-brand': perfil?.empresa.corPrimaria || '#003E73', '--modulos-on-brand': corEhClara(perfil?.empresa.corPrimaria || '#003E73') ? '#17222d' : '#ffffff' } as CSSProperties}>
    <FundoAcessoResponsivo />
    <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={1200} height={298} className={styles.avantaBrand} priority />
    <section className={styles.panel} aria-labelledby="meus-modulos-title">
      <header className={styles.header}><h1 id="meus-modulos-title">{perfil ? 'Meus módulos' : 'Selecionar perfil'}</h1><p>{perfil ? 'Escolha o módulo que deseja acessar.' : 'Escolha o perfil para ver seus acessos.'}</p></header>
      <div className={styles.content}>
        {perfil && <div className={styles.identity}><div className={styles.company}>{temLogo ? <AdaptiveModuleLogo src={perfil.empresa.logoUrl!} alt={perfil.empresa.nome} className={styles.logo} /> : <Icon name="building" size={32} />}<div>{!temLogo && <strong>{perfil.empresa.nome}</strong>}<p>Olá, {perfil.nomeUsuario.split(' ')[0]} · {labels[perfil.perfil] || perfil.perfil}</p></div></div>{perfis.length > 1 && <button onClick={onTrocarPerfil} className={styles.quiet}><Icon name="people" /> Trocar perfil</button>}</div>}
        {error && <div role="alert" className={styles.error}>{error} <button onClick={onTentarNovamente}>Tentar novamente</button></div>}
        {!perfil ? <div className={styles.grid}>{perfis.map(p => <button key={p.empresa.id} className={styles.profile} onClick={() => onSelecionarPerfil(p)}><strong>{p.empresa.nome}</strong><span>{labels[p.perfil]}</span><Icon name="chevron" /></button>)}</div> : <div className={styles.grid}>
          {perfil.dashboard && <article className={styles.module}><span className={styles.icon}><Icon name="grid" size={32} /></span><h2>Financeiro</h2><p>Dados e operações financeiras do perfil.</p><button disabled={Boolean(opening)} onClick={() => onAbrir('dashboard')}><span className={styles.actionFace}>{opening === 'dashboard' ? 'Abrindo…' : 'Acessar'}<Icon name="chevron" /></span></button></article>}
          {perfil.modulos.map(m => <article key={m.id} className={styles.module}><span className={styles.icon}><Icon name={icons[m.id]} size={32} /></span><h2>{m.nome}</h2><p>{m.descricao}</p><button disabled={Boolean(opening)} onClick={() => onAbrir(m.id)}><span className={styles.actionFace}>{opening === m.id ? 'Abrindo…' : 'Acessar'}<Icon name="chevron" /></span></button></article>)}
        </div>}
        {((perfil && !perfil.dashboard && !perfil.modulos.length) || !perfis.length) && <p role="status">{perfil && !perfil.planoAtivo ? 'O plano deste perfil não está ativo.' : 'Nenhum módulo está disponível. Peça ao gestor para conferir suas liberações e os módulos instalados.'}</p>}
        <footer className={styles.footer}><small>Seus acessos são definidos pela empresa.</small><button className={styles.quiet} onClick={onSair}>Sair</button></footer>
      </div>
    </section>
  </main>;
}

