import { useMemo, useState, useEffect } from 'react';

interface RelatorioProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  despesasCadastradas: { nome: string; categoria: string }[];
  corPrimaria: string;
  darkMode: boolean;
  anoSelecionado: string;
}

export default function Relatorio({
  meses, lancamentos, faturamentos, despesasCadastradas, corPrimaria, darkMode, anoSelecionado
}: RelatorioProps) {

  const [historicoAnos, setHistoricoAnos] = useState<any[]>([]);
  const [metricaEvolutiva, setMetricaEvolutiva] = useState<'entradas'|'saidas'|'ab'|'ebitda'>('entradas');

  const getCategoria = (nomeDespesa: string) => {
    const despesa = despesasCadastradas.find(d => d.nome === nomeDespesa);
    return despesa ? despesa.categoria : 'Outros';
  };

  // CÁLCULO DOS 4 QUADRANTES SUPERIORES (Estes sim, obedecem ao ano selecionado)
  const calcularValoresMes = (mes: string) => {
    const entradas = faturamentos[mes] || 0;
    let saidas = 0;
    let exclusoesEbitda = 0; 

    lancamentos.filter(l => l.mes === mes).forEach(l => {
      saidas += l.valor;
      const cat = getCategoria(l.despesa);
      if (['Amortização', 'Depreciação', 'Despesas Financeiras', 'Imposto sobre Lucro'].includes(cat)) {
        exclusoesEbitda += l.valor;
      }
    });

    const ab = entradas - saidas;
    const ebitda = ab + exclusoesEbitda;

    return { entradas, saidas, ab, ebitda };
  };

  const dadosRelatorio = useMemo(() => {
    const dados = meses.map(mes => ({ mes, ...calcularValoresMes(mes) }));
    const totais = dados.reduce((acc, curr) => ({
      entradas: acc.entradas + curr.entradas,
      saidas: acc.saidas + curr.saidas,
      ab: acc.ab + curr.ab,
      ebitda: acc.ebitda + curr.ebitda,
    }), { entradas: 0, saidas: 0, ab: 0, ebitda: 0 });

    return { dados, totais };
  }, [meses, lancamentos, faturamentos, despesasCadastradas]);

  // =========================================================================
  // MOTOR EVOLUTIVO INDEPENDENTE (Vasculha e exibe TODOS os anos com dados)
  // =========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const historico: any[] = [];
    let encontrouAnoAtualNoHistorico = false;

    // 1. Vasculha a memória do navegador (localStorage)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('appGestaoData_')) {
        const anoStorage = key.replace('appGestaoData_', '');
        
        if (!isNaN(Number(anoStorage))) {
          let lancsAno = [];
          let fatsAno = {};

          // TRUQUE: Se o ano for o que está aberto na tela, usamos os dados ao vivo! 
          // Isso impede falhas de sincronia com a memória do navegador.
          if (anoStorage === String(anoSelecionado)) {
            lancsAno = lancamentos;
            fatsAno = faturamentos;
            encontrouAnoAtualNoHistorico = true;
          } else {
            const savedData = JSON.parse(localStorage.getItem(key) || '{}');
            lancsAno = savedData.lancamentos || [];
            fatsAno = savedData.faturamentos || {};
          }

          // Processa os 12 meses desse ano histórico
          const dadosMeses = meses.map(mes => {
            const entradas = (fatsAno as Record<string, number>)[mes] || 0;
            let saidas = 0;
            let exclusoes = 0;

            lancsAno.filter((l: any) => l.mes === mes).forEach((l: any) => {
              saidas += l.valor;
              const despesa = despesasCadastradas.find(d => d.nome === l.despesa);
              const cat = despesa ? despesa.categoria : 'Outros';
              if (['Amortização', 'Depreciação', 'Despesas Financeiras', 'Imposto sobre Lucro'].includes(cat)) {
                exclusoes += l.valor;
              }
            });

            return { mes, entradas, saidas, ab: entradas - saidas, ebitda: (entradas - saidas) + exclusoes };
          });

          // Soma totais do ano
          const totais = dadosMeses.reduce((acc, curr) => ({
            entradas: acc.entradas + curr.entradas,
            saidas: acc.saidas + curr.saidas,
            ab: acc.ab + curr.ab,
            ebitda: acc.ebitda + curr.ebitda,
          }), { entradas: 0, saidas: 0, ab: 0, ebitda: 0 });

          // EXIBE APENAS SE HOUVER LANÇAMENTO NESTE ANO (Garante que exibe TODOS)
          if (totais.entradas > 0 || totais.saidas > 0) {
            historico.push({ ano: anoStorage, dados: dadosMeses, totais });
          }
        }
      }
    }

    // 2. Se for um ano totalmente novo (nunca salvo) mas que acabou de receber dados na tela
    if (!encontrouAnoAtualNoHistorico) {
       const totaisAoVivo = dadosRelatorio.totais;
       if (totaisAoVivo.entradas > 0 || totaisAoVivo.saidas > 0) {
          historico.push({ ano: String(anoSelecionado), dados: dadosRelatorio.dados, totais: totaisAoVivo });
       }
    }

    // 3. Ordena os anos na linha do tempo (Ex: 2024, 2025, 2026...)
    historico.sort((a, b) => Number(a.ano) - Number(b.ano));
    setHistoricoAnos(historico);

  }, [meses, despesasCadastradas, lancamentos, faturamentos, anoSelecionado, dadosRelatorio]);
  // ^^^ O Array acima garante que o gráfico evolutivo será sempre exato e atualizado instantaneamente!

  const formatarContabilidade = (valor: number) => {
    if (valor === 0) return '-';
    const isNegative = valor < 0;
    const formatado = Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNegative ? `(${formatado})` : formatado;
  };

  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const bgRowAlt = darkMode ? 'bg-slate-700/30' : 'bg-slate-50';
  const textClass = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderClass = darkMode ? 'border-slate-700' : 'border-slate-200/50';

  const nomesMetricas = {
    entradas: 'Faturamento',
    saidas: 'Despesas',
    ab: 'Lucro Operacional (A+B)',
    ebitda: 'EBITDA'
  };

  const TabelaMatriz = ({ titulo, dataKey, totalKey }: { titulo: string, dataKey: 'entradas'|'saidas'|'ab'|'ebitda', totalKey: number }) => (
    <div className={`border-2 rounded-xl overflow-hidden ${bgCard} flex flex-col shadow-lg`} style={{ borderColor: corPrimaria }}>
      <div className="text-white text-center font-black py-2 uppercase tracking-widest text-[11px]" style={{ backgroundColor: corPrimaria }}>
        {titulo}
      </div>
      <table className={`w-full text-xs ${textClass}`}>
        <thead>
          <tr className={`border-b-2 ${borderClass} bg-slate-50 dark:bg-slate-800/50`}>
            <th className={`py-1.5 px-3 text-left border-r ${borderClass} w-1/3 text-slate-500 text-[10px]`}>MÊS</th>
            <th className={`py-1.5 px-3 text-right text-slate-500 text-[11px] font-bold`}>{anoSelecionado}</th>
          </tr>
        </thead>
        <tbody>
          {dadosRelatorio.dados.map((linha, index) => {
            const valor = linha[dataKey];
            const isNegative = valor < 0;
            return (
              <tr key={linha.mes} className={`border-b ${borderClass} ${index % 2 === 0 ? '' : bgRowAlt} hover:bg-blue-50/50 dark:hover:bg-slate-600 transition-colors`}>
                <td className={`py-1 px-3 text-[10px] font-bold border-r ${borderClass}`}>{linha.mes}</td>
                <td className={`py-1 px-3 text-[11px] text-right font-bold tracking-wide ${isNegative ? 'text-red-500' : ''}`}>
                  {formatarContabilidade(valor)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`font-black uppercase bg-slate-100 dark:bg-slate-700/50`}>
            <td className={`py-2 px-3 text-[10px] border-r ${borderClass}`}>Total</td>
            <td className={`py-2 px-3 text-[11px] text-right ${totalKey < 0 ? 'text-red-500' : ''}`}>
              {formatarContabilidade(totalKey)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full space-y-8 animate-fade-in print:p-0 print:m-0">
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          .print-ocultar { display: none !important; }
        }
        .custom-scroll::-webkit-scrollbar { height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>

      <div className="flex justify-between items-center mb-6 print-ocultar">
        <div className="flex items-center">
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          <h2 className={`text-2xl font-black ${textClass} uppercase tracking-wider`}>Relatório Contábil</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TabelaMatriz titulo="Entradas" dataKey="entradas" totalKey={dadosRelatorio.totais.entradas} />
        <TabelaMatriz titulo="Saídas" dataKey="saidas" totalKey={dadosRelatorio.totais.saidas} />
        <TabelaMatriz titulo="A + B" dataKey="ab" totalKey={dadosRelatorio.totais.ab} />
        <TabelaMatriz titulo="EBITDA" dataKey="ebitda" totalKey={dadosRelatorio.totais.ebitda} />
      </div>

      {historicoAnos.length > 0 && (
        <div className={`mt-8 ${bgCard} p-6 rounded-xl shadow-lg border-x border-b border-t-[4px]`} style={{ borderTopColor: corPrimaria }}>
          <h3 className={`text-lg font-black ${textClass} uppercase tracking-widest mb-4 flex items-center gap-3`}>
            <svg className="w-5 h-5" fill="none" stroke={corPrimaria} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
            Análise Evolutiva Multianual
          </h3>

          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200/20 pb-4">
            {(Object.entries(nomesMetricas) as [keyof typeof nomesMetricas, string][]).map(([key, nome]) => (
              <button
                key={key}
                onClick={() => setMetricaEvolutiva(key as any)}
                className={`px-4 py-2 rounded-lg font-bold text-[11px] transition-all shadow-sm ${metricaEvolutiva === key ? 'text-white' : `${darkMode ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}`}
                style={{ backgroundColor: metricaEvolutiva === key ? corPrimaria : '' }}
              >
                {nome}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 overflow-x-auto custom-scroll pb-3">
              <table className={`w-full min-w-max text-xs ${textClass}`}>
                <thead>
                  <tr className={`border-b-2 ${borderClass}`}>
                    <th className={`py-1.5 px-3 text-left ${textMuted} font-bold text-[10px]`}>MÊS</th>
                    {historicoAnos.map(h => (
                      <th key={h.ano} className={`py-1.5 px-3 text-right font-black text-[11px]`} style={{ color: corPrimaria }}>
                        {h.ano}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meses.map((mes) => (
                    <tr key={mes} className={`border-b ${borderClass} hover:bg-slate-50/10 transition-colors`}>
                      <td className="py-1 px-3 font-bold uppercase text-[10px]">{mes}</td>
                      {historicoAnos.map(h => {
                        const mesData = h.dados.find((d: any) => d.mes === mes);
                        const valor = mesData ? mesData[metricaEvolutiva] : 0;
                        const isNegative = valor < 0;
                        return (
                          <td key={`${h.ano}-${mes}`} className={`py-1 px-3 text-right font-semibold text-[11px] ${isNegative ? 'text-red-500' : ''}`}>
                            {formatarContabilidade(valor)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`font-black uppercase bg-slate-500/10`}>
                    <td className="py-1.5 px-3 text-[10px]">TOTAL</td>
                    {historicoAnos.map(h => {
                        const valor = h.totais[metricaEvolutiva];
                        const isNegative = valor < 0;
                        return (
                          <td key={`total-${h.ano}`} className={`py-1.5 px-3 text-right text-xs ${isNegative ? 'text-red-500' : ''}`}>
                            {formatarContabilidade(valor)}
                          </td>
                        );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`flex flex-col items-center justify-end p-5 rounded-xl border ${borderClass} ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} overflow-hidden`}>
              <h4 className={`text-[10px] font-bold uppercase tracking-widest ${textMuted} mb-6 text-center w-full`}>
                Desempenho Anual
              </h4>
              <div className="w-full overflow-x-auto custom-scroll pb-2">
                <div className="flex items-end justify-start sm:justify-center gap-6 h-56 min-w-max px-2 relative mx-auto">
                  {historicoAnos.map(h => {
                    const valor = h.totais[metricaEvolutiva];
                    const maxAbsolute = Math.max(...historicoAnos.map(x => Math.abs(x.totais[metricaEvolutiva])), 1);
                    const percent = (Math.abs(valor) / maxAbsolute) * 100;
                    const isNegative = valor < 0;
                    
                    const barColor = isNegative ? '#ef4444' : corPrimaria;

                    return (
                      <div key={`chart-${h.ano}`} className="flex flex-col items-center gap-1.5 group w-12 flex-shrink-0">
                        <span className={`text-[9px] font-bold ${isNegative ? 'text-red-500' : textClass} transition-all`}>
                          {formatarContabilidade(valor)}
                        </span>
                        <div 
                          className="w-full rounded-t shadow-sm transition-all duration-700 ease-out flex items-end justify-center"
                          style={{ height: `${percent}%`, backgroundColor: barColor, minHeight: '4px', opacity: 0.8 }}
                        ></div>
                        <span className={`font-black text-[10px] mt-1 ${textMuted}`}>{h.ano}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      
    </main>
  );
}