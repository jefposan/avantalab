'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import DraggableModalCard from './DraggableModalCard';
import { supabase } from '../lib/supabase';
import {
  cancelamentoProgramado,
  emCarencia,
  rotuloPlano,
  rotuloStatusAssinatura,
  type DadosCobrancaAssinatura,
  type EstadoAcesso,
} from '../lib/cobranca';

type Fatura = {
  id: string;
  status: string;
  valor: number;
  vencimento: string | null;
  pagamentoEm: string | null;
  formaPagamento: string | null;
  invoiceUrl: string | null;
};

type DetalhesAssinatura = {
  estado: EstadoAcesso | null;
  assinatura: {
    status: string | null;
    valor: number;
    ciclo: string | null;
    proximoVencimento: string | null;
    formaPagamento: string | null;
  } | null;
  faturas: Fatura[];
  viaCupom?: boolean; // cortesia concedida por cupom
  podeGerenciar: boolean;
};

interface AssinaturaModalProps {
  aberto: boolean;
  onFechar: () => void;
  onEstadoAtualizado?: (estado: EstadoAcesso | null) => void;
  onAssinar?: (ciclo: 'mensal' | 'anual', dados: DadosCobrancaAssinatura) => Promise<{ ok: boolean; url?: string; mensagem?: string } | void>;
  empresaId: string | null;
  nomePadrao?: string;
  emailPadrao?: string;
  telefonePadrao?: string;
  darkMode?: boolean;
  corPrimaria?: string;
  estado: EstadoAcesso | null;
  // Tipo do perfil aberto (fonte confiável; o tipoPerfil do estado é fallback).
  tipoPerfil?: 'empresa' | 'pessoal';
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

function dinheiro(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function rotuloFatura(status: string): { texto: string; classe: string } {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status)) return { texto: 'Paga', classe: 'bg-emerald-100 text-emerald-700' };
  if (status === 'OVERDUE') return { texto: 'Vencida', classe: 'bg-red-100 text-red-700' };
  if (['REFUNDED', 'REFUND_REQUESTED'].includes(status)) return { texto: 'Estornada', classe: 'bg-slate-200 text-slate-700' };
  if (status === 'PENDING') return { texto: 'Pendente', classe: 'bg-amber-100 text-amber-700' };
  return { texto: 'Em análise', classe: 'bg-sky-100 text-sky-700' };
}

function corStatus(status: string): { bg: string; texto: string } {
  if (status === 'ativa' || status === 'cortesia') return { bg: '#DCFCE7', texto: '#15803D' };
  if (status === 'trial') return { bg: '#DBEAFE', texto: '#1D4ED8' };
  if (status === 'inadimplente') return { bg: '#FEF3C7', texto: '#B45309' };
  return { bg: '#FEE2E2', texto: '#B91C1C' };
}

export default function AssinaturaModal({
  aberto,
  onFechar,
  onEstadoAtualizado,
  onAssinar,
  empresaId,
  nomePadrao = '',
  emailPadrao = '',
  telefonePadrao = '',
  darkMode = false,
  corPrimaria = '#0A1F44',
  estado,
  tipoPerfil,
}: AssinaturaModalProps) {
  const [detalhes, setDetalhes] = useState<DetalhesAssinatura | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [acao, setAcao] = useState<'mensal' | 'anual' | 'cancelar' | 'assinar-mensal' | 'assinar-anual' | null>(null);
  const [erro, setErro] = useState('');
  const [nomeCobranca, setNomeCobranca] = useState(nomePadrao);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [emailCobranca, setEmailCobranca] = useState(emailPadrao);
  const [telefoneCobranca, setTelefoneCobranca] = useState(telefonePadrao);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const requisicaoRef = useRef(false);

  const carregar = useCallback(async () => {
    if (!empresaId || requisicaoRef.current) return;
    requisicaoRef.current = true;
    setCarregando(true);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) throw new Error('Sessão não encontrada.');
      const resposta = await fetch(`/api/cobranca/gerenciar?empresaId=${encodeURIComponent(empresaId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível carregar a assinatura.');
      setDetalhes(json);
      onEstadoAtualizado?.(json.estado || null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a assinatura.');
    } finally {
      requisicaoRef.current = false;
      setCarregando(false);
    }
  }, [empresaId, onEstadoAtualizado]);

  useEffect(() => {
    if (!aberto) return;
    const timer = window.setTimeout(() => {
      setNomeCobranca((atual) => atual || nomePadrao);
      setEmailCobranca((atual) => atual || emailPadrao);
      setTelefoneCobranca((atual) => atual || telefonePadrao);
      void carregar();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [aberto, carregar, nomePadrao, emailPadrao, telefonePadrao]);

  if (!aberto) return null;

  const fechar = () => {
    setConfirmarCancelamento(false);
    onFechar();
  };

  const executar = async (tipo: 'mensal' | 'anual' | 'cancelar') => {
    if (!empresaId || acao) return;
    setAcao(tipo);
    setErro('');
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) throw new Error('Sessão não encontrada.');
      const resposta = await fetch('/api/cobranca/gerenciar', {
        method: tipo === 'cancelar' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(tipo === 'cancelar' ? { empresaId } : { empresaId, ciclo: tipo }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível concluir a alteração.');
      setConfirmarCancelamento(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir a alteração.');
    } finally {
      setAcao(null);
    }
  };

  const assinar = async (ciclo: 'mensal' | 'anual') => {
    if (acao) return;
    const documento = cpfCnpj.replace(/\D/g, '');
    const telefone = telefoneCobranca.replace(/\D/g, '');
    const nome = nomeCobranca.trim().replace(/\s+/g, ' ');
    const email = emailCobranca.trim().toLowerCase();
    if (nome.length < 3) {
      setErro('Informe o nome ou razão social para a cobrança.');
      return;
    }
    if (documento.length !== 11 && documento.length !== 14) {
      setErro('Informe um CPF ou CNPJ válido para a cobrança.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro('Informe um e-mail de cobrança válido.');
      return;
    }
    if (telefone.length < 10 || telefone.length > 13) {
      setErro('Informe um telefone de cobrança válido.');
      return;
    }
    const janela = window.open('', '_blank');
    setAcao(`assinar-${ciclo}`);
    setErro('');
    try {
      const resultado = await onAssinar?.(ciclo, { nome, cpfCnpj: documento, email, telefone });
      if (resultado && resultado.ok && resultado.url) {
        if (janela) janela.location.href = resultado.url;
        else window.open(resultado.url, '_blank');
        await carregar();
      } else {
        if (janela) janela.close();
        setErro((resultado && resultado.mensagem) || 'Não foi possível iniciar a assinatura.');
      }
    } catch {
      if (janela) janela.close();
      setErro('Não foi possível iniciar a assinatura agora.');
    } finally {
      setAcao(null);
    }
  };

  const estadoAtual = detalhes?.estado || estado;
  const status = estadoAtual?.status || 'expirada';
  const carencia = emCarencia(estadoAtual);
  const canceladaNoFim = cancelamentoProgramado(estadoAtual);
  const cicloAtual = estadoAtual?.ciclo;
  const assinatura = detalhes?.assinatura;
  const faturas = detalhes?.faturas || [];
  const podeGerenciar = detalhes?.podeGerenciar !== false;
  // Cortesia (admin/benefício Empresa) e cupom: não exibem dados de cobrança
  // do gateway — mesmo que exista um registro antigo na Asaas.
  // Cortesia explícita, ou "ativa" sem cobrança e sem plano (cliente anterior
  // ao lançamento — acesso liberado de graça = cortesia na prática).
  const cortesiaAtiva = status === 'cortesia'
    || (status === 'ativa' && !assinatura && !cicloAtual && !estadoAtual?.plano);
  const viaCupom = cortesiaAtiva && Boolean(detalhes?.viaCupom);
  const tipoPessoal = (tipoPerfil ?? estadoAtual?.tipoPerfil) === 'pessoal';
  const tipoLabel = tipoPessoal ? 'Pessoal' : 'Empresa';
  // Atraso: pagamento pendente ou fatura vencida (cortesia tem prioridade).
  const temFaturaVencida = faturas.some((f) => f.status === 'OVERDUE');
  const emAtraso = !cortesiaAtiva && (status === 'inadimplente' || temFaturaVencida);
  const selo = emAtraso ? { bg: '#FEE2E2', texto: '#B91C1C' } : corStatus(status);
  const rotuloSituacao = canceladaNoFim
    ? 'Cancelada ao fim do período'
    : viaCupom ? 'Cupom'
    : emAtraso ? 'Atraso'
    : cortesiaAtiva ? 'Cortesia'
    : rotuloStatusAssinatura(status);
  // Plano atual: "<Tipo> · mensal/anual" (pago) ou "<Tipo> · cortesia/cupom".
  const rotuloPlanoExibido = cortesiaAtiva
    ? `${tipoLabel} · ${viaCupom ? 'cupom' : 'cortesia'}`
    : cicloAtual ? `${tipoLabel} · ${cicloAtual}`
    : estadoAtual?.plano ? tipoLabel
    : '—';
  // Valor e vencimento: só em plano pago (mensal/anual).
  const planoPago = !cortesiaAtiva && Boolean(assinatura);
  const valorExibido = planoPago && assinatura ? dinheiro(assinatura.valor) : '—';
  const vencimentoExibido = viaCupom
    ? (estadoAtual?.validoAte ? formatarData(estadoAtual.validoAte) : 'Sem prazo')
    : planoPago ? formatarData(assinatura?.proximoVencimento || null)
    : '—';
  const podeContratar = !assinatura && (
    estadoAtual?.status === 'trial'
    || (tipoPessoal && estadoAtual?.status === 'expirada')
  );
  const precoMensal = tipoPessoal ? 'R$ 9,90' : 'R$ 34,90';
  const precoAnual = tipoPessoal ? 'R$ 99,00' : 'R$ 348,00';
  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const painel = darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50';

  return (
    <div className="av-modal-backdrop fixed inset-0 z-[5600] flex items-center justify-center bg-black/60 px-4 py-5" onClick={fechar}>
      <DraggableModalCard
        className={`av-modal-panel flex w-full max-w-2xl flex-col overflow-hidden rounded-[16px_32px_32px_32px] border shadow-2xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="flex shrink-0 cursor-grab items-start justify-between gap-3 px-6 py-4 text-white active:cursor-grabbing" style={{ background: corPrimaria }}>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">AvantaLab</p><h2 className="mt-0.5 text-lg font-semibold">Assinatura</h2></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void carregar()} disabled={carregando} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50" title="Atualizar" aria-label="Atualizar assinatura">↻</button>
            <button type="button" onClick={fechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="av-modal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {erro && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{erro}</div>}
          {carregando && !detalhes ? <div className="py-14 text-center text-sm font-medium text-slate-500">Carregando assinatura...</div> : <>
            {carencia && <div className="mb-4 w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900"><strong>Pagamento pendente.</strong> Regularize até {formatarData(estadoAtual?.validoAte || null)} para evitar o bloqueio do perfil.</div>}
            {canceladaNoFim && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"><strong>Renovação cancelada.</strong> O acesso permanece disponível até {formatarData(estadoAtual?.validoAte || null)}.</div>}

            <div className={`grid gap-3 rounded-[14px_24px_24px_24px] border p-4 sm:grid-cols-2 ${painel}`}>
              <div><span className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Situação</span><div className="mt-1"><span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: selo.bg, color: selo.texto }}>{rotuloSituacao}</span></div></div>
              <div><span className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Plano atual</span><strong className="mt-1 block text-sm font-semibold">{rotuloPlanoExibido}</strong></div>
              <div><span className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Valor</span><strong className="mt-1 block text-sm font-semibold">{valorExibido}</strong></div>
              <div><span className={`text-[10px] font-semibold uppercase tracking-wide ${muted}`}>Próximo vencimento</span><strong className="mt-1 block text-sm font-semibold">{vencimentoExibido}</strong></div>
            </div>

            {podeGerenciar && podeContratar && <section className="mt-5">
              <h3 className="text-sm font-semibold">Contratar assinatura</h3>
              <p className={`mt-1 text-xs ${muted}`}>Você pode contratar agora sem perder os dias restantes do período de teste.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input type="text" value={nomeCobranca} onChange={(e) => setNomeCobranca(e.target.value)} placeholder="Nome ou razão social" className={`h-10 rounded-lg border px-3 text-sm outline-none focus:border-sky-600 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`} />
                <input type="text" inputMode="numeric" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="CPF ou CNPJ" className={`h-10 rounded-lg border px-3 text-sm outline-none focus:border-sky-600 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`} />
                <input type="email" value={emailCobranca} onChange={(e) => setEmailCobranca(e.target.value)} placeholder="E-mail de cobrança" className={`h-10 rounded-lg border px-3 text-sm outline-none focus:border-sky-600 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`} />
                <input type="tel" inputMode="tel" value={telefoneCobranca} onChange={(e) => setTelefoneCobranca(e.target.value)} placeholder="Telefone" className={`h-10 rounded-lg border px-3 text-sm outline-none focus:border-sky-600 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={acao !== null} onClick={() => void assinar('mensal')} className="h-11 rounded-lg border border-sky-300 bg-sky-50 text-xs font-semibold uppercase text-sky-700 disabled:opacity-60">{acao === 'assinar-mensal' ? 'Processando...' : `Mensal · ${precoMensal}`}</button>
                <button type="button" disabled={acao !== null} onClick={() => void assinar('anual')} className="h-11 rounded-lg bg-sky-700 text-xs font-semibold uppercase text-white disabled:opacity-60">{acao === 'assinar-anual' ? 'Processando...' : `Anual · ${precoAnual}`}</button>
              </div>
            </section>}

            {podeGerenciar && assinatura && !canceladaNoFim && !cortesiaAtiva && <section className="mt-5">
              <h3 className="text-sm font-semibold">Ciclo de cobrança</h3>
              <p className={`mt-1 text-xs ${muted}`}>A alteração vale para a próxima renovação e não modifica cobranças já geradas.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['mensal', 'anual'] as const).map((ciclo) => <button key={ciclo} type="button" disabled={acao !== null || cicloAtual === ciclo} onClick={() => void executar(ciclo)} className={`h-11 rounded-lg border px-3 text-xs font-semibold uppercase transition disabled:cursor-default ${cicloAtual === ciclo ? 'border-sky-600 bg-sky-600 text-white' : darkMode ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-sky-500' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-600 hover:text-sky-700'} disabled:opacity-70`}>{acao === ciclo ? 'Alterando...' : ciclo}</button>)}
              </div>
            </section>}

            <section className="mt-5">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Faturas recentes</h3><span className={`text-xs ${muted}`}>{faturas.length} registro(s)</span></div>
              <div className="mt-3 grid gap-2">
                {faturas.length === 0 ? <div className={`rounded-lg border border-dashed p-5 text-center text-sm ${muted} ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}>Nenhuma fatura disponível.</div> : faturas.map((fatura) => {
                  const rotulo = rotuloFatura(fatura.status);
                  return <div key={fatura.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 ${painel}`}>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-semibold">{dinheiro(fatura.valor)}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${rotulo.classe}`}>{rotulo.texto}</span></div><p className={`mt-1 text-xs ${muted}`}>Vencimento: {formatarData(fatura.vencimento)}</p></div>
                    {fatura.invoiceUrl && !['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(fatura.status) && <a href={fatura.invoiceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-[10px] font-semibold uppercase text-sky-700 transition hover:bg-sky-700 hover:text-white">2ª via</a>}
                  </div>;
                })}
              </div>
            </section>

            {podeGerenciar && assinatura && !canceladaNoFim && !cortesiaAtiva && <section className="mt-5 border-t border-slate-200 pt-4">
              {!confirmarCancelamento ? <button type="button" onClick={() => setConfirmarCancelamento(true)} className="h-10 w-full rounded-lg border border-red-200 bg-red-50 text-xs font-semibold uppercase text-red-600 transition hover:bg-red-600 hover:text-white">Cancelar renovação</button> : <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-xs font-medium leading-relaxed text-red-800">A renovação será interrompida. O perfil continuará acessível até o fim do período já pago.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmarCancelamento(false)} className="h-9 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600">Voltar</button><button type="button" disabled={acao !== null} onClick={() => void executar('cancelar')} className="h-9 rounded-lg bg-red-600 text-xs font-semibold text-white disabled:opacity-60">{acao === 'cancelar' ? 'Cancelando...' : 'Confirmar'}</button></div></div>}
            </section>}
          </>}
        </div>
      </DraggableModalCard>
    </div>
  );
}
