'use client';

import { useRef, type InputHTMLAttributes } from 'react';
import { formatarDataISO } from '@/app/lib/formatters';
import { Icon } from '@/app/projetos/components/Icon';
import styles from './CampoData.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'onInput'> & {
  value: string;
  onChange: (iso: string) => void;
  anoCurto?: boolean;
};

/** Mantém o calendário/validação nativos sem deixar a largura/formato do Safari definir o layout. */
export default function CampoData({ value, onChange, anoCurto = false, className, placeholder, onClick, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <span className={styles.field} data-disabled={props.disabled || undefined} data-invalid={props['aria-invalid'] || undefined}>
    <span aria-hidden="true" className={styles.display}>{formatarDataISO(value, anoCurto) || placeholder || (anoCurto ? 'dd/mm/aa' : 'dd/mm/aaaa')}</span>
    <span aria-hidden="true" className={styles.calendar}><Icon name="calendar" size={16} /></span>
    <input {...props} ref={input} className={`${styles.native} ${className || ''}`} type="date" value={value}
      onInput={event => onChange(event.currentTarget.value)} onChange={event => onChange(event.currentTarget.value)}
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented || typeof input.current?.showPicker !== 'function') return;
        try { input.current.showPicker(); event.preventDefault(); } catch { /* O gesto nativo continua disponível se showPicker não for suportado. */ }
      }} />
  </span>;
}
