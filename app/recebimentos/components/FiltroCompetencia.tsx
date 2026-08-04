'use client';

import styles from '../recebimentos.module.css';

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

type Referencia = { ano: number; mes: number };

type Props = {
  referencia: Referencia;
  todos: boolean;
  onMudarMes: (delta: number) => void;
  onMostrarTodos: () => void;
};

/** Controle único de competência para as filas de Recebimentos. */
export default function FiltroCompetencia({ referencia, todos, onMudarMes, onMostrarTodos }: Props) {
  return (
    <div className={styles.filtroCompetencia} aria-label="Filtro por competência">
      <div className={styles.mesSeletor}>
        <button type="button" className={styles.mesSeletorBtn} onClick={() => onMudarMes(-1)} aria-label="Mês anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} width="14" height="14" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className={styles.mesSeletorDiv} aria-hidden="true" />
        <span className={styles.mesSeletorLabel}>{MESES_CURTOS[referencia.mes]} <b>{referencia.ano}</b></span>
        <span className={styles.mesSeletorDiv} aria-hidden="true" />
        <button type="button" className={styles.mesSeletorBtn} onClick={() => onMudarMes(1)} aria-label="Próximo mês">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} width="14" height="14" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnSm} ${styles.conferenciaTodos} ${todos ? styles.conferenciaTodosAtivo : ''}`}
        aria-pressed={todos}
        onClick={onMostrarTodos}
      >
        Todos
      </button>
    </div>
  );
}
