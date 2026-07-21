'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import RhSidebar from './RhSidebar';

const titles: Record<string, [string, string]> = {
  '/rh': ['Visão geral', 'Indicadores e atenção necessária na gestão de pessoas'],
  '/rh/colaboradores': ['Colaboradores', 'Cadastros, vínculos e informações da equipe'],
  '/rh/departamentos': ['Departamentos e cargos', 'Estrutura organizacional e responsabilidades'],
  '/rh/documentos': ['Documentos', 'Validades, assinaturas e arquivos dos colaboradores'],
  '/rh/ferias': ['Férias e ausências', 'Planejamento, solicitações e acompanhamento'],
  '/rh/treinamentos': ['Treinamentos', 'Capacitações, certificados e pendências'],
  '/rh/avaliacoes': ['Avaliações', 'Ciclos de desempenho e feedback'],
  '/rh/recrutamento': ['Recrutamento', 'Vagas e jornada dos candidatos'],
  '/rh/organograma': ['Organograma', 'Visão hierárquica da equipe'],
  '/rh/comunicados': ['Comunicados', 'Comunicação interna com a equipe'],
  '/rh/configuracoes': ['Configurações do RH', 'Cadastros auxiliares e permissões'],
};

export default function RhShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false); const path = usePathname();
  const base = Object.keys(titles).filter((key) => path === key || path.startsWith(`${key}/`)).sort((a,b) => b.length-a.length)[0] || '/rh';
  const [title, subtitle] = titles[base];
  return <div className="typography-system min-h-screen bg-[#f4f7f9] text-slate-800 lg:flex">
    <RhSidebar open={open} onClose={() => setOpen(false)} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden" aria-label="Abrir menu"><span className="text-xl">☰</span></button>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-semibold text-[#07355d] sm:text-2xl">{title}</h1><p className="mt-0.5 hidden text-sm text-slate-500 sm:block">{subtitle}</p></div>
        <div className="hidden items-center gap-3 sm:flex"><div className="text-right"><p className="text-sm font-medium text-slate-700">Patrícia Reis</p><p className="text-xs text-slate-500">Gestora de RH</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#dcebf3] text-sm font-semibold text-[#07355d]">PR</span></div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-7">{children}</main>
    </div>
  </div>;
}
