'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';

type Props = {
  id: string;
  value: string;
  min: string;
  onChange: (data: string) => void;
  ariaLabel?: string;
  camada?: 'padrao' | 'acima-modal';
  temaEscuro?: boolean;
};

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function dataPorIso(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function dataFormatada(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dataPorIso(iso));
}

export default function SeletorDataAgendamento({ id, value, min, onChange, ariaLabel, camada = 'padrao', temaEscuro = false }: Props) {
  const [aberto, setAberto] = useState(false);
  const [mesVisivel, setMesVisivel] = useState(() => dataPorIso(value));
  const [dataSelecionada, setDataSelecionada] = useState(value);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const dialogoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const quadro = window.requestAnimationFrame(() => dialogoRef.current?.focus());
    function aoPressionar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      window.requestAnimationFrame(() => botaoRef.current?.focus());
    }
    window.addEventListener('keydown', aoPressionar);
    return () => {
      window.cancelAnimationFrame(quadro);
      window.removeEventListener('keydown', aoPressionar);
    };
  }, [aberto]);

  const dias = useMemo(() => {
    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, indice) => {
      const dia = indice - primeiroDia + 1;
      if (dia < 1 || dia > ultimoDia) return null;
      const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { dia, iso, indisponivel: iso < min };
    });
  }, [mesVisivel, min]);

  function abrir() {
    setMesVisivel(dataPorIso(value));
    setDataSelecionada(value);
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    window.requestAnimationFrame(() => botaoRef.current?.focus());
  }

  function selecionar(iso: string) {
    if (iso < min) return;
    setDataSelecionada(iso);
  }

  function confirmar() {
    if (dataSelecionada < min) return;
    onChange(dataSelecionada);
    setAberto(false);
    window.requestAnimationFrame(() => botaoRef.current?.focus());
  }

  return <>
    <button ref={botaoRef} id={id} type="button" className={`${styles.seletorDataBotao} ${temaEscuro ? styles.seletorDataBotaoEscuro : ''}`} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={aberto} onClick={abrir}>
      <span>{dataFormatada(value)}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></svg>
    </button>
    {aberto && typeof document !== 'undefined' && createPortal(<div className={`${styles.calendarioOverlay} ${camada === 'acima-modal' ? styles.calendarioOverlayElevado : ''}`} role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) fechar(); }}>
      <section ref={dialogoRef} className={`${styles.calendarioCard} ${temaEscuro ? styles.calendarioCardEscuro : ''}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-titulo`} tabIndex={-1}>
        <header>
          <button type="button" onClick={() => setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() - 1, 1))} aria-label="Mês anterior">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <strong id={`${id}-titulo`}>{MESES[mesVisivel.getMonth()]} de {mesVisivel.getFullYear()}</strong>
          <button type="button" onClick={() => setMesVisivel((atual) => new Date(atual.getFullYear(), atual.getMonth() + 1, 1))} aria-label="Próximo mês">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </header>
        <div className={styles.calendarioSemana}>{DIAS_SEMANA.map((dia) => <span key={dia}>{dia}</span>)}</div>
        <div className={styles.calendarioDias}>{dias.map((item, indice) => item ? <button key={item.iso} type="button" className={item.iso === dataSelecionada ? styles.calendarioDiaSelecionado : undefined} disabled={item.indisponivel} aria-label={item.indisponivel ? `${item.dia} indisponível` : undefined} onClick={() => selecionar(item.iso)}>{item.dia}</button> : <i key={`vazio-${indice}`} aria-hidden="true" />)}</div>
        <footer>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button type="button" disabled={dataSelecionada < min} onClick={confirmar}>Confirmar</button>
        </footer>
      </section>
    </div>, document.body)}
  </>;
}
