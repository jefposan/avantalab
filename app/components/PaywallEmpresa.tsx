'use client';
import React, { useRef, useState } from 'react';
import { PRECOS, type DadosCobrancaAssinatura, type EstadoAcesso } from '../lib/cobranca';

// Formata como CPF (000.000.000-00) até 11 dígitos, ou CNPJ (00.000.000/0000-00) acima.
function formatarCpfCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    let out = d.slice(0, 3);
    if (d.length > 3) out += '.' + d.slice(3, 6);
    if (d.length > 6) out += '.' + d.slice(6, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  let out = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
}

interface PaywallEmpresaProps {
  nomePerfil?: string;
  emailPadrao?: string;
  telefonePadrao?: string;
  estadoAcesso?: EstadoAcesso | null;
  faturaPendenteUrl?: string | null;
  // Retorna { ok, url } em caso de sucesso, ou { ok:false, mensagem } em caso de falha.
  onAssinar?: (ciclo: 'mensal' | 'anual', dados: DadosCobrancaAssinatura) => Promise<{ ok: boolean; url?: string; mensagem?: string } | void>;
  onEscolherPlano?: (ciclo: 'mensal' | 'anual') => void;
  onAtualizarPagamento?: () => Promise<{ ok: boolean; liberado: boolean; mensagem?: string }>;
  // Resgate de cupom: retorna mensagem de erro (string) ou nada em caso de sucesso.
  onResgatarCupom?: (codigo: string) => Promise<string | null | void>;
  onTrocarPerfil?: () => void; // volta à seleção de perfis (se houver mais de um)
  onCriarPerfil?: () => void;  // cria um novo perfil (empresa/pessoal)
  onSair?: () => void;
  // O componente também atende o bloqueio do Gestão Web no plano Pessoal
  // gratuito, preservando o mesmo fluxo de assinatura e cupom.
  tipoPerfil?: 'empresa' | 'pessoal';
}

const GRADIENTE = 'linear-gradient(135deg,#003E73,#00A6C8)';

// Tela mostrada quando o perfil empresa precisa regularizar ou iniciar a
// assinatura, com a identidade visual da tela de login.
export default function PaywallEmpresa({ nomePerfil, emailPadrao, telefonePadrao, estadoAcesso, faturaPendenteUrl, onAssinar, onEscolherPlano, onAtualizarPagamento, onResgatarCupom, onTrocarPerfil, onCriarPerfil, onSair, tipoPerfil = 'empresa' }: PaywallEmpresaProps) {
  const [carregando, setCarregando] = useState<'mensal' | 'anual' | null>(null);
  const [erro, setErro] = useState('');
  const [nomeCobranca, setNomeCobranca] = useState(nomePerfil || '');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [emailCobranca, setEmailCobranca] = useState(emailPadrao || '');
  const [telefoneCobranca, setTelefoneCobranca] = useState(telefonePadrao || '');
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);
  const [atualizandoPagamento, setAtualizandoPagamento] = useState(false);
  const [pagamentoMsg, setPagamentoMsg] = useState('');
  const [cupom, setCupom] = useState('');
  const [resgatando, setResgatando] = useState(false);
  const [cupomErro, setCupomErro] = useState('');
  const [instanteAbertura] = useState(() => Date.now());
  const assinaturaEmCursoRef = useRef(false);
  const resgateEmCursoRef = useRef(false);
  const acessoWebPessoal = tipoPerfil === 'pessoal';
  const precoMensal = PRECOS[acessoWebPessoal ? 'pessoal_premium' : 'empresa'].mensal;
  const precoAnual = PRECOS[acessoWebPessoal ? 'pessoal_premium' : 'empresa'].anual;
  const economiaAnual = Math.round((precoMensal * 12 - precoAnual) * 100) / 100;

  const trialRealmenteVencido = (estadoAcesso?.status === 'trial' || estadoAcesso?.status === 'expirada')
    && !!estadoAcesso.trialFim
    && new Date(estadoAcesso.trialFim).getTime() <= instanteAbertura;
  const tituloBloqueio = acessoWebPessoal
    ? 'A Gestão Web é exclusiva para o Premium Pessoal'
    : trialRealmenteVencido
    ? 'Seu teste de 7 dias terminou'
    : estadoAcesso?.status === 'inadimplente'
      ? 'Há um pagamento pendente'
      : estadoAcesso?.status === 'cancelada'
        ? 'Sua assinatura foi cancelada'
        : estadoAcesso?.status === 'expirada'
          ? 'Este perfil aguarda uma assinatura ativa'
          : 'Este perfil precisa de uma assinatura ativa';
  const textoBloqueio = acessoWebPessoal
    ? 'Seu plano gratuito continua disponível no Gestão Mobile. Assine ou aplique um cupom para acessar também a Gestão Web.'
    : trialRealmenteVencido
    ? 'Assine para continuar. Seus dados permanecem guardados.'
    : estadoAcesso?.status === 'inadimplente'
      ? 'Regularize o pagamento para liberar novamente o acesso ao perfil.'
      : 'Escolha um plano para ativar o perfil. Seus dados permanecem guardados.';

  const resgatar = async () => {
    const codigo = cupom.trim();
    if (!codigo || resgateEmCursoRef.current) return;
    resgateEmCursoRef.current = true;
    setCupomErro('');
    setResgatando(true);
    try {
      const r = await onResgatarCupom?.(codigo);
      if (typeof r === 'string' && r) setCupomErro(r);
      // sucesso: o handler recarrega a página (o acesso é liberado)
    } catch {
      setCupomErro('Não foi possível aplicar o cupom agora.');
    } finally {
      resgateEmCursoRef.current = false;
      setResgatando(false);
    }
  };

  const clicar = async (ciclo: 'mensal' | 'anual') => {
    if (assinaturaEmCursoRef.current) return;
    if (onEscolherPlano) {
      onEscolherPlano(ciclo);
      return;
    }
    const digitos = cpfCnpj.replace(/\D/g, '');
    const telefone = telefoneCobranca.replace(/\D/g, '');
    const nome = nomeCobranca.trim().replace(/\s+/g, ' ');
    const email = emailCobranca.trim().toLowerCase();
    if (nome.length < 3) {
      setErro('Informe o nome ou razão social para a cobrança.');
      return;
    }
    if (digitos.length !== 11 && digitos.length !== 14) {
      setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) para a cobrança.');
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
    // Abre a aba do pagamento já no clique (evita bloqueio de pop-up).
    const janela = window.open('', '_blank');
    assinaturaEmCursoRef.current = true;
    setErro('');
    setCarregando(ciclo);
    try {
      const r = await onAssinar?.(ciclo, { nome, cpfCnpj: digitos, email, telefone });
      if (r && typeof r === 'object' && r.ok && r.url) {
        if (janela) janela.location.href = r.url;
        else window.open(r.url, '_blank');
        setAguardandoPagamento(true);
      } else {
        if (janela) janela.close();
        setErro((r && typeof r === 'object' && r.mensagem) || 'Não foi possível iniciar a assinatura.');
      }
    } catch {
      if (janela) janela.close();
      setErro('Não foi possível iniciar a assinatura agora.');
    } finally {
      assinaturaEmCursoRef.current = false;
      setCarregando(null);
    }
  };

  const pagarCobranca = () => {
    if (!faturaPendenteUrl) return;
    window.open(faturaPendenteUrl, '_blank', 'noopener,noreferrer');
    setAguardandoPagamento(true);
  };

  const atualizarPagamento = async () => {
    if (!onAtualizarPagamento || atualizandoPagamento) return;
    setAtualizandoPagamento(true);
    setPagamentoMsg('');
    setErro('');
    try {
      const resultado = await onAtualizarPagamento();
      const mensagem = resultado.mensagem || (
        resultado.liberado
          ? 'Pagamento confirmado. Acesso liberado.'
          : 'Pagamento ainda não confirmado pela Asaas. Tente novamente em instantes.'
      );
      if (resultado.liberado) setPagamentoMsg(mensagem);
      else setErro(mensagem);
    } catch {
      setErro('Não foi possível consultar a Asaas agora.');
    } finally {
      setAtualizandoPagamento(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20';

  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      {/* Fundo (mesmo da tela de login) */}
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab-mobile.webp') type('image/webp'), url('/images/bg-avantalab-mobile.png') type('image/png'))" }}
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-white/10 lg:block" />

      <section className="relative z-10 flex min-h-screen items-start px-4 pb-6 pt-6 lg:items-center lg:px-20 lg:py-10">
        <div className="w-full lg:max-w-7xl">
          <div className="relative z-20 w-full rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl lg:max-w-lg lg:border-white/30 lg:bg-white/70 lg:p-5 lg:backdrop-blur-xl">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-700">Assinatura</p>
          <h1 className="text-lg font-black leading-tight text-slate-900 lg:text-xl">
            {tituloBloqueio}
          </h1>

          {/* Perfil bloqueado — destaque forte */}
          <div className="mt-2.5 rounded-2xl border-2 border-sky-400 px-3 py-2 text-center shadow-md" style={{ background: GRADIENTE }}>
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/80">{acessoWebPessoal ? 'Acesso web' : 'Perfil bloqueado'}</span>
            <span className="mt-0.5 block truncate text-lg font-black text-white">{nomePerfil || 'Este perfil'}</span>
          </div>

          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">
            {textoBloqueio}
          </p>

          {erro && (
            <div className="mt-3 rounded-xl border border-red-300 bg-red-50/90 px-3 py-2 text-xs font-bold text-red-700">
              {erro}
            </div>
          )}

          {aguardandoPagamento && (
            <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50/90 px-3 py-2 text-xs font-semibold text-sky-900">
              Abrimos o pagamento em outra aba. Depois de concluir (Pix na hora, ou boleto ao compensar), volte aqui e clique em atualizar.
              <button
                type="button"
                onClick={atualizarPagamento}
                disabled={atualizandoPagamento}
                className="mt-2 h-9 w-full rounded-xl text-xs font-black uppercase tracking-wide text-white shadow transition hover:brightness-110"
                style={{ background: GRADIENTE }}
              >
                {atualizandoPagamento ? 'Atualizando...' : 'Já paguei — atualizar'}
              </button>
            </div>
          )}

          {pagamentoMsg && (
            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-xs font-bold text-emerald-700">
              {pagamentoMsg}
            </div>
          )}

          {faturaPendenteUrl ? (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-3 shadow-sm">
              <p className="text-xs font-black text-slate-900">Cobrança disponível</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                Já existe uma cobrança pendente para este perfil. Abra o link de pagamento para regularizar o acesso.
              </p>
              <button
                type="button"
                onClick={pagarCobranca}
                className="mt-2.5 h-10 w-full rounded-xl text-xs font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
                style={{ background: GRADIENTE }}
              >
                Pagar cobrança
              </button>
            </div>
          ) : (
            <>
              {!onEscolherPlano && <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Nome ou razão social
                  <input
                    type="text"
                    value={nomeCobranca}
                    onChange={(e) => setNomeCobranca(e.target.value)}
                    placeholder="Nome completo ou empresa"
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  CPF ou CNPJ
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  E-mail de cobrança
                  <input
                    type="email"
                    value={emailCobranca}
                    onChange={(e) => setEmailCobranca(e.target.value)}
                    placeholder="financeiro@empresa.com"
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Telefone
                  <input
                    type="tel"
                    inputMode="tel"
                    value={telefoneCobranca}
                    onChange={(e) => setTelefoneCobranca(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>}

              {/* Planos */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="group rounded-2xl border-2 border-slate-200 bg-white/80 p-3 transition hover:border-sky-600">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Mensal</p>
                  <p className="mt-1 text-xl font-black text-slate-900">
                    {precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<span className="text-xs font-bold text-slate-500">/mês</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Cancele quando quiser.</p>
                  <button
                    type="button"
                    onClick={() => clicar('mensal')}
                    disabled={carregando !== null}
                    className="mt-2.5 h-10 w-full rounded-xl border border-slate-300 bg-white/85 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-sky-700 hover:bg-sky-700 hover:text-white hover:shadow-lg hover:brightness-110 group-hover:border-sky-700 group-hover:bg-sky-700 group-hover:text-white group-hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    {carregando === 'mensal' ? 'Processando…' : 'Gerar cobrança mensal'}
                  </button>
                </div>

                <div className="relative rounded-2xl border-2 border-sky-600 bg-white/85 p-3">
                  <span className="absolute -top-2.5 left-3 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white" style={{ background: GRADIENTE }}>
                    {acessoWebPessoal ? 'Melhor valor' : '2 meses grátis'}
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Anual</p>
                  <p className="mt-1 text-xl font-black text-slate-900">
                    {(precoAnual / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<span className="text-xs font-bold text-slate-500">/mês</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{precoAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/ano — economize {economiaAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</p>
                  <button
                    type="button"
                    onClick={() => clicar('anual')}
                    disabled={carregando !== null}
                    className="mt-2.5 h-10 w-full rounded-xl text-[11px] font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: GRADIENTE }}
                  >
                    {carregando === 'anual' ? 'Processando…' : 'Gerar cobrança anual'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Cupom */}
          <div className="mt-3 border-t border-slate-200 pt-2.5">
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Tem um cupom?</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cupom}
                onChange={(e) => { setCupom(e.target.value.toUpperCase()); setCupomErro(''); }}
                placeholder="Digite o código"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
              />
              <button
                type="button"
                onClick={resgatar}
                disabled={resgatando || !cupom.trim()}
                className="shrink-0 rounded-xl border border-slate-300 bg-white/85 px-4 text-sm font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] disabled:opacity-50"
              >
                {resgatando ? '...' : 'Aplicar'}
              </button>
            </div>
            {cupomErro && <p className="mt-2 text-xs font-bold text-red-600">{cupomErro}</p>}
          </div>

          <div className={`mt-3 grid gap-2 border-t border-slate-200 pt-2.5 ${onTrocarPerfil ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {onTrocarPerfil && (
              <button type="button" onClick={onTrocarPerfil} className="h-8 flex-1 rounded-lg border border-slate-300 bg-white/85 px-2 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-sky-700 hover:bg-sky-700 hover:text-white hover:shadow-md active:scale-[0.98]">
                Trocar de perfil
              </button>
            )}
            {onCriarPerfil && (
              <button type="button" onClick={onCriarPerfil} className="h-8 flex-1 rounded-lg border border-slate-300 bg-white/85 px-2 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-sky-700 hover:bg-sky-700 hover:text-white hover:shadow-md active:scale-[0.98]">
                Criar novo perfil
              </button>
            )}
            <button type="button" onClick={onSair} className="h-8 flex-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[10px] font-black uppercase tracking-wide text-red-600 shadow-sm transition hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md active:scale-[0.98]">
              Sair
            </button>
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
