'use client';

import React from 'react';

export type SolicitacaoAprovacao = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  solicitadoEm: string;
  perfilNome: string;
  sistema: string;
};

export type AcessoVendasAprovado = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  aprovadoEm: string;
  perfilNome: string;
  sistema: string;
  papel: string;
  status: 'ativo' | 'bloqueado';
};

type Props = {
  aberto: boolean;
  darkMode: boolean;
  corPrimaria: string;
  solicitacoes: SolicitacaoAprovacao[];
  acessosAprovados: AcessoVendasAprovado[];
  carregando: boolean;
  processandoId: string | null;
  onFechar: () => void;
  onAprovar: (solicitacao: SolicitacaoAprovacao) => void;
  onRejeitar: (solicitacao: SolicitacaoAprovacao) => void;
  onRevogar: (acesso: AcessoVendasAprovado) => void;
  onReativar: (acesso: AcessoVendasAprovado) => void;
  onExcluir: (acesso: AcessoVendasAprovado) => void;
};

function formatarData(data: string) {
  const valor = new Date(data);
  return Number.isNaN(valor.getTime()) ? 'Agora' : valor.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ModalAprovacoes({
  aberto, darkMode, corPrimaria, solicitacoes, acessosAprovados, carregando, processandoId,
  onFechar, onAprovar, onRejeitar, onRevogar, onReativar, onExcluir,
}: Props) {
  const [aba, setAba] = React.useState<'pendentes' | 'aprovados'>('pendentes');

  React.useEffect(() => {
    if (aberto) setAba('pendentes');
  }, [aberto]);

  if (!aberto) return null;

  const superficie = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800';
  const textoSuave = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-[7600] flex items-center justify-center bg-black/60 px-4 py-6" onClick={onFechar}>
      <section className={`flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${superficie}`} onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 px-5 py-4 text-white" style={{ backgroundColor: corPrimaria }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">Configurações</p>
            <h2 className="mt-1 text-xl font-black">Aprovações</h2>
            <p className="mt-1 text-xs font-semibold opacity-85">Acessos aguardando análise dos gestores do perfil.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-black transition hover:bg-white/25" aria-label="Fechar aprovações">×</button>
        </header>

        <div className={`grid grid-cols-2 gap-1 border-b p-1 ${darkMode ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-100'}`}>
          <button type="button" onClick={() => setAba('pendentes')} className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${aba === 'pendentes' ? 'text-white shadow-sm' : textoSuave}`} style={aba === 'pendentes' ? { backgroundColor: corPrimaria } : undefined}>Pendentes ({solicitacoes.length})</button>
          <button type="button" onClick={() => setAba('aprovados')} className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${aba === 'aprovados' ? 'text-white shadow-sm' : textoSuave}`} style={aba === 'aprovados' ? { backgroundColor: corPrimaria } : undefined}>Aprovados ({acessosAprovados.length})</button>
        </div>

        <div className="overflow-y-auto p-4">
          {carregando ? (
            <div className={`rounded-2xl border p-5 text-center text-sm font-semibold ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'} ${textoSuave}`}>Carregando aprovações…</div>
          ) : aba === 'pendentes' && solicitacoes.length === 0 ? (
            <div className={`rounded-2xl border p-6 text-center ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="mt-3 text-sm font-black">Nenhuma aprovação pendente</h3>
              <p className={`mt-1 text-xs leading-relaxed ${textoSuave}`}>Quando alguém solicitar acesso a um módulo deste perfil, o pedido aparecerá aqui.</p>
            </div>
          ) : aba === 'pendentes' ? (
            <div className="space-y-3">
              {solicitacoes.map((solicitacao) => {
                const processando = processandoId === solicitacao.id;
                return (
                  <article key={solicitacao.id} className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/65' : 'border-slate-200 bg-slate-50/80'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black">{solicitacao.nome}</h3>
                        <p className={`mt-0.5 truncate text-xs font-semibold ${textoSuave}`}>{solicitacao.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-600">Pendente</span>
                    </div>

                    <div className={`mt-3 grid grid-cols-2 gap-2 rounded-xl border p-2.5 text-xs ${darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                      <div className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-wide ${textoSuave}`}>Perfil</span><strong className="mt-0.5 block truncate">{solicitacao.perfilNome}</strong></div>
                      <div className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-wide ${textoSuave}`}>Sistema</span><strong className="mt-0.5 block truncate">{solicitacao.sistema}</strong></div>
                    </div>

                    <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold ${textoSuave}`}>
                      {solicitacao.telefone && <span>{solicitacao.telefone}</span>}
                      <span>Solicitado em {formatarData(solicitacao.solicitadoEm)}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" disabled={processando} onClick={() => onRejeitar(solicitacao)} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${darkMode ? 'border-red-800/60 bg-red-950/30 text-red-300 hover:bg-red-900/45' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}>Rejeitar</button>
                      <button type="button" disabled={processando} onClick={() => onAprovar(solicitacao)} className="rounded-xl px-3 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{processando ? 'Salvando…' : 'Aprovar'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : acessosAprovados.length === 0 ? (
            <div className={`rounded-2xl border p-6 text-center ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="text-sm font-black">Nenhum acesso aprovado</h3>
              <p className={`mt-1 text-xs leading-relaxed ${textoSuave}`}>Os usuários aprovados para o Vendas Mobile aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {acessosAprovados.map((acesso) => {
                const processando = processandoId === acesso.id;
                const ativo = acesso.status === 'ativo';
                return (
                  <article key={acesso.id} className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800/65' : 'border-slate-200 bg-slate-50/80'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black">{acesso.nome}</h3>
                        <p className={`mt-0.5 truncate text-xs font-semibold ${textoSuave}`}>{acesso.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${ativo ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'}`}>{ativo ? 'Ativo' : 'Revogado'}</span>
                    </div>
                    <div className={`mt-3 grid grid-cols-2 gap-2 rounded-xl border p-2.5 text-xs ${darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                      <div className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-wide ${textoSuave}`}>Perfil</span><strong className="mt-0.5 block truncate">{acesso.perfilNome}</strong></div>
                      <div className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-wide ${textoSuave}`}>Papel</span><strong className="mt-0.5 block truncate capitalize">{acesso.papel}</strong></div>
                    </div>
                    <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold ${textoSuave}`}>
                      {acesso.telefone && <span>{acesso.telefone}</span>}
                      <span>Aprovado em {formatarData(acesso.aprovadoEm)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" disabled={processando} onClick={() => ativo ? onRevogar(acesso) : onReativar(acesso)} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:opacity-60 ${ativo ? (darkMode ? 'border-amber-800/60 bg-amber-950/30 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700') : (darkMode ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}`}>{processando ? 'Salvando…' : ativo ? 'Revogar' : 'Reativar'}</button>
                      <button type="button" disabled={processando} onClick={() => onExcluir(acesso)} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:opacity-60 ${darkMode ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-red-200 bg-red-50 text-red-600'}`}>Excluir</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
