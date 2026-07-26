'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ComprovanteRecebimento } from '../data/repo';
import styles from '../recebimentos.module.css';

type Props = {
  lancamentoId: string;
  onObter: (lancamentoId: string) => Promise<ComprovanteRecebimento>;
  compacto?: boolean;
  darkMode?: boolean;
};

export default function BotaoComprovante({ lancamentoId, onObter, compacto = false, darkMode = false }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [comprovante, setComprovante] = useState<ComprovanteRecebimento | null>(null);
  const acionador = useRef<HTMLButtonElement | null>(null);
  const fechar = useRef<HTMLButtonElement | null>(null);

  const encerrar = useCallback(() => {
    setAberto(false);
    window.setTimeout(() => acionador.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') encerrar();
    }
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [aberto, encerrar]);

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    setErro('');
    setComprovante(null);
    try {
      setComprovante(await onObter(lancamentoId));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível abrir o comprovante.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        ref={acionador}
        type="button"
        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.btnAbrirComprovante} ${compacto ? styles.btnAbrirComprovanteCompacto : ''}`}
        onClick={() => void abrir()}
        aria-label="Visualizar comprovante"
      >
        <svg className={styles.iconeComprovante} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m5 17 4.5-4 3.5 3 2.5-2 3.5 3" />
        </svg>
        {!compacto && <span>Visualizar</span>}
      </button>

      {aberto && createPortal((
        <div
          className={`${styles.overlay} ${styles.comprovanteOverlayPortal} ${darkMode ? styles.darkScope : ''}`}
          role="presentation"
          onClick={encerrar}
        >
          <div
            className={`${styles.comprovante} ${styles.comprovanteImagemModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`comprovante-titulo-${lancamentoId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.comprovanteModalTopo}>
              <div>
                <h3 id={`comprovante-titulo-${lancamentoId}`}>Comprovante</h3>
                {comprovante?.nome && <p>{comprovante.nome}</p>}
              </div>
              <button ref={fechar} type="button" className={styles.comprovanteFechar} onClick={encerrar} aria-label="Fechar comprovante">×</button>
            </div>
            {carregando && <div className={styles.comprovanteEstado} role="status">Carregando imagem…</div>}
            {erro && <div className={styles.aviso} role="alert">{erro}</div>}
            {comprovante && (
              <>
                <div className={styles.comprovanteImagemWrap}>
                  {/* A URL é privada e assinada por apenas cinco minutos. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comprovante.url} alt="Imagem do comprovante do recebimento" />
                </div>
                <a className={`${styles.btn} ${styles.btnPrimary} ${styles.comprovanteAbrirOriginal}`} href={comprovante.url} target="_blank" rel="noreferrer">
                  Abrir imagem
                </a>
              </>
            )}
          </div>
        </div>
      ), document.body)}
    </>
  );
}
