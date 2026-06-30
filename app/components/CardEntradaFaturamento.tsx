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
  onFocoReceita: () => void;
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
  onFocoReceita,
}: CardEntradaFaturamentoProps) {
  const inputBase = `h-9 w-full rounded-md border px-2.5 text-xs font-semibold shadow-sm outline-none transition focus:ring-1 ${
    darkMode
      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
      : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400'
  }`;

  return (
    <div
      className="h-full w-full min-w-0 max-w-full overflow-hidden rounded-[18px] border border-t-[4px] bg-white p-3 text-slate-900 sm:p-4"
      style={{
        borderColor: '#E2E8F0',
        borderTopColor: '#1F8A9E',
        boxShadow: '0 10px 25px rgba(10, 31, 68, 0.08)',
      }}
    >
      <div className="mb-3 grid h-8 grid-cols-[minmax(68px,78px)_minmax(0,1fr)_minmax(68px,78px)] items-center gap-2 rounded-md bg-white px-2 shadow-sm [container-type:inline-size]">
        <button
          type="button"
          onClick={() =>
            setOrdemEntradasFaturamento((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className="flex h-6 w-full items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 text-[10px] font-black uppercase text-[#1F8A9E] shadow-sm ring-1 ring-slate-200/70 transition-all hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-95 cursor-pointer"
          title={
            ordemEntradasFaturamento === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Ordenar</span>
          <span className="text-xs font-black" style={{ color: '#2EAD68' }}>
            {ordemEntradasFaturamento === 'desc' ? '↓' : '↑'}
          </span>
        </button>

        <h3
          className="min-w-0 truncate text-center font-black uppercase leading-none"
          style={{ color: '#1F8A9E', fontSize: 'clamp(0.5rem, 3.8cqw, 0.875rem)' }}
        >
          Lançamento de receita
        </h3>
        <div aria-hidden="true" className="h-6 w-full" />
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
            onFocus={onFocoReceita}
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
            onFocus={onFocoReceita}
            onChange={(e) => setEntradaFaturamentoOrigem(e.target.value)}
            placeholder="Origem"
            className={inputBase}
            style={{ outlineColor: corPrimaria }}
          />

          <div className="relative">
            <input
              type="text"
              value={entradaFaturamentoValor}
              onFocus={onFocoReceita}
              onChange={handleEntradaFaturamentoValorChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarEntradaFaturamento();
                }
              }}
              placeholder="0,00"
              className={`${inputBase} text-right font-bold`}
              style={{ outlineColor: corPrimaria }}
            />
          </div>

          <button
            type="button"
            onClick={() => adicionarEntradaFaturamento()}
            disabled={entradaFaturamentoSalvando}
            className="h-9 rounded-md px-1 text-[11px] font-black uppercase text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: '#1F8A9E' }}
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
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={buscaEntradaFaturamento}
            onChange={(e) => setBuscaEntradaFaturamento(e.target.value)}
            onFocus={onFocoReceita}
            placeholder="Buscar receita por origem, dia ou valor..."
            className={`h-9 w-full rounded-lg border py-2 pl-9 pr-9 text-xs font-semibold outline-none transition focus:ring-1 focus:ring-inset ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
            }`}
            style={{
              borderColor: buscaEntradaFaturamento ? corPrimaria : undefined,
              boxShadow: buscaEntradaFaturamento ? `inset 0 0 0 1px ${corPrimaria}33` : undefined,
            }}
          />

          {buscaEntradaFaturamento && (
            <button
              type="button"
              onClick={() => setBuscaEntradaFaturamento('')}
              className={`absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black shadow-sm transition cursor-pointer ${
                darkMode
                  ? 'bg-slate-600 text-white hover:bg-slate-500'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
              }`}
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {buscaEntradaFaturamento.trim() && (
          <div className="px-1.5 pt-2 text-xs font-bold text-slate-500">
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
