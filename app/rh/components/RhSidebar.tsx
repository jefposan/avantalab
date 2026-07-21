'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RhIcon } from './RhIcons';

const items = [
  ['Visão geral', '/rh', 'home'], ['Colaboradores', '/rh/colaboradores', 'users'],
  ['Departamentos e cargos', '/rh/departamentos', 'building'], ['Documentos', '/rh/documentos', 'file'],
  ['Férias e ausências', '/rh/ferias', 'calendar'], ['Treinamentos', '/rh/treinamentos', 'training'],
  ['Avaliações', '/rh/avaliacoes', 'star'], ['Recrutamento', '/rh/recrutamento', 'briefcase'],
  ['Organograma', '/rh/organograma', 'chart'], ['Comunicados', '/rh/comunicados', 'megaphone'],
  ['Configurações', '/rh/configuracoes', 'settings'],
] as const;

export default function RhSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  return <>
    {open && <button aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[#07355d] text-white shadow-xl transition-transform lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/" className="text-[11px] font-semibold uppercase tracking-[.24em] text-cyan-200">AvantaLab Gestão</Link>
        <div className="mt-2 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/15 text-cyan-200"><RhIcon name="users" className="h-5 w-5" /></span><div><p className="text-lg font-semibold">Recursos Humanos</p><p className="text-xs text-slate-300">Gestão de pessoas</p></div></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {items.map(([label, href, icon]) => {
          const active = href === '/rh' ? path === href : path.startsWith(href);
          return <Link key={href} href={href} onClick={onClose} className={`mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] transition ${active ? 'bg-white text-[#07355d] shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}><RhIcon name={icon} className="h-[18px] w-[18px] shrink-0" /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-4"><Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white">← Voltar ao sistema</Link></div>
    </aside>
  </>;
}
