'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type CornerName = 'tl' | 'tr' | 'br' | 'bl';
type Tone = 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber';
type Point = { x: number; y: number };

type CardState = {
  id: string;
  tone: Tone;
  label: string;
  x: number;
  y: number;
  size: number;
};

type LinkState = {
  id: string;
  aId: string;
  aCorner: CornerName;
  bId: string;
  bCorner: CornerName;
  preview?: boolean;
};

type SnapCandidate = {
  fixedCard: CardState;
  fixedCorner: CornerName;
  movingCorner: CornerName;
  dist: number;
  x: number;
  y: number;
};

const ATTRACTION_RADIUS = 200;
const BREAK_DISTANCE = 116;
const SNAP_DISTANCE = ATTRACTION_RADIUS;
const CARD_RADIUS = 18;
const CONNECT_GAP = 12;
const MIN_HOURGLASS_GAP = 30;
const corners: CornerName[] = ['tl', 'tr', 'br', 'bl'];

const oppositeCorner: Record<CornerName, CornerName> = {
  tl: 'br',
  tr: 'bl',
  br: 'tl',
  bl: 'tr',
};

const initialCards: CardState[] = [
  { id: 'azul', tone: 'blue', label: '01', x: 240, y: 220, size: 132 },
  { id: 'ciano', tone: 'cyan', label: '02', x: 384, y: 364, size: 132 },
  { id: 'violeta', tone: 'violet', label: '03', x: 384, y: 76, size: 132 },
  { id: 'verde', tone: 'emerald', label: '04', x: 96, y: 76, size: 132 },
  { id: 'ambar', tone: 'amber', label: '05', x: 96, y: 364, size: 132 },
];

const toneMap: Record<Tone, { stroke: string; glow: string; fill: string }> = {
  blue: {
    stroke: '#2f8dff',
    glow: 'rgba(47,141,255,.75)',
    fill: 'rgba(47,141,255,.105)',
  },
  cyan: {
    stroke: '#2ff7ff',
    glow: 'rgba(47,247,255,.78)',
    fill: 'rgba(47,247,255,.12)',
  },
  violet: {
    stroke: '#8b5cf6',
    glow: 'rgba(139,92,246,.66)',
    fill: 'rgba(139,92,246,.11)',
  },
  emerald: {
    stroke: '#34d399',
    glow: 'rgba(52,211,153,.62)',
    fill: 'rgba(52,211,153,.105)',
  },
  amber: {
    stroke: '#f59e0b',
    glow: 'rgba(245,158,11,.62)',
    fill: 'rgba(245,158,11,.1)',
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cornerVector(name: CornerName) {
  return {
    x: name === 'tr' || name === 'br' ? 1 : -1,
    y: name === 'bl' || name === 'br' ? 1 : -1,
  };
}

function corner(card: CardState, name: CornerName): Point {
  if (name === 'tl') return { x: card.x, y: card.y };
  if (name === 'tr') return { x: card.x + card.size, y: card.y };
  if (name === 'bl') return { x: card.x, y: card.y + card.size };
  return { x: card.x + card.size, y: card.y + card.size };
}

function cardPositionForCorner(card: CardState, cornerName: CornerName, point: Point) {
  return {
    x: cornerName === 'tr' || cornerName === 'br' ? point.x - card.size : point.x,
    y: cornerName === 'bl' || cornerName === 'br' ? point.y - card.size : point.y,
  };
}

function normalCardPath(card: CardState) {
  const { x, y, size } = card;
  const r = CARD_RADIUS;

  return [
    `M ${x + r} ${y}`,
    `H ${x + size - r}`,
    `Q ${x + size} ${y} ${x + size} ${y + r}`,
    `V ${y + size - r}`,
    `Q ${x + size} ${y + size} ${x + size - r} ${y + size}`,
    `H ${x + r}`,
    `Q ${x} ${y + size} ${x} ${y + size - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function transformCard(card: CardState, scaleX: number, scaleY: number) {
  return {
    ...card,
    x: scaleX === 1 ? card.x : -card.x - card.size,
    y: scaleY === 1 ? card.y : -card.y - card.size,
  };
}

function mergedPathTransform(startCorner: CornerName) {
  const direction = cornerVector(startCorner);
  return {
    scaleX: direction.x === 1 ? 1 : -1,
    scaleY: direction.y === 1 ? 1 : -1,
  };
}

function clampMergedPairCanonical(startCard: CardState, endCard: CardState) {
  const minEndX = startCard.x + startCard.size + CONNECT_GAP;
  const minEndY = startCard.y + startCard.size + CONNECT_GAP;

  return {
    a: startCard,
    b: {
      ...endCard,
      x: Math.max(endCard.x, minEndX),
      y: Math.max(endCard.y, minEndY),
    },
  };
}

function mergedCardsPathCanonical(startCard: CardState, endCard: CardState, stretch: number) {
  const { a, b } = clampMergedPairCanonical(startCard, endCard);
  const r = CARD_RADIUS;
  const plugRadius = lerp(32, MIN_HOURGLASS_GAP, stretch);
  const aRight = a.x + a.size;
  const aBottom = a.y + a.size;
  const bLeft = b.x;
  const bTop = b.y;
  const neck = Math.max(MIN_HOURGLASS_GAP + 8, plugRadius * 1.04);
  const upperExit = { x: aRight, y: aBottom - neck };
  const upperEntry = { x: bLeft + neck, y: bTop };
  const lowerExit = { x: bLeft, y: bTop + neck };
  const lowerEntry = { x: aRight - neck, y: aBottom };
  const controlPull = Math.max(36, CONNECT_GAP * 1.2);

  return [
    `M ${a.x + r} ${a.y}`,
    `H ${a.x + a.size - r}`,
    `Q ${a.x + a.size} ${a.y} ${a.x + a.size} ${a.y + r}`,
    `V ${upperExit.y}`,
    `C ${upperExit.x} ${upperExit.y + controlPull}, ${upperEntry.x - controlPull} ${upperEntry.y}, ${upperEntry.x} ${upperEntry.y}`,
    `H ${b.x + b.size - r}`,
    `Q ${b.x + b.size} ${b.y} ${b.x + b.size} ${b.y + r}`,
    `V ${b.y + b.size - r}`,
    `Q ${b.x + b.size} ${b.y + b.size} ${b.x + b.size - r} ${b.y + b.size}`,
    `H ${b.x + r}`,
    `Q ${b.x} ${b.y + b.size} ${b.x} ${b.y + b.size - r}`,
    `V ${lowerExit.y}`,
    `C ${lowerExit.x} ${lowerExit.y - controlPull}, ${lowerEntry.x + controlPull} ${lowerEntry.y}, ${lowerEntry.x} ${lowerEntry.y}`,
    `H ${a.x + r}`,
    `Q ${a.x} ${a.y + a.size} ${a.x} ${a.y + a.size - r}`,
    `V ${a.y + r}`,
    `Q ${a.x} ${a.y} ${a.x + r} ${a.y}`,
    'Z',
  ].join(' ');
}

function mergedCardsPath(
  startCard: CardState,
  endCard: CardState,
  startCorner: CornerName,
  stretch: number,
) {
  const { scaleX, scaleY } = mergedPathTransform(startCorner);
  const transformedStart = transformCard(startCard, scaleX, scaleY);
  const transformedEnd = transformCard(endCard, scaleX, scaleY);

  return {
    d: mergedCardsPathCanonical(transformedStart, transformedEnd, stretch),
    transform: scaleX === 1 && scaleY === 1 ? undefined : `scale(${scaleX} ${scaleY})`,
  };
}

function linkDistance(link: LinkState, cards: CardState[]) {
  const a = cards.find((card) => card.id === link.aId);
  const b = cards.find((card) => card.id === link.bId);
  if (!a || !b) return Infinity;
  return distance(corner(a, link.aCorner), corner(b, link.bCorner));
}

function cornerIsOccupied(links: LinkState[], cardId: string, cornerName: CornerName) {
  return links.some((link) => (
    (link.aId === cardId && link.aCorner === cornerName) ||
    (link.bId === cardId && link.bCorner === cornerName)
  ));
}

function snapCandidatesForCard(
  card: CardState,
  fixedCard: CardState,
  links: LinkState[],
): SnapCandidate[] {
  return corners
    .filter((fixedCorner) => !cornerIsOccupied(links, fixedCard.id, fixedCorner))
    .map((fixedCorner) => {
      const movingCorner = oppositeCorner[fixedCorner];
      const fixedPoint = corner(fixedCard, fixedCorner);
      const direction = cornerVector(fixedCorner);
      const snapPoint = {
        x: fixedPoint.x + direction.x * CONNECT_GAP,
        y: fixedPoint.y + direction.y * CONNECT_GAP,
      };
      const position = cardPositionForCorner(card, movingCorner, snapPoint);

      return {
        fixedCard,
        fixedCorner,
        movingCorner,
        dist: distance(corner(card, movingCorner), fixedPoint),
        x: position.x,
        y: position.y,
      };
    });
}

function nearestSnapCandidate(card: CardState, cards: CardState[], links: LinkState[]) {
  const candidates = cards
    .filter((item) => item.id !== card.id)
    .flatMap((item) => snapCandidatesForCard(card, item, links))
    .filter((candidate) => !cornerIsOccupied(links, card.id, candidate.movingCorner))
    .sort((a, b) => a.dist - b.dist);

  return candidates[0] || null;
}

function nearestMagneticPosition(card: CardState, cards: CardState[], links: LinkState[], x: number, y: number) {
  const proposed = { ...card, x, y };
  const closest = nearestSnapCandidate(proposed, cards, links);
  if (!closest || closest.dist > ATTRACTION_RADIUS) return { x, y };

  const strength = 1 - closest.dist / ATTRACTION_RADIUS;
  const magneticStrength = Math.min(0.06 + strength * 0.28, 0.28);

  return {
    x: lerp(x, closest.x, magneticStrength),
    y: lerp(y, closest.y, magneticStrength),
  };
}

function linkId(aId: string, aCorner: CornerName, bId: string, bCorner: CornerName) {
  return `${aId}:${aCorner}->${bId}:${bCorner}`;
}

export default function KanbanElasticoMultiPrototype() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<CardState[]>(initialCards);
  const linksRef = useRef<LinkState[]>([]);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const snapFrameRef = useRef<number | null>(null);
  const [cards, setCards] = useState<CardState[]>(initialCards);
  const [links, setLinks] = useState<LinkState[]>([]);

  const paint = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setCards(cardsRef.current.map((card) => ({ ...card })));
      setLinks(linksRef.current.map((link) => ({ ...link })));
    });
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (snapFrameRef.current !== null) window.cancelAnimationFrame(snapFrameRef.current);
    };
  }, []);

  const previewLink = (() => {
    const drag = dragRef.current;
    const current = drag ? cards.find((card) => card.id === drag.id) : null;
    if (!drag || !current) return null;

    const candidate = nearestSnapCandidate(current, cards, links);
    if (!candidate || candidate.dist > ATTRACTION_RADIUS) return null;

    return {
      id: `preview:${candidate.fixedCard.id}:${candidate.fixedCorner}->${current.id}:${candidate.movingCorner}`,
      aId: candidate.fixedCard.id,
      aCorner: candidate.fixedCorner,
      bId: current.id,
      bCorner: candidate.movingCorner,
      preview: true,
    };
  })();

  const visibleLinks = previewLink ? [...links, previewLink] : links;
  const connectedCards = useMemo(() => new Set(visibleLinks.flatMap((link) => [link.aId, link.bId])), [visibleLinks]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
    const stage = stageRef.current;
    const current = cardsRef.current.find((card) => card.id === id);
    if (!stage || !current) return;
    if (snapFrameRef.current !== null) {
      window.cancelAnimationFrame(snapFrameRef.current);
      snapFrameRef.current = null;
    }

    const rect = stage.getBoundingClientRect();
    dragRef.current = {
      id,
      dx: event.clientX - rect.left - current.x,
      dy: event.clientY - rect.top - current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const removeBrokenLinks = (draggedId: string) => {
    linksRef.current = linksRef.current.filter((link) => (
      ![link.aId, link.bId].includes(draggedId) || linkDistance(link, cardsRef.current) <= BREAK_DISTANCE
    ));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    const availableLinks = linksRef.current.filter((link) => ![link.aId, link.bId].includes(drag.id));

    cardsRef.current = cardsRef.current.map((card) => {
      if (card.id !== drag.id) return card;

      const rawX = clamp(event.clientX - rect.left - drag.dx, 44, rect.width - card.size - 44);
      const rawY = clamp(event.clientY - rect.top - drag.dy, 44, rect.height - card.size - 44);
      const magnetic = nearestMagneticPosition(card, cardsRef.current, availableLinks, rawX, rawY);

      return {
        ...card,
        x: clamp(magnetic.x, 44, rect.width - card.size - 44),
        y: clamp(magnetic.y, 44, rect.height - card.size - 44),
      };
    });

    removeBrokenLinks(drag.id);
    paint();
  };

  const onPointerUp = () => {
    const drag = dragRef.current;

    if (drag) {
      const current = cardsRef.current.find((card) => card.id === drag.id);
      const existingLinks = linksRef.current;

      if (current) {
        const snap = nearestSnapCandidate(current, cardsRef.current, existingLinks);

        if (snap && snap.dist <= SNAP_DISTANCE) {
          const startX = current.x;
          const startY = current.y;
          const startedAt = performance.now();
          const duration = 300;

          const newLink: LinkState = {
            id: linkId(snap.fixedCard.id, snap.fixedCorner, current.id, snap.movingCorner),
            aId: snap.fixedCard.id,
            aCorner: snap.fixedCorner,
            bId: current.id,
            bCorner: snap.movingCorner,
          };
          const nextLinks = [
            ...existingLinks.filter((link) => (
              !cornerIsOccupied([link], newLink.aId, newLink.aCorner) &&
              !cornerIsOccupied([link], newLink.bId, newLink.bCorner)
            )),
            newLink,
          ];

          linksRef.current = nextLinks;
          paint();

          const animate = (now: number) => {
            const progress = clamp((now - startedAt) / duration, 0, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            cardsRef.current = cardsRef.current.map((card) => (
              card.id === drag.id
                ? { ...card, x: lerp(startX, snap.x, eased), y: lerp(startY, snap.y, eased) }
                : card
            ));
            paint();

            if (progress < 1) {
              snapFrameRef.current = window.requestAnimationFrame(animate);
            } else {
              snapFrameRef.current = null;
              paint();
            }
          };

          snapFrameRef.current = window.requestAnimationFrame(animate);
        }
      }
    }

    dragRef.current = null;
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#020816] text-white">
      <div
        ref={stageRef}
        className="relative mx-auto h-screen min-h-[680px] w-full max-w-[1180px] overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(25,121,255,.18),transparent_34%),radial-gradient(circle_at_70%_54%,rgba(47,247,255,.1),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,22,.08),rgba(2,8,22,.62))]" />

        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="elasticFillMulti" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#2f8dff" stopOpacity="0.28" />
              <stop offset="52%" stopColor="#2ff7ff" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#e7ffff" stopOpacity="0.3" />
            </linearGradient>
            <filter id="shapeGlowMulti" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blurBig" />
              <feGaussianBlur stdDeviation="2" result="blurSmall" />
              <feMerge>
                <feMergeNode in="blurBig" />
                <feMergeNode in="blurSmall" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {cards.map((card) => {
            if (connectedCards.has(card.id)) return null;
            const tone = toneMap[card.tone];
            return (
              <path
                key={card.id}
                d={normalCardPath(card)}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="3.4"
                strokeLinejoin="round"
                filter="url(#shapeGlowMulti)"
                style={{
                  filter: `drop-shadow(0 0 8px ${tone.glow}) drop-shadow(0 0 26px ${tone.glow}) drop-shadow(0 0 56px ${tone.glow})`,
                }}
              />
            );
          })}

          {visibleLinks.map((link) => {
            const startCard = cards.find((card) => card.id === link.aId);
            const endCard = cards.find((card) => card.id === link.bId);
            if (!startCard || !endCard) return null;

            const dist = linkDistance(link, cards);
            const stretch = clamp(dist / BREAK_DISTANCE, 0, 1);
            const previewStrength = 1 - clamp(dist / ATTRACTION_RADIUS, 0, 1);
            const opacity = link.preview
              ? clamp(0.24 + previewStrength * 0.56, 0.24, 0.8)
              : clamp(1 - stretch + 0.12, 0.28, 0.95);
            const mergedPath = mergedCardsPath(startCard, endCard, link.aCorner, stretch);

            return (
              <path
                key={link.id}
                d={mergedPath.d}
                fill="url(#elasticFillMulti)"
                stroke="#43eaff"
                strokeWidth="3.4"
                strokeLinejoin="round"
                opacity={opacity}
                transform={mergedPath.transform}
                filter="url(#shapeGlowMulti)"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(47,247,255,.76)) drop-shadow(0 0 28px rgba(47,141,255,.78)) drop-shadow(0 0 58px rgba(47,247,255,.48))',
                }}
              />
            );
          })}
        </svg>

        <div className="absolute left-5 top-5 z-20 rounded-full border border-cyan-200/15 bg-cyan-200/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/60 backdrop-blur">
          multi experimental
        </div>

        {cards.map((card) => (
          <div
            key={card.id}
            onPointerDown={(event) => onPointerDown(event, card.id)}
            className="absolute z-30 cursor-grab touch-none select-none active:cursor-grabbing"
            style={{
              width: card.size,
              height: card.size,
              transform: `translate3d(${card.x}px, ${card.y}px, 0)`,
            }}
            aria-label={`Card conectavel ${card.label}`}
          />
        ))}
      </div>
    </main>
  );
}
