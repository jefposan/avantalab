import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIAS_EXCLUSAO_EBITDA } from '../lib/perfis';

interface GraficosProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  despesasCadastradas?: { nome: string; categoria: string }[];
  tipoPerfil?: string;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

type LinhaTip = { label: string; valor: string; cor?: string; forte?: boolean; sep?: boolean };
type Tip = { x: number; y: number; titulo: string; linhas: LinhaTip[] } | null;

export default function Graficos({ meses, lancamentos, faturamentos, despesasCadastradas = [], tipoPerfil = 'empresa', corPrimaria, darkMode, formatarMoeda }: GraficosProps) {

  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBase = `${bgCard} min-w-0 rounded-2xl shadow-lg border p-5 sm:p-6 flex flex-col border-t-4 self-start`;
  const cardStyle = { borderTopColor: corPrimaria } as const;
  const ehEmpresa = tipoPerfil !== 'pessoal';

  const cores = [corPrimaria, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
  const VERDE = '#34d399', VERMELHO = '#f87171', AZUL = '#7dd3fc';

  // Tooltip que segue o mouse (modelo do card "Evolução mensal" do dashboard)
  const [tip, setTip] = useState<Tip>(null);
  const mostrarTip = (e: { clientX: number; clientY: number }, titulo: string, linhas: LinhaTip[]) =>
    setTip({ x: e.clientX, y: e.clientY, titulo, linhas });
  const esconderTip = () => setTip(null);

  // Mapa despesa -> categoria
  const catDeDespesa = useMemo(() => {
    const m: Record<string, string> = {};
    (despesasCadastradas || []).forEach((d) => { if (d && d.nome) m[d.nome] = d.categoria || 'Sem categoria'; });
    return m;
  }, [despesasCadastradas]);

  // --- BARRAS ANUAIS ---
  const dadosAnuais = useMemo(() => {
    let maxValor = 0;
    const dados = meses.map(mes => {
      const desp = lancamentos.filter(l => l.mes === mes).reduce((acc, l) => acc + (l.valor || 0), 0);
      const fat = faturamentos[mes] || 0;
      if (desp > maxValor) maxValor = desp;
      if (fat > maxValor) maxValor = fat;
      return { mes, desp, fat };
    });
    return { dados, maxValor: maxValor > 0 ? maxValor : 1 };
  }, [meses, lancamentos, faturamentos]);

  // --- ROSCA DE DESPESAS ---
  const analiseCategorias = useMemo(() => {
    const totais: Record<string, number> = {};
    let totalGeral = 0;
    lancamentos.forEach(l => { totais[l.despesa] = (totais[l.despesa] || 0) + (l.valor || 0); totalGeral += (l.valor || 0); });
    const dadosGrafico = Object.entries(totais).sort((a, b) => b[1] - a[1]).map(([nome, valor], index) => ({
      nome, valor, percentual: totalGeral > 0 ? (valor / totalGeral) * 100 : 0, cor: cores[index % cores.length]
    }));
    let anguloAtual = 0;
    const conicParts = dadosGrafico.map(item => { const inicio = anguloAtual; anguloAtual += item.percentual; return `${item.cor} ${inicio}% ${anguloAtual}%`; });
    return { dados: dadosGrafico, gradiente: `conic-gradient(${conicParts.join(', ')})`, totalGeral };
  }, [lancamentos, corPrimaria]);

  // --- POR MÊS ---
  const porMes = useMemo(() => meses.map((mes) => {
    const desp = lancamentos.filter((l) => l.mes === mes).reduce((a, l) => a + (l.valor || 0), 0);
    const fat = faturamentos[mes] || 0;
    return { mes, desp, fat, resultado: fat - desp };
  }), [meses, lancamentos, faturamentos]);

  const maxAbsResultado = useMemo(() => Math.max(1, ...porMes.map((m) => Math.abs(m.resultado))), [porMes]);

  // --- EVOLUÇÃO ACUMULADA ---
  const acumulada = useMemo(() => {
    let cf = 0, cd = 0;
    const pts = porMes.map((m) => { cf += m.fat; cd += m.desp; return { mes: m.mes, fat: cf, desp: cd, saldo: cf - cd }; });
    const todos = pts.flatMap((p) => [p.fat, p.desp, p.saldo]);
    const max = Math.max(1, ...todos);
    const min = Math.min(0, ...todos);
    return { pts, max, min };
  }, [porMes]);

  // --- GASTOS POR CATEGORIA ---
  const porCategoria = useMemo(() => {
    const tot: Record<string, number> = {};
    let geral = 0;
    lancamentos.forEach((l) => { const cat = catDeDespesa[l.despesa] || 'Sem categoria'; tot[cat] = (tot[cat] || 0) + (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([nome, valor], i) => ({
      nome, valor, percentual: geral > 0 ? (valor / geral) * 100 : 0, cor: cores[i % cores.length]
    }));
    let ang = 0;
    const parts = dados.map((d) => { const ini = ang; ang += d.percentual; return `${d.cor} ${ini}% ${ang}%`; });
    return { dados, gradiente: `conic-gradient(${parts.join(', ')})`, geral };
  }, [lancamentos, catDeDespesa, corPrimaria]);

  // --- COMPOSIÇÃO POR TIPO ---
  const porTipo = useMemo(() => {
    const rotulos: Record<string, string> = { fixa: 'Fixa', parcela: 'Parcela', previsto: 'Previsto', normal: 'Normal' };
    const coresTipo: Record<string, string> = { fixa: '#6366f1', parcela: '#8b5cf6', previsto: '#f59e0b', normal: '#64748b' };
    const tot: Record<string, number> = { fixa: 0, parcela: 0, previsto: 0, normal: 0 };
    let geral = 0;
    lancamentos.forEach((l) => { const t = (l.tipo && tot[l.tipo] !== undefined) ? l.tipo : 'normal'; tot[t] += (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.keys(tot).filter((k) => tot[k] > 0).sort((a, b) => tot[b] - tot[a]).map((k) => ({
      nome: rotulos[k], valor: tot[k], percentual: geral > 0 ? (tot[k] / geral) * 100 : 0, cor: coresTipo[k]
    }));
    let ang = 0;
    const parts = dados.map((d) => { const ini = ang; ang += d.percentual; return `${d.cor} ${ini}% ${ang}%`; });
    return { dados, gradiente: `conic-gradient(${parts.join(', ')})`, geral };
  }, [lancamentos]);

  // --- EBITDA ---
  const ebitda = useMemo(() => {
    const excl = new Set(CATEGORIAS_EXCLUSAO_EBITDA);
    const pm = meses.map((mes) => {
      const fat = faturamentos[mes] || 0;
      let despOper = 0;
      lancamentos.filter((l) => l.mes === mes).forEach((l) => { const cat = catDeDespesa[l.despesa] || ''; if (!excl.has(cat)) despOper += (l.valor || 0); });
      return { mes, ebitda: fat - despOper };
    });
    const total = pm.reduce((a, m) => a + m.ebitda, 0);
    const maxAbs = Math.max(1, ...pm.map((m) => Math.abs(m.ebitda)));
    return { pm, total, maxAbs };
  }, [meses, lancamentos, faturamentos, catDeDespesa]);

  // --- TOP 10 ---
  const topDespesas = useMemo(() => {
    const tot: Record<string, number> = {};
    let geral = 0;
    lancamentos.forEach((l) => { tot[l.despesa] = (tot[l.despesa] || 0) + (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, valor]) => ({
      nome, valor, percentual: geral > 0 ? (valor / geral) * 100 : 0
    }));
    const max = Math.max(1, ...dados.map((d) => d.valor));
    return { dados, max };
  }, [lancamentos]);

  // --- % DESPESA / FATURAMENTO ---
  const margem = useMemo(() => porMes.map((m) => {
    const pct = m.fat > 0 ? (m.desp / m.fat) * 100 : (m.desp > 0 ? 100 : 0);
    return { mes: m.mes, pct, fat: m.fat, desp: m.desp };
  }), [porMes]);

  // Linha (acumulada)
  const LW = 340, LH = 180, LP = 26;
  const nPts = acumulada.pts.length;
  const spanAc = (acumulada.max - acumulada.min) || 1;
  const xOf = (i: number) => LP + (nPts <= 1 ? 0 : (i * (LW - 2 * LP)) / (nPts - 1));
  const yOf = (v: number) => LH - LP - ((v - acumulada.min) / spanAc) * (LH - 2 * LP);
  const linhaPts = (key: 'fat' | 'desp' | 'saldo') => acumulada.pts.map((p, i) => `${xOf(i)},${yOf(p[key])}`).join(' ');

  const gradeFundo = (
    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
      {[...Array(5)].map((_, i) => <div key={i} className="border-b border-black w-full h-0"></div>)}
    </div>
  );

  const abrev = (mes: string) => mes.substring(0, 3);

  return (
    <>
    <main className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden animate-fade-in sm:space-y-8">
      <div className="mb-5 flex min-w-0 items-center sm:mb-6">
        <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
        <h2 className={`min-w-0 break-words text-xl font-black sm:text-2xl ${textStrong} uppercase tracking-wider`}>Análise Gráfica</h2>
      </div>

      {/* ===== LINHA 1 ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className={`xl:col-span-2 ${bgCard} min-w-0 rounded-2xl shadow-lg border p-4 sm:p-6 xl:p-8 flex flex-col border-t-4 self-start min-h-[400px] sm:min-h-[460px]`} style={cardStyle}>
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <h3 className={`font-bold uppercase tracking-wider ${textStrong}`}>Comparativo Anual</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#00b050]"></span> Faturamento</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span> Despesas</div>
            </div>
          </div>
          <div className="relative mt-4 flex h-[240px] min-w-0 items-end gap-1 overflow-hidden border-b border-slate-200/20 pb-4 sm:h-[285px] sm:gap-2" onMouseLeave={esconderTip}>
            {gradeFundo}
            {dadosAnuais.dados.map((item) => {
              const alturaFat = (item.fat / dadosAnuais.maxValor) * 100;
              const alturaDesp = (item.desp / dadosAnuais.maxValor) * 100;
              return (
                <div key={item.mes} className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseMove={(e) => mostrarTip(e, `${abrev(item.mes)}`, [
                    { label: 'Faturamento', valor: formatarMoeda(item.fat), cor: VERDE },
                    { label: 'Despesas', valor: formatarMoeda(item.desp), cor: VERMELHO },
                    { label: 'Saldo', valor: formatarMoeda(item.fat - item.desp), forte: true, sep: true },
                  ])}>
                  <div className="flex items-end justify-center w-full gap-1 h-full z-0">
                    <div className="w-1/3 bg-[#00b050] rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110" style={{ height: `${alturaFat}%`, minHeight: item.fat > 0 ? '4px' : '0' }}></div>
                    <div className="w-1/3 bg-red-600 rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110" style={{ height: `${alturaDesp}%`, minHeight: item.desp > 0 ? '4px' : '0' }}></div>
                  </div>
                  <span className={`text-[10px] font-bold mt-3 uppercase tracking-wider ${textMuted} truncate w-full text-center`}>{abrev(item.mes)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${bgCard} rounded-2xl shadow-lg border p-5 flex flex-col border-t-4 self-start`} style={cardStyle}>
          <h3 className={`text-center text-base font-black uppercase tracking-wider ${textStrong} border-b border-slate-200/10 pb-2 mb-3`}>Distribuição de Gastos</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {analiseCategorias.totalGeral > 0 ? (
              <>
                <div className="relative flex items-center justify-center mb-8">
                  <div className="w-56 h-56 rounded-full shadow-inner transform transition-transform hover:scale-105" style={{ background: analiseCategorias.gradiente }}></div>
                  <div className={`absolute w-28 h-28 ${bgCard} rounded-full shadow-xl flex items-center justify-center`}>
                    <div className="text-center">
                      <span className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest`}>Total Ano</span>
                      <span className={`block text-base font-black ${textStrong}`}>{formatarMoeda(analiseCategorias.totalGeral).replace('R$', '')}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full max-h-[220px] overflow-y-auto pr-2" onMouseLeave={esconderTip}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                    {analiseCategorias.dados.map((item) => (
                      <div key={item.nome} className="flex justify-between items-center text-xs min-w-0 cursor-default"
                        onMouseMove={(e) => mostrarTip(e, item.nome, [
                          { label: 'Total', valor: formatarMoeda(item.valor), cor: item.cor },
                          { label: 'Participação', valor: `${item.percentual.toFixed(1)}%`, forte: true, sep: true },
                        ])}>
                        <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }}></span>
                          <span className={`font-semibold ${textStrong} truncate`}>{item.nome}</span>
                        </div>
                        <span className="font-bold text-slate-500 shrink-0">{item.percentual.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-400 italic text-sm py-10">Nenhuma despesa registrada no ano.</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== LINHA 2: Resultado mensal + Composição por tipo ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className={`xl:col-span-2 ${cardBase} min-h-[360px]`} style={cardStyle}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`font-bold uppercase tracking-wider ${textStrong}`}>Resultado Mensal</h3>
            <div className="flex gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Lucro</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Prejuízo</div>
            </div>
          </div>
          <div className="relative flex h-[240px] items-stretch gap-1 sm:gap-2" onMouseLeave={esconderTip}>
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-400/40 pointer-events-none"></div>
            {porMes.map((m) => {
              const hPct = (Math.abs(m.resultado) / maxAbsResultado) * 100;
              const pos = m.resultado >= 0;
              return (
                <div key={m.mes} className="flex-1 flex flex-col relative min-w-0"
                  onMouseMove={(e) => mostrarTip(e, abrev(m.mes), [
                    { label: 'Faturamento', valor: formatarMoeda(m.fat), cor: VERDE },
                    { label: 'Despesas', valor: formatarMoeda(m.desp), cor: VERMELHO },
                    { label: 'Resultado', valor: formatarMoeda(m.resultado), cor: pos ? VERDE : VERMELHO, forte: true, sep: true },
                  ])}>
                  <div className="flex-1 flex items-end justify-center">
                    {pos && <div className="w-2/3 rounded-t-sm bg-emerald-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: m.resultado > 0 ? '3px' : '0' }}></div>}
                  </div>
                  <div className="flex-1 flex items-start justify-center">
                    {!pos && m.resultado !== 0 && <div className="w-2/3 rounded-b-sm bg-red-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: '3px' }}></div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1 sm:gap-2">
            {porMes.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}
          </div>
        </div>

        <div className={`${cardBase}`} style={cardStyle}>
          <h3 className={`text-center text-base font-black uppercase tracking-wider ${textStrong} border-b border-slate-200/10 pb-2 mb-3`}>Composição por Tipo</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {porTipo.geral > 0 ? (
              <>
                <div className="relative flex items-center justify-center mb-6">
                  <div className="w-44 h-44 rounded-full shadow-inner" style={{ background: porTipo.gradiente }}></div>
                  <div className={`absolute w-20 h-20 ${bgCard} rounded-full shadow-xl flex items-center justify-center`}>
                    <span className={`text-[10px] font-black uppercase ${textMuted}`}>Tipos</span>
                  </div>
                </div>
                <div className="w-full grid gap-2" onMouseLeave={esconderTip}>
                  {porTipo.dados.map((item) => (
                    <div key={item.nome} className="flex justify-between items-center text-xs cursor-default"
                      onMouseMove={(e) => mostrarTip(e, item.nome, [
                        { label: 'Total', valor: formatarMoeda(item.valor), cor: item.cor },
                        { label: 'Participação', valor: `${item.percentual.toFixed(1)}%`, forte: true, sep: true },
                      ])}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }}></span>
                        <span className={`font-semibold ${textStrong} truncate`}>{item.nome}</span>
                      </div>
                      <span className="font-bold text-slate-500 shrink-0">{formatarMoeda(item.valor)} · {item.percentual.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-400 italic text-sm py-10">Sem despesas para classificar.</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== LINHA 3: Evolução acumulada + Gastos por categoria ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className={`xl:col-span-2 ${cardBase} min-h-[360px]`} style={cardStyle}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className={`font-bold uppercase tracking-wider ${textStrong}`}>Evolução Acumulada</h3>
            <div className="flex flex-wrap gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#00b050]"></span> Faturamento</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Despesas</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: corPrimaria }}></span> Saldo</div>
            </div>
          </div>
          <div className="relative w-full" onMouseLeave={esconderTip}>
            <svg viewBox={`0 0 ${LW} ${LH}`} className="w-full h-[260px]" preserveAspectRatio="none">
              {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                const y = LP + f * (LH - 2 * LP);
                return <line key={i} x1={LP} y1={y} x2={LW - LP} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className={textMuted} />;
              })}
              {acumulada.min < 0 && <line x1={LP} y1={yOf(0)} x2={LW - LP} y2={yOf(0)} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 3" strokeWidth="1" className={textMuted} />}
              <polyline points={linhaPts('fat')} fill="none" stroke="#00b050" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={linhaPts('desp')} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={linhaPts('saldo')} fill="none" stroke={corPrimaria} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            {/* Overlay para o tooltip por mês */}
            <div className="absolute inset-0 flex">
              {acumulada.pts.map((p) => (
                <div key={p.mes} className="flex-1"
                  onMouseMove={(e) => mostrarTip(e, `${abrev(p.mes)} (acum.)`, [
                    { label: 'Faturamento', valor: formatarMoeda(p.fat), cor: VERDE },
                    { label: 'Despesas', valor: formatarMoeda(p.desp), cor: VERMELHO },
                    { label: 'Saldo', valor: formatarMoeda(p.saldo), cor: AZUL, forte: true, sep: true },
                  ])}></div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex gap-1">
            {acumulada.pts.map((p) => <span key={p.mes} className={`flex-1 text-center text-[9px] font-bold uppercase ${textMuted} truncate`}>{abrev(p.mes)}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/10 pt-3 text-center">
            <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Faturamento</span><span className="block text-sm font-black text-[#00b050]">{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].fat : 0)}</span></div>
            <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Despesas</span><span className="block text-sm font-black text-red-500">{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].desp : 0)}</span></div>
            <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Saldo</span><span className="block text-sm font-black" style={{ color: corPrimaria }}>{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].saldo : 0)}</span></div>
          </div>
        </div>

        <div className={`${cardBase}`} style={cardStyle}>
          <h3 className={`text-center text-base font-black uppercase tracking-wider ${textStrong} border-b border-slate-200/10 pb-2 mb-3`}>Gastos por Categoria</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {porCategoria.geral > 0 ? (
              <>
                <div className="relative flex items-center justify-center mb-6">
                  <div className="w-44 h-44 rounded-full shadow-inner" style={{ background: porCategoria.gradiente }}></div>
                  <div className={`absolute w-20 h-20 ${bgCard} rounded-full shadow-xl flex items-center justify-center`}>
                    <span className={`text-[10px] font-black uppercase ${textMuted} text-center px-1`}>Categorias</span>
                  </div>
                </div>
                <div className="w-full grid gap-2 max-h-[200px] overflow-y-auto pr-1" onMouseLeave={esconderTip}>
                  {porCategoria.dados.map((item) => (
                    <div key={item.nome} className="flex justify-between items-center text-xs cursor-default"
                      onMouseMove={(e) => mostrarTip(e, item.nome, [
                        { label: 'Total', valor: formatarMoeda(item.valor), cor: item.cor },
                        { label: 'Participação', valor: `${item.percentual.toFixed(1)}%`, forte: true, sep: true },
                      ])}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }}></span>
                        <span className={`font-semibold ${textStrong} truncate`}>{item.nome}</span>
                      </div>
                      <span className="font-bold text-slate-500 shrink-0">{item.percentual.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-400 italic text-sm py-10">Nenhuma despesa registrada.</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== LINHA 4: EBITDA + % Despesa/Faturamento ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {ehEmpresa && (
          <div className={`xl:col-span-2 ${cardBase} min-h-[360px]`} style={cardStyle}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className={`font-bold uppercase tracking-wider ${textStrong}`}>EBITDA</h3>
              <span className={`text-sm font-black ${ebitda.total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatarMoeda(ebitda.total)}</span>
            </div>
            <p className={`mb-4 text-[11px] font-semibold ${textMuted}`}>Faturamento menos despesas operacionais (exclui amortização, depreciação, despesas financeiras e imposto sobre lucro).</p>
            <div className="relative flex h-[220px] items-stretch gap-1 sm:gap-2" onMouseLeave={esconderTip}>
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-400/40 pointer-events-none"></div>
              {ebitda.pm.map((m) => {
                const hPct = (Math.abs(m.ebitda) / ebitda.maxAbs) * 100;
                const pos = m.ebitda >= 0;
                return (
                  <div key={m.mes} className="flex-1 flex flex-col relative min-w-0"
                    onMouseMove={(e) => mostrarTip(e, abrev(m.mes), [
                      { label: 'EBITDA', valor: formatarMoeda(m.ebitda), cor: pos ? VERDE : VERMELHO, forte: true },
                    ])}>
                    <div className="flex-1 flex items-end justify-center">
                      {pos && <div className="w-2/3 rounded-t-sm transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: m.ebitda > 0 ? '3px' : '0', backgroundColor: corPrimaria }}></div>}
                    </div>
                    <div className="flex-1 flex items-start justify-center">
                      {!pos && m.ebitda !== 0 && <div className="w-2/3 rounded-b-sm bg-red-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: '3px' }}></div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1 sm:gap-2">
              {ebitda.pm.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}
            </div>
          </div>
        )}

        <div className={`${ehEmpresa ? '' : 'xl:col-span-2'} ${cardBase} min-h-[360px]`} style={cardStyle}>
          <h3 className={`mb-1 font-bold uppercase tracking-wider ${textStrong}`}>Despesa sobre Faturamento</h3>
          <p className={`mb-4 text-[11px] font-semibold ${textMuted}`}>Quanto das receitas foi consumido por despesas em cada mês.</p>
          <div className="relative flex h-[220px] items-end gap-1 sm:gap-2 border-b border-slate-200/20" onMouseLeave={esconderTip}>
            {gradeFundo}
            {margem.map((m) => {
              const alt = Math.min(m.pct, 100);
              const cor = m.pct >= 100 ? 'bg-red-500' : m.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
              const temDados = m.fat > 0 || m.desp > 0;
              return (
                <div key={m.mes} className="flex-1 flex flex-col items-center justify-end h-full relative min-w-0"
                  onMouseMove={(e) => mostrarTip(e, abrev(m.mes), [
                    { label: 'Faturamento', valor: formatarMoeda(m.fat), cor: VERDE },
                    { label: 'Despesas', valor: formatarMoeda(m.desp), cor: VERMELHO },
                    { label: 'Consumo', valor: temDados ? `${m.pct.toFixed(0)}%` : 's/ dados', forte: true, sep: true },
                  ])}>
                  <div className={`w-2/3 rounded-t-sm ${cor} transition-all duration-500 hover:brightness-110`} style={{ height: `${alt}%`, minHeight: temDados && m.pct > 0 ? '3px' : '0' }}></div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1 sm:gap-2">
            {margem.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}
          </div>
        </div>
      </div>

      {/* ===== LINHA 5: Top 10 ===== */}
      <div className={`${cardBase}`} style={cardStyle}>
        <h3 className={`mb-4 font-bold uppercase tracking-wider ${textStrong}`}>Top 10 Maiores Despesas (Ano)</h3>
        {topDespesas.dados.length > 0 ? (
          <div className="grid gap-3" onMouseLeave={esconderTip}>
            {topDespesas.dados.map((item, i) => (
              <div key={item.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 cursor-default"
                onMouseMove={(e) => mostrarTip(e, `${i + 1}. ${item.nome}`, [
                  { label: 'Total', valor: formatarMoeda(item.valor), cor: cores[i % cores.length] },
                  { label: 'Participação', valor: `${item.percentual.toFixed(1)}%`, forte: true, sep: true },
                ])}>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`truncate text-xs font-bold ${textStrong}`}>{i + 1}. {item.nome}</span>
                    <span className={`shrink-0 text-[10px] font-bold ${textMuted}`}>{item.percentual.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/40">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(item.valor / topDespesas.max) * 100}%`, backgroundColor: cores[i % cores.length] }}></div>
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-black ${textStrong}`}>{formatarMoeda(item.valor)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 italic text-sm py-10">Nenhuma despesa registrada no ano.</div>
        )}
      </div>
    </main>

    {typeof document !== 'undefined' && tip && createPortal(
      <div
        className="pointer-events-none fixed z-[9999] w-48 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-2xl"
        style={{ left: `min(max(${tip.x + 14}px, 8px), calc(100vw - 200px))`, top: `max(${tip.y - 38}px, 8px)` }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/60">{tip.titulo}</p>
        {tip.linhas.map((ln, i) => (
          <div key={i} className={`flex justify-between gap-3 text-[11px] ${ln.forte ? 'font-black' : 'font-bold'} ${ln.sep ? 'mt-1 border-t border-white/15 pt-1' : ''}`}>
            <span style={ln.cor ? { color: ln.cor } : undefined}>{ln.label}</span>
            <strong style={ln.cor ? { color: ln.cor } : undefined}>{ln.valor}</strong>
          </div>
        ))}
      </div>,
      document.body
    )}
    </>
  );
}
