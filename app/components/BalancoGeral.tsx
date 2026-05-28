import { useMemo } from 'react';

interface BalancoGeralProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  setFaturamentos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

export default function BalancoGeral({
  meses, lancamentos, faturamentos, setFaturamentos, corPrimaria, darkMode, formatarMoeda
}: BalancoGeralProps) {

  const getDespesaMes = (mes: string) => lancamentos.filter(l => l.mes === mes).reduce((acc, l) => acc + l.valor, 0);
  const getFaturamentoMes = (mes: string) => faturamentos[mes] || 0;
  const getAB = (mes: string) => getFaturamentoMes(mes) - getDespesaMes(mes);
  const getLucroPerc = (mes: string) => {
    const fat = getFaturamentoMes(mes);
    return fat > 0 ? (getAB(mes) / fat) * 100 : 0;
  };

  const totaisAnuais = useMemo(() => {
    const desp = meses.reduce((acc, m) => acc + getDespesaMes(m), 0);
    const fat = meses.reduce((acc, m) => acc + getFaturamentoMes(m), 0);
    const ab = fat - desp;
    const perc = fat > 0 ? (ab / fat) * 100 : 0;
    return { desp, fat, ab, perc };
  }, [meses, lancamentos, faturamentos]);

  const trimestres = [
    { id: 1, meses: meses.slice(0, 3), bgBase: darkMode ? 'bg-slate-800' : 'bg-white' },
    { id: 2, meses: meses.slice(3, 6), bgBase: darkMode ? 'bg-slate-700' : 'bg-[#e6f0fa]' },
    { id: 3, meses: meses.slice(6, 9), bgBase: darkMode ? 'bg-slate-600' : 'bg-[#99ccff]' },
    { id: 4, meses: meses.slice(9, 12), bgBase: darkMode ? 'bg-slate-500' : 'bg-[#3399ff]' }
  ];

  const getMediaTrimestre = (mesesTrimestre: string[]) => {
    const fatTotal = mesesTrimestre.reduce((acc, m) => acc + getFaturamentoMes(m), 0);
    const abTotal = mesesTrimestre.reduce((acc, m) => acc + getAB(m), 0);
    return fatTotal > 0 ? (abTotal / fatTotal) * 100 : 0;
  };

  const handleFaturamentoChange = (mes: string, value: string) => {
    const numericValue = parseFloat(value.replace(/\D/g, "")) / 100;
    if (!isNaN(numericValue)) {
      setFaturamentos(prev => ({ ...prev, [mes]: numericValue }));
    } else if (value === '') {
      const novosFaturamentos = { ...faturamentos };
      delete novosFaturamentos[mes];
      setFaturamentos(novosFaturamentos);
    }
  };

  const formatarInputFat = (mes: string) => {
    const valor = faturamentos[mes];
    return valor ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  };

  // --- CLASSES DE TEMA ---
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="p-4 max-w-[1400px] mx-auto w-full print:p-0 print:m-0 text-xs animate-fade-in space-y-8">
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          body { display: flex !important; justify-content: center !important; align-items: center !important; }
          .print-ocultar { display: none !important; }
          #painel-balanco { margin: 0 auto !important; transform: scale(0.95); transform-origin: center center; }
        }
      `}</style>

      {/* CABEÇALHO E BOTÃO PDF */}
      <div className="flex justify-between items-end mb-6 print-ocultar">
        <div>
          <h2 className={`text-2xl font-black ${textStrong} flex items-center`}>
            <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
            BALANÇO GERAL ANUAL
          </h2>
        </div>
        <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-md transition-all flex items-center gap-2 border border-slate-700 text-sm uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Salvar PDF
        </button>
      </div>

      {/* BLOCO SUPERIOR: 4 QUADRANTES DE RESUMO ANUAL COM A TARJA FINA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-ocultar">
        
        {/* Quadrante 1: Despesas */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-1 border-t-4 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted} mb-1`}>Total Despesas</h3>
          <p className="text-xl font-black text-red-500">{formatarMoeda(totaisAnuais.desp)}</p>
        </div>

        {/* Quadrante 2: Faturamento */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-1 border-t-4 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted} mb-1`}>Total Faturamento</h3>
          <p className="text-xl font-black text-[#00b050]">{formatarMoeda(totaisAnuais.fat)}</p>
        </div>

        {/* Quadrante 3: A + B */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-1 border-t-4 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted} mb-1`}>A + B (Líquido)</h3>
          <p className={`text-xl font-black ${totaisAnuais.ab >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {formatarMoeda(totaisAnuais.ab)}
          </p>
        </div>

        {/* Quadrante 4: Total % */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-1 border-t-4 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${textMuted} mb-1`}>Margem Total (%)</h3>
          <p className={`text-xl font-black ${textStrong}`}>{totaisAnuais.perc.toFixed(2)}%</p>
        </div>

      </div>

      {/* MATRIZ MENSAL (ENVOLVIDA NUM QUADRANTE PADRÃO) */}
      <div className={`${bgCard} rounded-xl shadow-lg border p-6 border-t-4 overflow-hidden`} style={{ borderTopColor: corPrimaria }}>
        <div id="painel-balanco" className="overflow-x-auto pb-4">
          <div className="min-w-[1000px] space-y-4 pt-2">
            
            {/* CABEÇALHO DAS COLUNAS (LARGURA TOTAL E CENTRALIZADO) */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-3 items-end mb-4 font-black text-sm">
              <div className="bg-red-600 text-white py-2 w-full rounded-md shadow-sm flex items-center justify-center text-xs tracking-wider">
                DESPESAS
              </div>
              <div className="bg-[#00b050] text-white py-2 w-full rounded-md shadow-sm flex items-center justify-center text-xs tracking-wider">
                FATURAMENTO
              </div>
              <div className="bg-[#66b3ff] text-white py-2 w-full rounded-md shadow-sm flex items-center justify-center text-xs tracking-wider">
                A + B
              </div>
              <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white py-1.5 w-full rounded-md shadow-sm flex items-center justify-center text-xs tracking-wider">
                TOTAL EM %
              </div>
              <div className="bg-[#7030a0] text-white py-1.5 px-1 text-[10px] leading-tight flex items-center justify-center text-center rounded-md shadow-sm relative h-full">
                MÉDIA<br/>TRIMESTRAL
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#7030a0]"></div>
              </div>
            </div>

            {/* TABELAS DOS TRIMESTRES */}
            {trimestres.map((trimestre) => (
              <div key={trimestre.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-3 items-stretch mb-4">
                
                <div className={`flex flex-col border-2 rounded-xl overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => (
                    <div key={`desp-${mes}`} className={`flex h-9 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                      <div className="w-24 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-bold px-1 text-slate-500 dark:text-slate-400 bg-transparent">{mes}</div>
                      <div className={`flex-1 flex items-center justify-end px-3 font-bold ${textStrong}`}>
                        {getDespesaMes(mes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex flex-col border-2 rounded-xl overflow-hidden shadow-sm`} style={{ borderColor: '#00b050' }}>
                  {trimestre.meses.map((mes, idx) => (
                    <div key={`fat-${mes}`} className={`flex h-9 items-center bg-[#00b050]/5 dark:bg-[#00b050]/10 ${idx !== 2 ? 'border-b border-[#00b050]/20' : ''}`}>
                      <div className="w-24 border-r border-[#00b050]/20 flex items-center justify-center font-bold px-1 text-[#00b050] bg-transparent">{mes}</div>
                      <div className="flex-1 flex items-center px-2">
                        <input type="text" value={formatarInputFat(mes)} onChange={(e) => handleFaturamentoChange(mes, e.target.value)} className="w-full bg-transparent outline-none font-bold text-right text-[#00b050] dark:text-[#2dd4bf]" placeholder="0,00" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex flex-col border-2 rounded-xl overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => {
                    const ab = getAB(mes);
                    return (
                      <div key={`ab-${mes}`} className={`flex h-9 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                        <div className="w-24 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-bold px-1 text-slate-500 bg-transparent">{mes}</div>
                        <div className={`flex-1 flex items-center justify-end px-3 font-bold ${ab < 0 ? 'text-red-500' : textStrong}`}>
                          {ab < 0 ? `(${Math.abs(ab).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className={`flex flex-col border-2 rounded-xl overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => {
                    const perc = getLucroPerc(mes);
                    return (
                      <div key={`perc-${mes}`} className={`flex h-9 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                        <div className="w-24 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-bold px-1 text-slate-500 bg-transparent">{mes}</div>
                        <div className={`flex-1 flex items-center justify-end px-3 font-bold ${perc < 0 ? 'text-red-500' : textStrong}`}>
                          {perc.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className={`border-2 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-800'}`} style={{ borderColor: corPrimaria }}>
                  {getMediaTrimestre(trimestre.meses).toFixed(2)}%
                </div>
                
              </div>
            ))}

          </div>
        </div>
      </div>

    </div>
  );
}