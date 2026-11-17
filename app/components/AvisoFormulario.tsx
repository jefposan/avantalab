import type { HTMLAttributes, ReactNode } from 'react';
import styles from './AvisoFormulario.module.css';

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
  titulo: string;
  mensagem: string;
  idMensagem: string;
  children?: ReactNode;
};

/** Aviso único junto às ações; o campo pode referenciá-lo via aria-describedby. */
export default function AvisoFormulario({ titulo, mensagem, idMensagem, children, className = '', ...rest }: Props) {
  return <div {...rest} className={`${styles.aviso} ${className}`} role="alert" tabIndex={-1} aria-labelledby={`${idMensagem}-titulo`}>
    <svg className={styles.icone} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.2 12.5a2 2 0 0 1-1.7 3H4.8a2 2 0 0 1-1.7-3Z"/><path d="M12 9v4m0 3h.01"/></svg>
    <div className={styles.conteudo}>
      <strong id={`${idMensagem}-titulo`} className={styles.titulo}>{titulo}</strong>
      <p id={idMensagem} className={styles.mensagem}>{mensagem}</p>
      {children && <div className={styles.acoes}>{children}</div>}
    </div>
  </div>;
}
