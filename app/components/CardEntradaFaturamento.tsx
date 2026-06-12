'use client';

import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import TabelaEntradasFaturamento, {
  type EntradaFaturamento,
} from './TabelaEntradasFaturamento';

type CardEntradaFaturamentoProps = {
  mesAtivo: string | null;
  anoSelecionado: string;
  entradaFaturamentoDia: string;
  setEntradaFaturamentoDia: (valor: string) => void;
  entradaFaturamentoOrigem: string;
  setEntradaFaturamentoOrigem: (valor: string) => void;
  entradaFaturamentoValor: string;
  handleEntradaFaturamentoValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  adicionarEntradaFaturamento: () => void | Promise<void>;
  entradaFaturamentoSalvando: boolean;
  totalEntradasFaturamentoDoMes: number;
  ordemEntradasFaturamento: 'desc' | 'asc';
  setOrdemEntradasFaturamento: Dispatch<SetStateAction<'desc' | 'asc'>>;
  buscaEntradaFaturamento: string;
  setBuscaEntradaFaturamento: (valor: string) => void;
  getMaxDias: (mes: string, ano: string) => number;
  formatarMoeda: (valor: number) => string;
  corPrimaria: string;
  darkMode: boolean;
  bgCard: string;
  textStrong: string;
  textMuted: string;
  entradas: EntradaFaturamento[];
  podeEditarEntradas: boolean;
  entradaEditandoId: string | null;
  editEntradaDia: string;
  setEditEntradaDia: (valor: string) => void;
  editEntradaOrigem: string;
  setEditEntradaOrigem: (valor: string) => void;
  editEntradaValor: string;
  handleEditEntradaValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onIniciarEdicaoEntrada: (entrada: EntradaFaturamento) => void;
  onSalvarEdicaoEntrada: () => void | Promise<void>;
  onCancelarEdicaoEntrada: () => void;
  onExcluirEntrada: (entrada: EntradaFaturamento) => void | Promise<void>;
};

export default function CardEntradaFaturamento({
  mesAtivo,
  anoSelecionado,
  entradaFaturamentoDia,
  setEntradaFaturamentoDia,
  entradaFaturamentoOrigem,
  setEntradaFaturamentoOrigem,
  entradaFaturamentoValor,
  handleEntradaFaturamentoValorChange,
  adicionarEntradaFaturamento,
  entradaFaturamentoSalvando,
  ordemEntradasFaturamento,
  setOrdemEntradasFaturamento,
  buscaEntradaFaturamento,
  setBuscaEntradaFaturamento,
  getMaxDias,
  corPrimaria,
  darkMode,
  bgCard,
  textStrong,
  textMuted,
  entradas,
  podeEditarEntradas,
  entradaEditandoId,
  editEntradaDia,
  setEditEntradaDia,
  editEntradaOrigem,
  setEditEntradaOrigem,
  editEntradaValor,
  handleEditEntradaValorChange,
  onIniciarEdicaoEntrada,
  onSalvarEdicaoEntrada,
  onCancelarEdicaoEntrada,
  onExcluirEntrada,
}: CardEntradaFaturamentoProps) {
  const inputBase = `h-9 w-full rounded-md border px-2.5 text-xs font-semibold shadow-sm outline-none transition focus:ring-1 ${
    darkMode
      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
      : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400'
  }`;

  return (
    <div
      className={`${bgCard} h-full min-w-0 rounded-xl shadow-lg border-x border-b border-t-[4px] p-4`}
      style={{ borderTopColor: corPrimaria }}
    >
      <div className="relative mb-3 flex h-8 items-center justify-center border-b border-slate-200/10 pb-2">
        <button
          type="button"
          onClick={() =>
            setOrdemEntradasFaturamento((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className={`absolute left-0 flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-bold uppercase tracking-wide border shadow-sm transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
            darkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={
            ordemEntradasFaturamento === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Mudar ordem</span>
          <span className="text-xs font-black">
            {ordemEntradasFaturamento === 'desc' ? '↓' : '↑'}
          </span>
        </button>

        <h3 className={`text-sm font-black uppercase tracking-widest ${textStrong}`}>
          Lançamento de faturamento
        </h3>
      </div>

      <div
        className={`mb-3 rounded-lg border p-2.5 ${
          darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-[44px_minmax(162px,1fr)_92px_42px]">
          <input
            type="number"
            min="1"
            max={mesAtivo ? getMaxDias(mesAtivo, anoSelecionado) : 31}
            value={entradaFaturamentoDia}
            onChange={(e) => {
              const valor = parseInt(e.target.value, 10);
              const maxDias = mesAtivo ? getMaxDias(mesAtivo, anoSelecionado) : 31;

              if (valor > maxDias) {
                setEntradaFaturamentoDia(String(maxDias));
              } else {
                setEntradaFaturamentoDia(e.target.value);
              }
            }}
            placeholder="Dia"
            className={`${inputBase} input-dia-compacto h-9 px-1.5 py-0 text-center font-bold leading-none`}
            style={{ outlineColor: corPrimaria }}
          />

          <input
            type="text"
            value={entradaFaturamentoOrigem}
            onChange={(e) => setEntradaFaturamentoOrigem(e.target.value)}
            placeholder="Origem"
            className={inputBase}
            style={{ outlineColor: corPrimaria }}
          />

          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              R$
            </span>

            <input
              type="text"
              value={entradaFaturamentoValor}
              onChange={handleEntradaFaturamentoValorChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarEntradaFaturamento();
                }
              }}
              placeholder="0,00"
              className={`${inputBase} pl-8 text-right font-bold`}
              style={{ outlineColor: corPrimaria }}
            />
          </div>

          <button
            type="button"
            onClick={adicionarEntradaFaturamento}
            disabled={entradaFaturamentoSalvando}
            className="h-9 rounded-md px-1 text-[11px] font-black uppercase text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: corPrimaria }}
          >
            {entradaFaturamentoSalvando ? '...' : 'OK'}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="relative">
          <svg
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.3"
              d="M21 21l-4.35-4.35M10.8 18a7.2 7.2 0 100-14.4 7.2 7.2 0 000 14.4z"
            />
          </svg>

          <input
            type="text"
            value={buscaEntradaFaturamento}
            onChange={(e) => setBuscaEntradaFaturamento(e.target.value)}
            placeholder="Buscar faturamento por origem, dia ou valor..."
            className={`h-9 w-full rounded-lg border py-2 pl-9 pr-9 text-xs font-semibold outline-none transition focus:ring-2 ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
            }`}
            style={{
              borderColor: buscaEntradaFaturamento ? corPrimaria : undefined,
              boxShadow: buscaEntradaFaturamento ? `0 0 0 2px ${corPrimaria}22` : undefined,
            }}
          />

          {buscaEntradaFaturamento && (
            <button
              type="button"
              onClick={() => setBuscaEntradaFaturamento('')}
              className={`absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-xs font-black transition cursor-pointer ${
                darkMode
                  ? 'text-slate-300 hover:bg-slate-600 hover:text-white'
                  : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
              }`}
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {buscaEntradaFaturamento.trim() && (
          <div className={`px-1.5 pt-2 text-xs font-bold ${
            entradas.length > 0
              ? darkMode ? 'text-emerald-300' : 'text-emerald-700'
              : darkMode ? 'text-red-300' : 'text-red-600'
          }`}>
            {entradas.length > 0
              ? `${entradas.length} entrada(s) localizada(s).`
              : 'Nenhuma entrada localizada com esse argumento.'}
          </div>
        )}
      </div>

      <TabelaEntradasFaturamento
        entradas={entradas}
        podeEditarEntradas={podeEditarEntradas}
        entradaEditandoId={entradaEditandoId}
        editEntradaDia={editEntradaDia}
        setEditEntradaDia={setEditEntradaDia}
        editEntradaOrigem={editEntradaOrigem}
        setEditEntradaOrigem={setEditEntradaOrigem}
        editEntradaValor={editEntradaValor}
        handleEditEntradaValorChange={handleEditEntradaValorChange}
        onIniciarEdicaoEntrada={onIniciarEdicaoEntrada}
        onSalvarEdicaoEntrada={onSalvarEdicaoEntrada}
        onCancelarEdicaoEntrada={onCancelarEdicaoEntrada}
        onExcluirEntrada={onExcluirEntrada}
      />
    </div>
  );
}
