'use client';

import type { FormEvent } from 'react';
import styles from './consultas.module.css';

type ConsultaCnpjFormProps = {
  cnpj: string;
  carregando: boolean;
  erro: string;
  onChange: (valor: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVoltar: () => void;
};

export default function ConsultaCnpjForm({
  cnpj,
  carregando,
  erro,
  onChange,
  onSubmit,
  onVoltar,
}: ConsultaCnpjFormProps) {
  const descricaoId = erro ? 'consulta-cnpj-ajuda consulta-cnpj-erro' : 'consulta-cnpj-ajuda';

  return (
    <div className={styles.etapa}>
      <button
        type="button"
        className={styles.voltar}
        onClick={onVoltar}
        disabled={carregando}
      >
        <span aria-hidden="true">←</span>
        Voltar às opções
      </button>

      <div className={styles.etapaCabecalho}>
        <span className={styles.etapaKicker}>Consulta disponível</span>
        <h2>Consulta cadastral de empresa</h2>
        <p>
          Informe o CNPJ para consultar os dados cadastrais disponíveis em uma
          base pública.
        </p>
      </div>

      <form className={styles.formulario} onSubmit={onSubmit} noValidate>
        <div className={styles.campo}>
          <label htmlFor="consulta-cnpj">CNPJ</label>
          <input
            id="consulta-cnpj"
            name="cnpj"
            type="text"
            value={cnpj}
            onChange={(event) => onChange(event.target.value)}
            maxLength={32}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="00.000.000/0000-00"
            aria-describedby={descricaoId}
            aria-invalid={Boolean(erro)}
            disabled={carregando}
            autoFocus
          />
          <span id="consulta-cnpj-ajuda" className={styles.ajuda}>
            Aceita CNPJ com ou sem máscara. Letras são preservadas para o
            formato alfanumérico.
          </span>
          {erro && (
            <span id="consulta-cnpj-erro" className={styles.erroCampo} role="alert">
              {erro}
            </span>
          )}
        </div>

        <button
          type="submit"
          className={`${styles.botao} ${styles.botaoPrimario}`}
          disabled={carregando}
        >
          {carregando ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Consultando…
            </>
          ) : (
            'Consultar'
          )}
        </button>
      </form>

      <p className={styles.notaPrivacidade}>
        A consulta usa somente o CNPJ informado e não cadastra a empresa no
        AvantaLab.
      </p>
    </div>
  );
}
