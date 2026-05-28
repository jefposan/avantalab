import React, { useState } from 'react';

interface DashboardProps {
  meses: string[];
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
  mesFaturamento: string;
  setMesFaturamento: (mes: string) => void;
  inputFaturamento: string;
  setInputFaturamento: (val: string) => void;
  salvarFaturamento: () => void;
  receitasTotais: number;
  despesasTotais: number;
  lucroTotalAnual: number;
  formatarMoeda: (valor: number) => string;
}

export default function Dashboard({
  meses, setMesAtivo, bgCard, corPrimaria, textStrong, textMuted, darkMode,
  mesResumoDash, setMesResumoDash, totalDespesasMes, maiorGasto, lucroOperacional,
  mesFaturamento, setMesFaturamento, inputFaturamento, setInputFaturamento,
  salvarFaturamento, receitasTotais, despesasTotais, lucroTotalAnual, formatarMoeda
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

  return (
    <main className="flex-1 flex p-8 gap-8 max-w-7xl mx-auto w-full animate-fade-in print:m-0 print:p-0">
      
      <section 
        className={`${bgCard} flex-1 p-10 rounded-2xl shadow-lg border border-t-4 transition-colors`} 
        style={{ borderTopColor: corPrimaria }}
      >
        <h2 className={`text-2xl font-black ${textStrong} mb-10 flex items-center`}>
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          LANÇAMENTOS MENSAIS
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {meses.map((mes) => (
            <button 
              key={mes} 
              onClick={() => setMesAtivo(mes)}
              className={`${darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-white border-slate-200'} border-2 rounded-xl shadow-sm hover:shadow-md transition-all font-bold ${textMuted} text-sm flex items-center justify-center group h-14`}
              onMouseOver={e => { e.currentTarget.style.color = corPrimaria; e.currentTarget.style.borderColor = corPrimaria; }}
              onMouseOut={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
            >
              <span className="group-hover:scale-105 transition-transform">{mes}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="w-96 flex flex-col space-y-6">
        <div className={`${bgCard} rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
          <div
            className="text-center font-bold py-3 uppercase tracking-widest text-xs flex justify-between px-6 items-center"
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
          <div className="p-6 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/20">
              <span className={`font-semibold text-sm ${textMuted}`}>Total Despesas</span>
              <span className={`font-bold text-xl ${textStrong}`}>{formatarMoeda(totalDespesasMes)}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/20">
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
        <div
          className="rounded-2xl shadow-lg p-6 relative overflow-hidden"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
          }}
        >
          <div
            className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10 rounded-full blur-xl"
            style={{
              backgroundColor: corEhClara(corPrimaria) ? '#0f172a' : '#ffffff',
            }}
          ></div>

          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3
              className="font-bold text-sm uppercase tracking-wide"
              style={{ color: textoSobreCorPrimaria }}
            >
              Faturamento
            </h3>

            <select
              value={mesFaturamento}
              onChange={e => setMesFaturamento(e.target.value)}
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
              {meses.map(m => (
                <option key={m} value={m} className="text-slate-800 bg-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 relative z-10">
            {/* Input Fundo Branco, Formatado e com "R$" Fixo */}
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
              <input 
                type="text" 
                value={inputFaturamento} 
                onChange={handleInputFaturamento} 
                placeholder="0,00" 
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white text-slate-800 font-bold focus:outline-none shadow-inner text-right" 
              />
            </div>
            <button
              onClick={salvarFaturamento}
              className="px-5 rounded-lg font-bold transition-colors shadow-md border"
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
              Salvar
            </button>
          </div>
        </div>
        {/* ========================================================= */}

        <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6 flex flex-col`} style={{ borderTopColor: corPrimaria }}>
          
          <div className="flex justify-between items-center border-b border-slate-200/10 pb-3 mb-5">
            <h3 className={`font-bold ${textStrong} text-sm uppercase tracking-wider`}>Resumo Anual</h3>
            
            <button 
              onClick={() => setOcultarValores(!ocultarValores)} 
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded" 
              title={ocultarValores ? "Mostrar valores" : "Ocultar valores"}
            >
              {ocultarValores ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${textMuted}`}>Receitas</span>
              <span className={`font-bold text-lg ${ocultarValores ? textMuted : 'text-emerald-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(receitasTotais)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${textMuted}`}>Despesas</span>
              <span className={`font-bold text-lg ${ocultarValores ? textMuted : 'text-red-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(despesasTotais)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-200/20 gap-20">
              <span className={`font-bold uppercase text-sm tracking-wide ${textStrong}`}>Lucro Total</span>
              <span className={`font-black text-xl ${ocultarValores ? textMuted : (lucroTotalAnual >= 0 ? textStrong : 'text-red-500')}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(lucroTotalAnual)}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}