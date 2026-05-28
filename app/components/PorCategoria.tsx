import { useMemo } from 'react';

interface PorCategoriaProps {
  meses: string[];
  lancamentos: any[];
  despesasCadastradas: { nome: string; categoria: string }[];
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

export default function PorCategoria({
  meses, lancamentos, despesasCadastradas, corPrimaria, darkMode, formatarMoeda
}: PorCategoriaProps) {

  // --- CÁLCULOS TOTAIS ---
  const { totalGeral, despMap, catMap } = useMemo(() => {
    let totalGeral = 0;
    const despMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};

    const baseCategorias = ["Amortização", "Custos Variáveis", "Depreciação", "Despesas Financeiras", "Despesas Operacionais", "Imposto sobre Lucro"];
    baseCategorias.forEach(c => catMap[c] = 0);

    despesasCadastradas.forEach(d => {
      despMap[d.nome] = 0;
    });

    lancamentos.forEach(l => {
      totalGeral += l.valor;
      despMap[l.despesa] = (despMap[l.despesa] || 0) + l.valor;
      
      const despesaInfo = despesasCadastradas.find(d => d.nome === l.despesa);
      const cat = despesaInfo ? despesaInfo.categoria : 'Outros';
      catMap[cat] = (catMap[cat] || 0) + l.valor;
    });

    return { totalGeral, despMap, catMap };
  }, [lancamentos, despesasCadastradas]);

  const despesasNomes = Object.keys(despMap).sort((a, b) => a.localeCompare(b));
  const metade = Math.ceil(despesasNomes.length / 2);
  const despesasCol1 = despesasNomes.slice(0, metade);
  const despesasCol2 = despesasNomes.slice(metade);
  
  const categoriasNomes = Object.keys(catMap).sort((a, b) => a.localeCompare(b));

  const maxDespesa = Math.max(...Object.values(despMap), 1);
  const maxCategoria = Math.max(...Object.values(catMap), 1);

  const getValorMensal = (despesa: string, mes: string) => {
    return lancamentos
      .filter(l => l.despesa === despesa && l.mes === mes)
      .reduce((acc, l) => acc + l.valor, 0);
  };

  // --- CLASSES DE TEMA (Padrão Relatório) ---
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const bgHead = darkMode ? 'bg-slate-700/50' : 'bg-slate-50';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderSoft = darkMode ? 'border-slate-700' : 'border-slate-200/60';

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

  const estiloTemaPrimario = {
    backgroundColor: corPrimaria,
    borderColor: corPrimaria,
    color: textoSobreCorPrimaria,
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full pt-10 pb-8 text-sm animate-fade-in space-y-8">
      
      {/* CABEÇALHO (Espaçamento superior ajustado e PDF removido) */}
      <div className="mb-10">
        <h2 className={`text-2xl font-black ${textStrong} flex items-center`}>
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          ANÁLISE POR CATEGORIA E DESPESA
        </h2>
        <p className={`mt-2 ${textMuted} font-medium`}>Detalhamento completo dos gastos anuais distribuídos por classificação.</p>
      </div>

      {/* TARJAS (TÍTULOS EXTERNOS) */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Tarjas da Esquerda (Despesas) */}
        <div className="lg:w-2/3 flex flex-col sm:flex-row gap-6">
          <div
            style={estiloTemaPrimario}
            className="relative font-bold py-3 px-6 rounded-xl uppercase tracking-wider shadow-md flex-1 text-center text-sm"
          >
            TOTAIS POR TIPO DE DESPESAS

            {/* INDICADOR: Triângulo apontando para baixo */}
            <div
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent"
              style={{ borderTopColor: corPrimaria }}
            />
          </div>

          <div
            style={estiloTemaPrimario}
            className="font-bold py-3 px-8 rounded-xl uppercase tracking-wider shadow-md flex items-center justify-between gap-6 sm:w-auto"
          >
            <span className="text-sm">TOTAL ANUAL</span>
            <span className="text-lg font-black">{formatarMoeda(totalGeral)}</span>
          </div>
        </div>

        {/* Tarja da Direita (Categorias) */}
        <div className="lg:w-1/3">
          <div
            style={estiloTemaPrimario}
            className="relative font-bold py-3 px-6 rounded-xl uppercase tracking-wider shadow-md w-full text-center text-sm"
          >
            TOTAL POR CATEGORIA

            {/* INDICADOR: Triângulo apontando para baixo */}
            <div
              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent"
              style={{ borderTopColor: corPrimaria }}
            />
          </div>
        </div>
      </div>

      {/* BLOCO SUPERIOR: 3 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: Despesas Parte 1 */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-6 border-t-4`} style={{ borderTopColor: corPrimaria }}>
          <div className="space-y-3.5">
            {despesasCol1.map(nome => {
              const valor = despMap[nome];
              const perc = (valor / maxDespesa) * 100;
              return (
                <div key={nome} className="relative pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase truncate pr-2 ${textStrong}`}>{nome}</span>
                    <span className={`text-xs font-black ${valor > 0 ? 'text-red-500' : textMuted}`}>
                      {valor > 0 ? formatarMoeda(valor) : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className={`overflow-hidden h-2 text-xs flex rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div style={{ width: `${perc}%`, backgroundColor: corPrimaria }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full opacity-80 transition-all duration-500"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 2: Despesas Parte 2 */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-6 flex flex-col border-t-4`} style={{ borderTopColor: corPrimaria }}>
          <div className="space-y-3.5 flex-1">
            {despesasCol2.map(nome => {
              const valor = despMap[nome];
              const perc = (valor / maxDespesa) * 100;
              return (
                <div key={nome} className="relative pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase truncate pr-2 ${textStrong}`}>{nome}</span>
                    <span className={`text-xs font-black ${valor > 0 ? 'text-red-500' : textMuted}`}>
                      {valor > 0 ? formatarMoeda(valor) : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className={`overflow-hidden h-2 text-xs flex rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div style={{ width: `${perc}%`, backgroundColor: corPrimaria }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full opacity-80 transition-all duration-500"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: Categorias */}
        <div className={`${bgCard} rounded-xl shadow-lg border p-6 border-t-4`} style={{ borderTopColor: corPrimaria }}>
          <div className="space-y-4">
            {categoriasNomes.map(nome => {
              const valor = catMap[nome];
              const perc = (valor / maxCategoria) * 100;
              return (
                <div key={nome} className="relative pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase truncate pr-2 ${textStrong}`}>{nome}</span>
                    <span className={`text-xs font-black ${valor > 0 ? 'text-red-500' : textMuted}`}>
                      {valor > 0 ? formatarMoeda(valor) : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className={`overflow-hidden h-2.5 text-xs flex rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div style={{ width: `${perc}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full bg-slate-500 opacity-60 transition-all duration-500"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BLOCO INFERIOR: MATRIZ MENSAL */}
      <div className={`${bgCard} rounded-xl shadow-lg border overflow-hidden border-t-4`} style={{ borderTopColor: corPrimaria }}>
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
            <h3 className={`text-lg font-bold uppercase tracking-wider ${textStrong}`}>Matriz Anual de Despesas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className={`${bgHead} ${textMuted} uppercase text-xs tracking-wider border-b-2 ${borderSoft}`}>
                <th className="p-4 w-48 font-bold border-r border-slate-200/30 dark:border-slate-700/30">Tipo de Despesa</th>
                {meses.map(mes => (
                  <th key={mes} className="p-3 text-center font-bold">
                    {mes.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {despesasNomes.map((despesa, idx) => (
                <tr key={despesa} className={`border-b ${borderSoft} transition-colors ${darkMode ? 'hover:bg-slate-700/40' : 'hover:bg-blue-50/50'} ${idx % 2 === 0 ? '' : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}`}>
                  <td className={`p-3 px-4 font-bold uppercase text-xs truncate max-w-[150px] ${textStrong} border-r border-slate-200/30 dark:border-slate-700/30`}>
                    {despesa}
                  </td>
                  {meses.map(mes => {
                    const valorMensal = getValorMensal(despesa, mes);
                    return (
                      <td key={`${despesa}-${mes}`} className={`p-3 text-right text-xs ${valorMensal > 0 ? 'font-bold text-red-500' : textMuted}`}>
                        {valorMensal > 0 ? formatarMoeda(valorMensal).replace('R$', '').trim() : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}