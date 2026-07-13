'use client';

type ModalNotaLancamentoProps = {
  aberto: boolean;
  url: string;
  darkMode: boolean;
  onFechar: () => void;
};

export default function ModalNotaLancamento({ aberto, url, darkMode, onFechar }: ModalNotaLancamentoProps) {
  if (!aberto || !url) return null;

  const baixar = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nota-lancamento';
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  };

  const compartilhar = async () => {
    try {
      const resposta = await fetch(url);
      const blob = await resposta.blob();
      const arquivo = new File([blob], 'nota-lancamento.jpg', { type: blob.type || 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: 'Nota do lançamento' });
      } else {
        baixar();
      }
    } catch {
      baixar();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 px-4 py-6" onClick={onFechar}>
      <section className={`flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`} onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 px-4 py-3 text-white" style={{ backgroundColor: '#003E73' }}>
          <h2 className="text-sm font-black">Nota do lançamento</h2>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg hover:bg-white/25" title="Fechar">×</button>
        </header>
        <div className={`min-h-0 flex-1 overflow-auto p-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
          <img src={url} alt="Nota vinculada ao lançamento" className="mx-auto max-h-[68vh] max-w-full rounded-lg object-contain shadow-lg" />
        </div>
        <footer className={`flex justify-end gap-2 px-4 py-3 ${darkMode ? 'border-t border-slate-700' : 'border-t border-slate-200'}`}>
          <button type="button" onClick={compartilhar} className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-black uppercase transition hover:bg-slate-100 active:scale-95 dark:border-slate-600 dark:hover:bg-slate-800">Compartilhar</button>
          <button type="button" onClick={baixar} className="h-9 rounded-lg bg-slate-950 px-3 text-xs font-black uppercase text-white transition hover:bg-slate-800 active:scale-95">Salvar</button>
        </footer>
      </section>
    </div>
  );
}
