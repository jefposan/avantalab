'use client';
import React from 'react';
import styles from './AvantaCard.module.css';

// ─────────────────────────────────────────────────────────────
// AvantaCard — card padrão do sistema AvantaLab.
//
// Conceito: header em duas camadas sobrepostas.
// • O título fica na camada de TRÁS, mais larga (~75%), recuada.
// • A camada da FRENTE, no canto superior direito (~25%), contém
//   apenas os 6 pontinhos de arrastar e o menu "...".
// • O corpo cobre a base do header traseiro, criando profundidade.
// ─────────────────────────────────────────────────────────────

type AvantaCardProps = {
  title: string;
  children: React.ReactNode;
  onSettingsClick?: () => void;
  // Props do sistema de drag and drop (ex.: listeners/attributes do dnd-kit).
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  // Cor de acento da barrinha do título (padrão: azul AvantaLab).
  accentColor?: string;
  className?: string;
  // Oculta controles individualmente quando o card não é arrastável/configurável.
  hideDragHandle?: boolean;
  hideMenu?: boolean;
};

export function AvantaCard({
  title,
  children,
  onSettingsClick,
  dragHandleProps,
  accentColor,
  className,
  hideDragHandle = false,
  hideMenu = false,
}: AvantaCardProps) {
  return (
    <section
      className={`${styles.card}${className ? ` ${className}` : ''}`}
      style={accentColor ? ({ ['--avanta-acento' as string]: accentColor } as React.CSSProperties) : undefined}
    >
      {/* Camada de trás: header principal com o título */}
      <div className={styles.headerBack}>
        <h3 className={styles.titulo}>
          <span className={styles.acento} aria-hidden="true" />
          <span>{title}</span>
        </h3>
      </div>

      {/* Camada da frente: só os controles, por cima */}
      <div className={styles.headerFront}>
        {!hideDragHandle && (
          <div className={styles.dragHandle} title="Arrastar card" aria-label="Arrastar card" {...dragHandleProps}>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        {!hideMenu && (
          <button
            type="button"
            className={styles.menu}
            onClick={onSettingsClick}
            aria-label="Ajustes do card"
          >
            ...
          </button>
        )}
      </div>

      {/* Corpo do card */}
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default AvantaCard;
