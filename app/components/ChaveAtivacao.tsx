'use client';

import type { ComponentProps } from 'react';
import styles from './ChaveAtivacao.module.css';

type Props = Omit<ComponentProps<'input'>, 'type' | 'role' | 'checked' | 'onChange'> & {
  checked: boolean;
  onChange: (ativo: boolean) => void;
};

export default function ChaveAtivacao({ checked, onChange, className = '', ...props }: Props) {
  return <label className={`${styles.control} ${className}`}>
    <input {...props} type="checkbox" role="switch" checked={checked} onChange={(evento) => onChange(evento.target.checked)} className={styles.input} />
    <span aria-hidden="true" className={styles.track}><span className={styles.thumb} /></span>
    <span className={styles.text}>{checked ? 'Ativo' : 'Inativo'}</span>
  </label>;
}
