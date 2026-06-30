'use client';
import React, { useEffect, useState } from 'react';

type Changelog = {
  empresa: { nome: string; subtitulo?: string; descricao: string[]; site: string; instagram: string; instagramUrl: string };
  versoes: { versao: string; titulo: string; data: string; itens: string[] }[];
};

interface SobreModalProps {
  aberto: boolean;
  onFechar: () => void;
  darkMode: boolean;
  versaoAtual: string;
}

export default function SobreModal({ aberto, onFechar, darkMode, versaoAtual }: SobreModalProps) {
  const [dados, setDados] = useState<Changelog | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || dados) return;
    setCarregando(true);
    fetch('/changelog.json')
      .then((r) => r.json())
      .then((d) => setDados(d))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [aberto, dados]);

  if (!aberto) return null;

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const itemBorda = darkMode ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />
      <div className={`relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${card}`}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.65)' }}>Sobre</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white">{dados?.empresa?.nome || 'AvantaLab'}</h2>
            {dados?.empresa?.subtitulo && <p className="mt-0.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{dados.empresa.subtitulo}</p>}
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {carregando && <p className={`py-6 text-center text-sm font-semibold ${muted}`}>Carregando...</p>}
          {dados && (
            <div className="grid gap-4">
              <section>
                <div className="grid gap-2">
                  {dados.empresa.descricao.map((par, i) => (
                    <p key={i} className={`text-sm leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{par}</p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={dados.empresa.site} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-black" style={{ borderColor: '#003E73', color: darkMode ? '#7dd3fc' : '#003E73' }}>{dados.empresa.site.replace('https://', '')}</a>
                  <a href={dados.empresa.instagramUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-black" style={{ borderColor: '#003E73', color: darkMode ? '#7dd3fc' : '#003E73' }}>{dados.empresa.instagram}</a>
                </div>
              </section>

              <section>
                <h3 className={`mb-1 text-[11px] font-black uppercase tracking-wide ${muted}`}>Novidades das versões</h3>
                <p className="mb-3 text-xs font-bold" style={{ color: darkMode ? '#7dd3fc' : '#003E73' }}>Versão instalada: {versaoAtual}</p>
                <div className="grid gap-3">
                  {dados.versoes.map((v) => (
                    <div key={v.versao} className={`rounded-xl border p-3 ${itemBorda}`}>
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                        <p className="min-w-0 break-words text-sm font-black">v{v.versao} · {v.titulo}</p>
                        <span className={`shrink-0 text-[11px] font-bold ${muted}`}>{v.data}</span>
                      </div>
                      <ul className="mt-2 grid gap-1">
                        {v.itens.map((it, i) => (
                          <li key={i} className={`flex gap-2 text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <span style={{ color: '#00A6C8' }}>•</span><span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
