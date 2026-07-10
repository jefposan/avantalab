import React, { useState, useContext, createContext, useEffect, useRef, useCallback } from 'react';
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
import { restringirArrasteAJanela } from '../lib/dnd';
import { corEhClara } from '../lib/formatters';
import AvantaCard, { criarAvantaShellPreset } from './AvantaCard';

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
    visibility: isDragging ? 'hidden' : 'visible',
    zIndex: isDragging ? 50 : undefined,
    outline: 'none',
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
      className={`card-radius-avantalab flex min-h-0 flex-col gap-6 ${className || ''} ${
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

type ResumoPerfilFinanceiro = {
  id: string;
  nome: string;
  tipoPerfil?: string;
  receitas: number;
  despesas: number;
  resultado: number;
};

interface DashboardProps {
  meses: string[];
  lancamentos: any[];
  faturamentos: Record<string, number>;
  anoSelecionado: string;
  empresaId?: string | null;
  nomePerfilAtual?: string;
  resumoPerfis?: ResumoPerfilFinanceiro[];
  mesPerfis?: string;
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
  caixinhaSaldo: number;
  caixinhaSaldoInicial: number;
  caixinhaAportesMes: number;
  caixinhaUltimosMovimentos: Array<{
    id: string;
    tipo: string;
    descricao: string;
    valor: number;
    dataMovimento: string;
  }>;
  onAdicionarAporteCaixinha: (dados: { dia: string; descricao: string; valorTexto: string }) => Promise<{ ok: boolean; mensagem?: string }>;
  onDefinirSaldoInicialCaixinha: (valorTexto: string) => Promise<{ ok: boolean; mensagem?: string }>;
  dashboardOrdem: { a: string[]; b: string[] };
  dashboardOcultos: string[];
  dashboardExpandidos: string[];
  onAtualizarLayoutDashboard: (ordem: { a: string[]; b: string[] }, expandidos: string[]) => void;
  onOcultarCardDashboard: (id: string) => void;
  onDefinirOcultosDashboard: (ids: string[]) => void;
  pontoDisponivel: boolean;
  pontoResumo: Array<{ userId: string; nome: string; status: 'atraso' | 'falta' | 'incompleto'; falhas?: string[] }>;
  pontoResumoCarregando: boolean;
  pontoFuncionariosHoje: number;
  onAbrirControlePonto: (funcionarioUserId?: string) => void;
}

export default function Dashboard({
  meses, lancamentos, faturamentos, anoSelecionado, empresaId, nomePerfilAtual, resumoPerfis = [], mesPerfis, setMesAtivo, bgCard, corPrimaria, textStrong, textMuted, darkMode,
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
  caixinhaSaldo, caixinhaSaldoInicial, caixinhaAportesMes, caixinhaUltimosMovimentos, onAdicionarAporteCaixinha, onDefinirSaldoInicialCaixinha,
  dashboardOrdem, dashboardOcultos, onAtualizarLayoutDashboard,
  dashboardExpandidos, onOcultarCardDashboard, onDefinirOcultosDashboard,
  pontoDisponivel, pontoResumo, pontoResumoCarregando,
  pontoFuncionariosHoje, onAbrirControlePonto
}: DashboardProps) {

  const [ocultarValores, setOcultarValores] = useState(true);
  const [ocultarValoresPerfis, setOcultarValoresPerfis] = useState(true);
  const [graficosPerfisVisiveis, setGraficosPerfisVisiveis] = useState(false);
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
  const [tooltipPerfis, setTooltipPerfis] = useState<{
    x: number;
    y: number;
    nome: string;
    receitas: number;
    despesas: number;
  } | null>(null);
  const [caixinhaDia, setCaixinhaDia] = useState(String(new Date().getDate()));
  const [caixinhaDescricao, setCaixinhaDescricao] = useState('Reserva');
  const [caixinhaValor, setCaixinhaValor] = useState('');
  const [caixinhaSaldoInicialValor, setCaixinhaSaldoInicialValor] = useState('');
  const [caixinhaSalvando, setCaixinhaSalvando] = useState(false);
  const [caixinhaSaldoInicialSalvando, setCaixinhaSaldoInicialSalvando] = useState(false);
  const [caixinhaMensagem, setCaixinhaMensagem] = useState('');
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
  const autoScrollYRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const pontoListaRef = useRef<HTMLDivElement | null>(null);
  const [pontoTemMaisAbaixo, setPontoTemMaisAbaixo] = useState(false);

  const pararAutoScrollKanban = useCallback(() => {
    autoScrollYRef.current = null;
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      pararAutoScrollKanban();
      return;
    }

    const executarAutoScrollKanban = () => {
      const y = autoScrollYRef.current;
      if (y === null) {
        autoScrollFrameRef.current = null;
        return;
      }

      const altura = window.visualViewport?.height || window.innerHeight;
      const zona = Math.min(96, Math.max(64, altura * 0.14));
      let delta = 0;

      if (y < zona) {
        delta = -Math.ceil(((zona - y) / zona) * 18);
      } else if (y > altura - zona) {
        delta = Math.ceil(((y - (altura - zona)) / zona) * 18);
      }

      if (delta !== 0) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      autoScrollFrameRef.current = window.requestAnimationFrame(executarAutoScrollKanban);
    };

    const atualizarAutoScrollKanban = (y: number) => {
      autoScrollYRef.current = y;
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = window.requestAnimationFrame(executarAutoScrollKanban);
      }
    };

    const onPointerMove = (event: PointerEvent) => atualizarAutoScrollKanban(event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      const toque = event.touches[0];
      if (toque) atualizarAutoScrollKanban(toque.clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
      pararAutoScrollKanban();
    };
  }, [activeId, pararAutoScrollKanban]);

  useEffect(() => {
    if (!menuCardAberto) return;

    const fecharAoClicarFora = (event: PointerEvent) => {
      const alvo = event.target;
      if (alvo instanceof Element && alvo.closest('[data-card-options-menu]')) return;
      setMenuCardAberto(null);
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuCardAberto(null);
    };

    document.addEventListener('pointerdown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [menuCardAberto]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const horaAtual = new Date().getHours();
  const saudacaoPeriodo = horaAtual < 12 ? 'Bom dia!' : horaAtual < 18 ? 'Boa tarde!' : 'Boa noite!';

  const atualizarIndicadorPonto = () => {
    const lista = pontoListaRef.current;
    if (!lista) {
      setPontoTemMaisAbaixo(false);
      return;
    }
    setPontoTemMaisAbaixo(lista.scrollTop + lista.clientHeight < lista.scrollHeight - 2);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(atualizarIndicadorPonto);
    window.addEventListener('resize', atualizarIndicadorPonto);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', atualizarIndicadorPonto);
    };
  }, [pontoResumo]);

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

  const handleCaixinhaValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setCaixinhaValor('');
      return;
    }

    const numericValue = parseInt(value, 10) / 100;
    setCaixinhaValor(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue));
  };

  useEffect(() => {
    if (caixinhaSaldoInicial > 0) {
      setCaixinhaSaldoInicialValor(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(caixinhaSaldoInicial));
    }
  }, [caixinhaSaldoInicial]);

  const handleCaixinhaSaldoInicialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setCaixinhaSaldoInicialValor('');
      return;
    }

    const numericValue = parseInt(value, 10) / 100;
    setCaixinhaSaldoInicialValor(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue));
  };

  const enviarAporteCaixinha = async () => {
    if (caixinhaSalvando) return;
    setCaixinhaSalvando(true);
    setCaixinhaMensagem('');

    const resultado = await onAdicionarAporteCaixinha({
      dia: caixinhaDia,
      descricao: caixinhaDescricao,
      valorTexto: caixinhaValor,
    });

    if (resultado.ok) {
      setCaixinhaValor('');
      setCaixinhaMensagem('Aporte adicionado.');
    } else {
      setCaixinhaMensagem(resultado.mensagem || 'Não foi possível adicionar o aporte.');
    }

    setCaixinhaSalvando(false);
  };

  const enviarSaldoInicialCaixinha = async () => {
    if (caixinhaSaldoInicialSalvando) return;
    setCaixinhaSaldoInicialSalvando(true);
    setCaixinhaMensagem('');

    const resultado = await onDefinirSaldoInicialCaixinha(caixinhaSaldoInicialValor);

    if (resultado.ok) {
      setCaixinhaMensagem('Saldo inicial salvo.');
    } else {
      setCaixinhaMensagem(resultado.mensagem || 'Não foi possível salvar o saldo inicial.');
    }

    setCaixinhaSaldoInicialSalvando(false);
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
  const avantaShellPreset = criarAvantaShellPreset({ corPrimaria, darkMode });
  const avaInsightsLogoSrc = darkMode
    ? '/images/ava-logo-fundo-escuro.png'
    : '/images/ava-logo-fundo-claro.png';
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
  const insightsAva = (() => {
    const mes = mesResumoDash;
    const receitas = Number(faturamentos[mes] || 0);
    const despesasMes = (lancamentos || []).filter((item) => item.mes === mes && item.status !== 'cancelada');
    const totalDespesas = despesasMes.reduce((total, item) => total + Number(item.valor || 0), 0);
    const resultado = receitas - totalDespesas;
    const porDespesa = new Map<string, number>();

    despesasMes.forEach((item) => {
      const nome = String(item.despesa || item.despesa_nome || 'Despesa');
      porDespesa.set(nome, (porDespesa.get(nome) || 0) + Number(item.valor || 0));
    });

    const maiorDespesa = Array.from(porDespesa.entries()).sort((a, b) => b[1] - a[1])[0];
    const itens: Array<{ tom: 'bom' | 'alerta' | 'neutro'; titulo: string; texto: string }> = [];

    if (!receitas && !totalDespesas) {
      itens.push({
        tom: 'neutro',
        titulo: 'Comece pelo básico',
        texto: 'Registre receitas e despesas do mês para a Ava enxergar padrões e sugerir próximos passos.',
      });
    } else if (resultado >= 0) {
      itens.push({
        tom: 'bom',
        titulo: 'Resultado positivo',
        texto: `Você está com ${formatarMoeda(resultado)} de sobra em ${mes}. Avalie separar parte disso para a Caixinha.`,
      });
    } else {
      itens.push({
        tom: 'alerta',
        titulo: 'Atenção ao resultado',
        texto: `As despesas superam as receitas em ${formatarMoeda(Math.abs(resultado))}. Priorize revisar os maiores gastos.`,
      });
    }

    if (maiorDespesa && totalDespesas > 0) {
      const percentual = (maiorDespesa[1] / totalDespesas) * 100;
      itens.push({
        tom: percentual >= 35 ? 'alerta' : 'neutro',
        titulo: 'Maior concentração',
        texto: `${maiorDespesa[0]} representa ${percentual.toFixed(1)}% das despesas do mês.`,
      });
    }

    if (caixinhaSaldo > 0) {
      itens.push({
        tom: 'bom',
        titulo: 'Reserva em andamento',
        texto: `Sua Caixinha já soma ${formatarMoeda(caixinhaSaldo)}. Manter aportes recorrentes ajuda a transformar sobra em patrimônio.`,
      });
    } else if (resultado > 0) {
      itens.push({
        tom: 'neutro',
        titulo: 'Próximo passo',
        texto: 'Como houve sobra no mês, este pode ser um bom momento para iniciar uma reserva na Caixinha.',
      });
    }

    return itens.slice(0, 3);
  })();
  const perfisDashboard = [...(resumoPerfis || [])].sort((a, b) => b.resultado - a.resultado);
  const totalReceitasPerfis = perfisDashboard.reduce((total, perfil) => total + Number(perfil.receitas || 0), 0);
  const totalDespesasPerfis = perfisDashboard.reduce((total, perfil) => total + Number(perfil.despesas || 0), 0);
  const resultadoPerfis = totalReceitasPerfis - totalDespesasPerfis;
  const maiorResultadoPerfil = Math.max(1, ...perfisDashboard.map((perfil) => Math.abs(Number(perfil.resultado || 0))));
  const perfisParaExibir = perfisDashboard.slice(0, cols.full.includes('meusPerfis') ? 8 : 4);
  const nomeMesPerfis = mesPerfis || mesResumoDash;
  const catalogoCardsKanban = [
    { id: 'lancamentosMensais', titulo: 'Lançamentos mensais', descricao: 'Atalho anual para abrir os lançamentos de cada mês.' },
    { id: 'aConfirmar', titulo: 'Lançamentos a confirmar', descricao: 'Banner de despesas e receitas previstas que chegaram na data.' },
    { id: 'saldo', titulo: 'Saldo do mês', descricao: 'Inicial, final e previsto do mês selecionado.' },
    { id: 'insightsAva', titulo: 'Insights da Ava', descricao: 'Sugestões práticas geradas a partir dos dados do mês.' },
    { id: 'caixinha', titulo: 'Caixinha', descricao: 'Reserva ou investimento com aporte que gera despesa automaticamente.' },
    { id: 'meusPerfis', titulo: 'Meus perfis', descricao: 'Resumo dos perfis financeiros vinculados ao usuário.' },
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
      if (id === 'meusPerfis' && destino === 'full') {
        setGraficosPerfisVisiveis(false);
      }
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

  const SeletorMesCard = ({ value, onChange, ariaLabel }: { value: string; onChange: (mes: string) => void; ariaLabel: string }) => (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-8 min-w-[108px] appearance-none rounded-lg border border-white/70 bg-white/95 pl-3 pr-8 text-[11px] font-black uppercase tracking-wide text-[#123451] shadow-[0_4px_12px_rgba(15,23,42,0.16)] outline-none transition hover:bg-white focus:ring-2 focus:ring-white/60 cursor-pointer"
      >
        {meses.map((mes) => <option key={mes} value={mes} className="bg-white text-slate-800">{mes}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#123451]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  const BotaoOpcoesCard = ({ id, tone = 'dark' }: { id: string; tone?: 'dark' | 'light' }) => {
    const podeRedimensionar = Boolean(containerDe(cols, id));

    return (
    <div data-card-options-menu className="relative shrink-0">
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
          {podeRedimensionar && (
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
  };

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
    pararAutoScrollKanban();
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
      <div className="card-radius-avantalab flex max-h-[60vh] w-full flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
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
      <div className={`${bgCard} card-radius-avantalab w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-colors`} style={{ borderColor: corPrimaria }}>
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
            <div className="relative">
              <div ref={pontoListaRef} onScroll={atualizarIndicadorPonto} className="grid max-h-72 gap-0.5 overflow-y-auto pr-1">
              {pontoResumo.map((item) => {
                const status = {
                  atraso: { label: 'Atraso', classe: 'bg-amber-100 text-amber-700' },
                  falta: { label: 'Falta', classe: 'bg-red-100 text-red-700' },
                  incompleto: { label: 'Incompleto', classe: 'bg-violet-100 text-violet-700' },
                }[item.status];
                return (
                  <button type="button" onClick={() => onAbrirControlePonto(item.userId)} key={item.userId} className={`flex min-h-7 w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${darkMode ? 'bg-slate-700/60' : 'bg-slate-50'}`}>
                    <span className={`min-w-0 flex-1 truncate text-[11px] font-bold ${textStrong}`}>{item.nome}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase leading-tight ${status.classe}`}>{status.label}</span>
                  </button>
                );
              })}
              </div>
              {pontoTemMaisAbaixo && (
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-9 items-end justify-center bg-gradient-to-t pb-0.5 ${darkMode ? 'from-slate-800' : 'from-white'} to-transparent`}>
                  <svg className="h-4 w-4 animate-bounce" style={{ color: corPrimaria }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => onAbrirControlePonto()} className="mt-3 w-full border-t border-slate-200/20 pt-3 text-left text-xs font-black transition hover:opacity-75" style={{ color: corPrimaria }}>
            Ver controle de ponto
          </button>
        </div>
      </div>
    ) : null,

    saldo: (
      <div className={`${bgCard} card-radius-avantalab relative w-full rounded-2xl shadow-lg border-2 overflow-visible transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="flex items-center justify-between rounded-tl-[12px] rounded-tr-[26px] px-6 py-3 text-center text-sm font-bold uppercase tracking-wider" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Saldo do mês</span>
          <div className="flex items-center gap-2">
            <SeletorMesCard value={meses[saldoCardMesIdx]} onChange={(mes) => setSaldoCardMesIdx(meses.indexOf(mes))} ariaLabel="Selecionar mês do saldo" />
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

    insightsAva: (
      <div className={`${bgCard} card-radius-avantalab w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-colors`} style={{ borderColor: corPrimaria }}>
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider"
          style={{
            background: darkMode ? '#071A2B' : '#FFFFFF',
            color: darkMode ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-[92px] shrink-0 items-center justify-center rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avaInsightsLogoSrc}
                alt="Ava"
                className="h-8 w-auto object-contain"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/images/ava-logo-principal.png';
                }}
              />
            </span>
            <span className={`truncate ${darkMode ? 'text-white drop-shadow-sm' : 'text-slate-950'}`}>Insights da Ava</span>
          </div>
          <div className="flex items-center gap-2">
            <DragHandle tone={darkMode ? 'light' : 'dark'} />
            <BotaoOpcoesCard id="insightsAva" tone={darkMode ? 'light' : 'dark'} />
          </div>
        </div>
        <div className="space-y-3 p-5">
          <p className={`text-xs font-semibold leading-relaxed ${textMuted}`}>
            Sugestões rápidas para {mesResumoDash}. Use como ponto de atenção, não como regra fixa.
          </p>
          <div className="grid gap-2">
            {insightsAva.map((insight, index) => {
              const visual = insight.tom === 'bom'
                ? { dot: 'bg-teal-500', box: darkMode ? 'border-teal-400/35 bg-teal-950/25' : 'border-teal-100 bg-teal-50' }
                : insight.tom === 'alerta'
                  ? { dot: 'bg-rose-500', box: darkMode ? 'border-rose-400/35 bg-rose-950/25' : 'border-rose-100 bg-rose-50' }
                  : { dot: 'bg-sky-500', box: darkMode ? 'border-sky-400/35 bg-sky-950/25' : 'border-sky-100 bg-sky-50' };

              return (
                <div key={`${insight.titulo}-${index}`} className={`rounded-xl border px-3 py-2.5 ${visual.box}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${visual.dot}`} />
                    <strong className={`min-w-0 truncate text-xs font-black uppercase tracking-wide ${textStrong}`}>{insight.titulo}</strong>
                  </div>
                  <p className={`mt-1.5 text-xs font-semibold leading-relaxed ${textMuted}`}>{insight.texto}</p>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('avantalab:abrir-chat-ia'));
              }
            }}
            className="w-full rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition hover:brightness-95"
            style={{ borderColor: corPrimaria, color: corPrimaria }}
          >
            Conversar com a Ava
          </button>
        </div>
      </div>
    ),

    caixinha: (
      <div className={`${bgCard} card-radius-avantalab w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="flex items-center justify-between gap-3 px-6 py-3 text-sm font-bold uppercase tracking-wider" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Caixinha</span>
          <div className="flex items-center gap-2">
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="caixinha" tone="light" />
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Saldo</span>
              <strong className={`mt-1 block text-lg font-black tabular-nums ${caixinhaSaldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {ocultarValores ? 'R$ ••••••' : formatarMoeda(caixinhaSaldo)}
              </strong>
            </div>
            <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <span className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Aportes no mês</span>
              <strong className={`mt-1 block text-lg font-black tabular-nums ${textStrong}`}>
                {ocultarValores ? 'R$ ••••••' : formatarMoeda(caixinhaAportesMes)}
              </strong>
            </div>
          </div>

          <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50/80'}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Aporte inicial</p>
                <p className={`mt-0.5 text-[11px] font-semibold ${textMuted}`}>Valor que já existia antes do AvantaLab.</p>
              </div>
              <strong className="shrink-0 text-xs font-black text-emerald-500">
                {ocultarValores ? 'R$ ••••' : formatarMoeda(caixinhaSaldoInicial)}
              </strong>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-2 max-sm:grid-cols-1">
              <input
                value={caixinhaSaldoInicialValor}
                onChange={handleCaixinhaSaldoInicialChange}
                inputMode="decimal"
                className={`h-10 rounded-xl border px-3 text-right text-base font-black outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}
                placeholder="0,00"
              />
              <button
                type="button"
                onClick={enviarSaldoInicialCaixinha}
                disabled={caixinhaSaldoInicialSalvando}
                className={`h-10 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  darkMode ? 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {caixinhaSaldoInicialSalvando ? 'Salvando...' : caixinhaSaldoInicial > 0 ? 'Atualizar' : 'Definir'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[76px_minmax(0,1fr)_132px] gap-2 max-sm:grid-cols-1">
            <input
              type="number"
              min={1}
              max={31}
              value={caixinhaDia}
              onChange={(e) => setCaixinhaDia(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-base font-bold outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}
              aria-label="Dia do aporte"
              placeholder="Dia"
            />
            <input
              value={caixinhaDescricao}
              onChange={(e) => setCaixinhaDescricao(e.target.value)}
              className={`h-10 rounded-xl border px-3 text-base font-bold outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}
              placeholder="Descrição"
            />
            <input
              value={caixinhaValor}
              onChange={handleCaixinhaValorChange}
              inputMode="decimal"
              className={`h-10 rounded-xl border px-3 text-right text-base font-black outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}`}
              placeholder="0,00"
            />
          </div>

          <button
            type="button"
            onClick={enviarAporteCaixinha}
            disabled={caixinhaSalvando}
            className="h-10 w-full rounded-xl text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: corPrimaria }}
          >
            {caixinhaSalvando ? 'Adicionando...' : 'Adicionar aporte'}
          </button>

          {caixinhaMensagem && (
            <p className={`text-center text-xs font-bold ${caixinhaMensagem.includes('adicionado') ? 'text-emerald-500' : 'text-red-500'}`}>
              {caixinhaMensagem}
            </p>
          )}

          <div className="space-y-2">
            <p className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Últimos movimentos</p>
            {caixinhaUltimosMovimentos.length > 0 ? caixinhaUltimosMovimentos.map((mov) => (
              <div key={mov.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <span className={`min-w-0 truncate text-xs font-bold ${textStrong}`}>{mov.descricao || 'Aporte na caixinha'}</span>
                <strong className="shrink-0 text-xs font-black text-emerald-500">{ocultarValores ? 'R$ ••••' : formatarMoeda(mov.valor)}</strong>
              </div>
            )) : (
              <p className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'} ${textMuted}`}>
                Nenhum aporte registrado.
              </p>
            )}
          </div>
        </div>
      </div>
    ),

    meusPerfis: (
      <div className={`${bgCard} card-radius-avantalab w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="flex items-center justify-between gap-3 px-6 py-3 text-sm font-bold uppercase tracking-wider" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Meus perfis</span>
          <div className="flex items-center gap-2">
            <DragHandle tone="light" />
            <BotaoOpcoesCard id="meusPerfis" tone="light" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          <div className={`rounded-xl border px-3 py-2.5 ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Resultado consolidado</p>
                <strong className={`mt-0.5 block text-lg font-black tabular-nums ${resultadoPerfis >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {ocultarValoresPerfis ? 'R$ •••••••' : formatarMoeda(resultadoPerfis)}
                </strong>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${darkMode ? 'bg-slate-700 text-slate-100' : 'bg-cyan-50 text-cyan-700'}`}>
                  {perfisDashboard.length} perfil{perfisDashboard.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => setOcultarValoresPerfis(!ocultarValoresPerfis)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
                  title={ocultarValoresPerfis ? 'Mostrar valores' : 'Ocultar valores'}
                  aria-label={ocultarValoresPerfis ? 'Mostrar valores do card Meus perfis' : 'Ocultar valores do card Meus perfis'}
                >
                  {ocultarValoresPerfis ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className={`block text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Receitas</span>
                <span className="mt-0.5 block text-sm font-black text-emerald-500">{ocultarValoresPerfis ? 'R$ ••••••' : formatarMoeda(totalReceitasPerfis)}</span>
              </div>
              <div className="text-right">
                <span className={`block text-[10px] font-black uppercase tracking-wide ${textMuted}`}>Despesas</span>
                <span className="mt-0.5 block text-sm font-black text-red-500">{ocultarValoresPerfis ? 'R$ ••••••' : formatarMoeda(totalDespesasPerfis)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className={`text-[10px] font-black uppercase tracking-wide ${textMuted}`}>{nomeMesPerfis}</p>
              <p className={`text-[10px] font-semibold ${textMuted}`}>Perfis vinculados</p>
            </div>
            {perfisParaExibir.length > 0 ? perfisParaExibir.map((perfil) => {
              const positivo = Number(perfil.resultado || 0) >= 0;
              const largura = Math.max(6, Math.round((Math.abs(Number(perfil.resultado || 0)) / maiorResultadoPerfil) * 100));
              const perfilAtual = perfil.id === empresaId;
              return (
                <div key={perfil.id} className={`rounded-xl border px-2.5 py-2 ${perfilAtual ? 'border-cyan-300' : darkMode ? 'border-slate-700' : 'border-slate-200'} ${darkMode ? 'bg-slate-800/45' : 'bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate text-[13px] font-black leading-tight ${textStrong}`}>{perfil.nome}</p>
                      <p className={`mt-0.5 truncate text-[10px] font-semibold leading-tight ${textMuted}`}>
                        {perfilAtual ? 'Perfil atual · ' : ''}Receitas {ocultarValoresPerfis ? '•••' : formatarMoeda(perfil.receitas)} · Despesas {ocultarValoresPerfis ? '•••' : formatarMoeda(perfil.despesas)}
                      </p>
                    </div>
                    <strong className={`shrink-0 text-[13px] font-black tabular-nums ${positivo ? 'text-emerald-500' : 'text-red-500'}`}>
                      {ocultarValoresPerfis ? 'R$ ••••' : formatarMoeda(perfil.resultado)}
                    </strong>
                  </div>
                  <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div className={`h-full rounded-full ${positivo ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${largura}%` }} />
                  </div>
                </div>
              );
            }) : (
              <p className={`rounded-xl px-3 py-4 text-center text-xs font-semibold ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'} ${textMuted}`}>
                Carregando perfis vinculados...
              </p>
            )}
          </div>

          {cols.full.includes('meusPerfis') && perfisDashboard.length > 0 && (
            <div className={`rounded-xl border p-2.5 ${darkMode ? 'border-slate-700 bg-slate-800/45' : 'border-slate-200 bg-slate-50/80'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`truncate text-xs font-black uppercase tracking-wide ${textStrong}`}>Receitas x despesas por perfil</h3>
                  <p className={`mt-0.5 text-[10px] font-semibold ${textMuted}`}>Comparativo de {anoSelecionado}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGraficosPerfisVisiveis(!graficosPerfisVisiveis)}
                  className={`h-7 shrink-0 rounded-lg border px-2.5 text-[10px] font-black uppercase tracking-wide transition ${
                    darkMode
                      ? 'border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {graficosPerfisVisiveis ? 'Ocultar gráficos' : 'Exibir gráficos'}
                </button>
              </div>

              {graficosPerfisVisiveis && (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {perfisDashboard.slice(0, 8).map((perfil) => {
                      const maximo = Math.max(1, perfil.receitas, perfil.despesas);
                      return (
                        <div
                          key={`grafico-${perfil.id}`}
                          className={`flex min-w-0 flex-col rounded-xl border p-1.5 ${darkMode ? 'border-slate-700 bg-slate-900/45' : 'border-slate-200 bg-white'}`}
                          onMouseMove={(event) => setTooltipPerfis({
                            x: event.clientX,
                            y: event.clientY,
                            nome: perfil.nome,
                            receitas: Number(perfil.receitas || 0),
                            despesas: Number(perfil.despesas || 0),
                          })}
                          onMouseLeave={() => setTooltipPerfis(null)}
                        >
                          <span className={`mb-1.5 truncate text-center text-[10px] font-black leading-tight ${textStrong}`}>{perfil.nome}</span>
                          <div className="flex h-16 items-end justify-center gap-1.5">
                            <span className="w-3.5 rounded-t-md bg-emerald-500 shadow-sm" style={{ height: `${Math.max(5, (perfil.receitas / maximo) * 100)}%` }} />
                            <span className="w-3.5 rounded-t-md bg-red-500 shadow-sm" style={{ height: `${Math.max(5, (perfil.despesas / maximo) * 100)}%` }} />
                          </div>
                          <div className={`mt-1.5 grid grid-cols-2 gap-1 text-center text-[9px] font-black leading-tight ${textMuted}`}>
                            <span className="truncate text-emerald-500">{ocultarValoresPerfis ? '•••' : formatarMoeda(perfil.receitas)}</span>
                            <span className="truncate text-red-500">{ocultarValoresPerfis ? '•••' : formatarMoeda(perfil.despesas)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wide">
                    <span className="flex items-center gap-1.5 text-emerald-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Receitas</span>
                    <span className="flex items-center gap-1.5 text-red-500"><span className="h-2 w-2 rounded-full bg-red-500" /> Despesas</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    ),

    resumoFinanceiro: (
      <div className={`${bgCard} card-radius-avantalab w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors`} style={{ borderColor: corPrimaria }}>
        <div className="text-center text-sm font-bold uppercase tracking-wider flex justify-between px-6 py-3 items-center" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <span>Resumo Financeiro</span>
          <div className="flex items-center gap-2">
            <SeletorMesCard value={mesResumoDash} onChange={setMesResumoDash} ariaLabel="Selecionar mês do resumo financeiro" />
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
      <div className={`${bgCard} card-radius-avantalab w-full rounded-2xl shadow-lg border-2 overflow-visible transition-colors`} style={{ borderColor: corPrimaria }}>
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
      <div className={bgCard + " card-radius-avantalab w-full rounded-2xl shadow-lg border-2 overflow-hidden transition-colors"} style={{ borderColor: corPrimaria }}>
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
      onDragCancel={() => {
        pararAutoScrollKanban();
        setActiveId(null);
      }}
    >
    <main className="grid w-full min-w-0 max-w-full grid-cols-1 items-start gap-6 overflow-x-hidden xl:grid-cols-3 animate-fade-in print:m-0 print:p-0">

      <div className="relative min-w-0 pt-7">
        <div className={`absolute left-1 top-0 flex h-5 max-w-full items-center gap-1.5 text-sm font-black leading-none ${textStrong}`}>
          <span className="truncate">Olá, {nomePerfilAtual || 'Empresa'}.</span>
          <span className={`shrink-0 ${textMuted}`}>{saudacaoPeriodo}</span>
        </div>

      {!ocultosSet.has('lancamentosMensais') && (
      <AvantaCard
        title="Lançamentos Mensais"
        className={textStrong}
        bodyClassName={`${bgCard} transition-colors`}
        bodyStyle={avantaShellPreset.bodyStyle}
        headerRight={
          <div className="flex items-center gap-1.5">
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-black tabular-nums"
            style={{ borderColor: `${corPrimaria}40`, color: corPrimaria, background: `${corPrimaria}0d` }}
          >
            {anoSelecionado}
          </span>
          <BotaoOpcoesCard id="lancamentosMensais" />
          </div>
        }
        style={avantaShellPreset.cardStyle}
        hideDragHandle
        hideMenu
      >
        <div className="mb-6">
          <p className={`min-w-0 text-xs font-semibold ${textMuted}`}>
            Toque em um mês para abrir os lançamentos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-3">
          {(() => {
            const anoEhAtual = String(anoSelecionado) === String(new Date().getFullYear());
            const mesAtualCalendario = meses[new Date().getMonth()];
            const textoSobrePrimaria = corEhClara(corPrimaria) ? '#0f172a' : '#ffffff';
            return meses.map((mes) => {
              const dadosMes = dadosEvolucao.find((item) => item.mes === mes);
              const temMovimento = Boolean(dadosMes && (dadosMes.receitas > 0 || dadosMes.despesas > 0));
              const ehMesAtual = anoEhAtual && mes === mesAtualCalendario;

              // Mês corrente: preenchido com a cor do tema (ponto focal do card).
              if (ehMesAtual) {
                return (
                  <button
                    key={mes}
                    onClick={() => setMesAtivo(mes)}
                    className="group flex h-14 cursor-pointer items-center justify-center rounded-xl border-2 text-xs font-black shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      // Degradê bem esmaecido: começa na cor cheia e dilui até
                      // ~55%, para não ficar chapado nem pesado em cores fortes.
                      background: `linear-gradient(135deg, ${corPrimaria} 0%, ${corPrimaria}d9 35%, ${corPrimaria}8c 100%)`,
                      borderColor: `${corPrimaria}66`,
                      color: textoSobrePrimaria,
                      boxShadow: `0 6px 16px ${corPrimaria}33`,
                    }}
                    title="Mês atual"
                  >
                    <span className="flex items-center gap-1.5 transition-transform group-hover:scale-105">
                      <span className="hidden xl:inline">{mes}</span>
                      <span className="inline xl:hidden">{abreviarMes(mes)}</span>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: textoSobrePrimaria }} />
                    </span>
                  </button>
                );
              }

              const bordaBase = temMovimento ? `${corPrimaria}45` : '';
              return (
                <button
                  key={mes}
                  onClick={() => setMesAtivo(mes)}
                  className={`${darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} group flex h-14 cursor-pointer items-center justify-center rounded-xl border-2 text-xs font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
                  style={{
                    borderColor: bordaBase || undefined,
                    background: temMovimento && !darkMode ? `linear-gradient(180deg, ${corPrimaria}0d, #ffffff 70%)` : undefined,
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = corPrimaria; e.currentTarget.style.borderColor = corPrimaria; }}
                  onMouseOut={e => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = bordaBase; }}
                >
                  <span className="flex items-center gap-1.5 transition-transform group-hover:scale-105">
                    <span className="hidden xl:inline">{mes}</span>
                    <span className="inline xl:hidden">{abreviarMes(mes)}</span>
                    {temMovimento && <span className="h-1.5 w-1.5 rounded-full opacity-80" style={{ backgroundColor: corPrimaria }} title="Mês com lançamentos" />}
                  </span>
                </button>
              );
            });
          })()}
        </div>

        {/* Mesma linguagem do topo do card: sem borda lateral — a identidade
            é a luz radial do tema nascendo no canto superior direito. */}
        <div
          className={`mt-8 rounded-xl border p-5 ${
            darkMode
              ? 'border-slate-700 bg-slate-800/70'
              : 'border-slate-200'
          }`}
          style={{
            background: darkMode
              ? `radial-gradient(130% 130% at 100% 0%, ${corPrimaria}3d 0%, transparent 55%), linear-gradient(180deg, ${corPrimaria}14 0%, rgba(30,41,59,.7) 85%)`
              : `radial-gradient(130% 130% at 100% 0%, ${corPrimaria}21 0%, transparent 55%), linear-gradient(180deg, ${corPrimaria}0a 0%, #ffffff 85%)`,
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-200/10 pb-3">
            <h3 className={`font-bold ${textStrong} text-sm uppercase tracking-wider flex items-center gap-2`}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: corPrimaria }} />
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
      </AvantaCard>
      )}
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
          <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default bg-black/60 backdrop-blur-sm"
            onClick={() => setGerenciadorAberto(false)}
            aria-label="Fechar organização de blocos"
          />
          <div className={`card-radius-avantalab-lg absolute right-0 top-7 z-40 box-border w-[min(20rem,calc(100vw-1.5rem))] max-w-full overflow-hidden rounded-2xl border p-3 shadow-2xl ${
            darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[13px] font-black leading-tight">Organizar blocos</h3>
                <p className={`mt-0.5 text-[10px] font-semibold leading-tight ${textMuted}`}>Exiba ou oculte cards do kanban.</p>
              </div>
              <button
                type="button"
                onClick={() => setGerenciadorAberto(false)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-base font-black ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">
              {catalogoCardsKanban.map((card) => {
                const visivel = !ocultosSet.has(card.id);
                const indisponivelAgora = card.id === 'aConfirmar' && !temAConfirmar;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => alternarVisibilidadeCard(card.id)}
                    className={`box-border flex min-h-11 w-full max-w-full items-center gap-2 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition ${
                        visivel ? 'justify-end' : 'justify-start bg-slate-300'
                      }`}
                      style={{ backgroundColor: visivel ? corPrimaria : undefined }}
                    >
                      <span className="h-3 w-3 rounded-full bg-white shadow" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block max-w-full truncate text-[11px] font-black leading-tight ${textStrong}`}>{card.titulo}</span>
                      <span className={`mt-0.5 block max-w-full truncate text-[10px] font-semibold leading-tight ${textMuted}`}>
                        {indisponivelAgora ? 'Aparece quando houver despesas previstas para confirmar.' : card.descricao}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          </>
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
    <DragOverlay dropAnimation={null} modifiers={[restringirArrasteAJanela]}>
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
    {typeof document !== 'undefined' && tooltipPerfis && createPortal(
      <div
        className="pointer-events-none fixed z-[9999] w-48 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-2xl"
        style={{
          left: `min(max(${tooltipPerfis.x + 14}px, 8px), calc(100vw - 204px))`,
          top: `max(${tooltipPerfis.y - 38}px, 8px)`,
        }}
      >
        <p className="mb-1 truncate text-[10px] font-black uppercase tracking-wide text-white/60">{tooltipPerfis.nome}</p>
        <div className="flex justify-between gap-3 text-[11px] font-bold">
          <span className="text-emerald-300">Receitas</span>
          <strong>{ocultarValoresPerfis ? 'R$ ••••' : formatarMoeda(tooltipPerfis.receitas)}</strong>
        </div>
        <div className="mt-1 flex justify-between gap-3 text-[11px] font-bold">
          <span className="text-red-300">Despesas</span>
          <strong>{ocultarValoresPerfis ? 'R$ ••••' : formatarMoeda(tooltipPerfis.despesas)}</strong>
        </div>
        <div className={`mt-1 flex justify-between gap-3 border-t border-white/15 pt-1 text-[11px] font-black ${tooltipPerfis.receitas - tooltipPerfis.despesas >= 0 ? 'text-cyan-200' : 'text-red-200'}`}>
          <span>Saldo</span>
          <strong>{ocultarValoresPerfis ? 'R$ ••••' : formatarMoeda(tooltipPerfis.receitas - tooltipPerfis.despesas)}</strong>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
