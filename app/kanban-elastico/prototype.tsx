'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type CardId = 'azul' | 'movel' | 'destino';
type CornerName = 'tl' | 'tr' | 'br' | 'bl';
type Point = { x: number; y: number };

type CardState = {
  id: CardId;
  tone: 'blue' | 'cyan';
  x: number;
  y: number;
  size: number;
};

type Connection = {
  startCardId: CardId;
  endCardId: CardId;
  startCorner: CornerName;
  endCorner: CornerName;
  start: Point;
  end: Point;
  startTip: Point;
  endTip: Point;
  dist: number;
  stretch: number;
  strength: number;
  opacity: number;
};

const ATTRACTION_RADIUS = 150;
const BREAK_DISTANCE = 96;
const SNAP_DISTANCE = ATTRACTION_RADIUS;
const CARD_RADIUS = 18;
const PLUG_OVERLAP = 12;
const CONNECT_GAP = 12;
const MERGED_DISTANCE = 36;
const MIN_HOURGLASS_GAP = 30;
const MIN_ELASTIC_HALF_WIDTH = MIN_HOURGLASS_GAP / 2;
const corners: CornerName[] = ['tl', 'tr', 'br', 'bl'];

const oppositeCorner: Record<CornerName, CornerName> = {
  tl: 'br',
  tr: 'bl',
  br: 'tl',
  bl: 'tr',
};

const initialCards: CardState[] = [
  { id: 'azul', tone: 'blue', x: 126, y: 178, size: 148 },
  { id: 'movel', tone: 'cyan', x: 340, y: 352, size: 148 },
  { id: 'destino', tone: 'blue', x: 792, y: 182, size: 148 },
];

const toneMap = {
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
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cornerVector(name: CornerName) {
  return {
    x: name === 'tr' || name === 'br' ? 1 : -1,
    y: name === 'bl' || name === 'br' ? 1 : -1,
  };
}

function cardPositionForCorner(card: CardState, cornerName: CornerName, point: Point) {
  return {
    x: cornerName === 'tr' || cornerName === 'br' ? point.x - card.size : point.x,
    y: cornerName === 'bl' || cornerName === 'br' ? point.y - card.size : point.y,
  };
}

function snapCandidatesForCard(card: CardState, fixedCard: CardState) {
  return corners.map((fixedCorner) => {
    const movingCorner = oppositeCorner[fixedCorner];
    const fixedPoint = corner(fixedCard, fixedCorner);
    const direction = cornerVector(fixedCorner);
    const snapPoint = {
      x: fixedPoint.x + direction.x * CONNECT_GAP,
      y: fixedPoint.y + direction.y * CONNECT_GAP,
    };
    const position = cardPositionForCorner(card, movingCorner, snapPoint);

    return {
      dist: distance(corner(card, movingCorner), fixedPoint),
      x: position.x,
      y: position.y,
      snapX: position.x,
      snapY: position.y,
      fixedCorner,
      movingCorner,
    };
  });
}

function nearestSnapPosition(card: CardState, cards: CardState[]) {
  const candidates = cards
    .filter((item) => item.id !== card.id)
    .flatMap((item) => snapCandidatesForCard(card, item))
    .sort((a, b) => a.dist - b.dist);
  return candidates[0] || null;
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

  if (endCard.id === 'movel') {
    return {
      a: startCard,
      b: {
        ...endCard,
        x: Math.max(endCard.x, minEndX),
        y: Math.max(endCard.y, minEndY),
      },
    };
  }

  if (startCard.id === 'movel') {
    return {
      a: {
        ...startCard,
        x: Math.min(startCard.x, endCard.x - startCard.size - CONNECT_GAP),
        y: Math.min(startCard.y, endCard.y - startCard.size - CONNECT_GAP),
      },
      b: endCard,
    };
  }

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
  const neck = Math.max(MIN_HOURGLASS_GAP, plugRadius * 0.82);
  const upperExit = { x: aRight, y: aBottom - neck };
  const upperEntry = { x: bLeft + neck, y: bTop };
  const lowerExit = { x: bLeft, y: bTop + neck };
  const lowerEntry = { x: aRight - neck, y: aBottom };
  const controlPull = Math.max(26, CONNECT_GAP * 0.9);

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

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function unitVector(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return { x: dx / length, y: dy / length };
}

function corner(card: CardState, name: CornerName): Point {
  if (name === 'tl') return { x: card.x, y: card.y };
  if (name === 'tr') return { x: card.x + card.size, y: card.y };
  if (name === 'bl') return { x: card.x, y: card.y + card.size };
  return { x: card.x + card.size, y: card.y + card.size };
}

function deformationTip(anchor: Point, target: Point, stretch: number, cornerName: CornerName) {
  const maxPull = lerp(64, 14, stretch);
  const minPull = lerp(18, 4, stretch);
  const direction = cornerVector(cornerName);
  const dx = clamp((target.x - anchor.x) * 0.46 * direction.x, minPull, maxPull);
  const dy = clamp((target.y - anchor.y) * 0.46 * direction.y, minPull, maxPull);

  return {
    x: anchor.x + direction.x * dx,
    y: anchor.y + direction.y * dy,
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

function deformedCardPath(card: CardState, cornerName: CornerName, target: Point, stretch: number) {
  const { x, y, size } = card;
  const r = CARD_RADIUS;
  const anchor = corner(card, cornerName);
  const tip = deformationTip(anchor, target, stretch, cornerName);
  const spread = lerp(48, 22, stretch);

  if (cornerName === 'br') {
    const rightSide = { x: x + size, y: y + size - spread };
    const bottomSide = { x: x + size - spread, y: y + size };
    const dx = tip.x - anchor.x;
    const dy = tip.y - anchor.y;
    return [
      `M ${x + r} ${y}`,
      `H ${x + size - r}`,
      `Q ${x + size} ${y} ${x + size} ${y + r}`,
      `V ${rightSide.y}`,
      `C ${anchor.x} ${rightSide.y + spread * 0.74}, ${anchor.x + dx * 0.66} ${anchor.y + dy * 0.2}, ${tip.x} ${tip.y}`,
      `C ${anchor.x + dx * 0.2} ${anchor.y + dy * 0.66}, ${bottomSide.x + spread * 0.74} ${anchor.y}, ${bottomSide.x} ${bottomSide.y}`,
      `H ${x + r}`,
      `Q ${x} ${y + size} ${x} ${y + size - r}`,
      `V ${y + r}`,
      `Q ${x} ${y} ${x + r} ${y}`,
      'Z',
    ].join(' ');
  }

  const topSide = { x: x + spread, y };
  const leftSide = { x, y: y + spread };
  const dx = tip.x - anchor.x;
  const dy = tip.y - anchor.y;
  return [
    `M ${topSide.x} ${topSide.y}`,
    `H ${x + size - r}`,
    `Q ${x + size} ${y} ${x + size} ${y + r}`,
    `V ${y + size - r}`,
    `Q ${x + size} ${y + size} ${x + size - r} ${y + size}`,
    `H ${x + r}`,
    `Q ${x} ${y + size} ${x} ${y + size - r}`,
    `V ${leftSide.y}`,
    `C ${anchor.x} ${leftSide.y - spread * 0.74}, ${anchor.x + dx * 0.66} ${anchor.y + dy * 0.2}, ${tip.x} ${tip.y}`,
    `C ${anchor.x + dx * 0.2} ${anchor.y + dy * 0.66}, ${topSide.x - spread * 0.74} ${anchor.y}, ${topSide.x} ${topSide.y}`,
    'Z',
  ].join(' ');
}

function elasticCorePath(startTip: Point, endTip: Point, stretch: number) {
  const v = unitVector(startTip, endTip);
  const n = { x: -v.y, y: v.x };
  const dist = distance(startTip, endTip);
  const endSide = lerp(24, 18, stretch);
  const waist = Math.max(MIN_ELASTIC_HALF_WIDTH, lerp(22, 7, stretch));
  const pull = clamp(dist * 0.28, 18, 48);
  const middle = { x: (startTip.x + endTip.x) / 2, y: (startTip.y + endTip.y) / 2 };
  const a1 = { x: startTip.x + n.x * endSide, y: startTip.y + n.y * endSide };
  const a2 = { x: startTip.x - n.x * endSide, y: startTip.y - n.y * endSide };
  const b1 = { x: endTip.x + n.x * endSide, y: endTip.y + n.y * endSide };
  const b2 = { x: endTip.x - n.x * endSide, y: endTip.y - n.y * endSide };
  const m1 = { x: middle.x + n.x * waist, y: middle.y + n.y * waist };
  const m2 = { x: middle.x - n.x * waist, y: middle.y - n.y * waist };
  const endCap = { x: endTip.x + v.x * 5, y: endTip.y + v.y * 5 };
  const startCap = { x: startTip.x - v.x * 5, y: startTip.y - v.y * 5 };

  return [
    `M ${a1.x} ${a1.y}`,
    `C ${startTip.x + v.x * pull + n.x * endSide} ${startTip.y + v.y * pull + n.y * endSide}, ${middle.x - v.x * pull * 0.18 + n.x * waist} ${middle.y - v.y * pull * 0.18 + n.y * waist}, ${m1.x} ${m1.y}`,
    `C ${middle.x + v.x * pull * 0.18 + n.x * waist} ${middle.y + v.y * pull * 0.18 + n.y * waist}, ${endTip.x - v.x * pull + n.x * endSide} ${endTip.y - v.y * pull + n.y * endSide}, ${b1.x} ${b1.y}`,
    `Q ${endCap.x} ${endCap.y} ${b2.x} ${b2.y}`,
    `C ${endTip.x - v.x * pull - n.x * endSide} ${endTip.y - v.y * pull - n.y * endSide}, ${middle.x + v.x * pull * 0.18 - n.x * waist} ${middle.y + v.y * pull * 0.18 - n.y * waist}, ${m2.x} ${m2.y}`,
    `C ${middle.x - v.x * pull * 0.18 - n.x * waist} ${middle.y - v.y * pull * 0.18 - n.y * waist}, ${startTip.x + v.x * pull - n.x * endSide} ${startTip.y + v.y * pull - n.y * endSide}, ${a2.x} ${a2.y}`,
    `Q ${startCap.x} ${startCap.y} ${a1.x} ${a1.y}`,
    'Z',
  ].join(' ');
}

function nearestMagneticPosition(card: CardState, cards: CardState[], x: number, y: number) {
  const proposed = { ...card, x, y };
  const candidates = cards
    .filter((item) => item.id !== card.id)
    .flatMap((item) => snapCandidatesForCard(proposed, item))
    .sort((a, b) => a.dist - b.dist);
  const closest = candidates[0];
  if (!closest || closest.dist > ATTRACTION_RADIUS) return { x, y };
  const strength = 1 - closest.dist / ATTRACTION_RADIUS;
  const magneticStrength = Math.min(strength * 0.2, 0.2);
  return {
    x: lerp(x, closest.snapX, magneticStrength),
    y: lerp(y, closest.snapY, magneticStrength),
  };
}

function pathForCard(card: CardState, connection: Connection | null) {
  if (!connection) return normalCardPath(card);
  if (connection.dist > MERGED_DISTANCE) return normalCardPath(card);
  if (connection.startCardId === card.id) {
    return deformedCardPath(card, connection.startCorner, connection.end, connection.stretch);
  }
  if (connection.endCardId === card.id) {
    return deformedCardPath(card, connection.endCorner, connection.start, connection.stretch);
  }
  return normalCardPath(card);
}

export default function KanbanElasticoPrototype() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<CardState[]>(initialCards);
  const dragRef = useRef<{ id: CardId; dx: number; dy: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const snapFrameRef = useRef<number | null>(null);
  const [cards, setCards] = useState<CardState[]>(initialCards);

  const paint = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setCards(cardsRef.current.map((card) => ({ ...card })));
    });
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (snapFrameRef.current !== null) window.cancelAnimationFrame(snapFrameRef.current);
    };
  }, []);

  const moving = cards.find((card) => card.id === 'movel') || cards[1];
  const anchors = cards.filter((card) => card.id !== 'movel');

  const connection = useMemo<Connection | null>(() => {
    const candidates = anchors.flatMap((card) => (
      corners.map((fixedCorner) => {
        const movingCorner = oppositeCorner[fixedCorner];
        const fixedPoint = corner(card, fixedCorner);
        const movingPoint = corner(moving, movingCorner);

        return {
        startCardId: card.id,
        endCardId: moving.id,
          startCorner: fixedCorner,
          endCorner: movingCorner,
          start: fixedPoint,
          end: movingPoint,
          dist: distance(fixedPoint, movingPoint),
        };
      })
    ));
    const closest = candidates.sort((a, b) => a.dist - b.dist)[0];
    if (!closest || closest.dist > BREAK_DISTANCE) return null;
    const stretch = clamp(closest.dist / BREAK_DISTANCE, 0, 1);
    const strength = 1 - stretch;
    const startTip = deformationTip(closest.start, closest.end, stretch, closest.startCorner);
    const endTip = deformationTip(closest.end, closest.start, stretch, closest.endCorner);
    return {
      ...closest,
      stretch,
      strength,
      startTip,
      endTip,
      opacity: clamp(strength + 0.12, 0.18, 0.95),
    };
  }, [anchors, moving]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, id: CardId) => {
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

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    cardsRef.current = cardsRef.current.map((card) => {
      if (card.id !== drag.id) return card;
      const rawX = clamp(event.clientX - rect.left - drag.dx, 44, rect.width - card.size - 44);
      const rawY = clamp(event.clientY - rect.top - drag.dy, 44, rect.height - card.size - 44);
      const magnetic = nearestMagneticPosition(card, cardsRef.current, rawX, rawY);
      return {
        ...card,
        x: clamp(magnetic.x, 44, rect.width - card.size - 44),
        y: clamp(magnetic.y, 44, rect.height - card.size - 44),
      };
    });
    paint();
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag) {
      const current = cardsRef.current.find((card) => card.id === drag.id);
      if (current) {
        const snap = nearestSnapPosition(current, cardsRef.current);
        if (snap && snap.dist <= SNAP_DISTANCE) {
          const startX = current.x;
          const startY = current.y;
          const startedAt = performance.now();
          const duration = 320;
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
            <linearGradient id="elasticFill" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#2f8dff" stopOpacity="0.28" />
              <stop offset="52%" stopColor="#2ff7ff" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#e7ffff" stopOpacity="0.3" />
            </linearGradient>
            <filter id="shapeGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="8" result="blurBig" />
              <feGaussianBlur stdDeviation="2" result="blurSmall" />
              <feMerge>
                <feMergeNode in="blurBig" />
                <feMergeNode in="blurSmall" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {connection && (() => {
            const startCard = cards.find((card) => card.id === connection.startCardId);
            const endCard = cards.find((card) => card.id === connection.endCardId);
            if (!startCard || !endCard) return null;
            const mergedPath = mergedCardsPath(startCard, endCard, connection.startCorner, connection.stretch);
            return (
              <path
                d={mergedPath.d}
                fill="url(#elasticFill)"
                stroke="#43eaff"
                strokeWidth="3.4"
                strokeLinejoin="round"
                opacity={connection.opacity}
                transform={mergedPath.transform}
                filter="url(#shapeGlow)"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(47,247,255,.76)) drop-shadow(0 0 28px rgba(47,141,255,.78)) drop-shadow(0 0 58px rgba(47,247,255,.48))',
                }}
              />
            );
          })()}

          {cards.map((card) => {
            if (connection && (connection.startCardId === card.id || connection.endCardId === card.id)) return null;
            const tone = toneMap[card.tone];
            return (
              <path
                key={card.id}
                d={pathForCard(card, connection)}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth="3.4"
                strokeLinejoin="round"
                filter="url(#shapeGlow)"
                style={{
                  filter: `drop-shadow(0 0 8px ${tone.glow}) drop-shadow(0 0 26px ${tone.glow}) drop-shadow(0 0 56px ${tone.glow})`,
                }}
              />
            );
          })}
        </svg>

        <div className="absolute left-5 top-5 z-20 rounded-full border border-cyan-200/15 bg-cyan-200/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/60 backdrop-blur">
          arraste o quadrado ciano
        </div>

        {cards.map((card) => {
          const isMovable = card.id === 'movel';
          return (
            <div
              key={card.id}
              onPointerDown={(event) => onPointerDown(event, card.id)}
              className={`absolute z-30 touch-none select-none ${
                isMovable ? 'cursor-grab active:cursor-grabbing' : 'cursor-move'
              }`}
              style={{
                width: card.size,
                height: card.size,
                transform: `translate3d(${card.x}px, ${card.y}px, 0)`,
              }}
              aria-label={isMovable ? 'Quadrado ciano arrastavel' : 'Quadrado de conexao'}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center">
          <div className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-semibold text-white/42 backdrop-blur">
            agora a propria path do card deforma a quina antes da massa romper
          </div>
        </div>
      </div>
    </main>
  );
}
