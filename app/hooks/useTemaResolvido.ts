'use client';
import { useEffect, useState } from 'react';
export type ModoTemaResolvido = 'profile' | 'light' | 'dark' | 'system';
export function resolverTema(mode: ModoTemaResolvido, profileDark: boolean, systemDark: boolean) {
  return mode === 'system' ? systemDark : mode === 'profile' ? profileDark : mode === 'dark';
}
/** Uma resolução compartilhada; recebe o tema do shell, sem persistência paralela. */
export default function useTemaResolvido(mode: ModoTemaResolvido, profileDark: boolean) {
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    const frame = requestAnimationFrame(update);
    media.addEventListener('change', update);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', update); };
  }, [mode]);
  return resolverTema(mode, profileDark, systemDark);
}
