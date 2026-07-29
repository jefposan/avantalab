import type { Metadata } from 'next';
import Image from 'next/image';
import LegalPageBackLink from '../components/LegalPageBackLink';
import TermsOfUseDocument from '../components/TermsOfUseDocument';
import { TERMOS_VERSAO } from '../lib/legal';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso do AvantaLab Gestão.',
  alternates: { canonical: '/termos' },
  openGraph: { title: 'Termos de Uso | AvantaLab', description: 'Termos de Uso do AvantaLab Gestão.', url: '/termos' },
};

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="mb-4 flex items-start justify-between gap-4"><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority /><LegalPageBackLink /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Termos de Uso</h1>
          <p className="mt-3 text-sm text-slate-600">Versão vigente: {TERMOS_VERSAO}</p>
        </header>

        <TermsOfUseDocument />

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          Esta página apresenta os mesmos termos exibidos no aplicativo AvantaLab Gestão.
        </footer>
      </article>
    </main>
  );
}
