import type { CategoriaPerfil } from '../lib/perfis';
import DraggableModalCard from './DraggableModalCard';

type ModalInstrucoesProps = {
  aberto: boolean;
  aoFechar: () => void;
  bgCard: string;
  textMuted: string;
  textStrong: string;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  corEhClara: (hex: string) => boolean;
  categoriasPerfil: CategoriaPerfil[];
  tipoPerfil?: string;
};

export default function ModalInstrucoes({
  aberto,
  aoFechar,
  bgCard,
  textMuted,
  textStrong,
  corPrimaria,
  textoSobreCorPrimaria,
  corEhClara,
  categoriasPerfil,
  tipoPerfil,
}: ModalInstrucoesProps) {
  if (!aberto) return null;

  const estiloTemaPrimario = {
    backgroundColor: corPrimaria,
    borderColor: corPrimaria,
    color: textoSobreCorPrimaria,
  };

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={aoFechar}
    >
      <DraggableModalCard
        className={`${bgCard} flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-2xl flex-col overflow-y-auto rounded-2xl border-2 shadow-2xl sm:max-h-[90vh]`}
        style={{ borderColor: corPrimaria }}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle
          className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-slate-200/20 px-4 py-3 shadow-md sm:px-5"
          style={estiloTemaPrimario}
        >
          <h2 className="min-w-0 break-words text-sm font-bold uppercase sm:text-base">
            Instruções sobre Categorias
          </h2>

          <button
            type="button"
            onClick={aoFechar}
            className="shrink-0 cursor-pointer rounded-lg px-3 py-1 text-sm font-bold transition-colors"
            style={{
              color: textoSobreCorPrimaria,
              backgroundColor: corEhClara(corPrimaria)
                ? 'rgba(15, 23, 42, 0.08)'
                : 'rgba(255, 255, 255, 0.16)',
            }}
          >
            X
          </button>
        </div>

        <div className={`space-y-3 overflow-y-auto p-4 text-xs ${textMuted} leading-snug sm:p-5`}>
          {categoriasPerfil.map((categoria) => (
            <div key={categoria.nome}>
              <strong className={textStrong}>{categoria.nome.toUpperCase()}:</strong>
              <br />
              - {categoria.descricao}
              <br />
              - Exemplos: {categoria.exemplos}
            </div>
          ))}

          {tipoPerfil !== 'pessoal' && (
            <div className="px-3 py-2 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-lg text-[11px] leading-snug text-yellow-700 dark:text-yellow-400 mt-3">
              <strong>Observações:</strong> Se tiver dúvida sobre onde classificar algum gasto,
              consulte o contador. Estes são exemplos gerais para facilitar a organização.
            </div>
          )}
        </div>
      </DraggableModalCard>
    </div>
  );
}
