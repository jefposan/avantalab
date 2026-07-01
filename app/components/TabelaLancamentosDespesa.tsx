'use client';

import type { ChangeEvent, CSSProperties, Dispatch, SetStateAction } from 'react';
import CardLancamentoDespesa, {
  type DespesaCadastrada,
} from './CardLancamentoDespesa';

export type LancamentoDespesa = {
  id: string | number;
  mes?: string;
  dia: string | number;
  despesa: string;
  descricao?: string | null;
  valor: number;
  status?: string | null;
  tipo?: string | null;
};

const MESES_TAB = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function dataFuturaTab(ano: number, mesIndice: number, dia: number): boolean {
  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  if (ano > anoHoje) return true;
  if (ano < anoHoje) return false;
  const mesHoje = hoje.getMonth();
  if (mesIndice > mesHoje) return true;
  if (mesIndice < mesHoje) return false;
  return Number(dia) > hoje.getDate();
}

const SELO_TIPO: Record<string, { txt: string; cls: string }> = {
  previsto: { txt: 'Previsto', cls: 'bg-amber-100 text-amber-700' },
  fixa: { txt: 'Fixa', cls: 'bg-indigo-100 text-indigo-700' },
  parcela: { txt: 'Parcela', cls: 'bg-violet-100 text-violet-700' },
};

function renderSeloPrevista(
  lanc: LancamentoDespesa,
  _mesAtivo: string | null,
  _anoSelecionado: string
) {
  const selo = lanc.tipo ? SELO_TIPO[lanc.tipo] : null;
  if (!selo) return null;
  return (
    <div className="mb-1">
      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${selo.cls}`}>{selo.txt}</span>
    </div>
  );
}

type TabelaLancamentosDespesaProps = {
  bgCard: string;
  corPrimaria: string;
  darkMode: boolean;
  textStrong: string;
  textMuted: string;
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
  buscaLancamento: string;
  setBuscaLancamento: (valor: string) => void;
  lancamentosFiltradosDoMes: LancamentoDespesa[];
  lancamentoEditandoId: string | number | null;
  editDia: string;
  setEditDia: (valor: string) => void;
  editDespesa: string;
  setEditDespesa: (valor: string) => void;
  editDescricao: string;
  setEditDescricao: (valor: string) => void;
  editValor: string;
  handleEditValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  salvarEdicaoLancamento: () => void | Promise<void>;
  cancelarEdicaoLancamento: () => void;
  iniciarEdicaoLancamento: (lancamento: LancamentoDespesa) => void;
  onSolicitarExclusaoLancamento: (lancamento: LancamentoDespesa) => void;
  alturaTabelaLancamentos: number;
  setAlturaTabelaLancamentos: (valor: number) => void;
  alturaFinalTabelaLancamentos: number;
  alturaMaximaTabelaLancamentos: number;
  quantidadeLancamentosMes: number;
  alturaPadraoTabela: number;
  espacoPuxadorTabela: number;
  estiloTemaPrimario: CSSProperties;
  getMaxDias: (mes: string | null, ano: string | number) => number;
  formatarMoeda: (valor: number) => string;
  formatarDescricao: (texto: string) => string;
  expandidoDespesa: boolean;
  onFocoDespesa: () => void;
  formParcelar: boolean;
  setFormParcelar: (v: boolean) => void;
  formParcelas: number;
  setFormParcelas: (v: number) => void;
  salvandoDespesa?: boolean;
};

export default function TabelaLancamentosDespesa({
  corPrimaria,
  darkMode,
  textStrong,
  textMuted,
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
  buscaLancamento,
  setBuscaLancamento,
  lancamentosFiltradosDoMes,
  lancamentoEditandoId,
  editDia,
  setEditDia,
  editDespesa,
  setEditDespesa,
  editDescricao,
  setEditDescricao,
  editValor,
  handleEditValorChange,
  salvarEdicaoLancamento,
  cancelarEdicaoLancamento,
  iniciarEdicaoLancamento,
  onSolicitarExclusaoLancamento,
  alturaTabelaLancamentos,
  setAlturaTabelaLancamentos,
  alturaFinalTabelaLancamentos,
  alturaMaximaTabelaLancamentos,
  quantidadeLancamentosMes,
  alturaPadraoTabela,
  espacoPuxadorTabela,
  estiloTemaPrimario,
  getMaxDias,
  formatarMoeda,
  formatarDescricao,
  expandidoDespesa,
  onFocoDespesa,
  formParcelar,
  setFormParcelar,
  formParcelas,
  setFormParcelas,
  salvandoDespesa = false,
}: TabelaLancamentosDespesaProps) {
  return (
    <div
      className="h-full w-full min-w-0 max-w-full overflow-hidden rounded-[18px] border border-t-[4px] bg-white p-3 text-slate-900 sm:p-4"
      style={{
        borderColor: '#E2E8F0',
        borderTopColor: '#0A1F44',
        boxShadow: '0 10px 25px rgba(10, 31, 68, 0.08)',
      }}
    >
      <div
        className="relative custom-scroll"
        style={{
          height: `${alturaFinalTabelaLancamentos + 130 + espacoPuxadorTabela}px`,
          minHeight: `${alturaPadraoTabela + 130 + espacoPuxadorTabela}px`,
          maxHeight: `${alturaMaximaTabelaLancamentos + 130 + espacoPuxadorTabela}px`,
          overflow: 'hidden',
        }}
      >
        <CardLancamentoDespesa
          corPrimaria={corPrimaria}
          darkMode={darkMode}
          textStrong={textStrong}
          mesAtivo={mesAtivo}
          anoSelecionado={anoSelecionado}
          ordemLancamentos={ordemLancamentos}
          setOrdemLancamentos={setOrdemLancamentos}
          formDia={formDia}
          setFormDia={setFormDia}
          formDespesa={formDespesa}
          setFormDespesa={setFormDespesa}
          formDescricao={formDescricao}
          setFormDescricao={setFormDescricao}
          formValor={formValor}
          handleValorChange={handleValorChange}
          adicionarDespesa={adicionarDespesa}
          despesasCadastradas={despesasCadastradas}
          estiloTemaPrimario={estiloTemaPrimario}
          getMaxDias={getMaxDias}
          formatarDescricao={formatarDescricao}
          expandido={expandidoDespesa}
          onFoco={onFocoDespesa}
          formParcelar={formParcelar}
          setFormParcelar={setFormParcelar}
          formParcelas={formParcelas}
          setFormParcelas={setFormParcelas}
          salvandoDespesa={salvandoDespesa}
        />
        <div className="mb-3">
          <div className="flex-1">
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
                value={buscaLancamento}
                onChange={(e) => setBuscaLancamento(e.target.value)}
                onFocus={onFocoDespesa}
                placeholder="Buscar lançamento do mês por despesa, descrição, dia ou valor..."
                className={`h-9 w-full rounded-lg border py-2 pl-9 pr-9 text-xs font-semibold outline-none transition focus:ring-1 focus:ring-inset ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                    : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
                }`}
                style={{
                  borderColor: buscaLancamento ? corPrimaria : undefined,
                  boxShadow: buscaLancamento ? `inset 0 0 0 1px ${corPrimaria}33` : undefined,
                }}
              />

              {buscaLancamento && (
                <button
                  type="button"
                  onClick={() => setBuscaLancamento('')}
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
          </div>
        </div>

        {buscaLancamento.trim() && (
          <div className="px-1.5 pt-2 text-xs font-bold text-slate-500">
            {lancamentosFiltradosDoMes.length > 0
              ? `${lancamentosFiltradosDoMes.length} lançamento(s) localizado(s).`
              : 'Nenhum lançamento localizado com esse argumento.'}
          </div>
        )}

        <div
          className="overflow-y-auto overflow-x-auto custom-scroll"
          style={{
            height: `${alturaFinalTabelaLancamentos}px`,
            maxHeight: `${alturaMaximaTabelaLancamentos}px`,
          }}
        >
          <table className="w-full min-w-[540px] table-fixed text-left border-collapse">
            <tbody>
              {lancamentosFiltradosDoMes.length > 0 ? (
                lancamentosFiltradosDoMes.map((lanc) => (
                  <tr
                    key={lanc.id}
                    className={`border-b border-dotted transition-colors ${
                      buscaLancamento.trim()
                        ? 'bg-sky-50 border-sky-200'
                        : 'border-slate-300/60 hover:bg-slate-50'
                    }`}
                  >
                    {lancamentoEditandoId === lanc.id ? (
                      <>
                        <td className="py-1.5 px-1.5 w-16 text-center">
                          <input
                            type="number"
                            min={1}
                            max={getMaxDias(mesAtivo, anoSelecionado)}
                            value={editDia}
                            onChange={(e) => setEditDia(e.target.value)}
                            className={`input-dia-compacto h-8 w-full rounded-md border px-2 text-center text-xs font-bold outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                          />
                        </td>

                        <td className="py-1.5 px-1.5 w-[30%]">
                          <select
                            value={editDespesa}
                            onChange={(e) => setEditDespesa(e.target.value)}
                            className={`h-8 w-full rounded-md border px-2 text-xs font-bold outline-none ${
                              darkMode
                                ? 'bg-slate-700 border-slate-600'
                                : 'bg-white border-slate-300'
                            }`}
                            style={{
                              color: editDespesa
                                ? darkMode ? '#ffffff' : '#334155'
                                : darkMode ? '#cbd5e1' : '#94a3b8',
                            }}
                          >
                            <option value="" className="text-slate-400">
                              Selecione...
                            </option>

                            {despesasCadastradas.map((d) => (
                              <option key={d.nome} value={d.nome} className="text-slate-800">
                                {d.nome}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-1.5 px-1.5">
                          <input
                            type="text"
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            className={`h-8 w-full rounded-md border px-2 text-[11px] outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                            placeholder="Descrição..."
                          />
                        </td>

                        <td className="py-1.5 px-1.5 w-32">
                          <input
                            type="text"
                            value={editValor}
                            onChange={handleEditValorChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                salvarEdicaoLancamento();
                              }

                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelarEdicaoLancamento();
                              }
                            }}
                            className={`h-8 w-full rounded-md border px-2 text-right text-xs font-bold outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                            placeholder="0,00"
                          />
                        </td>

                        <td className={`sticky right-0 z-10 w-20 border-l py-1.5 px-1.5 text-center ${
                          darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={salvarEdicaoLancamento}
                              className="text-green-500 hover:bg-green-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Salvar edição"
                            >
                              ✓
                            </button>

                            <button
                              onClick={cancelarEdicaoLancamento}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Cancelar edição"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="w-16 py-1.5 px-2 text-center text-xs font-bold text-slate-800">
                          {lanc.dia.toString().padStart(2, '0')}
                        </td>

                        <td className="w-[25%] py-1.5 px-2 text-xs font-bold text-slate-800">
                          {lanc.despesa}
                        </td>

                        <td className="w-[30%] py-1.5 px-2 text-[11px] text-slate-500">
                          {renderSeloPrevista(lanc, mesAtivo, anoSelecionado)}
                          {lanc.descricao || '-'}
                        </td>

                        <td className="w-32 py-1.5 px-2 text-right text-xs font-black whitespace-nowrap" style={{ color: '#E5484D' }}>
                          -{formatarMoeda(lanc.valor)}
                        </td>

                        <td className={`sticky right-0 z-10 w-20 border-l py-1.5 px-1 text-center ${
                          buscaLancamento.trim()
                            ? 'border-sky-200 bg-sky-50'
                            : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                onFocoDespesa();
                                iniciarEdicaoLancamento(lanc);
                              }}
                              className="text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Editar"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                />
                              </svg>
                            </button>

                            <button
                              onClick={() => onSolicitarExclusaoLancamento(lanc)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Apagar"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-4 text-sm text-slate-400 italic border-t border-slate-200/10"
                  >
                    Nenhuma despesa lançada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="flex items-center justify-center"
        style={{ height: `${espacoPuxadorTabela}px` }}
      >
        {quantidadeLancamentosMes > 10 && (
          <div
            title="Arraste para aumentar ou reduzir a área de lançamentos"
            className="flex h-5 w-28 cursor-row-resize items-center justify-center rounded-full border border-slate-400 bg-white shadow-md transition hover:bg-slate-100"
            onPointerDown={(e) => {
              e.preventDefault();

              const inicioY = e.clientY;
              const alturaInicial = alturaTabelaLancamentos;

              const aoMover = (event: PointerEvent) => {
                const diferenca = event.clientY - inicioY;

                const novaAltura = Math.min(
                  Math.max(alturaInicial + diferenca, alturaPadraoTabela),
                  alturaMaximaTabelaLancamentos
                );

                setAlturaTabelaLancamentos(novaAltura);
              };

              const aoSoltar = () => {
                window.removeEventListener('pointermove', aoMover);
                window.removeEventListener('pointerup', aoSoltar);
              };

              window.addEventListener('pointermove', aoMover);
              window.addEventListener('pointerup', aoSoltar);
            }}
          >
            <span className="h-1 w-16 rounded-full bg-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}
