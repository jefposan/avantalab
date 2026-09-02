import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import LegalPageBackLink from '../components/LegalPageBackLink';

export const metadata: Metadata = {
  title: 'Excluir conta do AvantaVendas',
  description: 'Instruções para excluir definitivamente uma conta e os dados do AvantaVendas.',
  alternates: { canonical: '/excluir-conta' },
  robots: { index: true, follow: true },
};

export default function ExcluirContaPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
            <LegalPageBackLink />
          </div>
          <p className="text-sm font-semibold text-cyan-700">AvantaVendas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Excluir conta</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Aqui você encontra a forma de excluir definitivamente a sua conta e os dados vinculados ao AvantaVendas.
          </p>
        </header>

        <section aria-labelledby="excluir-pelo-app" className="space-y-4">
          <h2 id="excluir-pelo-app" className="text-lg font-semibold text-slate-900">Excluir pelo aplicativo</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
            <li>Entre na sua conta no AvantaVendas.</li>
            <li>Abra <strong>Configurações</strong>.</li>
            <li>Na seção <strong>Excluir conta do Vendas</strong>, toque em <strong>Excluir conta do Vendas</strong>.</li>
            <li>Digite <strong>EXCLUIR</strong> e confirme a exclusão definitiva.</li>
          </ol>
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-950">
            A exclusão é permanente. Pedidos, pagamentos, clientes, produtos e demais dados exclusivos do AvantaVendas não poderão ser recuperados.
          </p>
        </section>

        <section aria-labelledby="servicos-preservados" className="mt-8 border-t border-slate-200 pt-7">
          <h2 id="servicos-preservados" className="text-lg font-semibold text-slate-900">O que permanece</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            A exclusão remove somente a conta e os dados do AvantaVendas. Outros serviços AvantaLab utilizados separadamente, como a Gestão, não são alterados.
          </p>
        </section>

        <section aria-labelledby="sem-acesso" className="mt-8 border-t border-slate-200 pt-7">
          <h2 id="sem-acesso" className="text-lg font-semibold text-slate-900">Sem acesso ao aplicativo?</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Envie uma solicitação para{' '}
            <a className="font-semibold text-sky-700 underline underline-offset-4" href="mailto:contato@avantalab.com.br?subject=Exclus%C3%A3o%20de%20conta%20AvantaVendas">
              contato@avantalab.com.br
            </a>{' '}
            usando o e-mail da conta. Informe no assunto: <strong>Exclusão de conta AvantaVendas</strong>.
          </p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-600">
          <Link className="font-semibold text-sky-700 underline underline-offset-4" href="https://vendas.avantalab.com.br/">
            Abrir o AvantaVendas
          </Link>
        </footer>
      </article>
    </main>
  );
}
