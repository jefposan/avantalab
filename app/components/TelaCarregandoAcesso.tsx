'use client';

import LoadingPontos from './LoadingPontos';

/* eslint-disable @next/next/no-img-element -- a cena usa picture/source para escolher a arte por breakpoint. */

type TelaCarregandoAcessoProps = {
  mensagem: string;
  titulo?: string;
  nivelTitulo?: 'h1' | 'h2';
  onCancelar?: () => void;
  preparandoAcesso?: boolean;
  erro?: string;
  onTentarNovamente?: () => void;
  onEntrarNovamente?: () => void;
};

export function FundoAcessoResponsivo() {
  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source media="(max-width: 1023px)" srcSet="/images/bg-avantalab-mobile-1080x1920-sem-logo.webp" type="image/webp" />
      <source media="(max-width: 1023px)" srcSet="/images/bg-avantalab-mobile-1080x1920-sem-logo.png" type="image/png" />
      <source srcSet="/images/bg-avantalab-sem-logo.webp" type="image/webp" />
      <img
        src="/images/bg-avantalab-sem-logo.png"
        alt=""
        className="h-full w-full object-cover object-bottom lg:object-center"
      />
    </picture>
  );
}

export default function TelaCarregandoAcesso({
  mensagem,
  titulo = 'Carregando...',
  nivelTitulo = 'h1',
  preparandoAcesso = false,
  erro,
  onTentarNovamente,
  onEntrarNovamente,
}: TelaCarregandoAcessoProps) {
  const Titulo = nivelTitulo;

  return (
    <main
      className="avanta-access-scene relative overflow-hidden font-sans"
      data-avantalab-acesso-carregando="1"
    >
      <FundoAcessoResponsivo />

      <img
        src="/images/avantalab-positivo-com-slogan-20261110.webp"
        alt="AvantaLab — Do zero ao operacional"
        className="avanta-access-brand pointer-events-none relative z-10"
      />

      <div className="absolute inset-0 bg-transparent" />

      <section className="avanta-loading-stage relative z-10">
        <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl" role={erro ? 'alert' : 'status'} aria-busy={!erro}>
          <div className="mx-auto flex min-h-14 items-center justify-center">
            {erro ? <span className="text-xl font-bold text-amber-700" aria-hidden="true">!</span> : <LoadingPontos />}
          </div>

          <Titulo className="text-xl font-black text-slate-900">{erro ? 'Não foi possível preparar o acesso' : preparandoAcesso ? 'Preparando acesso' : titulo}</Titulo>

          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            {erro || (preparandoAcesso ? 'Aguarde um instante.' : mensagem)}
          </p>

          {erro && onTentarNovamente ? (
            <button type="button" onClick={onTentarNovamente} autoFocus className="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl px-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#1687D9] focus-visible:ring-offset-2">
              <span className="flex min-h-8 w-full items-center justify-center rounded-[10px] bg-[#1687D9] px-3 text-white shadow-sm">Tentar novamente</span>
            </button>
          ) : null}
          {erro && onEntrarNovamente ? <button type="button" onClick={onEntrarNovamente} className="min-h-11 w-full rounded-xl px-3 text-sm font-semibold text-slate-700 underline outline-none focus-visible:ring-2 focus-visible:ring-[#1687D9]">Entrar novamente</button> : null}
        </div>
      </section>
    </main>
  );
}
