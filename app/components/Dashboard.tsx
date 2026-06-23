import React, { useState, useContext, createContext } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const HandleContext = createContext<Record<string, any> | null>(null);

function DragHandle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const h = useContext(HandleContext);
  return (
    <button
      {...(h || {})}
      type="button"
      aria-label="Arrastar para reordenar"
      title="Arrastar para reordenar"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded cursor-grab active:cursor-grabbing select-none transition ${
        tone === 'light' ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="7" cy="5" r="1.6" /><circle cx="13" cy="5" r="1.6" />
        <circle cx="7" cy="10" r="1.6" /><circle cx="13" cy="10" r="1.6" />
        <circle cx="7" cy="15" r="1.6" /><circle cx="13" cy="15" r="1.6" />
      </svg>
    </button>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const handleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };
  return (
    <div ref={setNodeRef} style={style}>
      <HandleContext.Provider value={handleProps}>{children}</HandleContext.Provider>
    </div>
  );
}

function ColunaKanban({ id, items, children }: { id: string; items: string[]; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-6">
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

interface DashboardProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  anoSelecionado: string;
  setAnoSelecionado: React.Dispatch<React.SetStateAction<string>>;
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
  inputFaturamento: string;
  setInputFaturamento: (val: string) => void;
  placeholderFaturamento: string;
  solicitarFaturamentoDashboard: () => void;
  excluirTotalMes: () => void;
  faturamentoDoMes: number;

  entradaFaturamentoDia: string;
  setEntradaFaturamentoDia: (val: string) => void;
  entradaFaturamentoOrigem: string;
  setEntradaFaturamentoOrigem: (val: string) => void;
  entradaFaturamentoValor: string;
  handleEntradaFaturamentoValorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  solicitarEntradaFaturamentoDashboard: () => void;

  receitasTotais: number;
  despesasTotais: number;
  lucroTotalAnual: number;
  formatarMoeda: (valor: number) => string;
  despesasAConfirmar: any[];
  onConfirmarPrevista: (id: any) => void;
  onAjustarPrevista: (despesa: any) => void;
  onExcluirPrevista: (id: any) => void;
  saldoCardMesIdx: number;
  setSaldoCardMesIdx: (idx: number) => void;
  saldoInicial: number;
  saldoFinal: number;
  saldoPrevisto: number;
  dashboardOrdem: { a: string[]; b: string[] };
  dashboardOcultos: string[];
  onReordenarDashboard: (ordem: { a: string[]; b: string[] }) => void;
  onOcultarCardDashboard: (id: string) => void;
  onDefinirOcultosDashboard: (ids: string[]) => void;
}

export default function Dashboard({
  meses, lancamentos, faturamentos, anoSelecionado, setAnoSelecionado, setMesAtivo, bgCard, corPrimaria, textStrong, textMuted, darkMode,
  mesResumoDash, setMesResumoDash, totalDespesasMes, maiorGasto, lucroOperacional,
  inputFaturamento, setInputFaturamento, placeholderFaturamento,
  solicitarFaturamentoDashboard,
  excluirTotalMes,
  faturamentoDoMes,
  entradaFaturamentoDia,
  setEntradaFaturamentoDia,
  entradaFaturamentoOrigem,
  setEntradaFaturamentoOrigem,
  entradaFaturamentoValor,
  handleEntradaFaturamentoValorChange,
  solicitarEntradaFaturamentoDashboard,
  receitasTotais, despesasTotais, lucroTotalAnual, formatarMoeda,
  despesasAConfirmar, onConfirmarPrevista, onAjustarPrevista, onExcluirPrevista,
  saldoCardMesIdx, setSaldoCardMesIdx, saldoInicial, saldoFinal, saldoPrevisto,
  dashboardOrdem, dashboardOcultos, onReordenarDashboard,
  onOcultarCardDashboard, onDefinirOcultosDashboard
}: DashboardProps) {

  const [ocultarValores, setOcultarValores] = useState(true);
  const [menuCardAberto, setMenuCardAberto] = useState<string | null>(null);
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false);
  const [evolucaoModo, setEvolucaoModo] = useState<'ambos' | 'receitas' | 'despesas'>('ambos');
  const [tooltipEvolucao, setTooltipEvolucao] = useState<{
    x: number;
    y: number;
    mes: string;
    receitas: number;
    despesas: number;
  } | null>(null);
  const [cols, setCols] = useState(dashboardOrdem);
  const [ordemAnterior, setOrdemAnterior] = useState(dashboardOrdem);
  if (ordemAnterior !== dashboardOrdem) {
    setOrdemAnterior(dashboardOrdem);
    setCols(dashboardOrdem);
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
  const abreviarMes = (mes: string) => {
  const abreviacoes: Record<string, string> = {
    JANEIRO: 'JAN',
    FEVEREIRO: 'FEV',
    MARÇO: 'MAR',
    ABRIL: 'ABR',
    MAIO: 'MAI',
    JUNHO: 'JUN',
    JULHO: 'JUL',
    AGOSTO: 'AGO',
    SETEMBRO: 'SET',
    OUTUBRO: 'OUT',
    NOVEMBRO: 'NOV',
    DEZEMBRO: 'DEZ',
  };

  return abreviacoes[mes] || mes;
};
  const indiceMesResumoDash = meses.indexOf(mesResumoDash);

const mesAnteriorResumoDash =
  indiceMesResumoDash > 0 ? meses[indiceMesResumoDash - 1] : null;

const lancamentosMesAnteriorResumoDash = mesAnteriorResumoDash
  ? lancamentos.filter((l) => l.mes === mesAnteriorResumoDash)
  : [];

const totalDespesasMesAnteriorResumoDash =
  lancamentosMesAnteriorResumoDash.reduce(
    (acc, lanc) => acc + Number(lanc.valor || 0),
    0
  );

const percentualDespesasResumoDash =
  totalDespesasMesAnteriorResumoDash > 0
    ? (totalDespesasMes / totalDespesasMesAnteriorResumoDash) * 100
    : 0;

const percentualBarraResumoDash = Math.min(percentualDespesasResumoDash, 100);

const corBarraResumoDash =
  percentualDespesasResumoDash >= 100
    ? '#ef4444'
    : percentualDespesasResumoDash >= 80
      ? '#f97316'
      : percentualDespesasResumoDash >= 50
        ? '#f59e0b'
        : '#22c55e';

const mostrarComparativoResumoDash =
  !!mesAnteriorResumoDash && totalDespesasMesAnteriorResumoDash > 0;

  const formatarValorCompacto = (valor: number) => {
    const abs = Math.abs(valor);
    if (abs >= 1000000) {
      const v = valor / 1000000;
      return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1).replace('.', ',')}M`;
    }
    if (abs >= 1000) {
      const v = valor / 1000;
      return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1).replace('.', ',')}k`;
    }
    return String(Math.round(valor));
  };

  const escalaEvolucao = (valorMaximo: number) => {
    const valor = Math.max(0, Number(valorMaximo || 0));
    const passos = [
      { limite: 100, passo: 10 },
      { limite: 500, passo: 50 },
      { limite: 1000, passo: 100 },
      { limite: 5000, passo: 500 },
      { limite: 10000, passo: 1000 },
      { limite: 50000, passo: 5000 },
      { limite: 100000, passo: 10000 },
      { limite: 500000, passo: 50000 },
      { limite: 1000000, passo: 100000 },
      { limite: 5000000, passo: 500000 },
      { limite: 10000000, passo: 1000000 },
      { limite: 50000000, passo: 5000000 },
      { limite: 100000000, passo: 10000000 },
    ];
    const faixa = passos.find((item) => valor <= item.limite) || { passo: 100000000 };
    const maximo = Math.max(faixa.passo, (Math.floor(valor / faixa.passo) + 1) * faixa.passo);

    return { maximo, passo: faixa.passo };
  };

  const dadosEvolucao = meses.map((mes) => {
    const receitas = Number(faturamentos[mes] || 0);
    const despesas = lancamentos
      .filter((l) => l.mes === mes && l.status !== 'cancelada')
      .reduce((total, l) => total + Number(l.valor || 0), 0);

    return { mes, receitas, despesas };
  });

  const maiorValorEvolucao = Math.max(
    0,
    ...dadosEvolucao.map((item) =>
      evolucaoModo === 'receitas'
        ? item.receitas
        : evolucaoModo === 'despesas'
          ? item.despesas
          : Math.max(item.receitas, item.despesas)
    )
  );
  const escalaCalculadaEvolucao = escalaEvolucao(maiorValorEvolucao);
  const escalaMaxEvolucao = escalaCalculadaEvolucao.maximo;
  const marcasEscalaEvolucao = Array.from(
    { length: Math.floor(escalaMaxEvolucao / escalaCalculadaEvolucao.passo) + 1 },
    (_, index) => escalaMaxEvolucao - index * escalaCalculadaEvolucao.passo
  );

  const alturaBarraEvolucao = (valor: number) =>
    `${Math.max(2, Math.min(100, (Number(valor || 0) / escalaMaxEvolucao) * 100))}%`;

  const anosDisponiveis = Array.from(
    { length: new Date().getFullYear() + 5 - 2024 + 1 },
    (_, i) => (2024 + i).toString()
  );

  const temAConfirmar = !!(despesasAConfirmar && despesasAConfirmar.length > 0);
  const catalogoCardsKanban = [
    { id: 'aConfirmar', titulo: 'Despesas a confirmar', descricao: 'Banner de despesas previstas que chegaram na data.' },
    { id: 'saldo', titulo: 'Saldo do mês', descricao: 'Inicial, final e previsto do mês selecionado.' },
    { id: 'resumoFinanceiro', titulo: 'Resumo financeiro', descricao: 'Despesas, maior gasto e lucro operacional.' },
    { id: 'evolucaoMensal', titulo: 'Evolução mensal', descricao: 'Gráfico mensal de receitas e despesas.' },
    { id: 'registrarEntradas', titulo: 'Registrar entradas', descricao: 'Lançamento de receitas e total mensal.' },
  ];
  const ocultosSet = new Set(dashboardOcultos || []);

  const alternarVisibilidadeCard = (id: string) => {
    const proximos = ocultosSet.has(id)
      ? dashboardOcultos.filter((cardId) => cardId !== id)
      : [...dashboardOcultos, id];

    onDefinirOcultosDashboard(proximos);
  };

  const BotaoOpcoesCard = ({ id, tone = 'dark' }: { id: string; tone?: 'dark' | 'light' }) => (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Opções do bloco"
        title="Opções do bloco"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setMenuCardAberto(menuCardAberto === id ? null : id);
        }}
        className={`flex h-6 w-6 items-center justify-center rounded transition ${
          tone === 'light'
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {menuCardAberto === id && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0 top-8 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-2xl"
        >
          {id === 'evolucaoMensal' && (
            <>
              {[
                ['ambos', 'Receitas e despesas'],
                ['receitas', 'Somente receitas'],
                ['despesas', 'Somente despesas'],
              ].map(([modo, label]) => (
                <button
                  key={modo}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEvolucaoModo(modo as 'ambos' | 'receitas' | 'despesas');
                    setMenuCardAberto(null);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  {label}
                  {evolucaoModo === modo && <span style={{ color: corPrimaria }}>✓</span>}
                </button>
              ))}
              <div className="my-1 border-t border-slate-100" />
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuCardAberto(null);
              onOcultarCardDashboard(id);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <span className="text-sm leading-none">−</span>
            Remover bloco
          </button>
        </div>
      )}
    </div>
  );

  const findColumn = (id: string): 'a' | 'b' | null => {
    if (id === 'a' || id === 'b') return id;
    if (cols.a.includes(id)) return 'a';
    if (cols.b.includes(id)) return 'b';
    return null;
  };

  const filtraColuna = (arr: string[]) => arr.filter((id) =>
    !ocultosSet.has(id) && (id !== 'aConfirmar' || temAConfirmar)
  );
  const colsView = { a: filtraColuna(cols.a), b: filtraColuna(cols.b) };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = findColumn(activeKey);
    const to = findColumn(overKey);
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const fromItems = prev[from].filter((x) => x !== activeKey);
      const overItems = prev[to];
      let idx = overItems.indexOf(overKey);
      if (idx < 0) idx = overItems.length;
      const toItems = [...overItems.slice(0, idx), activeKey, ...overItems.slice(idx)];
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) { onReordenarDashboard(cols); return; }
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const col = findColumn(activeKey);
    if (!col) { onReordenarDashboard(cols); return; }
    const items = cols[col];
    const oldIndex = items.indexOf(activeKey);
    const newIndex = items.indexOf(overKey);
    let novo = cols;
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      novo = { ...cols, [col]: arrayMove(items, oldIndex, newIndex) };
      setCols(novo);
    }
    onReordenarDashboard(novo);
  };

  const cardsById: Record<string, React.ReactNode> = {
    aConfirmar: temAConfirmar ? (
      <div className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="flex-1 text-sm font-black text-amber-900">
            {despesasAConfirmar.length} despesa{despesasAConfirmar.length > 1 ? 's' : ''} prevista{despesasAConfirmar.length > 1 ? 's' : ''} para confirmar
          </h3>
          <strong className="text-sm font-black text-amber-900">
            {formatarMoeda(despesasAConfirmar.reduce((s, i) => s + Number(i.valor || 0), 0))}
          </strong>
          <DragHandle />
          <BotaoOpcoesCard id="aConfirmar" />
        </div>
        <p className="mt-1 text-xs font-semibold text-amber-700">
          Já entraram no total pelo valor previsto. Confirme, ajuste o valor ou exclua.
        </p>
        <div className="mt-4 grid gap-2">
          {despesasAConfirmar.map((d) => (
            <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{d.despesa}</p>
                <p className="truncate text-xs text-slate-500">{d.mes} · Dia {d.dia}{d.descricao ? ` - ${d.descricao}` : ''}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <strong className="mr-2 text-sm font-black text-red-600">{formatarMoeda(Number(d.valor || 0))}</strong>
                <button type="button" onClick={() => onConfirmarPrevista(d.id)} className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer">Confirmar</button>
                <button type="button" onClick={() => onAjustarPrevista(d)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer">Ajustar valor</button>
                <button type="button" onClick={() => onExcluirPrevista(d.id)} className="h-9 rounded-lg border border-red-200 bg-white px-3 text-xs font-black text-red-600 hover:bg-red-50 cursor-pointer">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null,

    saldo: (
      <div className={`${bgCard} w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Saldo do mês</span>
          <div className="flex items-center gap-2">
            <select value={meses[saldoCardMesIdx]} onChange={e => setSaldoCardMesIdx(meses.indexOf(e.target.value))} className="text-xs rounded p-1 outline-none font-bold cursor-pointer border" style={{ color: textoSobreCorPrimaria, backgroundColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.08)' : 'rgba(0, 0, 0, 0.20)', borderColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)' }}>
              {meses.map(m => <option key={m} value={m} className="text-slate-800 bg-white">{m}</option>)}
            </select>
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="saldo" tone="light" />
          </div>
        </div>
        <div className="p-5 space-y-2.5">
          <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
            <span className={`font-semibold text-sm ${textMuted}`}>Inicial</span>
            <span className={`font-semibold text-base tabular-nums tracking-tight ${textStrong}`}>{formatarMoeda(saldoInicial)}</span>
          </div>
          <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
            <span className={`font-semibold text-sm ${textMuted}`}>Final</span>
            <span className={`font-semibold text-base tabular-nums tracking-tight ${saldoFinal >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(saldoFinal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`font-semibold text-sm ${textMuted}`}>Previsto</span>
            <span className={`font-semibold text-base tabular-nums tracking-tight ${saldoPrevisto >= 0 ? 'text-cyan-500' : 'text-red-500'}`}>{formatarMoeda(saldoPrevisto)}</span>
          </div>
        </div>
      </div>
    ),

    resumoFinanceiro: (
      <div className={`${bgCard} w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Resumo Financeiro</span>
          <div className="flex items-center gap-2">
            <select value={mesResumoDash} onChange={e => setMesResumoDash(e.target.value)} className="text-xs rounded p-1 outline-none font-bold cursor-pointer border" style={{ color: textoSobreCorPrimaria, backgroundColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.08)' : 'rgba(0, 0, 0, 0.20)', borderColor: corEhClara(corPrimaria) ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)' }}>
              {meses.map(m => <option key={m} value={m} className="text-slate-800 bg-white">{m}</option>)}
            </select>
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="resumoFinanceiro" tone="light" />
          </div>
        </div>
        <div className="p-5 space-y-2.5">
          <div className={`pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-semibold text-sm ${textMuted}`}>Total Despesas</span>
              <span className={`font-semibold text-base tabular-nums tracking-tight ${textStrong}`}>{formatarMoeda(totalDespesasMes)}</span>
            </div>
            <div className="mt-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>{mostrarComparativoResumoDash ? `Vs. ${mesAnteriorResumoDash}` : 'Vs. mês ant.'}</span>
                <span className="text-xs font-black" style={{ color: mostrarComparativoResumoDash ? corBarraResumoDash : '#94a3b8' }}>{mostrarComparativoResumoDash ? `${percentualDespesasResumoDash.toFixed(1)}%` : '--'}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: mostrarComparativoResumoDash ? `${percentualBarraResumoDash}%` : '0%', backgroundColor: mostrarComparativoResumoDash ? corBarraResumoDash : '#94a3b8' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>Atual: {formatarMoeda(totalDespesasMes)}</span>
                <span>Ant.: {mostrarComparativoResumoDash ? formatarMoeda(totalDespesasMesAnteriorResumoDash) : '--'}</span>
              </div>
            </div>
          </div>
          <div className={`flex justify-between items-center pb-2.5 border-b border-dotted ${darkMode ? 'border-slate-500/50' : 'border-slate-300'}`}>
            <div className="flex flex-col">
              <span className={`font-semibold text-sm ${textMuted}`}>Maior Gasto</span>
              <span className="text-xs text-slate-400 mt-0.5">{maiorGasto.despesa || 'Nenhuma'}</span>
            </div>
            <span className={`font-semibold text-base tabular-nums tracking-tight ${maiorGasto.valor > 0 ? 'text-red-500' : textMuted}`}>{maiorGasto.valor > 0 ? formatarMoeda(maiorGasto.valor) : '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`font-semibold text-sm ${textMuted}`}>Lucro Operacional</span>
            <span className={`font-semibold text-base tabular-nums tracking-tight ${lucroOperacional >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroOperacional)}</span>
          </div>
        </div>
      </div>
    ),

    evolucaoMensal: (
      <div className={`${bgCard} w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className={`text-base font-black ${textStrong}`}>Evolução mensal</h3>
            <p className={`mt-0.5 text-[11px] font-semibold ${textMuted}`}>
              {evolucaoModo === 'receitas'
                ? 'Receitas por mês'
                : evolucaoModo === 'despesas'
                  ? 'Despesas por mês'
                  : 'Receitas e despesas por mês'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className={`h-8 rounded-lg border px-2 text-xs font-black outline-none ${
                darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano} className="bg-white text-slate-800">{ano}</option>
              ))}
            </select>
            <DragHandle />
            <BotaoOpcoesCard id="evolucaoMensal" />
          </div>
        </div>

        <div data-evolucao-card className="relative px-5 pb-5 pt-1" onMouseLeave={() => setTooltipEvolucao(null)}>
          <div className="mb-3 flex items-center gap-3 pl-9 text-[10px] font-black uppercase tracking-wide">
            {evolucaoModo !== 'despesas' && (
              <span className="flex items-center gap-1.5 text-sky-600">
                <span className="h-2 w-2 rounded-full bg-sky-500" /> Receitas
              </span>
            )}
            {evolucaoModo !== 'receitas' && (
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Despesas
              </span>
            )}
          </div>

          <div className="grid h-[238px] grid-cols-[28px_minmax(0,1fr)] gap-2">
            <div className="relative text-right text-[10px] font-black tabular-nums text-slate-400">
              {marcasEscalaEvolucao.map((marca, index) => (
                <span
                  key={`${marca}-${index}`}
                  className="absolute right-0 -translate-y-1/2"
                  style={{ top: `${((escalaMaxEvolucao - marca) / escalaMaxEvolucao) * 100}%` }}
                >
                  {formatarValorCompacto(marca)}
                </span>
              ))}
            </div>

            <div className="relative">
              {marcasEscalaEvolucao.map((marca) => (
                <span
                  key={marca}
                  className="absolute left-0 right-0 h-px bg-slate-200/80"
                  style={{ top: `${((escalaMaxEvolucao - marca) / escalaMaxEvolucao) * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 grid grid-cols-12 items-end gap-1 px-0.5">
                {dadosEvolucao.map((item) => {
                  const mesAbrev = abreviarMes(item.mes);
                  return (
                    <div
                      key={item.mes}
                      className="group relative flex h-full min-w-0 items-end justify-center gap-0.5 pb-7"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.closest('[data-evolucao-card]')?.getBoundingClientRect();
                        setTooltipEvolucao({
                          x: rect ? e.clientX - rect.left : e.nativeEvent.offsetX,
                          y: rect ? e.clientY - rect.top : e.nativeEvent.offsetY,
                          mes: mesAbrev,
                          receitas: item.receitas,
                          despesas: item.despesas,
                        });
                      }}
                    >
                      {evolucaoModo !== 'despesas' && (
                        <span
                          className={`w-full max-w-[12px] rounded-t-md bg-gradient-to-b from-sky-400 to-sky-600 shadow-sm transition group-hover:brightness-110 ${
                            evolucaoModo === 'ambos' ? 'max-w-[9px]' : ''
                          }`}
                          style={{ height: alturaBarraEvolucao(item.receitas) }}
                        />
                      )}
                      {evolucaoModo !== 'receitas' && (
                        <span
                          className={`w-full max-w-[12px] rounded-t-md bg-gradient-to-b from-rose-400 to-rose-600 shadow-sm transition group-hover:brightness-110 ${
                            evolucaoModo === 'ambos' ? 'max-w-[9px]' : ''
                          }`}
                          style={{ height: alturaBarraEvolucao(item.despesas) }}
                        />
                      )}
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400">
                        {mesAbrev}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            {tooltipEvolucao && (
              <div
                className="absolute z-30 w-44 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-2xl"
                style={{
                  left: Math.min(Math.max(tooltipEvolucao.x + 12, 8), 350),
                  top: Math.max(tooltipEvolucao.y - 20, 8),
                }}
              >
                <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/60">{tooltipEvolucao.mes} {anoSelecionado}</p>
                {evolucaoModo !== 'despesas' && (
                  <div className="flex justify-between gap-3 text-[11px] font-bold">
                    <span>Receitas</span>
                    <strong>{formatarMoeda(tooltipEvolucao.receitas)}</strong>
                  </div>
                )}
                {evolucaoModo !== 'receitas' && (
                  <div className="flex justify-between gap-3 text-[11px] font-bold">
                    <span>Despesas</span>
                    <strong>{formatarMoeda(tooltipEvolucao.despesas)}</strong>
                  </div>
                )}
                {evolucaoModo === 'ambos' && (
                  <div className="mt-1 flex justify-between gap-3 border-t border-white/15 pt-1 text-[11px] font-black text-cyan-200">
                    <span>Saldo</span>
                    <strong>{formatarMoeda(tooltipEvolucao.receitas - tooltipEvolucao.despesas)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ),

    registrarEntradas: (
      <div className={bgCard + " w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors"} style={{ borderColor: corPrimaria }}>
        <div className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>REGISTRAR ENTRADAS</span>
          <div className="flex items-center gap-2">
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="registrarEntradas" tone="light" />
          </div>
        </div>
        <div className="p-5 space-y-3">
          <section className={(darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50') + ' rounded-xl border p-3'}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className={textMuted + " text-[10px] font-black uppercase tracking-wide"}>Lançar receita</p>
            </div>
            <div className="grid grid-cols-[64px_1fr] gap-2 mb-2">
              <input type="number" min="1" max="31" value={entradaFaturamentoDia} onChange={(e) => setEntradaFaturamentoDia(e.target.value)} placeholder="Dia" className="w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-inner outline-none" />
              <input type="text" value={entradaFaturamentoOrigem} onChange={(e) => setEntradaFaturamentoOrigem(e.target.value)} placeholder="Origem da entrada" className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-inner outline-none" />
            </div>
            <div className="flex gap-2">
              <div className="relative w-full">
                <input type="text" value={entradaFaturamentoValor} onChange={handleEntradaFaturamentoValorChange} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); solicitarEntradaFaturamentoDashboard(); } }} placeholder="0,00" className="w-full px-4 py-2 rounded-lg bg-white text-slate-800 font-bold focus:outline-none shadow-inner text-right" />
              </div>
              <button onClick={solicitarEntradaFaturamentoDashboard} className="px-4 rounded-lg font-bold border shadow-md text-xs transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:scale-[1.03] active:scale-95 active:shadow-inner cursor-pointer select-none" style={{ color: '#ffffff', backgroundColor: '#059669', borderColor: '#047857' }}>Lançar</button>
            </div>
          </section>
          <section className={(darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50') + ' rounded-xl border p-3'}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: corPrimaria }} />
              <p className={textMuted + " text-[10px] font-black uppercase tracking-wide"}>Definir total do mês</p>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full">
                <input type="text" value={inputFaturamento} onChange={handleInputFaturamento} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); solicitarFaturamentoDashboard(); } }} placeholder={placeholderFaturamento || '0,00'} className="w-full px-4 py-2.5 rounded-lg bg-white text-slate-800 font-bold focus:outline-none shadow-inner text-right" />
              </div>
              <button onClick={solicitarFaturamentoDashboard} className="px-4 rounded-lg font-bold border shadow-md text-xs transition-all duration-200 hover:brightness-110 hover:shadow-lg hover:scale-[1.03] active:scale-95 active:shadow-inner cursor-pointer select-none" style={{ color: textoSobreCorPrimaria, backgroundColor: corPrimaria, borderColor: corPrimaria }}>Definir</button>
            </div>
            {faturamentoDoMes > 0 && (
              <button type="button" onClick={excluirTotalMes} className={"mt-2 w-full rounded-lg border px-3 py-1.5 text-xs font-black transition cursor-pointer " + (darkMode ? "border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100")}>Excluir total do mês</button>
            )}
          </section>
        </div>
      </div>
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <main className="grid w-full grid-cols-1 xl:grid-cols-3 items-start gap-6 animate-fade-in print:m-0 print:p-0">

      <section
        className={`${bgCard} w-full p-6 rounded-2xl shadow-lg border border-t-4 transition-colors`}
        style={{ borderTopColor: corPrimaria }}
      >
        <h2 className={`text-2xl font-black ${textStrong} mb-10 flex items-center`}>
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          LANÇAMENTOS MENSAIS
        </h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {meses.map((mes) => (
            <button 
              key={mes} 
              onClick={() => setMesAtivo(mes)}
              className={`${darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-50 hover:bg-white border-slate-200'} border-2 rounded-xl shadow-sm hover:shadow-md transition-all font-bold ${textMuted} text-xs flex items-center justify-center group h-14 cursor-pointer`}
              onMouseOver={e => { e.currentTarget.style.color = corPrimaria; e.currentTarget.style.borderColor = corPrimaria; }}
              onMouseOut={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
            >
              <span className="group-hover:scale-105 transition-transform">
  <span className="hidden xl:inline">{mes}</span>
  <span className="inline xl:hidden">{abreviarMes(mes)}</span>
</span>
            </button>
          ))}
        </div>

        <div
          className={`mt-8 rounded-xl border p-5 ${
            darkMode
              ? 'border-slate-700 bg-slate-800/70'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/10 pb-3">
            <h3 className={`font-bold ${textStrong} text-sm uppercase tracking-wider`}>
              Resumo Anual
            </h3>

            <button
              type="button"
              onClick={() => setOcultarValores(!ocultarValores)}
              className="rounded p-1 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
              title={ocultarValores ? "Mostrar valores" : "Ocultar valores"}
            >
              {ocultarValores ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-4">
            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Receitas
              </span>
              <span className={`mt-1 block text-base font-semibold tabular-nums tracking-tight ${ocultarValores ? textMuted : 'text-emerald-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(receitasTotais)}
              </span>
            </div>

            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Despesas
              </span>
              <span className={`mt-1 block text-base font-semibold tabular-nums tracking-tight ${ocultarValores ? textMuted : 'text-red-500'}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(despesasTotais)}
              </span>
            </div>

            <div className="min-w-0">
              <span className={`block text-xs font-black uppercase tracking-wide ${textStrong}`}>
                Lucro
              </span>
              <span className={`mt-1 block text-base font-bold tabular-nums tracking-tight ${ocultarValores ? textMuted : (lucroTotalAnual >= 0 ? textStrong : 'text-red-500')}`}>
                {ocultarValores ? 'R$ •••••••' : formatarMoeda(lucroTotalAnual)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="xl:col-span-2 relative pt-12">
        <button
          type="button"
          onClick={() => setGerenciadorAberto(!gerenciadorAberto)}
          className={`absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] ${
            darkMode
              ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="Organizar blocos"
          aria-label="Organizar blocos"
        >
          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M16.862 4.487l1.651-1.651a2.121 2.121 0 113 3l-9.193 9.193a4 4 0 01-1.695 1.009l-3.16.948.948-3.16a4 4 0 011.009-1.695l8.44-8.44z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
          </svg>
        </button>

        {gerenciadorAberto && (
          <div className={`absolute right-0 top-11 z-40 w-80 rounded-2xl border p-4 shadow-2xl ${
            darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">Organizar blocos</h3>
                <p className={`mt-0.5 text-xs font-semibold ${textMuted}`}>Exiba ou oculte cards do kanban.</p>
              </div>
              <button
                type="button"
                onClick={() => setGerenciadorAberto(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="grid gap-2">
              {catalogoCardsKanban.map((card) => {
                const visivel = !ocultosSet.has(card.id);
                const indisponivelAgora = card.id === 'aConfirmar' && !temAConfirmar;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => alternarVisibilidadeCard(card.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${
                        visivel ? 'justify-end' : 'justify-start bg-slate-300'
                      }`}
                      style={{ backgroundColor: visivel ? corPrimaria : undefined }}
                    >
                      <span className="h-4 w-4 rounded-full bg-white shadow" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-black ${textStrong}`}>{card.titulo}</span>
                      <span className={`mt-0.5 block text-[11px] font-semibold leading-snug ${textMuted}`}>
                        {indisponivelAgora ? 'Aparece quando houver despesas previstas para confirmar.' : card.descricao}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-6">
          <ColunaKanban id="a" items={colsView.a}>
            {colsView.a.map((id) => (
              <SortableItem key={id} id={id}>{cardsById[id]}</SortableItem>
            ))}
          </ColunaKanban>
          <ColunaKanban id="b" items={colsView.b}>
            {colsView.b.map((id) => (
              <SortableItem key={id} id={id}>{cardsById[id]}</SortableItem>
            ))}
          </ColunaKanban>
        </div>
      </div>
    </main>
    <DragOverlay dropAnimation={null}>
      {activeId && cardsById[activeId] ? (
        <div className="cursor-grabbing shadow-2xl rounded-2xl">{cardsById[activeId]}</div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
