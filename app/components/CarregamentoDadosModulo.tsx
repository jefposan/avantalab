import type { CSSProperties } from 'react';

type Props = {
  ativo: boolean;
  titulo: string;
  mensagem: string;
  corPrimaria?: string;
};

/** Camada de dados: o shell do módulo fica visível, mas só é interativo quando pronto. */
export default function CarregamentoDadosModulo({ ativo, titulo, mensagem, corPrimaria = '#003e73' }: Props) {
  if (!ativo) return null;
  return <div className="fixed inset-0 z-[4000] grid place-items-center bg-slate-50/72 p-5 text-center backdrop-blur-[2px]" role="status" aria-live="polite" aria-label={`${titulo}. ${mensagem}`}>
    <div className="w-full max-w-[330px] rounded-[8px_18px_18px_18px] border border-slate-200/90 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(16,42,61,.12)]">
      <span className="mx-auto mb-2 block size-5 rounded-full border-2 border-slate-200 border-t-transparent motion-safe:animate-spin" style={{ borderRightColor: corPrimaria, borderBottomColor: corPrimaria } as CSSProperties} aria-hidden="true" />
      <strong className="block text-[13px] font-extrabold text-slate-800">{titulo}</strong>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{mensagem}</p>
    </div>
  </div>;
}
