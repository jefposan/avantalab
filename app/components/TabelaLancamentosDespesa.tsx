'use client';

import { Fragment, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import BotaoProximoScroll from './BotaoProximoScroll';
import CardExpandidoModal from './CardExpandidoModal';
import { executarTransicaoCard } from '@/app/lib/transicao-card';
import CardLancamentoDespesa, {
  type DespesaCadastrada,
} from './CardLancamentoDespesa';
import BotaoExpandirCard from './BotaoExpandirCard';

export type LancamentoDespesa = {
  id: string | number;
  mes?: string;
  dia: string | number;
  despesa: string;
  descricao?: string | null;
  valor: number;
  status?: string | null;
  tipo?: string | null;
  recorrenciaId?: string | null;
  notaArquivoPath?: string | null;
};

const MESES_TAB = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function dataFuturaTab(ano: number, mesIndice: number, dia: number): boolean {
  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  if (ano > anoHoje) return true;
  if (ano < anoHoje) return false;
  const mesHoje = hoje.getMonth();
  if (mesIndice > mesHoje) return true;
  if (mesIndice < mesHoje) return false;
  return Number(dia) > hoje.getDate();
}

const SELO_TIPO: Record<string, { txt: string; cls: string }> = {
  fixa: { txt: 'Fixa', cls: 'bg-indigo-100 text-indigo-700' },
  parcela: { txt: 'Parcela', cls: 'bg-violet-100 text-violet-700' },
};

const SELO_SITUACAO = {
  previsto: { txt: 'Previsto', cls: 'bg-amber-100 text-amber-700' },
  confirmar: { txt: 'A confirmar', cls: 'bg-sky-100 text-sky-700' },
  pendente: { txt: 'Pendente', cls: 'bg-red-100 text-red-700' },
} as const;

function renderSeloPrevista(
  lanc: LancamentoDespesa,
  mesAtivo: string | null,
  anoSelecionado: string
) {
  const selos: Array<{ txt: string; cls: string }> = [];
  const seloTipo = lanc.tipo ? SELO_TIPO[lanc.tipo] : null;
  if (seloTipo) selos.push(seloTipo);

  if (lanc.status === 'prevista') {
    const mesIndice = MESES_TAB.indexOf(String(lanc.mes || mesAtivo || '').toUpperCase());
    const ano = Number(anoSelecionado);
    const hoje = new Date();
    const ehHoje =
      ano === hoje.getFullYear() &&
      mesIndice === hoje.getMonth() &&
      Number(lanc.dia) === hoje.getDate();
    const situacao = dataFuturaTab(ano, mesIndice, Number(lanc.dia))
      ? SELO_SITUACAO.previsto
      : ehHoje
        ? SELO_SITUACAO.confirmar
        : SELO_SITUACAO.pendente;
    selos.push(situacao);
  }

  if (!selos.length) return null;
  return (
    <div className="mb-1 flex flex-wrap gap-1">
      {selos.map((selo) => (
        <span key={selo.txt} className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${selo.cls}`}>{selo.txt}</span>
      ))}
    </div>
  );
}

type TabelaLancamentosDespesaProps = {
  bgCard: string;
  corPrimaria: string;
  darkMode: boolean;
  textStrong: string;
  textMuted: string;
  mesAtivo: string | null;
  anoSelecionado: string;
  ordemLancamentos: 'desc' | 'asc';
  setOrdemLancamentos: Dispatch<SetStateAction<'desc' | 'asc'>>;
  formDia: string;
  setFormDia: (valor: string) => void;
  formDespesa: string;
  setFormDespesa: (valor: string) => void;
  formDescricao: string;
  setFormDescricao: (valor: string) => void;
  formValor: string;
  handleValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  adicionarDespesa: () => void | Promise<void>;
  despesasCadastradas: DespesaCadastrada[];
  buscaLancamento: string;
  setBuscaLancamento: (valor: string) => void;
  // Busca premium bloqueada no plano Pessoal grátis: o campo mostra o cadeado
  // e o toque chama onBuscaBloqueada (abre o modal de upgrade) em vez de digitar.
  buscaBloqueada?: boolean;
  onBuscaBloqueada?: () => void;
  lancamentosFiltradosDoMes: LancamentoDespesa[];
  lancamentoEditandoId: string | number | null;
  editDia: string;
  setEditDia: (valor: string) => void;
  editDespesa: string;
  setEditDespesa: (valor: string) => void;
  editDescricao: string;
  setEditDescricao: (valor: string) => void;
  editValor: string;
  handleEditValorChange: (e: ChangeEvent<HTMLInputElement>) => void;
  editParcelaAtual: number;
  setEditParcelaAtual: (valor: number) => void;
  editTotalParcelas: number;
  setEditTotalParcelas: (valor: number) => void;
  salvarEdicaoLancamento: (confirmarPrevista?: boolean) => void | Promise<void>;
  cancelarEdicaoLancamento: () => void;
  iniciarEdicaoLancamento: (lancamento: LancamentoDespesa) => void;
  onAceitarPrevistaHoje: (lancamento: LancamentoDespesa) => void | Promise<void>;
  onDefinirDespesaFixaSempre: (lancamento: LancamentoDespesa) => void | Promise<void>;
  onSolicitarExclusaoLancamento: (lancamento: LancamentoDespesa) => void;
  alturaFinalTabelaLancamentos: number;
  alturaMaximaTabelaLancamentos: number;
  quantidadeLancamentosMes: number;
  alturaPadraoTabela: number;
  espacoAcaoExpansaoTabela: number;
  estiloTemaPrimario: CSSProperties;
  getMaxDias: (mes: string | null, ano: string | number) => number;
  formatarMoeda: (valor: number) => string;
  formatarDescricao: (texto: string) => string;
  expandidoDespesa: boolean;
  onFocoDespesa: () => void;
  formParcelar: boolean;
  setFormParcelar: (v: boolean) => void;
  formParcelas: number;
  setFormParcelas: (v: number) => void;
  salvandoDespesa?: boolean;
  lerNotaPorFoto: (arquivo: File) => void | Promise<void>;
  lendoNota?: boolean;
  notaPendente?: boolean;
  limparNotaPendente: () => void;
  temRascunhoImportador?: boolean;
  onRetomarRascunhoImportador?: () => void;
  onVerNota: (lancamento: LancamentoDespesa) => void;
};

export default function TabelaLancamentosDespesa({
  corPrimaria,
  darkMode,
  textStrong,
  textMuted,
  mesAtivo,
  anoSelecionado,
  ordemLancamentos,
  setOrdemLancamentos,
  formDia,
  setFormDia,
  formDespesa,
  setFormDespesa,
  formDescricao,
  setFormDescricao,
  formValor,
  handleValorChange,
  adicionarDespesa,
  despesasCadastradas,
  buscaLancamento,
  setBuscaLancamento,
  buscaBloqueada = false,
  onBuscaBloqueada,
  lancamentosFiltradosDoMes,
  lancamentoEditandoId,
  editDia,
  setEditDia,
  editDespesa,
  setEditDespesa,
  editDescricao,
  setEditDescricao,
  editValor,
  handleEditValorChange,
  editParcelaAtual,
  setEditParcelaAtual,
  editTotalParcelas,
  setEditTotalParcelas,
  salvarEdicaoLancamento,
  cancelarEdicaoLancamento,
  iniciarEdicaoLancamento,
  onAceitarPrevistaHoje,
  onDefinirDespesaFixaSempre,
  onSolicitarExclusaoLancamento,
  alturaFinalTabelaLancamentos,
  alturaMaximaTabelaLancamentos,
  quantidadeLancamentosMes,
  alturaPadraoTabela,
  espacoAcaoExpansaoTabela,
  estiloTemaPrimario,
  getMaxDias,
  formatarMoeda,
  formatarDescricao,
  expandidoDespesa,
  onFocoDespesa,
  formParcelar,
  setFormParcelar,
  formParcelas,
  setFormParcelas,
  salvandoDespesa = false,
  lerNotaPorFoto,
  lendoNota = false,
  notaPendente = false,
  limparNotaPendente,
  temRascunhoImportador = false,
  onRetomarRascunhoImportador,
  onVerNota,
}: TabelaLancamentosDespesaProps) {
  const listaLancamentosRef = useRef<HTMLDivElement | null>(null);
  const cardLancamentosRef = useRef<HTMLDivElement | null>(null);
  const linhaReferenciaExpansaoRef = useRef<{ elemento: HTMLTableRowElement; topo: number } | null>(null);
  const [popupExpandido, setPopupExpandido] = useState(false);
  const [listaExpandida, setListaExpandida] = useState(false);
  const definirPopupExpandido = (aberto: boolean) => {
    executarTransicaoCard(
      () => setPopupExpandido(aberto),
      'despesas',
      aberto ? 'expandir' : 'recolher'
    );
  };
  const definirListaExpandida = (aberta: boolean) => {
    if (aberta && listaLancamentosRef.current && typeof window !== 'undefined') {
      const linhas = Array.from(listaLancamentosRef.current.querySelectorAll<HTMLTableRowElement>('tbody tr'));
      const centroDaTela = window.innerHeight / 2;
      const linhaVisivel = linhas.find((linha) => {
        const limite = linha.getBoundingClientRect();
        return limite.top <= centroDaTela && limite.bottom >= centroDaTela;
      }) ?? linhas[0];
      if (linhaVisivel) {
        linhaReferenciaExpansaoRef.current = {
          elemento: linhaVisivel,
          topo: linhaVisivel.getBoundingClientRect().top,
        };
      }
      setListaExpandida(true);
      return;
    }

    setListaExpandida(false);
    requestAnimationFrame(() => {
      listaLancamentosRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      const card = cardLancamentosRef.current;
      if (card) window.scrollTo({ top: Math.max(0, window.scrollY + card.getBoundingClientRect().top - 12), behavior: 'auto' });
    });
  };

  useLayoutEffect(() => {
    if (!listaExpandida || popupExpandido) return;
    const referencia = linhaReferenciaExpansaoRef.current;
    if (!referencia?.elemento.isConnected || typeof window === 'undefined') return;

    requestAnimationFrame(() => {
      const deslocamento = referencia.elemento.getBoundingClientRect().top - referencia.topo;
      if (Math.abs(deslocamento) > 1) window.scrollTo({ top: window.scrollY + deslocamento, behavior: 'auto' });
      linhaReferenciaExpansaoRef.current = null;
    });
  }, [listaExpandida, popupExpandido]);

  const conteudoCard = (
    <div
      ref={cardLancamentosRef}
      className={`av-card-transicao-despesas-elemento relative h-full w-full min-w-0 max-w-full bg-white p-3 text-slate-900 transition-[box-shadow,filter] duration-200 sm:p-4 ${
        listaExpandida && !popupExpandido ? 'overflow-visible' : 'overflow-hidden'
      } ${
        popupExpandido ? 'max-h-[calc(100dvh-2rem)]' : ''
      }`}
      style={{
        borderRadius: '8px 22px 22px 22px',
        boxShadow: expandidoDespesa
          ? '0 20px 44px -14px rgba(229, 72, 77, 0.5), 0 0 0 2px rgba(229, 72, 77, 0.32)'
          : '0 8px 20px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        filter: expandidoDespesa ? 'none' : 'saturate(0.85)',
      }}
    >
      <div
        className="relative custom-scroll"
        style={{
          height: !expandidoDespesa && !popupExpandido
            ? 'auto'
            : popupExpandido || listaExpandida
            ? 'auto'
            : `${alturaFinalTabelaLancamentos + 130 + espacoAcaoExpansaoTabela}px`,
          minHeight: !expandidoDespesa && !popupExpandido
            ? undefined
            : popupExpandido || listaExpandida
            ? undefined
            : `${alturaPadraoTabela + 130 + espacoAcaoExpansaoTabela}px`,
          maxHeight: popupExpandido
            ? 'calc(100dvh - 6rem)'
            : listaExpandida
              ? undefined
              : `${alturaMaximaTabelaLancamentos + 130 + espacoAcaoExpansaoTabela}px`,
          overflow: listaExpandida && !popupExpandido ? 'visible' : 'hidden',
        }}
      >
        <CardLancamentoDespesa
          corPrimaria={corPrimaria}
          darkMode={darkMode}
          textStrong={textStrong}
          mesAtivo={mesAtivo}
          anoSelecionado={anoSelecionado}
          ordemLancamentos={ordemLancamentos}
          setOrdemLancamentos={setOrdemLancamentos}
          formDia={formDia}
          setFormDia={setFormDia}
          formDespesa={formDespesa}
          setFormDespesa={setFormDespesa}
          formDescricao={formDescricao}
          setFormDescricao={setFormDescricao}
          formValor={formValor}
          handleValorChange={handleValorChange}
          adicionarDespesa={adicionarDespesa}
          despesasCadastradas={despesasCadastradas}
          estiloTemaPrimario={estiloTemaPrimario}
          getMaxDias={getMaxDias}
          formatarDescricao={formatarDescricao}
          expandido={expandidoDespesa}
          onFoco={onFocoDespesa}
          formParcelar={formParcelar}
          setFormParcelar={setFormParcelar}
          formParcelas={formParcelas}
          setFormParcelas={setFormParcelas}
          salvandoDespesa={salvandoDespesa}
          lerNotaPorFoto={lerNotaPorFoto}
          lendoNota={lendoNota}
          notaPendente={notaPendente}
          limparNotaPendente={limparNotaPendente}
          temRascunhoImportador={temRascunhoImportador}
          onRetomarRascunhoImportador={onRetomarRascunhoImportador}
          expandidoPopup={popupExpandido}
          expansaoDesabilitada={!expandidoDespesa}
          onAlternarExpansao={() => definirPopupExpandido(!popupExpandido)}
          listaExpandida={listaExpandida && !popupExpandido}
          onRecolherLista={() => definirListaExpandida(false)}
        />
        {expandidoDespesa && (
        <>
        <div className="mb-3">
          <div className="flex-1">
            <div className="relative">
              <svg
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.3"
                  d="M21 21l-4.35-4.35M10.8 18a7.2 7.2 0 100-14.4 7.2 7.2 0 000 14.4z"
                />
              </svg>

              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                readOnly={buscaBloqueada}
                value={buscaLancamento}
                onChange={(e) => { if (buscaBloqueada) return; setBuscaLancamento(e.target.value); }}
                onFocus={onFocoDespesa}
                onClick={() => { if (buscaBloqueada) onBuscaBloqueada?.(); }}
                placeholder={buscaBloqueada ? '🔒 Busca nos lançamentos — recurso Premium' : 'Buscar lançamento do mês por despesa, descrição, dia ou valor...'}
                className={`h-9 w-full rounded-lg border py-2 pl-9 pr-9 text-xs font-semibold outline-none transition focus:ring-1 focus:ring-inset ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
                    : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
                }`}
                style={{
                  borderColor: buscaLancamento ? corPrimaria : undefined,
                  boxShadow: buscaLancamento ? `inset 0 0 0 1px ${corPrimaria}33` : undefined,
                }}
              />

              {buscaLancamento && (
                <button
                  type="button"
                  onClick={() => setBuscaLancamento('')}
                  className={`absolute right-2 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black shadow-sm transition cursor-pointer ${
                    darkMode
                      ? 'bg-slate-600 text-white hover:bg-slate-500'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
                  }`}
                  title="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {buscaLancamento.trim() && (
          <div className="px-1.5 pt-2 text-xs font-bold text-slate-500">
            {lancamentosFiltradosDoMes.length > 0
              ? `${lancamentosFiltradosDoMes.length} lançamento(s) localizado(s).`
              : 'Nenhum lançamento localizado com esse argumento.'}
          </div>
        )}

        <div className="relative">
          <div
            ref={listaLancamentosRef}
            className={`${listaExpandida && !popupExpandido ? 'overflow-x-auto overflow-y-visible' : 'overflow-y-auto overflow-x-auto'} custom-scroll`}
            style={{
              height: popupExpandido
                ? 'clamp(260px, calc(90dvh - 270px), 680px)'
                : listaExpandida
                  ? 'auto'
                  : `${alturaFinalTabelaLancamentos}px`,
              maxHeight: popupExpandido
                ? 'clamp(260px, calc(90dvh - 270px), 680px)'
                : listaExpandida
                  ? undefined
                  : `${alturaMaximaTabelaLancamentos}px`,
            }}
          >
            <table className="w-full min-w-[540px] table-fixed text-left border-collapse">
              <tbody>
              {lancamentosFiltradosDoMes.length > 0 ? (
                lancamentosFiltradosDoMes.map((lanc) => {
                  // Alguns lançamentos importados foram gravados antes do tipo
                  // "parcela" existir. A sequência no fim da descrição é a fonte
                  // segura para ainda permitir a correção desses registros.
                  const temParcelamento = lanc.tipo === 'parcela' || /\(\s*\d+\s*\/\s*\d+\s*\)\s*$/.test(lanc.descricao || '');
                  const ehDespesaFixa = lanc.tipo === 'fixa' || Boolean(lanc.recorrenciaId);

                  return (
                  <Fragment key={lanc.id}>
                  <tr
                    onClick={(event) => {
                      if (lancamentoEditandoId === lanc.id) return;
                      if ((event.target as HTMLElement).closest('button, input, select, textarea, a')) return;
                      onFocoDespesa();
                      iniciarEdicaoLancamento(lanc);
                    }}
                    className={`cursor-pointer border-b border-dotted transition-colors ${
                      buscaLancamento.trim()
                        ? 'bg-sky-50 border-sky-200'
                        : 'border-slate-300/60 hover:bg-slate-50'
                    }`}
                  >
                    {lancamentoEditandoId === lanc.id ? (
                      <>
                        <td className="py-1.5 px-1.5 w-16 text-center">
                          <input
                            type="number"
                            min={1}
                            max={getMaxDias(mesAtivo, anoSelecionado)}
                            value={editDia}
                            onChange={(e) => setEditDia(e.target.value)}
                            className={`input-dia-compacto h-8 w-full rounded-md border px-2 text-center text-xs font-bold outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                          />
                        </td>

                        <td className="py-1.5 px-1.5 w-[30%]">
                          <select
                            value={editDespesa}
                            onChange={(e) => setEditDespesa(e.target.value)}
                            className={`h-8 w-full rounded-md border px-2 text-xs font-bold outline-none ${
                              darkMode
                                ? 'bg-slate-700 border-slate-600'
                                : 'bg-white border-slate-300'
                            }`}
                            style={{
                              color: editDespesa
                                ? darkMode ? '#ffffff' : '#334155'
                                : darkMode ? '#cbd5e1' : '#94a3b8',
                            }}
                          >
                            <option value="" className="text-slate-400">
                              Selecione...
                            </option>

                            {despesasCadastradas.map((d) => (
                              <option key={d.nome} value={d.nome} className="text-slate-800">
                                {d.nome}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-1.5 px-1.5">
                          <input
                            type="text"
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            className={`h-8 w-full rounded-md border px-2 text-[11px] outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                            placeholder="Descrição..."
                          />
                          {ehDespesaFixa && (
                            <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 ${
                              darkMode ? 'border-indigo-400/30 bg-indigo-400/10' : 'border-indigo-200 bg-indigo-50'
                            }`}>
                              <div>
                                <p className={`text-[10px] font-black ${darkMode ? 'text-indigo-100' : 'text-indigo-900'}`}>Despesa fixa · Sempre</p>
                                <p className={`text-[9px] font-medium leading-tight ${darkMode ? 'text-indigo-100/80' : 'text-indigo-800/80'}`}>
                                  Mantém este mês e os próximos 3; ao fechar um mês, acrescenta o próximo.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDefinirDespesaFixaSempre(lanc)}
                                className={`h-6 cursor-pointer rounded border px-1.5 text-[9px] font-black transition ${
                                  darkMode ? 'border-indigo-300/50 text-indigo-100 hover:bg-indigo-300/15' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                                }`}
                                title="Manter esta despesa fixa continuamente"
                              >
                                Manter sempre
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-1.5 px-1.5 w-32">
                          <input
                            type="text"
                            value={editValor}
                            onChange={handleEditValorChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                salvarEdicaoLancamento();
                              }

                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelarEdicaoLancamento();
                              }
                            }}
                            className={`h-8 w-full rounded-md border px-2 text-right text-xs font-bold outline-none ${
                              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
                            }`}
                            placeholder="0,00"
                          />
                        </td>

                        <td className={`sticky right-0 z-10 w-36 border-l py-1.5 px-1.5 text-center ${
                          darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            {lanc.status === 'prevista' && (
                              <button
                                type="button"
                                onClick={() => onAceitarPrevistaHoje(lanc)}
                                className="rounded-md bg-emerald-600 px-2 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-700"
                                title="Aceitar esta despesa com a data de hoje"
                              >
                                Aceitar hoje
                              </button>
                            )}
                            {lanc.notaArquivoPath && (
                              <button
                                onClick={() => onVerNota(lanc)}
                                className="text-slate-400 hover:text-cyan-600 hover:bg-cyan-500/10 p-1.5 rounded transition-all cursor-pointer"
                                title="Ver nota"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2"/><circle cx="8.5" cy="9" r="1.5" strokeWidth="2"/><path d="m4 18 5-5 3.5 3.5 2.5-2.5 5 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            )}
                            <button
                              onClick={() => salvarEdicaoLancamento()}
                              className="text-green-500 hover:bg-green-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Salvar edição"
                            >
                              ✓
                            </button>

                            <button
                              onClick={cancelarEdicaoLancamento}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Cancelar edição"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="w-16 py-1.5 px-2 text-center text-xs font-bold text-slate-800">
                          {lanc.dia.toString().padStart(2, '0')}
                        </td>

                        <td className="w-[25%] py-1.5 px-2 text-xs font-bold text-slate-800">
                          {lanc.despesa}
                        </td>

                        <td className="w-[30%] py-1.5 px-2 text-[11px] text-slate-500">
                          {renderSeloPrevista(lanc, mesAtivo, anoSelecionado)}
                          {lanc.descricao || '-'}
                        </td>

                        <td className="w-32 py-1.5 px-2 text-right text-xs font-black whitespace-nowrap" style={{ color: '#E5484D' }}>
                          -{formatarMoeda(lanc.valor)}
                        </td>

                        <td className={`sticky right-0 z-10 w-28 border-l py-1.5 px-1 text-center ${
                          buscaLancamento.trim()
                            ? 'border-sky-200 bg-sky-50'
                            : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                onFocoDespesa();
                                iniciarEdicaoLancamento(lanc);
                              }}
                              className="text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Editar"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                />
                              </svg>
                            </button>

                            <button
                              onClick={() => onSolicitarExclusaoLancamento(lanc)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                              title="Apagar"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  {lancamentoEditandoId === lanc.id && temParcelamento && (
                    <tr className={darkMode ? 'border-b border-violet-400/20 bg-violet-400/5' : 'border-b border-violet-200 bg-violet-50/80'}>
                      <td colSpan={5} className="px-2 pb-2 pt-0.5">
                        <div
                          className={`mx-auto flex w-fit items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-bold ${
                            darkMode ? 'border-violet-400/30 bg-violet-400/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-900'
                          }`}
                          role="group"
                          aria-label="Configuração do parcelamento"
                        >
                          <span className="whitespace-nowrap">Parcela atual</span>
                          <input
                            type="number"
                            min={1}
                            max={editTotalParcelas || 120}
                            value={editParcelaAtual}
                            onChange={(e) => setEditParcelaAtual(Math.max(1, Number(e.target.value) || 1))}
                            aria-label="Número da parcela atual"
                            className={`h-7 w-10 rounded border px-1 text-center text-[11px] font-black outline-none ${
                              darkMode ? 'border-violet-300/40 bg-slate-800 text-white' : 'border-violet-200 bg-white text-slate-800'
                            }`}
                          />
                          <span>de</span>
                          <input
                            type="number"
                            min={editParcelaAtual || 1}
                            max={120}
                            value={editTotalParcelas}
                            onChange={(e) => setEditTotalParcelas(Math.max(editParcelaAtual || 1, Number(e.target.value) || 1))}
                            aria-label="Quantidade total de parcelas"
                            className={`h-7 w-10 rounded border px-1 text-center text-[11px] font-black outline-none ${
                              darkMode ? 'border-violet-300/40 bg-slate-800 text-white' : 'border-violet-200 bg-white text-slate-800'
                            }`}
                          />
                          <span className={`ml-1 border-l pl-2 text-[9px] font-medium whitespace-nowrap ${darkMode ? 'border-violet-300/30 text-violet-100/80' : 'border-violet-200 text-violet-800/80'}`}>
                            Salve para reorganizar as próximas parcelas.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-4 text-sm text-slate-400 italic border-t border-slate-200/10"
                  >
                    Nenhuma despesa lançada.
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
          {!listaExpandida && (
            <BotaoProximoScroll
              modo="container"
              scrollContainerRef={listaLancamentosRef}
              className={popupExpandido ? 'av-proximo-scroll-sobre-popup' : ''}
              ariaLabel="Avançar nos lançamentos de despesas"
              title="Próximos lançamentos"
            />
          )}
        </div>
        </>
        )}
      </div>

      {!popupExpandido && expandidoDespesa && (
        <div
          className="flex items-center justify-center"
          style={{ height: `${espacoAcaoExpansaoTabela}px` }}
        >
          {quantidadeLancamentosMes > 10 && (
            <BotaoExpandirCard
              expandido={listaExpandida}
              variante="rodape"
              modo="lista"
              desabilitado={!expandidoDespesa}
              onClick={() => definirListaExpandida(!listaExpandida)}
            />
          )}
        </div>
      )}
    </div>
  );

  return popupExpandido ? (
    <CardExpandidoModal
      aberto
      rotulo="Lançamentos de despesas em tela expandida"
      onFechar={() => definirPopupExpandido(false)}
    >
      {conteudoCard}
    </CardExpandidoModal>
  ) : conteudoCard;
}
