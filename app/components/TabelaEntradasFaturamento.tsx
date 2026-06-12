'use client';

import type { ChangeEvent } from 'react';

export type EntradaFaturamento = {
  id: string;
  mes?: string;
  dia: number | string | null;
  origem: string | null;
  valor: number | string | null;
};

type TabelaEntradasFaturamentoProps = {
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

function formatarMoedaLocal(valor: number | string | null) {
  const numero = Number(valor || 0);

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function TabelaEntradasFaturamento({
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
}: TabelaEntradasFaturamentoProps) {
  if (entradas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300/50 p-4 text-center text-sm text-slate-400 italic">
        Nenhuma entrada de faturamento adicionada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/20">
      <table className="w-full text-left border-collapse">
        <tbody>
          {entradas.map((entrada) => (
            <tr
              key={entrada.id}
              className="border-b border-dotted border-slate-300/40"
            >
              {entradaEditandoId === entrada.id ? (
                <>
                  <td className="py-2 px-4 w-24 text-center">
                    <input
                      type="number"
                      min="1"
                      value={editEntradaDia}
                      onChange={(e) => setEditEntradaDia(e.target.value)}
                      className="input-dia-compacto w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm font-bold text-slate-800 outline-none"
                    />
                  </td>

                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={editEntradaOrigem}
                      onChange={(e) => setEditEntradaOrigem(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </td>

                  <td className="py-2 px-4 w-40">
                    <input
                      type="text"
                      value={editEntradaValor}
                      onChange={handleEditEntradaValorChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onSalvarEdicaoEntrada();
                        }

                        if (e.key === 'Escape') {
                          e.preventDefault();
                          onCancelarEdicaoEntrada();
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm font-bold text-slate-800 outline-none"
                    />
                  </td>

                  <td className="py-2 px-4 w-24 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={onSalvarEdicaoEntrada}
                        className="text-green-500 hover:bg-green-500/10 p-1.5 rounded transition-all cursor-pointer"
                        title="Salvar edição"
                      >
                        ✓
                      </button>

                      <button
                        type="button"
                        onClick={onCancelarEdicaoEntrada}
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
                  <td className="py-2 px-4 w-24 text-center text-xs font-bold">
                    {String(entrada.dia).padStart(2, '0')}
                  </td>

                  <td className="py-2 px-4 text-xs font-semibold">
                    {entrada.origem || '-'}
                  </td>

                  <td className="py-2 px-4 w-40 text-right text-xs font-black text-emerald-600">
                    {formatarMoedaLocal(entrada.valor)}
                  </td>

                  <td className="py-2 px-4 w-24 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onIniciarEdicaoEntrada(entrada)}
                        disabled={!podeEditarEntradas}
                        className={
                          podeEditarEntradas
                            ? 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 p-1.5 rounded transition-all cursor-pointer'
                            : 'text-slate-300 p-1.5 rounded cursor-not-allowed'
                        }
                        title={
                          podeEditarEntradas
                            ? 'Editar'
                            : 'Você não tem permissão para editar lançamentos.'
                        }
                      >
                        <svg
                          className="w-4 h-4 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => onExcluirEntrada(entrada)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                        title="Apagar"
                      >
                        <svg
                          className="w-4 h-4 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
