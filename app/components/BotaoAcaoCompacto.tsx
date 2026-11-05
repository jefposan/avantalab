import type { ComponentProps } from 'react';
import styles from './BotaoAcaoCompacto.module.css';

type Props = ComponentProps<'button'> & {
  variante?: 'primario' | 'secundario' | 'discreto' | 'destrutivo';
  somenteIcone?: boolean;
};
export default function BotaoAcaoCompacto({ variante = 'secundario', somenteIcone = false, type = 'button', className = '', children, ...props }: Props) {
  return <button {...props} type={type} data-av-action="compact" className={`${styles.button} ${styles[variante]} ${somenteIcone ? styles.icon : ''} ${className}`}><span className={styles.face}>{children}</span></button>;
}
