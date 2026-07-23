'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './recebimentos.module.css';
import type { Colaborador, Empresa, Recebimento, Subempresa } from './components/types';
import { cpfValido, formatarCpf } from './components/helpers';
import PainelColaborador from './components/PainelColaborador';
import { criarRepoSupabase, type RecebimentosRepo } from './data/repo';

type Estado = 'carregando' | 'login' | 'app' | 'bloqueado';

type EventoInstalacaoPwa = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function estaEmModoStandalone() {
  if (typeof window === 'undefined') return false;
  const navegador = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navegador.standalone === true;
}

function criarClienteColaborador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      storageKey: 'avantalab-recebimentos-colaborador-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

type EscopoRecebimentos = typeof globalThis & {
  __avantaRecebimentosCliente?: SupabaseClient | null;
};

function obterClienteColaborador() {
  const escopo = globalThis as EscopoRecebimentos;
  if (!(('__avantaRecebimentosCliente') in escopo)) {
    escopo.__avantaRecebimentosCliente = criarClienteColaborador();
  }
  return escopo.__avantaRecebimentosCliente ?? null;
}

export default function ColaboradorApp() {
  const cliente = obterClienteColaborador();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [repo, setRepo] = useState<RecebimentosRepo | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [subempresas, setSubempresas] = useState<Subempresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [instrucaoInstalacao, setInstrucaoInstalacao] = useState(false);
  const promptInstalacao = useRef<EventoInstalacaoPwa | null>(null);
  const botaoFecharInstalacao = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/recebimentos-sw.js?v=6', { scope: '/recebimentos/colaborador' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setStandalone(estaEmModoStandalone());
    function guardarPrompt(evento: Event) {
      evento.preventDefault();
      promptInstalacao.current = evento as EventoInstalacaoPwa;
    }
    window.addEventListener('beforeinstallprompt', guardarPrompt);
    return () => window.removeEventListener('beforeinstallprompt', guardarPrompt);
  }, []);

  useEffect(() => {
    if (!instrucaoInstalacao) return;
    botaoFecharInstalacao.current?.focus();
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setInstrucaoInstalacao(false);
    }
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [instrucaoInstalacao]);

  async function instalarPwa() {
    if (estaEmModoStandalone()) {
      setStandalone(true);
      return;
    }
    if (promptInstalacao.current) {
      await promptInstalacao.current.prompt();
      await promptInstalacao.current.userChoice;
      promptInstalacao.current = null;
      return;
    }
    setInstrucaoInstalacao(true);
  }

  const carregarDados = useCallback(async (repoAtivo: RecebimentosRepo) => {
    const dados = await repoAtivo.carregar();
    setEmpresas(dados.empresas);
    setSubempresas(dados.subempresas);
    setColaboradores(dados.colaboradores);
    setRecebimentos(dados.recebimentos);
  }, []);

  const prepararSessao = useCallback(async (sessao: Session, empresaSugerida?: string) => {
    if (!cliente) throw new Error('Configuração do aplicativo indisponível.');
    const empresaMetadata = String(sessao.user.user_metadata?.empresa_id ?? '');
    let empresa = empresaSugerida || empresaMetadata;
    if (!empresa) {
      const { data, error } = await cliente.from('recebimentos_colaboradores').select('empresa_id').eq('user_id', sessao.user.id).eq('ativo', true).maybeSingle();
      if (error || !data) throw new Error('Cadastro de colaborador não encontrado.');
      empresa = String(data.empresa_id);
    }
    const resposta = await fetch('/api/recebimentos/verificar-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.access_token}` },
      body: JSON.stringify({ empresaId: empresa }),
    });
    const acesso = await resposta.json().catch(() => ({}));
    if (resposta.ok && acesso.ativo === false) {
      await cliente.auth.signOut();
      setEstado('bloqueado');
      return;
    }
    setEmpresaNome(String(acesso.empresaNome ?? '').trim());
    const repoAtivo = criarRepoSupabase(empresa, cliente);
    await carregarDados(repoAtivo);
    setEmpresaId(empresa);
    setRepo(repoAtivo);
    setEstado('app');
  }, [cliente, carregarDados]);

  useEffect(() => {
    let ativo = true;
    if (!cliente) { setErro('Configuração do aplicativo indisponível.'); setEstado('login'); return; }
    cliente.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      if (!data.session) { setEstado('login'); return; }
      try { await prepararSessao(data.session); }
      catch (error) {
        if (!ativo) return;
        setErro(error instanceof Error ? error.message : 'Não foi possível abrir o aplicativo.');
        setEstado('login');
      }
    });
    return () => { ativo = false; };
  }, [cliente, prepararSessao]);

  useEffect(() => repo?.assinarAtualizacoes?.(() => { void carregarDados(repo); }), [repo, carregarDados]);

  async function entrar() {
    setErro('');
    if (!cliente) return setErro('Configuração do aplicativo indisponível.');
    if (!cpfValido(cpf)) return setErro('Informe um CPF válido.');
    if (senha.length < 8) return setErro('Informe sua senha de acesso.');
    setEntrando(true);
    try {
      const resolucao = await fetch('/api/recebimentos/resolver-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf }),
      });
      const acesso = await resolucao.json().catch(() => ({}));
      if (!resolucao.ok || acesso.erro) {
        if (acesso.bloqueado) setEstado('bloqueado');
        throw new Error(String(acesso.mensagem ?? 'CPF ou senha inválidos.'));
      }
      const { data, error } = await cliente.auth.signInWithPassword({ email: String(acesso.email), password: senha });
      if (error || !data.session) throw new Error('CPF ou senha inválidos.');
      await prepararSessao(data.session, String(acesso.empresaId ?? ''));
      setSenha('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível entrar.');
      if (estado !== 'bloqueado') setEstado('login');
    } finally {
      setEntrando(false);
    }
  }

  async function sair() {
    await cliente?.auth.signOut();
    setRepo(null); setEmpresaId(''); setEmpresaNome(''); setEmpresas([]); setSubempresas([]); setColaboradores([]); setRecebimentos([]);
    setEstado('login'); setErro('');
  }

  async function executar(acao: (repoAtivo: RecebimentosRepo) => Promise<void>) {
    if (!repo) throw new Error('Sessão não encontrada.');
    await acao(repo);
    await carregarDados(repo);
  }

  if (estado === 'carregando') {
    return (
      <main className={`${styles.loginWrap} ${styles.preparandoAcesso}`}>
        <section className="avanta-loading-stage" role="status" aria-live="polite">
          <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl">
            <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
              <span className="avanta-loading-spinner animate-spin" aria-hidden="true" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-700">AvantaLab</p>
            <h1 className="text-xl font-black text-slate-900">Preparando acesso</h1>
            <p className="text-sm font-semibold text-slate-500">Carregando Recebimentos Presenciais…</p>
          </div>
        </section>
      </main>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginCard}>
          <div className={styles.loginMarca}>AvantaLab</div>
          <h1 className={styles.loginTitulo}>Acesso indisponível</h1>
          <p className={styles.muted}>O Recebimentos Presenciais está desativado ou seu acesso foi suspenso. Fale com o gestor da empresa.</p>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setEstado('login'); setErro(''); }} style={{ width: '100%', marginTop: 16 }}>Voltar</button>
        </div>
      </div>
    );
  }

  if (estado === 'login') {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginContent}>
          <form className={styles.loginCard} onSubmit={(event) => { event.preventDefault(); void entrar(); }}>
            <div className={styles.loginMarca}>AvantaLab</div>
            <h1 className={styles.loginTitulo}>Recebimentos Presenciais</h1>
            <p className={styles.muted}>Entre com o CPF e a senha fornecidos pelo gestor.</p>
            <div className={styles.field} style={{ marginTop: 18 }}>
              <label className={styles.label} htmlFor="recebimentos-cpf">CPF</label>
              <input id="recebimentos-cpf" className={styles.input} inputMode="numeric" autoComplete="username" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="recebimentos-senha">Senha</label>
              <input id="recebimentos-senha" className={styles.input} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            {erro && <div className={styles.aviso} role="alert" style={{ marginBottom: 12 }}>{erro}</div>}
            <button type="submit" disabled={entrando} className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%' }}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          </form>
          {standalone === false && (
            <div className={styles.installCard}>
              <div className={styles.installCardInner}>
                <div className={styles.installCopy}>
                  <p className={styles.installNome}>Recebimentos Presenciais</p>
                  <p className={styles.installDescricao}>Instale como app no seu celular.</p>
                </div>
                <button type="button" className={styles.installButton} onClick={() => void instalarPwa()}>Instalar</button>
              </div>
            </div>
          )}
        </div>
        {instrucaoInstalacao && (
          <div
            className={styles.installOverlay}
            role="presentation"
            onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setInstrucaoInstalacao(false); }}
          >
            <section className={styles.installModal} role="dialog" aria-modal="true" aria-labelledby="recebimentos-instalar-titulo">
              <h2 id="recebimentos-instalar-titulo">Instalar o Recebimentos Presenciais</h2>
              <div className={styles.installInstructions}>
                <p>
                  No seu navegador, toque no botão <strong>Compartilhar</strong>{' '}
                  <span className={styles.shareIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
                    </svg>
                  </span>.
                </p>
                <p>Depois escolha <strong>Adicionar à Tela de Início</strong>.</p>
                <p className={styles.installHint}>Assim o Recebimentos abre como um app no seu celular.</p>
              </div>
              <button ref={botaoFecharInstalacao} type="button" className={styles.installClose} onClick={() => setInstrucaoInstalacao(false)}>Entendi</button>
            </section>
          </div>
        )}
      </div>
    );
  }

  const colaborador = colaboradores[0];
  if (!colaborador || !repo || !empresaId) return null;
  return (
    <div className={styles.page}>
      <div className={`${styles.topbar} ${styles.topbarColaborador}`}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            {empresaNome && <span className={styles.brandTitle}>{empresaNome}</span>}
            <span className={styles.brandEmpresa}>Recebimentos Presenciais</span>
          </div>
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void sair()}>Sair</button>
        </div>
      </div>
      <div className={styles.container}>
        {erro && <div className={styles.aviso} role="alert">{erro}</div>}
        <PainelColaborador
          colaborador={colaborador} empresas={empresas} subempresas={subempresas} recebimentos={recebimentos}
          onRegistrar={(empresaRecebimentoId, subId, valor, obs) => executar((r) => r.registrarRecebimento(empresaRecebimentoId, subId, valor, obs))}
          onReceberCobranca={(id, valor, obs) => executar((r) => r.receberCobranca(id, valor, obs))}
        />
      </div>
    </div>
  );
}
