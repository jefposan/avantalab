'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  exportarLancamentosMesExcel,
  exportarLancamentosMesPdf,
  type DadosExportacaoLancamentosMes,
  type LinhaExportacaoLancamentoMes,
} from '@/app/lib/exportacao-lancamentos-mes';

type Props = {
  opcoesMes: DadosExportacaoLancamentosMes[];
  mesInicial: string;
  darkMode?: boolean;
  corPrimaria: string;
  aberto?: boolean;
  onAbertoChange?: (aberto: boolean) => void;
};

type FiltrosRelatorio = { despesas: boolean; receitas: boolean; previstos: boolean };

export const filtrarLinhasRelatorio = (linhas: LinhaExportacaoLancamentoMes[], filtros: FiltrosRelatorio) =>
  linhas.filter((linha) => {
    if (linha.status === 'Prevista') return filtros.previstos;
    return linha.tipo === 'Despesa' ? filtros.despesas : filtros.receitas;
  });

export default function ExportarLancamentosMes({ opcoesMes, mesInicial, darkMode = false, corPrimaria, aberto: abertoExterno, onAbertoChange }: Props) {
  const [abertoInterno, setAbertoInterno] = useState(false);
  const aberto = abertoExterno ?? abertoInterno;
  const [anoSelecionado, setAnoSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState(mesInicial);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({ despesas: true, receitas: true, previstos: true });
  const [processando, setProcessando] = useState<'excel' | 'pdf' | null>(null);
  const [erro, setErro] = useState('');

  const definirAberto = (proximoAberto: boolean) => {
    if (abertoExterno === undefined) setAbertoInterno(proximoAberto);
    onAbertoChange?.(proximoAberto);
  };

  useEffect(() => {
    if (aberto) {
      setErro('');
      return;
    }
    const inicial = opcoesMes.find((opcao) => opcao.mes === mesInicial && opcao.linhas.length) || opcoesMes.find((opcao) => opcao.linhas.length);
    setAnoSelecionado(String(inicial?.ano || ''));
    setMesSelecionado(inicial?.mes || mesInicial);
  }, [aberto, mesInicial, opcoesMes]);

  const opcoesComDados = useMemo(() => opcoesMes.filter((opcao) => opcao.linhas.length > 0), [opcoesMes]);
  const anosComDados = useMemo(
    () => [...new Set(opcoesComDados.map((opcao) => String(opcao.ano)))].sort((a, b) => Number(b) - Number(a)),
    [opcoesComDados],
  );
  const mesesComDados = useMemo(
    () => opcoesComDados.filter((opcao) => String(opcao.ano) === anoSelecionado),
    [anoSelecionado, opcoesComDados],
  );

  const dadosSelecionados = useMemo(
    () => mesesComDados.find((opcao) => opcao.mes === mesSelecionado) || mesesComDados[0],
    [mesSelecionado, mesesComDados],
  );
  const linhas = useMemo(
    () => filtrarLinhasRelatorio(dadosSelecionados?.linhas || [], filtros),
    [dadosSelecionados, filtros],
  );

  const exportar = async (formato: 'excel' | 'pdf') => {
    if (!filtros.despesas && !filtros.receitas && !filtros.previstos) {
      setErro('Selecione ao menos um tipo de lançamento para o relatório.');
      return;
    }
    if (!linhas.length || !dadosSelecionados) {
      setErro('Não há lançamentos com estes filtros neste mês.');
      return;
    }
    setProcessando(formato);
    setErro('');
    try {
      const dados = { ...dadosSelecionados, linhas };
      if (formato === 'excel') await exportarLancamentosMesExcel(dados);
      else await exportarLancamentosMesPdf(dados);
      definirAberto(false);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar o arquivo.');
    } finally {
      setProcessando(null);
    }
  };

  const superficie = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const auxiliar = darkMode ? 'text-slate-300' : 'text-slate-600';
  const alternarFiltro = (chave: keyof FiltrosRelatorio) => {
    setErro('');
    setFiltros((atual) => ({ ...atual, [chave]: !atual[chave] }));
  };

  return <>
    {aberto && <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/75 px-4 py-6" role="presentation" onPointerDown={(evento) => { if (evento.target === evento.currentTarget && !processando) definirAberto(false); }}>
      <section className={`flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${superficie}`} role="dialog" aria-modal="true" aria-labelledby="titulo-exportar-lancamentos">
        <header className="shrink-0 px-5 py-4 text-white" style={{ backgroundColor: corPrimaria }}>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/70">Relatório financeiro</p>
          <h2 id="titulo-exportar-lancamentos" className="mt-1 text-lg font-black">Configurar exportação</h2>
        </header>
        <div className="grid gap-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">
              <span className={auxiliar}>Mês</span>
              <select value={mesSelecionado} onChange={(evento) => { setErro(''); setMesSelecionado(evento.target.value); }} className={`h-11 rounded-xl border px-3 text-sm font-bold normal-case outline-none focus:ring-2 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500' : 'border-slate-300 bg-white text-slate-800 focus:ring-sky-400'}`}>
                {mesesComDados.map((opcao) => <option key={opcao.mes} value={opcao.mes}>{opcao.mes}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide">
              <span className={auxiliar}>Ano</span>
              <select value={anoSelecionado} onChange={(evento) => { const ano = evento.target.value; setErro(''); setAnoSelecionado(ano); setMesSelecionado(opcoesComDados.find((opcao) => String(opcao.ano) === ano)?.mes || ''); }} className={`h-11 rounded-xl border px-3 text-sm font-bold outline-none focus:ring-2 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100 focus:ring-sky-500' : 'border-slate-300 bg-white text-slate-800 focus:ring-sky-400'}`}>
                {anosComDados.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className={`text-xs font-black uppercase tracking-wide ${auxiliar}`}>Incluir no relatório</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['despesas', 'Despesas', 'Realizadas'],
                ['receitas', 'Receitas', 'Realizadas'],
                ['previstos', 'Previstos', 'Receitas e despesas'],
              ] as const).map(([chave, titulo, ajuda]) => <label key={chave} className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                <input type="checkbox" checked={filtros[chave]} onChange={() => alternarFiltro(chave)} className="h-4 w-4 rounded border-slate-400" style={{ accentColor: corPrimaria }} />
                <span><span className="block text-xs font-black">{titulo}</span><span className={`block text-[10px] font-semibold ${auxiliar}`}>{ajuda}</span></span>
              </label>)}
            </div>
          </fieldset>
          <p className={`text-xs font-semibold leading-relaxed ${auxiliar}`}>{linhas.length} lançamento{linhas.length === 1 ? '' : 's'} será{linhas.length === 1 ? '' : 'ão'} incluído{linhas.length === 1 ? '' : 's'} em <strong>{dadosSelecionados?.mes} de {dadosSelecionados?.ano}</strong>.</p>
          {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={Boolean(processando)} onClick={() => void exportar('excel')} className={`rounded-xl border p-4 text-left transition disabled:opacity-60 ${darkMode ? 'border-emerald-900 bg-emerald-950/30 hover:bg-emerald-950/50' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
              <span className="block text-sm font-black text-emerald-700">Planilha XLS</span><span className={`mt-1 block text-xs font-semibold ${auxiliar}`}>{processando === 'excel' ? 'Gerando arquivo…' : 'Dados detalhados e resumo mensal.'}</span>
            </button>
            <button type="button" disabled={Boolean(processando)} onClick={() => void exportar('pdf')} className={`rounded-xl border p-4 text-left transition disabled:opacity-60 ${darkMode ? 'border-sky-900 bg-sky-950/30 hover:bg-sky-950/50' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'}`}>
              <span className="block text-sm font-black text-sky-700">PDF</span><span className={`mt-1 block text-xs font-semibold ${auxiliar}`}>{processando === 'pdf' ? 'Gerando arquivo…' : 'Relatório pronto para compartilhar ou imprimir.'}</span>
            </button>
          </div>
        </div>
        <footer className={`shrink-0 border-t p-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" disabled={Boolean(processando)} onClick={() => definirAberto(false)} className={`h-10 w-full rounded-lg border text-xs font-black uppercase tracking-wide disabled:opacity-60 ${darkMode ? 'border-slate-600 text-slate-100' : 'border-slate-300 text-slate-700'}`}>Cancelar</button></footer>
      </section>
    </div>}
  </>;
}
