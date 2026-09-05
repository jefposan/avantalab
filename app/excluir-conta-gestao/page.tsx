import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import LegalPageBackLink from '../components/LegalPageBackLink';

export const metadata: Metadata = {
  title: 'Excluir conta da Gestão | AvantaLab',
  description: 'Como solicitar a exclusão definitiva da conta e dos dados da Gestão AvantaLab.',
  alternates: { canonical: '/excluir-conta-gestao' },
  robots: { index: true, follow: true },
};

export default function ExcluirContaGestaoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority />
            <LegalPageBackLink />
          </div>
          <p className="text-sm font-semibold text-cyan-700">AvantaLab Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Excluir conta</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Use esta página para solicitar a exclusão definitiva da sua conta e dos dados da Gestão AvantaLab.
          </p>
        </header>

        <section aria-labelledby="excluir-perfil" className="space-y-4">
          <h2 id="excluir-perfil" className="text-lg font-semibold text-slate-900">Excluir somente um perfil</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            No aplicativo, acesse <strong>Menu → Configurações → Excluir este perfil</strong>. Essa opção não exclui o seu login: ela remove somente o perfil selecionado e mantém seus dados guardados por 30 dias para restauração.
          </p>
        </section>

        <section aria-labelledby="excluir-dados" className="mt-8 border-t border-slate-200 pt-7">
          <h2 id="excluir-dados" className="text-lg font-semibold text-slate-900">Excluir dados sem encerrar a conta</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Para solicitar a exclusão de dados específicos e manter o acesso à conta, envie o pedido usando o e-mail vinculado à conta e informe qual perfil ou quais dados deseja remover. Nossa equipe confirmará sua identidade e o escopo antes de executar a remoção.
          </p>
          <a
            className="mt-4 inline-flex rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-semibold text-sky-800 shadow-sm transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            href="mailto:contato@avantalab.com.br?subject=Exclus%C3%A3o%20de%20dados%20AvantaLab%20Gest%C3%A3o"
          >
            Solicitar exclusão de dados
          </a>
          <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950">
            Podemos excluir, conforme o pedido confirmado, dados de um perfil, lançamentos, documentos e configurações associados. O perfil removido pode permanecer disponível para restauração por até 30 dias. Dados sujeitos a obrigação legal serão mantidos somente pelo prazo aplicável.
          </p>
        </section>

        <section aria-labelledby="excluir-conta" className="mt-8 border-t border-slate-200 pt-7">
          <h2 id="excluir-conta" className="text-lg font-semibold text-slate-900">Excluir a conta definitivamente</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Para iniciar a exclusão definitiva, envie a solicitação usando o e-mail vinculado à conta. Nossa equipe confirmará sua identidade e o escopo antes de executar a remoção.
          </p>
          <a
            className="mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            href="mailto:contato@avantalab.com.br?subject=Exclus%C3%A3o%20definitiva%20de%20conta%20AvantaLab%20Gest%C3%A3o"
          >
            Solicitar exclusão definitiva
          </a>
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-950">
            A solicitação pode excluir o acesso à Gestão e os dados associados, como perfis, lançamentos, documentos e configurações. Dados que precisem ser mantidos por obrigação legal serão retidos somente pelo prazo aplicável. A exclusão da Gestão não remove dados do AvantaVendas, que possui processo próprio.
          </p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-sm leading-relaxed text-slate-600">
          <Link className="font-semibold text-sky-700 underline underline-offset-4" href="/mobile?entrar=1">
            Abrir a Gestão Mobile
          </Link>
        </footer>
      </article>
    </main>
  );
}
