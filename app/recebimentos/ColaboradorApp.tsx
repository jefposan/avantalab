'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './recebimentos.module.css';
import type { AvaliacaoServico, Colaborador, Empresa, FormaPagamentoRecebimento, Recebimento, Servico, Subempresa } from './components/types';
import { cpfValido, formatarCpf } from './components/helpers';
import PainelColaborador from './components/PainelColaborador';
import PainelServicosColaborador from './components/PainelServicosColaborador';
import OperacoesCampoVoiceDock from './components/OperacoesCampoVoiceDock';
import CampoSenha from './components/CampoSenha';
import { criarRepoSupabase, type RecebimentosRepo } from './data/repo';
import { aplicarOperacoesPendentes, concluirOperacaoOffline, enfileirarOperacao, erroDeConexao, limparContextoOffline, listarOperacoesOffline, registrarTentativaOffline, restaurarContextoOffline, salvarContextoOffline, type ContextoOffline, type OperacaoOffline } from './data/offline';
import type { PreparacaoRegistroServicoVoz } from './voice/types';

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

function estaSemRede() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function descricaoOperacaoPendente(operacao: OperacaoOffline, empresas: Empresa[], subempresas: Subempresa[], recebimentos: Recebimento[]) {
  const lancamento = operacao.lancamentoId ? recebimentos.find((item) => item.id === operacao.lancamentoId) : null;
  const empresa = empresas.find((item) => item.id === (operacao.recebimentoEmpresaId ?? lancamento?.empresaId));
  const subempresaId = operacao.subempresaId ?? lancamento?.subempresaId;
  const subempresa = subempresaId ? subempresas.find((item) => item.id === subempresaId) : null;
  const local = [empresa?.nome, subempresa?.nome].filter(Boolean).join(' · ') || 'Cliente selecionado';
  if (operacao.tipo === 'servico') return { titulo: 'Serviço realizado', detalhe: `${local}${operacao.clienteNome ? ` · Assinado por ${operacao.clienteNome}` : ''}` };
  return { titulo: operacao.lancamentoId ? 'Recebimento lançado' : 'Novo recebimento', detalhe: local };
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
  const [colaboradorId, setColaboradorId] = useState('');
  const [comandoVozPermitido, setComandoVozPermitido] = useState(false);
  const [repo, setRepo] = useState<RecebimentosRepo | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [subempresas, setSubempresas] = useState<Subempresa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [operacao, setOperacao] = useState<'seletor' | 'recebimentos' | 'servicos'>('seletor');
  const [registroServicoVoz, setRegistroServicoVoz] = useState<PreparacaoRegistroServicoVoz | null>(null);
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [instrucaoInstalacao, setInstrucaoInstalacao] = useState(false);
  const [contextoOffline, setContextoOffline] = useState<ContextoOffline | null>(null);
  const [pendenciasOffline, setPendenciasOffline] = useState(0);
  const [operacoesPendentes, setOperacoesPendentes] = useState<OperacaoOffline[]>([]);
  const [filaOfflineAberta, setFilaOfflineAberta] = useState(false);
  const [semRede, setSemRede] = useState(false);
  const promptInstalacao = useRef<EventoInstalacaoPwa | null>(null);
  const botaoFecharInstalacao = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/recebimentos-sw.js?v=14', { scope: '/recebimentos/colaborador' }).catch(() => undefined);
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

  const atualizarPendenciasOffline = useCallback(async (contexto: ContextoOffline | null) => {
    if (!contexto) {
      setPendenciasOffline(0);
      setOperacoesPendentes([]);
      return [] as OperacaoOffline[];
    }
    try {
      const pendencias = await listarOperacoesOffline(contexto);
      setPendenciasOffline(pendencias.length);
      setOperacoesPendentes(pendencias);
      return pendencias;
    } catch {
      setPendenciasOffline(0);
      setOperacoesPendentes([]);
      return [] as OperacaoOffline[];
    }
  }, []);

  const abrirFilaOffline = useCallback(async () => {
    await atualizarPendenciasOffline(contextoOffline);
    setFilaOfflineAberta(true);
  }, [atualizarPendenciasOffline, contextoOffline]);

  useEffect(() => {
    const atualizarRede = () => setSemRede(estaSemRede());
    atualizarRede();
    window.addEventListener('online', atualizarRede);
    window.addEventListener('offline', atualizarRede);
    return () => {
      window.removeEventListener('online', atualizarRede);
      window.removeEventListener('offline', atualizarRede);
    };
  }, []);

  useEffect(() => {
    if (!filaOfflineAberta) return;
    const fecharComEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setFilaOfflineAberta(false); };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [filaOfflineAberta]);

  const carregarDados = useCallback(async (repoAtivo: RecebimentosRepo) => {
    const dados = await repoAtivo.carregar();
    setEmpresas(dados.empresas);
    setSubempresas(dados.subempresas);
    setColaboradores(dados.colaboradores);
    setRecebimentos(dados.recebimentos);
    setServicos(dados.servicos);
    return dados;
  }, []);

  const prepararSessao = useCallback(async (sessao: Session, empresaSugerida?: string, nomePerfilSugerido?: string) => {
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
    let nomePerfilDaSessao = [
      nomePerfilSugerido,
      acesso.empresaNome,
      sessao.user.user_metadata?.empresa_nome,
      sessao.user.user_metadata?.perfil_nome,
    ].map((nome) => String(nome ?? '').trim()).find(Boolean) ?? '';
    if (!nomePerfilDaSessao) {
      const { data: sessaoAtualizada } = await cliente.auth.refreshSession();
      nomePerfilDaSessao = [
        sessaoAtualizada.session?.user.user_metadata?.empresa_nome,
        sessaoAtualizada.session?.user.user_metadata?.perfil_nome,
      ].map((nome) => String(nome ?? '').trim()).find(Boolean) ?? '';
    }
    setEmpresaNome(nomePerfilDaSessao);
    const repoAtivo = criarRepoSupabase(empresa, cliente);
    const dados = await carregarDados(repoAtivo);
    const colaborador = dados.colaboradores.find((item) => item.id === sessao.user.id);
    if (!colaborador) throw new Error('Seu cadastro de colaborador não foi encontrado.');
    const vozAutorizada = acesso.podeComandoVoz === true && colaborador.podeComandoVoz === true;
    const podeAbrirServicos = colaborador.podeServicos || colaborador.podeAgendamentos;
    if (!colaborador.podeRecebimentos && !podeAbrirServicos) throw new Error('Seu cadastro não possui acesso ativo a Recebimentos, Serviços ou Agendamento.');
    setOperacao(colaborador.podeRecebimentos && podeAbrirServicos ? 'seletor' : podeAbrirServicos ? 'servicos' : 'recebimentos');
    setColaboradorId(sessao.user.id);
    setComandoVozPermitido(vozAutorizada);
    setEmpresaId(empresa);
    setRepo(repoAtivo);
    try {
      const contexto = await salvarContextoOffline(dados, {
        usuarioId: sessao.user.id, empresaId: empresa, colaboradorId: colaborador.id, empresaNome: nomePerfilDaSessao,
      });
      setContextoOffline(contexto);
      await atualizarPendenciasOffline(contexto);
    } catch {
      // A sessão online continua disponível quando o aparelho bloqueia o armazenamento local.
      setContextoOffline(null);
      setPendenciasOffline(0);
      setOperacoesPendentes([]);
    }
    setEstado('app');
  }, [atualizarPendenciasOffline, cliente, carregarDados]);

  const restaurarAcessoOffline = useCallback(async () => {
    const salvo = await restaurarContextoOffline();
    if (!salvo) return false;
    const pendencias = await listarOperacoesOffline(salvo.contexto);
    const dados = aplicarOperacoesPendentes(salvo.dados, pendencias);
    const colaborador = dados.colaboradores.find((item) => item.id === salvo.contexto.colaboradorId);
    if (!colaborador || !colaborador.ativo) return false;
    const podeAbrirServicos = colaborador.podeServicos || colaborador.podeAgendamentos;
    if (!colaborador.podeRecebimentos && !podeAbrirServicos) return false;
    setEmpresas(dados.empresas); setSubempresas(dados.subempresas); setColaboradores(dados.colaboradores);
    setRecebimentos(dados.recebimentos); setServicos(dados.servicos);
    setEmpresaId(salvo.contexto.empresaId); setEmpresaNome(salvo.contexto.empresaNome);
    setColaboradorId(colaborador.id); setComandoVozPermitido(false);
    setOperacao(colaborador.podeRecebimentos && podeAbrirServicos ? 'seletor' : podeAbrirServicos ? 'servicos' : 'recebimentos');
    if (cliente) setRepo(criarRepoSupabase(salvo.contexto.empresaId, cliente));
    setContextoOffline(salvo.contexto); setPendenciasOffline(pendencias.length); setOperacoesPendentes(pendencias); setEstado('app');
    return true;
  }, [cliente]);

  useEffect(() => {
    let ativo = true;
    if (!cliente) { setErro('Configuração do aplicativo indisponível.'); setEstado('login'); return; }
    cliente.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      if (!data.session) {
        if (!navigator.onLine && await restaurarAcessoOffline()) return;
        setEstado('login');
        return;
      }
      try { await prepararSessao(data.session); }
      catch (error) {
        if (!ativo) return;
        if (!navigator.onLine && await restaurarAcessoOffline()) return;
        setErro(error instanceof Error ? error.message : 'Não foi possível abrir o aplicativo.');
        setEstado('login');
      }
    });
    return () => { ativo = false; };
  }, [cliente, prepararSessao, restaurarAcessoOffline]);

  const revalidarPermissoes = useCallback(async () => {
    if (!cliente || !empresaId || !colaboradorId || estado !== 'app' || estaSemRede()) return;
    const { data } = await cliente.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const resposta = await fetch('/api/recebimentos/verificar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId }),
        cache: 'no-store',
      });
      const acesso = await resposta.json().catch(() => ({}));
      if (!resposta.ok || acesso.indeterminado === true) return;
      if (acesso.ativo === false) {
        setComandoVozPermitido(false);
        setEstado('bloqueado');
        return;
      }
      setComandoVozPermitido(acesso.podeComandoVoz === true);
      setColaboradores((atuais) => atuais.map((item) => item.id === colaboradorId
        ? { ...item, podeComandoVoz: acesso.podeComandoVoz === true }
        : item));
    } catch {
      // Em falha transitória, preserva o estado confirmado mais recente.
    }
  }, [cliente, colaboradorId, empresaId, estado]);

  useEffect(() => repo?.assinarAtualizacoes?.(() => {
    void carregarDados(repo).then((dados) => {
      const atual = dados.colaboradores.find((item) => item.id === colaboradorId);
      if (atual) setComandoVozPermitido(atual.podeComandoVoz === true);
      void revalidarPermissoes();
    }).catch(() => undefined);
  }), [repo, carregarDados, colaboradorId, revalidarPermissoes]);

  useEffect(() => {
    if (estado !== 'app' || !empresaId || !colaboradorId) return;
    const aoRetomar = () => { if (document.visibilityState === 'visible') void revalidarPermissoes(); };
    const intervalo = window.setInterval(() => { void revalidarPermissoes(); }, 15000);
    document.addEventListener('visibilitychange', aoRetomar);
    window.addEventListener('focus', aoRetomar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoRetomar);
      window.removeEventListener('focus', aoRetomar);
    };
  }, [colaboradorId, empresaId, estado, revalidarPermissoes]);

  const aplicarOperacaoLocal = useCallback((operacao: OperacaoOffline) => {
    if (operacao.tipo === 'servico') {
      setServicos((atuais) => atuais.map((item) => item.id === operacao.servicoId ? {
        ...item, situacao: 'realizado', clienteNome: operacao.clienteNome, assinatura: operacao.assinatura,
        avaliacao: operacao.avaliacao, observacaoCliente: operacao.observacaoCliente,
        realizadoEm: new Date(operacao.criadoEm).toISOString(),
      } : item));
      return;
    }
    if (operacao.lancamentoId) {
      setRecebimentos((atuais) => atuais.map((item) => item.id === operacao.lancamentoId ? {
        ...item, valorRecebido: operacao.valor, recebidoEm: new Date(operacao.criadoEm).toISOString(),
        observacao: operacao.observacao || null, formaPagamento: operacao.formaPagamento,
        temComprovante: Boolean(operacao.comprovante),
        situacao: operacao.valor < item.valorCombinado ? 'recebido_a_menor' : operacao.valor > item.valorCombinado ? 'recebido_a_maior' : 'aguardando_conferencia',
      } : item));
    }
  }, []);

  const sincronizarPendencias = useCallback(async () => {
    if (!cliente || !contextoOffline || !navigator.onLine) return;
    let { data: sessaoAtual } = await cliente.auth.getSession();
    if (!sessaoAtual.session) {
      const renovada = await cliente.auth.refreshSession();
      sessaoAtual = renovada.data;
    }
    if (!sessaoAtual.session) return;
    const repoAtivo = criarRepoSupabase(contextoOffline.empresaId, cliente);
    const pendencias = await listarOperacoesOffline(contextoOffline);
    for (const pendencia of pendencias) {
      try {
        if (pendencia.tipo === 'servico') {
          await repoAtivo.registrarServico(pendencia.recebimentoEmpresaId, pendencia.subempresaId, pendencia.clienteNome, pendencia.assinatura, pendencia.avaliacao, pendencia.observacaoCliente, pendencia.servicoId, pendencia.id);
        } else if (pendencia.lancamentoId) {
          await repoAtivo.receberCobranca(pendencia.lancamentoId, pendencia.valor, pendencia.observacao, pendencia.formaPagamento, pendencia.comprovante, pendencia.dataPagamento, pendencia.id);
        } else if (pendencia.recebimentoEmpresaId) {
          await repoAtivo.registrarRecebimento(pendencia.recebimentoEmpresaId, pendencia.subempresaId ?? null, pendencia.valor, pendencia.observacao, pendencia.formaPagamento, pendencia.comprovante, pendencia.id);
        }
        await concluirOperacaoOffline(pendencia.id);
      } catch (error) {
        await registrarTentativaOffline(pendencia);
        if (erroDeConexao(error)) break;
        setErro('Um atendimento salvo neste aparelho precisa ser revisado antes do envio. Ele permanece protegido na fila offline.');
        break;
      }
    }
    const restantes = await listarOperacoesOffline(contextoOffline);
    setPendenciasOffline(restantes.length);
    setOperacoesPendentes(restantes);
    if (restantes.length === 0) {
      const dados = await carregarDados(repoAtivo);
      const colaborador = dados.colaboradores.find((item) => item.id === contextoOffline.colaboradorId);
      if (colaborador) {
        const contexto = await salvarContextoOffline(dados, { usuarioId: contextoOffline.usuarioId, empresaId: contextoOffline.empresaId, colaboradorId: colaborador.id, empresaNome: empresaNome || contextoOffline.empresaNome });
        setContextoOffline(contexto);
      }
    }
  }, [carregarDados, cliente, contextoOffline, empresaNome]);

  useEffect(() => {
    const aoConectar = () => { if (!estaSemRede()) void sincronizarPendencias(); };
    window.addEventListener('online', aoConectar);
    window.addEventListener('focus', aoConectar);
    return () => { window.removeEventListener('online', aoConectar); window.removeEventListener('focus', aoConectar); };
  }, [sincronizarPendencias]);

  const atualizarAposEnvio = useCallback(async () => {
    if (!repo || !contextoOffline || !navigator.onLine) return;
    try {
      const dados = await carregarDados(repo);
      const colaborador = dados.colaboradores.find((item) => item.id === contextoOffline.colaboradorId);
      if (!colaborador) return;
      const contexto = await salvarContextoOffline(dados, {
        usuarioId: contextoOffline.usuarioId, empresaId: contextoOffline.empresaId,
        colaboradorId: colaborador.id, empresaNome: empresaNome || contextoOffline.empresaNome,
      });
      setContextoOffline(contexto);
    } catch {
      // A operação já foi confirmada. Uma leitura posterior atualiza a tela.
    }
  }, [carregarDados, contextoOffline, empresaNome, repo]);

  async function registrarRecebimentoComFila(empresaRecebimentoId: string, subempresaId: string | null, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null) {
    if (!repo || !contextoOffline) throw new Error('A sessão operacional não está disponível neste aparelho. Conecte-se à internet e entre novamente.');
    const pendencia = await enfileirarOperacao(contextoOffline, { recebimentoEmpresaId: empresaRecebimentoId, subempresaId, valor, observacao, formaPagamento, comprovante }, 'recebimento');
    await atualizarPendenciasOffline(contextoOffline);
    try {
      await repo.registrarRecebimento(empresaRecebimentoId, subempresaId, valor, observacao, formaPagamento, comprovante, pendencia.id);
      await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline);
      void atualizarAposEnvio();
    } catch (error) {
      if (!erroDeConexao(error)) { await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline); throw error; }
      aplicarOperacaoLocal(pendencia);
    }
  }

  async function receberCobrancaComFila(lancamentoId: string, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null, dataPagamento?: string | null) {
    if (!repo || !contextoOffline) throw new Error('A sessão operacional não está disponível neste aparelho. Conecte-se à internet e entre novamente.');
    const pendencia = await enfileirarOperacao(contextoOffline, { lancamentoId, valor, observacao, formaPagamento, comprovante, dataPagamento }, 'recebimento');
    await atualizarPendenciasOffline(contextoOffline);
    try {
      await repo.receberCobranca(lancamentoId, valor, observacao, formaPagamento, comprovante, dataPagamento, pendencia.id);
      await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline);
      void atualizarAposEnvio();
    } catch (error) {
      if (!erroDeConexao(error)) { await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline); throw error; }
      aplicarOperacaoLocal(pendencia);
    }
  }

  async function registrarServicoComFila(empresaRecebimentoId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacaoCliente: string, servicoId?: string) {
    if (!repo || !contextoOffline || !servicoId) throw new Error('Selecione o serviço que será executado antes de concluir o atendimento.');
    const pendencia = await enfileirarOperacao(contextoOffline, { recebimentoEmpresaId: empresaRecebimentoId, subempresaId, clienteNome, assinatura, avaliacao, observacaoCliente, servicoId }, 'servico');
    await atualizarPendenciasOffline(contextoOffline);
    try {
      await repo.registrarServico(empresaRecebimentoId, subempresaId, clienteNome, assinatura, avaliacao, observacaoCliente, servicoId, pendencia.id);
      await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline);
      void atualizarAposEnvio();
    } catch (error) {
      if (!erroDeConexao(error)) { await concluirOperacaoOffline(pendencia.id); await atualizarPendenciasOffline(contextoOffline); throw error; }
      aplicarOperacaoLocal(pendencia);
    }
  }

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
      await prepararSessao(data.session, String(acesso.empresaId ?? ''), String(acesso.empresaNome ?? ''));
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
    if (contextoOffline) await limparContextoOffline(contextoOffline.usuarioId, contextoOffline.empresaId).catch(() => undefined);
    setRepo(null); setEmpresaId(''); setEmpresaNome(''); setColaboradorId(''); setComandoVozPermitido(false); setEmpresas([]); setSubempresas([]); setColaboradores([]); setRecebimentos([]); setServicos([]); setOperacao('seletor');
    setContextoOffline(null); setPendenciasOffline(0); setOperacoesPendentes([]); setFilaOfflineAberta(false);
    setEstado('login'); setErro('');
  }

  async function executar(acao: (repoAtivo: RecebimentosRepo) => Promise<void>) {
    if (!repo) throw new Error('Sessão não encontrada.');
    await acao(repo);
    if (navigator.onLine) await carregarDados(repo);
  }

  if (estado === 'carregando') {
    return (
      <main className={`${styles.loginWrap} ${styles.preparandoAcesso} avanta-access-scene`}>
        <img className="avanta-access-brand" src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" />
        <section className="avanta-loading-stage" role="status" aria-live="polite">
          <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl">
            <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
              <span className="avanta-loading-spinner animate-spin" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Preparando acesso</h1>
            <p className="text-sm font-semibold text-slate-500">Carregando operações em campo…</p>
          </div>
        </section>
      </main>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <div className={styles.loginWrap}>
        <img className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" />
        <div className={styles.loginCard}>
          <div className={styles.loginMarca}>AvantaLab</div>
          <h1 className={styles.loginTitulo}>Acesso indisponível</h1>
          <p className={styles.muted}>As Operações em Campo estão desativadas ou seu acesso foi suspenso. Fale com o gestor da empresa.</p>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setEstado('login'); setErro(''); }} style={{ width: '100%', marginTop: 16 }}>Voltar</button>
        </div>
      </div>
    );
  }

  if (estado === 'login') {
    return (
      <div className={styles.loginWrap}>
        <img className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" />
        <div className={styles.loginContent}>
          <form className={styles.loginCard} onSubmit={(event) => { event.preventDefault(); void entrar(); }}>
            <h1 className={styles.loginTitulo}>Operações em Campo</h1>
            <p className={styles.muted}>Entre com o CPF e a senha fornecidos pelo gestor.</p>
            <div className={styles.field} style={{ marginTop: 18 }}>
              <label className={styles.label} htmlFor="recebimentos-cpf">CPF</label>
              <input id="recebimentos-cpf" className={styles.input} inputMode="numeric" autoComplete="username" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} placeholder="000.000.000-00" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="recebimentos-senha">Senha</label>
              <CampoSenha
                id="recebimentos-senha"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {erro && <div className={styles.aviso} role="alert" style={{ marginBottom: 12 }}>{erro}</div>}
            <button type="submit" disabled={entrando} className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%' }}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          </form>
          {standalone === false && (
            <div className={styles.installCard}>
              <div className={styles.installCardInner}>
                <div className={styles.installCopy}>
                  <p className={styles.installNome}>Operações em Campo</p>
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
              <h2 id="recebimentos-instalar-titulo">Instalar Operações em Campo</h2>
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
                <p className={styles.installHint}>Assim as operações abrem como um app no seu celular.</p>
              </div>
              <button ref={botaoFecharInstalacao} type="button" className={styles.installClose} onClick={() => setInstrucaoInstalacao(false)}>Entendi</button>
            </section>
          </div>
        )}
      </div>
    );
  }

  const colaborador = colaboradores.find((item) => item.id === colaboradorId);
  if (!colaborador || !repo || !empresaId || !cliente) return null;
  const podeAbrirServicos = colaborador.podeServicos || colaborador.podeAgendamentos;
  const podeTrocarOperacao = colaborador.podeRecebimentos && podeAbrirServicos;
  const nomeDoPerfil = empresaNome || 'Perfil da empresa';
  const descricaoDaOperacao = operacao === 'servicos' ? 'Registro de serviços' : 'Registro de recebimentos';
  if (operacao === 'seletor') return (
    <main className={`${styles.loginWrap} ${styles.seletorOperacaoPwa}`}>
      <img className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" />
      <section className={styles.loginContent} aria-labelledby="operacao-titulo">
        <div className={`${styles.loginCard} ${styles.seletorOperacaoCard}`}>
          <header className={styles.seletorOperacaoCabecalho}><p className={styles.seletorOperacaoEmpresa}>{nomeDoPerfil}</p></header>
          <h1 id="operacao-titulo" className={styles.loginTitulo}>Escolha a operação</h1>
          <p className={styles.seletorOperacaoAjuda}>Você possui acesso aos dois sistemas.</p>
          <div className={styles.seletorOperacaoAcoes}>
            <button type="button" onClick={() => setOperacao('recebimentos')}><b>Recebimentos</b><small>Registrar cobranças em campo</small></button>
            <button type="button" onClick={() => setOperacao('servicos')}><b>Serviços</b><small>{colaborador.podeServicos ? 'Registrar atendimento e avaliação' : 'Agendar atendimentos'}</small></button>
          </div>
          <button type="button" className={styles.seletorSair} onClick={() => void sair()}>Sair</button>
        </div>
      </section>
    </main>
  );
  return (
    <div className={`${styles.page} ${comandoVozPermitido ? styles.pageComVoz : ''}`}>
      <div className={`${styles.topbar} ${styles.topbarColaborador}`}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandTitle}>{nomeDoPerfil}</span>
            <span className={styles.brandEmpresa}>{descricaoDaOperacao}</span>
          </div>
          <div className={styles.topbarAcoesColaborador}>
            {semRede && <span className={styles.indicadorRedeOffline} role="status" aria-label="Sem conexão. Os lançamentos manuais serão enviados ao reconectar." title="Sem conexão: trabalhando offline"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5a12 12 0 0 1 14.8-1.8M2.8 5.2 21.2 18.8M7.6 13.2a7 7 0 0 1 5.3-.5M12 19h.01" /></svg></span>}
            {pendenciasOffline > 0 && <button type="button" className={styles.botaoPendenciasOffline} onClick={() => void abrirFilaOffline()} aria-label={`${pendenciasOffline} atendimento${pendenciasOffline === 1 ? '' : 's'} aguardando sincronização`} title="Atendimentos aguardando sincronização"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M5 7h14M5 17h14M7 7v10m10-10v10M9 10h6M9 14h4" /></svg><b>{pendenciasOffline}</b></button>}
            {podeTrocarOperacao && <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setOperacao('seletor')}>Trocar sistema</button>}
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => void sair()}>Sair</button>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        {erro && <div className={styles.aviso} role="alert">{erro}</div>}
        {operacao === 'recebimentos' ? <PainelColaborador
          colaborador={colaborador} empresas={empresas} subempresas={subempresas} recebimentos={recebimentos}
          onRegistrar={registrarRecebimentoComFila}
          onReceberCobranca={receberCobrancaComFila}
        /> : <PainelServicosColaborador colaborador={colaborador} empresas={empresas} subempresas={subempresas} servicos={servicos} podeRegistrar={colaborador.podeServicos} podeAgendar={colaborador.podeAgendamentos} registroInicial={registroServicoVoz} onRegistroInicialConsumido={() => setRegistroServicoVoz(null)} onRegistrar={registrarServicoComFila} onAgendar={(empresaRecebimentoId, subId, data, tipo) => executar((r) => r.agendarServico(empresaRecebimentoId, subId, data, tipo))} />}
      </div>
      {comandoVozPermitido && <footer className={styles.voiceActionBar} aria-label={`Ações por voz de ${operacao}`}>
        <OperacoesCampoVoiceDock
          key={operacao}
          mode={operacao}
          empresaId={empresaId}
          userId={colaborador.id}
          cliente={cliente}
          empresas={empresas}
          subempresas={subempresas}
          recebimentos={recebimentos}
          servicos={servicos}
          podeRegistrar={colaborador.podeServicos}
          podeAgendar={colaborador.podeAgendamentos}
          offline={semRede}
          onRegistrarRecebimento={(empresaRecebimentoId, subId, valor, obs, forma) => registrarRecebimentoComFila(empresaRecebimentoId, subId, valor, obs, forma)}
          onReceberCobranca={(recebimentoId, valor, obs, forma) => receberCobrancaComFila(recebimentoId, valor, obs, forma)}
          onAgendarServico={(empresaRecebimentoId, subId, data, tipo) => executar((r) => r.agendarServico(empresaRecebimentoId, subId, data, tipo))}
          onPrepararRegistroServico={(companyId, subcompanyId, serviceId) => setRegistroServicoVoz({ requestId: `${Date.now()}-${Math.random()}`, companyId, subcompanyId, serviceId })}
        />
      </footer>}
      {filaOfflineAberta && <div className={styles.filaOfflineOverlay} role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setFilaOfflineAberta(false); }}>
        <section className={styles.filaOfflineModal} role="dialog" aria-modal="true" aria-labelledby="fila-offline-titulo">
          <header><div><p>Sincronização</p><h2 id="fila-offline-titulo">Atendimentos aguardando envio</h2></div><button type="button" onClick={() => setFilaOfflineAberta(false)} aria-label="Fechar pendências de sincronização">×</button></header>
          {operacoesPendentes.length ? <ul>{operacoesPendentes.map((item) => {
            const descricao = descricaoOperacaoPendente(item, empresas, subempresas, recebimentos);
            return <li key={item.id}><span className={styles.filaOfflineTipo}>{item.tipo === 'servico' ? 'Serviço' : 'Recebimento'}</span><div><b>{descricao.titulo}</b><small>{descricao.detalhe}</small><time dateTime={new Date(item.criadoEm).toISOString()}>Salvo em {new Date(item.criadoEm).toLocaleString('pt-BR')}</time></div></li>;
          })}</ul> : <p className={styles.filaOfflineVazia}>Todos os atendimentos deste aparelho já foram sincronizados.</p>}
          <footer><span>{semRede ? 'Sem conexão: o envio acontece automaticamente ao reconectar.' : 'Aguardando confirmação do servidor.'}</span><button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setFilaOfflineAberta(false)}>Entendi</button></footer>
        </section>
      </div>}
    </div>
  );
}
