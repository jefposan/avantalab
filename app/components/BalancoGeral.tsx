import { useMemo } from 'react';

interface BalancoGeralProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  setFaturamentos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
  anoSelecionado: string;
  salvarFaturamentoMes: (mes: string, valor: number) => Promise<void>;
  nomeEmpresa: string;
}

export default function BalancoGeral({
  meses,
  lancamentos,
  faturamentos,
  setFaturamentos,
  corPrimaria,
  darkMode,
  formatarMoeda,
  anoSelecionado,
  salvarFaturamentoMes,
  nomeEmpresa,
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

  const handleFaturamentoBlur = async (mes: string) => {
  const valor = faturamentos[mes] || 0;
  await salvarFaturamentoMes(mes, valor);
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
    <div className="w-full print:p-0 print:m-0 text-xs animate-fade-in space-y-5">
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
          .balanco-print-frame {
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 10px !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #painel-balanco {
            margin: 0 auto !important;
            transform: scale(0.86);
            transform-origin: top center;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .balanco-print-rodape {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
            font-size: 9px !important;
            font-weight: 700 !important;
            letter-spacing: 0.04em !important;
            color: #475569 !important;
          }
        }
      `}</style>

      {/* CABEÇALHO E BOTÃO PDF */}
      
      <div className="mb-5 flex items-center justify-between gap-4 print-ocultar">
  <div className="flex min-w-0 items-center gap-3">
    <span
      className="block h-6 w-2 shrink-0 rounded-full shadow-sm"
      style={{ backgroundColor: corPrimaria }}
    />

    <h2 className={`m-0 text-xl font-black leading-none ${textStrong} uppercase tracking-wider`}>
      BALANÇO GERAL ANUAL
    </h2>
  </div>

  <button
    type="button"
    onClick={() => window.print()}
    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-slate-700"
  >
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
      />
    </svg>

    Salvar PDF
  </button>
</div>

      {/* BLOCO SUPERIOR: 4 QUADRANTES DE RESUMO ANUAL COM A TARJA FINA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 print-ocultar">
        
        {/* Quadrante 1: Despesas */}
        <div className={`${bgCard} rounded-lg shadow-sm border px-3 py-2 border-t-2 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-0.5`}>Total Despesas</h3>
          <p className="text-base font-bold text-red-500">{formatarMoeda(totaisAnuais.desp)}</p>
        </div>

        {/* Quadrante 2: Faturamento */}
        <div className={`${bgCard} rounded-lg shadow-sm border px-3 py-2 border-t-2 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-0.5`}>Total Faturamento</h3>
          <p className="text-base font-bold text-[#00b050]">{formatarMoeda(totaisAnuais.fat)}</p>
        </div>

        {/* Quadrante 3: A + B */}
        <div className={`${bgCard} rounded-lg shadow-sm border px-3 py-2 border-t-2 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-0.5`}>A + B (Líquido)</h3>
          <p className={`text-base font-bold ${totaisAnuais.ab >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {formatarMoeda(totaisAnuais.ab)}
          </p>
        </div>

        {/* Quadrante 4: Total % */}
        <div className={`${bgCard} rounded-lg shadow-sm border px-3 py-2 border-t-2 text-center`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-0.5`}>Margem Total (%)</h3>
          <p className={`text-base font-bold ${textStrong}`}>{totaisAnuais.perc.toFixed(2)}%</p>
        </div>

      </div>

      {/* MATRIZ MENSAL (ENVOLVIDA NUM QUADRANTE PADRÃO) */}
      <div className="balanco-print-frame">
      <div className={`${bgCard} rounded-lg shadow-sm border p-4 border-t-2 overflow-hidden`} style={{ borderTopColor: corPrimaria }}>
        <div id="painel-balanco" className="overflow-x-auto pb-2">
          <div className="min-w-[960px] space-y-2 pt-1">
            
            {/* CABEÇALHO DAS COLUNAS (LARGURA TOTAL E CENTRALIZADO) */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_86px] gap-2 items-end mb-2 font-bold text-xs">
              <div className="bg-red-600 text-white py-1.5 w-full rounded-md shadow-sm flex items-center justify-center text-[10px] tracking-wide">
                DESPESAS
              </div>
              <div className="bg-[#00b050] text-white py-1.5 w-full rounded-md shadow-sm flex items-center justify-center text-[10px] tracking-wide">
                FATURAMENTO
              </div>
              <div className="bg-[#66b3ff] text-white py-1.5 w-full rounded-md shadow-sm flex items-center justify-center text-[10px] tracking-wide">
                A + B
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white py-1.5 w-full rounded-md shadow-sm flex items-center justify-center text-[10px] tracking-wide">
                TOTAL EM %
              </div>
              <div className="bg-[#7030a0] text-white py-1.5 px-1 text-[10px] leading-tight flex items-center justify-center text-center rounded-md shadow-sm relative h-full">
                MÉDIA<br/>TRIMESTRAL
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#7030a0]"></div>
              </div>
            </div>

            {/* TABELAS DOS TRIMESTRES */}
            {trimestres.map((trimestre) => (
              <div key={trimestre.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_86px] gap-2 items-stretch mb-2">
                
                <div className={`flex flex-col border rounded-lg overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => (
                    <div key={`desp-${mes}`} className={`flex h-7 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                      <div className="w-20 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-semibold px-1 text-[10px] text-slate-500 dark:text-slate-400 bg-transparent">{mes}</div>
                      <div className={`flex-1 flex items-center justify-end px-2 font-semibold ${textStrong}`}>
                        {getDespesaMes(mes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex flex-col border rounded-lg overflow-hidden shadow-sm`} style={{ borderColor: '#00b050' }}>
                  {trimestre.meses.map((mes, idx) => (
                    <div key={`fat-${mes}`} className={`flex h-7 items-center bg-[#00b050]/5 dark:bg-[#00b050]/10 ${idx !== 2 ? 'border-b border-[#00b050]/20' : ''}`}>
                      <div className="w-20 border-r border-[#00b050]/20 flex items-center justify-center font-semibold px-1 text-[10px] text-[#00b050] bg-transparent">{mes}</div>
                      <div className="flex-1 flex items-center px-2">
                        <input
  type="text"
  value={formatarInputFat(mes)}
  onChange={(e) => handleFaturamentoChange(mes, e.target.value)}
  onBlur={() => handleFaturamentoBlur(mes)}
  className="w-full bg-transparent outline-none font-semibold text-right text-[#00b050] dark:text-[#2dd4bf]"
  placeholder="0,00"
/>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex flex-col border rounded-lg overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => {
                    const ab = getAB(mes);
                    return (
                      <div key={`ab-${mes}`} className={`flex h-7 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                        <div className="w-20 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-semibold px-1 text-[10px] text-slate-500 bg-transparent">{mes}</div>
                        <div className={`flex-1 flex items-center justify-end px-2 font-semibold ${ab < 0 ? 'text-red-500' : textStrong}`}>
                          {ab < 0 ? `(${Math.abs(ab).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className={`flex flex-col border rounded-lg overflow-hidden shadow-sm ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`} style={{ borderColor: corPrimaria }}>
                  {trimestre.meses.map((mes, idx) => {
                    const perc = getLucroPerc(mes);
                    return (
                      <div key={`perc-${mes}`} className={`flex h-7 items-center bg-transparent ${idx !== 2 ? 'border-b border-slate-200/50 dark:border-slate-700' : ''}`}>
                        <div className="w-20 border-r border-slate-200/50 dark:border-slate-700 flex items-center justify-center font-semibold px-1 text-[10px] text-slate-500 bg-transparent">{mes}</div>
                        <div className={`flex-1 flex items-center justify-end px-2 font-semibold ${perc < 0 ? 'text-red-500' : textStrong}`}>
                          {perc.toFixed(2)}%
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className={`border rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-800'}`} style={{ borderColor: corPrimaria }}>
                  {getMediaTrimestre(trimestre.meses).toFixed(2)}%
                </div>
                
              </div>
            ))}

          </div>
        </div>
      </div>
      <div className="balanco-print-rodape hidden">
        Balanço de {nomeEmpresa || 'Empresa'} por AvantaLab.
      </div>
      </div>

    </div>
  );
}
