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
          className={`absolute left-2 flex h-6 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-bold uppercase tracking-wide border shadow-sm ring-1 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
            darkMode
              ? 'bg-white/12 border-white/25 text-white ring-white/15 hover:bg-white/20 hover:border-white/35'
              : 'bg-white/88 border-white/80 text-red-700 ring-red-950/10 hover:bg-white'
          }`}
          title={
            ordemLancamentos === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Mudar ordem</span>
          <span className="text-xs font-black">
            {ordemLancamentos === 'desc' ? '↓' : '↑'}
          </span>
        </button>

        <h3 className="text-sm font-black uppercase tracking-widest text-white">
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
            placeholder="Dia"
            className={`${inputBase} input-dia-compacto h-9 px-1.5 py-0 text-center font-bold leading-none`}
            style={{ outlineColor: corPrimaria }}
          />

          <select
            value={formDespesa}
            onChange={(e) => setFormDespesa(e.target.value)}
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
            onBlur={() => setFormDescricao(formatarDescricao(formDescricao))}
            placeholder="Descrição"
            className={inputBase}
            style={{ outlineColor: corPrimaria }}
          />

          <input
            type="text"
            value={formValor}
            onChange={handleValorChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarDespesa();
              }
            }}
            placeholder="R$ 0,00"
            className={`${inputBase} text-right font-bold`}
            style={{ outlineColor: corPrimaria }}
          />

          <button
            type="button"
            onClick={adicionarDespesa}
            style={estiloTemaPrimario}
            className="h-9 rounded-md px-1 text-[11px] font-black uppercase shadow-md transition hover:brightness-110 active:scale-95 cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
}
