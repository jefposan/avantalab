'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './constelacao-avanta.module.css';

type Particle = {
  targetX: number;
  targetY: number;
  targetZ: number;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  size: number;
  alpha: number;
  phase: number;
  color: 0 | 1 | 2;
  bright: boolean;
  offsetX: number;
  offsetY: number;
  velocityX: number;
  velocityY: number;
  flowX: number;
  flowY: number;
  heading: number;
};

type PointerState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  manualX: number;
  manualY: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
};

const TAU = Math.PI * 2;
const CORES = ['#b7edff', '#f4fbff', '#8fc8ed', '#ffd4ae'] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function randomSeeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

type BrandPoint = { x: number; y: number; color: 0 | 2 };
type BrandShape = { points: BrandPoint[]; contains: (x: number, y: number) => boolean };
type AmbientStar = { offsetX: number; offsetY: number; velocityX: number; velocityY: number };

function sampleBrand(logo: HTMLImageElement, compact = false): BrandShape {
  const mask = document.createElement('canvas');
  mask.width = 1200;
  mask.height = 210;
  const context = mask.getContext('2d', { willReadFrequently: true });
  if (!context) return { points: [], contains: () => false };
  // The official artwork is 1200 × 298; the lower band contains the slogan.
  context.drawImage(logo, 0, 0, 1200, 298);
  const pixels = context.getImageData(0, 0, 1200, 210).data;
  const points: BrandPoint[] = [];
  const right = compact ? 233 : 1189;
  const span = right - 11;
  const center = (right + 11) / 2;
  const isInk = (x: number, y: number) => {
    if (x < 11 || x >= right || y < 13 || y >= 210) return false;
    const i = (Math.floor(y) * 1200 + Math.floor(x)) * 4;
    return pixels[i + 3] >= 160 && pixels[i + 2] - pixels[i] >= 35;
  };
  for (let y = 13; y < 210; y += 2) {
    for (let x = 11; x < right; x += 2) {
      const i = (y * 1200 + x) * 4;
      // Keep blue artwork only, excluding transparent, black and white areas.
      if (pixels[i + 3] < 160 || pixels[i + 2] - pixels[i] < 35) continue;
      points.push({ x: (x - center) / span, y: (y - 111.5) / span, color: pixels[i + 1] > 110 ? 0 : 2 });
    }
  }
  return { points, contains: (x, y) => isInk(x * span + center, y * span + 111.5) };
}

function createParticles(count: number, points: BrandPoint[]): Particle[] {
  if (!points.length) return [];
  const random = randomSeeded(20260904);
  const result: Particle[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = points[Math.floor(random() * points.length)];

    const angleStart = random() * TAU;
    const angleEnd = random() * TAU;
    const radiusStart = 0.62 + random() * 1.35;
    const radiusEnd = 0.72 + random() * 1.55;
    const bright = random() > 0.955;

    result.push({
      targetX: point.x,
      targetY: point.y,
      targetZ: (random() - 0.5) * 0.024,
      startX: Math.cos(angleStart) * radiusStart + (random() - 0.5) * 0.5,
      startY: Math.sin(angleStart) * radiusStart + (random() - 0.5) * 0.5,
      startZ: (random() - 0.5) * 1.8,
      endX: Math.cos(angleEnd) * radiusEnd + (random() - 0.5) * 0.7,
      endY: Math.sin(angleEnd) * radiusEnd + (random() - 0.5) * 0.7 - 0.18,
      endZ: (random() - 0.5) * 2.1,
      size: bright ? 2.8 + random() * 1.8 : 0.55 + random() * 0.8,
      alpha: bright ? 0.86 + random() * 0.14 : 0.58 + random() * 0.34,
      phase: random() * TAU,
      color: bright && random() > 0.62 ? 1 : point.color,
      bright,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      flowX: point.x,
      flowY: point.y,
      heading: random() * TAU,
    });
  }
  return result;
}

function createGlowSprite(color: string) {
  const sprite = document.createElement('canvas');
  sprite.width = 96;
  sprite.height = 96;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 46);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.065, '#ffffff');
  gradient.addColorStop(0.15, `${color}d9`);
  gradient.addColorStop(0.32, `${color}65`);
  gradient.addColorStop(0.62, `${color}12`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return sprite;
}

export default function ConstelacaoAvanta() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'carregando' | 'pronto' | 'indisponivel'>('carregando');
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      setStatus('indisponivel');
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    let visible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let scrollProgress = 0;
    let particles: Particle[] = [];
    let fullShape: BrandShape = { points: [], contains: () => false };
    let compactShape = fullShape;
    let activeShape = fullShape;
    let compact = false;
    const ambientStars: AmbientStar[] = Array.from({ length: 240 }, () => ({ offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0 }));
    const logo = new window.Image();
    let sprites: HTMLCanvasElement[] = [];
    let lastStatus = '';
    let lastFrame = 0;
    const wake = { x: -1000, y: -1000, previousX: -1000, previousY: -1000, movedAt: -1000, speed: 0 };
    const sceneStatus = section.querySelector<HTMLElement>('[data-scene-status]');
    const pointer: PointerState = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      manualX: 0,
      manualY: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
    };

    const updateScroll = () => {
      const rect = section.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      scrollProgress = clamp(-rect.top / range);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Keep the regular letters at least 64 CSS pixels high; otherwise use the official A.
      compact = Math.min(width * 0.88, 1250, height * 3) * (133 / 1178) < 64;
      setCompactMode(compact);
      section.dataset.brandMode = compact ? 'symbol' : 'wordmark';
      activeShape = compact ? compactShape : fullShape;
      const amount = compact ? 1800 : width < 1100 ? 3500 : 4800;
      particles = createParticles(amount, activeShape.points);
      sprites = CORES.map(createGlowSprite);
      updateScroll();
    };

    const formationAt = (progress: number) => {
      if (reducedMotion) return 1;
      if (progress < 0.16) return 0;
      if (progress < 0.42) return smoothstep((progress - 0.16) / 0.26);
      if (progress <= 0.69) return 1;
      if (progress < 0.94) return 1 - smoothstep((progress - 0.69) / 0.25);
      return 0;
    };

    const labelAt = (progress: number) => {
      if (reducedMotion || (progress >= 0.42 && progress <= 0.69)) return compact ? 'Símbolo AvantaLab' : 'Forma Avanta';
      if (progress < 0.42) return progress < 0.16 ? 'Pontos dispersos' : compact ? 'Formando o A AvantaLab' : 'Formando AvantaLab';
      return progress < 0.94 ? 'Expandindo' : 'Novo começo';
    };

    const render = (time: number) => {
      frameRef.current = null;
      if (!visible || document.hidden) return;
      const dt = Math.min((time - (lastFrame || time - 16.67)) / 1000, 0.035);
      lastFrame = time;

      const formation = formationAt(scrollProgress);
      const label = labelAt(scrollProgress);
      if (label !== lastStatus) {
        if (sceneStatus) sceneStatus.textContent = label;
        lastStatus = label;
      }

      const pointerEase = 1 - Math.exp(-5 * dt);
      pointer.x += (pointer.targetX + pointer.manualX - pointer.x) * pointerEase;
      pointer.y += (pointer.targetY + pointer.manualY - pointer.y) * pointerEase;

      const background = context.createRadialGradient(width * 0.5, height * 0.48, 0, width * 0.5, height * 0.48, Math.max(width, height) * 0.82);
      background.addColorStop(0, '#050c12');
      background.addColorStop(0.48, '#07121b');
      background.addColorStop(1, '#02070b');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const scale = compact ? Math.min(width * 0.72, height * 0.62) : Math.min(width * 0.88, 1250, height * 3);
      const centerX = width * 0.5;
      const centerY = height * (width < 680 ? 0.5 : 0.515);
      const rotationY = reducedMotion ? 0 : pointer.x * 0.24 + Math.sin(time * 0.00021) * 0.035;
      const rotationX = reducedMotion ? 0 : -pointer.y * 0.2 + Math.sin(time * 0.00017) * 0.025;
      const sinY = Math.sin(rotationY);
      const cosY = Math.cos(rotationY);
      const sinX = Math.sin(rotationX);
      const cosX = Math.cos(rotationX);
      const before = 1 - smoothstep(scrollProgress / 0.42);
      const after = smoothstep((scrollProgress - 0.69) / 0.31);
      const now = time * 0.001;
      const wakeStrength = reducedMotion ? 0 : Math.exp(-Math.max(0, time - wake.movedAt) / 380);
      const influenceRadius = Math.min(125, width * 0.2);

      // Three depth layers: fine distant stars, luminous stars and soft foreground halos.
      const ambientCount = width < 680 ? 140 : 240;
      for (let i = 0; i < ambientCount; i += 1) {
        const foreground = i % 31 === 0;
        const luminous = i % 9 === 0;
        const depth = foreground ? 1 : luminous ? 0.45 : 0.12;
        const motion = reducedMotion ? 0 : Math.sin(now * 0.38 + i) * (8 + depth * 18);
        const baseX = ((i * 0.61803398875) % 1) * width + motion + (reducedMotion ? 0 : pointer.x * (18 + depth * 58));
        const baseY = ((i * 0.41421356237) % 1) * height + motion * 0.7 + (reducedMotion ? 0 : pointer.y * (14 + depth * 42));
        const star = ambientStars[i];
        if (!reducedMotion) {
          const dx = baseX + star.offsetX - wake.x;
          const dy = baseY + star.offsetY - wake.y;
          const distance = Math.hypot(dx, dy);
          const reach = influenceRadius * (1.4 + depth);
          const force = Math.pow(Math.max(0, 1 - distance / reach), 2) * wakeStrength * (3500 + wake.speed * 2600) * (0.55 + depth);
          star.velocityX += (-star.offsetX * 9 + dx / Math.max(distance, 1) * force) * dt;
          star.velocityY += (-star.offsetY * 9 + dy / Math.max(distance, 1) * force) * dt;
          star.velocityX *= Math.exp(-4.2 * dt);
          star.velocityY *= Math.exp(-4.2 * dt);
          star.offsetX += star.velocityX * dt;
          star.offsetY += star.velocityY * dt;
        } else {
          star.offsetX = star.offsetY = star.velocityX = star.velocityY = 0;
        }
        const x = baseX + star.offsetX;
        const y = baseY + star.offsetY;
        const pulse = reducedMotion ? 1 : 0.8 + Math.sin(now * 0.65 + i) * 0.2;
        const tint = i % 7 === 0 ? 3 : i % 3;
        if (foreground || luminous) {
          const diameter = (foreground ? 42 + (i % 4) * 8 : 18 + (i % 5) * 3) * (width < 680 ? 0.75 : 1);
          context.globalCompositeOperation = 'screen';
          context.globalAlpha = (foreground ? 0.32 : 0.75) * pulse;
          context.drawImage(sprites[tint], x - diameter / 2, y - diameter / 2, diameter, diameter);
        }
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = luminous ? '#f4fbff' : CORES[tint];
        context.globalAlpha = (foreground ? 0.12 : luminous ? 0.8 : 0.38) * pulse;
        const radius = foreground ? 1.8 : luminous ? 1.2 + (i % 3) * 0.25 : 0.4 + (i % 4) * 0.18;
        context.beginPath();
        context.arc(x, y, radius, 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;

      for (const particle of particles) {
        const scatterX = particle.startX * before + particle.endX * after;
        const scatterY = particle.startY * before + particle.endY * after;
        const scatterZ = particle.startZ * before + particle.endZ * after;
        const drift = reducedMotion ? 0 : Math.sin(now * 0.56 + particle.phase) * 0.014 * (1 - formation);
        // Stars travel through the actual ink mask, reflecting at its edges.
        // No ambient drift can erase counters, bridge letters or distort the silhouette.
        if (!reducedMotion) {
          particle.heading += Math.sin(now * 1.8 + particle.phase) * dt * 1.1;
          const step = (particle.bright ? 24 : 32) * (0.8 + (Math.sin(particle.phase) + 1) * 0.3) * dt / scale;
          const nextX = particle.flowX + Math.cos(particle.heading) * step;
          if (activeShape.contains(nextX, particle.flowY)) particle.flowX = nextX;
          else particle.heading = Math.PI - particle.heading;
          const nextY = particle.flowY + Math.sin(particle.heading) * step;
          if (activeShape.contains(particle.flowX, nextY)) particle.flowY = nextY;
          else particle.heading = -particle.heading;
        }
        const anchorX = reducedMotion ? particle.targetX : particle.flowX;
        const anchorY = reducedMotion ? particle.targetY : particle.flowY;
        const x = anchorX * formation + scatterX * (1 - formation) + drift;
        const y = anchorY * formation + scatterY * (1 - formation) + (reducedMotion ? 0 : Math.cos(now * 0.9 + particle.phase) * 0.008 * (1 - formation));
        const z = (particle.targetZ + (reducedMotion ? 0 : Math.sin(now * 1.4 + particle.phase) * 0.006)) * formation + scatterZ * (1 - formation);

        const rotatedX = x * cosY + z * sinY;
        const rotatedZ = -x * sinY + z * cosY;
        const rotatedY = y * cosX - rotatedZ * sinX;
        const finalZ = y * sinX + rotatedZ * cosX;
        const perspective = clamp(1 / (1 + finalZ * 0.26), 0.55, 1.65);
        const baseX = centerX + rotatedX * scale * perspective;
        const baseY = centerY + rotatedY * scale * perspective;
        if (!reducedMotion) {
          // A damped spring returns each star to its own moving anchor.
          const dx = baseX + particle.offsetX - wake.x;
          const dy = baseY + particle.offsetY - wake.y;
          const distance = Math.hypot(dx, dy);
          const force = Math.pow(Math.max(0, 1 - distance / influenceRadius), 2) * wakeStrength * (1800 + wake.speed * 2200);
          const angle = particle.phase;
          particle.velocityX += (-particle.offsetX * 14 + (distance > 1 ? dx / distance : Math.cos(angle)) * force) * dt;
          particle.velocityY += (-particle.offsetY * 14 + (distance > 1 ? dy / distance : Math.sin(angle)) * force) * dt;
          const damping = Math.exp(-4.8 * dt);
          particle.velocityX *= damping;
          particle.velocityY *= damping;
          particle.offsetX += particle.velocityX * dt;
          particle.offsetY += particle.velocityY * dt;
        } else {
          particle.offsetX = particle.offsetY = particle.velocityX = particle.velocityY = 0;
        }
        const screenX = baseX + particle.offsetX;
        const screenY = baseY + particle.offsetY;
        if (screenX < -80 || screenX > width + 80 || screenY < -80 || screenY > height + 80) continue;

        const pulse = reducedMotion ? 1 : 0.96 + Math.sin(now * 2.1 + particle.phase) * (particle.bright ? 0.12 : 0.06);
        const radius = particle.size * perspective * pulse * clamp(width / 1050, 0.48, 1);
        const alpha = particle.alpha * (0.66 + formation * 0.34);

        if (particle.bright || particle.size > 1.1) {
          const spriteSize = radius * (particle.bright ? 12 : 5);
          context.globalCompositeOperation = 'screen';
          context.globalAlpha = alpha * (particle.bright ? 0.82 : 0.2);
          context.drawImage(sprites[particle.color], screenX - spriteSize / 2, screenY - spriteSize / 2, spriteSize, spriteSize);
        }

        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = alpha;
        context.fillStyle = particle.bright ? '#ffffff' : CORES[particle.color];
        context.beginPath();
        context.arc(screenX, screenY, Math.max(0.3, particle.bright ? radius * 0.46 : radius), 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;

      if (!reducedMotion) frameRef.current = window.requestAnimationFrame(render);
    };

    const requestRender = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const canvasRect = canvas.getBoundingClientRect();
      const nextX = event.clientX - canvasRect.left;
      const nextY = event.clientY - canvasRect.top;
      wake.speed = Math.min(2, Math.hypot(nextX - wake.previousX, nextY - wake.previousY) / 45);
      wake.previousX = wake.x = nextX;
      wake.previousY = wake.y = nextY;
      wake.movedAt = performance.now();
      const rect = section.getBoundingClientRect();
      const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      const normalizedY = clamp(event.clientY / window.innerHeight, 0, 1) * 2 - 1;
      pointer.targetX = normalizedX * (pointer.dragging ? 0.82 : 0.46);
      pointer.targetY = normalizedY * (pointer.dragging ? 0.7 : 0.38);
      if (pointer.dragging) {
        pointer.manualX = clamp(pointer.manualX + (event.clientX - pointer.lastX) / 620, -0.9, 0.9);
        pointer.manualY = clamp(pointer.manualY + (event.clientY - pointer.lastY) / 620, -0.72, 0.72);
      }
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      requestRender();
    };

    const onPointerDown = (event: PointerEvent) => {
      onPointerMove(event);
      pointer.dragging = true;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      section.dataset.dragging = 'true';
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    };

    const onPointerUp = () => {
      pointer.dragging = false;
      section.dataset.dragging = 'false';
    };

    const onPointerLeave = () => {
      if (pointer.dragging) return;
      pointer.targetX = 0;
      pointer.targetY = 0;
      wake.movedAt = -1000;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const step = 0.09;
      if (event.key === 'ArrowLeft') pointer.manualX -= step;
      else if (event.key === 'ArrowRight') pointer.manualX += step;
      else if (event.key === 'ArrowUp') pointer.manualY -= step;
      else if (event.key === 'ArrowDown') pointer.manualY += step;
      else if (event.key === 'Home') {
        pointer.manualX = 0;
        pointer.manualY = 0;
      } else return;
      event.preventDefault();
      pointer.manualX = clamp(pointer.manualX, -0.9, 0.9);
      pointer.manualY = clamp(pointer.manualY, -0.72, 0.72);
      requestRender();
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      requestRender();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) requestRender();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestRender();
      else if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }, { rootMargin: '20% 0px' });
    const resizeObserver = new ResizeObserver(resize);
    const dragSurface = section.querySelector<HTMLElement>('[data-drag-surface]');
    const interactionSurface = section.querySelector<HTMLElement>('[data-interaction-surface]');

    resize();
    observer.observe(section);
    resizeObserver.observe(canvas);
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotionQuery.addEventListener('change', onMotionChange);
    interactionSurface?.addEventListener('pointermove', onPointerMove);
    interactionSurface?.addEventListener('pointerleave', onPointerLeave);
    dragSurface?.addEventListener('pointerdown', onPointerDown);
    dragSurface?.addEventListener('pointerup', onPointerUp);
    dragSurface?.addEventListener('pointercancel', onPointerUp);
    dragSurface?.addEventListener('keydown', onKeyDown);
    logo.onload = () => {
      fullShape = sampleBrand(logo);
      compactShape = sampleBrand(logo, true);
      setStatus(fullShape.points.length && compactShape.points.length ? 'pronto' : 'indisponivel');
      resize();
      requestRender();
    };
    logo.onerror = () => setStatus('indisponivel');
    logo.src = '/images/logo-avantalab-oficial.png';
    requestRender();

    return () => {
      logo.onload = null;
      logo.onerror = null;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotionQuery.removeEventListener('change', onMotionChange);
      interactionSurface?.removeEventListener('pointermove', onPointerMove);
      interactionSurface?.removeEventListener('pointerleave', onPointerLeave);
      dragSurface?.removeEventListener('pointerdown', onPointerDown);
      dragSurface?.removeEventListener('pointerup', onPointerUp);
      dragSurface?.removeEventListener('pointercancel', onPointerUp);
      dragSurface?.removeEventListener('keydown', onKeyDown);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.experiment} id="experimento" data-dragging="false">
      <div className={styles.stickyStage} data-interaction-surface>
        <canvas ref={canvasRef} className={styles.particleCanvas} aria-hidden="true" />

        <div className={styles.sceneShade} aria-hidden="true" />
        <div className={styles.sceneCopy}>
          <p>Do zero ao operacional</p>
          <span>{compactMode ? 'Símbolo oficial · adaptado à sua tela' : 'Role para transformar'}</span>
        </div>
        <p className={styles.sceneStatus} data-scene-status aria-hidden="true" />

        {status === 'carregando' && <p className={styles.loading}>Preparando constelação…</p>}
        {status === 'indisponivel' && (
          <div className={styles.fallback} role="img" aria-label="AvantaLab">
            <span>AvantaLab</span>
            <p>Não foi possível carregar a constelação interativa.</p>
          </div>
        )}

        <button
          className={styles.dragSurface}
          data-drag-surface
          type="button"
          aria-label={`Mova o ponteiro para espalhar as estrelas ${compactMode ? 'do A oficial' : 'do nome'} AvantaLab e do fundo; elas retornam sozinhas. Arraste ou use as setas para inclinar e Home para centralizar.`}
        />

        <div className={styles.interactionHint} aria-hidden="true">
          <i />
          Passe o mouse — as estrelas voltam sozinhas
        </div>
        <div className={styles.progressRail} aria-hidden="true">
          <span>Disperso</span>
          <i />
          <span>Forma</span>
          <i />
          <span>Expansão</span>
        </div>
      </div>
    </section>
  );
}
