import { useMemo, useState } from 'react';
import GraficoCard from './GraficoCard';

interface GraficosProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

export default function Graficos({
  meses,
  lancamentos,
  faturamentos,
  corPrimaria,
  darkMode,
  formatarMoeda,
}: GraficosProps) {
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  type CardGraficoId = 'comparativo' | 'distribuicao';

const [ordemCards, setOrdemCards] = useState<CardGraficoId[]>([
  'comparativo',
  'distribuicao',
]);

const [cardArrastando, setCardArrastando] = useState<CardGraficoId | null>(null);

const moverCard = (cardDestino: CardGraficoId) => {
  if (!cardArrastando || cardArrastando === cardDestino) return;

  setOrdemCards((ordemAtual) => {
    const novaOrdem = [...ordemAtual];

    const origemIndex = novaOrdem.indexOf(cardArrastando);
    const destinoIndex = novaOrdem.indexOf(cardDestino);

    if (origemIndex === -1 || destinoIndex === -1) return ordemAtual;

    novaOrdem.splice(origemIndex, 1);
    novaOrdem.splice(destinoIndex, 0, cardArrastando);

    return novaOrdem;
  });

  setCardArrastando(null);
};

  // --- PREPARAÇÃO DE DADOS PARA GRÁFICO DE BARRAS (ANUAL) ---
  const dadosAnuais = useMemo(() => {
    let maxValor = 0;

    const dados = meses.map((mes) => {
      const desp = lancamentos
        .filter((l) => l.mes === mes)
        .reduce((acc, l) => acc + l.valor, 0);

      const fat = faturamentos[mes] || 0;

      if (desp > maxValor) maxValor = desp;
      if (fat > maxValor) maxValor = fat;

      return { mes, desp, fat };
    });

    return { dados, maxValor: maxValor > 0 ? maxValor : 1 };
  }, [meses, lancamentos, faturamentos]);

  // --- PREPARAÇÃO DE DADOS PARA GRÁFICO DE ROSCA (CATEGORIAS) ---
  const analiseCategorias = useMemo(() => {
    const totais: Record<string, number> = {};
    let totalGeral = 0;

    lancamentos.forEach((l) => {
      totais[l.despesa] = (totais[l.despesa] || 0) + l.valor;
      totalGeral += l.valor;
    });

    const cores = [
      corPrimaria,
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#14b8a6',
      '#f97316',
      '#06b6d4',
    ];

    const dadosGrafico = Object.entries(totais)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, valor], index) => ({
        nome,
        valor,
        percentual: totalGeral > 0 ? (valor / totalGeral) * 100 : 0,
        cor: cores[index % cores.length],
      }));

    let anguloAtual = 0;

    const conicParts = dadosGrafico.map((item) => {
      const inicio = anguloAtual;
      anguloAtual += item.percentual;
      return `${item.cor} ${inicio}% ${anguloAtual}%`;
    });

    return {
      dados: dadosGrafico,
      gradiente: `conic-gradient(${conicParts.join(', ')})`,
      totalGeral,
    };
  }, [lancamentos, corPrimaria]);

  return (
    <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full space-y-8 animate-fade-in">
      <div className="flex items-center mb-6">
        <span
          className="w-3 h-8 rounded-full mr-4 shadow-sm"
          style={{ backgroundColor: corPrimaria }}
        ></span>

        <h2 className={`text-2xl font-black ${textStrong} uppercase tracking-wider`}>
          Análise Gráfica
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {ordemCards.map((cardId) => {
  const cardEstaArrastando = cardArrastando === cardId;

  return (
    <div
      key={cardId}
      draggable
      onDragStart={() => setCardArrastando(cardId)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => moverCard(cardId)}
      onDragEnd={() => setCardArrastando(null)}
      className={`${
        cardId === 'comparativo' ? 'xl:col-span-2' : ''
      } cursor-grab active:cursor-grabbing transition-all ${
        cardEstaArrastando ? 'opacity-50 scale-[0.99]' : 'opacity-100'
      }`}
      title="Arraste para reposicionar este card"
    >
      {cardId === 'comparativo' ? (
        <GraficoCard
          titulo="Comparativo Anual"
          corPrimaria={corPrimaria}
          bgCard={bgCard}
          textStrong={textStrong}
          className="min-h-[370px]"
          acoes={
            <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#00b050]"></span>
                Faturamento
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                Despesas
              </div>
            </div>
          }
        >
          <div className="flex items-end gap-2 h-[265px] pb-1 border-b border-slate-200/20 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-black w-full h-0"></div>
              ))}
            </div>

            {dadosAnuais.dados.map((item) => {
              const alturaFat = (item.fat / dadosAnuais.maxValor) * 100;
              const alturaDesp = (item.desp / dadosAnuais.maxValor) * 100;

              return (
                <div
                  key={item.mes}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap flex flex-col items-center">
                    <span className="text-[#00b050] font-bold">
                      {formatarMoeda(item.fat)}
                    </span>
                    <span className="text-red-400 font-bold">
                      {formatarMoeda(item.desp)}
                    </span>
                  </div>

                  <div className="flex items-end justify-center w-full gap-1 h-full z-0">
                    <div
                      className="w-1/3 bg-[#00b050] rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110"
                      style={{
                        height: `${alturaFat}%`,
                        minHeight: item.fat > 0 ? '4px' : '0',
                      }}
                    ></div>

                    <div
                      className="w-1/3 bg-red-600 rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110"
                      style={{
                        height: `${alturaDesp}%`,
                        minHeight: item.desp > 0 ? '4px' : '0',
                      }}
                    ></div>
                  </div>

                  <span
                    className={`text-[10px] font-bold mt-3 uppercase tracking-wider ${textMuted} truncate w-full text-center`}
                  >
                    {item.mes.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </GraficoCard>
      ) : (
        <GraficoCard
          titulo="Distribuição de Gastos"
          corPrimaria={corPrimaria}
          bgCard={bgCard}
          textStrong={textStrong}
          className="min-h-[460px]"
        >
          <div className="flex min-h-[360px] flex-col items-center justify-center">
            {analiseCategorias.totalGeral > 0 ? (
              <>
                <div className="relative flex items-center justify-center mb-8">
                  <div
                    className="w-56 h-56 rounded-full shadow-inner transform transition-transform hover:scale-105"
                    style={{ background: analiseCategorias.gradiente }}
                  ></div>

                  <div
                    className={`absolute w-28 h-28 ${bgCard} rounded-full shadow-xl flex items-center justify-center`}
                  >
                    <div className="text-center">
                      <span
                        className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest`}
                      >
                        Total Ano
                      </span>

                      <span className={`block text-base font-black ${textStrong}`}>
                        {formatarMoeda(analiseCategorias.totalGeral).replace('R$', '')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full max-h-[220px] overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                    {analiseCategorias.dados.map((item) => (
                      <div
                        key={item.nome}
                        className="flex justify-between items-center text-xs min-w-0"
                      >
                        <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.cor }}
                          ></span>

                          <span className={`font-semibold ${textStrong} truncate`}>
                            {item.nome}
                          </span>
                        </div>

                        <span className="font-bold text-slate-500 shrink-0">
                          {item.percentual.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-400 italic text-sm py-10">
                Nenhuma despesa registrada no ano.
              </div>
            )}
          </div>
        </GraficoCard>
      )}
    </div>
  );
})}
      </div>
    </main>
  );
}