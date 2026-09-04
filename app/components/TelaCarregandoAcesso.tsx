'use client';

/* eslint-disable @next/next/no-img-element -- a cena usa picture/source para escolher a arte por breakpoint. */

type TelaCarregandoAcessoProps = {
  mensagem: string;
  titulo?: string;
  nivelTitulo?: 'h1' | 'h2';
  onCancelar?: () => void;
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
  onCancelar,
}: TelaCarregandoAcessoProps) {
  const Titulo = nivelTitulo;

  return (
    <main
      className="avanta-access-scene relative overflow-hidden font-sans"
      data-avantalab-acesso-carregando="1"
    >
      <FundoAcessoResponsivo />

      <img
        src="/images/logo-avantalab-oficial.png"
        alt="AvantaLab — Do zero ao operacional"
        className="avanta-access-brand pointer-events-none relative z-10"
      />

      <div className="absolute inset-0 bg-transparent" />

      <section className="avanta-loading-stage relative z-10">
        <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl">
          <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
            <span className="avanta-loading-spinner animate-spin" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <Titulo className="text-xl font-black text-slate-900">{titulo}</Titulo>

          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            {mensagem}
          </p>

          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              className="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl px-1 text-xs font-bold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#1687D9] focus-visible:ring-offset-2"
            >
              <span className="flex h-8 w-full items-center justify-center rounded-[10px] border border-slate-300 bg-white/90 px-3 shadow-sm">
                Cancelar e voltar ao login
              </span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
