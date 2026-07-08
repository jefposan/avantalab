'use client';
import React from 'react';
import styles from './AvantaCard.module.css';

// ─────────────────────────────────────────────────────────────
// AvantaCard — estrutura AvantaShell para cards do sistema.
//
// Conceito (duas camadas reais):
// • CARD DE TRÁS: superfície mais clara com o título — aparece pelo
//   recorte do card da frente, como uma aba recuada.
// • CARD DA FRENTE: corpo + silhueta SVG contínua no topo. O SVG desenha
//   vale, subida e platô em uma peça única, sem soldas CSS. O platô em HTML
//   contém apenas os controles.
// • Cores, fundos, bordas, texto e sombras são fornecidos pela tela que usa
//   o componente por classes/variáveis CSS. O shell não possui paleta própria.
// ─────────────────────────────────────────────────────────────

type AvantaCardProps = {
  title?: string;
  children: React.ReactNode;
  onSettingsClick?: () => void;
  // Props do sistema de drag and drop (ex.: listeners/attributes do dnd-kit).
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  headerRight?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  // Oculta controles individualmente quando o card não é arrastável/configurável.
  hideDragHandle?: boolean;
  hideMenu?: boolean;
};

type AvantaShellPresetOptions = {
  corPrimaria: string;
  darkMode: boolean;
};

export type AvantaShellPreset = {
  cardStyle: React.CSSProperties;
  bodyStyle: React.CSSProperties;
};

export function criarAvantaShellPreset({ corPrimaria, darkMode }: AvantaShellPresetOptions): AvantaShellPreset {
  const base = darkMode ? '#1e293b' : '#ffffff';
  const chapaBase = darkMode ? '#334155' : '#f8fafc';
  const superficie = `color-mix(in srgb, ${corPrimaria} ${darkMode ? '4%' : '2%'}, ${base})`;
  const chapa = `linear-gradient(180deg, color-mix(in srgb, ${corPrimaria} ${darkMode ? '54%' : '36%'}, transparent) 0%, color-mix(in srgb, ${corPrimaria} ${darkMode ? '22%' : '14%'}, transparent) 46%, transparent 100%), ${chapaBase}`;
  const borda = `color-mix(in srgb, ${corPrimaria} ${darkMode ? '18%' : '12%'}, ${darkMode ? '#334155' : '#e2e8f0'})`;
  const sombraEntreCamadas = [
    `linear-gradient(180deg, transparent 34%, rgba(15, 23, 42, ${darkMode ? '0.30' : '0.14'}) 100%)`,
    `radial-gradient(ellipse at 67% 100%, rgba(15, 23, 42, ${darkMode ? '0.34' : '0.18'}) 0%, rgba(15, 23, 42, ${darkMode ? '0.16' : '0.08'}) 42%, transparent 70%)`,
  ].join(', ');
  const textoSecundario = darkMode ? '#94a3b8' : '#64748b';

  return {
    bodyStyle: { background: superficie },
    cardStyle: {
      ['--topo' as string]: '58px',
      ['--raio' as string]: '22px',
      ['--avanta-title-left' as string]: '18px',
      ['--avanta-tras-bg' as string]: chapa,
      ['--avanta-tras-bg-size' as string]: '100% var(--topo), 100% 100%',
      ['--avanta-tras-overlay' as string]: sombraEntreCamadas,
      ['--avanta-front-bg' as string]: superficie,
      ['--avanta-body-bg' as string]: superficie,
      ['--avanta-body-shadow' as string]: `inset 1px 0 0 ${borda}`,
      ['--avanta-body-top-left-radius' as string]: '0px',
      ['--avanta-title-color' as string]: 'currentColor',
      ['--avanta-accent-bg' as string]: corPrimaria,
      ['--avanta-control-color' as string]: textoSecundario,
      ['--avanta-control-hover-bg' as string]: darkMode ? 'rgba(51, 65, 85, 0.75)' : 'rgba(241, 245, 249, 0.9)',
      ['--avanta-front-filter' as string]: `drop-shadow(0 -0.5px 0 ${borda}) drop-shadow(0 0.5px 0 ${borda}) drop-shadow(-0.5px 0 0 ${borda}) drop-shadow(0.5px 0 0 ${borda})`,
    } as React.CSSProperties,
  };
}

export function AvantaCard({
  title,
  children,
  onSettingsClick,
  dragHandleProps,
  headerRight,
  className,
  style,
  bodyClassName,
  bodyStyle,
  hideDragHandle = false,
  hideMenu = false,
}: AvantaCardProps) {
  return (
    <section
      className={`${styles.card}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {/* CARD DE TRÁS: título (aparece pelo recorte do card da frente) */}
      <div className={styles.cardTras}>
        {title ? (
          <h3 className={styles.titulo}>
            <span className={styles.acento} aria-hidden="true" />
            <span>{title}</span>
          </h3>
        ) : null}
      </div>

      {/* CARD DA FRENTE: a silhueta SVG desenha vale + subida + platô em
          uma peça única. O HTML do platô só posiciona os controles. */}
      <div className={styles.frente}>
        <svg
          className={styles.frontShape}
          viewBox="0 0 1000 108"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={styles.frontShapePath}
            d="M 0 78 H 610 C 680 78 672 0 760 0 H 1000 V 108 H 0 Z"
          />
        </svg>

        <div className={styles.plato}>
          {headerRight ? <div className={styles.headerRight}>{headerRight}</div> : null}
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

        <div className={`${styles.body}${bodyClassName ? ` ${bodyClassName}` : ''}`} style={bodyStyle}>{children}</div>
      </div>
    </section>
  );
}

export default AvantaCard;
