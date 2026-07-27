import type { ReactNode } from 'react';
import styles from './consultas.module.css';

type SecaoConsultaProps = {
  titulo: string;
  children?: ReactNode;
  vazia?: boolean;
};

export default function SecaoConsulta({
  titulo,
  children,
  vazia = false,
}: SecaoConsultaProps) {
  return (
    <section className={styles.secao}>
      <h3>{titulo}</h3>
      {vazia ? (
        <p className={styles.indisponivel}>
          Informação não disponível na fonte consultada.
        </p>
      ) : (
        children
      )}
    </section>
  );
}
