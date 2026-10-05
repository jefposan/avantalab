'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '@/app/projetos/components/Icon';
import styles from '@/app/custos/custos.module.css';

type Props = {
  empresa: { nome: string; logoUrl?: string; corPrimaria: string; temaEscuro: boolean };
  onBack: () => void;
  returnLabel?: string;
  returnAriaLabel?: string;
  children?: ReactNode;
};

/** Reuses the consolidated module header, including its responsive/dark styles. */
export default function ModuloHeader({ empresa, onBack, returnLabel = 'Início', returnAriaLabel = 'Voltar ao Dashboard do AvantaLab', children }: Props) {
  return <header className={`${styles.root} ${styles.moduleHeader} ${empresa.temaEscuro ? styles.dark : ''}`} style={{ '--custos-brand': empresa.corPrimaria, minHeight: 'var(--module-header-height)' } as CSSProperties}>
    <button type="button" onClick={onBack} className={styles.moduleExit} aria-label={returnAriaLabel}><Icon name="back" size={16} /> {returnLabel}</button>
    <div className={styles.moduleIdentity}>
      {empresa.logoUrl ? <img src={empresa.logoUrl} alt={empresa.nome} className={styles.moduleLogo} /> : <span>{empresa.nome}</span>}
    </div>
    <div className={styles.moduleHeaderActions}>{children}</div>
  </header>;
}
