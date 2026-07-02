import type { CategoriaPerfil } from '../lib/perfis';
import DraggableModalCard from './DraggableModalCard';

type DespesaCadastrada = {
  nome: string;
  categoria: string;
};

type ModalDespesasBaseProps = {
  aberto: boolean;
  aoFechar: () => void;

  bgCard: string;
  textMuted: string;
  textStrong: string;
  darkMode: boolean;

  corPrimaria: string;
  textoSobreCorPrimaria: string;
  estiloTemaPrimario: React.CSSProperties;
  corEhClara: (hex: string) => boolean;

  ajudaCategoriasAberta: boolean;
  setAjudaCategoriasAberta: (valor: boolean) => void;

  novaBaseNome: string;
  setNovaBaseNome: (valor: string) => void;

  novaBaseCat: string;
  setNovaBaseCat: (valor: string) => void;

  despesasCadastradas: DespesaCadastrada[];
  categoriasPerfil: CategoriaPerfil[];

  adicionarDespesaBase: () => void;
  apagarDespesaBase: (nome: string) => void;
};

export default function ModalDespesasBase({
  aberto,
  aoFechar,

  bgCard,
  textMuted,
  textStrong,
  darkMode,

  corPrimaria,
  textoSobreCorPrimaria,
  estiloTemaPrimario,
  corEhClara,

  ajudaCategoriasAberta,
  setAjudaCategoriasAberta,

  novaBaseNome,
  setNovaBaseNome,

  novaBaseCat,
  setNovaBaseCat,

  despesasCadastradas,
  categoriasPerfil,

  adicionarDespesaBase,
  apagarDespesaBase,
}: ModalDespesasBaseProps) {
  if (!aberto) return null;

  const fecharTudo = () => {
    aoFechar();
    setAjudaCategoriasAberta(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4"
      onClick={fecharTudo}
    >
      <DraggableModalCard
        className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 overflow-hidden`}
        style={{ borderColor: corPrimaria }}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle
          className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center z-10"
          style={estiloTemaPrimario}
        >
          <div className="flex w-full items-center justify-between gap-4">
            <h2 className="text-lg font-bold uppercase">
              Gerenciar Despesas
            </h2>

            <div className="flex items-center gap-6 pr-4">
              <button
                type="button"
                onClick={() => setAjudaCategoriasAberta(!ajudaCategoriasAberta)}
                className="group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
                style={{
                  borderColor: textoSobreCorPrimaria,
                  color: textoSobreCorPrimaria,
                  backgroundColor: ajudaCategoriasAberta
                    ? corEhClara(corPrimaria)
                      ? 'rgba(15, 23, 42, 0.14)'
                      : 'rgba(255, 255, 255, 0.22)'
                    : corEhClara(corPrimaria)
                      ? 'rgba(15, 23, 42, 0.08)'
                      : 'rgba(255, 255, 255, 0.14)',
                }}
                title="Entenda as categorias"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black"
                  style={{
                    border: `1px solid ${textoSobreCorPrimaria}`,
                    color: textoSobreCorPrimaria,
                  }}
                >
                  ?
                </span>

                <span>Entenda as categorias</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={fecharTudo}
            className="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer"
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

        <div className="p-4 space-y-4 overflow-y-auto">
          <div
  className={`p-3 rounded-xl border shadow-sm ${
    darkMode
      ? 'bg-slate-800 border-slate-700'
      : 'bg-slate-50 border-slate-200'
  }`}
>
  <h3 className={`text-sm font-bold mb-2 ${textStrong}`}>
    Nova Despesa
  </h3>

  <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Nome (Ex: Aluguel)"
                value={novaBaseNome}
                onChange={(e) => setNovaBaseNome(e.target.value)}
                className={`w-full min-w-0 flex-1 p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 sm:min-w-[200px] ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300'
                }`}
                style={{ outlineColor: corPrimaria }}
              />

              <select
                value={novaBaseCat}
                onChange={(e) => setNovaBaseCat(e.target.value)}
                className={`w-full min-w-0 flex-1 p-2 rounded-lg border text-sm focus:outline-none focus:ring-2 sm:min-w-[200px] ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300'
                }`}
                style={{ outlineColor: corPrimaria }}
              >
                <option value="">Categoria (Obrigatória)</option>
                {categoriasPerfil.map((categoria) => (
                  <option key={categoria.nome} value={categoria.nome}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={adicionarDespesaBase}
                style={estiloTemaPrimario}
                className="w-full rounded-lg px-4 py-2 text-sm font-bold shadow hover:brightness-110 sm:w-auto cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="space-y-1 pr-2">
  {despesasCadastradas.map((d) => (
    <div
      key={d.nome}
      className={`flex min-w-0 flex-col gap-2 rounded-md border border-slate-200/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-1 ${
        darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`truncate text-xs font-bold leading-tight ${textStrong}`}>
          {d.nome}
        </span>

        <span
          className={`max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight bg-slate-500/20 ${textMuted}`}
        >
          {d.categoria}
        </span>
      </div>

      <button
        type="button"
        onClick={() => apagarDespesaBase(d.nome)}
        className="shrink-0 rounded-md px-2 py-0.5 text-sm font-black leading-none text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-700 cursor-pointer"
      >
        ×
      </button>
    </div>
  ))}
</div>
        </div>
      </DraggableModalCard>

      {ajudaCategoriasAberta && (
        <div
          className="ml-4 hidden lg:block w-80 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-900">
              Entenda as categorias
            </h3>

            <button
              type="button"
              onClick={() => setAjudaCategoriasAberta(false)}
              className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              X
            </button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            {categoriasPerfil.map((categoria) => (
              <div key={categoria.nome}>
                <strong>{categoria.nome}:</strong> {categoria.descricao}
                <br />
                <span className="text-slate-500">{categoria.exemplos}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
