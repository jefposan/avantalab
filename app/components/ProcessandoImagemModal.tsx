type ProcessandoImagemModalProps = {
  aberto: boolean;
  darkMode: boolean;
  titulo?: string;
};

export default function ProcessandoImagemModal({ aberto, darkMode, titulo = 'Processando imagem' }: ProcessandoImagemModalProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/75 px-4" role="status" aria-live="polite">
      <section className={`w-full max-w-xs overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: '#003E73' }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a9 9 0 1 1-6.36 2.64" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
          </span>
          <div>
            <p className="text-sm font-black">{titulo}</p>
            <p className="text-[11px] font-semibold text-cyan-100/80">Aguarde um instante.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
