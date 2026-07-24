'use client';

import { useState, type ChangeEventHandler } from 'react';
import styles from '../recebimentos.module.css';

type Props = {
  id: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
  centralizado?: boolean;
};

export default function CampoSenha({
  id,
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  centralizado = false,
}: Props) {
  const [visivel, setVisivel] = useState(false);
  const rotuloAcao = visivel ? 'Ocultar senha' : 'Exibir senha';

  return (
    <div className={styles.passwordField}>
      <input
        id={id}
        className={`${styles.input} ${styles.passwordInput} ${centralizado ? styles.inputCentro : ''}`}
        type={visivel ? 'text' : 'password'}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        onClick={() => setVisivel((valor) => !valor)}
        aria-label={rotuloAcao}
        aria-pressed={visivel}
        title={rotuloAcao}
      >
        {visivel ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5.5 9 5.5a15 15 0 0 1-2.2 2.8M6.6 6.6A15.8 15.8 0 0 0 3 9.5S6.5 15 12 15a10.3 10.3 0 0 0 3.4-.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9.5S6.5 4 12 4s9 5.5 9 5.5S17.5 15 12 15 3 9.5 3 9.5Z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
