'use client';

type BotaoVisibilidadeSenhaProps = {
  visivel: boolean;
  onToggle: () => void;
  className?: string;
};

export default function BotaoVisibilidadeSenha({
  visivel,
  onToggle,
  className = '',
}: BotaoVisibilidadeSenhaProps) {
  const rotulo = visivel ? 'Ocultar senha' : 'Exibir senha';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={rotulo}
      aria-pressed={visivel}
      title={rotulo}
      className={className}
    >
      {visivel ? (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 3 18 18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7a12.7 12.7 0 0 1-3 4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.6 6.6A12.5 12.5 0 0 0 2 12c1 3 5 7 10 7a10.9 10.9 0 0 0 4.4-.9" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}
