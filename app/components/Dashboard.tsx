import React, { useState, useContext, createContext, useEffect } from 'react';
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
import { createPortal, flushSync } from 'react-dom';
import { buscarFaturamentos, buscarLancamentos } from '../lib/database';

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
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const handleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };
  return (
    <div ref={setNodeRef} style={style}>
      <HandleContext.Provider value={handleProps}>{children}</HandleContext.Provider>
    </div>
  );
}

function ColunaKanban({ id, items, arrastando, className, children }: { id: keyof DashboardCols; items: string[]; arrastando: boolean; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const vazia = items.length === 0;
  const exibirAreaSoltar = vazia && arrastando;
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 flex-col gap-6 ${className || ''} ${
        exibirAreaSoltar
          ? `min-h-[120px] justify-center rounded-2xl border-2 border-dashed ${isOver ? 'border-cyan-400 bg-cyan-50/40' : 'border-slate-300/60'}`
          : ''
      }`}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {exibirAreaSoltar && (
        <p className="py-6 text-center text-xs font-bold text-slate-400">Solte um bloco aqui</p>
      )}
    </div>
  );
}

type DashboardCols = { full: string[]; a: string[]; b: string[] };

interface DashboardProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  anoSelecionado: string;
  empresaId?: string | null;
  nomePerfilAtual?: string;
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
  receitasAConfirmar: any[];
  onConfirmarReceita: (id: any) => void;
  onEditarReceita: (id: any) => void;
  onExcluirReceita: (id: any) => void;
  saldoCardMesIdx: number;
  setSaldoCardMesIdx: (idx: number) => void;
  saldoInicial: number;
  saldoFinal: number;
  saldoPrevisto: number;
  dashboardOrdem: { a: string[]; b: string[] };
  dashboardOcultos: string[];
  dashboardExpandidos: string[];
  onAtualizarLayoutDashboard: (ordem: { a: string[]; b: string[] }, expandidos: string[]) => void;
  onOcultarCardDashboard: (id: string) => void;
  onDefinirOcultosDashboard: (ids: string[]) => void;
  pontoDisponivel: boolean;
  pontoResumo: Array<{ userId: string; nome: string; status: 'atraso' | 'falta' | 'incompleto' }>;
  pontoResumoCarregando: boolean;
  pontoFuncionariosHoje: number;
  onAbrirControlePonto: () => void;
}

export default function Dashboard({
  meses, lancamentos, faturamentos, anoSelecionado, empresaId, nomePerfilAtual, setMesAtivo, bgCard, corPrimaria, textStrong, textMuted, darkMode,
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
  receitasAConfirmar, onConfirmarReceita, onEditarReceita, onExcluirReceita,
  saldoCardMesIdx, setSaldoCardMesIdx, saldoInicial, saldoFinal, saldoPrevisto,
  dashboardOrdem, dashboardOcultos, onAtualizarLayoutDashboard,
  dashboardExpandidos, onOcultarCardDashboard, onDefinirOcultosDashboard,
  pontoDisponivel, pontoResumo, pontoResumoCarregando,
  pontoFuncionariosHoje, onAbrirControlePonto
}: DashboardProps) {

  const [ocultarValores, setOcultarValores] = useState(true);
  const [menuCardAberto, setMenuCardAberto] = useState<string | null>(null);
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false);
  const [evolucaoAno, setEvolucaoAno] = useState(anoSelecionado);
  const [evolucaoLancamentos, setEvolucaoLancamentos] = useState<any[]>(lancamentos);
  const [evolucaoFaturamentos, setEvolucaoFaturamentos] = useState<Record<string, number>>(faturamentos);
  const [evolucaoCarregando, setEvolucaoCarregando] = useState(false);
  const [evolucaoModo, setEvolucaoModo] = useState<'ambos' | 'receitas' | 'despesas'>('ambos');
  const [tooltipEvolucao, setTooltipEvolucao] = useState<{
    x: number;
    y: number;
    mes: string;
    receitas: number;
    despesas: number;
  } | null>(null);
  const criarCols = (ordem: { a: string[]; b: string[] }, expandidos: string[]): DashboardCols => {
    const full = [...new Set(expandidos)];
    return {
      full,
      a: ordem.a.filter((id) => !full.includes(id)),
      b: ordem.b.filter((id) => !full.includes(id)),
    };
  };
  const [cols, setCols] = useState<DashboardCols>(() => criarCols(dashboardOrdem, dashboardExpandidos));
  const [layoutExternoAnterior, setLayoutExternoAnterior] = useState({ dashboardOrdem, dashboardExpandidos });
  if (layoutExternoAnterior.dashboardOrdem !== dashboardOrdem || layoutExternoAnterior.dashboardExpandidos !== dashboardExpandidos) {
    setLayoutExternoAnterior({ dashboardOrdem, dashboardExpandidos });
    setCols(criarCols(dashboardOrdem, dashboardExpandidos));
  }
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const horaAtual = new Date().getHours();
  const saudacaoPeriodo = horaAtual < 12 ? 'Bom dia!' : horaAtual < 18 ? 'Boa tarde!' : 'Boa noite!';

  useEffect(() => {
    let ativo = true;

    if (!empresaId || evolucaoAno === anoSelecionado) {
      setEvolucaoLancamentos(lancamentos);
      setEvolucaoFaturamentos(faturamentos);
      setEvolucaoCarregando(false);
      return () => {
        ativo = false;
      };
    }

    async function carregarEvolucaoAno() {
      setEvolucaoCarregando(true);

      const [lancamentosAno, faturamentosAno] = await Promise.all([
        buscarLancamentos(empresaId as string, Number(evolucaoAno)),
        buscarFaturamentos(empresaId as string, Number(evolucaoAno)),
      ]);

      if (!ativo) return;

      const faturamentosMap: Record<string, number> = {};
      (faturamentosAno || []).forEach((item: any) => {
        faturamentosMap[item.mes] = Number(item.valor || 0);
      });

      setEvolucaoLancamentos(lancamentosAno || []);
      setEvolucaoFaturamentos(faturamentosMap);
      setEvolucaoCarregando(false);
    }

    carregarEvolucaoAno();

    return () => {
      ativo = false;
    };
  }, [empresaId, evolucaoAno, anoSelecionado, lancamentos, faturamentos]);

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
    const receitas = Number(evolucaoFaturamentos[mes] || 0);
    const despesas = evolucaoLancamentos
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

  const qtdReceitasAConfirmar = receitasAConfirmar ? receitasAConfirmar.length : 0;
  const qtdDespesasAConfirmar = despesasAConfirmar ? despesasAConfirmar.length : 0;
  const totalAConfirmar = qtdDespesasAConfirmar + qtdReceitasAConfirmar;
  const temAConfirmar = totalAConfirmar > 0;
  const catalogoCardsKanban = [
    { id: 'aConfirmar', titulo: 'Lançamentos a confirmar', descricao: 'Banner de despesas e receitas previstas que chegaram na data.' },
    { id: 'saldo', titulo: 'Saldo do mês', descricao: 'Inicial, final e previsto do mês selecionado.' },
    { id: 'resumoFinanceiro', titulo: 'Resumo financeiro', descricao: 'Despesas, maior gasto e lucro operacional.' },
    { id: 'evolucaoMensal', titulo: 'Evolução mensal', descricao: 'Gráfico mensal de receitas e despesas.' },
    { id: 'registrarEntradas', titulo: 'Registrar entradas', descricao: 'Lançamento de receitas e total mensal.' },
    ...(pontoDisponivel ? [{ id: 'controlePonto', titulo: 'Controle de ponto', descricao: 'Pendências dos funcionários no dia atual.' }] : []),
  ];
  const ocultosSet = new Set(dashboardOcultos || []);
  const expandidosSet = new Set(cols.full);

  const alternarVisibilidadeCard = (id: string) => {
    const proximos = ocultosSet.has(id)
      ? dashboardOcultos.filter((cardId) => cardId !== id)
      : [...dashboardOcultos, id];

    onDefinirOcultosDashboard(proximos);
  };

  const alternarLarguraCard = (id: string) => {
    const aplicarMudanca = () => {
      const origem = containerDe(cols, id);
      if (!origem) return;
      const destino: keyof DashboardCols = origem === 'full'
        ? (cols.a.length <= cols.b.length ? 'a' : 'b')
        : 'full';
      const proximos = {
        ...cols,
        [origem]: cols[origem].filter((cardId) => cardId !== id),
        [destino]: [id, ...cols[destino]],
      };
      setCols(proximos);
      onAtualizarLayoutDashboard({ a: proximos.a, b: proximos.b }, proximos.full);
      setMenuCardAberto(null);
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(() => {
        flushSync(aplicarMudanca);
      });
      return;
    }

    aplicarMudanca();
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
              alternarLarguraCard(id);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <span className="text-sm leading-none">{expandidosSet.has(id) ? '↙' : '↔'}</span>
            {expandidosSet.has(id) ? 'Reduzir' : 'Expandir'}
          </button>
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

  const filtraItens = (arr: string[]) => arr.filter((id) =>
    !ocultosSet.has(id)
    && (id !== 'aConfirmar' || temAConfirmar)
    && (id !== 'controlePonto' || pontoDisponivel)
  );
  const containerDe = (ordem: DashboardCols, id: string): keyof DashboardCols | null => {
    if (id === 'full' || id === 'a' || id === 'b') return id;
    return (['full', 'a', 'b'] as (keyof DashboardCols)[]).find((coluna) => ordem[coluna].includes(id)) || null;
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeIdAtual = String(active.id);
    const overId = String(over.id);
    setCols((atuais) => {
      const origem = containerDe(atuais, activeIdAtual);
      const destino = containerDe(atuais, overId);
      if (!origem || !destino || origem === destino) return atuais;
      if ((origem === 'full') !== (destino === 'full')) return atuais;

      const itensOrigem = atuais[origem].filter((id) => id !== activeIdAtual);
      const itensDestino = atuais[destino];
      const indiceDestino = Math.max(0, itensDestino.indexOf(overId));
      return {
        ...atuais,
        [origem]: itensOrigem,
        [destino]: [...itensDestino.slice(0, indiceDestino), activeIdAtual, ...itensDestino.slice(indiceDestino)],
      };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      onAtualizarLayoutDashboard({ a: cols.a, b: cols.b }, cols.full);
      return;
    }
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const coluna = containerDe(cols, activeKey);
    if (!coluna) return;
    const oldIndex = cols[coluna].indexOf(activeKey);
    const newIndex = cols[coluna].indexOf(overKey);
    const novo = oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex
      ? { ...cols, [coluna]: arrayMove(cols[coluna], oldIndex, newIndex) }
      : cols;
    setCols(novo);
    onAtualizarLayoutDashboard({ a: novo.a, b: novo.b }, novo.full);
  };

  const cardsById: Record<string, React.ReactNode> = {
    aConfirmar: temAConfirmar ? (
      <div className="flex max-h-[60vh] w-full flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-100 px-4 py-3">
          <svg className="h-5 w-5 shrink-0" style={{ color: '#d97706' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="min-w-0 flex-1 text-sm font-black text-slate-900">
            {totalAConfirmar} lançamento{totalAConfirmar > 1 ? 's' : ''} para confirmar
          </h3>
          <DragHandle />
          <BotaoOpcoesCard id="aConfirmar" />
        </div>
        <div className="grid gap-2 overflow-y-auto p-3">
          {despesasAConfirmar.map((d) => (
            <div key={`desp-${d.id}`} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-slate-800">{d.despesa} <span className="text-xs font-semibold text-slate-400">· dia {d.dia}</span></p>
                <strong className="shrink-0 text-sm font-black text-red-600">{formatarMoeda(Number(d.valor || 0))}</strong>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => onConfirmarPrevista(d.id)} className="h-8 rounded-lg bg-emerald-600 text-[11px] font-black text-white hover:bg-emerald-700 cursor-pointer">Confirmar</button>
                <button type="button" onClick={() => onAjustarPrevista(d)} className="h-8 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-slate-700 hover:bg-slate-50 cursor-pointer">Editar</button>
                <button type="button" onClick={() => onExcluirPrevista(d.id)} className="h-8 rounded-lg border border-red-200 bg-white text-[11px] font-black text-red-600 hover:bg-red-50 cursor-pointer">Excluir</button>
              </div>
            </div>
          ))}
          {receitasAConfirmar.map((r) => (
            <div key={`rec-${r.id}`} className="rounded-xl border border-emerald-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-slate-800">{r.origem} <span className="text-xs font-semibold text-slate-400">· dia {r.dia}</span></p>
                <strong className="shrink-0 text-sm font-black text-emerald-600">{formatarMoeda(Number(r.valor || 0))}</strong>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => onConfirmarReceita(r.id)} className="h-8 rounded-lg bg-emerald-600 text-[11px] font-black text-white hover:bg-emerald-700 cursor-pointer">Confirmar</button>
                <button type="button" onClick={() => onEditarReceita(r.id)} className="h-8 rounded-lg border border-slate-300 bg-white text-[11px] font-black text-slate-700 hover:bg-slate-50 cursor-pointer">Editar</button>
                <button type="button" onClick={() => onExcluirReceita(r.id)} className="h-8 rounded-lg border border-red-200 bg-white text-[11px] font-black text-red-600 hover:bg-red-50 cursor-pointer">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null,

    controlePonto: pontoDisponivel ? (
      <div className={`${bgCard} w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm font-bold uppercase tracking-wider" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span className="min-w-0 truncate">Controle de ponto</span>
          <div className="flex items-center gap-2">
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="controlePonto" tone="light" />
          </div>
        </div>
        <div className="p-4">
          {pontoResumoCarregando ? (
            <p className={`py-3 text-center text-xs font-semibold ${textMuted}`}>Atualizando resumo...</p>
          ) : pontoFuncionariosHoje === 0 ? (
            <p className={`py-3 text-center text-xs font-semibold ${textMuted}`}>Nenhum funcionário previsto para hoje.</p>
          ) : pontoResumo.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-emerald-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">✓</span>
              Equipe em dia
            </div>
          ) : (
            <div className="grid max-h-52 gap-1 overflow-y-auto pr-1">
              {pontoResumo.map((item) => {
                const status = {
                  atraso: { label: 'Atraso', classe: 'bg-amber-100 text-amber-700' },
                  falta: { label: 'Falta', classe: 'bg-red-100 text-red-700' },
                  incompleto: { label: 'Incompleto', classe: 'bg-violet-100 text-violet-700' },
                }[item.status];
                return (
                  <div key={item.userId} className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                    <span className={`min-w-0 truncate text-xs font-bold ${textStrong}`}>{item.nome}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${status.classe}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" onClick={onAbrirControlePonto} className="mt-3 w-full border-t border-slate-200/20 pt-3 text-left text-xs font-black transition hover:opacity-75" style={{ color: corPrimaria }}>
            Ver controle de ponto
          </button>
        </div>
      </div>
    ) : null,

    saldo: (
      <div className={`${bgCard} relative w-full rounded-2xl shadow-lg border-2 overflow-visible transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center rounded-t-[14px]" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
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
      <div className={`${bgCard} w-full rounded-2xl shadow-lg border-2 overflow-visible transition-colors`} style={{ borderColor: corPrimaria }}>
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
              value={evolucaoAno}
              onChange={(e) => setEvolucaoAno(e.target.value)}
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

        <div data-evolucao-card className="relative px-4 pb-5 pt-1" onMouseLeave={() => setTooltipEvolucao(null)}>
          <div className="mb-3 flex items-center gap-3 pl-6 text-[10px] font-black uppercase tracking-wide">
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

          <div className="grid h-[238px] grid-cols-[18px_minmax(0,1fr)] gap-1.5">
            <div className="relative text-right text-[9px] font-black tabular-nums text-slate-400">
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
              <div className="absolute inset-0 grid grid-cols-12 items-end gap-1 px-0">
                {dadosEvolucao.map((item) => {
                  const mesAbrev = abreviarMes(item.mes);
                  return (
                    <div
                      key={item.mes}
                      className="group relative flex h-full min-w-0 items-end justify-center gap-0.5 pb-7"
                      onMouseMove={(e) => {
                        setTooltipEvolucao({
                          x: e.clientX,
                          y: e.clientY,
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

          {evolucaoCarregando && (
            <div className="absolute inset-x-4 top-14 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-center text-[11px] font-black text-slate-500 shadow-sm backdrop-blur">
              Carregando {evolucaoAno}...
            </div>
          )}

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
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <main className="grid w-full min-w-0 max-w-full grid-cols-1 items-start gap-6 overflow-x-hidden xl:grid-cols-3 animate-fade-in print:m-0 print:p-0">

      <div className="relative min-w-0 pt-7">
        <div className={`absolute left-1 top-0 flex h-5 max-w-full items-center gap-1.5 text-sm font-black leading-none ${textStrong}`}>
          <span className="truncate">Olá, {nomePerfilAtual || 'Empresa'}.</span>
          <span className={`shrink-0 ${textMuted}`}>{saudacaoPeriodo}</span>
        </div>

      <section
        className={`${bgCard} w-full p-6 rounded-2xl shadow-lg border border-t-4 transition-colors`}
        style={{ borderTopColor: corPrimaria }}
      >
        <h2 className={`text-2xl font-black ${textStrong} mb-10 flex items-center`}>
          <span className="w-3 h-8 rounded-full mr-4 shadow-sm" style={{ backgroundColor: corPrimaria }}></span>
          LANÇAMENTOS MENSAIS
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-3">
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
      </div>

      <div className="xl:col-span-2 relative pt-7">
        <button
          type="button"
          onClick={() => setGerenciadorAberto(!gerenciadorAberto)}
          className={`absolute right-1 top-0 flex h-5 w-5 items-center justify-center transition hover:scale-110 active:scale-95 ${
            darkMode
              ? 'text-slate-300 hover:text-white'
              : 'text-slate-700 hover:text-slate-950'
          }`}
          title="Organizar blocos"
          aria-label="Organizar blocos"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 17.17V20h2.83L17.81 9.02l-2.83-2.83L4 17.17Z" />
            <path d="M19.71 7.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.05 1.05 2.83 2.83.97-1.13Z" />
          </svg>
        </button>

        {gerenciadorAberto && (
          <div className={`absolute right-0 top-7 z-40 w-[min(20rem,calc(100vw-1.5rem))] max-w-full rounded-2xl border p-4 shadow-2xl ${
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

        <div className="flex flex-col gap-6">
          {filtraItens(cols.full).length > 0 && (
            <ColunaKanban id="full" items={filtraItens(cols.full)} arrastando={!!activeId}>
              {filtraItens(cols.full).map((id) => (
                <SortableItem key={id} id={id}>{cardsById[id]}</SortableItem>
              ))}
            </ColunaKanban>
          )}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {(['a', 'b'] as (keyof DashboardCols)[]).map((coluna) => {
              const itens = filtraItens(cols[coluna]);
              return (
                <ColunaKanban key={coluna} id={coluna} items={itens} arrastando={!!activeId} className="min-w-0 flex-1">
                  {itens.map((id) => (
                    <SortableItem key={id} id={id}>{cardsById[id]}</SortableItem>
                  ))}
                </ColunaKanban>
              );
            })}
          </div>
        </div>
      </div>
    </main>
    <DragOverlay dropAnimation={null}>
      {activeId && cardsById[activeId] ? (
        <div className="cursor-grabbing shadow-2xl rounded-2xl">{cardsById[activeId]}</div>
      ) : null}
    </DragOverlay>
    </DndContext>
    {typeof document !== 'undefined' && tooltipEvolucao && createPortal(
      <div
        className="pointer-events-none fixed z-[9999] w-44 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-2xl"
        style={{
          left: `min(max(${tooltipEvolucao.x + 14}px, 8px), calc(100vw - 188px))`,
          top: `max(${tooltipEvolucao.y - 38}px, 8px)`,
        }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-white/60">{tooltipEvolucao.mes} {evolucaoAno}</p>
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
      </div>,
      document.body
    )}
    </>
  );
}
