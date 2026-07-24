import DraggableModalCard from './DraggableModalCard';

type ModalConfirmacaoProps = {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  carregando?: boolean;
  corPrimaria?: string;
  textoSobreCorPrimaria?: string;
  aoCancelar: () => void;
  aoConfirmar: () => void;
};

export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoCancelar = "Cancelar",
  textoConfirmar = "Confirmar",
  carregando = false,
  corPrimaria = '#003E73',
  textoSobreCorPrimaria = '#ffffff',
  aoCancelar,
  aoConfirmar,
}: ModalConfirmacaoProps) {
  if (!aberto) return null;

  return (
    <div
      className="av-modal-backdrop fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 px-4"
      onClick={() => {
        if (!carregando) aoCancelar();
      }}
    >
      <DraggableModalCard
        className="av-modal-panel w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="px-5 py-4" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <h2 className="text-xl font-black">{titulo}</h2>
        </div>

        <div className="p-5">
          <p className="text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
            {mensagem}
          </p>

          <div className="flex justify-end gap-3">
          <button
  type="button"
  onClick={aoCancelar}
  disabled={carregando}
  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
>
  {textoCancelar}
</button>

          <button
  type="button"
  onClick={aoConfirmar}
  disabled={carregando}
  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
>
  {carregando ? "Aguarde..." : textoConfirmar}
</button>
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}
