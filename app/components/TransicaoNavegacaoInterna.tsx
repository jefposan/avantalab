type TransicaoNavegacaoInternaProps = {
  destino: string;
  empresa?: { nome: string; corPrimaria: string; temaEscuro?: boolean; logoUrl?: string } | null;
};

/** Estrutura local usada enquanto uma rota interna confirma seus dados. */
export default function TransicaoNavegacaoInterna({ destino, empresa }: TransicaoNavegacaoInternaProps) {
  const cor = empresa?.corPrimaria || '#003E73';
  const escuro = empresa?.temaEscuro === true;

  return (
    <main className={`min-h-screen font-sans ${escuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} aria-busy="true">
      <header className={`flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6 ${escuro ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: cor }} aria-hidden="true">A</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{empresa?.nome || 'AvantaLab'}</p>
            <p className={`text-xs font-semibold ${escuro ? 'text-slate-400' : 'text-slate-500'}`}>{destino}</p>
          </div>
        </div>
        <span className={`h-8 w-20 rounded-xl ${escuro ? 'bg-slate-800' : 'bg-slate-100'}`} aria-hidden="true" />
      </header>

      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6" aria-label={`Preparando ${destino}`}>
        <div className={`h-8 w-52 animate-pulse rounded-lg ${escuro ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((indice) => <div key={indice} className={`h-32 animate-pulse rounded-2xl ${escuro ? 'bg-slate-900' : 'bg-white shadow-sm'}`} />)}
        </div>
        <div className={`h-72 animate-pulse rounded-2xl ${escuro ? 'bg-slate-900' : 'bg-white shadow-sm'}`} />
      </section>
      <p className="sr-only" role="status">Abrindo {destino}.</p>
    </main>
  );
}
