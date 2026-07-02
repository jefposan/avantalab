import { useState } from 'react';
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
  editarDespesaBase: (nomeAtual: string) => Promise<boolean>;
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
  editarDespesaBase,
  apagarDespesaBase,
}: ModalDespesasBaseProps) {
  const [nomeEmEdicao, setNomeEmEdicao] = useState<string | null>(null);

  if (!aberto) return null;

  const fecharTudo = () => {
    aoFechar();
    setAjudaCategoriasAberta(false);
    setNomeEmEdicao(null);
  };

  const iniciarEdicao = (despesa: DespesaCadastrada) => {
    setNomeEmEdicao(despesa.nome);
    setNovaBaseNome(despesa.nome);
    setNovaBaseCat(despesa.categoria);
  };

  const cancelarEdicao = () => {
    setNomeEmEdicao(null);
    setNovaBaseNome('');
    setNovaBaseCat('');
  };

  const salvar = async () => {
    if (!nomeEmEdicao) {
      adicionarDespesaBase();
      return;
    }
    if (await editarDespesaBase(nomeEmEdicao)) cancelarEdicao();
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
    {nomeEmEdicao ? 'Editar despesa' : 'Nova despesa'}
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
                onClick={salvar}
                style={estiloTemaPrimario}
                className="w-full rounded-lg px-4 py-2 text-sm font-bold shadow hover:brightness-110 sm:w-auto cursor-pointer"
              >
                {nomeEmEdicao ? 'Salvar alterações' : 'Salvar'}
              </button>
              {nomeEmEdicao && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold sm:w-auto cursor-pointer"
                >
                  Cancelar
                </button>
              )}
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

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => iniciarEdicao(d)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-cyan-600 transition-colors hover:bg-cyan-500/10 cursor-pointer"
          aria-label={`Editar ${d.nome}`}
          title="Editar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l2.651 2.651M18.75 2.999a1.875 1.875 0 012.651 2.652L8.25 18.802 3 20.25l1.448-5.25L18.75 2.999z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => apagarDespesaBase(d.nome)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-black leading-none text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-700 cursor-pointer"
          aria-label={`Excluir ${d.nome}`}
          title="Excluir"
        >
          ×
        </button>
      </div>
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
