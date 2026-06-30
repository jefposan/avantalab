import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_EXCLUSAO_EBITDA } from '../lib/perfis';

interface RelatorioProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  despesasCadastradas: { nome: string; categoria: string }[];
  corPrimaria: string;
  darkMode: boolean;
  anoSelecionado: string;
  setAnoSelecionado: (ano: string) => void;
  empresaId: string | null;
}

type MetricaEvolutiva = 'entradas' | 'saidas' | 'ab' | 'ebitda';

type LancamentoBanco = {
  ano: number;
  mes: string;
  despesa_nome: string;
  descricao?: string | null;
  valor: number;
};

type FaturamentoBanco = {
  ano: number;
  mes: string;
  valor: number;
};

type DadosComparativoAno = {
  ano: string;
  entradas: number;
  saidas: number;
  ab: number;
  ebitda: number;
};

export default function Relatorio({
  meses,
  lancamentos,
  faturamentos,
  despesasCadastradas,
  corPrimaria,
  darkMode,
  anoSelecionado,
  setAnoSelecionado,
  empresaId,
}: RelatorioProps) {
  const [metricaEvolutiva, setMetricaEvolutiva] = useState<MetricaEvolutiva>('entradas');
  const [lancamentosTodosAnos, setLancamentosTodosAnos] = useState<LancamentoBanco[]>([]);
  const [faturamentosTodosAnos, setFaturamentosTodosAnos] = useState<FaturamentoBanco[]>([]);

  const getCategoria = (nomeDespesa: string) => {
    const despesa = despesasCadastradas.find((d) => d.nome === nomeDespesa);
    return despesa ? despesa.categoria : 'Outros';
  };

    useEffect(() => {
  const carregarComparativoAnual = async () => {
    if (!empresaId) return;

    const [{ data: lancs, error: erroLancs }, { data: fats, error: erroFats }] =
      await Promise.all([
        supabase
          .from('lancamentos')
          .select('ano, mes, despesa_nome, descricao, valor')
          .eq('empresa_id', empresaId)
          .order('ano', { ascending: true })
          .order('mes', { ascending: true }),
        supabase
          .from('faturamentos')
          .select('ano, mes, valor')
          .eq('empresa_id', empresaId)
          .order('ano', { ascending: true }),
      ]);

    if (!erroLancs && lancs) {
      setLancamentosTodosAnos(
        lancs.map((l: any) => ({
          ano: Number(l.ano),
          mes: l.mes,
          despesa_nome: l.despesa_nome,
          descricao: l.descricao || '',
          valor: Number(l.valor || 0),
        }))
      );
    }

    if (!erroFats && fats) {
      setFaturamentosTodosAnos(
        fats.map((f: any) => ({
          ano: Number(f.ano),
          mes: f.mes,
          valor: Number(f.valor || 0),
        }))
      );
    }
  };

  carregarComparativoAnual();
}, [empresaId]);

  const calcularValoresMes = (mes: string) => {
    const entradas = faturamentos[mes] || 0;
    let saidas = 0;
    let exclusoesEbitda = 0;

    lancamentos
      .filter((l) => l.mes === mes)
      .forEach((l) => {
        saidas += Number(l.valor || 0);

        const cat = getCategoria(l.despesa);

        if (CATEGORIAS_EXCLUSAO_EBITDA.includes(cat)) {
          exclusoesEbitda += Number(l.valor || 0);
        }
      });

    const ab = entradas - saidas;
    const ebitda = ab + exclusoesEbitda;

    return { entradas, saidas, ab, ebitda };
  };

  const dadosRelatorio = useMemo(() => {
    const dados = meses.map((mes) => ({ mes, ...calcularValoresMes(mes) }));

    const totais = dados.reduce(
      (acc, curr) => ({
        entradas: acc.entradas + curr.entradas,
        saidas: acc.saidas + curr.saidas,
        ab: acc.ab + curr.ab,
        ebitda: acc.ebitda + curr.ebitda,
      }),
      { entradas: 0, saidas: 0, ab: 0, ebitda: 0 }
    );

    return { dados, totais };
  }, [meses, lancamentos, faturamentos, despesasCadastradas]);

  const formatarContabilidade = (valor: number) => {
    if (valor === 0) return '-';

    const isNegative = valor < 0;
    const formatado = Math.abs(valor).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return isNegative ? `(${formatado})` : formatado;
  };

  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const bgRowAlt = darkMode ? 'bg-slate-700/30' : 'bg-slate-50';
  const textClass = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const borderClass = darkMode ? 'border-slate-700' : 'border-slate-200/50';

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

  const corTemaEmFundoClaro = corEhClara(corPrimaria) ? '#0f172a' : corPrimaria;

  const nomesMetricas: Record<MetricaEvolutiva, string> = {
    entradas: 'Faturamento',
    saidas: 'Despesas',
    ab: 'Lucro Operacional (A+B)',
    ebitda: 'EBITDA',
  };

  const anosDisponiveis = Array.from(
    { length: new Date().getFullYear() + 5 - 2024 + 1 },
    (_, i) => (2024 + i).toString()
  );

  const dadosGraficoMensal = dadosRelatorio.dados.map((item) => ({
    label: item.mes.slice(0, 3),
    valor: item[metricaEvolutiva],
  }));

  const maxValorGraficoMensal = Math.max(
    ...dadosGraficoMensal.map((item) => Math.abs(item.valor)),
    1
  );

  const dadosComparativoAnual = useMemo<DadosComparativoAno[]>(() => {
  const anosComDados = [
    ...lancamentosTodosAnos.map((l) => Number(l.ano)),
    ...faturamentosTodosAnos.map((f) => Number(f.ano)),
    new Date().getFullYear(),
  ];

  const anoFinal = Math.max(...anosComDados);

  const anos = Array.from({ length: 5 }, (_, i) =>
    String(anoFinal - 4 + i)
  );

  return anos.map((ano) => {
    const lancsAno = lancamentosTodosAnos.filter(
      (l) => String(l.ano) === ano
    );

    const fatsAno = faturamentosTodosAnos.filter(
      (f) => String(f.ano) === ano
    );

    const entradas = fatsAno.reduce(
      (acc, f) => acc + Number(f.valor || 0),
      0
    );

    let saidas = 0;
    let exclusoesEbitda = 0;

    lancsAno.forEach((l) => {
      const valor = Number(l.valor || 0);
      saidas += valor;

      const cat = getCategoria(l.despesa_nome);

      if (CATEGORIAS_EXCLUSAO_EBITDA.includes(cat)) {
        exclusoesEbitda += valor;
      }
    });

    const ab = entradas - saidas;
    const ebitda = ab + exclusoesEbitda;

    return {
      ano,
      entradas,
      saidas,
      ab,
      ebitda,
    };
  });
}, [
  lancamentosTodosAnos,
  faturamentosTodosAnos,
  despesasCadastradas,
]);

  const dadosGraficoAnual = dadosComparativoAnual.map((item) => ({
    label: item.ano,
    valor: item[metricaEvolutiva],
  }));

  const maxValorGraficoAnual = Math.max(
    ...dadosGraficoAnual.map((item) => Math.abs(item.valor)),
    1
  );

  const TabelaMatriz = ({
    titulo,
    dataKey,
    totalKey,
  }: {
    titulo: string;
    dataKey: MetricaEvolutiva;
    totalKey: number;
  }) => (
    <div
      className={`border-2 rounded-xl overflow-hidden ${bgCard} flex flex-col shadow-lg`}
      style={{ borderColor: corPrimaria }}
    >
      <div className="text-center font-black py-2 uppercase tracking-widest text-[11px]" style={estiloTemaPrimario}>
        {titulo}
      </div>

      <table className={`w-full text-xs ${textClass}`}>
        <thead>
          <tr className={`border-b-2 ${borderClass} bg-slate-50 dark:bg-slate-800/50`}>
            <th className={`py-1.5 px-3 text-left border-r ${borderClass} w-1/3 text-slate-500 text-[10px]`}>
              MÊS
            </th>
            <th className="py-1.5 px-3 text-right text-slate-500 text-[11px] font-bold">
              {anoSelecionado}
            </th>
          </tr>
        </thead>

        <tbody>
          {dadosRelatorio.dados.map((linha, index) => {
            const valor = linha[dataKey];
            const isNegative = valor < 0;

            return (
              <tr
                key={linha.mes}
                className={`border-b ${borderClass} ${
                  index % 2 === 0 ? '' : bgRowAlt
                } hover:bg-blue-50/50 dark:hover:bg-slate-600 transition-colors`}
              >
                <td className={`py-1 px-3 text-[10px] font-bold border-r ${borderClass}`}>
                  {linha.mes}
                </td>
                <td
                  className={`py-1 px-3 text-[11px] text-right font-bold tracking-wide ${
                    isNegative ? 'text-red-500' : ''
                  }`}
                >
                  {formatarContabilidade(valor)}
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="font-black uppercase bg-slate-100 dark:bg-slate-700/50">
            <td className={`py-2 px-3 text-[10px] border-r ${borderClass}`}>Total</td>
            <td className={`py-2 px-3 text-[11px] text-right ${totalKey < 0 ? 'text-red-500' : ''}`}>
              {formatarContabilidade(totalKey)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const GraficoColunas = ({
  titulo,
  dados,
  maxValor,
  altura,
  larguraBarra = '90%',
}: {
  titulo: string;
  dados: { label: string; valor: number }[];
  maxValor: number;
  altura: string;
  larguraBarra?: string;
}) => (
    <div className="min-h-0">
      <h4
  className="w-full rounded-lg py-1 px-3 text-center text-[10px] font-black uppercase tracking-widest mb-2"
  style={{
    backgroundColor: titulo === 'Desempenho Mensal' ? '#EAF2F8' : '#E8F6F3',
    color: '#0f172a',
  }}
>
  {titulo}
</h4>

      <div className="w-full overflow-visible pb-1">
        <div
  className={`flex items-end justify-center gap-3 ${altura} w-full px-1 pt-6 overflow-visible`}
>
          {dados.map((item) => {
            const isNegative = item.valor < 0;
            const alturaBarra = (Math.abs(item.valor) / maxValor) * 100;
            const corBarra = isNegative ? '#ef4444' : corPrimaria;

            return (
              <div
                key={item.label}
                className="group relative flex h-full min-w-0 flex-col items-center justify-end"
              >
                <div className="absolute top-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div
                    className={`px-2 py-1 rounded-md text-[9px] font-bold shadow-md whitespace-nowrap ${
                      darkMode
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    {formatarContabilidade(item.valor)}
                  </div>
                </div>

                <div
  className="rounded-t-md shadow-sm transition-all duration-200 group-hover:brightness-110 group-hover:scale-x-105"
  style={{
  width: larguraBarra,
  height: `${Math.max(alturaBarra, item.valor === 0 ? 0 : 4)}%`,
  backgroundColor: corBarra,
  minHeight: item.valor === 0 ? '2px' : '8px',
  opacity: 0.9,
}}
  
></div>

                <span className={`mt-1 text-[8px] font-black ${textMuted}`}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <main className="relatorio-print w-full space-y-8 animate-fade-in print:space-y-3 print:p-0 print:m-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          .print-ocultar { display: none !important; }
          .relatorio-print {
            zoom: 0.76;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .relatorio-print,
          .relatorio-print * {
            box-shadow: none !important;
          }
        }
        .custom-scroll::-webkit-scrollbar { height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>

      <div className="mb-6 flex min-w-0 items-center justify-between print-ocultar">
        <div className="flex min-w-0 items-center">
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          <h2 className={`min-w-0 break-words text-xl font-black sm:text-2xl ${textClass} uppercase tracking-wider`}>Relatório Contábil</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TabelaMatriz titulo="Entradas" dataKey="entradas" totalKey={dadosRelatorio.totais.entradas} />
        <TabelaMatriz titulo="Saídas" dataKey="saidas" totalKey={dadosRelatorio.totais.saidas} />
        <TabelaMatriz titulo="A + B" dataKey="ab" totalKey={dadosRelatorio.totais.ab} />
        <TabelaMatriz titulo="EBITDA" dataKey="ebitda" totalKey={dadosRelatorio.totais.ebitda} />
      </div>

      <div className="mb-6 mt-8 flex min-w-0 items-center justify-between print-ocultar">
  <div className="flex min-w-0 items-center">
    <span
      className="w-3 h-8 rounded-full mr-4 shadow-sm"
      style={{ backgroundColor: corPrimaria }}
    ></span>
    <h2 className={`min-w-0 break-words text-xl font-black sm:text-2xl ${textClass} uppercase tracking-wider`}>
      Análise Evolutiva Multianual
    </h2>
  </div>
</div>

      <div
        className={`mt-3 ${bgCard} p-2.5 rounded-xl shadow-lg border-x border-b border-t-[4px]`}
        style={{ borderTopColor: corPrimaria }}
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-center gap-3 mt-3 mb-4 border-b border-slate-200/20 pb-3">
  <div className="flex flex-wrap justify-center items-center gap-3">
    {(Object.entries(nomesMetricas) as [MetricaEvolutiva, string][]).map(([key, nome]) => (
      <button
        key={key}
        onClick={() => setMetricaEvolutiva(key)}
        className={`w-full min-w-0 rounded-xl px-3 py-2.5 font-bold text-[12px] transition-all shadow-sm sm:w-auto sm:min-w-[120px] sm:px-5 cursor-pointer hover:scale-[1.03] active:scale-95 ${
          metricaEvolutiva === key
            ? ''
            : `${
                darkMode
                  ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`
        }`}
        style={metricaEvolutiva === key ? estiloTemaPrimario : {}}
      >
        {nome}
      </button>
    ))}
  </div>

  <div className="flex items-center gap-2 lg:ml-4 justify-center">
    <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>
      Selecione o ano
    </span>

    <select
      value={anoSelecionado}
      onChange={(e) => setAnoSelecionado(e.target.value)}
      className={`rounded-lg px-3 py-2 text-sm font-black outline-none border shadow-sm cursor-pointer ${
        darkMode
          ? 'bg-slate-800 border-slate-700 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
      style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
    >
      {anosDisponiveis.map((ano) => (
        <option key={ano} value={ano} className="text-slate-800 bg-white">
          {ano}
        </option>
      ))}
    </select>
  </div>
</div>

        <div className="grid grid-cols-1 xl:grid-cols-[230px_minmax(0,1fr)] gap-2 items-stretch">
          <div className="overflow-hidden rounded-lg border border-slate-200/60 dark:border-slate-700">
            <table className={`w-full table-fixed text-xs ${textClass}`}>
              <thead>
                <tr className={`border-b ${borderClass} ${darkMode ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                  <th className={`py-1 px-1.5 text-left text-[9px] font-bold ${textMuted} w-[40%]`}>
                    MÊS
                  </th>
                  <th className="py-1 px-1.5 text-right text-[10px] font-black w-[60%]" style={{ color: corTemaEmFundoClaro }}>
                    {anoSelecionado}
                  </th>
                </tr>
              </thead>

              <tbody>
                {dadosRelatorio.dados.map((linha, index) => {
                  const valor = linha[metricaEvolutiva];
                  const isNegative = valor < 0;

                  return (
                    <tr
                      key={linha.mes}
                      className={`border-b ${borderClass} ${
                        index % 2 === 0 ? '' : bgRowAlt
                      } hover:bg-slate-50/10 transition-colors`}
                    >
                      <td className="py-1 px-1.5 text-[9px] font-bold uppercase">{linha.mes}</td>
                      <td className={`py-1 px-1.5 text-right text-[10px] font-bold ${isNegative ? 'text-red-500' : ''}`}>
                        {formatarContabilidade(valor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className={`font-black uppercase ${darkMode ? 'bg-slate-700/40' : 'bg-slate-100'}`}>
                  <td className="py-1.5 px-1.5 text-[9px]">TOTAL</td>
                  <td
                    className={`py-1.5 px-1.5 text-right text-[10px] ${
                      dadosRelatorio.totais[metricaEvolutiva] < 0 ? 'text-red-500' : ''
                    }`}
                  >
                    {formatarContabilidade(dadosRelatorio.totais[metricaEvolutiva])}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className={`rounded-lg border ${borderClass} ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} p-2 overflow-hidden`}>
            <div className="grid grid-rows-2 gap-2">
              <GraficoColunas
  titulo="Desempenho Mensal"
  dados={dadosGraficoMensal}
  maxValor={maxValorGraficoMensal}
  altura="h-[120px]"
  larguraBarra="50px"
/>

              <GraficoColunas
  titulo="Comparativo dos Últimos Anos"
  dados={dadosGraficoAnual}
  maxValor={maxValorGraficoAnual}
  altura="h-[120px]"
  larguraBarra="50px"
/>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
