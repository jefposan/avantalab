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
  formDespesa,
  setFormDespesa,
  formDescricao,
  setFormDescricao,
  formValor,
  handleValorChange,
  adicionarDespesa,
  despesasCadastradas,
  estiloTemaPrimario,
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
      <div className="relative mb-3 flex h-8 items-center justify-center rounded-md bg-red-600 px-3 text-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setOrdemLancamentos((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className={`absolute left-2 flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black uppercase tracking-wide border shadow-sm ring-1 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
            darkMode
              ? 'bg-slate-950/25 border-white/30 text-white ring-white/15 hover:bg-slate-950/40 hover:border-white/45'
              : 'bg-white/95 border-red-100 text-red-700 ring-red-950/10 hover:bg-red-50 hover:border-red-200'
          }`}
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

        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          {/* L\u00e2ncamento de despesas */}
          Lançamento de despesas
        </h3>
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
            onFocus={onFoco}
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
            style={estiloTemaPrimario}
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
                  ? 'border-red-500 bg-red-600 text-white shadow-sm'
                  : darkMode
                    ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                    : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700'
              }`}
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
