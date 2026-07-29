import type { Metadata } from 'next';
import Image from 'next/image';
import LegalPageBackLink from '../components/LegalPageBackLink';

export const metadata: Metadata = {
  title: 'Política de Cookies | AvantaLab Gestão',
  description: 'Informações sobre cookies e tecnologias semelhantes utilizadas pelo AvantaLab.',
};

const secoes = [
  ['1. O que são cookies', 'Cookies e tecnologias semelhantes podem guardar ou acessar pequenas informações no navegador ou dispositivo. Eles ajudam a manter segurança, sessão, preferências e, quando habilitados, a entender a navegação de forma agregada.'],
  ['2. Uso atual nas páginas públicas', 'As páginas públicas do AvantaLab não carregam, nesta versão, ferramentas de publicidade, remarketing, pixels de campanhas ou analytics de terceiros. Por isso, não há cookies não essenciais para aceitar ou recusar nesta página.'],
  ['3. Cookies estritamente necessários', 'Ao acessar recursos autenticados do AvantaLab Gestão, podem ser utilizados cookies, armazenamento local ou tecnologias equivalentes indispensáveis para autenticação, segurança, prevenção a fraudes, continuidade da sessão e funcionamento solicitado pelo usuário. Esses recursos não são usados para publicidade comportamental.'],
  ['4. Futuras categorias não essenciais', 'Se o AvantaLab incluir métricas, experimentos, chat de terceiros, publicidade ou remarketing, essas tecnologias serão classificadas por finalidade e só serão ativadas após uma escolha clara do visitante, quando o consentimento for aplicável. A escolha poderá ser revista a qualquer momento.'],
  ['5. Transparência e contato', 'Quando houver tecnologias não essenciais, esta política informará nome, fornecedor, finalidade, duração, categoria e eventual compartilhamento. Dúvidas sobre privacidade, cookies ou direitos do titular podem ser enviadas para contato@avantalab.com.br.'],
] as const;

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <div className="mb-4 flex items-start justify-between gap-4"><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} priority /><LegalPageBackLink /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Política de Cookies</h1>
          <p className="mt-3 text-sm text-slate-600">Última atualização: 28 de julho de 2026.</p>
        </header>

        <div className="space-y-6 text-sm leading-relaxed">
          {secoes.map(([titulo, texto]) => <section key={titulo}><h2 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-800">{titulo}</h2><p className="text-slate-600">{texto}</p></section>)}
        </div>
      </article>
    </main>
  );
}
