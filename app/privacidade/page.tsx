import type { Metadata } from 'next';
import PrivacyPolicyDocument from '../components/PrivacyPolicyDocument';
import { TERMOS_VERSAO } from '../lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidade | AvantaLab Gestão',
  description: 'Política de Privacidade do AvantaLab Gestão.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">AvantaLab Gestão</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Política de Privacidade</h1>
          <p className="mt-3 text-sm text-slate-600">Versão vigente: {TERMOS_VERSAO}</p>
        </header>

        <PrivacyPolicyDocument />

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          Esta página apresenta a mesma política exibida no aplicativo AvantaLab Gestão.
        </footer>
      </article>
    </main>
  );
}
