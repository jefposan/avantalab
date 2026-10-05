'use client';

import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { Icon } from '@/app/projetos/components/Icon';
import styles from '@/app/custos/custos.module.css';

type Props = {
  empresa: { nome: string; logoUrl?: string; corPrimaria: string; temaEscuro: boolean };
  onBack: () => void;
  returnLabel?: string;
  returnAriaLabel?: string;
  children?: ReactNode;
};

const LOGO_SAMPLE_LIMIT = 256;
const LOGO_OUTPUT_LIMIT = 1024;

function averageCornerColor(data: Uint8ClampedArray, width: number, height: number) {
  const sampleSize = Math.max(1, Math.min(4, Math.floor(Math.min(width, height) / 4)));
  const corners = [
    [0, 0],
    [Math.max(0, width - sampleSize), 0],
    [0, Math.max(0, height - sampleSize)],
    [Math.max(0, width - sampleSize), Math.max(0, height - sampleSize)],
  ];
  const color = [0, 0, 0, 0];
  let count = 0;

  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + sampleSize; y += 1) {
      for (let x = startX; x < startX + sampleSize; x += 1) {
        const index = (y * width + x) * 4;
        color[0] += data[index];
        color[1] += data[index + 1];
        color[2] += data[index + 2];
        color[3] += data[index + 3];
        count += 1;
      }
    }
  }

  return color.map((channel) => channel / count);
}

function cropNeutralLogoMargins(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  const sampleScale = Math.min(1, LOGO_SAMPLE_LIMIT / image.naturalWidth, LOGO_SAMPLE_LIMIT / image.naturalHeight);
  const sampleWidth = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleWidth;
  sampleCanvas.height = sampleHeight;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return null;

  sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const [backgroundRed, backgroundGreen, backgroundBlue, backgroundAlpha] = averageCornerColor(pixels, sampleWidth, sampleHeight);
  let minX = sampleWidth;
  let minY = sampleHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const index = (y * sampleWidth + x) * 4;
      const alpha = pixels[index + 3];
      const alphaDistance = Math.abs(alpha - backgroundAlpha);
      const colorDistance = Math.max(
        Math.abs(pixels[index] - backgroundRed),
        Math.abs(pixels[index + 1] - backgroundGreen),
        Math.abs(pixels[index + 2] - backgroundBlue),
      );
      const isContent = backgroundAlpha < 24 ? alpha > 28 : alpha > 20 && (colorDistance > 24 || alphaDistance > 24);
      if (!isContent) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const detectedWidth = maxX - minX + 1;
  const detectedHeight = maxY - minY + 1;
  const marginX = Math.max(2, Math.round(detectedWidth * 0.07));
  const marginY = Math.max(2, Math.round(detectedHeight * 0.07));
  minX = Math.max(0, minX - marginX);
  minY = Math.max(0, minY - marginY);
  maxX = Math.min(sampleWidth - 1, maxX + marginX);
  maxY = Math.min(sampleHeight - 1, maxY + marginY);

  const cropWidthRatio = (maxX - minX + 1) / sampleWidth;
  const cropHeightRatio = (maxY - minY + 1) / sampleHeight;
  if (cropWidthRatio > 0.92 && cropHeightRatio > 0.92) return null;

  const sourceX = Math.max(0, Math.floor(minX / sampleScale));
  const sourceY = Math.max(0, Math.floor(minY / sampleScale));
  const sourceWidth = Math.min(image.naturalWidth - sourceX, Math.ceil((maxX - minX + 1) / sampleScale));
  const sourceHeight = Math.min(image.naturalHeight - sourceY, Math.ceil((maxY - minY + 1) / sampleScale));
  const outputScale = Math.min(1, LOGO_OUTPUT_LIMIT / sourceWidth, LOGO_OUTPUT_LIMIT / sourceHeight);
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, Math.round(sourceWidth * outputScale));
  outputCanvas.height = Math.max(1, Math.round(sourceHeight * outputScale));
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) return null;

  outputContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputCanvas.width, outputCanvas.height);
  return outputCanvas.toDataURL('image/png');
}

export function AdaptiveModuleLogo({ src, alt, className = styles.moduleLogo, frameClassName }: { src: string; alt: string; className?: string; frameClassName?: string }) {
  const [displaySrc, setDisplaySrc] = useState(src);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (displaySrc !== src) return;
    try {
      const cropped = cropNeutralLogoMargins(event.currentTarget);
      if (cropped) setDisplaySrc(cropped);
    } catch {
      // Imagens externas sem CORS continuam visíveis com o ajuste responsivo padrão.
    }
  }

  const logo = <img src={displaySrc} alt={alt} className={className} onLoad={handleLoad} />;
  return frameClassName ? <div className={frameClassName}>{logo}</div> : logo;
}

/** Reuses the consolidated module header, including its responsive/dark styles. */
export default function ModuloHeader({ empresa, onBack, returnLabel = 'Início', returnAriaLabel = 'Voltar ao Dashboard do AvantaLab', children }: Props) {
  return <header className={`${styles.root} ${styles.moduleHeader} ${empresa.temaEscuro ? styles.dark : ''}`} style={{ '--custos-brand': empresa.corPrimaria, minHeight: 'var(--module-header-height)' } as CSSProperties}>
    <button type="button" onClick={onBack} className={styles.moduleExit} aria-label={returnAriaLabel}><Icon name="back" size={16} /> {returnLabel}</button>
    <div className={styles.moduleIdentity}>
      {empresa.logoUrl ? <AdaptiveModuleLogo key={empresa.logoUrl} src={empresa.logoUrl} alt={empresa.nome} frameClassName={styles.moduleLogoFrame} /> : <span>{empresa.nome}</span>}
    </div>
    <div className={styles.moduleHeaderActions}>{children}</div>
  </header>;
}
