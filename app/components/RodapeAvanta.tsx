import Link from 'next/link';
import { APP_VERSION } from '@/app/lib/version';

type Props = {
  darkMode?: boolean;
  className?: string;
};

/** Rodapé institucional comum às páginas próprias dos módulos. */
export default function RodapeAvanta({ darkMode = false, className = '' }: Props) {
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const divider = darkMode ? 'text-slate-600' : 'text-slate-300';
  const hover = darkMode ? 'hover:text-white' : 'hover:text-slate-800';

  return (
    <footer className={`print-ocultar mt-8 w-full border-t px-6 py-4 ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'} ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs md:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-2 font-bold">
          <span className="text-sm tracking-wide">
            <span style={{ color: '#003E73' }}>AVANTA</span>
            <span style={{ color: '#00A6C8' }}>LAB</span>
            <span className={`ml-1 align-middle text-[10px] font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>v{APP_VERSION}</span>
          </span>
          <span className={muted}>© {new Date().getFullYear()} Todos os direitos reservados.</span>
          <span className={divider}>|</span>
          <a href="https://www.instagram.com/avanta.lab" target="_blank" rel="noopener noreferrer" className="cursor-pointer transition-colors hover:underline" style={{ color: '#00A6C8' }}>@avanta.lab</a>
        </div>
        <nav className="flex items-center gap-4 font-semibold" aria-label="Informações legais">
          <Link href="/termos" className={`transition-colors ${hover}`}>Termos de Uso</Link>
          <span className={divider}>|</span>
          <Link href="/privacidade" className={`transition-colors ${hover}`}>Política de Privacidade</Link>
        </nav>
      </div>
    </footer>
  );
}
