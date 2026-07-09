'use client';

import type { ChangeEvent, CSSProperties, Dispatch, SetStateAction } from 'react';

export type DespesaCadastrada = {
  nome: string;
  categoria: string;
};

type CardLancamentoDespesaProps = {
  corPrimaria: string;
  darkMode: boolean;
  textStrong: string;
  mesAtivo: string | null;
  anoSelecionado: string;
  ordemLancamentos: 'desc' | 'asc';
  setOrdemLancamentos: Dispatch<SetStateAction<'desc' | 'asc'>>;
  formDia: string;
  setFormDia: (valor: string) => void;
  onFocoDiaLancamento?: () => void;
  formDespesa: string;
  setFormDespesa: (valor: string) => void;
  formDescricao: string;
  setFormDescricao: (valor: string) => void;
  formValor: string;
  handleValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  adicionarDespesa: () => void | Promise<void>;
  despesasCadastradas: DespesaCadastrada[];
  estiloTemaPrimario: CSSProperties;
  getMaxDias: (mes: string | null, ano: string | number) => number;
  formatarDescricao: (texto: string) => string;
  expandido: boolean;
  onFoco: () => void;
  formParcelar: boolean;
  setFormParcelar: (v: boolean) => void;
  formParcelas: number;
  setFormParcelas: (v: number) => void;
  salvandoDespesa?: boolean;
};

export default function CardLancamentoDespesa({
  corPrimaria,
  darkMode,
  mesAtivo,
  anoSelecionado,
  ordemLancamentos,
  setOrdemLancamentos,
  formDia,
  setFormDia,
  onFocoDiaLancamento,
  formDespesa,
  setFormDespesa,
  formDescricao,
  setFormDescricao,
  formValor,
  handleValorChange,
  adicionarDespesa,
  despesasCadastradas,
  getMaxDias,
  formatarDescricao,
  expandido,
  onFoco,
  formParcelar,
  setFormParcelar,
  formParcelas,
  setFormParcelas,
  salvandoDespesa = false,
}: CardLancamentoDespesaProps) {
  const inputBase = `h-9 w-full rounded-md border px-2.5 text-xs font-semibold shadow-sm outline-none transition focus:ring-1 ${
    darkMode
      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
      : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400'
  }`;

  return (
    <>
      <div
        className="mb-3 grid grid-cols-[minmax(68px,84px)_minmax(0,1fr)_minmax(68px,84px)] items-center gap-2 px-3 py-2.5 transition-all duration-300 [container-type:inline-size]"
        style={{
          borderRadius: '6px 16px 16px 16px',
          background: expandido
            ? 'linear-gradient(120deg, #E5484D 0%, #D63A57 55%, #B4232A 100%)'
            : 'linear-gradient(120deg, #64748B 0%, #94A3B8 100%)',
          boxShadow: expandido ? 'inset 0 -1px 0 rgba(255,255,255,0.25)' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() =>
            setOrdemLancamentos((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className="flex h-6 w-full items-center justify-center gap-1 rounded-full border border-white/40 bg-white/20 px-1.5 text-[10px] font-black uppercase text-white shadow-sm backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-white/30 active:scale-95 cursor-pointer"
          title={
            ordemLancamentos === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Ordenar</span>
          <span className="text-xs font-black">
            {ordemLancamentos === 'desc' ? '\u2193' : '\u2191'}
          </span>
        </button>

        <h3
          className="flex min-w-0 items-center justify-center gap-1.5 truncate text-center font-black uppercase leading-none text-white"
          style={{ fontSize: 'clamp(0.5rem, 3.8cqw, 0.9rem)', textShadow: '0 1px 2px rgba(0,0,0,0.18)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 16l5-5m-5 5l-5-5" />
          </svg>
          <span className="truncate">Despesas</span>
        </h3>
        <div aria-hidden="true" className="h-6 w-full" />
      </div>

      <div
        className={`mb-3 rounded-lg border p-2.5 ${
          darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-[44px_176px_minmax(96px,1fr)_92px_42px]">
          <input
            type="number"
            min="1"
            max={getMaxDias(mesAtivo, anoSelecionado)}
            value={formDia}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val > getMaxDias(mesAtivo, anoSelecionado)) {
                setFormDia(getMaxDias(mesAtivo, anoSelecionado).toString());
              } else {
                setFormDia(e.target.value);
              }
            }}
            onFocus={() => {
              onFoco();
              onFocoDiaLancamento?.();
            }}
            placeholder="Dia"
            className={`${inputBase} input-dia-compacto h-9 px-1.5 py-0 text-center font-bold leading-none`}
            style={{ outlineColor: corPrimaria }}
          />

          <select
            value={formDespesa}
            onChange={(e) => setFormDespesa(e.target.value)}
            onFocus={onFoco}
            className={`${inputBase} select-despesa-compacto truncate pr-1 ${formDespesa ? 'text-[9px]' : 'text-xs'}`}
            style={{
              outlineColor: corPrimaria,
              color: formDespesa
                ? darkMode ? '#ffffff' : '#334155'
                : darkMode ? '#cbd5e1' : '#94a3b8',
            }}
          >
            <option
              value=""
              className={darkMode ? 'bg-slate-700 text-xs text-slate-300' : 'bg-white text-xs text-slate-400'}
            >
              Tipo de despesa
            </option>

            {despesasCadastradas.map((d) => (
              <option
                key={d.nome}
                value={d.nome}
                className={darkMode ? 'bg-slate-700 text-[9px] text-white' : 'bg-white text-[9px] text-slate-800'}
              >
                {d.nome}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
            onFocus={onFoco}
            onBlur={() => setFormDescricao(formatarDescricao(formDescricao))}
            placeholder="Descrição"
            className={inputBase}
            style={{ outlineColor: corPrimaria }}
          />

          <input
            type="text"
            value={formValor}
            onChange={handleValorChange}
            onFocus={onFoco}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarDespesa();
              }
            }}
            placeholder="0,00"
            className={`${inputBase} text-right font-bold`}
            style={{ outlineColor: corPrimaria }}
          />

          <button
            type="button"
            onClick={adicionarDespesa}
            disabled={salvandoDespesa}
            style={{ backgroundColor: '#0A1F44', color: '#ffffff' }}
            className="h-9 rounded-md px-1 text-[11px] font-black uppercase shadow-md transition hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {salvandoDespesa ? '...' : 'OK'}
          </button>
        </div>

        {/* Linha de parcelamento */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: expandido ? '56px' : '0px', opacity: expandido ? 1 : 0 }}
        >
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* Toggle pill */}
            <button
              type="button"
              onClick={() => {
                const next = !formParcelar;
                setFormParcelar(next);
                if (next && formParcelas < 2) setFormParcelas(2);
              }}
              className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                formParcelar
                  ? 'border-transparent text-white shadow-sm'
                  : darkMode
                    ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                    : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700'
              }`}
              style={
                formParcelar
                  ? { backgroundColor: '#0A1F44', borderColor: '#0A1F44' }
                  : undefined
              }
            >
              <span>{formParcelar ? '✓' : '÷'}</span>
              <span>Parcelar</span>
            </button>

            {formParcelar && (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFormParcelas(Math.max(2, formParcelas - 1))}
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm font-black transition hover:brightness-110 active:scale-95 cursor-pointer ${
                      darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    −
                  </button>
                  <span className={`w-6 text-center text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formParcelas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormParcelas(formParcelas + 1)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-sm font-black transition hover:brightness-110 active:scale-95 cursor-pointer ${
                      darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    +
                  </button>
                  <span className={`text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    x
                  </span>
                </div>
                <span className={`text-[10px] font-semibold italic ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                  lançadas automaticamente nos meses seguintes
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
