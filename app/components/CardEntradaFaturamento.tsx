'use client';

import { useRef, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
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
  faturamentoDoMes: number;
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
  ativo?: boolean;
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
  faturamentoDoMes,
  totalEntradasFaturamentoDoMes,
  ordemEntradasFaturamento,
  setOrdemEntradasFaturamento,
  buscaEntradaFaturamento,
  setBuscaEntradaFaturamento,
  getMaxDias,
  formatarMoeda,
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
  ativo = false,
}: CardEntradaFaturamentoProps) {
  const origemRef = useRef<HTMLInputElement>(null);
  const inputBase = `h-9 w-full rounded-md border px-2.5 text-xs font-semibold shadow-sm outline-none transition focus:ring-1 ${
    darkMode
      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
      : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400'
  }`;
  const totalMensalBase = Math.max(
    0,
    Number(faturamentoDoMes || 0) - Number(totalEntradasFaturamentoDoMes || 0)
  );
  const normalizarBusca = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const totalMensalNaoRepresentado = totalMensalBase > 0.009;
  const termoBusca = normalizarBusca(buscaEntradaFaturamento);
  const textoBuscaTotalMensal = normalizarBusca(
    [
      'Total do mes',
      'Total mensal',
      'Receita total',
      formatarMoeda(totalMensalBase),
      String(totalMensalBase.toFixed(2)).replace('.', ','),
    ].join(' ')
  );
  const mostrarTotalMensal =
    totalMensalNaoRepresentado &&
    (!termoBusca || textoBuscaTotalMensal.includes(termoBusca));
  const entradasVisiveis = mostrarTotalMensal
    ? [
        {
          id: `__total_mensal__-${mesAtivo || 'mes'}`,
          mes: mesAtivo || undefined,
          dia: null,
          origem: 'Total do mês',
          valor: totalMensalBase,
          status: 'total_mensal',
          tipo: 'total_mensal',
          totalMensal: true,
        },
        ...entradas,
      ]
    : entradas;

  return (
    <div
      className="relative h-full w-full min-w-0 max-w-full overflow-hidden bg-white p-3 text-slate-900 transition-all duration-300 sm:p-4"
      style={{
        borderRadius: '8px 22px 22px 22px',
        boxShadow: ativo
          ? '0 20px 44px -14px rgba(46, 173, 104, 0.55), 0 0 0 2px rgba(31, 158, 180, 0.35)'
          : '0 8px 20px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        filter: ativo ? 'none' : 'saturate(0.85)',
      }}
    >
      <div
        className="mb-3 grid grid-cols-[minmax(68px,84px)_minmax(0,1fr)_minmax(68px,84px)] items-center gap-2 px-3 py-2.5 transition-all duration-300 [container-type:inline-size]"
        style={{
          borderRadius: '6px 16px 16px 16px',
          background: ativo
            ? 'linear-gradient(120deg, #1F9EB4 0%, #24A98A 55%, #2EAD68 100%)'
            : 'linear-gradient(120deg, #64748B 0%, #94A3B8 100%)',
          boxShadow: ativo ? 'inset 0 -1px 0 rgba(255,255,255,0.25)' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() =>
            setOrdemEntradasFaturamento((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className="flex h-6 w-full items-center justify-center gap-1 rounded-full border border-white/40 bg-white/20 px-1.5 text-[10px] font-black uppercase text-white shadow-sm backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-white/30 active:scale-95 cursor-pointer"
          title={
            ordemEntradasFaturamento === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Ordenar</span>
          <span className="text-xs font-black">
            {ordemEntradasFaturamento === 'desc' ? '↓' : '↑'}
          </span>
        </button>

        <h3
          className="flex min-w-0 items-center justify-center gap-1.5 truncate text-center font-black uppercase leading-none text-white"
          style={{ fontSize: 'clamp(0.5rem, 3.8cqw, 0.9rem)', textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l5 5m-5-5L7 9" />
          </svg>
          <span className="truncate">Receitas</span>
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
              const valorDigitado = e.target.value;
              const valor = parseInt(valorDigitado, 10);
              const maxDias = mesAtivo ? getMaxDias(mesAtivo, anoSelecionado) : 31;

              if (valor > maxDias) {
                setEntradaFaturamentoDia(String(maxDias));
              } else {
                setEntradaFaturamentoDia(valorDigitado);
                if (/^\d{2}$/.test(valorDigitado) && valor >= 1 && valor <= maxDias) {
                  origemRef.current?.focus();
                }
              }
            }}
            placeholder="Dia"
            className={`${inputBase} input-dia-compacto h-9 px-1.5 py-0 text-center font-bold leading-none`}
            style={{ outlineColor: corPrimaria }}
          />

          <input
            ref={origemRef}
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
            {entradasVisiveis.length > 0
              ? `${entradasVisiveis.length} entrada(s) localizada(s).`
              : 'Nenhuma entrada localizada com esse argumento.'}
          </div>
        )}
      </div>

      <TabelaEntradasFaturamento
        entradas={entradasVisiveis}
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
