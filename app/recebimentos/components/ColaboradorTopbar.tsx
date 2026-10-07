import type { ReactNode } from 'react';
import styles from '../recebimentos.module.css';

type Props = {
  nomeDoPerfil: string;
  descricaoDaOperacao: string;
  children: ReactNode;
};

export default function ColaboradorTopbar({ nomeDoPerfil, descricaoDaOperacao, children }: Props) {
  return (
    <div className={`${styles.topbar} ${styles.topbarColaborador}`}>
      <div className={styles.topbarInner}>
        <div className={styles.brand}>
          <span className={styles.brandTitle}>{nomeDoPerfil}</span>
          <span className={styles.brandEmpresa}>{descricaoDaOperacao}</span>
        </div>
        <div className={styles.topbarAcoesColaborador}>{children}</div>
      </div>
    </div>
  );
}
