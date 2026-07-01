import React, { useMemo, useState, useEffect, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, closestCorners,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CATEGORIAS_EXCLUSAO_EBITDA } from '../lib/perfis';

interface GraficosProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  despesasCadastradas?: { nome: string; categoria: string }[];
  tipoPerfil?: string;
  empresaId?: string | null;
  corPrimaria: string;
  darkMode: boolean;
  formatarMoeda: (valor: number) => string;
}

type LinhaTip = { label: string; valor: string; cor?: string; forte?: boolean; sep?: boolean };
type Tip = { x: number; y: number; titulo: string; linhas: LinhaTip[] } | null;
type Cols = { full: string[]; a: string[]; b: string[] };

const HandleContext = createContext<Record<string, any> | null>(null);

function DragHandle() {
  const h = useContext(HandleContext);
  return (
    <button {...(h || {})} type="button" aria-label="Arrastar para reordenar" title="Arrastar para reordenar"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded cursor-grab active:cursor-grabbing select-none text-slate-400 transition hover:text-slate-600">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="7" cy="5" r="1.6" /><circle cx="13" cy="5" r="1.6" />
        <circle cx="7" cy="10" r="1.6" /><circle cx="13" cy="10" r="1.6" />
        <circle cx="7" cy="15" r="1.6" /><circle cx="13" cy="15" r="1.6" />
      </svg>
    </button>
  );
}

function SortableItem({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const handleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <HandleContext.Provider value={handleProps}>{children}</HandleContext.Provider>
    </div>
  );
}

function Coluna({ id, items, isEmpty, arrastando, className, children }: { id: string; items: string[]; isEmpty: boolean; arrastando: boolean; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const dropZone = isEmpty && arrastando;
  return (
    <div ref={setNodeRef} className={`flex min-h-0 flex-col gap-6 ${className || ''} ${dropZone ? `min-h-[120px] justify-center rounded-2xl border-2 border-dashed ${isOver ? 'border-cyan-400 bg-cyan-50/40' : 'border-slate-300/60'}` : ''}`}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {dropZone && <p className="py-6 text-center text-xs font-bold text-slate-400">{id === 'full' ? 'Solte aqui para largura total' : 'Solte um gráfico aqui'}</p>}
    </div>
  );
}

export default function Graficos({ meses, lancamentos, faturamentos, despesasCadastradas = [], tipoPerfil = 'empresa', empresaId, corPrimaria, darkMode, formatarMoeda }: GraficosProps) {

  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const cardBase = `${bgCard} min-w-0 rounded-2xl shadow-lg border p-5 sm:p-6 flex flex-col border-t-4`;
  const cardStyle = { borderTopColor: corPrimaria } as const;
  const ehEmpresa = tipoPerfil !== 'pessoal';

  const cores = [corPrimaria, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
  const VERDE = '#34d399', VERMELHO = '#f87171', AZUL = '#7dd3fc';

  const [tip, setTip] = useState<Tip>(null);
  const mostrarTip = (e: { clientX: number; clientY: number }, titulo: string, linhas: LinhaTip[]) => setTip({ x: e.clientX, y: e.clientY, titulo, linhas });
  const esconderTip = () => setTip(null);

  // ===== Kanban: ordem / ocultos / expandidos (persistido no navegador) =====
  const catalogo = useMemo(() => {
    const base = [
      { id: 'comparativo', titulo: 'Comparativo Anual', descricao: 'Barras de faturamento e despesas por mês.' },
      { id: 'resultado', titulo: 'Resultado Mensal', descricao: 'Lucro ou prejuízo de cada mês.' },
      { id: 'acumulada', titulo: 'Evolução Acumulada', descricao: 'Faturamento, despesas e saldo acumulados.' },
      ...(ehEmpresa ? [{ id: 'ebitda', titulo: 'EBITDA', descricao: 'Faturamento menos despesas operacionais.' }] : []),
      { id: 'margem', titulo: 'Despesa sobre Faturamento', descricao: 'Quanto das receitas foi consumido.' },
      { id: 'top10', titulo: 'Top 10 Maiores Despesas', descricao: 'Ranking das maiores despesas do ano.' },
      { id: 'distribuicao', titulo: 'Distribuição de Gastos', descricao: 'Rosca por despesa individual.' },
      { id: 'tipo', titulo: 'Composição por Tipo', descricao: 'Fixa, parcela, previsto e normal.' },
      { id: 'categoria', titulo: 'Gastos por Categoria', descricao: 'Rosca agrupando por categoria.' },
    ];
    return base;
  }, [ehEmpresa]);

  const storageKey = `avantalab_graficos_layout_${empresaId || 'default'}`;
  const catIds = catalogo.map((c) => c.id);

  const distribuicaoPadrao = (): Cols => {
    const a: string[] = [], b: string[] = [];
    catIds.forEach((id, i) => (i % 2 === 0 ? a : b).push(id));
    return { full: [], a, b };
  };

  const [cols, setCols] = useState<Cols>(distribuicaoPadrao);
  const [ocultos, setOcultos] = useState<string[]>([]);
  const [carregouLayout, setCarregouLayout] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuCardAberto, setMenuCardAberto] = useState<string | null>(null);
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false);

  const reconciliar = (c: Partial<Cols>): Cols => {
    const seen = new Set<string>();
    const limpar = (arr?: string[]) => (arr || []).filter((id) => catIds.includes(id) && !seen.has(id) && (seen.add(id), true));
    const full = limpar(c.full); const a = limpar(c.a); const b = limpar(c.b);
    catIds.filter((id) => !seen.has(id)).forEach((id) => (a.length <= b.length ? a : b).push(id));
    return { full, a, b };
  };

  useEffect(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (raw) {
        const p = JSON.parse(raw);
        if (p.cols) setCols(reconciliar(p.cols));
        if (Array.isArray(p.ocultos)) setOcultos(p.ocultos.filter((id: string) => catIds.includes(id)));
      }
    } catch { /* ignore */ }
    setCarregouLayout(true);
  }, [storageKey]);

  const persistir = (c: Cols, oc: string[]) => {
    if (!carregouLayout) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ cols: c, ocultos: oc })); } catch { /* ignore */ }
  };

  const containerDe = (c: Cols, id: string): keyof Cols | null => {
    if (id === 'full' || id === 'a' || id === 'b') return id;
    return (['full', 'a', 'b'] as (keyof Cols)[]).find((k) => c[k].includes(id)) || null;
  };
  const estaExpandido = (id: string) => containerDe(cols, id) === 'full';
  const visiveis = (arr: string[]) => arr.filter((id) => !ocultos.includes(id));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id); const oId = String(over.id);
    setCols((prev) => {
      const from = containerDe(prev, aId);
      const to = containerDe(prev, oId);
      if (!from || !to || from === to) return prev;
      // Arrastar NAO troca a largura: nao move entre "largura total" e as colunas.
      if ((from === 'full') !== (to === 'full')) return prev;
      const fromArr = prev[from].filter((x) => x !== aId);
      const overArr = prev[to];
      let idx = overArr.indexOf(oId);
      if (idx < 0) idx = 0; // area vazia da coluna -> vai para o TOPO
      const toArr = [...overArr.slice(0, idx), aId, ...overArr.slice(idx)];
      return { ...prev, [from]: fromArr, [to]: toArr };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const aId = String(active.id); const oId = String(over.id);
    setCols((prev) => {
      const c = containerDe(prev, aId);
      if (!c) { persistir(prev, ocultos); return prev; }
      const oldI = prev[c].indexOf(aId);
      const newI = prev[c].indexOf(oId);
      const next = (oldI >= 0 && newI >= 0 && oldI !== newI) ? { ...prev, [c]: arrayMove(prev[c], oldI, newI) } : prev;
      persistir(next, ocultos);
      return next;
    });
  };

  const moverPara = (id: string, dest: keyof Cols) => {
    setCols((prev) => {
      const from = containerDe(prev, id);
      if (!from || from === dest) return prev;
      const next = { ...prev, [from]: prev[from].filter((x) => x !== id), [dest]: [id, ...prev[dest]] };
      persistir(next, ocultos);
      return next;
    });
    setMenuCardAberto(null);
  };
  const alternarLargura = (id: string) => {
    if (containerDe(cols, id) === 'full') moverPara(id, cols.a.length <= cols.b.length ? 'a' : 'b');
    else moverPara(id, 'full');
  };
  const removerBloco = (id: string) => {
    const next = ocultos.includes(id) ? ocultos : [...ocultos, id];
    setOcultos(next); persistir(cols, next); setMenuCardAberto(null);
  };
  const alternarVisibilidade = (id: string) => {
    const next = ocultos.includes(id) ? ocultos.filter((x) => x !== id) : [...ocultos, id];
    setOcultos(next); persistir(cols, next);
  };
  const restaurarPadrao = () => {
    const d = distribuicaoPadrao();
    setCols(d); setOcultos([]); persistir(d, []); setGerenciadorAberto(false);
  };

  // Mapa despesa -> categoria
  const catDeDespesa = useMemo(() => {
    const m: Record<string, string> = {};
    (despesasCadastradas || []).forEach((d) => { if (d && d.nome) m[d.nome] = d.categoria || 'Sem categoria'; });
    return m;
  }, [despesasCadastradas]);

  const dadosAnuais = useMemo(() => {
    let maxValor = 0;
    const dados = meses.map((mes) => {
      const desp = lancamentos.filter((l) => l.mes === mes).reduce((acc, l) => acc + (l.valor || 0), 0);
      const fat = faturamentos[mes] || 0;
      if (desp > maxValor) maxValor = desp;
      if (fat > maxValor) maxValor = fat;
      return { mes, desp, fat };
    });
    return { dados, maxValor: maxValor > 0 ? maxValor : 1 };
  }, [meses, lancamentos, faturamentos]);

  const analiseCategorias = useMemo(() => {
    const totais: Record<string, number> = {};
    let totalGeral = 0;
    lancamentos.forEach((l) => { totais[l.despesa] = (totais[l.despesa] || 0) + (l.valor || 0); totalGeral += (l.valor || 0); });
    const dadosGrafico = Object.entries(totais).sort((a, b) => b[1] - a[1]).map(([nome, valor], index) => ({
      nome, valor, percentual: totalGeral > 0 ? (valor / totalGeral) * 100 : 0, cor: cores[index % cores.length]
    }));
    let ang = 0;
    const parts = dadosGrafico.map((item) => { const ini = ang; ang += item.percentual; return `${item.cor} ${ini}% ${ang}%`; });
    return { dados: dadosGrafico, gradiente: `conic-gradient(${parts.join(', ')})`, totalGeral };
  }, [lancamentos, corPrimaria]);

  const porMes = useMemo(() => meses.map((mes) => {
    const desp = lancamentos.filter((l) => l.mes === mes).reduce((a, l) => a + (l.valor || 0), 0);
    const fat = faturamentos[mes] || 0;
    return { mes, desp, fat, resultado: fat - desp };
  }), [meses, lancamentos, faturamentos]);

  const maxAbsResultado = useMemo(() => Math.max(1, ...porMes.map((m) => Math.abs(m.resultado))), [porMes]);

  const acumulada = useMemo(() => {
    let cf = 0, cd = 0;
    const pts = porMes.map((m) => { cf += m.fat; cd += m.desp; return { mes: m.mes, fat: cf, desp: cd, saldo: cf - cd }; });
    const todos = pts.flatMap((p) => [p.fat, p.desp, p.saldo]);
    const max = Math.max(1, ...todos);
    const min = Math.min(0, ...todos);
    return { pts, max, min };
  }, [porMes]);

  const porCategoria = useMemo(() => {
    const tot: Record<string, number> = {};
    let geral = 0;
    lancamentos.forEach((l) => { const cat = catDeDespesa[l.despesa] || 'Sem categoria'; tot[cat] = (tot[cat] || 0) + (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([nome, valor], i) => ({ nome, valor, percentual: geral > 0 ? (valor / geral) * 100 : 0, cor: cores[i % cores.length] }));
    let ang = 0;
    const parts = dados.map((d) => { const ini = ang; ang += d.percentual; return `${d.cor} ${ini}% ${ang}%`; });
    return { dados, gradiente: `conic-gradient(${parts.join(', ')})`, geral };
  }, [lancamentos, catDeDespesa, corPrimaria]);

  const porTipo = useMemo(() => {
    const rotulos: Record<string, string> = { fixa: 'Fixa', parcela: 'Parcela', previsto: 'Previsto', normal: 'Normal' };
    const coresTipo: Record<string, string> = { fixa: '#6366f1', parcela: '#8b5cf6', previsto: '#f59e0b', normal: '#64748b' };
    const tot: Record<string, number> = { fixa: 0, parcela: 0, previsto: 0, normal: 0 };
    let geral = 0;
    lancamentos.forEach((l) => { const t = (l.tipo && tot[l.tipo] !== undefined) ? l.tipo : 'normal'; tot[t] += (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.keys(tot).filter((k) => tot[k] > 0).sort((a, b) => tot[b] - tot[a]).map((k) => ({ nome: rotulos[k], valor: tot[k], percentual: geral > 0 ? (tot[k] / geral) * 100 : 0, cor: coresTipo[k] }));
    let ang = 0;
    const parts = dados.map((d) => { const ini = ang; ang += d.percentual; return `${d.cor} ${ini}% ${ang}%`; });
    return { dados, gradiente: `conic-gradient(${parts.join(', ')})`, geral };
  }, [lancamentos]);

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

  const topDespesas = useMemo(() => {
    const tot: Record<string, number> = {};
    let geral = 0;
    lancamentos.forEach((l) => { tot[l.despesa] = (tot[l.despesa] || 0) + (l.valor || 0); geral += (l.valor || 0); });
    const dados = Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, valor]) => ({ nome, valor, percentual: geral > 0 ? (valor / geral) * 100 : 0 }));
    const max = Math.max(1, ...dados.map((d) => d.valor));
    return { dados, max };
  }, [lancamentos]);

  const margem = useMemo(() => porMes.map((m) => {
    const pct = m.fat > 0 ? (m.desp / m.fat) * 100 : (m.desp > 0 ? 100 : 0);
    return { mes: m.mes, pct, fat: m.fat, desp: m.desp };
  }), [porMes]);

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

  // ===== Menu de opções (3 pontos) por card =====
  const BotaoOpcoesCard = ({ id }: { id: string }) => (
    <div className="relative shrink-0">
      <button type="button" aria-label="Opções do bloco" title="Opções do bloco"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setMenuCardAberto(menuCardAberto === id ? null : id); }}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {menuCardAberto === id && (
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-2xl">
          <button type="button" onClick={(e) => { e.stopPropagation(); alternarLargura(id); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-50">
            <span className="text-sm leading-none">{estaExpandido(id) ? '↙' : '↔'}</span>
            {estaExpandido(id) ? 'Reduzir (2 colunas)' : 'Expandir (largura total)'}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); removerBloco(id); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-50">
            <span className="text-sm leading-none">−</span>
            Remover bloco
          </button>
        </div>
      )}
    </div>
  );

  const CardShell = ({ id, titulo, extra, children }: { id: string; titulo: string; extra?: React.ReactNode; children: React.ReactNode }) => (
    <div className={cardBase} style={cardStyle} onMouseLeave={esconderTip}>
      <div className="mb-3 flex items-center gap-2 border-b border-slate-200/10 pb-2" onMouseMove={esconderTip}>
        <h3 className={`min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wider ${textStrong}`}>{titulo}</h3>
        {extra}
        <DragHandle />
        <BotaoOpcoesCard id={id} />
      </div>
      {children}
    </div>
  );

  // ===== Conteúdo de cada gráfico (sem o card externo — o CardShell provê) =====
  const cardsById: Record<string, React.ReactNode> = {};

  cardsById.comparativo = (
    <CardShell id="comparativo" titulo="Comparativo Anual" extra={
      <div className="hidden shrink-0 gap-3 text-[11px] font-bold sm:flex">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#003E73]"></span>Faturamento</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></span>Despesas</span>
      </div>}>
      <div className="relative mt-2 flex h-[240px] min-w-0 items-end gap-1 overflow-hidden border-b border-slate-200/20 pb-4 sm:h-[285px] sm:gap-2" onMouseLeave={esconderTip}>
        {gradeFundo}
        {dadosAnuais.dados.map((item) => {
          const alturaFat = (item.fat / dadosAnuais.maxValor) * 100;
          const alturaDesp = (item.desp / dadosAnuais.maxValor) * 100;
          return (
            <div key={item.mes} className="flex-1 flex flex-col items-center justify-end h-full relative"
              onMouseMove={(e) => mostrarTip(e, abrev(item.mes), [
                { label: 'Faturamento', valor: formatarMoeda(item.fat), cor: VERDE },
                { label: 'Despesas', valor: formatarMoeda(item.desp), cor: VERMELHO },
                { label: 'Saldo', valor: formatarMoeda(item.fat - item.desp), forte: true, sep: true },
              ])}>
              <div className="flex items-end justify-center w-full gap-1 h-full z-0">
                <div className="w-1/3 bg-[#003E73] rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110" style={{ height: `${alturaFat}%`, minHeight: item.fat > 0 ? '4px' : '0' }}></div>
                <div className="w-1/3 bg-[#94a3b8] rounded-t-sm shadow-sm transition-all duration-500 hover:brightness-110" style={{ height: `${alturaDesp}%`, minHeight: item.desp > 0 ? '4px' : '0' }}></div>
              </div>
              <span className={`text-[10px] font-bold mt-3 uppercase tracking-wider ${textMuted} truncate w-full text-center`}>{abrev(item.mes)}</span>
            </div>
          );
        })}
      </div>
    </CardShell>
  );

  cardsById.resultado = (
    <CardShell id="resultado" titulo="Resultado Mensal" extra={
      <div className="hidden shrink-0 gap-3 text-[11px] font-bold sm:flex">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Lucro</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>Prejuízo</span>
      </div>}>
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
              <div className="flex-1 flex items-end justify-center">{pos && <div className="w-2/3 rounded-t-sm bg-emerald-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: m.resultado > 0 ? '3px' : '0' }}></div>}</div>
              <div className="flex-1 flex items-start justify-center">{!pos && m.resultado !== 0 && <div className="w-2/3 rounded-b-sm bg-red-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: '3px' }}></div>}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">{porMes.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}</div>
    </CardShell>
  );

  cardsById.acumulada = (
    <CardShell id="acumulada" titulo="Evolução Acumulada">
      <div className="relative w-full" onMouseLeave={esconderTip}>
        <svg viewBox={`0 0 ${LW} ${LH}`} className="w-full h-[260px]" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => { const y = LP + f * (LH - 2 * LP); return <line key={i} x1={LP} y1={y} x2={LW - LP} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className={textMuted} />; })}
          {acumulada.min < 0 && <line x1={LP} y1={yOf(0)} x2={LW - LP} y2={yOf(0)} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 3" strokeWidth="1" className={textMuted} />}
          <polyline points={linhaPts('fat')} fill="none" stroke="#00b050" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={linhaPts('desp')} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={linhaPts('saldo')} fill="none" stroke={corPrimaria} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex">
          {acumulada.pts.map((p) => (
            <div key={p.mes} className="flex-1" onMouseMove={(e) => mostrarTip(e, `${abrev(p.mes)} (acum.)`, [
              { label: 'Faturamento', valor: formatarMoeda(p.fat), cor: VERDE },
              { label: 'Despesas', valor: formatarMoeda(p.desp), cor: VERMELHO },
              { label: 'Saldo', valor: formatarMoeda(p.saldo), cor: AZUL, forte: true, sep: true },
            ])}></div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-1">{acumulada.pts.map((p) => <span key={p.mes} className={`flex-1 text-center text-[9px] font-bold uppercase ${textMuted} truncate`}>{abrev(p.mes)}</span>)}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/10 pt-3 text-center">
        <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Faturamento</span><span className="block text-sm font-black text-[#00b050]">{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].fat : 0)}</span></div>
        <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Despesas</span><span className="block text-sm font-black text-red-500">{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].desp : 0)}</span></div>
        <div><span className={`block text-[10px] font-bold uppercase ${textMuted}`}>Saldo</span><span className="block text-sm font-black" style={{ color: corPrimaria }}>{formatarMoeda(acumulada.pts.length ? acumulada.pts[acumulada.pts.length - 1].saldo : 0)}</span></div>
      </div>
    </CardShell>
  );

  if (ehEmpresa) {
    cardsById.ebitda = (
      <CardShell id="ebitda" titulo="EBITDA" extra={<span className={`shrink-0 text-sm font-black ${ebitda.total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatarMoeda(ebitda.total)}</span>}>
        <p className={`mb-3 text-[11px] font-semibold ${textMuted}`}>Faturamento menos despesas operacionais (exclui amortização, depreciação, despesas financeiras e imposto sobre lucro).</p>
        <div className="relative flex h-[220px] items-stretch gap-1 sm:gap-2" onMouseLeave={esconderTip}>
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-400/40 pointer-events-none"></div>
          {ebitda.pm.map((m) => {
            const hPct = (Math.abs(m.ebitda) / ebitda.maxAbs) * 100;
            const pos = m.ebitda >= 0;
            return (
              <div key={m.mes} className="flex-1 flex flex-col relative min-w-0" onMouseMove={(e) => mostrarTip(e, abrev(m.mes), [{ label: 'EBITDA', valor: formatarMoeda(m.ebitda), cor: pos ? VERDE : VERMELHO, forte: true }])}>
                <div className="flex-1 flex items-end justify-center">{pos && <div className="w-2/3 rounded-t-sm transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: m.ebitda > 0 ? '3px' : '0', backgroundColor: corPrimaria }}></div>}</div>
                <div className="flex-1 flex items-start justify-center">{!pos && m.ebitda !== 0 && <div className="w-2/3 rounded-b-sm bg-red-500 transition-all duration-500 hover:brightness-110" style={{ height: `${hPct}%`, minHeight: '3px' }}></div>}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2">{ebitda.pm.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}</div>
      </CardShell>
    );
  }

  cardsById.margem = (
    <CardShell id="margem" titulo="Despesa sobre Faturamento">
      <p className={`mb-3 text-[11px] font-semibold ${textMuted}`}>Quanto das receitas foi consumido por despesas em cada mês.</p>
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
      <div className="mt-2 flex gap-1 sm:gap-2">{margem.map((m) => <span key={m.mes} className={`flex-1 text-center text-[10px] font-bold uppercase ${textMuted} truncate`}>{abrev(m.mes)}</span>)}</div>
    </CardShell>
  );

  cardsById.top10 = (
    <CardShell id="top10" titulo="Top 10 Maiores Despesas (Ano)">
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
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/40"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(item.valor / topDespesas.max) * 100}%`, backgroundColor: cores[i % cores.length] }}></div></div>
              </div>
              <span className={`shrink-0 text-sm font-black ${textStrong}`}>{formatarMoeda(item.valor)}</span>
            </div>
          ))}
        </div>
      ) : (<div className="text-slate-400 italic text-sm py-10">Nenhuma despesa registrada no ano.</div>)}
    </CardShell>
  );

  const donut = (titulo: string, id: string, dados: { nome: string; valor: number; percentual: number; cor: string }[], gradiente: string, geral: number, centro: string, mostrarValor: boolean) => (
    <CardShell id={id} titulo={titulo}>
      {geral > 0 ? (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative flex shrink-0 items-center justify-center self-center">
            <div className="w-40 h-40 rounded-full shadow-inner" style={{ background: gradiente }}></div>
            <div className={`absolute w-20 h-20 ${bgCard} rounded-full shadow-xl flex items-center justify-center`}><span className={`text-[10px] font-black uppercase ${textMuted} text-center px-1`}>{centro}</span></div>
          </div>
          <div className="grid w-full min-w-0 flex-1 gap-2 self-center pr-1" onMouseLeave={esconderTip}>
            {dados.map((item) => (
              <div key={item.nome} className="flex items-center justify-between gap-3 text-xs cursor-default"
                onMouseMove={(e) => mostrarTip(e, item.nome, [
                  { label: 'Total', valor: formatarMoeda(item.valor), cor: item.cor },
                  { label: 'Participação', valor: `${item.percentual.toFixed(1)}%`, forte: true, sep: true },
                ])}>
                <div className="flex items-center gap-2 min-w-0"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }}></span><span className={`font-semibold ${textStrong} truncate`}>{item.nome}</span></div>
                <span className="font-bold text-slate-500 shrink-0 whitespace-nowrap">{mostrarValor ? `${formatarMoeda(item.valor)} · ` : ''}{item.percentual.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (<div className="py-10 text-center text-sm italic text-slate-400">Nenhuma despesa registrada.</div>)}
    </CardShell>
  );

  cardsById.distribuicao = donut('Distribuição de Gastos', 'distribuicao', analiseCategorias.dados, analiseCategorias.gradiente, analiseCategorias.totalGeral, 'Total Ano', false);
  cardsById.tipo = donut('Composição por Tipo', 'tipo', porTipo.dados, porTipo.gradiente, porTipo.geral, 'Tipos', true);
  cardsById.categoria = donut('Gastos por Categoria', 'categoria', porCategoria.dados, porCategoria.gradiente, porCategoria.geral, 'Categorias', false);

  return (
    <>
    <main className="w-full min-w-0 max-w-full overflow-x-hidden animate-fade-in">
      <div className="relative mb-5 flex min-w-0 items-center sm:mb-6">
        <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
        <h2 className={`min-w-0 flex-1 break-words text-xl font-black sm:text-2xl ${textStrong} uppercase tracking-wider`}>Análise Gráfica</h2>
        <button type="button" onClick={() => setGerenciadorAberto(!gerenciadorAberto)} title="Organizar blocos" aria-label="Organizar blocos"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:scale-110 active:scale-95 ${darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.17V20h2.83L17.81 9.02l-2.83-2.83L4 17.17Z" /><path d="M19.71 7.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.05 1.05 2.83 2.83.97-1.13Z" /></svg>
        </button>

        {gerenciadorAberto && (
          <div className={`absolute right-0 top-10 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border p-4 shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-black">Organizar blocos</h3><p className={`mt-0.5 text-xs font-semibold ${textMuted}`}>Exiba, oculte, arraste e redimensione os gráficos.</p></div>
              <button type="button" onClick={() => setGerenciadorAberto(false)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} aria-label="Fechar">×</button>
            </div>
            <div className="grid gap-1">
              {catalogo.map((card) => {
                const visivel = !ocultos.includes(card.id);
                return (
                  <button key={card.id} type="button" onClick={() => alternarVisibilidade(card.id)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 text-left transition ${darkMode ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                    <span className={`flex h-4 w-8 shrink-0 items-center rounded-full p-0.5 transition ${visivel ? 'justify-end' : 'justify-start bg-slate-300'}`} style={{ backgroundColor: visivel ? corPrimaria : undefined }}><span className="h-3 w-3 rounded-full bg-white shadow" /></span>
                    <span className={`min-w-0 flex-1 truncate text-xs font-black ${textStrong}`}>{card.titulo}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={restaurarPadrao} className={`mt-3 w-full rounded-xl border px-3 py-2 text-xs font-black transition ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Restaurar padrão</button>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-6">
          {visiveis(cols.full).length > 0 && (
            <Coluna id="full" items={visiveis(cols.full)} isEmpty={false} arrastando={!!activeId}>
              {visiveis(cols.full).map((id) => (
                <SortableItem key={id} id={id} className="w-full min-w-0">{cardsById[id]}</SortableItem>
              ))}
            </Coluna>
          )}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {(['a', 'b'] as (keyof Cols)[]).map((colId) => (
              <Coluna key={colId} id={colId} items={visiveis(cols[colId])} isEmpty={visiveis(cols[colId]).length === 0} arrastando={!!activeId} className="min-w-0 flex-1">
                {visiveis(cols[colId]).map((id) => (
                  <SortableItem key={id} id={id} className="w-full min-w-0">{cardsById[id]}</SortableItem>
                ))}
              </Coluna>
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{activeId && cardsById[activeId] ? <div className="cursor-grabbing rounded-2xl shadow-2xl">{cardsById[activeId]}</div> : null}</DragOverlay>
      </DndContext>
    </main>

    {typeof document !== 'undefined' && tip && createPortal(
      <div className="pointer-events-none fixed z-[9999] w-48 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-2xl" style={{ left: `min(max(${tip.x + 14}px, 8px), calc(100vw - 200px))`, top: `max(${tip.y - 38}px, 8px)` }}>
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
