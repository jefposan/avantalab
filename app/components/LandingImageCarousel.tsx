'use client';

import Image from 'next/image';
import { type CSSProperties, useRef, useState } from 'react';
import styles from './LandingImageCarousel.module.css';

export type LandingCarouselItem = {
  src: string;
  alt: string;
  label: string;
  variant?: 'portrait' | 'banner';
};

type LandingImageCarouselProps = {
  items: readonly LandingCarouselItem[];
  eyebrow?: string;
  title: string;
  description: string;
};

function circularIndex(index: number, length: number) {
  return (index + length) % length;
}

function relativePosition(index: number, activeIndex: number, length: number) {
  let distance = index - activeIndex;
  if (distance > length / 2) distance -= length;
  if (distance < -length / 2) distance += length;
  return distance;
}

export default function LandingImageCarousel({ items, eyebrow = 'Conheça o app', title, description }: LandingImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const dragged = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!items.length) return null;

  const showPrevious = () => setActiveIndex((index) => circularIndex(index - 1, items.length));
  const showNext = () => setActiveIndex((index) => circularIndex(index + 1, items.length));

  const finishSwipe = (clientX: number) => {
    if (pointerStartX.current === null) return;
    const distance = clientX - pointerStartX.current;
    pointerStartX.current = null;
    setDragOffset(0);
    setIsDragging(false);
    if (Math.abs(distance) >= 42) {
      dragged.current = true;
      if (distance < 0) showNext();
      else showPrevious();
      window.setTimeout(() => { dragged.current = false; }, 0);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="titulo-galeria-app">
      <div className={styles.wrap}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id="titulo-galeria-app">{title}</h2>
          <p>{description}</p>
        </div>

        <div
          className={styles.carousel}
          aria-roledescription="carrossel"
          aria-label="Telas do aplicativo AvantaLab"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              showPrevious();
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              showNext();
            }
          }}
          onPointerDown={(event) => {
            pointerStartX.current = event.clientX;
            dragged.current = false;
            setIsDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (pointerStartX.current === null) return;
            const distance = event.clientX - pointerStartX.current;
            if (Math.abs(distance) > 6) dragged.current = true;
            setDragOffset(Math.max(-96, Math.min(96, distance)));
          }}
          onPointerUp={(event) => finishSwipe(event.clientX)}
          onPointerCancel={() => {
            pointerStartX.current = null;
            setDragOffset(0);
            setIsDragging(false);
          }}
        >
          <div className={styles.cards} data-dragging={isDragging || undefined} style={{ '--drag-offset': `${dragOffset}px` } as CSSProperties}>
            {items.map((item, index) => {
              const position = relativePosition(index, activeIndex, items.length);
              const positionName = position === 0 ? 'current' : position === -1 ? 'before' : position === 1 ? 'after' : 'far';
              return (
                <button
                  className={styles.card}
                  data-position={positionName}
                  data-variant={item.variant ?? 'portrait'}
                  key={item.src}
                  type="button"
                  tabIndex={positionName === 'far' ? -1 : 0}
                  aria-current={position === 0 ? 'true' : undefined}
                  aria-label={position === 0 ? `${item.label}, imagem atual` : `Mostrar ${item.label}`}
                  onClick={(event) => {
                    if (dragged.current) {
                      event.preventDefault();
                      return;
                    }
                    setActiveIndex(index);
                  }}
                >
                  <Image src={item.src} alt={item.alt} fill sizes="(max-width: 640px) 68vw, 330px" draggable={false} />
                </button>
              );
            })}
          </div>

          <button className={`${styles.control} ${styles.previous}`} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={showPrevious} aria-label="Mostrar tela anterior">
            <span aria-hidden="true">←</span>
          </button>
          <button className={`${styles.control} ${styles.next}`} type="button" onPointerDown={(event) => event.stopPropagation()} onClick={showNext} aria-label="Mostrar próxima tela">
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className={styles.footer} aria-live="polite">
          <p><strong>{items[activeIndex].label}</strong><span aria-hidden="true"> · </span>{activeIndex + 1} de {items.length}</p>
          <p className={styles.hint}>Arraste para os lados ou use as setas.</p>
        </div>
      </div>
    </section>
  );
}
