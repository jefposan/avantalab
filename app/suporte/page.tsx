import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Suporte | AvantaLab Gestão',
  description: 'Central de ajuda, contato e sugestões para usuários do AvantaLab Gestão.',
};

const suporteEmail = 'contato@avantalab.com.br';

const emailSubject = encodeURIComponent('Suporte AvantaLab - Atendimento');
const emailBody = encodeURIComponent(
  'Descreva seu problema ou sugestão para o suporte do AvantaLab:\n\n'
);
const emailLink = `mailto:${suporteEmail}?subject=${emailSubject}&body=${emailBody}`;

export default function SuportePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">AvantaLab Gestão</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Central de Suporte
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Estamos aqui para te ajudar com acesso, uso dos módulos e melhorias do sistema.
          </p>
        </header>

        <section className="space-y-8">
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Como podemos ajudar?</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>• Dúvidas de login (e-mail, telefone ou Google)</li>
              <li>• Problemas de sessão, saída e troca de perfil</li>
              <li>• Erros ao criar conta ou recuperar acesso</li>
              <li>• Dificuldades em módulos de finanças, vendas e recebimentos</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contato rápido</h2>
            <p className="mt-2 text-sm text-slate-600">
              E-mail de suporte: <a href={emailLink} className="font-medium text-sky-700 underline underline-offset-4">{suporteEmail}</a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">Envie sua sugestão</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use este formulário para registrar melhoria, novo recurso ou relato de erro.
            </p>
            <form
              action={emailLink}
              method="POST"
              encType="text/plain"
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="nome" className="mb-1 block text-sm font-medium text-slate-700">
                  Nome
                </label>
                <input
                  id="nome"
                  name="Nome"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <label htmlFor="celular" className="mb-1 block text-sm font-medium text-slate-700">
                  Celular ou e-mail de contato
                </label>
                <input
                  id="celular"
                  name="Contato"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="(11) 99999-0000 ou seu e-mail"
                  required
                />
              </div>
              <div>
                <label htmlFor="assunto" className="mb-1 block text-sm font-medium text-slate-700">
                  Assunto
                </label>
                <input
                  id="assunto"
                  name="Assunto"
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Ex.: erro no login, sugestão de melhoria"
                />
              </div>
              <div>
                <label htmlFor="mensagem" className="mb-1 block text-sm font-medium text-slate-700">
                  Sugestão / relatório
                </label>
                <textarea
                  id="mensagem"
                  name="Mensagem"
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Descreva o que precisa ajuda, erro encontrado ou sugestão."
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                Enviar sugestão
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Ajuda com IA no app</h2>
            <p className="mt-2 text-sm text-slate-600">
              O AvantaLab já conta com um assistente por IA no próprio sistema para sanar dúvidas
              de uso, orientar fluxos e sugerir soluções de rotina.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Depois de entrar no sistema, use o botão de IA para respostas em tempo real. Se a dúvida
              for de suporte funcional/erro, envie também um print e o passo a passo para acelerar o atendimento.
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          Em caso de urgência, envie o máximo de detalhes no e-mail de suporte para acelerar
          o atendimento (tela, fluxo, mensagem de erro e dispositivo utilizado).
        </footer>
      </article>
    </main>
  );
}
