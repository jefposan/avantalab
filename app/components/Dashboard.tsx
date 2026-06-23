import React, { useState } from 'react';

interface DashboardProps {
  meses: string[];
  lancamentos: any[];
  setMesAtivo: (mes: string) => void;
  bgCard: string;
  corPrimaria: string;
  textStrong: string;
  textMuted: string;
  darkMode: boolean;
  mesResumoDash: string;
  setMesResumoDash: (mes: string) => void;
  totalDespesasMes: number;
  maiorGasto: { despesa: string; valor: number };
  lucroOperacional: number;
  inputFaturamento: string;
  setInputFaturamento: (val: string) => void;
  placeholderFaturamento: string;
  solicitarFaturamentoDashboard: () => void;
  excluirTotalMes: () => void;
  faturamentoDoMes: number;

  entradaFaturamentoDia: string;
  setEntradaFaturamentoDia: (val: string) => void;
  entradaFaturamentoOrigem: string;
  setEntradaFaturamentoOrigem: (val: string) => void;
  entradaFaturamentoValor: string;
  handleEntradaFaturamentoValorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  solicitarEntradaFaturamentoDashboard: () => void;

  receitasTotais: number;
  despesasTotais: number;
  lucroTotalAnual: number;
  formatarMoeda: (valor: number) => string;
  despesasAConfirmar: any[];
  onConfirmarPrevista: (id: any) => void;
  onAjustarPrevista: (despesa: any) => void;
  onExcluirPrevista: (id: any) => void;
  saldoCardMesIdx: number;
  setSaldoCardMesIdx: (idx: number) => void;
  saldoInicial: number;
  saldoFinal: number;
  saldoPrevisto: number;
}

export default function Dashboard({
  meses, lancamentos, setMesAtivo, bgCard, corPrimaria, textStrong, textMuted, darkMode,
  mesResumoDash, setMesResumoDash, totalDespesasMes, maiorGasto, lucroOperacional,
  inputFaturamento, setInputFaturamento, placeholderFaturamento,
  solicitarFaturamentoDashboard,
  excluirTotalMes,
  faturamentoDoMes,
  entradaFaturamentoDia,
  setEntradaFaturamentoDia,
  entradaFaturamentoOrigem,
  setEntradaFaturamentoOrigem,
  entradaFaturamentoValor,
  handleEntradaFaturamentoValorChange,
  solicitarEntradaFaturamentoDashboard,
  receitasTotais, despesasTotais, lucroTotalAnual, formatarMoeda,
  despesasAConfirmar, onConfirmarPrevista, onAjustarPrevista, onExcluirPrevista,
  saldoCardMesIdx, setSaldoCardMesIdx, saldoInicial, saldoFinal, saldoPrevisto
}: DashboardProps) {
  
  const [ocultarValores, setOcultarValores] = useState(true);

  // Função local para formatar o faturamento enquanto digita
  const handleInputFaturamento = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setInputFaturamento("");
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    const formatado = new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(numericValue);
    
    setInputFaturamento(formatado);
  };

  const corEhClara = (hex: string) => {
    const cor = hex.replace('#', '');

    if (cor.length !== 6) return false;

    const r = parseInt(cor.substring(0, 2), 16);
    const g = parseInt(cor.substring(2, 4), 16);
    const b = parseInt(cor.substring(4, 6), 16);

    const brilho = (r * 299 + g * 587 + b * 114) / 1000;

    return brilho > 180;
  };

  const textoSobreCorPrimaria = corEhClara(corPrimaria) ? '#0f172a' : '#ffffff';
  const abreviarMes = (mes: string) => {
  const abreviacoes: Record<string, string> = {
    JANEIRO: 'JAN',
    FEVEREIRO: 'FEV',
    MARÇO: 'MAR',
    ABRIL: 'ABR',
    MAIO: 'MAI',
    JUNHO: 'JUN',
    JULHO: 'JUL',
    AGOSTO: 'AGO',
    SETEMBRO: 'SET',
    OUTUBRO: 'OUT',
    NOVEMBRO: 'NOV',
    DEZEMBRO: 'DEZ',
  };

  return abreviacoes[mes] || mes;
};
  const indiceMesResumoDash = meses.indexOf(mesResumoDash);

const mesAnteriorResumoDash =
  indiceMesResumoDash > 0 ? meses[indiceMesResumoDash - 1] : null;

const lancamentosMesAnteriorResumoDash = mesAnteriorResumoDash
  ? lancamentos.filter((l) => l.mes === mesAnteriorResumoDash)
  : [];

const totalDespesasMesAnteriorResumoDash =
  lancamentosMesAnteriorResumoDash.reduce(
    (acc, lanc) => acc + Number(lanc.valor || 0),
    0
  );

const percentualDespesasResumoDash =
  totalDespesasMesAnteriorResumoDash > 0
    ? (totalDespesasMes / totalDespesasMesAnteriorResumoDash) * 100
    : 0;

const percentualBarraResumoDash = Math.min(percentualDespesasResumoDash, 100);

const corBarraResumoDash =
  percentualDespesasResumoDash >= 100
    ? '#ef4444'
    : percentualDespesasResumoDash >= 80
      ? '#f97316'
      : percentualDespesasResumoDash >= 50
        ? '#f59e0b'
        : '#22c55e';

const mostrarComparativoResumoDash =
  !!mesAnteriorResumoDash && totalDespesasMesAnteriorResumoDash > 0;

  return (
    <main className="flex w-full flex-wrap items-start gap-6 animate-fade-in print:m-0 print:p-0">

      {despesasAConfirmar && despesasAConfirmar.length > 0 && (
        <div className="w-full xl:w-[600px] rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <h3 className="flex-1 text-sm font-black text-amber-900">
              {despesasAConfirmar.length} despesa{despesasAConfirmar.length > 1 ? 's' : ''} prevista{despesasAConfirmar.length > 1 ? 's' : ''} para confirmar
            </h3>
            <strong className="text-sm font-black text-amber-900">
              {formatarMoeda(despesasAConfirmar.reduce((s, i) => s + Number(i.valor || 0), 0))}
            </strong>
          </div>
          <p className="mt-1 text-xs font-semibold text-amber-700">
            Já entraram no total pelo valor previsto. Confirme, ajuste o valor ou exclua.
          </p>
          <div className="mt-4 grid gap-2">
            {despesasAConfirmar.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{d.despesa}</p>
                  <p className="truncate text-xs text-slate-500">
                    {d.mes} · Dia {d.dia}{d.descricao ? ` - ${d.descricao}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <strong className="mr-2 text-sm font-black text-red-600">{formatarMoeda(Number(d.valor || 0))}</strong>
                  <button
                    type="button"
                    onClick={() => onConfirmarPrevista(d.id)}
                    className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => onAjustarPrevista(d)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Ajustar valor
                  </button>
                  <button
                    type="button"
                    onClick={() => onExcluirPrevista(d.id)}
                    className="h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section
        className={`${bgCard} w-full xl:w-[600px] p-6 rounded-2xl shadow-lg border border-t-4 transition-colors`}
        style={{ borderTopColor: corPrimaria }}
      >
        <h2 className={`text-2xl font-black ${textStrong} mb-10 flex items-center`}>
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          LANÇAMENTOS MENSAIS
        </h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {meses.map((mes) => (
            <button 
              key={mes} 
              onClick={() => setMesAtivo(mes)}
              className={`${darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-white border-slate-200'} border-2 rounded-xl shadow-sm hover:shadow-md transition-all font-bold ${textMuted} text-sm flex items-center justify-center group h-14 cursor-pointer`}
              onMouseOver={e => { e.currentTarget.style.color = corPrimaria; e.currentTarget.style.borderColor = corPrimaria; }}
              onMouseOut={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
            >
              <span className="group-hover:scale-105 transition-transform">
  <span className="hidden xl:inline">{mes}</span>
  <span className="inline xl:hidden">{abreviarMes(mes)}</span>
</span>
            </button>
          ))}
        </div>

        <div
          className={`mt-8 rounded-xl border p-5 ${
            darkMode
              ? 'border-slate-700 bg-slate-800/70'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/10 pb-3">
            <h3 className={`font-bold ${textStrong} text-sm uppercase tracking-wider`}>
              Resumo Anual
            </h3>

            <button
              type="button"
              onClick={() => setOcultarValores(!ocultarValores)}
              className="rounded p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
              title={ocultarValores ? "Mostrar valores" : "Ocultar valores"}
            >
              {ocultarValores ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Receitas
              </span>
              <span className={`mt-1 block truncate text-lg font-bold ${ocultarValores ? textMuted : 'text-emerald-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(receitasTotais)}
              </span>
            </div>

            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Despesas
              </span>
              <span className={`mt-1 block truncate text-lg font-bold ${ocultarValores ? textMuted : 'text-red-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(despesasTotais)}
              </span>
            </div>

            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textStrong}`}>
                Lucro
              </span>
              <span className={`mt-1 block truncate text-lg font-black ${ocultarValores ? textMuted : (lucroTotalAnual >= 0 ? textStrong : 'text-red-500')}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(lucroTotalAnual)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className={`${bgCard} w-full sm:w-96 rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
          <div
            className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center"
            style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}
          >
            <span>Saldo do mês</span>
            <select
              value={meses[saldoCardMesIdx]}
              onChange={e => setSaldoCardMesIdx(meses.indexOf(e.target.value))}
              className="text-xs rounded p-1 outline-none font-bold cursor-pointer border"
              style={{
                color: textoSobreCorPrimaria,
                backgroundColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.08)' : 'rgba(0, 0, 0, 0.20)',
                borderColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)',
              }}
            >
              {meses.map(m => <option key={m} value={m} className="text-slate-800 bg-white">{m}</option>)}
            </select>
          </div>
          <div className="p-5 space-y-2.5">
            <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
              <span className={`font-semibold text-sm ${textMuted}`}>Inicial</span>
              <span className={`font-bold text-xl ${textStrong}`}>{formatarMoeda(saldoInicial)}</span>
            </div>
            <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
              <span className={`font-semibold text-sm ${textMuted}`}>Final</span>
              <span className={`font-bold text-xl ${saldoFinal >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(saldoFinal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-semibold text-sm ${textMuted}`}>Previsto</span>
              <span className={`font-bold text-xl ${saldoPrevisto >= 0 ? 'text-cyan-500' : 'text-red-500'}`}>{formatarMoeda(saldoPrevisto)}</span>
            </div>
          </div>
      </div>

      <div className={`${bgCard} w-full sm:w-96 rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
          <div
            className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center"
            style={{
              backgroundColor: corPrimaria,
              color: textoSobreCorPrimaria,
            }}
          >
            <span>Resumo Financeiro</span>
            <select
              value={mesResumoDash}
              onChange={e => setMesResumoDash(e.target.value)}
              className="text-xs rounded p-1 outline-none font-bold cursor-pointer border"
              style={{
                color: textoSobreCorPrimaria,
                backgroundColor: corEhClara(corPrimaria)
                  ? 'rgba(15, 23, 42, 0.08)'
                  : 'rgba(0, 0, 0, 0.20)',
                borderColor: corEhClara(corPrimaria)
                  ? 'rgba(15, 23, 42, 0.18)'
                  : 'rgba(255, 255, 255, 0.12)',
              }}
            >
              {meses.map(m => <option key={m} value={m} className="text-slate-800 bg-white">{m}</option>)}
            </select>
          </div>
          <div className="p-5 space-y-2.5">
  <div className={`pb-2.5 border-b border-dotted ${
  darkMode ? 'border-slate-500/50' : 'border-slate-300'
}`}>
    <div className="flex justify-between items-center">
      <span className={`font-semibold text-sm ${textMuted}`}>Total Despesas</span>
      <span className={`font-bold text-xl ${textStrong}`}>
        {formatarMoeda(totalDespesasMes)}
      </span>
    </div>

    <div className="mt-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>
          {mostrarComparativoResumoDash
            ? `Vs. ${mesAnteriorResumoDash}`
            : 'Vs. mês ant.'}
        </span>

        <span
          className="text-xs font-black"
          style={{
            color: mostrarComparativoResumoDash
              ? corBarraResumoDash
              : '#94a3b8',
          }}
        >
          {mostrarComparativoResumoDash
            ? `${percentualDespesasResumoDash.toFixed(1)}%`
            : '--'}
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: mostrarComparativoResumoDash
              ? `${percentualBarraResumoDash}%`
              : '0%',
            backgroundColor: mostrarComparativoResumoDash
              ? corBarraResumoDash
              : '#94a3b8',
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-400">
        <span>Atual: {formatarMoeda(totalDespesasMes)}</span>
        <span>
          Ant.: {mostrarComparativoResumoDash
            ? formatarMoeda(totalDespesasMesAnteriorResumoDash)
            : '--'}
        </span>
      </div>
    </div>
  </div>
            <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${
  darkMode ? 'border-slate-500/50' : 'border-slate-300'
}`}>
              <div className="flex flex-col">
                <span className={`font-semibold text-sm ${textMuted}`}>Maior Gasto</span>
                <span className="text-xs text-slate-400 mt-0.5">{maiorGasto.despesa || 'Nenhuma'}</span>
              </div>
              <span className={`font-bold text-xl ${maiorGasto.valor > 0 ? 'text-red-500' : textMuted}`}>
                {maiorGasto.valor > 0 ? formatarMoeda(maiorGasto.valor) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`font-semibold text-sm ${textMuted}`}>Lucro Operacional</span>
              <span className={`font-bold text-xl ${lucroOperacional >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroOperacional)}</span>
            </div>
          </div>
        </div>

                {/* ================= QUADRANTE FATURAMENTO ================= */}
      <div className={bgCard + " w-full sm:w-96 rounded-2xl shadow-lg border-2 overflow-hidden transition-colors"} style={{ borderColor: corPrimaria }}>
          <div
            className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center"
            style={{
              backgroundColor: corPrimaria,
              color: textoSobreCorPrimaria,
            }}
          >
            <span>REGISTRAR ENTRADAS</span>
          </div>

          <div className="p-5 space-y-3">
            <section
              className={(darkMode
                ? 'border-slate-700 bg-slate-800/60'
                : 'border-slate-200 bg-slate-50') + ' rounded-xl border p-3'}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className={textMuted + " text-[10px] font-black uppercase tracking-wide"}>
                  Lançar receita
                </p>
              </div>

              <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={entradaFaturamentoDia}
                  onChange={(e) => setEntradaFaturamentoDia(e.target.value)}
                  placeholder="Dia"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-inner outline-none"
                />

                <input
                  type="text"
                  value={entradaFaturamentoOrigem}
                  onChange={(e) => setEntradaFaturamentoOrigem(e.target.value)}
                  placeholder="Origem da entrada"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-inner outline-none"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={entradaFaturamentoValor}
                    onChange={handleEntradaFaturamentoValorChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        solicitarEntradaFaturamentoDashboard();
                      }
                    }}
                    placeholder="0,00"
                    className="w-full px-4 py-2 rounded-lg bg-white text-slate-800 font-bold focus:outline-none shadow-inner text-right"
                  />
                </div>

                <button
                  onClick={solicitarEntradaFaturamentoDashboard}
                  className="px-4 rounded-lg font-bold border shadow-md text-xs transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:scale-[1.03] active:scale-95 active:shadow-inner cursor-pointer select-none"
                  style={{
                    color: '#ffffff',
                    backgroundColor: '#059669',
                    borderColor: '#047857',
                  }}
                >
                  Lançar
                </button>
              </div>
            </section>

            <section
              className={(darkMode
                ? 'border-slate-700 bg-slate-800/60'
                : 'border-slate-200 bg-slate-50') + ' rounded-xl border p-3'}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: corPrimaria }}
                />
                <p className={textMuted + " text-[10px] font-black uppercase tracking-wide"}>
                  Definir total do mês
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={inputFaturamento}
                    onChange={handleInputFaturamento}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        solicitarFaturamentoDashboard();
                      }
                    }}
                    placeholder={placeholderFaturamento || '0,00'}
                    className="w-full px-4 py-2.5 rounded-lg bg-white text-slate-800 font-bold focus:outline-none shadow-inner text-right"
                  />
                </div>

                <button
                  onClick={solicitarFaturamentoDashboard}
                  className="px-4 rounded-lg font-bold border shadow-md text-xs transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:scale-[1.03] active:scale-95 active:shadow-inner cursor-pointer select-none"
                  style={{
                    color: textoSobreCorPrimaria,
                    backgroundColor: corPrimaria,
                    borderColor: corPrimaria,
                  }}
                >
                  Definir
                </button>
              </div>
              {faturamentoDoMes > 0 && (
                <button
                  type="button"
                  onClick={excluirTotalMes}
                  className={"mt-2 w-full rounded-lg border px-3 py-1.5 text-xs font-black transition cursor-pointer " + (darkMode
                    ? "border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40"
                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100")}
                >
                  Excluir total do mês
                </button>
              )}
            </section>
          </div>
        </div>
        {/* ========================================================= */}

      <div className="hidden xl:flex w-[280px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 text-sm font-semibold" style={{ minHeight: '120px' }}>
        Espaço para novos cards
      </div>
    </main>
  );
}
