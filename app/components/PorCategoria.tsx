import { useMemo } from 'react';
import { normalizarTexto, corEhClara } from '../lib/formatters';
import { nomesCategoriasDoPerfil, type TipoPerfil } from '../lib/perfis';

interface PorCategoriaProps {
  meses: string[];
  lancamentos: any[];
  despesasCadastradas: { nome: string; categoria: string }[];
  tipoPerfil: TipoPerfil;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

export default function PorCategoria({
  meses, lancamentos, despesasCadastradas, tipoPerfil, corPrimaria, darkMode, formatarMoeda
}: PorCategoriaProps) {

  // --- CÁLCULOS TOTAIS ---
  const { totalGeral, despMap, catMap } = useMemo(() => {
    let totalGeral = 0;
    const despMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};

    const baseCategorias = nomesCategoriasDoPerfil(tipoPerfil);
    baseCategorias.forEach(c => catMap[c] = 0);

    despesasCadastradas.forEach(d => {
      despMap[d.nome] = 0;
    });

    lancamentos.forEach(l => {
      totalGeral += l.valor;
      despMap[l.despesa] = (despMap[l.despesa] || 0) + l.valor;
      
      const despesaInfo = despesasCadastradas.find(
  (d) => normalizarTexto(d.nome) === normalizarTexto(l.despesa)
);

const cat = despesaInfo ? despesaInfo.categoria : 'Outros';
      catMap[cat] = (catMap[cat] || 0) + l.valor;
    });

    return { totalGeral, despMap, catMap };
  }, [lancamentos, despesasCadastradas, tipoPerfil]);

  const despesasNomes = Object.keys(despMap).sort((a, b) => a.localeCompare(b));
  const metade = Math.ceil(despesasNomes.length / 2);
  const despesasCol1 = despesasNomes.slice(0, metade);
  const despesasCol2 = despesasNomes.slice(metade);
  
  const categoriasNomes = Object.keys(catMap).sort((a, b) => a.localeCompare(b));

  const maxDespesa = Math.max(...Object.values(despMap), 1);
  const maxCategoria = Math.max(...Object.values(catMap), 1);

const getValorMensal = (despesa: string, mes: string) => {
  return lancamentos
    .filter(
      (l) =>
        normalizarTexto(l.despesa) === normalizarTexto(despesa) &&
        l.mes === mes
    )
    .reduce((acc, l) => acc + l.valor, 0);
};

  const getTotalDespesa = (despesa: string) =>
    meses.reduce((acc, mes) => acc + getValorMensal(despesa, mes), 0);

  const totaisPorMes = useMemo(
    () =>
      meses.reduce<Record<string, number>>((acc, mes) => {
        acc[mes] = lancamentos
          .filter((l) => l.mes === mes)
          .reduce((total, l) => total + Number(l.valor || 0), 0);

        return acc;
      }, {}),
    [meses, lancamentos]
  );

  // --- CLASSES DE TEMA (Padrão Relatório) ---
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const bgHead = darkMode ? 'bg-slate-700/50' : 'bg-slate-50';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderSoft = darkMode ? 'border-slate-700' : 'border-slate-200/60';

  const textoSobreCorPrimaria = corEhClara(corPrimaria) ? '#0f172a' : '#ffffff';

  const estiloTemaPrimario = {
    backgroundColor: corPrimaria,
    borderColor: corPrimaria,
    color: textoSobreCorPrimaria,
  };

  return (
    <div className="w-full text-sm animate-fade-in space-y-8">
      
      {/* CABEÇALHO */}
<div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-center">
  <div className="lg:col-span-2">
    <h2 className={`flex items-center text-xl font-black ${textStrong}`}>
      <span
        className="mr-3 block h-6 w-2 shrink-0 rounded-full shadow-sm"
        style={{ backgroundColor: corPrimaria }}
      />

      ANÁLISE POR CATEGORIA E DESPESA
    </h2>

    <p className={`mt-1 text-xs font-medium ${textMuted}`}>
      Detalhamento completo dos gastos anuais distribuídos por classificação.
    </p>
  </div>

  <div
    className={`${bgCard} flex h-12 items-center justify-between rounded-xl border px-4 shadow-sm ${borderSoft}`}
    style={{ borderLeft: `4px solid ${corPrimaria}` }}
  >
    <span className={`text-xs font-black uppercase tracking-wide ${textMuted}`}>
      Total anual
    </span>

    <span
      className="text-lg font-black"
      style={{ color: corPrimaria }}
    >
      {formatarMoeda(totalGeral)}
    </span>
  </div>
</div>

      {/* TARJAS (TÍTULOS EXTERNOS) */}
<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
  <div
    style={estiloTemaPrimario}
    className="relative flex h-10 items-center justify-center rounded-lg px-5 text-center text-xs font-bold uppercase tracking-wide shadow-sm lg:col-span-2"
  >
    TOTAL POR TIPO DE DESPESA

    <div
      className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent"
      style={{ borderTopColor: corPrimaria }}
    />
  </div>

  <div
    style={estiloTemaPrimario}
    className="relative flex h-10 items-center justify-center rounded-lg px-5 text-center text-xs font-bold uppercase tracking-wide shadow-sm"
  >
    TOTAL POR CATEGORIA

    <div
      className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent"
      style={{ borderTopColor: corPrimaria }}
    />
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

      {/* TÍTULO EXTERNO: MATRIZ ANUAL */}
<div className="flex justify-between items-center mt-10 mb-4">
  <div className="flex items-center">
    <span
      className="w-3 h-8 rounded-full mr-4 shadow-sm"
      style={{ backgroundColor: corPrimaria }}
    ></span>

    <h2 className={`text-2xl font-black ${textStrong} uppercase tracking-wider`}>
      Matriz Anual de Despesas
    </h2>
  </div>
</div>

{/* BLOCO INFERIOR: MATRIZ MENSAL */}
<div
  className={`${bgCard} rounded-xl shadow-lg border overflow-hidden border-t-4`}
  style={{ borderTopColor: corPrimaria }}
>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1120px]">
            <thead>
              <tr className={`${bgHead} ${textMuted} uppercase text-xs tracking-wider border-b-2 ${borderSoft}`}>
                <th className="p-3 w-52 font-bold border-r border-slate-200/30 dark:border-slate-700/30">Tipo de Despesa</th>
                {meses.map(mes => (
                  <th key={mes} className="p-2 text-center font-bold">
                    {mes.substring(0, 3)}
                  </th>
                ))}
                <th className="p-3 text-right font-black border-l border-slate-200/30 dark:border-slate-700/30">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {despesasNomes.map((despesa, idx) => {
                const totalDespesa = getTotalDespesa(despesa);

                return (
                  <tr key={despesa} className={`border-b ${borderSoft} transition-colors ${darkMode ? 'hover:bg-slate-700/40' : 'hover:bg-blue-50/50'} ${idx % 2 === 0 ? '' : (darkMode ? 'bg-slate-800/50' : 'bg-slate-50/50')}`}>
                    <td className={`p-2.5 px-4 font-bold uppercase text-[11px] truncate max-w-[170px] ${textStrong} border-r border-slate-200/30 dark:border-slate-700/30`}>
                      {despesa}
                    </td>
                    {meses.map(mes => {
                      const valorMensal = getValorMensal(despesa, mes);
                      return (
                        <td key={`${despesa}-${mes}`} className={`p-2.5 text-right text-[11px] ${valorMensal > 0 ? 'font-semibold text-red-500' : textMuted}`}>
                          {valorMensal > 0 ? formatarMoeda(valorMensal).replace('R$', '').trim() : '-'}
                        </td>
                      );
                    })}
                    <td className={`p-2.5 text-right text-[11px] font-black border-l border-slate-200/30 dark:border-slate-700/30 ${totalDespesa > 0 ? 'text-red-500' : textMuted}`}>
                      {totalDespesa > 0 ? formatarMoeda(totalDespesa) : 'R$ 0,00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={`${darkMode ? 'bg-slate-700/70 text-white' : 'bg-slate-100 text-slate-800'} border-t-2 ${borderSoft}`}>
                <td className="p-3 px-4 text-xs font-black uppercase border-r border-slate-200/30 dark:border-slate-700/30">
                  Total mensal
                </td>
                {meses.map((mes) => (
                  <td key={`total-${mes}`} className="p-3 text-right text-[11px] font-black text-red-500">
                    {totaisPorMes[mes] > 0
                      ? formatarMoeda(totaisPorMes[mes]).replace('R$', '').trim()
                      : '-'}
                  </td>
                ))}
                <td className="p-3 text-right text-xs font-black text-red-500 border-l border-slate-200/30 dark:border-slate-700/30">
                  {formatarMoeda(totalGeral)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
