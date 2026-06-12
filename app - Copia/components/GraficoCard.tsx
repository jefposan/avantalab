import React from 'react';

interface GraficoCardProps {
  titulo: string;
  corPrimaria: string;
  bgCard: string;
  textStrong: string;
  className?: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
}

export default function GraficoCard({
  titulo,
  corPrimaria,
  bgCard,
  textStrong,
  className = '',
  children,
  acoes,
}: GraficoCardProps) {
  return (
    <section
      className={`${bgCard} rounded-2xl shadow-lg border border-t-4 self-start flex flex-col ${className}`}
      style={{ borderTopColor: corPrimaria }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/10 px-6 py-4">
        <h3 className={`font-bold uppercase tracking-wider ${textStrong}`}>
          {titulo}
        </h3>

        {acoes && <div className="shrink-0">{acoes}</div>}
      </div>

      <div className="flex-1 p-6">
        {children}
      </div>
    </section>
  );
}