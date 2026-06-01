type ModalConfirmacaoProps = {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  carregando?: boolean;
  aoCancelar: () => void;
  aoConfirmar: () => void;
};

export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoCancelar = "Cancelar",
  textoConfirmar = "Excluir",
  carregando = false,
  aoCancelar,
  aoConfirmar,
}: ModalConfirmacaoProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          {titulo}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-line">
          {mensagem}
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={aoCancelar}
            disabled={carregando}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-60"
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            onClick={aoConfirmar}
            disabled={carregando}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-60"
          >
            {carregando ? "Excluindo..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}