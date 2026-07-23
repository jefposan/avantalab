'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Calculadora from './components/Calculadora';
import Dashboard from './components/Dashboard';
import BalancoGeral from './components/BalancoGeral'; 
import Graficos from './components/Graficos';
import PorCategoria from './components/PorCategoria';
import Relatorio from './components/Relatorio';
import ModalTermos from './components/ModalTermos';
import ModalPrivacidade from './components/ModalPrivacidade';
import Tooltip from './components/Tooltip';
import ModalInstrucoes from './components/ModalInstrucoes';
import ModalDespesasBase from './components/ModalDespesasBase';
import ModalLogo from './components/ModalLogo';
import ModulosModal, { type Modulo } from './components/ModulosModal';
import PontoAdminModal, { type AbaPontoAdmin, type DocumentoRepP, type EstadoAssinaturaPonto, type EventoAuditoriaPonto, type FuncionarioPonto, type PontoConfig, type PontoDiaNaoUtil } from './components/PontoAdminModal';
import RecebimentosAdminModal from './components/RecebimentosAdminModal';
import SobreModal from './components/SobreModal';
import ModalConfirmacao from "./components/ModalConfirmacao";
import DraggableModalCard from './components/DraggableModalCard';
import CardEntradaFaturamento from './components/CardEntradaFaturamento';
import type { EntradaFaturamento as TabelaEntradaFaturamento } from './components/TabelaEntradasFaturamento';
import TabelaLancamentosDespesa, { type LancamentoDespesa as TabelaLancamentoDespesa } from './components/TabelaLancamentosDespesa';
import ModalNotaLancamento from './components/ModalNotaLancamento';
import ProcessandoImagemModal from './components/ProcessandoImagemModal';
import ImportadorDespesasModal, { existeRascunhoImportador } from './modules/importador-despesas/components/ImportadorDespesasModal';
import TourPrimeiroAcesso from './components/TourPrimeiroAcesso';
import PaywallEmpresa from './components/PaywallEmpresa';
import CadastroPerfilModal from './components/CadastroPerfilModal';
import AssinaturaModal from './components/AssinaturaModal';
import PremiumPessoalModal from './components/PremiumPessoalModal';
import ModalAprovacoes, { type AcessoVendasAprovado, type SolicitacaoAprovacao } from './components/ModalAprovacoes';
import NovidadesVendasModal from './components/NovidadesVendasModal';
import { COBRANCA_ATIVA, assinaturaVigente, emCarencia, precisaPaywallEmpresa, precisaPaywallWebPessoal, precisaUpgradePessoal, type DadosCobrancaAssinatura, type EstadoAcesso, type Recurso } from './lib/cobranca';
import type { StatusCadastroPerfil } from './lib/cadastro-perfil';
import { PAISES } from './lib/paises';
import {
  formatarMoeda,
  formatarDescricao,
  corEhClara,
  getMaxDias,
  normalizarTexto,
} from './lib/formatters';
import {
  CATEGORIAS_EXCLUSAO_EBITDA,
  categoriasDoPerfil,
  formatarNomeCategoria,
  normalizarTipoPerfil,
  placeholderNomePerfil,
  rotuloNomePerfil,
  rotuloTipoPerfil,
  type TipoPerfil,
} from './lib/perfis';
import { APP_VERSION } from './lib/version';
import {
  buscarEmpresaDoUsuario,
  buscarEmpresasDoUsuario,
  buscarConfiguracoes,
  buscarDespesasCadastradas,
  buscarLancamentos,
  buscarCaixinhaMovimentos,
  garantirFixasDoMesAtual,
  buscarFaturamentos,
  buscarFaturamentosEntradas,
  prepararDadosContaRevisao,
  salvarLancamento,
  salvarCaixinhaMovimento,
  salvarSaldoInicialCaixinha,
  apagarLancamento,
  arquivarNotaLancamento,
  obterUrlNotaLancamento,
  removerNotaLancamento,
  atualizarLancamento,
  definirStatusLancamento,
  salvarDashboardOrdemWeb,
  salvarFaturamentoBanco,
  excluirFaturamentoBanco,
  salvarFaturamentoEntrada,
  atualizarFaturamentoEntrada,
  apagarFaturamentoEntrada,
  salvarConfiguracoesBanco,
  salvarDespesaCadastrada,
  atualizarDespesaCadastrada,
  apagarDespesaCadastrada,
  buscarUsuariosEmpresa,
  buscarMeuAcessoEmpresa,
  criarUsuarioEmpresa,
  buscarUsuarioExistenteEmpresa,
  vincularUsuarioExistenteEmpresa,
  atualizarEmpresa,
  atualizarUsuarioEmpresa,
  bloquearUsuarioEmpresa,
  excluirUsuarioEmpresa,
  criarEmpresaInicial,
  redefinirSenhaUsuarioEmpresa,
  buscarEmailPorLogin,
  atualizarTelefoneUsuarioEmpresa,
  salvarFeedback,
  buscarRecorrencias,
  inserirRecorrencia,
  atualizarRecorrencia,
  deletarRecorrencia,
  type Recorrencia,
} from './lib/database';

import { supabase } from './lib/supabase';
import {
  analisarBackupExcel,
  gerarBackupExcel,
  importarBackupExcelAtualizar,
  importarBackupExcelSubstituir,
  type AnaliseBackupImportacao,
  type ModoImportacaoBackup,
  type ResultadoImportacaoBackup,
} from './lib/exportacao';
import { useUI } from './hooks/useUI';
import { useAuth } from './hooks/useAuth';
import { useEmpresas } from './hooks/useEmpresas';
import ChatFlutuante from './components/ChatFlutuante';
import AppHeader from './components/AppHeader';
import AuthCard from './components/AuthCard';


type AgendaItem = {
  id: string;
  titulo: string;
  descricao: string;
  dia: number;
  mes: number; // 0-11
  ano: number;
  repetir: boolean;
  repeticao: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';
  criadoEm: string;
  excluirDias?: string[];
};

type RegistroSupabase = Record<string, unknown>;
type PerfilAcessoUsuario = 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
const CHAVE_INICIAR_VALORES_OCULTOS_WEB = 'avantalab_web_iniciar_valores_ocultos';

type EmpresaUsuarioResumo = RegistroSupabase & {
  id: string;
  nome?: string;
  empresa_nome?: string;
  telefone?: string;
  telefone_confirmado?: boolean;
  telefone_confirmado_em?: string;
  cor_primaria?: string | null;
  tipo_perfil?: string;
  perfil?: PerfilAcessoUsuario;
  acessoId?: string;
  acesso_id?: string;
};

type ResumoPerfilFinanceiro = {
  id: string;
  nome: string;
  tipoPerfil?: string;
  receitas: number;
  despesas: number;
  resultado: number;
  historicoMensal?: {
    mes: string;
    ano: number;
    receitas: number;
    despesas: number;
  }[];
};

type DespesaCadastrada = {
  nome: string;
  categoria: string;
};

type LancamentoFinanceiro = {
  id: string | number;
  mes: string;
  dia: number;
  despesa: string;
  descricao: string;
  valor: number;
  status: string | null;
  tipo: string | null;
  recorrenciaId?: string | null;
  notaArquivoPath?: string | null;
};

type EntradaFaturamento = {
  id: string;
  mes: string;
  dia: number;
  origem: string;
  valor: number;
  status: string | null;
  tipo: string | null;
  etiquetaOrigem?: string | null;
};

type CaixinhaMovimento = {
  id: string;
  lancamentoId: string | null;
  tipo: 'saldo_inicial' | 'aporte' | 'resgate' | 'rendimento' | 'ajuste';
  descricao: string;
  valor: number;
  dataMovimento: string;
  criadoEm: string;
};

function textoRegistro(valor: unknown): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

function FundoCarregamentoResponsivo() {
  return (
    <picture className="absolute inset-0 block h-full w-full" aria-hidden="true">
      <source media="(max-width: 1023px)" srcSet="/images/bg-avantalab-mobile.webp" type="image/webp" />
      <source media="(max-width: 1023px)" srcSet="/images/bg-avantalab-mobile.png" type="image/png" />
      <source srcSet="/images/bg-avantalab.webp" type="image/webp" />
      <img
        src="/images/bg-avantalab.png"
        alt=""
        className="h-full w-full object-cover object-bottom lg:object-center"
      />
    </picture>
  );
}

function TelaCarregandoSistema({
  mensagem,
}: {
  mensagem: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <FundoCarregamentoResponsivo />

      <div className="absolute inset-0 bg-transparent" />

      <section className="avanta-loading-stage relative z-10">
        <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl">
          <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
            <span className="avanta-loading-spinner animate-spin" />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <h1 className="text-xl font-black text-slate-900">
            Carregando...
          </h1>

          <p className="text-sm font-semibold text-slate-500">
            {mensagem}
          </p>
        </div>
      </section>
    </main>
  );
}

// Despesa com data (ano/mes/dia) ainda no futuro em relacao a hoje (horario do dispositivo).
function dataFutura(ano: number, mesIndice: number, dia: number): boolean {
  const hoje = new Date();
  const anoHoje = hoje.getFullYear();
  if (ano > anoHoje) return true;
  if (ano < anoHoje) return false;
  const mesHoje = hoje.getMonth();
  if (mesIndice > mesHoje) return true;
  if (mesIndice < mesHoje) return false;
  return Number(dia) > hoje.getDate();
}

function ehDataHoje(ano: number, mesIndice: number, dia: number): boolean {
  const hoje = new Date();
  return Number(ano) === hoje.getFullYear() && Number(mesIndice) === hoje.getMonth() && Number(dia) === hoje.getDate();
}

// Tipos que pedem confirmacao na data (parcela NAO pede).
function tipoPedeConfirmacao(tipo: string | null | undefined): boolean {
  return tipo === 'previsto' || tipo === 'fixa';
}

export default function AppGestao() {

  // ---------------------------------------------------------------------------
  // Hooks — estados e funções extraídos
  // ---------------------------------------------------------------------------


  const ui = useUI();
  const {
    abrirAviso, fecharAviso,
    modalAvisoAberto, setModalAvisoAberto,
    tituloAviso, mensagemAviso, tipoAviso, acaoDepoisDoAviso,
    abrirConfirmacao, fecharConfirmacao, confirmarAcao,
    modalConfirmacaoAberto, setModalConfirmacaoAberto,
    tituloConfirmacao, mensagemConfirmacao, textoConfirmarConfirmacao,
    acaoConfirmacao, confirmacaoCarregando,
    textoCancelarConfirmacao, acaoCancelarConfirmacao,
    chatFeedbackAberto, setChatFeedbackAberto,
    chatFeedbackEtapa, setChatFeedbackEtapa,
    feedbackTipo, setFeedbackTipo,
    feedbackMensagem, setFeedbackMensagem,
    feedbackEnviando, setFeedbackEnviando,
    abrirFormularioFeedback, voltarInicioChatFeedback, fecharChatFeedback,
    painelAvisosAberto, setPainelAvisosAberto,
    tourAberto, setTourAberto,
    finalizarTour, pularTour,
  } = ui;

  const empresas = useEmpresas({
    abrirAviso,
    abrirConfirmacao,
    handleLogout: () => handleLogout(),
  });
  const {
    empresaId, setEmpresaId,
    nomeEmpresaAtual, setNomeEmpresaAtual,
    tipoPerfilAtual, setTipoPerfilAtual,
    nomeUsuarioAtual, setNomeUsuarioAtual,
    emailUsuarioAtual, setEmailUsuarioAtual,
    acessoUsuarioAtualId, setAcessoUsuarioAtualId,
    perfilUsuario, setPerfilUsuario,
    empresasDoUsuario, setEmpresasDoUsuario,
    empresaParaSelecionar, setEmpresaParaSelecionar,
    acessoLiberado, setAcessoLiberado,
    acessoNaoConfigurado, setAcessoNaoConfigurado,
    podeGerenciarUsuarios,
    modalSelecionarEmpresa, setModalSelecionarEmpresa,
    modalEmpresasAberto, setModalEmpresasAberto,
    modalEditarEmpresaAberto, setModalEditarEmpresaAberto,
    editEmpresaNome, setEditEmpresaNome,
    editTipoPerfil, setEditTipoPerfil,
    editEmpresaLogin, setEditEmpresaLogin,
    editEmpresaSenha, setEditEmpresaSenha,
    editEmpresaSalvando, setEditEmpresaSalvando,
    modalExcluirEmpresa, setModalExcluirEmpresa,
    nomeConfirmacaoExclusao, setNomeConfirmacaoExclusao,
    excluindoEmpresa, setExcluindoEmpresa,
    usuariosEmpresa, setUsuariosEmpresa,
    usuariosCarregando, setUsuariosCarregando,
    usuarioNome, setUsuarioNome,
    usuarioLogin, setUsuarioLogin,
    usuarioSenha, setUsuarioSenha,
    mostrarUsuarioSenha, setMostrarUsuarioSenha,
    usuarioPerfil, setUsuarioPerfil,
    modoFormularioUsuario, setModoFormularioUsuario,
    usuarioExistenteTermo, setUsuarioExistenteTermo,
    usuarioEncontrado, setUsuarioEncontrado,
    perfilUsuarioExistente, setPerfilUsuarioExistente,
    pesquisandoUsuarioExistente, setPesquisandoUsuarioExistente,
    vinculandoUsuarioExistente, setVinculandoUsuarioExistente,
    usuarioEditandoId, setUsuarioEditandoId,
    editUsuarioNome, setEditUsuarioNome,
    editUsuarioLogin, setEditUsuarioLogin,
    editUsuarioEmail, setEditUsuarioEmail,
    editUsuarioNovaSenha, setEditUsuarioNovaSenha,
    editUsuarioConfirmarSenha, setEditUsuarioConfirmarSenha,
    mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha,
    editUsuarioPerfil, setEditUsuarioPerfil,
    modalUsuarios, setModalUsuarios,
    ajudaUsuariosAberta, setAjudaUsuariosAberta,
    carregarUsuariosEmpresa,
    abrirModalUsuarios,
    abrirCriarNovoUsuario,
    abrirAdicionarUsuarioExistente,
    ocultarFormularioUsuario,
    buscaUsuarioExistente,
    confirmarVinculoUsuarioExistente,
    adicionarUsuarioEmpresa,
    iniciarEdicaoUsuario,
    cancelarEdicaoUsuario,
    salvarEdicaoUsuario,
    redefinirSenhaUsuario,
    bloquearAcessoUsuario,
    excluirAcessoUsuario,
    abrirEdicaoEmpresaAtual,
    fecharEdicaoEmpresaAtual,
    salvarEdicaoEmpresaAtual,
  } = empresas;

  const [duplicadosAtivo, setDuplicadosAtivo] = useState(true);
  const [iniciarValoresOcultos, setIniciarValoresOcultos] = useState(true);

  useEffect(() => {
    try {
      setIniciarValoresOcultos(localStorage.getItem(CHAVE_INICIAR_VALORES_OCULTOS_WEB) !== '0');
    } catch {}
  }, []);

  const alternarInicioValoresOcultos = () => {
    setIniciarValoresOcultos((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(CHAVE_INICIAR_VALORES_OCULTOS_WEB, proximo ? '1' : '0');
      } catch {}
      return proximo;
    });
  };

  const auth = useAuth({
    abrirAviso,
    carregarEmpresaSelecionada: (e: EmpresaUsuarioResumo) => carregarEmpresaSelecionada(e),
    onMultiplasEmpresas: (es: EmpresaUsuarioResumo[]) => onMultiplasEmpresas(es),
    onSemEmpresa: () => onSemEmpresa(),
    setTipoPerfilAtual: empresas.setTipoPerfilAtual,
    setDuplicadosAtivo,
  });
  const {
    modoAuth, setModoAuth,
    mostrarLandingPreLogin, setMostrarLandingPreLogin,
    loginEmail, setLoginEmail,
    loginSenha, setLoginSenha,
    mostrarSenhaLogin, setMostrarSenhaLogin,
    mostrarSenhaCadastro, setMostrarSenhaCadastro,
    mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro,
    cadastroNome, setCadastroNome,
    cadastroNomeEmpresa, setCadastroNomeEmpresa,
    cadastroEmail, setCadastroEmail,
    cadastroTelefone, setCadastroTelefone,
    cadastroSenha, setCadastroSenha,
    cadastroConfirmarSenha, setCadastroConfirmarSenha,
    cadastroCupom, setCadastroCupom,
    cadastroDdi, setCadastroDdi,
    codigoSmsCadastro, setCodigoSmsCadastro,
    smsCadastroEnviado, setSmsCadastroEnviado,
    telefoneSmsCadastroConfirmado, setTelefoneSmsCadastroConfirmado,
    segundosReenvioSms, setSegundosReenvioSms,
    reenviandoSmsCadastro, setReenviandoSmsCadastro,
    authErro, setAuthErro,
    authMensagem, setAuthMensagem,
    authLoading, setAuthLoading,
    carregandoSistema, setCarregandoSistema,
    mensagemCarregamentoSistema, setMensagemCarregamentoSistema,
    googleLoading, setGoogleLoading,
    modoRedefinirSenha, setModoRedefinirSenha,
    novaSenha, setNovaSenha,
    confirmarNovaSenha, setConfirmarNovaSenha,
    mostrarNovaSenha, setMostrarNovaSenha,
    mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha,
    codigoSmsRedefinirSenha, setCodigoSmsRedefinirSenha,
    smsRedefinirSenhaEnviado, setSmsRedefinirSenhaEnviado,
    segundosReenvioRedefinirSenha, setSegundosReenvioRedefinirSenha,
    reenviandoSmsRedefinirSenha, setReenviandoSmsRedefinirSenha,
    emailConfirmado, setEmailConfirmado,
    nomeEmpresaInicial, setNomeEmpresaInicial,
    tipoPerfilInicial, setTipoPerfilInicial,
    inicioEmpresaModo, setInicioEmpresaModo,
    criandoEmpresaInicial, setCriandoEmpresaInicial,
    criandoNovaEmpresaLogada, setCriandoNovaEmpresaLogada,
    handleLogin,
    handleCadastroTeste,
    reenviarCodigoSmsCadastro,
    handleCriarEmpresaInicial,
    handleCriarPerfilInicialDoCadastro,
    handleRecuperarSenha,
    reenviarCodigoRedefinirSenha,
    handleAtualizarSenha,
    handleGoogleLogin,
  } = auth;

  // Callbacks de orquestração passados para useAuth
  const onMultiplasEmpresas = (empresasList: EmpresaUsuarioResumo[]) => {
    empresas.setEmpresasDoUsuario(empresasList);
    empresas.setEmpresaParaSelecionar(empresasList[0] || null);
    setModoSelecaoPerfil('entrada');
    empresas.setModalSelecionarEmpresa(true);
  };

  const onSemEmpresa = () => {
    setAcessoNaoConfigurado(true);
  };


  // --- ESTADOS PRINCIPAIS ---
  
const [mounted, setMounted] = useState(false);
const [isTelaMobile, setIsTelaMobile] = useState(false);
const [darkMode, setDarkMode] = useState(false);
const [ajudaCategoriasAberta, setAjudaCategoriasAberta] = useState(false);
const [validacaoTelefoneObrigatoria, setValidacaoTelefoneObrigatoria] = useState(false);
const [empresaAguardandoTelefone, setEmpresaAguardandoTelefone] = useState<EmpresaUsuarioResumo | null>(null);
const [telefoneObrigatorio, setTelefoneObrigatorio] = useState('');
const [telefoneCobrancaPadrao, setTelefoneCobrancaPadrao] = useState('');
const [ddiTelefoneObrigatorio, setDdiTelefoneObrigatorio] = useState('55');
const [codigoSmsTelefoneObrigatorio, setCodigoSmsTelefoneObrigatorio] = useState('');
const [smsTelefoneObrigatorioEnviado, setSmsTelefoneObrigatorioEnviado] = useState(false);
const [telefoneObrigatorioConfirmado, setTelefoneObrigatorioConfirmado] = useState('');
const [segundosReenvioTelefoneObrigatorio, setSegundosReenvioTelefoneObrigatorio] = useState(0);
const [reenviandoTelefoneObrigatorio, setReenviandoTelefoneObrigatorio] = useState(false);
const [validandoTelefoneObrigatorio, setValidandoTelefoneObrigatorio] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('Dashboard');
  // Cobrança: estado de acesso do perfil (só é buscado quando COBRANCA_ATIVA=true).
  const [estadoAcesso, setEstadoAcesso] = useState<EstadoAcesso | null>(null);
  const [faturaPendenteUrl, setFaturaPendenteUrl] = useState<string | null>(null);
  const [cadastroPerfilStatus, setCadastroPerfilStatus] = useState<StatusCadastroPerfil | null>(null);
  const [cadastroPerfilCarregado, setCadastroPerfilCarregado] = useState(false);
  const [cadastroPerfilErro, setCadastroPerfilErro] = useState('');
  const [cadastroPerfilTentativa, setCadastroPerfilTentativa] = useState(0);
  const [cadastroPerfilAdiado, setCadastroPerfilAdiado] = useState(false);
  const [cicloCadastroPaywall, setCicloCadastroPaywall] = useState<'mensal' | 'anual' | null>(null);
  // Só liberamos a renderização do app depois de conhecer o estado de acesso,
  // evitando o "flash" do conteúdo antes de o paywall bloquear.
  const [estadoCarregado, setEstadoCarregado] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  // Premium Pessoal: recurso premium que o usuário grátis tentou usar
  // (abre o modal de upgrade; null = fechado).
  const [premiumRecurso, setPremiumRecurso] = useState<Recurso | null>(null);
  // Recurso premium bloqueado neste perfil? (false sempre que a flag está off)
  const recursoBloqueado = (recurso: Recurso) => precisaUpgradePessoal(recurso, estadoAcesso);
  const abrirPremium = (recurso: Recurso) => setPremiumRecurso(recurso);
  // Intercepta as abas premium (Relatório/Gráficos) no plano Pessoal grátis.
  const setAbaAtivaComGate: React.Dispatch<React.SetStateAction<string>> = (valor) => {
    setAbaAtiva((atual) => {
      const proxima = typeof valor === 'function' ? (valor as (aba: string) => string)(atual) : valor;
      if ((proxima === 'Gráficos' || proxima === 'Relatório') && precisaUpgradePessoal('analises', estadoAcesso)) {
        window.setTimeout(() => setPremiumRecurso('analises'), 0);
        return atual;
      }
      return proxima;
    });
  };
  // Intercepta a etapa 'ia' do chat (Ava) no plano Pessoal grátis — o
  // formulário de sugestões/dúvidas continua livre.
  const setChatFeedbackEtapaComGate: React.Dispatch<React.SetStateAction<'inicio' | 'formulario' | 'confirmacao' | 'ia'>> = (valor) => {
    setChatFeedbackEtapa((atual: 'inicio' | 'formulario' | 'confirmacao' | 'ia') => {
      const proxima = typeof valor === 'function' ? (valor as (etapa: typeof atual) => typeof atual)(atual) : valor;
      if (proxima === 'ia' && precisaUpgradePessoal('ava', estadoAcesso)) {
        window.setTimeout(() => setPremiumRecurso('ava'), 0);
        return atual;
      }
      return proxima;
    });
  };
  const atualizarEstadoCobranca = useCallback(async (): Promise<{
    ok: boolean;
    liberado: boolean;
    mensagem?: string;
  }> => {
    if (!COBRANCA_ATIVA || !empresaId) {
      setEstadoAcesso(null);
      setFaturaPendenteUrl(null);
      setEstadoCarregado(true);
      return { ok: true, liberado: true };
    }
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) return { ok: false, liberado: false, mensagem: 'Sessão não encontrada. Entre novamente.' };
      const resp = await fetch(`/api/cobranca/estado?empresaId=${encodeURIComponent(empresaId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) {
        return { ok: false, liberado: false, mensagem: json.mensagem || 'Não foi possível atualizar o pagamento agora.' };
      }
      const estado = json.estado || null;
      setEstadoAcesso(estado);
      setFaturaPendenteUrl(json.faturaPendente?.invoiceUrl || null);
      setEstadoCarregado(true);
      return {
        ok: true,
        liberado: !precisaPaywallEmpresa(estado),
        mensagem: !precisaPaywallEmpresa(estado)
          ? 'Pagamento confirmado. Acesso liberado.'
          : 'Pagamento ainda não confirmado pela Asaas. Tente novamente em instantes.',
      };
    } catch {
      return { ok: false, liberado: false, mensagem: 'Não foi possível consultar a Asaas agora.' };
    }
  }, [empresaId]);

  useEffect(() => {
    const carregarEstado = () => atualizarEstadoCobranca();
    if (!COBRANCA_ATIVA || !acessoLiberado || !empresaId) {
      const timerResetCobranca = window.setTimeout(() => {
        void atualizarEstadoCobranca();
      }, 0);
      return () => window.clearTimeout(timerResetCobranca);
    }
    void carregarEstado();
    const intervalo = window.setInterval(() => void carregarEstado(), 5 * 60 * 1000);
    const aoFocar = () => void carregarEstado();
    window.addEventListener('focus', aoFocar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', aoFocar);
    };
  }, [acessoLiberado, empresaId, atualizarEstadoCobranca]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCadastroPerfilAdiado(false);
      setCicloCadastroPaywall(null);
      setCadastroPerfilErro('');
      if (!acessoLiberado || !empresaId) {
        setCadastroPerfilStatus(null);
        setCadastroPerfilCarregado(true);
        return;
      }
      setCadastroPerfilCarregado(false);
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const token = sessao.session?.access_token;
        if (!token) throw new Error('Sessão indisponível. Entre novamente.');
        const resposta = await fetch(`/api/perfil-cadastro?empresaId=${encodeURIComponent(empresaId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resposta.json();
        if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível verificar o cadastro deste perfil.');
        if (ativo) setCadastroPerfilStatus(json);
      } catch (e) {
        if (ativo) {
          setCadastroPerfilStatus(null);
          setCadastroPerfilErro(e instanceof Error ? e.message : 'Não foi possível verificar o cadastro deste perfil.');
        }
      } finally {
        if (ativo) setCadastroPerfilCarregado(true);
      }
    };
    void carregar();
    return () => { ativo = false; };
  }, [acessoLiberado, empresaId, cadastroPerfilTentativa]);

  const iniciarAssinatura = async (
    ciclo: 'mensal' | 'anual',
    dadosCobranca: DadosCobrancaAssinatura,
    cadastroConfirmado = false,
  ): Promise<{ ok: boolean; url?: string; mensagem?: string }> => {
    if (!cadastroConfirmado && cadastroPerfilStatus && !cadastroPerfilStatus.completo) {
      setModalAssinatura(false);
      setCicloCadastroPaywall(ciclo);
      return { ok: false, mensagem: 'Conclua os dados cadastrais para continuar com a assinatura.' };
    }
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return { ok: false, mensagem: 'Sessão não encontrada. Entre novamente.' };
      const resp = await fetch('/api/cobranca/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          empresaId,
          plano: tipoPerfilAtual === 'pessoal' ? 'pessoal_premium' : 'empresa',
          ciclo,
          cobranca: dadosCobranca,
        }),
      });
      const json = await resp.json();
      if (resp.ok && json.invoiceUrl) {
        setFaturaPendenteUrl(json.invoiceUrl);
        return { ok: true, url: json.invoiceUrl };
      }
      return { ok: false, mensagem: json.mensagem || 'Não foi possível iniciar a assinatura. Tente novamente.' };
    } catch {
      return { ok: false, mensagem: 'Não foi possível iniciar a assinatura agora.' };
    }
  };
  const resgatarCupom = async (codigo: string): Promise<string | null> => {
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return 'Sessão não encontrada. Entre novamente.';
      const resp = await fetch('/api/cobranca/resgatar-cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId, codigo }),
      });
      const json = await resp.json();
      if (resp.ok && json.ok) { window.location.reload(); return null; }
      return json.mensagem || 'Não foi possível aplicar o cupom.';
    } catch {
      return 'Não foi possível aplicar o cupom agora.';
    }
  };
  const [saldoCardMesIdx, setSaldoCardMesIdx] = useState<number>(new Date().getMonth());
  const dashboardCardsKanban = ['aConfirmar', 'saldo', 'insightsAva', 'caixinha', 'meusPerfis', 'resumoFinanceiro', 'evolucaoMensal', 'registrarEntradas', 'controlePonto'];
  const ordemDashboardPadrao = { left: [], a: ['aConfirmar', 'saldo', 'insightsAva', 'caixinha', 'controlePonto'], b: ['meusPerfis', 'resumoFinanceiro', 'evolucaoMensal', 'registrarEntradas'] };
  const ocultosDashboardPadrao = normalizarTipoPerfil(tipoPerfilAtual) === 'empresa' ? ['caixinha'] : [];
  const [dashboardOrdem, setDashboardOrdem] = useState<{ left: string[]; a: string[]; b: string[] }>(ordemDashboardPadrao);
  const [dashboardOcultos, setDashboardOcultos] = useState<string[]>(ocultosDashboardPadrao);
  const [dashboardExpandidos, setDashboardExpandidos] = useState<string[]>([]);
const [ajustesAberto, setAjustesAberto] = useState(false);
const [menuAjuste, setMenuAjuste] = useState<null | 'visual' | 'config'>(null);
const [menuAjusteRect, setMenuAjusteRect] = useState<{ top: number; left: number } | null>(null);
const [modalSobre, setModalSobre] = useState(false);
const [modalNovidadesVendas, setModalNovidadesVendas] = useState(false);
const [agendaAberta, setAgendaAberta] = useState(false);
const [agendaItens, setAgendaItens] = useState<AgendaItem[]>([]);
const [agendaAnoAtivo, setAgendaAnoAtivo] = useState(new Date().getFullYear());
const [agendaMesAtivo, setAgendaMesAtivo] = useState(new Date().getMonth());
const [agendaDiaSelecionado, setAgendaDiaSelecionado] = useState<number | null>(null);
const [agendaFormAberto, setAgendaFormAberto] = useState(false);
const [agendaTitulo, setAgendaTitulo] = useState('');
const [agendaDescricao, setAgendaDescricao] = useState('');
const [agendaRepetir, setAgendaRepetir] = useState(false);
const [agendaRepeticao, setAgendaRepeticao] = useState<'diaria'|'semanal'|'quinzenal'|'mensal'|'anual'>('mensal');
const [agendaItemParaExcluir, setAgendaItemParaExcluir] = useState<AgendaItem | null>(null);
const [notificacoesWeb, setNotificacoesWeb] = useState<{ id: string; titulo: string; corpo: string; lida: boolean }[]>([]);
const [modalAprovacoesAberto, setModalAprovacoesAberto] = useState(false);
const [solicitacoesAprovacao, setSolicitacoesAprovacao] = useState<SolicitacaoAprovacao[]>([]);
const [acessosVendasAprovados, setAcessosVendasAprovados] = useState<AcessoVendasAprovado[]>([]);
const [aprovacoesCarregando, setAprovacoesCarregando] = useState(false);
const [aprovacaoProcessandoId, setAprovacaoProcessandoId] = useState<string | null>(null);
const ajustesAutoFecharTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const painelAjustesRef = useRef<HTMLDivElement | null>(null);
const painelAvisosAbertoAnterior = useRef(false);
const financeiroRealtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
const [menuResponsivoAberto, setMenuResponsivoAberto] = useState(false);
const [subAcaoGerenciar, setSubAcaoGerenciar] = useState<null | 'editar' | 'criar'>(null);
const [perfilCadastroEdicaoId, setPerfilCadastroEdicaoId] = useState<string | null>(null);
const [codigoVinculoEmpresa, setCodigoVinculoEmpresa] = useState<string | null>(null);
const [codigoVinculoCarregando, setCodigoVinculoCarregando] = useState(false);
  const [ultimoBackupEm, setUltimoBackupEm] = useState<string | null>(null);
  const [corPrimaria, setCorPrimaria] = useState('#003E73');
  const [corTemporaria, setCorTemporaria] = useState('#003E73');
  const [statusConfig, setStatusConfig] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [configuracoesCarregadas, setConfiguracoesCarregadas] = useState(false);
  const [mesAtivo, setMesAtivo] = useState<string | null>(null);
const [despesaAnaliseAtiva, setDespesaAnaliseAtiva] = useState<{
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
} | null>(null);
const [despesaRelatorioAberta, setDespesaRelatorioAberta] = useState<{
  nome: string;
  valor: number;
  cor: string;
} | null>(null);
  const ALTURA_LINHA_LANCAMENTO = 44;
  const ALTURA_PADRAO_TABELA = 440;
  const ESPACO_PUXADOR_TABELA = 42;

  const [alturaTabelaLancamentos, setAlturaTabelaLancamentos] = useState(ALTURA_PADRAO_TABELA);
  

  // NOVO: Estado do Ano Selecionado
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSettings, setLogoSettings] = useState({ scale: 100, x: 0, y: 0 });
  const [modalLogo, setModalLogo] = useState(false);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);
  const [modoSelecaoPerfil, setModoSelecaoPerfil] = useState<'entrada' | 'troca'>('entrada');
  const [modalModulos, setModalModulos] = useState(false);
  const [modulosCatalogo, setModulosCatalogo] = useState<Modulo[]>([]);
  const [modulosAtivos, setModulosAtivos] = useState<string[]>([]);
  const [modulosCarregando, setModulosCarregando] = useState(false);
  const [moduloAcaoId, setModuloAcaoId] = useState<string | null>(null);
  const [modalPontoAdmin, setModalPontoAdmin] = useState(false);
  const [modalRecebimentos, setModalRecebimentos] = useState(false);
  const [abaInicialPontoAdmin, setAbaInicialPontoAdmin] = useState<AbaPontoAdmin>('lista');
  const [instanciaPontoAdmin, setInstanciaPontoAdmin] = useState(0);
  const [relatorioInicialPonto, setRelatorioInicialPonto] = useState<{ funcionarioUserId: string; data: string } | null>(null);
  const [pontoFuncionarios, setPontoFuncionarios] = useState<FuncionarioPonto[]>([]);
  const [pontoFuncCarregando, setPontoFuncCarregando] = useState(false);
  const [pontoConfig, setPontoConfig] = useState<PontoConfig>(null);
  const [pontoDiasNaoUteis, setPontoDiasNaoUteis] = useState<PontoDiaNaoUtil[]>([]);
  const [pontoDiasNaoUteisCarregando, setPontoDiasNaoUteisCarregando] = useState(false);
  const [pontoResumoDia, setPontoResumoDia] = useState<Array<{
    userId: string;
    nome: string;
    status: 'atraso' | 'falta' | 'incompleto';
    falhas?: string[];
  }>>([]);
  const [pontoResumoCarregando, setPontoResumoCarregando] = useState(true);
  const [pontoFuncionariosHoje, setPontoFuncionariosHoje] = useState(0);
  const [painelAjusteLogo, setPainelAjusteLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const [modalRestauracaoBackupAberto, setModalRestauracaoBackupAberto] = useState(false);
  const [backupRestauracaoArquivo, setBackupRestauracaoArquivo] = useState<File | null>(null);
  const [backupRestauracaoAnalise, setBackupRestauracaoAnalise] = useState<AnaliseBackupImportacao | null>(null);
  const [modoRestauracaoBackup, setModoRestauracaoBackup] = useState<ModoImportacaoBackup>('atualizar');
  const [confirmacaoSubstituirBackup, setConfirmacaoSubstituirBackup] = useState('');
  const [importandoBackup, setImportandoBackup] = useState(false);

  // Modais e Calc
  const [modalInstrucoes, setModalInstrucoes] = useState(false);
  const [modalDespesasBase, setModalDespesasBase] = useState(false);
  const [modalDespesasFixas, setModalDespesasFixas] = useState(false);
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([]);
  const [recorrSalvando, setRecorrSalvando] = useState(false);
  const [novaRecorrNome, setNovaRecorrNome] = useState('');
  const [novaRecorrCategoria, setNovaRecorrCategoria] = useState('');
  const [novaRecorrDescricao, setNovaRecorrDescricao] = useState('');
  const [novaRecorrDia, setNovaRecorrDia] = useState('');
  const [novaRecorrValor, setNovaRecorrValor] = useState('');
  const [novaRecorrValorNumerico, setNovaRecorrValorNumerico] = useState(0);
  const [novaRecorrLancarAgora, setNovaRecorrLancarAgora] = useState(false);
  const [novaRecorrMesesFrente, setNovaRecorrMesesFrente] = useState('1');
  const [recorrEditandoId, setRecorrEditandoId] = useState<string | null>(null);
  const [editRecorrNome, setEditRecorrNome] = useState('');
  const [editRecorrCategoria, setEditRecorrCategoria] = useState('');
  const [editRecorrDescricao, setEditRecorrDescricao] = useState('');
  const [editRecorrDia, setEditRecorrDia] = useState('');
  const [editRecorrValor, setEditRecorrValor] = useState('');
  const [editRecorrValorNumerico, setEditRecorrValorNumerico] = useState(0);
  const [editRecorrLancarAgora, setEditRecorrLancarAgora] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const [modalTermos, setModalTermos] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);

  // Dados Financeiros
const [mesFaturamento, setMesFaturamento] = useState('JANEIRO');
const [faturamentos, setFaturamentos] = useState<Record<string, number>>({});
const [inputFaturamento, setInputFaturamento] = useState('');
const [mesResumoDash, setMesResumoDash] = useState('JANEIRO');

const [faturamentosEntradas, setFaturamentosEntradas] = useState<EntradaFaturamento[]>([]);
const [resumoPerfisDashboard, setResumoPerfisDashboard] = useState<ResumoPerfilFinanceiro[]>([]);
const [entradaFaturamentoDia, setEntradaFaturamentoDia] = useState('');
const [entradaFaturamentoOrigem, setEntradaFaturamentoOrigem] = useState('');
const [entradaFaturamentoValor, setEntradaFaturamentoValor] = useState('');
const [entradaFaturamentoValorNumerico, setEntradaFaturamentoValorNumerico] = useState(0);
const [entradaFaturamentoSalvando, setEntradaFaturamentoSalvando] = useState(false);
const [modalReceitaDashboardAberto, setModalReceitaDashboardAberto] = useState(false);
const [mesReceitaDashboard, setMesReceitaDashboard] = useState('JANEIRO');
const [tipoReceitaDashboard, setTipoReceitaDashboard] = useState<'entrada' | 'total'>('entrada');
const [valorReceitaDashboardConfirmacao, setValorReceitaDashboardConfirmacao] = useState(0);
const [entradaFaturamentoEditandoId, setEntradaFaturamentoEditandoId] = useState<string | null>(null);
const [editEntradaFaturamentoDia, setEditEntradaFaturamentoDia] = useState('');
const [editEntradaFaturamentoOrigem, setEditEntradaFaturamentoOrigem] = useState('');
const [editEntradaFaturamentoValor, setEditEntradaFaturamentoValor] = useState('');
const [editEntradaFaturamentoValorNumerico, setEditEntradaFaturamentoValorNumerico] = useState(0);

  const [despesasCadastradas, setDespesasCadastradas] = useState<
  DespesaCadastrada[]
>([]);

  const [novaBaseNome, setNovaBaseNome] = useState('');
  const [novaBaseCat, setNovaBaseCat] = useState('');

  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [caixinhaMovimentos, setCaixinhaMovimentos] = useState<CaixinhaMovimento[]>([]);
  const [formDia, setFormDia] = useState('');
  const [formDespesa, setFormDespesa] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [valorNumericoRaw, setValorNumericoRaw] = useState(0);
  const [blocoAtivo, setBlocoAtivo] = useState<'despesa' | 'receita' | null>('despesa');
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [formParcelar, setFormParcelar] = useState(false);
  const [formParcelas, setFormParcelas] = useState(2);
  const [notaPendente, setNotaPendente] = useState<File | null>(null);
  const [arquivoImportador, setArquivoImportador] = useState<File | null>(null);
  const [retomarRascunhoImportador, setRetomarRascunhoImportador] = useState(false);
  const [temRascunhoImportador, setTemRascunhoImportador] = useState(false);
  const [lendoNota, setLendoNota] = useState(false);
  const [notaAbertaUrl, setNotaAbertaUrl] = useState('');
  const [baixandoNota, setBaixandoNota] = useState(false);
  const [lancamentoEditandoId, setLancamentoEditandoId] = useState<string | number | null>(null);
const [editDia, setEditDia] = useState('');
const [editDespesa, setEditDespesa] = useState('');
const [editDescricao, setEditDescricao] = useState('');
const [editValor, setEditValor] = useState('');
const [editValorNumerico, setEditValorNumerico] = useState(0);
const [ordemLancamentos, setOrdemLancamentos] = useState<'desc' | 'asc'>('desc');
const [ordemEntradasFaturamento, setOrdemEntradasFaturamento] = useState<'desc' | 'asc'>('desc');
const [buscaLancamento, setBuscaLancamento] = useState('');
const [buscaEntradaFaturamento, setBuscaEntradaFaturamento] = useState('');

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const TEMPO_LIMITE_INATIVIDADE = 60 * 60 * 1000; // 60 minutos
const CHAVE_ULTIMA_ATIVIDADE = 'avantalab_ultima_atividade';
const encerrandoSessaoRef = useRef(false);
const logoutManualEmCursoRef = useRef(false);
const acessoLiberadoRef = useRef(false);

useEffect(() => {
  acessoLiberadoRef.current = acessoLiberado;
}, [acessoLiberado]);

useEffect(() => {
  setTemRascunhoImportador(existeRascunhoImportador());
}, []);

const podeInserirLancamentos =
  perfilUsuario === 'gestor_master' ||
  perfilUsuario === 'administrador' ||
  perfilUsuario === 'operador_completo' ||
  perfilUsuario === 'operador_simples';

const podeEditarLancamentos =
  perfilUsuario === 'gestor_master' ||
  perfilUsuario === 'administrador' ||
  perfilUsuario === 'operador_completo';

const podeExcluirLancamentos =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

const podeGerenciarPonto =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

const podeGerenciarRecebimentos =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

const podeAcessarAjustes =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

// O Operador Completo pode trabalhar com os conteúdos do Vendas já instalado,
// mas não ganha permissões administrativas nem de instalação de módulos.
const podeAcessarVendasMobileWeb =
  perfilUsuario === 'gestor_master' ||
  perfilUsuario === 'administrador' ||
  perfilUsuario === 'operador_completo';

// Qualquer usuario autenticado pode criar seu proprio perfil (empresa ou pessoal),
// independente do papel (gestor_master, administrador, operador_completo, operador_simples).
const podeCriarNovaEmpresa =
  perfilUsuario === 'gestor_master' ||
  perfilUsuario === 'administrador' ||
  perfilUsuario === 'operador_completo' ||
  perfilUsuario === 'operador_simples';

const podeTrocarEmpresa = empresasDoUsuario.length > 1;

const carregarSolicitacoesAprovacao = useCallback(async () => {
  if (!empresaId || !podeAcessarAjustes) {
    setSolicitacoesAprovacao([]);
    setAcessosVendasAprovados([]);
    return;
  }

  setAprovacoesCarregando(true);
  try {
    const [solicitacoesRes, acessosRes] = await Promise.all([
      supabase.from('vendas_mobile_solicitacoes_acesso').select('id, user_id, nome, email, telefone, solicitado_em, status').eq('empresa_id', empresaId).order('solicitado_em', { ascending: false }),
      supabase.from('vendas_mobile_acessos').select('id, user_id, papel, status, aprovado_em').eq('empresa_id', empresaId).order('aprovado_em', { ascending: false }),
    ]);

    if (solicitacoesRes.error || acessosRes.error) {
      setSolicitacoesAprovacao([]);
      setAcessosVendasAprovados([]);
      return;
    }

    const solicitacoes = solicitacoesRes.data || [];
    setSolicitacoesAprovacao(solicitacoes.filter((item) => item.status === 'pendente').map((solicitacao) => ({
      id: String(solicitacao.id),
      nome: String(solicitacao.nome || 'Solicitante'),
      email: String(solicitacao.email || 'E-mail não informado'),
      telefone: solicitacao.telefone ? String(solicitacao.telefone) : null,
      solicitadoEm: String(solicitacao.solicitado_em || new Date().toISOString()),
      perfilNome: nomeEmpresaAtual || 'Perfil atual',
      sistema: 'Vendas Mobile',
    })));
    setAcessosVendasAprovados((acessosRes.data || []).map((acesso) => {
      const solicitacao = solicitacoes.find((item) => item.user_id === acesso.user_id);
      return {
        id: String(acesso.id),
        nome: String(solicitacao?.nome || 'Usuário aprovado'),
        email: String(solicitacao?.email || 'E-mail não informado'),
        telefone: solicitacao?.telefone ? String(solicitacao.telefone) : null,
        aprovadoEm: String(acesso.aprovado_em || new Date().toISOString()),
        perfilNome: nomeEmpresaAtual || 'Perfil atual',
        sistema: 'Vendas Mobile',
        papel: String(acesso.papel || 'vendedor'),
        status: acesso.status === 'bloqueado' ? 'bloqueado' : 'ativo',
      };
    }));
  } finally {
    setAprovacoesCarregando(false);
  }
}, [empresaId, nomeEmpresaAtual, podeAcessarAjustes]);

const abrirAprovacoes = useCallback(async () => {
  if (!podeAcessarAjustes) {
    abrirAviso('Acesso não permitido', 'Somente gestor master ou administrador pode analisar aprovações.');
    return;
  }
  setModalAprovacoesAberto(true);
  await carregarSolicitacoesAprovacao();
}, [abrirAviso, carregarSolicitacoesAprovacao, podeAcessarAjustes]);

const analisarSolicitacaoAprovacao = async (solicitacao: SolicitacaoAprovacao, aprovar: boolean) => {
  setAprovacaoProcessandoId(solicitacao.id);
  try {
    const { error } = await supabase.rpc('analisar_solicitacao_vendas_mobile_rpc', {
      p_solicitacao_id: solicitacao.id,
      p_aprovar: aprovar,
      p_observacao: null,
    });
    if (error) {
      abrirAviso('Não foi possível concluir', error.message || 'Tente novamente em instantes.');
      return;
    }
    await carregarSolicitacoesAprovacao();
    abrirAviso(aprovar ? 'Acesso aprovado' : 'Solicitação rejeitada', aprovar
      ? `${solicitacao.nome} já pode acessar o Vendas Mobile deste perfil.`
      : `A solicitação de ${solicitacao.nome} foi rejeitada.`, undefined, 'sucesso');
  } finally {
    setAprovacaoProcessandoId(null);
  }
};

const gerenciarAcessoVendas = async (acesso: AcessoVendasAprovado, acao: 'revogar' | 'reativar' | 'excluir') => {
  setAprovacaoProcessandoId(acesso.id);
  try {
    const { error } = await supabase.rpc('gerenciar_acesso_vendas_mobile_rpc', { p_acesso_id: acesso.id, p_acao: acao });
    if (error) {
      abrirAviso('Não foi possível concluir', error.message || 'Tente novamente em instantes.');
      return;
    }
    await carregarSolicitacoesAprovacao();
    abrirAviso(acao === 'revogar' ? 'Acesso revogado' : acao === 'reativar' ? 'Acesso reativado' : 'Acesso excluído', acao === 'revogar'
      ? `${acesso.nome} não poderá mais entrar no Vendas Mobile.`
      : acao === 'reativar' ? `${acesso.nome} voltou a ter acesso ao Vendas Mobile.` : `O vínculo de ${acesso.nome} foi excluído.`, undefined, 'sucesso');
  } finally {
    setAprovacaoProcessandoId(null);
  }
};

const confirmarGerenciamentoAcesso = (acesso: AcessoVendasAprovado, acao: 'revogar' | 'reativar' | 'excluir') => {
  abrirConfirmacao({
    titulo: acao === 'revogar' ? 'Revogar acesso?' : acao === 'reativar' ? 'Reativar acesso?' : 'Excluir vínculo?',
    mensagem: acao === 'revogar' ? `${acesso.nome} perderá o acesso ao Vendas Mobile deste perfil.` : acao === 'reativar'
      ? `${acesso.nome} voltará a acessar o Vendas Mobile deste perfil.` : `O vínculo de ${acesso.nome} será apagado. Para voltar, o usuário precisará informar o código e solicitar uma nova aprovação.`,
    textoConfirmar: acao === 'revogar' ? 'Revogar acesso' : acao === 'reativar' ? 'Reativar acesso' : 'Excluir vínculo',
    acao: async () => { await gerenciarAcessoVendas(acesso, acao); },
  });
};

const confirmarAnaliseSolicitacao = (solicitacao: SolicitacaoAprovacao, aprovar: boolean) => {
  abrirConfirmacao({
    titulo: aprovar ? 'Aprovar acesso?' : 'Rejeitar solicitação?',
    mensagem: aprovar
      ? `${solicitacao.nome} terá acesso ao Vendas Mobile no perfil ${solicitacao.perfilNome}.`
      : `${solicitacao.nome} não terá acesso ao Vendas Mobile neste perfil.`,
    textoConfirmar: aprovar ? 'Aprovar acesso' : 'Rejeitar',
    acao: async () => { await analisarSolicitacaoAprovacao(solicitacao, aprovar); },
  });
};

useEffect(() => {
  if (!mounted || !empresaId || !podeAcessarAjustes) {
    setSolicitacoesAprovacao([]);
    setAcessosVendasAprovados([]);
    return;
  }

  carregarSolicitacoesAprovacao();
  const intervalo = window.setInterval(carregarSolicitacoesAprovacao, 30000);
  const canal = supabase
    .channel(`vendas_mobile_aprovacoes_${empresaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_mobile_solicitacoes_acesso', filter: `empresa_id=eq.${empresaId}` }, carregarSolicitacoesAprovacao)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_mobile_acessos', filter: `empresa_id=eq.${empresaId}` }, carregarSolicitacoesAprovacao)
    .subscribe();

  return () => {
    window.clearInterval(intervalo);
    supabase.removeChannel(canal);
  };
}, [carregarSolicitacoesAprovacao, empresaId, mounted, podeAcessarAjustes]);

useEffect(() => {
  if (!modalEmpresasAberto || !empresaId || !podeAcessarAjustes) {
    setCodigoVinculoEmpresa(null);
    return;
  }

  let ativo = true;
  setCodigoVinculoCarregando(true);

  const carregarCodigo = async () => {
    const { data, error } = await supabase
      .from('codigos_vinculo_empresa')
      .select('codigo')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .maybeSingle();

    if (!ativo) return;
    if (error) {
      // A tabela chega junto da migration do modulo Vendas. Enquanto ela
      // nao tiver sido aplicada, o card simplesmente nao exibe o codigo.
      setCodigoVinculoEmpresa(null);
    } else {
      setCodigoVinculoEmpresa(data?.codigo ? String(data.codigo) : null);
    }
    setCodigoVinculoCarregando(false);
  };

  carregarCodigo();

  return () => { ativo = false; };
}, [empresaId, modalEmpresasAberto, podeAcessarAjustes]);

const copiarCodigoVinculoEmpresa = async () => {
  if (!codigoVinculoEmpresa) return;

  try {
    await navigator.clipboard.writeText(codigoVinculoEmpresa);
    abrirAviso('Código copiado', 'Envie este código ao vendedor para que ele solicite acesso ao perfil.', undefined, 'sucesso');
  } catch {
    abrirAviso('Não foi possível copiar', `Copie manualmente o código: ${codigoVinculoEmpresa}`);
  }
};

const confirmarRegeneracaoCodigoVinculo = () => {
  if (!empresaId) return;

  abrirConfirmacao({
    titulo: 'Gerar novo código?',
    mensagem: 'O código atual deixará de funcionar imediatamente. Solicitações já enviadas para aprovação não serão afetadas.',
    textoConfirmar: 'Gerar novo código',
    acao: async () => {
      const { data, error } = await supabase.rpc('regenerar_codigo_vinculo_empresa_rpc', {
        p_empresa_id: empresaId,
      });

      if (error || !data?.codigo) {
        abrirAviso('Não foi possível gerar o código', error?.message || 'Tente novamente em instantes.');
        return;
      }

      setCodigoVinculoEmpresa(String(data.codigo));
      abrirAviso('Novo código gerado', 'O código anterior foi invalidado.', undefined, 'sucesso');
    },
  });
};

const perfilUsuarioFormatado =
  perfilUsuario === 'gestor_master'
    ? 'Gestor Master'
    : perfilUsuario === 'administrador'
      ? 'Administrador'
      : perfilUsuario === 'operador_completo'
        ? 'Operador Completo'
        : perfilUsuario === 'operador_simples'
          ? 'Operador Simples'
          : 'Não definido';

const tipoPerfilAtualNormalizado = normalizarTipoPerfil(tipoPerfilAtual);
const tipoPerfilInicialNormalizado = normalizarTipoPerfil(tipoPerfilInicial);
const editTipoPerfilNormalizado = normalizarTipoPerfil(editTipoPerfil);
const categoriasPerfilAtual = categoriasDoPerfil(tipoPerfilAtualNormalizado);
const rotuloTipoPerfilAtual = rotuloTipoPerfil(tipoPerfilAtualNormalizado);
const labelNomePerfilInicial = rotuloNomePerfil(tipoPerfilInicialNormalizado);
const placeholderPerfilInicial = placeholderNomePerfil(tipoPerfilInicialNormalizado);
const labelNomePerfilEdicao = rotuloNomePerfil(editTipoPerfilNormalizado);

// Premium Pessoal — múltiplos perfis: no grátis o usuário tem direito a 1
// perfil pessoal. Criar perfil EMPRESA continua sempre livre (tem trial
// próprio); e quem assina a Empresa ganha o Premium no pessoal (o servidor
// devolve o estado como cortesia nesse caso).
const criarPerfilPessoalBloqueado = (): boolean => {
  if (!COBRANCA_ATIVA || !estadoAcesso) return false;
  const jaTemPessoal = empresasDoUsuario.some(
    (empresa: { tipo_perfil?: string | null }) => normalizarTipoPerfil(empresa.tipo_perfil) === 'pessoal'
  );
  if (!jaTemPessoal) return false; // primeiro perfil pessoal é o grátis
  if (estadoAcesso.tipoPerfil === 'pessoal') return !assinaturaVigente(estadoAcesso);
  // Perfil atual é empresa: só a assinatura PAGA (não o trial) libera novos pessoais.
  return estadoAcesso.status !== 'ativa';
};

// Envolve a criação de perfil com o gate do Premium (só bloqueia perfil pessoal extra).
const handleCriarEmpresaInicialComGate = () => {
  if (criandoNovaEmpresaLogada && tipoPerfilInicialNormalizado === 'pessoal' && criarPerfilPessoalBloqueado()) {
    abrirPremium('multiplos_perfis');
    return;
  }
  handleCriarEmpresaInicial();
};

const textoSobreCorPrimaria = corEhClara(corPrimaria) ? '#0f172a' : '#ffffff';
const bordaSobreCorPrimaria = corEhClara(corPrimaria)
  ? 'rgba(15, 23, 42, 0.25)'
  : 'rgba(255, 255, 255, 0.30)';

  const estiloTemaPrimario = {
  backgroundColor: corPrimaria,
  borderColor: corPrimaria,
  color: textoSobreCorPrimaria,
};

const estiloTemaPrimarioGradiente = {
  background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}dd)`,
  boxShadow: `0 5px 14px ${corPrimaria}35`,
  border: `1px solid ${bordaSobreCorPrimaria}`,
  color: textoSobreCorPrimaria,
};

const estiloTextoTema = {
  color: textoSobreCorPrimaria,
};

const extrairCorPredominanteLogo = (imagemBase64: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const imagem = new Image();

    imagem.onload = () => {
      const canvas = document.createElement('canvas');
      const contexto = canvas.getContext('2d');

      if (!contexto || !imagem.width || !imagem.height) {
        resolve(null);
        return;
      }

      const largura = 120;
      const altura = Math.max(1, Math.round((imagem.height / imagem.width) * largura));

      canvas.width = largura;
      canvas.height = altura;

      contexto.drawImage(imagem, 0, 0, largura, altura);

      const dados = contexto.getImageData(0, 0, largura, altura).data;

      const grupos: Record<
        string,
        {
          quantidade: number;
          rTotal: number;
          gTotal: number;
          bTotal: number;
          pontuacao: number;
        }
      > = {};

      for (let i = 0; i < dados.length; i += 4) {
        const r = dados[i];
        const g = dados[i + 1];
        const b = dados[i + 2];
        const a = dados[i + 3];

        if (a < 180) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturacao = max - min;
        const brilho = (r + g + b) / 3;

        const muitoClaro = brilho > 238;
        const muitoEscuro = brilho < 28;
        const poucoSaturado = saturacao < 25;

        if (muitoClaro || muitoEscuro || poucoSaturado) continue;

        const rAgrupado = Math.round(r / 16) * 16;
        const gAgrupado = Math.round(g / 16) * 16;
        const bAgrupado = Math.round(b / 16) * 16;

        const chave = `${rAgrupado},${gAgrupado},${bAgrupado}`;

        if (!grupos[chave]) {
          grupos[chave] = {
            quantidade: 0,
            rTotal: 0,
            gTotal: 0,
            bTotal: 0,
            pontuacao: 0,
          };
        }

        grupos[chave].quantidade += 1;
        grupos[chave].rTotal += r;
        grupos[chave].gTotal += g;
        grupos[chave].bTotal += b;

        grupos[chave].pontuacao += saturacao * 1.6 + Math.min(brilho, 210) * 0.25;
      }

      const melhorGrupo = Object.values(grupos).sort((a, b) => {
        const pontuacaoA = a.quantidade * 0.7 + a.pontuacao;
        const pontuacaoB = b.quantidade * 0.7 + b.pontuacao;

        return pontuacaoB - pontuacaoA;
      })[0];

      if (!melhorGrupo) {
        resolve(null);
        return;
      }

      const r = Math.round(melhorGrupo.rTotal / melhorGrupo.quantidade);
      const g = Math.round(melhorGrupo.gTotal / melhorGrupo.quantidade);
      const b = Math.round(melhorGrupo.bTotal / melhorGrupo.quantidade);

      const hex = `#${[r, g, b]
        .map((valor) =>
          Math.max(0, Math.min(255, valor)).toString(16).padStart(2, '0')
        )
        .join('')}`;

      resolve(hex);
    };

    imagem.onerror = () => resolve(null);

    imagem.src = imagemBase64;
  });
};

useEffect(() => {
  const verificarDispositivoMobile = () => {
    const larguraPequena = window.innerWidth < 1024;

    const dispositivoComToque =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    const userAgentMobile =
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
        navigator.userAgent
      );

    const ehMobile = larguraPequena && (dispositivoComToque || userAgentMobile);

    setIsTelaMobile(ehMobile);

    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('cadastro') === '1') {
      setModoAuth('cadastro');
      setMostrarLandingPreLogin(false);
      window.history.replaceState(null, '', window.location.pathname);
    } else if (parametros.get('entrar') === '1') {
      setModoAuth('login');
      setMostrarLandingPreLogin(false);
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  verificarDispositivoMobile();
}, []);

useEffect(() => {
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
    if (!sessao || evento === 'SIGNED_OUT') {
      if (acessoLiberadoRef.current && !encerrandoSessaoRef.current && !logoutManualEmCursoRef.current) void encerrarSessaoExpirada();
      return;
    }

    const larguraPequena = window.innerWidth < 1024;
    const dispositivoMobile =
      window.matchMedia('(display-mode: standalone)').matches ||
      ((navigator as Navigator & { standalone?: boolean }).standalone ?? false) ||
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);

    if (larguraPequena && dispositivoMobile && window.location.pathname === '/') {
      window.location.replace('/mobile');
    }
  });

  return () => data.subscription.unsubscribe();
}, []);

const carregarEmpresaSelecionada = async (empresa: EmpresaUsuarioResumo) => {
  setCarregandoPerfil(true);
  setEstadoAcesso(null);
  setEstadoCarregado(false);
  // Fecha o card de selecao na hora (antes do trabalho assincrono)
  setModalSelecionarEmpresa(false);
  setModoSelecaoPerfil('entrada');
  setModalEmpresasAberto(false);
  // Rede de seguranca: nunca deixar o loading preso
  setTimeout(() => setCarregandoPerfil(false), 12000);
  const mesAtual = meses[new Date().getMonth()];
setMesResumoDash(mesAtual);
setMesFaturamento(mesAtual);
setMesAtivo(null);
  setConfiguracoesCarregadas(false);

  setEmpresaId(empresa.id);
  setNomeEmpresaAtual(empresa.nome || empresa.empresa_nome || '');
  setTelefoneCobrancaPadrao(String(empresa.telefone || ''));
  setTipoPerfilAtual(normalizarTipoPerfil(empresa.tipo_perfil));
  const ocultosPadraoDoPerfil = normalizarTipoPerfil(empresa.tipo_perfil) === 'empresa' ? ['caixinha'] : [];
  setDashboardOrdem(ordemDashboardPadrao);
  setDashboardOcultos(ocultosPadraoDoPerfil);
  setDashboardExpandidos([]);
  setPerfilUsuario(empresa.perfil || null);
  setAcessoUsuarioAtualId(empresa.acessoId || empresa.acesso_id || null);
  // Libera o acesso já aqui (com carregandoPerfil ativo, o gate mostra a tela de
  // carregamento). Evita a "corrida" em que carregandoPerfil zera antes do fim e
  // o render cai na tela de login/início enquanto os dados ainda carregam.
  setAcessoLiberado(true);

  const { data: usuarioLogado } = await supabase.auth.getUser();

const emailLogado = usuarioLogado.user?.email || '';

if (emailLogado.trim().toLowerCase() === 'teste@teste.com.br') {
  await prepararDadosContaRevisao(empresa.id, usuarioLogado.user?.id || '', emailLogado);
}

setEmailUsuarioAtual(emailLogado);

const nomeOuLoginDoVinculo =
  empresa.usuario_nome ||
  empresa.nome_usuario ||
  empresa.usuarioNome ||
  empresa.nome_acesso ||
  empresa.login ||
  empresa.usuario_login ||
  empresa.login_usuario ||
  '';

setNomeUsuarioAtual(
  nomeOuLoginDoVinculo ||
    usuarioLogado.user?.user_metadata?.nome ||
    emailLogado.split('@')[0] ||
    ''
);

const contaRevisaoAppApple = emailLogado.trim().toLowerCase() === 'teste@teste.com.br';

if (empresa.telefone_confirmado !== true && !contaRevisaoAppApple) {
  setEmpresaAguardandoTelefone(empresa);
  setTelefoneObrigatorio(empresa.telefone || '');
  setCodigoSmsTelefoneObrigatorio('');
  setSmsTelefoneObrigatorioEnviado(false);
  setTelefoneObrigatorioConfirmado('');
  setSegundosReenvioTelefoneObrigatorio(0);
  setValidacaoTelefoneObrigatoria(true);

  setAcessoNaoConfigurado(false);
  setAcessoLiberado(true);
  setModalSelecionarEmpresa(false);

  setCarregandoPerfil(false);
  return;
}

  // Resetar logo antes de carregar a nova empresa (evita contaminação entre empresas)
  setLogoUrl('');
  setLogoSettings({ scale: 100, x: 0, y: 0 });

  const config = await buscarConfiguracoes(empresa.id);
  const despesas = await buscarDespesasCadastradas(empresa.id);

  if (config) {
    if (config.cor_primaria) {
      setCorPrimaria(config.cor_primaria);
      setCorTemporaria(config.cor_primaria);
    }

    setDarkMode(false);
    if (config.duplicados_ativo !== undefined) setDuplicadosAtivo(config.duplicados_ativo);
    setLogoUrl(config.logo_url ?? '');
    if (config.logo_settings) setLogoSettings(config.logo_settings);

    const rawOrdem = config.dashboard_ordem_web;
    if (rawOrdem && Array.isArray(rawOrdem.a) && Array.isArray(rawOrdem.b)) {
      const left = Array.isArray(rawOrdem.left)
        ? rawOrdem.left.filter((id: string, index: number) => dashboardCardsKanban.includes(id) && rawOrdem.left.indexOf(id) === index)
        : [];
      const a = rawOrdem.a.filter((id: string) => dashboardCardsKanban.includes(id) && !left.includes(id));
      const b = rawOrdem.b.filter((id: string) => dashboardCardsKanban.includes(id) && !left.includes(id) && !a.includes(id));
      const usados = [...left, ...a, ...b];
      const faltantes = dashboardCardsKanban.filter((id) => !usados.includes(id));
      setDashboardOrdem({ left, a: [...a, ...faltantes], b });
      setDashboardExpandidos(
        Array.isArray(rawOrdem.expandidos)
          ? rawOrdem.expandidos.filter((id: string, index: number) => dashboardCardsKanban.includes(id) && rawOrdem.expandidos.indexOf(id) === index)
          : []
      );
    } else {
      setDashboardOrdem(ordemDashboardPadrao);
      setDashboardExpandidos([]);
    }

    const rawOcultos = config.dashboard_ocultos_web;
    setDashboardOcultos(
      Array.isArray(rawOcultos)
        ? rawOcultos.filter((id: string, index: number) => dashboardCardsKanban.includes(id) && rawOcultos.indexOf(id) === index)
        : ocultosPadraoDoPerfil
    );

    if (config.ultimo_backup_em) {
      setUltimoBackupEm(config.ultimo_backup_em);
    }
  }

  if (despesas && despesas.length > 0) {
    setDespesasCadastradas(
      despesas.map((d: RegistroSupabase) => ({
        nome: formatarNomeCategoria(textoRegistro(d.nome)),
        categoria: formatarNomeCategoria(textoRegistro(d.categoria)),
      }))
    );
  } else {
    setDespesasCadastradas([]);
  }

  setConfiguracoesCarregadas(true);
setAcessoNaoConfigurado(false);
setAcessoLiberado(true);
setModalSelecionarEmpresa(false);
};

  // --- LOCAL STORAGE (LÓGICA SEPARADA POR ANO E CONFIGURAÇÕES) ---
  
  // 1. Carrega Configurações Globais
  // 1. Carrega Configurações Globais do Supabase

useEffect(() => {
  const carregarConfiguracoesIniciais = async () => {
    setMounted(true);
    setCarregandoSistema(true);
    setMensagemCarregamentoSistema('Verificando acesso...');

    const paramsConfirmacao = new URLSearchParams(window.location.search);
const hashConfirmacao = new URLSearchParams(window.location.hash.replace('#', ''));

const modoUrl = paramsConfirmacao.get('modo');
const tipoUrl = paramsConfirmacao.get('type') || hashConfirmacao.get('type');

if (modoUrl === 'redefinir-senha' || tipoUrl === 'recovery') {
  setModoRedefinirSenha(true);
  setMostrarLandingPreLogin(false);
  setAcessoLiberado(false);
  setAcessoNaoConfigurado(false);
  setModalSelecionarEmpresa(false);
  setEmpresaId(null);
  setNomeEmpresaAtual('');
  setTipoPerfilAtual('empresa');
  setPerfilUsuario(null);
  setAuthErro('');
  setAuthMensagem('');
  setMounted(true);
  setCarregandoSistema(false);

  return;
}

if (paramsConfirmacao.get('confirmado') === '1') {
      await supabase.auth.signOut({ scope: 'local' });

      setEmailConfirmado(true);
      setAcessoLiberado(false);
      setAcessoNaoConfigurado(false);
      setModoRedefinirSenha(false);
      setModoAuth('login');
      setMostrarLandingPreLogin(false);
      setMounted(true);
      setCarregandoSistema(false);

      window.history.replaceState({}, document.title, window.location.pathname);

      return;
    }

    const { data: sessaoAtual } = await supabase.auth.getSession();

    let empresa = null;

    // Funcionário do Controle de Ponto não acessa o sistema: encaminha para /ponto.
    if (sessaoAtual.session?.user?.user_metadata?.tipo === 'funcionario_ponto') {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
      window.location.replace('/ponto');
      return;
    }

    if (sessaoAtual.session) {
     try {
      localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace('#', ''));

      const tipo = params.get('type') || hash.get('type');

      if (tipo === 'recovery') {
  setModoRedefinirSenha(true);
  setMostrarLandingPreLogin(false);
  setAcessoLiberado(false);
  setAcessoNaoConfigurado(false);
  setModalSelecionarEmpresa(false);
  setEmpresaId(null);
  setNomeEmpresaAtual('');
  setTipoPerfilAtual('empresa');
  setPerfilUsuario(null);
  setAuthErro('');
  setAuthMensagem('');
  setMounted(true);
  setCarregandoSistema(false);

  return;
}

setAcessoLiberado(false);
setAcessoNaoConfigurado(false);
setMensagemCarregamentoSistema('Carregando empresa...');

      const empresasEncontradas = await buscarEmpresasDoUsuario(
        sessaoAtual.session.user.id
      );

      if (!empresasEncontradas || empresasEncontradas.length === 0) {
  setCriandoNovaEmpresaLogada(false);
  setAcessoLiberado(false);
  const empresaFallback = await buscarEmpresaDoUsuario(
    sessaoAtual.session.user.id
  );

  if (!empresaFallback) {
    if (String(sessaoAtual.session.user.email || '').trim().toLowerCase() === 'teste@teste.com.br') {
      const perfilCriado = await handleCriarEmpresaInicial({
        nome: 'AvantaLab — Conta de teste',
        tipoPerfil: 'pessoal',
        somentePrimeiroCadastro: true,
      });
      if (perfilCriado) return;
    }
    const perfilCriado = await handleCriarPerfilInicialDoCadastro(
      sessaoAtual.session.user.user_metadata
    );
    if (perfilCriado) return;
    setAcessoNaoConfigurado(true);
    setAcessoLiberado(false);
  } else {
    empresa = empresaFallback;
    setAcessoNaoConfigurado(false);
  }
} else if (empresasEncontradas.length === 1) {
  empresa = empresasEncontradas[0];
  setAcessoNaoConfigurado(false);
  setAcessoLiberado(false);

} else {
  setEmpresaId(null);
  setNomeEmpresaAtual('');
  setTipoPerfilAtual('empresa');
  setPerfilUsuario(null);
  setLogoUrl('');
  setLogoSettings({ scale: 100, x: 0, y: 0 });
  setDespesasCadastradas([]);
  setLancamentos([]);
  setCaixinhaMovimentos([]);
  setFaturamentos({});
  setFaturamentosEntradas([]);

  setEmpresasDoUsuario(empresasEncontradas);
  setEmpresaParaSelecionar(empresasEncontradas[0]);
  setModoSelecaoPerfil('entrada');
  setModalSelecionarEmpresa(true);
  setAcessoNaoConfigurado(false);
  setAcessoLiberado(true);
  setMounted(true);
  setCarregandoSistema(false);
  return;
}

      if (empresa) {
        await carregarEmpresaSelecionada(empresa);
      }
     } catch (e) {
       console.error('Erro ao carregar pagina ja logada; voltando ao login:', e);
       // Falha de carregamento em pagina ja logada -> SEMPRE login, nunca cadastro/onboarding.
       setAcessoNaoConfigurado(false);
       setAcessoLiberado(false);
       setModalSelecionarEmpresa(false);
       setModoRedefinirSenha(false);
       setEmailConfirmado(false);
       setEmpresaId(null);
       setNomeEmpresaAtual('');
       setPerfilUsuario(null);
       setModoAuth('login');
       setMostrarLandingPreLogin(false);
       setAuthErro('Nao foi possivel carregar seus dados. Faca login novamente.');
       setMounted(true);
       setCarregandoSistema(false);
       return;
     }
    }

    const mesAtual = meses[new Date().getMonth()];
    setMesResumoDash(mesAtual);
    setMesFaturamento(mesAtual);

    setMounted(true);
    setCarregandoSistema(false);
  };

  carregarConfiguracoesIniciais();
}, []);

  // 2. Carrega Dados Financeiros do Ano
  // 2. Carrega Dados Financeiros do Ano pelo Supabase
useEffect(() => {
  if (!mounted || !empresaId) return;

  const carregarDadosFinanceiros = async () => {
    const ano = Number(anoSelecionado);

    // Mantém a receita consolidada do Vendas Mobile atualizada a cada acesso
    // ao perfil, sem bloquear o restante do carregamento caso o módulo não exista.
    await supabase.rpc('atualizar_receita_vendas_mobile_gestao_rpc', { p_empresa_id: empresaId });
    await garantirFixasDoMesAtual(empresaId);
    const lancamentosBanco = await buscarLancamentos(empresaId, ano);
    const caixinhaBanco = await buscarCaixinhaMovimentos(empresaId, ano);
    const faturamentosBanco = await buscarFaturamentos(empresaId, ano);
    const faturamentosEntradasBanco = await buscarFaturamentosEntradas(
      empresaId,
      ano
    );

    setLancamentos(
      lancamentosBanco.map((l: RegistroSupabase) => ({
        id: String(l.id),
        mes: textoRegistro(l.mes),
        dia: Number(l.dia),
        despesa: formatarNomeCategoria(textoRegistro(l.despesa_nome)),
        descricao: textoRegistro(l.descricao),
        valor: Number(l.valor),
        status: l.status ? textoRegistro(l.status) : null,
        tipo: l.tipo_obs ? textoRegistro(l.tipo_obs) : null,
        recorrenciaId: l.recorrencia_id ? textoRegistro(l.recorrencia_id) : null,
        notaArquivoPath: l.nota_arquivo_path ? textoRegistro(l.nota_arquivo_path) : null,
      }))
    );

    setCaixinhaMovimentos(
      caixinhaBanco.map((mov: RegistroSupabase) => ({
        id: String(mov.id),
        lancamentoId: mov.lancamento_id ? textoRegistro(mov.lancamento_id) : null,
        tipo: (textoRegistro(mov.tipo) || 'aporte') as CaixinhaMovimento['tipo'],
        descricao: textoRegistro(mov.descricao),
        valor: Number(mov.valor || 0),
        dataMovimento: textoRegistro(mov.data_movimento),
        criadoEm: textoRegistro(mov.criado_em),
      }))
    );
        setFaturamentosEntradas(
      faturamentosEntradasBanco.map((entrada: RegistroSupabase) => ({
        id: String(entrada.id),
        mes: textoRegistro(entrada.mes),
        dia: Number(entrada.dia),
        origem: textoRegistro(entrada.origem),
        valor: Number(entrada.valor),
        status: entrada.status ? textoRegistro(entrada.status) : null,
        tipo: entrada.tipo_obs ? textoRegistro(entrada.tipo_obs) : null,
        etiquetaOrigem: entrada.origem_etiqueta ? textoRegistro(entrada.origem_etiqueta) : null,
      }))
    );

    const faturamentosFormatados: Record<string, number> = {};

    faturamentosBanco.forEach((f: RegistroSupabase) => {
      faturamentosFormatados[textoRegistro(f.mes)] = Number(f.valor);
      
    });

    setFaturamentos(faturamentosFormatados);
  };

  carregarDadosFinanceiros().finally(() => setCarregandoPerfil(false));
}, [anoSelecionado, mounted, empresaId]);

useEffect(() => {
  if (!mounted || !empresaId || empresasDoUsuario.length === 0) {
    setResumoPerfisDashboard([]);
    return;
  }

  let cancelado = false;

  const carregarResumoPerfis = async () => {
    const ano = Number(anoSelecionado);
    const ids = Array.from(new Set(empresasDoUsuario.map((empresa) => String(empresa.id || '')).filter(Boolean)));

    if (ids.length === 0) {
      if (!cancelado) setResumoPerfisDashboard([]);
      return;
    }

    const [faturamentosResp, lancamentosResp] = await Promise.all([
      supabase
        .from('faturamentos')
        .select('empresa_id, mes, ano, valor')
        .in('empresa_id', ids)
        .in('ano', [ano - 1, ano]),
      supabase
        .from('lancamentos')
        .select('empresa_id, mes, ano, dia, valor, status')
        .in('empresa_id', ids)
        .in('ano', [ano - 1, ano]),
    ]);

    if (cancelado) return;

    if (faturamentosResp.error || lancamentosResp.error) {
      console.error('Erro ao carregar resumo dos perfis:', faturamentosResp.error || lancamentosResp.error);
      setResumoPerfisDashboard([]);
      return;
    }

    const mesResumo = mesAtivo || mesResumoDash;
    const indiceMesResumo = meses.indexOf(mesResumo);
    const receitasPorPerfil = new Map<string, number>();
    const despesasPorPerfil = new Map<string, number>();
    const receitasHistorico = new Map<string, number>();
    const despesasHistorico = new Map<string, number>();
    const mesesHistorico = Array.from({ length: 6 }, (_, offset) => {
      const data = new Date(ano, Math.max(0, indiceMesResumo), 1);
      data.setMonth(data.getMonth() - (5 - offset));
      return {
        mes: meses[data.getMonth()],
        ano: data.getFullYear(),
      };
    });
    const chaveHistorico = (id: string, anoItem: number, mesItem: string) => `${id}:${anoItem}:${mesItem}`;

    (faturamentosResp.data || []).forEach((item: RegistroSupabase) => {
      const mesItem = textoRegistro(item.mes);
      const anoItem = Number(item.ano || ano);
      const id = textoRegistro(item.empresa_id);
      const valor = Number(item.valor || 0);
      if (anoItem === ano && mesItem === mesResumo) {
        receitasPorPerfil.set(id, (receitasPorPerfil.get(id) || 0) + valor);
      }
      receitasHistorico.set(chaveHistorico(id, anoItem, mesItem), (receitasHistorico.get(chaveHistorico(id, anoItem, mesItem)) || 0) + valor);
    });

    (lancamentosResp.data || []).forEach((item: RegistroSupabase) => {
      if (textoRegistro(item.status) === 'cancelada') return;
      const mesItem = textoRegistro(item.mes);
      const anoItem = Number(item.ano || ano);
      const dia = Number(item.dia || 1);
      const indiceMesItem = meses.indexOf(mesItem);
      if (indiceMesItem >= 0 && dataFutura(anoItem, indiceMesItem, dia)) return;
      const id = textoRegistro(item.empresa_id);
      const valor = Number(item.valor || 0);
      if (anoItem === ano && mesItem === mesResumo) {
        despesasPorPerfil.set(id, (despesasPorPerfil.get(id) || 0) + valor);
      }
      despesasHistorico.set(chaveHistorico(id, anoItem, mesItem), (despesasHistorico.get(chaveHistorico(id, anoItem, mesItem)) || 0) + valor);
    });

    const resumo = empresasDoUsuario.map((empresa) => {
      const id = String(empresa.id || '');
      const receitas = receitasPorPerfil.get(id) || 0;
      const despesas = despesasPorPerfil.get(id) || 0;
      return {
        id,
        nome: String(empresa.nome || empresa.empresa_nome || 'Perfil'),
        tipoPerfil: empresa.tipo_perfil ? String(empresa.tipo_perfil) : undefined,
        receitas,
        despesas,
        resultado: receitas - despesas,
        historicoMensal: mesesHistorico.map((item) => ({
          ...item,
          receitas: receitasHistorico.get(chaveHistorico(id, item.ano, item.mes)) || 0,
          despesas: despesasHistorico.get(chaveHistorico(id, item.ano, item.mes)) || 0,
        })),
      };
    });

    setResumoPerfisDashboard(resumo);
  };

  carregarResumoPerfis();

  return () => {
    cancelado = true;
  };
}, [anoSelecionado, mounted, empresaId, empresasDoUsuario, mesAtivo, mesResumoDash]);

  // 3. Salva Configurações Globais no Supabase
useEffect(() => {
  if (!mounted || !empresaId || !configuracoesCarregadas) return;

  if (!podeAcessarAjustes) {
    const timerStatus = window.setTimeout(() => setStatusConfig('idle'), 0);
    return () => window.clearTimeout(timerStatus);
  }

  const timerInicial = window.setTimeout(() => {
    setStatusConfig('saving');
  }, 0);

  let ativo = true;

  const salvarConfiguracoes = async () => {
    window.clearTimeout(timerInicial);
    if (ativo) setStatusConfig('saving');

    const resultado = await salvarConfiguracoesBanco({
  empresaId,
  corPrimaria,
  darkMode: false,
  duplicadosAtivo,
  logoUrl,
  logoSettings,
});

    if (!ativo) return;

    if (resultado) {
  setStatusConfig('saved');

  
  setTimeout(() => {
    if (ativo) setStatusConfig('idle');
  }, 2200);
} else {
  setStatusConfig('error');
}
  };

  const timer = setTimeout(() => {
    salvarConfiguracoes();
  }, 500);

  return () => {
    ativo = false;
    window.clearTimeout(timerInicial);
    clearTimeout(timer);
  };
}, [
  corPrimaria,
  duplicadosAtivo,
  logoUrl,
  logoSettings,
  mounted,
  empresaId,
  configuracoesCarregadas,
]);

  
const limparTimerAjustes = () => {
  if (ajustesAutoFecharTimerRef.current) {
    clearTimeout(ajustesAutoFecharTimerRef.current);
    ajustesAutoFecharTimerRef.current = null;
  }
};

const reiniciarTimerAjustes = () => {
  limparTimerAjustes();
  ajustesAutoFecharTimerRef.current = setTimeout(() => {
    setAjustesAberto(false);
    setMenuAjuste(null);
  }, 10000);
};

// 5. Auto-fechar o Menu de Ajustes após 10 segundos sem interação
  useEffect(() => {
    if (!ajustesAberto) {
      limparTimerAjustes();
      const timerMenu = window.setTimeout(() => setMenuAjuste(null), 0);
      return () => {
        window.clearTimeout(timerMenu);
        limparTimerAjustes();
      };
    }

    reiniciarTimerAjustes();

    return limparTimerAjustes;
  }, [ajustesAberto]);

  useEffect(() => {
    if (!menuAjuste || !painelAjustesRef.current) return;

    const painel = painelAjustesRef.current;
    const frame = window.requestAnimationFrame(() => {
      const submenu = painel.querySelector<HTMLElement>(`[data-ajustes-submenu="${menuAjuste}"]`);
      if (!submenu) return;

      const painelRect = painel.getBoundingClientRect();
      const submenuRect = submenu.getBoundingClientRect();
      const centroSubmenu = submenuRect.top - painelRect.top + painel.scrollTop + submenuRect.height / 2;
      const destino = Math.max(0, centroSubmenu - painel.clientHeight / 2);

      painel.scrollTo({ top: destino, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [menuAjuste]);

  const alternarMenuAjuste = (qual: 'visual' | 'config', e: React.MouseEvent<HTMLButtonElement>) => {
    if (menuAjuste === qual) { setMenuAjuste(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAjusteRect({ top: r.bottom + 6, left: r.left });
    setMenuAjuste(qual);
  };

  useEffect(() => {
  if (!modalUsuarios) return;
  if (!empresaId) return;
  if (!podeGerenciarUsuarios) return;

  carregarUsuariosEmpresa();
}, [modalUsuarios, empresaId, podeGerenciarUsuarios]);

useEffect(() => {
  if (!mounted || !acessoLiberado) return;

  const timerReset = window.setTimeout(() => {
    setBuscaLancamento('');
    setBuscaEntradaFaturamento('');
    setLancamentoEditandoId(null);

    setEntradaFaturamentoDia('');
    setEntradaFaturamentoOrigem('');
    setEntradaFaturamentoValor('');
    setEntradaFaturamentoValorNumerico(0);
    setInputFaturamento('');
    setValorReceitaDashboardConfirmacao(0);

    setEntradaFaturamentoEditandoId(null);
    setEditEntradaFaturamentoDia('');
    setEditEntradaFaturamentoOrigem('');
    setEditEntradaFaturamentoValor('');
    setEditEntradaFaturamentoValorNumerico(0);

    setEditDia('');
    setEditDespesa('');
    setEditDescricao('');
    setEditValor('');
    setEditValorNumerico(0);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, 0);

  return () => window.clearTimeout(timerReset);
}, [abaAtiva, mesAtivo, mounted, acessoLiberado]);

useEffect(() => {
  if (mesAtivo) setBlocoAtivo('despesa');
}, [mesAtivo]);

useEffect(() => {
  if (segundosReenvioTelefoneObrigatorio <= 0) return;

  const timer = window.setTimeout(() => {
    setSegundosReenvioTelefoneObrigatorio((segundos) =>
      Math.max(segundos - 1, 0)
    );
  }, 1000);

  return () => {
    window.clearTimeout(timer);
  };
}, [segundosReenvioTelefoneObrigatorio]);

useEffect(() => {
  if (segundosReenvioSms <= 0) return;

  const timer = window.setTimeout(() => {
    setSegundosReenvioSms((segundos) => Math.max(segundos - 1, 0));
  }, 1000);

  return () => {
    window.clearTimeout(timer);
  };
}, [segundosReenvioSms]);

useEffect(() => {
  if (segundosReenvioRedefinirSenha <= 0) return;

  const timer = window.setTimeout(() => {
    setSegundosReenvioRedefinirSenha((segundos) =>
      Math.max(segundos - 1, 0)
    );
  }, 1000);

  return () => {
    window.clearTimeout(timer);
  };
}, [segundosReenvioRedefinirSenha]);

useEffect(() => {
  if (segundosReenvioTelefoneObrigatorio <= 0) return;

  const timer = window.setTimeout(() => {
    setSegundosReenvioTelefoneObrigatorio((segundos) =>
      Math.max(segundos - 1, 0)
    );
  }, 1000);

  return () => {
    window.clearTimeout(timer);
  };
}, [segundosReenvioTelefoneObrigatorio]);

useEffect(() => {
  if (!mounted || !acessoLiberado || validacaoTelefoneObrigatoria) return;

  const registrarAtividade = () => {
    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
  };

  const encerrarPorInatividade = async () => {
    await supabase.auth.signOut({ scope: 'local' });

    localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);

    setAcessoLiberado(false);
    setPerfilUsuario(null);
    setEmpresaId(null);
    setAcessoNaoConfigurado(false);
    setModoRedefinirSenha(false);
    setModoAuth('login');

    setLoginEmail('');
    setLoginSenha('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setAuthErro('');
    setAuthMensagem('Sessão encerrada por inatividade. Faça login novamente.');

    window.location.href = window.location.origin + window.location.pathname;
  };

  const verificarInatividade = () => {
    const ultimaAtividade = Number(
      localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE) || Date.now()
    );

    const tempoSemAtividade = Date.now() - ultimaAtividade;

    if (tempoSemAtividade >= TEMPO_LIMITE_INATIVIDADE) {
      encerrarPorInatividade();
    }
  };

  const eventos = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ];

  const ultimaAtividadeSalva = localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE);

  if (!ultimaAtividadeSalva) {
    registrarAtividade();
  } else {
    verificarInatividade();
  }

  eventos.forEach((evento) => {
    window.addEventListener(evento, registrarAtividade);
  });

  const intervalo = window.setInterval(verificarInatividade, 30 * 1000);

  return () => {
    eventos.forEach((evento) => {
      window.removeEventListener(evento, registrarAtividade);
    });

    window.clearInterval(intervalo);
  };
}, [mounted, acessoLiberado, validacaoTelefoneObrigatoria]);

// Tour primeiro acesso: exibe automaticamente quando ainda não foi concluído
useEffect(() => {
  if (!mounted || !acessoLiberado || validacaoTelefoneObrigatoria) return;
  const jaConcluido = localStorage.getItem('avantalab_tour_concluido');
  if (!jaConcluido) {
    const timerTour = window.setTimeout(() => setTourAberto(true), 0);
    return () => window.clearTimeout(timerTour);
  }
}, [mounted, acessoLiberado, validacaoTelefoneObrigatoria]);

  // --- CÁLCULOS E FUNÇÕES ---

  // ---- AGENDA WEB ----
  const MESES_AGENDA = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function salvarAgendaItensWeb(itens: AgendaItem[]) {
    try { localStorage.setItem('avantalab_web_agenda_itens', JSON.stringify(itens)); } catch {}
  }

  // ---- Sincronizacao da agenda com o Supabase (compartilhada com o mobile) ----
  const MESES_AGENDA_UP = MESES_AGENDA.map(m => m.toUpperCase());

  function agendaMesNome(mes: number) { return MESES_AGENDA_UP[mes] || ''; }
  function agendaMesIndex(nome: string) {
    const i = MESES_AGENDA_UP.indexOf(String(nome || '').toUpperCase());
    return i < 0 ? 0 : i;
  }

  function agendaItemFromSupabase(r: RegistroSupabase): AgendaItem {
    return {
      id: String(r.id),
      titulo: textoRegistro(r.titulo),
      descricao: textoRegistro(r.descricao),
      dia: Number(r.dia) || 1,
      mes: agendaMesIndex(textoRegistro(r.mes)),
      ano: Number(r.ano) || new Date().getFullYear(),
      repetir: !!r.repetir,
      repeticao: (textoRegistro(r.repeticao) || 'mensal') as AgendaItem['repeticao'],
      criadoEm: textoRegistro(r.criado_em) || new Date().toISOString(),
      excluirDias: Array.isArray(r.excluir_dias) ? r.excluir_dias : [],
    };
  }

  async function agendaItemToSupabaseWeb(item: AgendaItem) {
    const { data: u } = await supabase.auth.getUser();
    return {
      id: String(item.id),
      user_id: u.user?.id || null,
      empresa_id: empresaId || null,
      tipo: 'lembrete',
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      ano: String(item.ano || ''),
      mes: agendaMesNome(item.mes),
      dia: Number(item.dia) || 1,
      repetir: !!item.repetir,
      repeticao: item.repetir ? item.repeticao : '',
      excluir_dias: item.excluirDias || [],
    };
  }

  async function gravarItemAgendaSupabaseWeb(item: AgendaItem) {
    try {
      const row = await agendaItemToSupabaseWeb(item);
      if (!row.user_id) return;
      await supabase.from('agenda_itens').upsert(row, { onConflict: 'id' });
    } catch {}
  }

  async function excluirItemAgendaSupabaseWeb(id: string) {
    try {
      await supabase.from('agenda_itens').delete().eq('id', String(id));
      await supabase.from('notificacoes').delete().eq('origem_id', String(id));
    } catch {}
  }

  async function atualizarExcluirDiasSupabaseWeb(id: string, dias: string[]) {
    try {
      await supabase.from('agenda_itens').update({ excluir_dias: dias }).eq('id', String(id));
    } catch {}
  }

  async function carregarNotificacoesWeb() {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('id, titulo, corpo, lida')
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) return;
      setNotificacoesWeb(
        (data || []).map((n: RegistroSupabase) => ({
          id: String(n.id),
          titulo: textoRegistro(n.titulo),
          corpo: textoRegistro(n.corpo),
          lida: n.lida === true,
        }))
      );
    } catch {}
  }

  // Ao fechar o painel: marca as nao lidas como lidas, mas mantem o historico visivel.
  async function marcarNotificacoesLidasWeb() {
    try {
      const idsNaoLidas = notificacoesWeb.filter((n) => !n.lida).map((n) => n.id);
      if (!idsNaoLidas.length) return;
      setNotificacoesWeb((prev) => prev.map((n) => ({ ...n, lida: true })));
      await supabase.from('notificacoes').update({ lida: true }).in('id', idsNaoLidas);
    } catch {}
  }

  async function excluirNotificacaoWeb(alertaId: string) {
    if (!alertaId.startsWith('notif-')) return;
    const id = alertaId.slice('notif-'.length);
    setNotificacoesWeb((prev) => prev.filter((n) => n.id !== id));
    try { await supabase.from('notificacoes').delete().eq('id', id); } catch {}
  }

  async function limparNotificacoesWeb() {
    const ids = notificacoesWeb.map((n) => n.id);
    if (!ids.length) return;
    setNotificacoesWeb([]);
    try { await supabase.from('notificacoes').delete().in('id', ids); } catch {}
  }

  // ── Sistema de Módulos ──
  async function carregarModulos() {
    if (!empresaId) return;
    setModulosCarregando(true);
    try {
      const [catRes, ativosRes] = await Promise.all([
        supabase.from('modulos').select('id, nome, descricao, icone, perfis').eq('disponivel', true).order('ordem', { ascending: true }),
        supabase.from('empresa_modulos').select('modulo_id').eq('empresa_id', empresaId).eq('ativo', true),
      ]);
      if (!catRes.error && catRes.data) {
        setModulosCatalogo(catRes.data.map((m: RegistroSupabase) => ({
          id: String(m.id), nome: textoRegistro(m.nome), descricao: textoRegistro(m.descricao),
          icone: textoRegistro(m.icone), perfis: Array.isArray(m.perfis) ? m.perfis.map(String) : [],
        })));
      }
      if (!ativosRes.error && ativosRes.data) {
        setModulosAtivos(ativosRes.data.map((r: RegistroSupabase) => String(r.modulo_id)));
      }
    } catch {}
    setModulosCarregando(false);
  }

  async function instalarModulo(moduloId: string) {
    if (!empresaId) return;
    setModuloAcaoId(moduloId);
    try {
      if (moduloId === 'vendas_mobile') {
        const { data, error } = await supabase.rpc('ativar_modulo_vendas_mobile_rpc', {
          p_empresa_id: empresaId,
        });
        if (error) throw error;
        if (data !== true) throw new Error('A ativação do Vendas Mobile não foi confirmada.');
      } else {
        const { error } = await supabase.from('empresa_modulos').upsert(
          { empresa_id: empresaId, modulo_id: moduloId, ativo: true, origem: 'avulso', atualizado_em: new Date().toISOString() },
          { onConflict: 'empresa_id,modulo_id' }
        );
        if (error) throw error;
      }

      const { data: instalacao, error: erroConfirmacao } = await supabase
        .from('empresa_modulos')
        .select('modulo_id, ativo')
        .eq('empresa_id', empresaId)
        .eq('modulo_id', moduloId)
        .maybeSingle();
      if (erroConfirmacao) throw erroConfirmacao;
      if (!instalacao || instalacao.ativo !== true) {
        throw new Error('A instalação não foi localizada após a confirmação.');
      }

      setModulosAtivos((prev) => (prev.includes(moduloId) ? prev : [...prev, moduloId]));
      if (moduloId === 'vendas_mobile') {
        abrirAviso('Vendas Mobile ativado', 'O módulo foi instalado neste perfil e o acesso do gestor foi liberado.', undefined, 'sucesso');
      }
    } catch (error) {
      const mensagem = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Tente novamente em instantes.');
      abrirAviso('Não foi possível instalar o módulo', mensagem, undefined, 'erro');
    } finally {
      setModuloAcaoId(null);
    }
  }

  async function desinstalarModulo(moduloId: string) {
    if (!empresaId) return;
    const nomeModulo = modulosCatalogo.find((m) => m.id === moduloId)?.nome || 'este módulo';
    const avisoPonto = moduloId === 'ponto'
      ? '\n\nImportante: os funcionários do Controle de Ponto continuam conseguindo fazer login e registrar ponto normalmente, mesmo com o módulo removido daqui.'
      : '';
    abrirConfirmacao({
      titulo: `Remover ${nomeModulo}?`,
      mensagem:
        `O módulo será desativado e sairá do menu deste perfil.\n\nSeus dados NÃO são apagados: ao reinstalar, tudo volta como estava.${avisoPonto}`,
      textoConfirmar: 'Remover módulo',
      acao: async () => {
        setModuloAcaoId(moduloId);
        try {
          await supabase.from('empresa_modulos')
            .update({ ativo: false, atualizado_em: new Date().toISOString() })
            .eq('empresa_id', empresaId).eq('modulo_id', moduloId);
          setModulosAtivos((prev) => prev.filter((id) => id !== moduloId));
        } catch {}
        setModuloAcaoId(null);
      },
    });
  }

  // ── Controle de Ponto (admin) ──
  async function carregarFuncionariosPonto() {
    if (!empresaId) return;
    setPontoFuncCarregando(true);
    try {
      const principal = await supabase
        .from('ponto_funcionarios')
        .select('id, user_id, nome, login, cpf, cargo, ativo, hora_entrada, hora_saida, dias_trabalho')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });
      if (!principal.error && principal.data) {
        setPontoFuncionarios(principal.data as FuncionarioPonto[]);
      } else {
        // Compatibilidade: se a coluna cpf ainda não existir, recarrega sem ela
        // (evita lista vazia "como se os funcionários tivessem sido apagados").
        console.error('Erro ao carregar funcionários (tentando sem cpf):', principal.error);
        const fallback = await supabase
          .from('ponto_funcionarios')
          .select('id, user_id, nome, login, cargo, ativo, hora_entrada, hora_saida, dias_trabalho')
          .eq('empresa_id', empresaId)
          .order('nome', { ascending: true });
        if (!fallback.error && fallback.data) {
          const comCpf = fallback.data.map((f: Record<string, unknown>) => ({ ...f, cpf: null }));
          setPontoFuncionarios(comCpf as unknown as FuncionarioPonto[]);
        }
      }
    } catch (e) {
      console.error('Erro inesperado ao carregar funcionários de ponto:', e);
    }
    setPontoFuncCarregando(false);
  }

  function diaNaoUtilPontoNaData(iso: string, lista: PontoDiaNaoUtil[] = pontoDiasNaoUteis) {
    const md = iso.slice(5);
    return lista.some((item) => {
      if (!item.recorrente_anual) return iso >= item.data_inicio && iso <= item.data_fim;
      const inicio = item.data_inicio.slice(5);
      const fim = item.data_fim.slice(5);
      return inicio <= fim ? md >= inicio && md <= fim : md >= inicio || md <= fim;
    });
  }

  async function carregarDiasNaoUteisPonto() {
    if (!empresaId) return [];
    setPontoDiasNaoUteisCarregando(true);
    try {
      const { data, error } = await supabase
        .from('ponto_dias_nao_uteis')
        .select('id, empresa_id, data_inicio, data_fim, tipo, descricao, recorrente_anual, criado_em')
        .eq('empresa_id', empresaId)
        .order('data_inicio', { ascending: false });
      if (error) {
        console.error('carregarDiasNaoUteisPonto', error);
        return pontoDiasNaoUteis;
      }
      const lista = (data || []) as PontoDiaNaoUtil[];
      setPontoDiasNaoUteis(lista);
      return lista;
    } catch (error) {
      console.error('Erro inesperado ao carregar dias não úteis do ponto:', error);
      return pontoDiasNaoUteis;
    } finally {
      setPontoDiasNaoUteisCarregando(false);
    }
  }

  async function carregarResumoPontoDashboard() {
    if (!empresaId || !podeGerenciarPonto) return;
    try {
      const agora = new Date();
      const dataPartes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(agora);
      const horaPartes = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(agora);
      const parteHora = (tipo: string) => Number(horaPartes.find((p) => p.type === tipo)?.value || 0);
      const minutosAgora = parteHora('hour') * 60 + parteHora('minute');
      const [ano, mes, dia] = dataPartes.split('-').map(Number);
      const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
      const minutosHorario = (valor: string | null) => {
        const match = String(valor || '').match(/^(\d{1,2}):(\d{2})/);
        return match ? Number(match[1]) * 60 + Number(match[2]) : null;
      };

      const [funcionariosResp, registrosResp, diasNaoUteisResp] = await Promise.all([
        supabase
          .from('ponto_funcionarios')
          .select('user_id, nome, hora_entrada, hora_saida, dias_trabalho')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
        supabase
          .from('ponto_registros')
          .select('user_id, tipo, registrado_em')
          .eq('empresa_id', empresaId)
          .eq('dia', dataPartes)
          .order('registrado_em', { ascending: true }),
        supabase
          .from('ponto_dias_nao_uteis')
          .select('id, empresa_id, data_inicio, data_fim, tipo, descricao, recorrente_anual, criado_em')
          .eq('empresa_id', empresaId),
      ]);
      if (funcionariosResp.error || registrosResp.error) return;
      const diasNaoUteis = diasNaoUteisResp.error ? pontoDiasNaoUteis : (diasNaoUteisResp.data || []) as PontoDiaNaoUtil[];
      if (!diasNaoUteisResp.error) setPontoDiasNaoUteis(diasNaoUteis);
      if (diaNaoUtilPontoNaData(dataPartes, diasNaoUteis)) {
        setPontoFuncionariosHoje(0);
        setPontoResumoDia([]);
        return;
      }

      const registrosPorUsuario = new Map<string, Array<{ tipo: string; registrado_em: string }>>();
      (registrosResp.data || []).forEach((registro) => {
        const lista = registrosPorUsuario.get(registro.user_id) || [];
        lista.push(registro);
        registrosPorUsuario.set(registro.user_id, lista);
      });

      type ItemResumoPonto = { userId: string; nome: string; status: 'atraso' | 'falta' | 'incompleto'; falhas?: string[] };
      const tiposObrigatorios = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'];
      const rotulosFalha: Record<string, string> = {
        entrada: 'Entrada',
        saida_refeicao: 'Saída almoço',
        retorno_refeicao: 'Retorno almoço',
        saida: 'Saída',
      };
      const resumo = (funcionariosResp.data || []).reduce<ItemResumoPonto[]>((itens, funcionario) => {
        const temEscalaFixa = Array.isArray(funcionario.dias_trabalho) && funcionario.dias_trabalho.length > 0;
        if (!funcionario.user_id || !temEscalaFixa || !funcionario.dias_trabalho.includes(diaSemana)) return itens;
        const entradaPrevista = minutosHorario(funcionario.hora_entrada);
        const saidaPrevista = minutosHorario(funcionario.hora_saida);
        const registros = registrosPorUsuario.get(funcionario.user_id) || [];
        const tipos = new Set(registros.map((registro) => registro.tipo));

        if (saidaPrevista !== null && minutosAgora > saidaPrevista + 10) {
          if (registros.length === 0) {
            itens.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'falta' });
            return itens;
          }
          const falhas = tiposObrigatorios
            .filter((tipo) => !tipos.has(tipo))
            .map((tipo) => rotulosFalha[tipo]);
          if (falhas.length > 0) {
            itens.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'incompleto', falhas });
            return itens;
          }
        }

        const entrada = registros.find((registro) => registro.tipo === 'entrada');
        if (entradaPrevista !== null) {
          if (!entrada && minutosAgora > entradaPrevista + 10) {
            itens.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'atraso' });
            return itens;
          }
          if (entrada) {
            const entradaPartes = new Intl.DateTimeFormat('pt-BR', {
              timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
            }).formatToParts(new Date(entrada.registrado_em));
            const horaEntrada = Number(entradaPartes.find((p) => p.type === 'hour')?.value || 0) * 60
              + Number(entradaPartes.find((p) => p.type === 'minute')?.value || 0);
            if (horaEntrada > entradaPrevista + 10) {
              itens.push({ userId: funcionario.user_id, nome: funcionario.nome, status: 'atraso' });
              return itens;
            }
          }
        }
        return itens;
      }, []);
      setPontoFuncionariosHoje((funcionariosResp.data || []).filter((funcionario) => (
        funcionario.user_id
        && Array.isArray(funcionario.dias_trabalho)
        && funcionario.dias_trabalho.length > 0
        && funcionario.dias_trabalho.includes(diaSemana)
      )).length);
      setPontoResumoDia(resumo);
    } catch (error) {
      console.error('Erro ao carregar resumo diário do ponto:', error);
    } finally {
      setPontoResumoCarregando(false);
    }
  }

  async function criarFuncionarioPonto(dados: { nome: string; cpf: string; senha: string; cargo: string; horaEntrada?: string; horaSaida?: string; diasTrabalho?: number[] }) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) return { erro: true, mensagem: 'Sessão não encontrada. Faça login novamente.' };
      const resp = await fetch('/api/criar-funcionario-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId, ...dados }),
      });
      const r = await resp.json();
      if (!resp.ok || r.erro) return { erro: true, mensagem: r.mensagem || 'Não foi possível cadastrar.' };
      await carregarFuncionariosPonto();
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao cadastrar funcionário.' };
    }
  }

  async function carregarPontoConfig() {
    if (!empresaId) return;
    try {
      const { data, error } = await supabase
        .from('ponto_config')
        .select('latitude, longitude, raio_m')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      if (!error) {
        const raioConfig = Math.min(10000, Math.max(1, Number(data?.raio_m ?? 100) || 100));
        setPontoConfig(data ? { latitude: data.latitude, longitude: data.longitude, raio_m: raioConfig } : { latitude: null, longitude: null, raio_m: 100 });
      }
    } catch {}
  }

  async function salvarPontoConfig(dados: { latitude: number; longitude: number; raio_m: number }) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const raioConfig = Math.min(10000, Math.max(1, Number(dados.raio_m) || 100));
      const { error } = await supabase
        .from('ponto_config')
        .upsert({ empresa_id: empresaId, latitude: dados.latitude, longitude: dados.longitude, raio_m: raioConfig, atualizado_em: new Date().toISOString() }, { onConflict: 'empresa_id' });
      if (error) { console.error('salvarPontoConfig', error); return { erro: true, mensagem: 'Não foi possível salvar o local.' }; }
      setPontoConfig({ latitude: dados.latitude, longitude: dados.longitude, raio_m: raioConfig });
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao salvar o local da empresa.' };
    }
  }

  async function criarDiaNaoUtilPonto(dados: { dataInicio: string; dataFim: string; tipo: string; descricao: string; recorrenteAnual: boolean }) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const { error } = await supabase
        .from('ponto_dias_nao_uteis')
        .insert({
          empresa_id: empresaId,
          data_inicio: dados.dataInicio,
          data_fim: dados.dataFim,
          tipo: dados.tipo,
          descricao: dados.descricao || null,
          recorrente_anual: dados.recorrenteAnual,
        });
      if (error) {
        console.error('criarDiaNaoUtilPonto', error);
        return { erro: true, mensagem: 'Não foi possível salvar o dia não útil.' };
      }
      await carregarDiasNaoUteisPonto();
      carregarResumoPontoDashboard();
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao salvar o dia não útil.' };
    }
  }

  async function excluirDiaNaoUtilPonto(id: string) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const { error } = await supabase
        .from('ponto_dias_nao_uteis')
        .delete()
        .eq('empresa_id', empresaId)
        .eq('id', id);
      if (error) {
        console.error('excluirDiaNaoUtilPonto', error);
        return { erro: true, mensagem: 'Não foi possível remover o dia.' };
      }
      await carregarDiasNaoUteisPonto();
      carregarResumoPontoDashboard();
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao remover o dia.' };
    }
  }

  async function carregarRegistrosPonto(funcionarioUserId: string, dataInicioISO: string) {
    if (!empresaId || !funcionarioUserId) return [];
    try {
      const { data, error } = await supabase
        .from('ponto_registros')
        .select('tipo, registrado_em, dia, distancia_m, latitude, longitude')
        .eq('empresa_id', empresaId)
        .eq('user_id', funcionarioUserId)
        .gte('dia', dataInicioISO)
        .order('registrado_em', { ascending: true });
      if (error) { console.error('carregarRegistrosPonto', error); return []; }
      return data || [];
    } catch {
      return [];
    }
  }

  async function carregarAuditoriaPonto(): Promise<EventoAuditoriaPonto[]> {
    if (!empresaId) return [];
    try {
      const { data, error } = await supabase
        .from('ponto_auditoria')
        .select('id, funcionario_user_id, ator_user_id, evento, origem, motivo, dados, ocorrido_em')
        .eq('empresa_id', empresaId)
        .order('ocorrido_em', { ascending: false })
        .limit(100);
      if (error) { console.error('carregarAuditoriaPonto', error); return []; }
      return (data || []) as EventoAuditoriaPonto[];
    } catch { return []; }
  }

  async function baixarAfdPonto(inicio: string, fim: string): Promise<{ erro: boolean; mensagem?: string }> {
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return { erro: true, mensagem: 'Sessão não encontrada.' };
      const resposta = await fetch(`/api/admin-rep-p-afd?empresaId=${encodeURIComponent(empresaId)}&inicio=${inicio}&fim=${fim}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resposta.ok) { const dados = await resposta.json().catch(() => null); return { erro: true, mensagem: dados?.mensagem || 'Não foi possível gerar o AFD.' }; }
      const arquivo = await resposta.blob(); const url = URL.createObjectURL(arquivo); const link = document.createElement('a'); link.href = url; link.download = `AFD-${inicio}-${fim}.zip`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      return { erro: false };
    } catch { return { erro: true, mensagem: 'Não foi possível gerar o AFD.' }; }
  }

  async function carregarDocumentosRepP(): Promise<DocumentoRepP[]> {
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return [];
      const resposta = await fetch(`/api/ponto/documentos-rep-p?empresaId=${encodeURIComponent(empresaId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json().catch(() => null);
      return resposta.ok && !dados?.erro ? (dados?.documentos || []) as DocumentoRepP[] : [];
    } catch { return []; }
  }

  async function baixarDocumentoRepP(documento: DocumentoRepP): Promise<{ erro: boolean; mensagem?: string }> {
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return { erro: true, mensagem: 'Sessão não encontrada.' };
      const resposta = await fetch(`/api/ponto/documentos-rep-p?empresaId=${encodeURIComponent(empresaId)}&documentoId=${encodeURIComponent(documento.id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resposta.ok) { const dados = await resposta.json().catch(() => null); return { erro: true, mensagem: dados?.mensagem || 'Não foi possível baixar o documento.' }; }
      const arquivo = await resposta.blob(); const url = URL.createObjectURL(arquivo); const link = document.createElement('a'); link.href = url; link.download = documento.arquivo_nome; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      return { erro: false };
    } catch { return { erro: true, mensagem: 'Não foi possível baixar o documento.' }; }
  }

  async function prepararManualRepP(): Promise<{ erro: boolean; mensagem?: string }> {
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token || !empresaId) return { erro: true, mensagem: 'Sessão não encontrada.' };
      const resposta = await fetch(`/api/ponto/documentos-rep-p/manual?empresaId=${encodeURIComponent(empresaId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json().catch(() => null);
      return resposta.ok && !dados?.erro ? { erro: false } : { erro: true, mensagem: dados?.mensagem || 'Não foi possível preparar o manual.' };
    } catch { return { erro: true, mensagem: 'Não foi possível preparar o manual.' }; }
  }

  async function gerarEspelhoPonto(funcionarioId: string, inicio: string, fim: string): Promise<{ erro: boolean; mensagem?: string }> {
    try { const { data: sessao } = await supabase.auth.getSession(); const token = sessao.session?.access_token; if (!token || !empresaId) return { erro: true, mensagem: 'Sessão não encontrada.' }; const resposta = await fetch(`/api/ponto/documentos-rep-p/espelho?empresaId=${encodeURIComponent(empresaId)}&funcionarioId=${encodeURIComponent(funcionarioId)}&inicio=${inicio}&fim=${fim}`, { headers: { Authorization: `Bearer ${token}` } }); if (!resposta.ok) { const dados = await resposta.json().catch(() => null); return { erro: true, mensagem: dados?.mensagem || 'Não foi possível gerar o Espelho.' }; } const arquivo = await resposta.blob(); const url = URL.createObjectURL(arquivo); const link = document.createElement('a'); link.href = url; link.download = `espelho-ponto-${inicio}-${fim}.pdf`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); return { erro: false }; } catch { return { erro: true, mensagem: 'Não foi possível gerar o Espelho.' }; }
  }

  async function carregarAssinaturaPonto(): Promise<EstadoAssinaturaPonto | null> {
    if (!empresaId) return null;
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) return null;
      const resposta = await fetch(`/api/ponto/assinatura?empresaId=${encodeURIComponent(empresaId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json();
      return resposta.ok && !dados.erro ? dados.assinatura as EstadoAssinaturaPonto : null;
    } catch { return null; }
  }

  async function atualizarFuncionarioPonto(funcionarioUserId: string, dados: { nome: string; cargo: string; cpf?: string; horaEntrada?: string; horaSaida?: string; ativo: boolean; diasTrabalho?: number[] }) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) return { erro: true, mensagem: 'Sessão não encontrada. Faça login novamente.' };
      const resp = await fetch('/api/atualizar-funcionario-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId, funcionarioUserId, ...dados }),
      });
      const r = await resp.json();
      if (!resp.ok || r.erro) return { erro: true, mensagem: r.mensagem || 'Não foi possível salvar.' };
      await carregarFuncionariosPonto();
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao salvar o funcionário.' };
    }
  }

  async function redefinirSenhaPonto(funcionarioUserId: string, novaSenha: string) {
    if (!empresaId) return { erro: true, mensagem: 'Perfil não identificado.' };
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) return { erro: true, mensagem: 'Sessão não encontrada. Faça login novamente.' };
      const resp = await fetch('/api/redefinir-senha-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId, funcionarioUserId, novaSenha }),
      });
      const r = await resp.json();
      if (!resp.ok || r.erro) return { erro: true, mensagem: r.mensagem || 'Não foi possível alterar a senha.' };
      return { erro: false };
    } catch {
      return { erro: true, mensagem: 'Erro ao alterar a senha.' };
    }
  }

  async function sincronizarAgendaSupabaseWeb() {
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) return;
      const { data, error } = await supabase.from('agenda_itens').select('*').eq('user_id', userId);
      if (error) return;
      const remotos = (data || []).map(agendaItemFromSupabase);
      const idsRemotos = new Set(remotos.map(r => String(r.id)));
      let migrada = false;
      try { migrada = localStorage.getItem('avantalab_web_agenda_migrada') === '1'; } catch {}
      setAgendaItens(prev => {
        const locais = prev || [];
        const soLocais = locais.filter(l => !idsRemotos.has(String(l.id)));
        if (!migrada) {
          // Primeira sincronizacao: envia ao servidor os itens que so
          // existem neste aparelho e marca como migrado.
          const combinados = [...remotos, ...soLocais];
          setTimeout(() => {
            salvarAgendaItensWeb(combinados);
            soLocais.forEach(l => { gravarItemAgendaSupabaseWeb(l); });
            try { localStorage.setItem('avantalab_web_agenda_migrada', '1'); } catch {}
          }, 0);
          return combinados;
        }
        // Depois de migrado, o servidor e a fonte da verdade: exclusoes
        // feitas em qualquer aparelho passam a refletir aqui.
        setTimeout(() => { salvarAgendaItensWeb(remotos); }, 0);
        return remotos;
      });
    } catch {}
  }

  function diasEntreDatasAgenda(inicio: Date, fim: Date) {
    const umDia = 24 * 60 * 60 * 1000;
    const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
    const b = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime();
    return Math.floor((b - a) / umDia);
  }

  function itemAgendaApareceNoDiaWeb(item: AgendaItem, ano: number, mes: number, dia: number) {
    const chaveExclusao = `${ano}-${mes}-${dia}`;
    if (item.excluirDias?.includes(chaveExclusao)) return false;
    const alvo = new Date(ano, mes, dia);
    const inicio = new Date(item.ano, item.mes, item.dia);
    const diferenca = diasEntreDatasAgenda(inicio, alvo);
    if (diferenca < 0) return false;
    if (!item.repetir) return item.ano === ano && item.mes === mes && item.dia === dia;
    if (item.repeticao === 'diaria') return true;
    if (item.repeticao === 'semanal') return diferenca % 7 === 0;
    if (item.repeticao === 'quinzenal') return diferenca % 14 === 0;
    if (item.repeticao === 'mensal') return item.dia === dia;
    if (item.repeticao === 'anual') return item.mes === mes && item.dia === dia;
    return false;
  }

  function itensAgendaDoDiaWeb(ano: number, mes: number, dia: number) {
    return agendaItens.filter(item => itemAgendaApareceNoDiaWeb(item, ano, mes, dia));
  }

  // Mantém a agenda web alinhada à mobile: despesas programadas futuras também
  // são compromissos do calendário, sem misturá-las aos lembretes manuais.
  function despesasFuturasDoDiaWeb(ano: number, mes: number, dia: number) {
    const nomeMes = MESES_AGENDA_UP[mes] || '';
    return lancamentos.filter((lancamento) => {
      const tipo = String(lancamento.tipo || '');
      return (
        String(lancamento.mes || '').toUpperCase() === nomeMes &&
        Number(lancamento.dia) === Number(dia) &&
        dataFutura(ano, mes, dia) &&
        (tipo === 'previsto' || tipo === 'parcela' || tipo === 'fixa' || Boolean(lancamento.recorrenciaId))
      );
    });
  }

  function navAgenda(delta: number) {
    let novoMes = agendaMesAtivo + delta;
    let novoAno = agendaAnoAtivo;
    if (novoMes < 0) { novoMes = 11; novoAno -= 1; }
    if (novoMes > 11) { novoMes = 0; novoAno += 1; }
    setAgendaMesAtivo(novoMes);
    setAgendaAnoAtivo(novoAno);
    setAgendaDiaSelecionado(null);
    setAgendaFormAberto(false);
  }

  function adicionarItemAgenda() {
    if (!agendaDiaSelecionado || !agendaTitulo.trim()) return;
    const novoItem: AgendaItem = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      titulo: agendaTitulo.trim(),
      descricao: agendaDescricao.trim(),
      dia: agendaDiaSelecionado,
      mes: agendaMesAtivo,
      ano: agendaAnoAtivo,
      repetir: agendaRepetir,
      repeticao: agendaRepetir ? agendaRepeticao : 'mensal',
      criadoEm: new Date().toISOString(),
    };
    const novosItens = [...agendaItens, novoItem];
    setAgendaItens(novosItens);
    salvarAgendaItensWeb(novosItens);
    gravarItemAgendaSupabaseWeb(novoItem);
    setAgendaTitulo('');
    setAgendaDescricao('');
    setAgendaRepetir(false);
    setAgendaRepeticao('mensal');
    setAgendaFormAberto(false);
  }

  function excluirItemAgendaWeb(id: string) {
    const novosItens = agendaItens.filter(item => item.id !== id);
    setAgendaItens(novosItens);
    salvarAgendaItensWeb(novosItens);
    excluirItemAgendaSupabaseWeb(id);
  }

  function excluirItemAgendaDia(id: string, ano: number, mes: number, dia: number) {
    const chave = `${ano}-${mes}-${dia}`;
    let novoExcluir: string[] = [];
    const novosItens = agendaItens.map(item => {
      if (item.id !== id) return item;
      novoExcluir = [...(item.excluirDias || []), chave];
      return { ...item, excluirDias: novoExcluir };
    });
    setAgendaItens(novosItens);
    salvarAgendaItensWeb(novosItens);
    atualizarExcluirDiasSupabaseWeb(id, novoExcluir);
  }

  function rotuloRepeticaoAgendaWeb(valor: string) {
    return ({ diaria: 'Diária', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', anual: 'Anual' } as Record<string, string>)[valor] || '';
  }
  // ---- FIM AGENDA WEB ----

  const agendaHojeCount = (() => {
    const hoje = new Date();
    return itensAgendaDoDiaWeb(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).length;
  })();

  
  const mesParaAnalise = mesAtivo || mesResumoDash;
const indiceMesParaAnalise = meses.indexOf(mesParaAnalise);

const mesAnteriorParaAnalise =
  indiceMesParaAnalise > 0 ? meses[indiceMesParaAnalise - 1] : null;

const lancamentosDoMes = lancamentos.filter(l => l.mes === mesParaAnalise);

const lancamentosDoMesAnterior = mesAnteriorParaAnalise
  ? lancamentos.filter(l => l.mes === mesAnteriorParaAnalise)
  : [];

// Despesas com data futura nao entram no total realizado do mes; somam no previsto.
const totalDespesasMes = lancamentosDoMes.reduce(
  (acc, lanc) =>
    acc + (dataFutura(Number(anoSelecionado), indiceMesParaAnalise, lanc.dia) ? 0 : lanc.valor),
  0
);

const totalDespesasMesAnterior = lancamentosDoMesAnterior.reduce(
  (acc, lanc) => acc + lanc.valor,
  0
);

const percentualDespesasVsMesAnterior =
  totalDespesasMesAnterior > 0
    ? (totalDespesasMes / totalDespesasMesAnterior) * 100
    : 0;

const percentualBarraDespesas = Math.min(percentualDespesasVsMesAnterior, 100);

const corBarraDespesas =
  percentualDespesasVsMesAnterior >= 100
    ? '#ef4444'
    : percentualDespesasVsMesAnterior >= 80
      ? '#f97316'
      : percentualDespesasVsMesAnterior >= 50
        ? '#f59e0b'
        : '#22c55e';

const mostrarBarraComparativoDespesas =
  !!mesAnteriorParaAnalise && totalDespesasMesAnterior > 0;

const faturamentoDoMesAtual = faturamentos[mesParaAnalise] || 0;
const lucroOperacional = faturamentoDoMesAtual - totalDespesasMes;

const caixinhaSaldo = caixinhaMovimentos.reduce((acc, mov) => {
  const valor = Number(mov.valor || 0);
  return mov.tipo === 'resgate' ? acc - valor : acc + valor;
}, 0);
const caixinhaSaldoInicial = caixinhaMovimentos.find((mov) => mov.tipo === 'saldo_inicial')?.valor || 0;
const caixinhaMovimentosMes = caixinhaMovimentos.filter((mov) => {
  if (!mov.dataMovimento) return false;
  const [anoMov, mesMov] = mov.dataMovimento.split('-').map(Number);
  return anoMov === Number(anoSelecionado) && mesMov === indiceMesParaAnalise + 1;
});
const caixinhaAportesMes = caixinhaMovimentosMes.reduce((acc, mov) => (
  mov.tipo === 'aporte' ? acc + Number(mov.valor || 0) : acc
), 0);
const caixinhaUltimosMovimentos = [...caixinhaMovimentos]
  .sort((a, b) => String(b.dataMovimento).localeCompare(String(a.dataMovimento)) || String(b.criadoEm).localeCompare(String(a.criadoEm)))
  .slice(0, 3);

const adicionarAporteCaixinha = async ({
  dia,
  descricao,
  valorTexto,
}: {
  dia: string;
  descricao: string;
  valorTexto: string;
}): Promise<{ ok: boolean; mensagem?: string }> => {
  if (!empresaId) return { ok: false, mensagem: 'Perfil não identificado.' };
  if (!podeInserirLancamentos) return { ok: false, mensagem: 'Seu perfil não pode adicionar lançamentos.' };

  const mes = mesParaAnalise || mesAtivo || mesResumoDash;
  const indiceMes = meses.indexOf(mes);
  const diaNumerico = Number(dia);
  const limite = getMaxDias(mes, anoSelecionado);
  const valor = parseInt(String(valorTexto || '').replace(/\D/g, '') || '0', 10) / 100;
  const rotuloReserva = tipoPerfilAtualNormalizado === 'pessoal' ? 'Caixinha' : 'Reserva financeira';
  const descricaoFinal = formatarDescricao(descricao) || (tipoPerfilAtualNormalizado === 'pessoal' ? 'Aporte na caixinha' : 'Aporte na reserva financeira');

  if (indiceMes < 0 || !diaNumerico || diaNumerico < 1 || diaNumerico > limite) {
    return { ok: false, mensagem: `Informe um dia entre 1 e ${limite}.` };
  }
  if (valor <= 0) {
    return { ok: false, mensagem: 'Informe um valor válido para aportar.' };
  }

  const ano = Number(anoSelecionado);
  const dataMovimento = `${ano}-${String(indiceMes + 1).padStart(2, '0')}-${String(diaNumerico).padStart(2, '0')}`;
  const ehFuturo = dataFutura(ano, indiceMes, diaNumerico);
  const lancamento = await salvarLancamento({
    empresaId,
    ano,
    mes,
    dia: diaNumerico,
    despesaNome: rotuloReserva,
    descricao: descricaoFinal,
    valor,
    status: ehFuturo ? 'prevista' : null,
    tipoObs: ehFuturo ? 'previsto' : null,
  });

  if (lancamento.erro || !lancamento.data) {
    return { ok: false, mensagem: lancamento.mensagem || `Não foi possível salvar a despesa da ${rotuloReserva.toLowerCase()}.` };
  }

  const movimento = await salvarCaixinhaMovimento({
    empresaId,
    lancamentoId: String(lancamento.data.id),
    tipo: 'aporte',
    descricao: descricaoFinal,
    valor,
    dataMovimento,
  });

  if (movimento.erro || !movimento.data) {
    await apagarLancamento(String(lancamento.data.id));
    return { ok: false, mensagem: movimento.mensagem || 'Não foi possível salvar o aporte na caixinha.' };
  }

  setLancamentos((prev) => [{
    id: String(lancamento.data.id),
    mes: textoRegistro(lancamento.data.mes),
    dia: Number(lancamento.data.dia),
    despesa: formatarNomeCategoria(textoRegistro(lancamento.data.despesa_nome)),
    descricao: textoRegistro(lancamento.data.descricao),
    valor: Number(lancamento.data.valor || 0),
    status: lancamento.data.status ? textoRegistro(lancamento.data.status) : null,
    tipo: lancamento.data.tipo_obs ? textoRegistro(lancamento.data.tipo_obs) : null,
    recorrenciaId: lancamento.data.recorrencia_id ? textoRegistro(lancamento.data.recorrencia_id) : null,
  }, ...prev]);
  setCaixinhaMovimentos((prev) => [{
    id: String(movimento.data.id),
    lancamentoId: movimento.data.lancamento_id ? textoRegistro(movimento.data.lancamento_id) : null,
    tipo: (textoRegistro(movimento.data.tipo) || 'aporte') as CaixinhaMovimento['tipo'],
    descricao: textoRegistro(movimento.data.descricao),
    valor: Number(movimento.data.valor || 0),
    dataMovimento: textoRegistro(movimento.data.data_movimento),
    criadoEm: textoRegistro(movimento.data.criado_em),
  }, ...prev]);
  notificarFinanceiroAtualizado();

  return { ok: true };
};

const definirSaldoInicialCaixinha = async (valorTexto: string): Promise<{ ok: boolean; mensagem?: string }> => {
  if (!empresaId) return { ok: false, mensagem: 'Perfil não identificado.' };
  if (!podeInserirLancamentos) return { ok: false, mensagem: 'Seu perfil não pode alterar a caixinha.' };

  const valor = parseInt(String(valorTexto || '').replace(/\D/g, '') || '0', 10) / 100;
  if (valor < 0) return { ok: false, mensagem: 'Informe um valor válido.' };

  const resultado = await salvarSaldoInicialCaixinha({
    empresaId,
    valor,
  });

  if (resultado.erro || !resultado.data) {
    return { ok: false, mensagem: resultado.mensagem || 'Não foi possível salvar o saldo inicial.' };
  }

  const movimentoAtualizado: CaixinhaMovimento = {
    id: String(resultado.data.id),
    lancamentoId: resultado.data.lancamento_id ? textoRegistro(resultado.data.lancamento_id) : null,
    tipo: (textoRegistro(resultado.data.tipo) || 'saldo_inicial') as CaixinhaMovimento['tipo'],
    descricao: textoRegistro(resultado.data.descricao),
    valor: Number(resultado.data.valor || 0),
    dataMovimento: textoRegistro(resultado.data.data_movimento),
    criadoEm: textoRegistro(resultado.data.criado_em),
  };

  setCaixinhaMovimentos((prev) => [
    movimentoAtualizado,
    ...prev.filter((mov) => mov.tipo !== 'saldo_inicial' && mov.id !== movimentoAtualizado.id),
  ]);
  notificarFinanceiroAtualizado();

  return { ok: true };
};

// O card permanece pendente desde a data programada ate o usuario confirmar ou excluir.
const despesasAConfirmar = lancamentos.filter(
  (l) =>
    l.status === 'prevista' &&
    tipoPedeConfirmacao(l.tipo) &&
    !dataFutura(Number(anoSelecionado), meses.indexOf(l.mes), l.dia)
);

// Receitas previstas tambem permanecem pendentes ate uma acao explicita.
const receitasAConfirmar = faturamentosEntradas.filter(
  (e) =>
    e.status === 'prevista' &&
    !dataFutura(Number(anoSelecionado), meses.indexOf(e.mes), e.dia)
);

// Card de saldo (Inicial/Final/Previsto) com seletor proprio de mes.
const mesSaldoCardNome = meses[saldoCardMesIdx];
const mesSaldoAntNome = saldoCardMesIdx > 0 ? meses[saldoCardMesIdx - 1] : null;
const somaDespesasMesSaldo = (mesNome: string, mIdx: number, futuras: boolean) =>
  lancamentos
    .filter((l) => l.mes === mesNome)
    .reduce(
      (acc, l) =>
        acc + (dataFutura(Number(anoSelecionado), mIdx, l.dia) === futuras ? l.valor : 0),
      0
    );
// Receitas previstas: nao entram no total efetivado ate a confirmacao.
// noDiaOuFuturo (hoje ou futuro) = alimentam o Previsto; passadas = lazy auto-confirm (viram efetivadas na exibicao).
const somaReceitasPrevistasMes = (mesNome: string, mIdx: number, futurasOuHoje: boolean) =>
  faturamentosEntradas
    .filter((e) => e.mes === mesNome && e.status === 'prevista')
    .reduce((acc, e) => {
      const noDiaOuFuturo =
        dataFutura(Number(anoSelecionado), mIdx, e.dia) ||
        ehDataHoje(Number(anoSelecionado), mIdx, e.dia);
      return acc + (noDiaOuFuturo === futurasOuHoje ? e.valor : 0);
    }, 0);

const recPrevPassadasSaldo = somaReceitasPrevistasMes(mesSaldoCardNome, saldoCardMesIdx, false);
const recPrevFuturasSaldo = somaReceitasPrevistasMes(mesSaldoCardNome, saldoCardMesIdx, true);
// Receitas efetivadas = total do mes + previstas cuja data ja passou (auto-confirmadas na exibicao).
const recSaldoCard = (faturamentos[mesSaldoCardNome] || 0) + recPrevPassadasSaldo;
const despRealSaldoCard = somaDespesasMesSaldo(mesSaldoCardNome, saldoCardMesIdx, false);
const despFutSaldoCard = somaDespesasMesSaldo(mesSaldoCardNome, saldoCardMesIdx, true);
// Saldo inicial = resultado do mes anterior (entra como saldo de abertura do mes atual).
const saldoInicialCard = mesSaldoAntNome
  ? (faturamentos[mesSaldoAntNome] || 0) +
    somaReceitasPrevistasMes(mesSaldoAntNome, saldoCardMesIdx - 1, false) -
    somaDespesasMesSaldo(mesSaldoAntNome, saldoCardMesIdx - 1, false)
  : 0;
// Final = Inicial + Receitas efetivadas - Despesas realizadas.
const saldoFinalCard = saldoInicialCard + recSaldoCard - despRealSaldoCard;
// Previsto = Final + Receitas previstas (hoje/futuras) - Despesas futuras do mes.
const saldoPrevistoCard = saldoFinalCard + recPrevFuturasSaldo - despFutSaldoCard;
  const lancamentosOrdenados = useMemo(() => {
  return [...lancamentos].sort((a, b) => {
    const diaA = Number(a.dia);
    const diaB = Number(b.dia);

    if (ordemLancamentos === 'desc') {
      return diaB - diaA;
    }

    return diaA - diaB;
  });
}, [lancamentos, ordemLancamentos]);

const lancamentosFiltradosDoMes = useMemo(() => {
  const termo = normalizarTexto(buscaLancamento.trim());

  const listaDoMes = lancamentosOrdenados.filter((l) => l.mes === mesAtivo);

  if (!termo) return listaDoMes;

  return listaDoMes.filter((l) => {
    const textoBusca = normalizarTexto(
      [
        l.dia,
        l.despesa,
        l.descricao,
        formatarMoeda(Number(l.valor)),
        String(Number(l.valor).toFixed(2)).replace('.', ','),
      ].join(' ')
    );

    return textoBusca.includes(termo);
  });
}, [buscaLancamento, lancamentosOrdenados, mesAtivo]);

const entradasFaturamentoOrdenadasDoMes = useMemo(() => {
  if (!mesAtivo) return [];

  return faturamentosEntradas
    .filter((entrada) => entrada.mes === mesAtivo)
    .sort((a, b) => {
      const diaA = Number(a.dia);
      const diaB = Number(b.dia);

      if (ordemEntradasFaturamento === 'desc') {
        return diaB - diaA;
      }

      return diaA - diaB;
    });
}, [faturamentosEntradas, mesAtivo, ordemEntradasFaturamento]);

const entradasFaturamentoDoMes = useMemo(() => {
  const termo = normalizarTexto(buscaEntradaFaturamento.trim());

  if (!termo) return entradasFaturamentoOrdenadasDoMes;

  return entradasFaturamentoOrdenadasDoMes.filter((entrada) => {
    const textoBusca = normalizarTexto(
      [
        entrada.dia,
        entrada.origem,
        formatarMoeda(Number(entrada.valor || 0)),
        String(Number(entrada.valor || 0).toFixed(2)).replace('.', ','),
      ].join(' ')
    );

    return textoBusca.includes(termo);
  });
}, [buscaEntradaFaturamento, entradasFaturamentoOrdenadasDoMes]);

const totalEntradasFaturamentoDoMes = entradasFaturamentoOrdenadasDoMes.reduce(
  (acc, entrada) => entrada.status === 'prevista' ? acc : acc + Number(entrada.valor || 0),
  0
);

  const maiorGasto = lancamentosDoMes.length > 0 ? lancamentosDoMes.reduce((prev, curr) => (curr.valor > prev.valor ? curr : prev), { despesa: '', valor: 0 }) : { despesa: 'Nenhuma despesa', valor: 0 };
  const receitasTotais = Object.values(faturamentos).reduce((a, b) => a + b, 0);
  const despesasTotais = lancamentos.reduce((a, b) => a + b.valor, 0);
  const lucroTotalAnual = receitasTotais - despesasTotais;
  const formatarValorCampo = (valor: number) =>
    valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getEntradasPorMes = (mes: string) =>
    faturamentosEntradas.filter((entrada) => entrada.mes === mes);

  const getTotalEntradasPorMes = (mes: string) =>
    getEntradasPorMes(mes)
      .filter((entrada) => entrada.status !== 'prevista')
      .reduce((acc, entrada) => acc + Number(entrada.valor || 0), 0);

  const excluirEntradasFaturamentoDoMes = async (mes: string) => {
    if (!empresaId) return false;

    const { error } = await supabase
      .from('faturamentos_entradas')
      .delete()
      .eq('empresa_id', empresaId)
      .eq('ano', Number(anoSelecionado))
      .eq('mes', mes);

    if (error) {
      console.error('Erro ao apagar entradas de faturamento do mês:', error);
      return false;
    }

    setFaturamentosEntradas((prev) => prev.filter((entrada) => entrada.mes !== mes));
    return true;
  };

  const salvarFaturamentoMes = async (mes: string, valor: number) => {
  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Tente atualizar a página e acessar novamente.'
    );
    return;
  }

  if (!mes) {
    abrirAviso(
      'Mês obrigatório',
      'Selecione o mês do faturamento antes de salvar.'
    );
    return;
  }

  if (valor < 0) {
  abrirAviso(
    'Valor inválido',
    'O faturamento não pode ser negativo.'
  );
  return;
}

  const salvo = await salvarFaturamentoBanco({
    empresaId,
    ano: Number(anoSelecionado),
    mes,
    valor,
  });

  if (!salvo) {
    abrirAviso(
      'Erro ao salvar faturamento',
      'Não foi possível salvar o faturamento no banco.'
    );
    return;
  }

  setFaturamentos((prev) => ({
    ...prev,
    [mes]: valor,
  }));
  notificarFinanceiroAtualizado();
};

const salvarFaturamento = async (
  modoAvulsas: 'perguntar' | 'somar' | 'substituir' = 'perguntar',
  mesInformado?: string,
  valorInformado?: number
) => {
  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Tente atualizar a página e acessar novamente.'
    );
    return;
  }

  const mesSelecionado = mesInformado || mesFaturamento;

  if (!mesSelecionado) {
    abrirAviso(
      'Mês obrigatório',
      'Selecione o mês do faturamento antes de salvar.'
    );
    return;
  }

  const valorLimpo =
    typeof valorInformado === 'number'
      ? valorInformado
      : parseInt(inputFaturamento.replace(/\D/g, '') || '0', 10) / 100;

  if (valorLimpo < 0) {
  abrirAviso(
    'Valor inválido',
    'O faturamento não pode ser negativo.'
  );
  return;
}

  const entradasMes = getEntradasPorMes(mesSelecionado);
  const totalEntradasMes = getTotalEntradasPorMes(mesSelecionado);
  const possuiEntradasAvulsas = entradasMes.length > 0;
  const valorFinal = modoAvulsas === 'somar' && totalEntradasMes > 0
    ? totalEntradasMes + valorLimpo
    : valorLimpo;

  if (possuiEntradasAvulsas && modoAvulsas === 'perguntar') {
    abrirConfirmacao({
      titulo: 'Receitas avulsas existentes',
      mensagem:
        `Este mês já possui ${entradasMes.length} receita(s) avulsa(s) lançada(s).\n\nDeseja apagar esses lançamentos e manter somente o novo total de ${formatarMoeda(valorLimpo)}?\n\nSe escolher manter, o novo total será somado às receitas avulsas efetivadas e o total final de ${mesSelecionado} ficará em ${formatarMoeda(totalEntradasMes + valorLimpo)}.`,
      textoConfirmar: 'Apagar avulsas',
      textoCancelar: 'Manter e somar',
      acao: async () => {
        await salvarFaturamento('substituir', mesSelecionado, valorLimpo);
      },
      acaoCancelar: async () => {
        await salvarFaturamento('somar', mesSelecionado, valorLimpo);
      },
    });
    return;
  }

  if (modoAvulsas === 'substituir' && possuiEntradasAvulsas) {
    const entradasApagadas = await excluirEntradasFaturamentoDoMes(mesSelecionado);
    if (!entradasApagadas) {
      abrirAviso(
        'Erro ao apagar receitas',
        'Não foi possível apagar as receitas avulsas deste mês. O total não foi alterado.'
      );
      return;
    }
  }

  const salvo = await salvarFaturamentoBanco({
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesSelecionado,
    valor: valorFinal,
  });

  if (salvo) {
    setFaturamentos((prev) => ({
      ...prev,
      [mesSelecionado]: valorFinal,
    }));

    setInputFaturamento('');
    notificarFinanceiroAtualizado();
  } else {
    abrirAviso(
      'Erro ao salvar faturamento',
      'Não foi possível salvar o faturamento no banco.'
    );
  }
};

const adicionarEntradaFaturamento = async (mesInformado?: string) => {
  if (entradaFaturamentoSalvando) return;

  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Tente atualizar a página e acessar novamente.'
    );
    return;
  }

  const mesReferenciaFaturamento = mesInformado || mesAtivo || mesFaturamento;

  if (!mesReferenciaFaturamento) {
    abrirAviso(
      'Mês obrigatório',
      'Selecione o mês antes de adicionar a entrada.'
    );
    return;
  }

  if (
    !entradaFaturamentoDia ||
    !entradaFaturamentoOrigem.trim() ||
    entradaFaturamentoValorNumerico <= 0
  ) {
    abrirAviso(
      'Campos obrigatórios',
      'Informe dia, origem e valor da entrada.'
    );
    return;
  }

  const diaNumerico = parseInt(entradaFaturamentoDia, 10);
  const maxDias = getMaxDias(mesReferenciaFaturamento, anoSelecionado);

  if (
    Number.isNaN(diaNumerico) ||
    diaNumerico < 1 ||
    diaNumerico > maxDias
  ) {
    abrirAviso(
      'Dia inválido',
      `Informe um dia válido entre 1 e ${maxDias}.`
    );
    return;
  }

  try {
    setEntradaFaturamentoSalvando(true);

    const origemLimpa = formatarDescricao(entradaFaturamentoOrigem);

    // Receita futura -> "prevista": nao entra no total efetivado agora, so na previsao.
    const ehFuturaEntrada = dataFutura(Number(anoSelecionado), meses.indexOf(mesReferenciaFaturamento), diaNumerico);

    const entradaSalva = await salvarFaturamentoEntrada({
      empresaId,
      ano: Number(anoSelecionado),
      mes: mesReferenciaFaturamento,
      dia: diaNumerico,
      origem: origemLimpa,
      valor: entradaFaturamentoValorNumerico,
      status: ehFuturaEntrada ? 'prevista' : null,
      tipoObs: ehFuturaEntrada ? 'previsto' : null,
    });

    if (entradaSalva.erro || !entradaSalva.data) {
      abrirAviso(
        'Erro ao salvar entrada',
        entradaSalva.mensagem || 'Não foi possível salvar a entrada.'
      );
      return;
    }

    if (!ehFuturaEntrada) {
      const totalAtual = faturamentos[mesReferenciaFaturamento] || 0;
      const novoTotal = totalAtual + entradaFaturamentoValorNumerico;

      const faturamentoSalvo = await salvarFaturamentoBanco({
        empresaId,
        ano: Number(anoSelecionado),
        mes: mesReferenciaFaturamento,
        valor: novoTotal,
      });

      if (!faturamentoSalvo) {
        abrirAviso(
          'Entrada salva parcialmente',
          'A entrada foi registrada, mas não foi possível atualizar o total do mês. Atualize a página e confira o faturamento.'
        );
        return;
      }

      setFaturamentos((prev) => ({
        ...prev,
        [mesReferenciaFaturamento]: novoTotal,
      }));
    }

    const novaEntrada = {
      id: entradaSalva.data.id,
      mes: entradaSalva.data.mes,
      dia: entradaSalva.data.dia,
      origem: entradaSalva.data.origem,
      valor: Number(entradaSalva.data.valor),
      status: entradaSalva.data.status || null,
      tipo: entradaSalva.data.tipo_obs || null,
    };

    setFaturamentosEntradas((prev) => [novaEntrada, ...prev]);

    setEntradaFaturamentoDia('');
    setEntradaFaturamentoOrigem('');
    setEntradaFaturamentoValor('');
    notificarFinanceiroAtualizado();
    setEntradaFaturamentoValorNumerico(0);
  } finally {
    setEntradaFaturamentoSalvando(false);
  }
};

const limparCamposReceitaDashboard = (tipo = tipoReceitaDashboard) => {
  if (tipo === 'entrada') {
    setEntradaFaturamentoDia('');
    setEntradaFaturamentoOrigem('');
    setEntradaFaturamentoValor('');
    setEntradaFaturamentoValorNumerico(0);
    setValorReceitaDashboardConfirmacao(0);
    return;
  }

  setInputFaturamento('');
  setValorReceitaDashboardConfirmacao(0);
};

const fecharModalReceitaDashboard = () => {
  setModalReceitaDashboardAberto(false);
  limparCamposReceitaDashboard();
};

const solicitarEntradaFaturamentoDashboard = () => {
  if (!entradaFaturamentoDia || !entradaFaturamentoOrigem.trim() || entradaFaturamentoValorNumerico <= 0) {
    abrirAviso(
      'Campos obrigatorios',
      'Informe dia, origem e valor da receita antes de continuar.'
    );
    return;
  }

  setTipoReceitaDashboard('entrada');
  setMesReceitaDashboard(mesAtivo || mesFaturamento || meses[new Date().getMonth()]);
  setModalReceitaDashboardAberto(true);
};

const solicitarFaturamentoDashboard = () => {
  const valorLimpo =
    parseInt(inputFaturamento.replace(/\D/g, '') || '0', 10) / 100;

  if (valorLimpo <= 0) {
    abrirAviso(
      'Valor obrigatorio',
      'Informe o valor da receita antes de continuar.'
    );
    return;
  }

  setTipoReceitaDashboard('total');
  setValorReceitaDashboardConfirmacao(valorLimpo);
  setInputFaturamento('');
  setMesReceitaDashboard(mesAtivo || mesFaturamento || meses[new Date().getMonth()]);
  setModalReceitaDashboardAberto(true);
};

  const abrirModalDespesasFixas = async () => {
    if (!empresaId) return;
    const lista = await buscarRecorrencias(empresaId);
    setRecorrencias(lista);
    setModalDespesasFixas(true);
  };

  const handleEditRecorrValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) { setEditRecorrValor(''); setEditRecorrValorNumerico(0); return; }
    const numericValue = parseInt(value, 10) / 100;
    setEditRecorrValorNumerico(numericValue);
    setEditRecorrValor(formatarValorCampo(numericValue));
  };

  const handleNovaRecorrValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setNovaRecorrValor('');
      setNovaRecorrValorNumerico(0);
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setNovaRecorrValorNumerico(numericValue);
    setNovaRecorrValor(formatarValorCampo(numericValue));
  };

  const salvarNovaRecorrencia = async () => {
    if (!empresaId || !novaRecorrNome.trim()) return;
    setRecorrSalvando(true);
    const dia = Math.max(1, Math.min(31, Number(novaRecorrDia) || 1));
    const valorNum = novaRecorrValorNumerico;
    const mesesFrente = Math.max(1, Math.min(60, Number(novaRecorrMesesFrente) || 1));
    const resultado = await inserirRecorrencia({
      empresaId,
      nome: novaRecorrNome.trim(),
      categoria: novaRecorrCategoria.trim(),
      descricao: novaRecorrDescricao.trim(),
      dia,
    });
    if (!resultado.erro && resultado.data) {
      setRecorrencias((prev) => [...prev, resultado.data!].sort((a, b) => a.nome.localeCompare(b.nome)));
      const novosLancamentos: LancamentoFinanceiro[] = [];
      if (novaRecorrLancarAgora && mesAtivo && valorNum > 0) {
        const salvo = await salvarLancamento({
          empresaId,
          ano: Number(anoSelecionado),
          mes: mesAtivo,
          dia,
          despesaNome: novaRecorrNome.trim(),
          descricao: novaRecorrDescricao.trim(),
          valor: valorNum,
          status: 'prevista',
          tipoObs: 'fixa',
          recorrenciaId: resultado.data!.id,
        });
        if (!salvo.erro && salvo.data) {
          novosLancamentos.push({
            id: salvo.data!.id,
            mes: salvo.data!.mes,
            dia: salvo.data!.dia,
            despesa: salvo.data!.despesa_nome,
            descricao: salvo.data!.descricao || '',
            valor: Number(salvo.data!.valor),
            status: salvo.data!.status || null,
            tipo: salvo.data!.tipo_obs || null,
            recorrenciaId: salvo.data!.recorrencia_id || null,
          });
        }
      }
      if (valorNum > 0) {
        for (let i = 1; i <= mesesFrente; i++) {
          const baseIdx = meses.indexOf(mesAtivo || meses[new Date().getMonth()]);
          const idx = (baseIdx + i) % 12;
          const anoFuturo = Number(anoSelecionado) + Math.floor((baseIdx + i) / 12);
          const salvo = await salvarLancamento({
            empresaId,
            ano: anoFuturo,
            mes: meses[idx],
            dia,
            despesaNome: novaRecorrNome.trim(),
            descricao: novaRecorrDescricao.trim(),
            valor: valorNum,
            status: 'prevista',
            tipoObs: 'fixa',
            recorrenciaId: resultado.data!.id,
          });
          if (!salvo.erro && salvo.data) {
            novosLancamentos.push({
              id: salvo.data.id,
              mes: salvo.data.mes,
              dia: salvo.data.dia,
              despesa: salvo.data.despesa_nome,
              descricao: salvo.data.descricao || '',
              valor: Number(salvo.data.valor),
              status: salvo.data.status || null,
              tipo: salvo.data.tipo_obs || null,
              recorrenciaId: salvo.data.recorrencia_id || null,
            });
          }
        }
      }
      if (novosLancamentos.length) setLancamentos((prev) => [...novosLancamentos, ...prev]);
      notificarFinanceiroAtualizado();
      setNovaRecorrNome('');
      setNovaRecorrCategoria('');
      setNovaRecorrDescricao('');
      setNovaRecorrDia('');
      setNovaRecorrValor('');
      setNovaRecorrValorNumerico(0);
      setNovaRecorrLancarAgora(false);
      setNovaRecorrMesesFrente('1');
    }
    setRecorrSalvando(false);
  };

  const toggleRecorrenciaAtivo = async (id: string, ativo: boolean) => {
    const ok = await atualizarRecorrencia(id, { ativo: !ativo });
    if (ok) setRecorrencias((prev) => prev.map((r) => r.id === id ? { ...r, ativo: !ativo } : r));
  };

  const iniciarEdicaoRecorrencia = (r: Recorrencia) => {
    setRecorrEditandoId(r.id);
    setEditRecorrNome(r.nome);
    setEditRecorrCategoria(r.categoria);
    setEditRecorrDescricao(r.descricao || '');
    setEditRecorrDia(String(r.dia));
    setEditRecorrValor('');
    setEditRecorrValorNumerico(0);
    setEditRecorrLancarAgora(false);
  };

  const salvarEdicaoRecorrencia = async () => {
    if (!recorrEditandoId) return;
    const dia = Math.max(1, Math.min(31, Number(editRecorrDia) || 1));
    const ok = await atualizarRecorrencia(recorrEditandoId, {
      nome: editRecorrNome.trim(),
      categoria: editRecorrCategoria.trim(),
      descricao: editRecorrDescricao.trim(),
      dia,
    });
    if (ok) {
      if (empresaId) {
        await supabase
          .from('lancamentos')
          .update({
            despesa_nome: editRecorrNome.trim(),
            descricao: editRecorrDescricao.trim(),
            dia,
            updated_at: new Date().toISOString(),
          })
          .eq('empresa_id', empresaId)
          .eq('recorrencia_id', recorrEditandoId);
      }
      setRecorrencias((prev) =>
        prev.map((r) => r.id === recorrEditandoId
          ? { ...r, nome: editRecorrNome.trim(), categoria: editRecorrCategoria.trim(), descricao: editRecorrDescricao.trim(), dia }
          : r
        ).sort((a, b) => a.nome.localeCompare(b.nome))
      );
      if (editRecorrLancarAgora && mesAtivo && editRecorrValorNumerico > 0) {
        const dia = Math.max(1, Math.min(31, Number(editRecorrDia) || 1));
        const salvo = await salvarLancamento({
          empresaId: empresaId!,
          ano: Number(anoSelecionado),
          mes: mesAtivo,
          dia,
          despesaNome: editRecorrNome.trim(),
          descricao: editRecorrDescricao.trim(),
          valor: editRecorrValorNumerico,
          status: 'prevista',
          tipoObs: 'fixa',
          recorrenciaId: recorrEditandoId,
        });
        if (!salvo.erro && salvo.data) {
          setLancamentos((prev) => [{
            id: salvo.data!.id,
            mes: salvo.data!.mes,
            dia: salvo.data!.dia,
            despesa: salvo.data!.despesa_nome,
            descricao: salvo.data!.descricao || '',
            valor: Number(salvo.data!.valor),
            status: salvo.data!.status || null,
            tipo: salvo.data!.tipo_obs || null,
            recorrenciaId: salvo.data!.recorrencia_id || null,
          }, ...prev]);
        }
      }
      notificarFinanceiroAtualizado();
      setRecorrEditandoId(null);
    }
  };

  const excluirRecorrenciaHandler = async (id: string, nome: string) => {
    abrirConfirmacao({
      titulo: 'Excluir despesa fixa',
      mensagem: `"${nome}" será removida das despesas fixas e de todos os meses em que foi lançada.`,
      textoConfirmar: 'Excluir',
      acao: async () => {
        if (!empresaId) return;
        const { error } = await supabase
          .from('lancamentos')
          .delete()
          .eq('empresa_id', empresaId)
          .eq('recorrencia_id', id);

        if (error) {
          abrirAviso('Erro ao excluir despesa fixa', 'Não foi possível remover os lançamentos desta despesa fixa.');
          return;
        }

        const ok = await deletarRecorrencia(id);
        if (ok) {
          setRecorrencias((prev) => prev.filter((r) => r.id !== id));
          setLancamentos((prev) => prev.filter((l) => l.recorrenciaId !== id));
          notificarFinanceiroAtualizado();
        }
      },
    });
  };

const excluirTotalMes = async () => {
  if (!empresaId) return;

  const mes = mesAtivo || mesFaturamento;
  if (!mes) {
    abrirAviso('Mês não identificado', 'Selecione o mês antes de excluir o total.');
    return;
  }

  const totalEntradas = getTotalEntradasPorMes(mes);

  abrirConfirmacao({
    titulo: 'Excluir total do mês',
    mensagem: totalEntradas > 0
      ? `O total definido manualmente será removido. As receitas lançadas (${formatarMoeda(totalEntradas)}) serão mantidas.`
      : `Não há receitas lançadas neste mês. O total do mês será zerado.`,
    textoConfirmar: 'Excluir total',
    acao: async () => {
      if (totalEntradas > 0) {
        await salvarFaturamentoBanco({
          empresaId,
          ano: Number(anoSelecionado),
          mes,
          valor: totalEntradas,
        });
        setFaturamentos((prev) => ({ ...prev, [mes]: totalEntradas }));
      } else {
        await excluirFaturamentoBanco({
          empresaId,
          ano: Number(anoSelecionado),
          mes,
        });
        setFaturamentos((prev) => {
          const next = { ...prev };
          delete next[mes];
          return next;
        });
      }
      notificarFinanceiroAtualizado();
    },
  });
};

const confirmarEntradaFaturamentoDashboard = async () => {
  const mesSelecionado = mesReceitaDashboard || mesFaturamento || mesAtivo;

  if (!mesSelecionado) {
    abrirAviso(
      'Mes obrigatorio',
      'Selecione o mes da receita antes de confirmar.'
    );
    return;
  }

  setModalReceitaDashboardAberto(false);
  if (tipoReceitaDashboard === 'entrada') {
    await adicionarEntradaFaturamento(mesSelecionado);
    limparCamposReceitaDashboard('entrada');
    return;
  }

  await salvarFaturamento('perguntar', mesSelecionado, valorReceitaDashboardConfirmacao);
  limparCamposReceitaDashboard('total');
};

const adicionarDespesaBase = async () => {
  if (!podeAcessarAjustes) {
  abrirAviso(
    'Acesso não permitido',
    'Você não tem permissão para cadastrar ou alterar despesas base.'
  );
  return;
}
  const nomeLimpo = formatarNomeCategoria(novaBaseNome);

  if (!nomeLimpo || !novaBaseCat) {
  abrirAviso(
    'Campos obrigatórios',
    'Preencha o nome e a categoria da despesa.'
  );
  return;
}

  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Saia e entre novamente no sistema.'
  );
  return;
}

  const jaExiste = despesasCadastradas.some(
  (d) => normalizarTexto(d.nome) === normalizarTexto(nomeLimpo)
);

  if (jaExiste) {
  abrirAviso(
    'Despesa já cadastrada',
    'Esta despesa já existe na lista de despesas base.'
  );
  return;
}

  const despesaSalva = await salvarDespesaCadastrada(
    empresaId,
    nomeLimpo,
    formatarNomeCategoria(novaBaseCat)
  );

  if (!despesaSalva) {
  abrirAviso(
    'Erro ao salvar despesa',
    'Não foi possível salvar a despesa no banco. Tente novamente.'
  );
  return;
}

  setDespesasCadastradas([
    ...despesasCadastradas,
    {
      nome: despesaSalva.nome,
      categoria: despesaSalva.categoria,
    },
  ]);

  setNovaBaseNome('');
  setNovaBaseCat('');
};

const editarDespesaBase = async (nomeAtual: string): Promise<boolean> => {
  if (!podeAcessarAjustes || !empresaId) return false;

  const novoNome = formatarNomeCategoria(novaBaseNome);
  const novaCategoria = formatarNomeCategoria(novaBaseCat);
  if (!novoNome || !novaCategoria) {
    abrirAviso('Campos obrigatórios', 'Preencha o nome e a categoria da despesa.');
    return false;
  }

  const duplicada = despesasCadastradas.some(
    (d) => d.nome !== nomeAtual && normalizarTexto(d.nome) === normalizarTexto(novoNome)
  );
  if (duplicada) {
    abrirAviso('Despesa já cadastrada', 'Esta despesa já existe na lista de despesas base.');
    return false;
  }

  const atualizada = await atualizarDespesaCadastrada(
    empresaId,
    nomeAtual,
    novoNome,
    novaCategoria
  );
  if (!atualizada) {
    abrirAviso('Erro ao editar despesa', 'Não foi possível atualizar a despesa no banco.');
    return false;
  }

  setDespesasCadastradas((prev) => prev.map((d) =>
    d.nome === nomeAtual
      ? { nome: formatarNomeCategoria(atualizada.nome), categoria: formatarNomeCategoria(atualizada.categoria) }
      : d
  ));
  return true;
};

const apagarDespesaBase = async (nome: string) => {
  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para excluir despesas base.'
    );
    return;
  }

  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Atualize a página e tente novamente.'
    );
    return;
  }

  abrirConfirmacao({
    titulo: 'Excluir despesa cadastrada',
    mensagem:
      `Deseja realmente excluir a despesa "${nome}"?\n\nEssa ação removerá a despesa da lista de despesas cadastradas.`,
    textoConfirmar: 'Excluir',
    acao: async () => {
      const apagou = await apagarDespesaCadastrada(empresaId, nome);

      if (!apagou) {
        abrirAviso(
          'Erro ao apagar despesa',
          'Não foi possível apagar a despesa cadastrada no banco.'
        );
        return;
      }

      setDespesasCadastradas((prev) => prev.filter((d) => d.nome !== nome));
    },
  });
};

const adicionarDespesa = async () => {
  if (salvandoDespesa) return;
  setSalvandoDespesa(true);

  try {
    if (!podeInserirLancamentos) {
      abrirAviso('Acesso não permitido', 'Você não tem permissão para inserir lançamentos.');
      return;
    }

    if (!empresaId) {
      abrirAviso('Empresa não carregada', 'Tente atualizar a página e acessar novamente.');
      return;
    }

    if (!mesAtivo) {
      abrirAviso('Mês não selecionado', 'Selecione um mês antes de lançar a despesa.');
      return;
    }

    if (!formDia || !formDespesa || valorNumericoRaw <= 0) {
      abrirAviso('Campos obrigatórios', 'Preencha dia, despesa e valor antes de salvar.');
      return;
    }

    if (duplicadosAtivo) {
      const existeIgual = lancamentosDoMes.some(
        (l) => l.despesa === formDespesa && l.valor === valorNumericoRaw
      );

      if (existeIgual) {
        abrirConfirmacao({
          titulo: 'Despesa duplicada',
          mensagem:
            'Já existe uma despesa com o mesmo nome e valor neste mês.\n\nDeseja adicionar mesmo assim?',
          textoConfirmar: 'Adicionar mesmo assim',
          acao: async () => {
            try {
              await executarParcelamento();
            } finally {
              setSalvandoDespesa(false);
            }
          },
        });
        return; // aguarda confirmação do usuário; finally liberará o flag após ação
      }
    }

    await executarParcelamento();
  } finally {
    setSalvandoDespesa(false);
  }
};

const lerNotaPorFoto = async (arquivo: File) => {
  const extensao = arquivo.name.split('.').pop()?.toLowerCase();
  const eImagem = arquivo.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(extensao || '');
  if (!eImagem) {
    setArquivoImportador(arquivo);
    return;
  }
  if (!empresaId) {
    abrirAviso('Empresa não carregada', 'Tente atualizar a página e acessar novamente.');
    return;
  }
  setLendoNota(true);
  try {
    const { data: sessao } = await supabase.auth.getSession();
    const token = sessao.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

    const form = new FormData();
    form.append('empresaId', empresaId);
    form.append('arquivo', arquivo, arquivo.name || 'nota.jpg');
    const resposta = await fetch('/api/lancamentos/ler-foto', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const json = await resposta.json().catch(() => null);
    if (!resposta.ok || json?.erro) throw new Error(json?.mensagem || 'Não foi possível ler a nota.');

    const leitura = json?.leitura;
    if (leitura?.data_documento) {
      const [ano, mes, dia] = String(leitura.data_documento).split('-').map(Number);
      if (ano && mes && dia) {
        setAnoSelecionado(String(ano));
        setMesAtivo(meses[mes - 1] || mesAtivo);
        setFormDia(String(dia));
      }
    }
    if (leitura?.valor_total) {
      const valor = Number(leitura.valor_total);
      setValorNumericoRaw(valor);
      setFormValor(formatarValorCampo(valor));
    }
    if (leitura?.despesa_sugerida) setFormDespesa(String(leitura.despesa_sugerida));
    setNotaPendente(arquivo);
  } catch (error) {
    abrirAviso('Não foi possível ler a nota', error instanceof Error ? error.message : 'Tente outra imagem.');
  } finally {
    setLendoNota(false);
  }
};

const abrirNotaLancamento = async (lancamento: TabelaLancamentoDespesa) => {
  setBaixandoNota(true);
  try {
    const resposta = await obterUrlNotaLancamento(lancamento.id);
    if (resposta.erro || !resposta.url) {
      abrirAviso('Não foi possível abrir a nota', resposta.mensagem || 'Tente novamente.');
      return;
    }
    setNotaAbertaUrl(resposta.url);
  } finally {
    setBaixandoNota(false);
  }
};

const executarParcelamento = async () => {
  const totalParcelas = formParcelar && formParcelas >= 2 ? formParcelas : 1;
  const mesIndex = meses.indexOf(mesAtivo ?? '');
  const novosLancamentos: LancamentoFinanceiro[] = [];

  for (let p = 0; p < totalParcelas; p++) {
    const idxMes = (mesIndex + p) % 12;
    const anosExtra = Math.floor((mesIndex + p) / 12);
    const mesParc = meses[idxMes];
    const anoParc = Number(anoSelecionado) + anosExtra;
    const descParc = totalParcelas > 1
      ? (formatarDescricao(formDescricao) ? `${formatarDescricao(formDescricao)} (${p + 1}/${totalParcelas})` : `(${p + 1}/${totalParcelas})`)
      : formatarDescricao(formDescricao);

    const ehFuturo = dataFutura(anoParc, idxMes, parseInt(formDia));
    const ehParcelado = totalParcelas > 1;
    // Parcela: valor e data definidos -> nao pede confirmacao (so badge).
    // Avulso futuro: "previsto" -> pede confirmacao na data.
    const tipoLanc = ehParcelado ? 'parcela' : (ehFuturo ? 'previsto' : null);
    const statusLanc = (!ehParcelado && ehFuturo) ? 'prevista' : null;

    const salvo = await salvarLancamento({
      empresaId: empresaId as string,
      ano: anoParc,
      mes: mesParc as string,
      dia: parseInt(formDia),
      despesaNome: formDespesa,
      descricao: descParc,
      valor: valorNumericoRaw,
      status: statusLanc,
      tipoObs: tipoLanc,
    });

    if (!salvo.erro && salvo.data) {
      novosLancamentos.push({
        id: salvo.data.id,
        mes: salvo.data.mes,
        dia: salvo.data.dia,
        despesa: salvo.data.despesa_nome,
        descricao: salvo.data.descricao || '',
        valor: Number(salvo.data.valor),
        status: salvo.data.status || null,
        tipo: salvo.data.tipo_obs || null,
        recorrenciaId: salvo.data.recorrencia_id || null,
      });
    } else {
      abrirAviso(
        'Erro ao salvar lançamento',
        salvo.mensagem || 'Não foi possível salvar o lançamento.'
      );
      break;
    }
  }

  if (novosLancamentos.length > 0) {
    let notaCaminho = '';
    if (notaPendente) {
      const nota = await arquivarNotaLancamento(novosLancamentos[0].id, notaPendente);
      if (nota.erro) {
        abrirAviso('Despesa salva, mas sem a nota', nota.mensagem || 'Tente anexar novamente.');
      } else {
        notaCaminho = nota.caminho || '';
      }
    }
    if (notaCaminho) {
      novosLancamentos[0].notaArquivoPath = notaCaminho;
    }
    setLancamentos((prev) => [...novosLancamentos, ...prev]);
    notificarFinanceiroAtualizado();
    setFormDia('');
    setFormDespesa('');
    setFormDescricao('');
    setFormValor('');
    setValorNumericoRaw(0);
    setFormParcelar(false);
    setFormParcelas(2);
    setNotaPendente(null);
  }
};

const apagarDespesa = async (id: string) => {
  const apagou = await apagarLancamento(id);

  if (apagou) {
    // O Supabase pode entregar o ID como número e a ação o recebe como texto.
    // Normalizar a comparação remove a linha no mesmo instante da confirmação.
    setLancamentos((prev) => prev.filter((l) => String(l.id) !== String(id)));
    notificarFinanceiroAtualizado();
  } else {
    abrirAviso(
      'Erro ao apagar lançamento',
      'Não foi possível apagar o lançamento no banco.'
    );
  }
};

const cancelarDespesaFixaDoMes = async (lanc: LancamentoFinanceiro | TabelaLancamentoDespesa) => {
  if (!empresaId) return;

  if (!(await removerNotaLancamento(lanc.id))) {
    abrirAviso('Erro ao apagar nota', 'Não foi possível remover a nota deste lançamento.');
    return;
  }

  const { error } = await supabase
    .from('lancamentos')
    .update({ status: 'cancelada', updated_at: new Date().toISOString() })
    .eq('id', lanc.id)
    .eq('empresa_id', empresaId);

  if (error) {
    abrirAviso('Erro ao apagar lançamento', 'Não foi possível apagar a despesa fixa deste mês.');
    return;
  }

  setLancamentos((prev) => prev.filter((l) => String(l.id) !== String(lanc.id)));
  notificarFinanceiroAtualizado();
};

const confirmarDespesaPrevista = async (id: string | number) => {
  if (!empresaId) return;
  const ok = await definirStatusLancamento(id, empresaId, 'confirmada');
  if (ok) {
    setLancamentos((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'confirmada' } : l))
    );
    notificarFinanceiroAtualizado();
  } else {
    abrirAviso('Erro', 'Não foi possível confirmar a despesa.');
  }
};

const excluirDespesaPrevista = (id: string | number) => {
  abrirConfirmacao({
    titulo: 'Excluir despesa prevista',
    mensagem:
      'Esta despesa era uma previsão e não ocorreu. Ela será removida. Deseja excluir?',
    textoConfirmar: 'Excluir',
    acao: async () => {
      await apagarDespesa(id as string);
    },
  });
};

const ajustarDespesaPrevista = (despesa: TabelaLancamentoDespesa) => {
  if (despesa && despesa.mes) setMesAtivo(despesa.mes);
};

// ---- Receitas previstas: confirmar / excluir / editar (a partir do card de confirmacao) ----
const confirmarReceitaPrevista = async (id: string | number) => {
  if (!empresaId) return;
  const entrada = faturamentosEntradas.find((e) => e.id === id);
  if (!entrada) {
    abrirAviso('Erro', 'Não foi possível localizar a receita.');
    return;
  }
  if (entrada.tipo === 'vendas_mobile_sistema' || entrada.tipo === 'recebimentos_sistema') {
    abrirAviso('Receita protegida', 'Esta receita é controlada pelo módulo de origem e não pode ser alterada no Gestão.');
    return;
  }

  const mesEntrada = entrada.mes;
  const valorEntrada = Number(entrada.valor || 0);

  const resultado = await atualizarFaturamentoEntrada({
    id: id as string,
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesEntrada,
    dia: Number(entrada.dia),
    origem: entrada.origem,
    valor: valorEntrada,
    status: 'confirmada',
    tipoObs: null,
  });

  if (resultado.erro) {
    abrirAviso('Erro', resultado.mensagem || 'Não foi possível confirmar a receita.');
    return;
  }

  // Ao confirmar, a receita passa a integrar o total efetivado do mes.
  const totalAtual = faturamentos[mesEntrada] || 0;
  const novoTotal = totalAtual + valorEntrada;

  const faturamentoSalvo = await salvarFaturamentoBanco({
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesEntrada,
    valor: novoTotal,
  });

  if (!faturamentoSalvo) {
    abrirAviso(
      'Receita confirmada parcialmente',
      'A receita foi confirmada, mas não foi possível atualizar o total do mês. Atualize a página e confira o faturamento.'
    );
    return;
  }

  setFaturamentosEntradas((prev) =>
    prev.map((e) => (e.id === id ? { ...e, status: 'confirmada', tipo: null } : e))
  );
  setFaturamentos((prev) => ({ ...prev, [mesEntrada]: novoTotal }));
  notificarFinanceiroAtualizado();
};

const excluirReceitaPrevista = (id: string | number) => {
  const entrada = faturamentosEntradas.find((e) => e.id === id);
  if (entrada) excluirEntradaFaturamento(entrada);
};

const editarReceitaPrevista = (id: string | number) => {
  const entrada = faturamentosEntradas.find((e) => e.id === id);
  if (!entrada) return;
  if (entrada.mes) setMesAtivo(entrada.mes);
  iniciarEdicaoEntradaFaturamento(entrada);
};

const atualizarLayoutDashboard = (novaOrdem: { left: string[]; a: string[]; b: string[] }, novosExpandidos: string[]) => {
  // Premium Pessoal: organizar o dashboard (kanban) é pago — avisa e mantém o padrão.
  if (recursoBloqueado('organizar_dashboard')) {
    setDashboardOrdem(ordemDashboardPadrao);
    setDashboardExpandidos([]);
    abrirPremium('organizar_dashboard');
    return;
  }
  setDashboardOrdem(novaOrdem);
  setDashboardExpandidos(novosExpandidos);
  if (empresaId) salvarDashboardOrdemWeb(empresaId, novaOrdem, dashboardOcultos, novosExpandidos);
};

const restaurarOrdemDashboard = () => {
  setDashboardOrdem(ordemDashboardPadrao);
  setDashboardOcultos(ocultosDashboardPadrao);
  setDashboardExpandidos([]);
  if (empresaId) salvarDashboardOrdemWeb(empresaId, ordemDashboardPadrao, ocultosDashboardPadrao, []);
};

const definirOcultosDashboard = (novosOcultos: string[]) => {
  // Premium Pessoal: ocultar/exibir cards faz parte de organizar o dashboard.
  if (recursoBloqueado('organizar_dashboard')) {
    setDashboardOcultos(ocultosDashboardPadrao);
    abrirPremium('organizar_dashboard');
    return;
  }
  const ocultosNormalizados = novosOcultos.filter(
    (id, index) => dashboardCardsKanban.includes(id) && novosOcultos.indexOf(id) === index
  );
  setDashboardOcultos(ocultosNormalizados);
  if (empresaId) salvarDashboardOrdemWeb(empresaId, dashboardOrdem, ocultosNormalizados, dashboardExpandidos);
};

const ocultarCardDashboard = (id: string) => {
  definirOcultosDashboard([...dashboardOcultos, id]);
};

const solicitarExclusaoLancamento = (lanc: TabelaLancamentoDespesa) => {
  if (!podeExcluirLancamentos) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para excluir lançamentos.'
    );
    return;
  }

  // Detectar se faz parte de um grupo de parcelas (descrição termina em "(X/N)")
  const descricao = lanc.descricao || '';
  const matchParcela = descricao.match(/\((\d+)\/(\d+)\)$/);
  if (matchParcela) {
    const total = parseInt(matchParcela[2], 10);
    // Encontrar todas as parcelas do mesmo grupo (mesma despesa, padrão X/total)
    const parcelasGrupo = lancamentos.filter((l) => {
      if (l.despesa !== lanc.despesa) return false;
      const m = (l.descricao || '').match(/\((\d+)\/(\d+)\)$/);
      return m && parseInt(m[2], 10) === total;
    });
    const pendentes = parcelasGrupo.filter((l) => l.id !== lanc.id);
    if (pendentes.length > 0) {
      abrirConfirmacao({
        titulo: 'Excluir parcela',
        mensagem: `Este lançamento faz parte de um parcelamento em ${total}x.

Há ${pendentes.length} parcela(s) pendente(s).

Deseja excluir TODAS as parcelas ou apenas esta?`,
        textoConfirmar: `Excluir todas (${parcelasGrupo.length})`,
        textoCancelar: 'Só esta',
        acao: async () => {
          for (const p of parcelasGrupo) {
            await apagarLancamento(String(p.id));
          }
          setLancamentos((prev) => prev.filter((l) => !parcelasGrupo.some((p) => p.id === l.id)));
          notificarFinanceiroAtualizado();
        },
        acaoCancelar: () => apagarDespesa(String(lanc.id)),
      });
      return;
    }
  }

  const recorrenciaId = (lanc as LancamentoFinanceiro).recorrenciaId;
  if (lanc.tipo === 'fixa' || recorrenciaId) {
    abrirConfirmacao({
      titulo: 'Excluir despesa fixa do mês',
      mensagem: `Esta exclusão remove somente o lançamento deste mês.\n\nPara remover a despesa fixa de todos os meses, acesse "Despesas fixas".`,
      textoConfirmar: 'Excluir este mês',
      textoCancelar: 'Abrir Despesas fixas',
      acao: () => cancelarDespesaFixaDoMes(lanc),
      acaoCancelar: abrirModalDespesasFixas,
    });
    return;
  }

  abrirConfirmacao({
    titulo: 'Excluir lançamento',
    mensagem: `Deseja excluir este lançamento?\n\n${lanc.despesa} - ${formatarMoeda(Number(lanc.valor))}\n\nEssa ação não poderá ser desfeita.`,
    acao: () => apagarDespesa(String(lanc.id)),
  });
};

const excluirEntradaFaturamento = async (entrada: TabelaEntradaFaturamento) => {
  if (entrada.tipo === 'vendas_mobile_sistema' || entrada.tipo === 'recebimentos_sistema') {
    abrirAviso('Receita protegida', 'Esta receita é controlada pelo módulo de origem e não pode ser excluída no Gestão.');
    return;
  }
  if (!podeExcluirLancamentos) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para excluir lançamentos.'
    );
    return;
  }

  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Tente atualizar a página e acessar novamente.'
    );
    return;
  }

  if (!entrada?.id) {
    abrirAviso(
      'Entrada não encontrada',
      'Não foi possível identificar a entrada para exclusão.'
    );
    return;
  }

  const entradaPrevista = entrada.status === 'prevista';

  abrirConfirmacao({
    titulo: 'Excluir entrada',
    mensagem: entradaPrevista
      ? `Deseja excluir a receita prevista "${entrada.origem}" no valor de ${formatarMoeda(Number(entrada.valor || 0))}?`
      : `Deseja excluir a entrada "${entrada.origem}" no valor de ${formatarMoeda(Number(entrada.valor || 0))}?\n\nO valor será descontado do faturamento total do mês.`,
    textoConfirmar: 'Excluir',
    acao: async () => {
      const resultado = await apagarFaturamentoEntrada(String(entrada.id));

      if (resultado.erro) {
        abrirAviso(
          'Erro ao excluir entrada',
          resultado.mensagem || 'Não foi possível excluir a entrada.'
        );
        return;
      }

      // Receita prevista nunca entrou no total efetivado -> nao mexe no faturamento.
      if (entradaPrevista) {
        setFaturamentosEntradas((prev) =>
          prev.filter((item) => item.id !== entrada.id)
        );
        notificarFinanceiroAtualizado();
        return;
      }

      const mesEntrada = entrada.mes || mesAtivo || mesFaturamento;
      const valorEntrada = Number(entrada.valor || 0);
      const totalAtual = faturamentos[mesEntrada] || 0;
      const novoTotal = Math.max(0, totalAtual - valorEntrada);

      const faturamentoSalvo = await salvarFaturamentoBanco({
        empresaId,
        ano: Number(anoSelecionado),
        mes: mesEntrada,
        valor: novoTotal,
      });

      if (!faturamentoSalvo) {
        abrirAviso(
          'Entrada excluída parcialmente',
          'A entrada foi removida, mas não foi possível atualizar o total do mês. Atualize a página e confira o faturamento.'
        );
        return;
      }

      setFaturamentosEntradas((prev) =>
        prev.filter((item) => item.id !== entrada.id)
      );

      setFaturamentos((prev) => ({
        ...prev,
        [mesEntrada]: novoTotal,
      }));
      notificarFinanceiroAtualizado();
    },
  });
};

async function enviarFeedbackVisual() {
  const mensagemLimpa = feedbackMensagem.trim();

  if (!feedbackTipo) {
    abrirAviso(
      'Selecione uma opção',
      'Escolha Sugestões ou Dúvidas antes de enviar.'
    );
    return;
  }

  if (!mensagemLimpa) {
    abrirAviso(
      'Mensagem obrigatória',
      'Escreva sua mensagem antes de enviar.'
    );
    return;
  }

  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Não foi possível identificar a empresa para registrar sua mensagem.'
    );
    return;
  }

  setFeedbackEnviando(true);

  const { data: usuarioLogado } = await supabase.auth.getUser();

  const resultado = await salvarFeedback({
    empresaId,
    usuarioId: usuarioLogado.user?.id || null,
    acessoId: acessoUsuarioAtualId,
    nomeEmpresa: nomeEmpresaAtual,
    nomeUsuario: nomeUsuarioAtual,
    emailUsuario: emailUsuarioAtual,
    tipo: feedbackTipo,
    mensagem: mensagemLimpa,
  });

  setFeedbackEnviando(false);

  if (resultado.erro) {
  abrirAviso(
    'Erro ao registrar mensagem',
    resultado.mensagem,
    undefined,
    'erro'
  );
  return;
}
setFeedbackMensagem('');
setChatFeedbackEtapa('confirmacao');
}

const iniciarEdicaoLancamento = (lanc: TabelaLancamentoDespesa) => {

  if (!podeEditarLancamentos) {
  abrirAviso(
  'Acesso não permitido',
  'Você não tem permissão para editar lançamentos.'
);
  return;
}
  setLancamentoEditandoId(lanc.id);
  setEditDia(String(lanc.dia));
  setEditDespesa(lanc.despesa);
  setEditDescricao(lanc.descricao || '');
  setEditValor(formatarValorCampo(Number(lanc.valor)));
  setEditValorNumerico(Number(lanc.valor));
};

const cancelarEdicaoLancamento = () => {
  setLancamentoEditandoId(null);
  setEditDia('');
  setEditDespesa('');
  setEditDescricao('');
  setEditValor('');
  setEditValorNumerico(0);
};
const handleEntradaFaturamentoValorChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const value = e.target.value.replace(/\D/g, '');

  if (!value) {
    setEntradaFaturamentoValor('');
    setEntradaFaturamentoValorNumerico(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setEntradaFaturamentoValorNumerico(numericValue);
  setEntradaFaturamentoValor(formatarValorCampo(numericValue));
};

const iniciarEdicaoEntradaFaturamento = (entrada: TabelaEntradaFaturamento) => {
  if (entrada.tipo === 'vendas_mobile_sistema' || entrada.tipo === 'recebimentos_sistema') {
    abrirAviso('Receita protegida', 'Esta receita é controlada pelo módulo de origem e não pode ser editada no Gestão.');
    return;
  }
  if (!podeEditarLancamentos) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para editar lançamentos.'
    );
    return;
  }

  setEntradaFaturamentoEditandoId(String(entrada.id));
  setEditEntradaFaturamentoDia(String(entrada.dia || ''));
  setEditEntradaFaturamentoOrigem(entrada.origem || '');
  setEditEntradaFaturamentoValor(formatarValorCampo(Number(entrada.valor || 0)));
  setEditEntradaFaturamentoValorNumerico(Number(entrada.valor || 0));
};

const cancelarEdicaoEntradaFaturamento = () => {
  setEntradaFaturamentoEditandoId(null);
  setEditEntradaFaturamentoDia('');
  setEditEntradaFaturamentoOrigem('');
  setEditEntradaFaturamentoValor('');
  setEditEntradaFaturamentoValorNumerico(0);
};

const handleEditEntradaFaturamentoValorChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const value = e.target.value.replace(/\D/g, '');

  if (!value) {
    setEditEntradaFaturamentoValor('');
    setEditEntradaFaturamentoValorNumerico(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setEditEntradaFaturamentoValorNumerico(numericValue);
  setEditEntradaFaturamentoValor(formatarValorCampo(numericValue));
};

const salvarEdicaoEntradaFaturamento = async () => {
  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Tente atualizar a página e acessar novamente.'
    );
    return;
  }

  if (!entradaFaturamentoEditandoId) return;

  const entradaOriginal = faturamentosEntradas.find(
    (entrada) => entrada.id === entradaFaturamentoEditandoId
  );

  if (!entradaOriginal) {
    abrirAviso(
      'Entrada não encontrada',
      'Não foi possível localizar a entrada para edição.'
    );
    return;
  }

  const mesEntrada = entradaOriginal.mes || mesAtivo;
  const diaNumerico = parseInt(editEntradaFaturamentoDia, 10);
  const origemLimpa = editEntradaFaturamentoOrigem.trim();

  if (!mesEntrada) {
    abrirAviso(
      'Mês não selecionado',
      'Selecione um mês antes de editar a entrada.'
    );
    return;
  }

  const maxDias = getMaxDias(mesEntrada, anoSelecionado);

  if (Number.isNaN(diaNumerico) || diaNumerico < 1 || diaNumerico > maxDias) {
    abrirAviso(
      'Dia inválido',
      `Informe um dia válido entre 1 e ${maxDias}.`
    );
    return;
  }

  if (!origemLimpa || editEntradaFaturamentoValorNumerico < 0) {
    abrirAviso(
      'Campos obrigatórios',
      'Preencha origem e valor antes de salvar a edição.'
    );
    return;
  }

  const eraPrevista = entradaOriginal.status === 'prevista';

  const resultado = await atualizarFaturamentoEntrada({
    id: entradaFaturamentoEditandoId,
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesEntrada,
    dia: diaNumerico,
    origem: origemLimpa,
    valor: editEntradaFaturamentoValorNumerico,
    // Prevista continua prevista ate a confirmacao (status/tipo preservados).
    ...(eraPrevista ? { status: 'prevista', tipoObs: 'previsto' } : {}),
  });

  if (resultado.erro || !resultado.data) {
    abrirAviso(
      'Erro ao editar entrada',
      resultado.mensagem || 'Não foi possível salvar a edição da entrada.'
    );
    return;
  }

  // Receita prevista nao integra o total efetivado -> nao recalcula faturamento.
  if (eraPrevista) {
    setFaturamentosEntradas((prev) =>
      prev.map((entrada) =>
        entrada.id === entradaFaturamentoEditandoId
          ? {
              ...entrada,
              dia: diaNumerico,
              origem: origemLimpa,
              valor: editEntradaFaturamentoValorNumerico,
              status: 'prevista',
              tipo: 'previsto',
            }
          : entrada
      )
    );
    cancelarEdicaoEntradaFaturamento();
    notificarFinanceiroAtualizado();
    return;
  }

  const valorAnterior = Number(entradaOriginal.valor || 0);
  const totalAtual = faturamentos[mesEntrada] || 0;
  const novoTotal = Math.max(
    0,
    totalAtual - valorAnterior + editEntradaFaturamentoValorNumerico
  );

  const faturamentoSalvo = await salvarFaturamentoBanco({
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesEntrada,
    valor: novoTotal,
  });

  if (!faturamentoSalvo) {
    abrirAviso(
      'Entrada editada parcialmente',
      'A entrada foi atualizada, mas não foi possível recalcular o total do mês. Atualize a página e confira o faturamento.'
    );
    return;
  }

  setFaturamentosEntradas((prev) =>
    prev.map((entrada) =>
      entrada.id === entradaFaturamentoEditandoId
        ? {
            ...entrada,
            dia: diaNumerico,
            origem: origemLimpa,
            valor: editEntradaFaturamentoValorNumerico,
          }
        : entrada
    )
  );

  setFaturamentos((prev) => ({
    ...prev,
    [mesEntrada]: novoTotal,
  }));

  cancelarEdicaoEntradaFaturamento();
  notificarFinanceiroAtualizado();
};

const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/\D/g, '');

  if (!value) {
    setFormValor('');
    setValorNumericoRaw(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setValorNumericoRaw(numericValue);
  setFormValor(formatarValorCampo(numericValue));
};
const handleEditValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/\D/g, '');

  if (!value) {
    setEditValor('');
    setEditValorNumerico(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setEditValorNumerico(numericValue);
  setEditValor(formatarValorCampo(numericValue));
};

const salvarEdicaoLancamento = async () => {
  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Tente atualizar a página e acessar novamente.'
  );
  return;
}

  if (!mesAtivo) {
  abrirAviso(
    'Mês não selecionado',
    'Selecione um mês antes de editar o lançamento.'
  );
  return;
}

  if (!lancamentoEditandoId || !editDia || !editDespesa || editValorNumerico <= 0) {
  abrirAviso(
    'Campos obrigatórios',
    'Preencha dia, despesa e valor antes de salvar a edição.'
  );
  return;
}

  const diaNumerico = parseInt(editDia, 10);
  const maxDias = getMaxDias(mesAtivo, anoSelecionado);

  if (Number.isNaN(diaNumerico) || diaNumerico < 1 || diaNumerico > maxDias) {
  abrirAviso(
    'Dia inválido',
    `Informe um dia válido entre 1 e ${maxDias}.`
  );
  return;
}

  const lancamentoAtual = lancamentos.find((item) => String(item.id) === String(lancamentoEditandoId));
  const ehFixaEditada = lancamentoAtual?.tipo === 'fixa' || Boolean(lancamentoAtual?.recorrenciaId);
  const ehParcelaEditada = lancamentoAtual?.tipo === 'parcela';
  const ehFuturaEditada = dataFutura(Number(anoSelecionado), meses.indexOf(mesAtivo), diaNumerico);
  const tipoEditado = ehFixaEditada ? 'fixa' : ehParcelaEditada ? 'parcela' : ehFuturaEditada ? 'previsto' : null;
  const statusEditado = ehParcelaEditada
    ? (lancamentoAtual?.status || null)
    : ehFuturaEditada
      ? 'prevista'
      : ehFixaEditada && lancamentoAtual?.status === 'prevista'
        ? 'confirmada'
        : null;

  const salvo = await atualizarLancamento({
    id: lancamentoEditandoId,
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesAtivo,
    dia: diaNumerico,
    despesaNome: editDespesa,
    descricao: formatarDescricao(editDescricao),
    valor: editValorNumerico,
    status: statusEditado,
    tipoObs: tipoEditado,
  });

  if (!salvo.erro && salvo.data) {
    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === lancamentoEditandoId
          ? {
              ...l,
              mes: salvo.data.mes,
              dia: salvo.data.dia,
              despesa: salvo.data.despesa_nome,
              descricao: salvo.data.descricao || '',
              valor: Number(salvo.data.valor),
              status: salvo.data.status || null,
              tipo: salvo.data.tipo_obs || null,
            }
          : l
      )
    );

    cancelarEdicaoLancamento();
    notificarFinanceiroAtualizado();
  } else {
  abrirAviso(
    'Erro ao atualizar lançamento',
    salvo.mensagem || 'Não foi possível atualizar o lançamento.'
  );
}
};

const abrirModalLogoPeloHeader = () => {
  if (!podeAcessarAjustes) {
    abrirAviso('Acesso não permitido', 'Você não tem permissão para alterar a logomarca da empresa.');
    return;
  }

  setAjustesAberto(false);
  setPainelAvisosAberto(false);
  setModalLogo(true);
};

const limparLogo = async () => {
  const defaultSettings = { scale: 100, x: 0, y: 0 };
  setLogoUrl('');
  setLogoSettings(defaultSettings);
  const salvo = await salvarConfiguracoesBanco({
    empresaId: empresaId!,
    corPrimaria,
    darkMode,
    duplicadosAtivo,
    logoUrl: '',
    logoSettings: defaultSettings,
  });
  if (!salvo) {
    abrirAviso('Erro ao remover logo', 'Não foi possível salvar a remoção do logo.', undefined, 'erro');
    return;
  }
  setModalLogo(false);
};

const ocultarLogo = async () => {
  const defaultSettings = { scale: 100, x: 0, y: 0 };
  setLogoUrl('__blank__');
  setLogoSettings(defaultSettings);
  const salvo = await salvarConfiguracoesBanco({
    empresaId: empresaId!,
    corPrimaria,
    darkMode,
    duplicadosAtivo,
    logoUrl: '__blank__',
    logoSettings: defaultSettings,
  });
  if (!salvo) {
    abrirAviso('Erro ao ocultar logo', 'Não foi possível salvar a configuração.', undefined, 'erro');
    return;
  }
  setModalLogo(false);
};

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Atualize a página e tente novamente.'
  );
  return;
}

  const reader = new FileReader();

  reader.onloadend = async () => {
    const novaLogoUrl = reader.result as string;

setLogoUrl(novaLogoUrl);

// Mantém o modal aberto após escolher a imagem
setModalLogo(true);

const corExtraida = await extrairCorPredominanteLogo(novaLogoUrl);
const novaCorPrimaria = corExtraida || corPrimaria;

if (corExtraida) {
  setCorPrimaria(corExtraida);
  setCorTemporaria(corExtraida);
}

const salvo = await salvarConfiguracoesBanco({
  empresaId,
  corPrimaria: novaCorPrimaria,
  darkMode,
  duplicadosAtivo,
  logoUrl: novaLogoUrl,
  logoSettings,
});

    if (!salvo) {
  abrirAviso(
    'Erro ao salvar logo',
    'Não foi possível salvar o logo no banco.'
  );
  setModalLogo(true);
  return;
}

    // Garante novamente que o modal continue aberto depois do salvamento
    setModalLogo(true);
  };

  reader.readAsDataURL(file);

  // Limpa o input para permitir escolher a mesma imagem novamente se precisar
  e.target.value = '';
};




const backupParams = () => ({
  empresaId: empresaId!,
  nomePerfil: nomeEmpresaAtual,
  tipoPerfil: tipoPerfilAtualNormalizado,
  despesasCadastradas,
  logoUrl,
  logoSettings,
  corPrimaria,
  darkMode,
  duplicadosAtivo,
  abrirAviso,
  setUltimoBackupEm,
  setNomeConfirmacaoExclusao,
  setModalExcluirEmpresa,
});

const recarregarDadosFinanceirosAtual = async () => {
  if (!empresaId) return;

  const ano = Number(anoSelecionado);
  await garantirFixasDoMesAtual(empresaId);
  const [
    despesasBanco,
    lancamentosBanco,
    caixinhaBanco,
    faturamentosBanco,
    faturamentosEntradasBanco,
    recorrenciasBanco,
  ] = await Promise.all([
    buscarDespesasCadastradas(empresaId),
    buscarLancamentos(empresaId, ano),
    buscarCaixinhaMovimentos(empresaId, ano),
    buscarFaturamentos(empresaId, ano),
    buscarFaturamentosEntradas(empresaId, ano),
    buscarRecorrencias(empresaId),
  ]);

  setDespesasCadastradas(
    despesasBanco.map((d: RegistroSupabase) => ({
      nome: formatarNomeCategoria(textoRegistro(d.nome)),
      categoria: formatarNomeCategoria(textoRegistro(d.categoria)),
    }))
  );

  setLancamentos(
    lancamentosBanco.map((l: RegistroSupabase) => ({
      id: String(l.id),
      mes: textoRegistro(l.mes),
      dia: Number(l.dia),
      despesa: formatarNomeCategoria(textoRegistro(l.despesa_nome)),
      descricao: textoRegistro(l.descricao),
      valor: Number(l.valor),
      status: l.status ? textoRegistro(l.status) : null,
      tipo: l.tipo_obs ? textoRegistro(l.tipo_obs) : null,
      recorrenciaId: l.recorrencia_id ? textoRegistro(l.recorrencia_id) : null,
    }))
  );

  setCaixinhaMovimentos(
    caixinhaBanco.map((mov: RegistroSupabase) => ({
      id: String(mov.id),
      lancamentoId: mov.lancamento_id ? textoRegistro(mov.lancamento_id) : null,
      tipo: (textoRegistro(mov.tipo) || 'aporte') as CaixinhaMovimento['tipo'],
      descricao: textoRegistro(mov.descricao),
      valor: Number(mov.valor || 0),
      dataMovimento: textoRegistro(mov.data_movimento),
      criadoEm: textoRegistro(mov.criado_em),
    }))
  );

  setFaturamentosEntradas(
    faturamentosEntradasBanco.map((entrada: RegistroSupabase) => ({
      id: String(entrada.id),
      mes: textoRegistro(entrada.mes),
      dia: Number(entrada.dia),
      origem: textoRegistro(entrada.origem),
      valor: Number(entrada.valor),
      status: entrada.status ? textoRegistro(entrada.status) : null,
      tipo: entrada.tipo_obs ? textoRegistro(entrada.tipo_obs) : null,
      etiquetaOrigem: entrada.origem_etiqueta ? textoRegistro(entrada.origem_etiqueta) : null,
    }))
  );

  const faturamentosFormatados: Record<string, number> = {};
  faturamentosBanco.forEach((f: RegistroSupabase) => {
    faturamentosFormatados[textoRegistro(f.mes)] = Number(f.valor);
  });
  setFaturamentos(faturamentosFormatados);
  setRecorrencias(recorrenciasBanco);
};

const notificarFinanceiroAtualizado = () => {
  // Atualiza a própria tela imediatamente; o broadcast abaixo mantém outras
  // abas e sessões abertas em sincronia.
  void recarregarDadosFinanceirosAtual();
  try {
    financeiroRealtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'financeiro_atualizado',
      payload: { empresaId, origem: 'web', ts: Date.now() },
    });
  } catch (e) {
    console.warn('Não foi possível notificar atualização financeira:', e);
  }
};

// Agenda: carrega itens do localStorage
useEffect(() => {
  const timerAgendaLocal = window.setTimeout(() => {
    try {
      const saved = localStorage.getItem('avantalab_web_agenda_itens');
      if (saved) setAgendaItens(JSON.parse(saved));
    } catch {}
  }, 0);
  return () => window.clearTimeout(timerAgendaLocal);
}, []);

// Agenda: sincroniza com o Supabase quando o perfil esta ativo
useEffect(() => {
  if (!mounted || !empresaId) return;
  const timerAgendaSync = window.setTimeout(() => {
    sincronizarAgendaSupabaseWeb();
  }, 0);
  return () => window.clearTimeout(timerAgendaSync);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId]);

// Módulos: carrega catálogo e ativos quando o perfil esta ativo
useEffect(() => {
  if (!mounted || !empresaId) return;
  const timerModulos = window.setTimeout(() => {
    carregarModulos();
  }, 0);
  return () => window.clearTimeout(timerModulos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId]);

// Financeiro: mantem lancamentos e despesas fixas sincronizados entre web/mobile.
useEffect(() => {
  if (!mounted || !empresaId) return;

  const canalFinanceiro = supabase
    .channel('financeiro_sync_' + empresaId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lancamentos', filter: 'empresa_id=eq.' + empresaId },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'caixinhas_movimentos', filter: 'empresa_id=eq.' + empresaId },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recorrencias', filter: 'empresa_id=eq.' + empresaId },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'faturamentos_entradas', filter: 'empresa_id=eq.' + empresaId },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'faturamentos', filter: 'empresa_id=eq.' + empresaId },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .on(
      'broadcast',
      { event: 'financeiro_atualizado' },
      () => { recarregarDadosFinanceirosAtual(); }
    )
    .subscribe();
  financeiroRealtimeChannelRef.current = canalFinanceiro;

  return () => {
    financeiroRealtimeChannelRef.current = null;
    supabase.removeChannel(canalFinanceiro);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId, anoSelecionado]);

// Controle de ponto: resumo do dia atualizado por Realtime.
useEffect(() => {
  if (!mounted || !empresaId || !podeGerenciarPonto) {
    const timerPontoVazio = window.setTimeout(() => setPontoResumoDia([]), 0);
    return () => window.clearTimeout(timerPontoVazio);
  }

  const timerPonto = window.setTimeout(() => {
    setPontoResumoCarregando(true);
    carregarResumoPontoDashboard();
  }, 0);
  const canal = supabase
    .channel('ponto_dashboard_' + empresaId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ponto_registros', filter: 'empresa_id=eq.' + empresaId },
      () => { carregarResumoPontoDashboard(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ponto_funcionarios', filter: 'empresa_id=eq.' + empresaId },
      () => { carregarResumoPontoDashboard(); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ponto_dias_nao_uteis', filter: 'empresa_id=eq.' + empresaId },
      () => { carregarDiasNaoUteisPonto(); carregarResumoPontoDashboard(); }
    )
    .subscribe();
  const intervalo = window.setInterval(() => { carregarResumoPontoDashboard(); }, 30000);

  return () => {
    window.clearTimeout(timerPonto);
    window.clearInterval(intervalo);
    supabase.removeChannel(canal);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId, podeGerenciarPonto]);

// Agenda: atualiza em tempo real (mudancas em qualquer aparelho)
useEffect(() => {
  if (!mounted || !empresaId) return;
  let canal: ReturnType<typeof supabase.channel> | null = null;
  (async () => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return;
    canal = supabase
      .channel('agenda_itens_web_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_itens', filter: 'user_id=eq.' + userId },
        () => { sincronizarAgendaSupabaseWeb(); }
      )
      .subscribe();
  })();
  return () => { if (canal) supabase.removeChannel(canal); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId]);

// Sininho: carrega notificacoes (avisos) do Supabase + tempo real
useEffect(() => {
  if (!mounted || !empresaId) return;
  const timerNotificacoes = window.setTimeout(() => {
    carregarNotificacoesWeb();
  }, 0);
  let canal: ReturnType<typeof supabase.channel> | null = null;
  (async () => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) return;
    canal = supabase
      .channel('notificacoes_web_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: 'user_id=eq.' + userId },
        () => { carregarNotificacoesWeb(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: 'empresa_id=eq.' + empresaId },
        () => { carregarNotificacoesWeb(); }
      )
      .subscribe();
  })();
  return () => {
    window.clearTimeout(timerNotificacoes);
    if (canal) supabase.removeChannel(canal);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, empresaId]);

// Ao fechar o painel, os avisos visualizados deixam de aparecer no sininho.
useEffect(() => {
  if (painelAvisosAbertoAnterior.current && !painelAvisosAberto) {
    marcarNotificacoesLidasWeb();
  }
  painelAvisosAbertoAnterior.current = painelAvisosAberto;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [painelAvisosAberto]);

const abrirImportacaoBackup = () => {
  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para restaurar dados neste perfil.',
      undefined,
      'erro'
    );
    return;
  }

  setAjustesAberto(false);

  if (backupImportInputRef.current) {
    backupImportInputRef.current.value = '';
    backupImportInputRef.current.click();
  }
};

const fecharModalRestauracaoBackup = () => {
  if (importandoBackup) return;

  setModalRestauracaoBackupAberto(false);
  setBackupRestauracaoArquivo(null);
  setBackupRestauracaoAnalise(null);
  setModoRestauracaoBackup('atualizar');
  setConfirmacaoSubstituirBackup('');
};

const rotuloModoRestauracaoBackup = (modo: ModoImportacaoBackup) => {
  if (modo === 'substituir') return 'Importar copia limpa';
  return 'Atualizar dados';
};

const montarResumoResultadoImportacao = (
  resultado: ResultadoImportacaoBackup,
  modo: ModoImportacaoBackup
) => {
  const totalIgnorados =
    resultado.despesasBaseIgnoradas +
    resultado.lancamentosIgnorados +
    resultado.receitasEntradasIgnoradas +
    resultado.receitasTotaisIgnoradas +
    resultado.recorrenciasIgnoradas;

  const linhas = [
    `Modo usado: ${rotuloModoRestauracaoBackup(modo)}`,
    '',
    `Despesas base adicionadas: ${resultado.despesasBaseInseridas}`,
    `Lancamentos adicionados: ${resultado.lancamentosInseridos}`,
    `Entradas/receitas adicionadas: ${resultado.receitasEntradasInseridas}`,
    `Totais mensais adicionados: ${resultado.receitasTotaisInseridas}`,
    `Despesas fixas adicionadas: ${resultado.recorrenciasInseridas}`,
  ];

  if (modo === 'atualizar') {
    linhas.push(
      '',
      `Despesas base atualizadas: ${resultado.despesasBaseAtualizadas || 0}`,
      `Lancamentos atualizados: ${resultado.lancamentosAtualizados || 0}`,
      `Entradas/receitas atualizadas: ${resultado.receitasEntradasAtualizadas || 0}`,
      `Totais mensais atualizados: ${resultado.receitasTotaisAtualizadas || 0}`,
      `Despesas fixas atualizadas: ${resultado.recorrenciasAtualizadas || 0}`
    );
  }

  if (modo === 'substituir') {
    linhas.push(
      '',
      `Despesas base removidas antes da importacao: ${resultado.despesasBaseRemovidas || 0}`,
      `Lancamentos removidos antes da importacao: ${resultado.lancamentosRemovidos || 0}`,
      `Entradas/receitas removidas antes da importacao: ${resultado.receitasEntradasRemovidas || 0}`,
      `Totais mensais removidos antes da importacao: ${resultado.receitasTotaisRemovidas || 0}`,
      `Despesas fixas removidas antes da importacao: ${resultado.recorrenciasRemovidas || 0}`
    );
  }

  linhas.push('', `Registros ignorados por duplicidade ou dados incompletos: ${totalIgnorados}`);

  return linhas.join('\n');
};

const executarImportacaoBackup = async () => {
  if (!backupRestauracaoArquivo || !empresaId) return;

  if (
    modoRestauracaoBackup === 'substituir' &&
    confirmacaoSubstituirBackup.trim().toUpperCase() !== 'SUBSTITUIR'
  ) {
    abrirAviso(
      'Confirmacao obrigatoria',
      'Para substituir todos os dados financeiros atuais, digite SUBSTITUIR no campo de confirmacao.',
      undefined,
      'alerta'
    );
    return;
  }

  try {
    setImportandoBackup(true);

    await gerarBackupExcel({
      ...backupParams(),
      nomeArquivoPrefixo: 'ponto_restauracao_avantalab',
    });

    const resultado =
      modoRestauracaoBackup === 'substituir'
        ? await importarBackupExcelSubstituir({
            arquivo: backupRestauracaoArquivo,
            empresaId,
          })
        : await importarBackupExcelAtualizar({
            arquivo: backupRestauracaoArquivo,
            empresaId,
          });

    await recarregarDadosFinanceirosAtual();

    const modoUsado = modoRestauracaoBackup;
    setModalRestauracaoBackupAberto(false);
    setBackupRestauracaoArquivo(null);
    setBackupRestauracaoAnalise(null);
    setModoRestauracaoBackup('atualizar');
    setConfirmacaoSubstituirBackup('');

    abrirAviso(
      'Importacao concluida',
      montarResumoResultadoImportacao(resultado, modoUsado),
      undefined,
      'sucesso'
    );
  } catch (error: unknown) {
    console.error('Erro ao executar importacao de backup:', error);
    abrirAviso(
      'Erro ao importar backup',
      (error instanceof Error ? error.message : '') || 'Nao foi possivel importar o arquivo selecionado.',
      undefined,
      'erro'
    );
  } finally {
    setImportandoBackup(false);
  }
};

const selecionarArquivoBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const arquivo = e.target.files?.[0];
  e.target.value = '';

  if (!arquivo || !empresaId) return;

  try {
    const analise = await analisarBackupExcel(arquivo);

    if (!analise.valido) {
      abrirAviso(
        'Backup inválido',
        analise.erros.join('\n') || 'O arquivo selecionado não pôde ser importado.',
        undefined,
        'erro'
      );
      return;
    }

    setBackupRestauracaoArquivo(arquivo);
    setBackupRestauracaoAnalise(analise);
    setModoRestauracaoBackup('atualizar');
    setConfirmacaoSubstituirBackup('');
    setModalRestauracaoBackupAberto(true);
    return;

    /*
    const resumo = [
      `Arquivo: ${analise.nomeArquivo}`,
      `Perfil de origem: ${analise.perfilOrigem || 'Não identificado'}`,
      `Versão do backup: ${analise.versaoBackup || 'Não identificada'}`,
      '',
      `Despesas base: ${analise.totalDespesasBase}`,
      `Lançamentos de despesas: ${analise.totalLancamentos}`,
      `Entradas/receitas: ${analise.totalReceitasEntradas}`,
      `Totais mensais de receita: ${analise.totalReceitasTotais}`,
      `Despesas fixas: ${analise.totalRecorrencias}`,
      '',
      'Modo desta etapa: adicionar somente dados ausentes. Dados existentes não serão substituídos.',
      'Antes da importação, o sistema vai baixar um ponto de restauração do estado atual.',
      ...(analise.avisos.length ? ['', ...analise.avisos] : []),
    ].join('\n');

    abrirConfirmacao({
      titulo: 'Importar backup',
      mensagem: resumo,
      textoConfirmar: 'Importar dados',
      acao: async () => {
        try {
          await gerarBackupExcel({
            ...backupParams(),
            nomeArquivoPrefixo: 'ponto_restauracao_avantalab',
          });

          const resultado = await importarBackupExcelAdicionar({
            arquivo: arquivo!,
            empresaId: empresaId!,
          });

          await recarregarDadosFinanceirosAtual();

          abrirAviso(
            'Importação concluída',
            [
              `Despesas base adicionadas: ${resultado.despesasBaseInseridas}`,
              `Lançamentos adicionados: ${resultado.lancamentosInseridos}`,
              `Entradas/receitas adicionadas: ${resultado.receitasEntradasInseridas}`,
              `Totais mensais adicionados: ${resultado.receitasTotaisInseridas}`,
              `Despesas fixas adicionadas: ${resultado.recorrenciasInseridas}`,
              '',
              `Registros ignorados por já existirem ou por dados incompletos: ${
                resultado.despesasBaseIgnoradas +
                resultado.lancamentosIgnorados +
                resultado.receitasEntradasIgnoradas +
                resultado.receitasTotaisIgnoradas +
                resultado.recorrenciasIgnoradas
              }`,
            ].join('\n'),
            undefined,
            'sucesso'
          );
        } catch (error: unknown) {
          console.error('Erro ao executar importação de backup:', error);
          abrirAviso(
            'Erro ao importar backup',
            (error instanceof Error ? error.message : '') || 'Não foi possível importar o arquivo selecionado.',
            undefined,
            'erro'
          );
        }
      },
    });
    */
  } catch (error: unknown) {
    console.error('Erro ao importar backup:', error);
    abrirAviso(
      'Erro ao importar backup',
      (error instanceof Error ? error.message : '') || 'Não foi possível importar o arquivo selecionado.',
      undefined,
      'erro'
    );
  }
};

const backupPendente = useMemo(() => {
  const hoje = new Date();

  const primeiroDiaMesAtual = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  );

  if (!ultimoBackupEm) {
    return true;
  }

  const dataUltimoBackup = new Date(ultimoBackupEm);

  return dataUltimoBackup < primeiroDiaMesAtual;
}, [ultimoBackupEm]);

const alertasSistema = useMemo(() => {
  const alertas: {
    id: string;
    titulo: string;
    mensagem: string;
    acaoTexto?: string;
    acao?: () => void | Promise<void>;
    naoLida?: boolean;
  }[] = [];

  // Avisos/novidades vindos do Supabase aparecem no sininho apenas enquanto nao foram visualizados.
  notificacoesWeb.filter((n) => !n.lida).forEach((n) => {
    alertas.push({ id: 'notif-' + n.id, titulo: n.titulo, mensagem: n.corpo, naoLida: !n.lida });
  });

  if (podeAcessarAjustes && solicitacoesAprovacao.length > 0) {
    const quantidade = solicitacoesAprovacao.length;
    alertas.unshift({
      id: 'aprovacoes-vendas-pendentes',
      titulo: `${quantidade} aprovação${quantidade > 1 ? 'ões' : ''} pendente${quantidade > 1 ? 's' : ''}`,
      mensagem: `${quantidade === 1 ? 'Há uma solicitação' : 'Há solicitações'} aguardando acesso ao Vendas Mobile deste perfil.`,
      acaoTexto: 'Ver aprovações',
      acao: abrirAprovacoes,
      naoLida: true,
    });
  }

  if (backupPendente && !recursoBloqueado('exportacao')) {
    alertas.push({
      id: 'backup-pendente',
      titulo: 'Backup recomendado',
      mensagem:
        'Recomendamos gerar um backup local dos dados da empresa após o encerramento de cada mês.',
      acaoTexto: 'Gerar backup agora',
      acao: () => gerarBackupExcel(backupParams()),
      naoLida: true,
    });
  }

  if (emCarencia(estadoAcesso)) {
    alertas.unshift({
      id: 'cobranca-carencia',
      titulo: 'Pagamento pendente',
      mensagem: `Regularize a assinatura até ${new Date(estadoAcesso!.validoAte!).toLocaleDateString('pt-BR')} para evitar o bloqueio do perfil.`,
      acaoTexto: 'Ver assinatura',
      acao: () => setModalAssinatura(true),
      naoLida: true,
    });
  }

  return alertas;
}, [abrirAprovacoes, backupPendente, estadoAcesso, notificacoesWeb, podeAcessarAjustes, solicitacoesAprovacao.length]);

  const analiseDespesas = (() => {
  const totais: Record<string, { nome: string; valor: number }> = {};

  lancamentosDoMes.forEach((l) => {
    const despesaBase = despesasCadastradas.find(
      (d) => normalizarTexto(d.nome) === normalizarTexto(l.despesa)
    );

    const nomeFinal = despesaBase ? despesaBase.nome : l.despesa;
    const chave = normalizarTexto(nomeFinal);

    if (!totais[chave]) {
      totais[chave] = {
        nome: nomeFinal,
        valor: 0,
      };
    }

    totais[chave].valor += Number(l.valor || 0);
  });

  const cores = [
    corPrimaria,
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
  ];

  const dadosGrafico = Object.values(totais)
    .sort((a, b) => b.valor - a.valor)
    .map((item, index) => ({
      nome: item.nome,
      valor: item.valor,
      percentual: totalDespesasMes > 0 ? (item.valor / totalDespesasMes) * 100 : 0,
      cor: cores[index % cores.length],
    }));

  const conicParts = dadosGrafico.reduce<{ partes: string[]; angulo: number }>(
    (acc, item) => {
      const inicio = acc.angulo;
      const fim = inicio + item.percentual;
      return {
        partes: [...acc.partes, `${item.cor} ${inicio}% ${fim}%`],
        angulo: fim,
      };
    },
    { partes: [], angulo: 0 }
  ).partes;

  return {
    dados: dadosGrafico,
    gradiente: `conic-gradient(${conicParts.join(', ')})`,
  };
})();

  const bgMain = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';

  const classePaginaInterna =
  'av-page mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-hidden px-3 pb-8 pt-3 sm:px-5 lg:px-6 xl:px-8';

const classeConteudoPagina =
  'w-full [&>*:first-child]:!mt-0 [&>*:first-child]:!pt-0';


const abrirCriacaoNovaEmpresa = () => {
  // Qualquer usuario autenticado pode criar seu proprio perfil (empresa ou pessoal).
  // Na tela de seleção de perfil nenhum perfil está carregado ainda, então
  // perfilUsuario é nulo — nesse caso também liberamos (o usuário está logado).
  const podeCriarEmpresa =
    !perfilUsuario ||
    perfilUsuario === 'gestor_master' ||
    perfilUsuario === 'administrador' ||
    perfilUsuario === 'operador_completo' ||
    perfilUsuario === 'operador_simples';

  if (!podeCriarEmpresa) {
    abrirAviso(
      'Acesso não permitido',
      'Não foi possível identificar seu acesso. Faça login novamente.'
    );
    return;
  }

  setNomeEmpresaInicial('');
  setTipoPerfilInicial('empresa');
  setAuthErro('');
  setAuthMensagem('');
  setModalSelecionarEmpresa(false);
  setAjustesAberto(false);
  setPainelAvisosAberto(false);

  setCriandoNovaEmpresaLogada(true);

  setAcessoNaoConfigurado(true);
  setAcessoLiberado(false);
};

const abrirTrocaEmpresa = () => {
  setAjustesAberto(false);
  setPainelAvisosAberto(false);
  setModoSelecaoPerfil('troca');

  const empresasEmCache = empresasDoUsuario.filter(
    (empresa): empresa is NonNullable<typeof empresa> => Boolean(empresa)
  );

  if (empresasEmCache.length > 1) {
    setEmpresaParaSelecionar(
      empresasEmCache.find((empresa) => empresa.id !== empresaId) || null
    );
    setModalSelecionarEmpresa(true);
  }

  void (async () => {
    const { data: usuarioLogado } = await supabase.auth.getUser();
    const usuarioId = usuarioLogado.user?.id;

    if (!usuarioId) {
      if (empresasEmCache.length === 0) {
        abrirAviso(
          'Sessao nao encontrada',
          'Entre novamente para carregar suas empresas vinculadas.'
        );
      }
      return;
    }

    let empresasAtualizadas;
    try {
      empresasAtualizadas = (await buscarEmpresasDoUsuario(usuarioId)).filter(
        (empresa): empresa is NonNullable<typeof empresa> => Boolean(empresa)
      );
    } catch (e) {
      console.error('Erro ao carregar empresas para troca:', e);
      if (empresasEmCache.length === 0) {
        abrirAviso('Não foi possível carregar', 'Houve uma falha ao buscar suas empresas. Tente novamente em instantes.');
      }
      return;
    }

    setEmpresasDoUsuario(empresasAtualizadas);

    if (empresasAtualizadas.length <= 1) {
      if (empresasEmCache.length === 0) {
        abrirAviso(
          'Troca indisponível',
          'Este usuário possui acesso a apenas uma empresa no momento.'
        );
      }
      return;
    }

    setEmpresaParaSelecionar(
      empresasAtualizadas.find((empresa) => empresa.id !== empresaId) || null
    );
    setModalSelecionarEmpresa(true);
  })();
};

const confirmarExclusaoEmpresaAtual = () => {
  if (perfilUsuario !== 'gestor_master') {
    abrirAviso(
      'Acesso não permitido',
      'Somente o Gestor Master pode excluir a empresa atual.'
    );
    return;
  }

  if (!empresaId || !nomeEmpresaAtual) {
    abrirAviso(
      'Empresa não carregada',
      'Não foi possível identificar a empresa atual.'
    );
    return;
  }

  abrirConfirmacao({
  titulo: 'Backup antes da exclusão',
  mensagem:
    `Antes de excluir a empresa "${nomeEmpresaAtual}", o sistema vai tentar gerar um backup local dos dados.\n\nSe não houver dados para backup, você verá um aviso. Depois que fechar o aviso, a tela final de confirmação será aberta.\n\nDeseja continuar?`,
  textoConfirmar: 'Fazer backup',
  acao: async () => {
    setModalConfirmacaoAberto(false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    await gerarBackupExcel({ ...backupParams(), abrirExclusaoDepois: true });
  },
});
};

const executarExclusaoEmpresaAtual = async () => {
  if (!empresaId || !nomeEmpresaAtual) {
    abrirAviso(
      'Empresa não carregada',
      'Não foi possível identificar a empresa atual.'
    );
    return;
  }

  const nomeDigitado = nomeConfirmacaoExclusao.trim();

  if (nomeDigitado !== nomeEmpresaAtual) {
    abrirAviso(
      'Nome incorreto',
      'Digite exatamente o nome da empresa para confirmar a exclusão.'
    );
    return;
  }

  setExcluindoEmpresa(true);

  const { error } = await supabase.rpc('excluir_empresa_rpc', {
    p_empresa_id: empresaId,
    p_nome_confirmacao: nomeDigitado,
  });

  if (error) {
    console.error('Erro ao excluir empresa:', error);

    setExcluindoEmpresa(false);

    abrirAviso(
      'Erro ao excluir empresa',
      error.message || 'Não foi possível excluir a empresa atual.'
    );

    return;
  }

  const { data: usuarioLogado } = await supabase.auth.getUser();

  if (!usuarioLogado.user) {
    setExcluindoEmpresa(false);
    await handleLogout();
    return;
  }

  let empresasRestantes: EmpresaUsuarioResumo[];
  try {
    const empresasBusca = await buscarEmpresasDoUsuario(usuarioLogado.user.id);
    empresasRestantes = empresasBusca.filter(
      (empresa): empresa is NonNullable<(typeof empresasBusca)[number]> => Boolean(empresa)
    ) as EmpresaUsuarioResumo[];
  } catch (e) {
    console.error('Erro ao recarregar empresas após exclusão:', e);
    setExcluindoEmpresa(false);
    setModalExcluirEmpresa(false);
    abrirAviso('Empresa excluída', 'A empresa foi excluída. Recarregando o sistema...');
    setTimeout(() => window.location.reload(), 1200);
    return;
  }

  setModalExcluirEmpresa(false);
  setNomeConfirmacaoExclusao('');
  setExcluindoEmpresa(false);

  setEmpresaId(null);
  setTipoPerfilAtual('empresa');
  setNomeEmpresaAtual('');
  setPerfilUsuario(null);
  setLogoUrl('');
  setLogoSettings({ scale: 100, x: 0, y: 0 });
  setDespesasCadastradas([]);
  setLancamentos([]);
  setCaixinhaMovimentos([]);
  setFaturamentos({});

  if (!empresasRestantes || empresasRestantes.length === 0) {
    setEmpresasDoUsuario([]);
    setCriandoNovaEmpresaLogada(false);
    setAcessoNaoConfigurado(true);
    setAcessoLiberado(false);
    return;
  }

  setEmpresasDoUsuario(empresasRestantes);

  if (empresasRestantes.length === 1) {
    await carregarEmpresaSelecionada(empresasRestantes[0]);

    abrirAviso(
      'Empresa excluída',
      'A empresa foi excluída com sucesso. O sistema carregou a empresa restante.'
    );

    return;
  }

  setEmpresaParaSelecionar(empresasRestantes[0]);
  setModoSelecaoPerfil('entrada');
  setModalSelecionarEmpresa(true);
  setAcessoNaoConfigurado(false);
  setAcessoLiberado(true);

  abrirAviso(
    'Empresa excluída',
    'A empresa foi excluída com sucesso. Selecione outra empresa para continuar.'
  );
};

const confirmarLogout = () => {
  abrirConfirmacao({
    titulo: 'Sair do sistema',
    mensagem: 'Deseja realmente sair da sua conta?',
    textoConfirmar: 'Sair',
    acao: async () => {
      await handleLogout();
    },
  });
};

const sairDaSelecaoEmpresa = async () => {
  if (modoSelecaoPerfil === 'troca') {
    setModalSelecionarEmpresa(false);
    setEmpresaParaSelecionar(null);
    setModoSelecaoPerfil('entrada');
    return;
  }

  setModalSelecionarEmpresa(false);
  setEmpresaParaSelecionar(null);
  setEmpresasDoUsuario([]);
  setAcessoLiberado(false);
  setAcessoNaoConfigurado(false);
  setCriandoNovaEmpresaLogada(false);

  await handleLogout();
};

const handleLogout = async () => {
  logoutManualEmCursoRef.current = true;
  try { await supabase.auth.signOut({ scope: 'local' }); } catch {}

  localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);

setAcessoLiberado(false);
setAcessoNaoConfigurado(false);
setValidacaoTelefoneObrigatoria(false);
setModoRedefinirSenha(false);
setModoAuth('login');
setMostrarLandingPreLogin(true);

setEmpresaId(null);
setNomeEmpresaAtual('');
setNomeUsuarioAtual('');
setEmailUsuarioAtual('');
setAcessoUsuarioAtualId(null);
setPerfilUsuario(null);
setEmpresasDoUsuario([]);
setEmpresaParaSelecionar(null);

setModalSelecionarEmpresa(false);
setModalEmpresasAberto(false);
setModalExcluirEmpresa(false);
setModalUsuarios(false);
setAjustesAberto(false);
setMenuResponsivoAberto(false);
setPainelAvisosAberto(false);

setChatFeedbackAberto(false);
setFeedbackTipo(null);
setFeedbackMensagem('');
setFeedbackEnviando(false);
setChatFeedbackEtapa('inicio');

setLancamentos([]);
setCaixinhaMovimentos([]);
setFaturamentos({});
setDespesasCadastradas([]);

setLogoUrl('');
setLogoSettings({ scale: 100, x: 0, y: 0 });
setCorPrimaria('#003E73');
setCorTemporaria('#003E73');
setDarkMode(false);
setDuplicadosAtivo(true);
setUltimoBackupEm(null);
setConfiguracoesCarregadas(false);

setMesAtivo(null);
setAbaAtiva('Dashboard');
setAnoSelecionado(new Date().getFullYear().toString());

setLoginEmail('');
setLoginSenha('');
setCadastroNome('');
setCadastroNomeEmpresa('');
setCadastroEmail('');
setCadastroTelefone('');
setCadastroSenha('');
setCadastroConfirmarSenha('');
setCodigoSmsCadastro('');
setSmsCadastroEnviado(false);

setNovaSenha('');
setConfirmarNovaSenha('');
setCodigoSmsRedefinirSenha('');
setSmsRedefinirSenhaEnviado(false);

setAuthErro('');
setAuthMensagem('');

  setAcessoLiberado(false);
setPerfilUsuario(null);
setEmpresaId(null);
setAcessoUsuarioAtualId(null);
  setAcessoNaoConfigurado(false);
  setModoRedefinirSenha(false);
  setModoAuth('login');

  setLoginEmail('');
  setLoginSenha('');

  setNovaSenha('');
  setConfirmarNovaSenha('');

  setValidacaoTelefoneObrigatoria(false);
setEmpresaAguardandoTelefone(null);
setTelefoneObrigatorio('');
setCodigoSmsTelefoneObrigatorio('');
setSmsTelefoneObrigatorioEnviado(false);
setTelefoneObrigatorioConfirmado('');
setSegundosReenvioTelefoneObrigatorio(0);
setReenviandoTelefoneObrigatorio(false);
setValidandoTelefoneObrigatorio(false);

  setAuthErro('');
  setAuthMensagem('');
  window.setTimeout(() => { logoutManualEmCursoRef.current = false; }, 0);
};

const encerrarSessaoExpirada = async () => {
  if (encerrandoSessaoRef.current) return;
  encerrandoSessaoRef.current = true;
  try {
    await handleLogout();
    setMostrarLandingPreLogin(false);
    setModoAuth('login');
    setAuthErro('Sua sessão expirou. Entre novamente para continuar.');
    setAuthMensagem('');
  } finally {
    encerrandoSessaoRef.current = false;
  }
};

const quantidadeLancamentosMes = lancamentosFiltradosDoMes.length;

const alturaMaximaTabelaLancamentos = Math.max(
  ALTURA_PADRAO_TABELA,
  quantidadeLancamentosMes * ALTURA_LINHA_LANCAMENTO
);

const alturaFinalTabelaLancamentos = Math.min(
  alturaTabelaLancamentos,
  alturaMaximaTabelaLancamentos
);


// Helpers usados em enviarCodigoTelefoneObrigatorio e reenvio
const lerRespostaApi = async (resposta: Response) => {
  try {
    return await resposta.json();
  } catch {
    return {};
  }
};

const mensagemSmsAmigavel = (
  mensagemTecnica?: string,
  tipo: 'enviar' | 'reenviar' | 'verificar' | 'redefinir' = 'enviar'
) => {
  const texto = String(mensagemTecnica || '').toLowerCase();
  if (
    texto.includes('twilio') || texto.includes('configuração') ||
    texto.includes('configuracao') || texto.includes('environment') ||
    texto.includes('env') || texto.includes('token') ||
    texto.includes('sid') || texto.includes('auth')
  ) {
    return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
  }
  if (texto.includes('rate limit') || texto.includes('too many requests') ||
      texto.includes('limite') || texto.includes('many attempts')) {
    return 'Por segurança, existe um limite temporário de tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (texto.includes('telefone') || texto.includes('phone') ||
      texto.includes('number') || texto.includes('invalid')) {
    return 'Informe um celular válido com DDD.';
  }
  if (tipo === 'verificar') return 'Código inválido ou expirado. Verifique o código recebido ou solicite um novo.';
  if (tipo === 'redefinir') return 'Não foi possível redefinir a senha neste momento. Tente novamente em alguns minutos.';
  if (tipo === 'reenviar') return 'Não foi possível reenviar o SMS neste momento. Tente novamente em alguns minutos.';
  return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
};

const enviarCodigoTelefoneObrigatorio = async () => {
  if (validandoTelefoneObrigatorio) return;

  const telefoneLimpo = telefoneObrigatorio.replace(/\D/g, '');
  const ddiObrig = (ddiTelefoneObrigatorio || '55').replace(/\D/g, '') || '55';
  const telefoneObrigE164 = `+${ddiObrig}${telefoneLimpo}`;
  const ehBrasilObrig = ddiObrig === '55';

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (ehBrasilObrig ? (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) : (telefoneLimpo.length < 6 || telefoneLimpo.length > 15)) {
    setAuthErro(ehBrasilObrig ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido para o país selecionado.');
    return;
  }

  setAuthErro('');
  setAuthMensagem('');
  setValidandoTelefoneObrigatorio(true);

  const respostaSms = await fetch('/api/sms/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telefone: telefoneObrigE164,
    }),
  });

  const resultadoSms = await lerRespostaApi(respostaSms);

  setValidandoTelefoneObrigatorio(false);

  if (!respostaSms.ok || resultadoSms.erro) {
  setAuthErro(mensagemSmsAmigavel(resultadoSms.mensagem, 'enviar'));
  return;
}

  setSmsTelefoneObrigatorioEnviado(true);
  setTelefoneObrigatorioConfirmado(telefoneLimpo);
  setCodigoSmsTelefoneObrigatorio('');
  setSegundosReenvioTelefoneObrigatorio(60);
  setAuthMensagem('Enviamos um código por SMS. Digite o código recebido para confirmar seu celular.');
};

const reenviarCodigoTelefoneObrigatorio = async () => {
  if (reenviandoTelefoneObrigatorio || segundosReenvioTelefoneObrigatorio > 0) return;

  const telefoneLimpo = telefoneObrigatorio.replace(/\D/g, '');
  const ddiObrig = (ddiTelefoneObrigatorio || '55').replace(/\D/g, '') || '55';
  const telefoneObrigE164 = `+${ddiObrig}${telefoneLimpo}`;
  const ehBrasilObrig = ddiObrig === '55';

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (ehBrasilObrig ? (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) : (telefoneLimpo.length < 6 || telefoneLimpo.length > 15)) {
    setAuthErro(ehBrasilObrig ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido para o país selecionado.');
    return;
  }

  setAuthErro('');
  setAuthMensagem('');
  setReenviandoTelefoneObrigatorio(true);

  const respostaSms = await fetch('/api/sms/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telefone: telefoneObrigE164,
    }),
  });

  const resultadoSms = await lerRespostaApi(respostaSms);

  setReenviandoTelefoneObrigatorio(false);

  if (!respostaSms.ok || resultadoSms.erro) {
  setAuthErro(mensagemSmsAmigavel(resultadoSms.mensagem, 'reenviar'));
  return;
}

  setSmsTelefoneObrigatorioEnviado(true);
  setTelefoneObrigatorioConfirmado(telefoneLimpo);
  setCodigoSmsTelefoneObrigatorio('');
  setSegundosReenvioTelefoneObrigatorio(60);
  setAuthMensagem('Reenviamos o código por SMS. Digite o código mais recente para confirmar seu celular.');
};

const confirmarTelefoneObrigatorio = async () => {
  if (!empresaAguardandoTelefone?.acessoId) {
    setAuthErro('Não foi possível identificar seu acesso. Saia e entre novamente.');
    return;
  }

  const telefoneLimpo = telefoneObrigatorio.replace(/\D/g, '');
  const ddiObrig = (ddiTelefoneObrigatorio || '55').replace(/\D/g, '') || '55';
  const telefoneObrigE164 = `+${ddiObrig}${telefoneLimpo}`;
  const ehBrasilObrig = ddiObrig === '55';

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (ehBrasilObrig ? (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) : (telefoneLimpo.length < 6 || telefoneLimpo.length > 15)) {
    setAuthErro(ehBrasilObrig ? 'Informe um celular válido com DDD.' : 'Informe um número de celular válido para o país selecionado.');
    return;
  }

  if (!smsTelefoneObrigatorioEnviado) {
    await enviarCodigoTelefoneObrigatorio();
    return;
  }

  if (!codigoSmsTelefoneObrigatorio.trim()) {
    setAuthErro('Digite o código recebido por SMS.');
    return;
  }

  if (telefoneLimpo !== telefoneObrigatorioConfirmado) {
    setAuthErro(
      'O número de celular foi alterado. Solicite um novo código antes de confirmar.'
    );
    setSmsTelefoneObrigatorioEnviado(false);
    setCodigoSmsTelefoneObrigatorio('');
    setTelefoneObrigatorioConfirmado('');
    return;
  }

  setAuthErro('');
  setAuthMensagem('');
  setValidandoTelefoneObrigatorio(true);

  const respostaVerificacaoSms = await fetch('/api/sms/verificar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telefone: telefoneObrigE164,
      codigo: codigoSmsTelefoneObrigatorio.trim(),
    }),
  });

const resultadoVerificacaoSms = await lerRespostaApi(respostaVerificacaoSms);

  if (!respostaVerificacaoSms.ok || resultadoVerificacaoSms.erro) {
  setAuthErro(mensagemSmsAmigavel(resultadoVerificacaoSms.mensagem, 'verificar'));
  setValidandoTelefoneObrigatorio(false);
  return;
}

  const resultadoAtualizacao = await atualizarTelefoneUsuarioEmpresa({
    acessoId: empresaAguardandoTelefone.acessoId,
    telefone: telefoneLimpo,
  });

  if (resultadoAtualizacao.erro) {
    setAuthErro(resultadoAtualizacao.mensagem);
    setValidandoTelefoneObrigatorio(false);
    return;
  }

  const empresaLiberada = {
    ...empresaAguardandoTelefone,
    telefone: telefoneLimpo,
    telefone_confirmado: true,
    telefone_confirmado_em: new Date().toISOString(),
  };

  setEmpresasDoUsuario((empresasAtuais) =>
    empresasAtuais.map((empresa) => ({
      ...empresa,
      telefone: telefoneLimpo,
      telefone_confirmado: true,
      telefone_confirmado_em: empresaLiberada.telefone_confirmado_em,
    }))
  );
  setEmpresaParaSelecionar((empresaAtual: EmpresaUsuarioResumo | null) =>
    empresaAtual
      ? {
          ...empresaAtual,
          telefone: telefoneLimpo,
          telefone_confirmado: true,
          telefone_confirmado_em: empresaLiberada.telefone_confirmado_em,
        }
      : empresaAtual
  );

  setValidacaoTelefoneObrigatoria(false);
  setEmpresaAguardandoTelefone(null);
  setTelefoneObrigatorio('');
  setCodigoSmsTelefoneObrigatorio('');
  setSmsTelefoneObrigatorioEnviado(false);
  setTelefoneObrigatorioConfirmado('');
  setSegundosReenvioTelefoneObrigatorio(0);
  setReenviandoTelefoneObrigatorio(false);
  setAuthErro('');
  setAuthMensagem('');

  setValidandoTelefoneObrigatorio(false);

  await carregarEmpresaSelecionada(empresaLiberada);
};

const usuarioOriginalEditando = usuariosEmpresa.find(
  (usuario) => usuario.id === usuarioEditandoId
);

const dadosUsuarioAlterados = usuarioOriginalEditando
  ? editUsuarioNome.trim() !== (usuarioOriginalEditando.nome || '').trim() ||
    editUsuarioLogin.trim().toLowerCase() !== (usuarioOriginalEditando.login || '').toLowerCase() ||
    editUsuarioEmail.trim().toLowerCase() !== (String(usuarioOriginalEditando.email || '').includes('@usuarios.avantalab.local') ? '' : usuarioOriginalEditando.email || '').toLowerCase() ||
    editUsuarioPerfil !== usuarioOriginalEditando.perfil
  : false;

const indiceMesMobile = meses.indexOf(mesParaAnalise);
const mesAnteriorMobile =
  indiceMesMobile > 0 ? meses[indiceMesMobile - 1] : null;
const proximoMesMobile =
  indiceMesMobile >= 0 && indiceMesMobile < meses.length - 1
    ? meses[indiceMesMobile + 1]
    : null;

const mudarMesMobile = (mes: string) => {
  setMesResumoDash(mes);
  setMesAtivo(mes);
  setMesFaturamento(mes);
  setBuscaLancamento('');
  setBuscaEntradaFaturamento('');
  setLancamentoEditandoId(null);
  setEntradaFaturamentoEditandoId(null);
  setFormDia('');
  setFormDespesa('');
  setFormDescricao('');
  setFormValor('');
  setValorNumericoRaw(0);
  setEntradaFaturamentoDia('');
  setEntradaFaturamentoOrigem('');
  setEntradaFaturamentoValor('');
  setEntradaFaturamentoValorNumerico(0);
};

const lancamentosMobile = [...lancamentosDoMes].sort(
  (a, b) => Number(b.dia) - Number(a.dia)
);
const categoriasMobile = analiseDespesas.dados.slice(0, 4);

if (!mounted || carregandoSistema || authLoading || googleLoading) {
  return (
    <TelaCarregandoSistema
      mensagem={
        authLoading || googleLoading
          ? 'Entrando e preparando seus dados...'
          : mensagemCarregamentoSistema
      }
    />
  );
}

const mostrarLandingPreLoginAtiva =
  mostrarLandingPreLogin &&
  !modoRedefinirSenha &&
  modoAuth === 'login' &&
  !authErro &&
  !authMensagem;

if (emailConfirmado) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))" }}
      />

      <div
        className="absolute inset-0 bg-no-repeat lg:hidden"
        style={{
          backgroundImage: "image-set(url('/images/bg-avantalab-mobile.webp') type('image/webp'), url('/images/bg-avantalab-mobile.png') type('image/png'))",
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />

      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <h1 className="text-2xl font-black leading-tight text-slate-900">
  Cadastro confirmado com sucesso
</h1>

<p className="mt-4 text-sm leading-relaxed text-slate-600">
  Seu cadastro foi validado. Agora você já pode acessar o sistema usando seu email e senha.
</p>

          <button
            type="button"
            onClick={() => {
  setEmailConfirmado(false);
  setAcessoNaoConfigurado(false);
  setModoRedefinirSenha(false);
  setModoAuth('login');
  setAcessoLiberado(false);
  setAuthErro('');
  setAuthMensagem('');
  setLoginEmail('');
  setLoginSenha('');
}}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            Ir para o login
          </button>
        </div>
      </section>
    </main>
  );
}

if (acessoNaoConfigurado) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <div
        className={`absolute inset-0 ${
          isTelaMobile ? 'bg-no-repeat' : 'bg-cover bg-center'
        }`}
        style={{
          backgroundImage: isTelaMobile
            ? "image-set(url('/images/bg-avantalab-mobile.webp') type('image/webp'), url('/images/bg-avantalab-mobile.png') type('image/png'))"
            : "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))",
          backgroundSize: isTelaMobile ? 'cover' : undefined,
          backgroundPosition: isTelaMobile ? 'center bottom' : 'center',
        }}
      />

      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-5 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
  <svg
    className="h-8 w-8 text-sky-800"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"
    />
  </svg>
</div>

<p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
  AvantaLab Gestão
</p>

<h1 className="text-2xl font-black leading-tight text-slate-900">
  {criandoNovaEmpresaLogada
  ? 'Criar novo perfil'
  : 'Criar perfil financeiro'}
</h1>

<p className="mt-4 text-sm leading-relaxed text-slate-600">
  {criandoNovaEmpresaLogada
    ? 'Informe o tipo e o nome do novo perfil financeiro.'
    : 'Sua conta foi confirmada, mas ainda não existe um perfil financeiro vinculado a este acesso. Crie o primeiro perfil para iniciar a gestão.'}
</p>

<div className="mt-6 text-left">
  <label className="mb-1 block text-sm font-semibold text-slate-700">
    {labelNomePerfilInicial}
  </label>

  <input
    type="text"
    value={nomeEmpresaInicial}
    onChange={(e) => setNomeEmpresaInicial(e.target.value)}
    placeholder={placeholderPerfilInicial}
    className="mb-4 w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />

  <label className="mb-1 block text-sm font-semibold text-slate-700">
    Tipo do perfil
  </label>

  <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
    {(['empresa', 'pessoal'] as TipoPerfil[]).map((tipo) => {
      const ativo = tipoPerfilInicialNormalizado === tipo;

      return (
        <button
          key={tipo}
          type="button"
          onClick={() => setTipoPerfilInicial(tipo)}
          className={`rounded-lg px-3 py-2 text-sm font-black uppercase tracking-wide transition ${
            ativo
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-500 hover:bg-white hover:text-slate-800'
          }`}
        >
          {rotuloTipoPerfil(tipo)}
          {tipo === 'pessoal' && criandoNovaEmpresaLogada && criarPerfilPessoalBloqueado() && <span className="ml-1 text-xs" title="Recurso Premium">🔒</span>}
        </button>
      );
    })}
  </div>

  {COBRANCA_ATIVA && tipoPerfilInicialNormalizado === 'empresa' && (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-xs font-bold leading-snug text-sky-900">
        Perfil empresa tem <b>7 dias grátis</b>. Depois: R$ 34,90/mês, ou R$ 29,00/mês no plano anual.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(['trial', 'assinar'] as const).map((m) => {
          const ativo = inicioEmpresaModo === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setInicioEmpresaModo(m)}
              className={`rounded-lg px-2 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                ativo ? 'bg-sky-700 text-white shadow' : 'bg-white text-slate-600 hover:bg-sky-100'
              }`}
            >
              {m === 'trial' ? '7 dias grátis' : 'Assinar agora'}
            </button>
          );
        })}
      </div>
    </div>
  )}
</div>

{authErro && (
  <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
    {authErro}
  </div>
)}

{authMensagem && (
  <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
    {authMensagem}
  </div>
)}

<div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
  <button
    type="button"
    onClick={handleCriarEmpresaInicialComGate}
    disabled={criandoEmpresaInicial}
    className="h-13 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
  >
    {criandoEmpresaInicial ? 'Criando ambiente...' : 'Concluir'}
  </button>

  <button
  type="button"
  onClick={() => {
    if (criandoNovaEmpresaLogada) {
      setCriandoNovaEmpresaLogada(false);
      setAcessoNaoConfigurado(false);
      setAuthErro('');
      setAuthMensagem('');
      setNomeEmpresaInicial('');

      if (empresasDoUsuario.length > 1 && !empresaId) {
        setModoSelecaoPerfil('entrada');
        setModalSelecionarEmpresa(true);
        setAcessoLiberado(true);
        return;
      }

      setAcessoLiberado(true);
      return;
    }

    handleLogout();
  }}
  className={`h-13 rounded-xl border px-4 py-3 font-bold shadow-sm transition cursor-pointer ${
    darkMode
      ? 'bg-red-950/30 border-red-800/50 text-red-300 hover:bg-red-900/50'
      : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
  }`}
>
  {criandoNovaEmpresaLogada ? 'Cancelar' : 'Sair'}
</button>
</div>
        </div>
      </section>
    </main>
  );
}

if (modalSelecionarEmpresa) {
  return (
    <main className={`min-h-screen flex items-center justify-center overflow-y-auto px-4 py-10 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      <section
        className={`my-auto flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          darkMode
            ? 'bg-slate-900 border-slate-700'
            : 'bg-white border-slate-200'
        }`}
      >
        <div
          className="px-5 py-3.5"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
          }}
        >
          <h2 className="text-sm font-black uppercase tracking-wide">
            Selecionar perfil
          </h2>

          <p className="mt-0.5 text-xs opacity-85">
            Escolha qual perfil financeiro deseja acessar.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="max-h-[45vh] space-y-2 overflow-y-auto px-1 pr-2">
            {empresasDoUsuario.map((empresa) => {
              const perfilAtualInativo = modoSelecaoPerfil === 'troca' && empresa.id === empresaId;
              const selecionada = !perfilAtualInativo && empresaParaSelecionar?.id === empresa.id;
              const corPerfil = typeof empresa.cor_primaria === 'string' && empresa.cor_primaria.trim()
                ? empresa.cor_primaria
                : '#003E73';
              const textoPerfil = corEhClara(corPerfil) ? '#0f172a' : '#ffffff';

              return (
                <div
                  key={empresa.id}
                  className="mr-1 w-[calc(100%-4px)] rounded-xl p-[2px] shadow-sm"
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, ${corPerfil} 14%, transparent) 0%, color-mix(in srgb, ${corPerfil} 78%, transparent) 100%)`,
                  }}
                >
                  <button
                    type="button"
                    disabled={perfilAtualInativo}
                    onClick={() => { if (!perfilAtualInativo) setEmpresaParaSelecionar(empresa); }}
                    aria-current={perfilAtualInativo ? 'true' : undefined}
                    className="group relative w-full overflow-hidden rounded-[10px] px-3 py-2.5 text-left transition active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 disabled:active:scale-100"
                    style={{
                      backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                      backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${corPerfil} 64%, transparent) 0%, color-mix(in srgb, ${corPerfil} 10%, transparent) 100%)`,
                      color: textoPerfil,
                      textShadow: textoPerfil === '#ffffff' ? '0 1px 2px rgba(15, 23, 42, 0.38)' : undefined,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      style={{
                        backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${corPerfil} 26%, transparent) 0%, color-mix(in srgb, ${corPerfil} 50%, transparent) 100%)`,
                      }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">
                          {empresa.nome || empresa.empresa_nome}
                        </h3>

                        <p className="text-xs opacity-85">
                          {rotuloTipoPerfil(empresa.tipo_perfil)} · {empresa.perfil === 'gestor_master'
                            ? 'Gestor Master'
                            : empresa.perfil === 'administrador'
                              ? 'Administrador'
                              : empresa.perfil === 'operador_completo'
                                ? 'Operador Completo'
                                : empresa.perfil === 'operador_simples'
                                  ? 'Operador Simples'
                                  : 'Não definido'}
                        </p>
                      </div>

                      {perfilAtualInativo ? (
                        <span className="shrink-0 rounded-full border border-current/60 bg-black/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                          Em uso
                        </span>
                      ) : (
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selecionada
                              ? 'border-white bg-white/20'
                              : 'border-current/70 bg-black/10'
                          }`}
                        >
                          {selecionada && (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-2">
            <button
              type="button"
              onClick={abrirCriacaoNovaEmpresa}
              className={`rounded-lg border px-4 py-2 text-xs font-black shadow-sm transition active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                darkMode
                  ? 'border-sky-800/50 bg-sky-950/30 text-sky-300 hover:bg-sky-900/50'
                  : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              Criar novo perfil
            </button>

            <button
              type="button"
              onClick={sairDaSelecaoEmpresa}
              className={`rounded-lg border px-4 py-2 text-xs font-bold transition cursor-pointer ${
                darkMode
                  ? 'border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/50'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Cancelar
            </button>
          </div>

          <button
            type="button"
            disabled={!empresaParaSelecionar}
            onClick={async () => {
              if (!empresaParaSelecionar) return;
              await carregarEmpresaSelecionada(empresaParaSelecionar);
            }}
            className="mt-3 w-full rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirmar acesso
          </button>
        </div>
      </section>
    </main>
  );
}

if (validacaoTelefoneObrigatoria) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))" }}
      />

      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
            <svg
              className="h-6 w-6 text-sky-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <h1 className="text-xl font-black leading-tight text-slate-900">
            Confirme seu celular
          </h1>

          <p className="mt-2 text-sm leading-snug text-slate-600">
  Este acesso ainda não possui um celular confirmado. Informe um número válido para receber o código de segurança e continuar usando o sistema.
</p>

<p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-medium leading-snug text-sky-800">
  Este celular também poderá ser usado futuramente para recuperação de senha e validações de segurança.
</p>

          <div className="mt-4 text-left">
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Celular com DDD
            </label>

            <div className="flex gap-2">
              <select
                value={ddiTelefoneObrigatorio}
                onChange={(e) => {
                  setDdiTelefoneObrigatorio(e.target.value);
                  setSmsTelefoneObrigatorioEnviado(false);
                  setCodigoSmsTelefoneObrigatorio('');
                  setTelefoneObrigatorioConfirmado('');
                }}
                aria-label="País (DDI)"
                className="w-28 shrink-0 rounded-xl border border-slate-300 bg-white/90 px-2 py-2.5 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
              >
                {PAISES.map((p) => (
                  <option key={`${p.ddi}-${p.nome}`} value={p.ddi}>{p.flag} +{p.ddi}</option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="tel"
                value={telefoneObrigatorio}
                onChange={(e) => {
                  setTelefoneObrigatorio(e.target.value);
                  setSmsTelefoneObrigatorioEnviado(false);
                  setCodigoSmsTelefoneObrigatorio('');
                  setTelefoneObrigatorioConfirmado('');
                }}
                placeholder="Ex: 11 99999-9999"
                className="w-full min-w-0 rounded-xl border border-slate-300 bg-white/90 px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
  Digite apenas um celular com DDD. O código será enviado por SMS.
</p>
          </div>

          {smsTelefoneObrigatorioEnviado && (
            <div className="mt-3 text-left">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Código recebido por SMS
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={codigoSmsTelefoneObrigatorio}
                onChange={(e) => setCodigoSmsTelefoneObrigatorio(e.target.value)}
                placeholder="Digite o código recebido"
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
              />

              <button
                type="button"
                onClick={reenviarCodigoTelefoneObrigatorio}
                disabled={
                  reenviandoTelefoneObrigatorio ||
                  segundosReenvioTelefoneObrigatorio > 0
                }
                className="mt-2 text-xs font-bold text-sky-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {segundosReenvioTelefoneObrigatorio > 0
                  ? `Reenviar código em ${segundosReenvioTelefoneObrigatorio}s`
                  : reenviandoTelefoneObrigatorio
                    ? 'Reenviando código...'
                    : 'Reenviar código'}
              </button>
            </div>
          )}

          {authErro && (
            <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
              {authErro}
            </div>
          )}

          {authMensagem && (
            <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
              {authMensagem}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2">
            <button
              type="button"
              onClick={confirmarTelefoneObrigatorio}
              disabled={validandoTelefoneObrigatorio}
              className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {validandoTelefoneObrigatorio
                ? 'Validando...'
                : smsTelefoneObrigatorioEnviado
                  ? 'Confirmar celular'
                  : 'Enviar código'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-600 shadow-sm transition hover:bg-red-100"
            >
              Sair
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

  // Carregando um perfil recém-selecionado: mostra a tela de carregamento em vez
  // de cair na tela de login enquanto o acesso ainda não foi liberado (evita o
  // "flash" de login entre selecionar o perfil e a página carregar).
  if (carregandoPerfil && !modalSelecionarEmpresa) {
    return (
      <main className="avanta-loading-stage relative overflow-hidden font-sans">
        <FundoCarregamentoResponsivo />
        <div className="absolute inset-0 bg-transparent" />
        <div className="avanta-loading-glass avanta-loading-card relative z-10 rounded-3xl border shadow-2xl">
          <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
            <span className="avanta-loading-spinner animate-spin" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-800">Carregando perfil…</p>
        </div>
      </main>
    );
  }

  if (!acessoLiberado) {
    return (
      <AuthCard
        modalAvisoAberto={modalAvisoAberto}
        tituloAviso={tituloAviso}
        mensagemAviso={mensagemAviso}
        tipoAviso={tipoAviso}
        fecharAviso={fecharAviso}
        modoAuth={modoAuth}
        setModoAuth={setModoAuth}
        mostrarLandingPreLogin={mostrarLandingPreLogin}
        setMostrarLandingPreLogin={setMostrarLandingPreLogin}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginSenha={loginSenha}
        setLoginSenha={setLoginSenha}
        mostrarSenhaLogin={mostrarSenhaLogin}
        setMostrarSenhaLogin={setMostrarSenhaLogin}
        mostrarSenhaCadastro={mostrarSenhaCadastro}
        setMostrarSenhaCadastro={setMostrarSenhaCadastro}
        mostrarConfirmarSenhaCadastro={mostrarConfirmarSenhaCadastro}
        setMostrarConfirmarSenhaCadastro={setMostrarConfirmarSenhaCadastro}
        cadastroNome={cadastroNome}
        setCadastroNome={setCadastroNome}
        cadastroNomeEmpresa={cadastroNomeEmpresa}
        setCadastroNomeEmpresa={setCadastroNomeEmpresa}
        cadastroEmail={cadastroEmail}
        setCadastroEmail={setCadastroEmail}
        cadastroTelefone={cadastroTelefone}
        setCadastroTelefone={setCadastroTelefone}
        cadastroSenha={cadastroSenha}
        setCadastroSenha={setCadastroSenha}
        cadastroConfirmarSenha={cadastroConfirmarSenha}
        setCadastroConfirmarSenha={setCadastroConfirmarSenha}
        cadastroCupom={cadastroCupom}
        setCadastroCupom={setCadastroCupom}
        onAbrirTermos={() => setModalTermos(true)}
        onAbrirPrivacidade={() => setModalPrivacidade(true)}
        cadastroDdi={cadastroDdi}
        setCadastroDdi={setCadastroDdi}
        codigoSmsCadastro={codigoSmsCadastro}
        setCodigoSmsCadastro={setCodigoSmsCadastro}
        smsCadastroEnviado={smsCadastroEnviado}
        segundosReenvioSms={segundosReenvioSms}
        reenviandoSmsCadastro={reenviandoSmsCadastro}
        authErro={authErro}
        authMensagem={authMensagem}
        authLoading={authLoading}
        googleLoading={googleLoading}
        modoRedefinirSenha={modoRedefinirSenha}
        novaSenha={novaSenha}
        setNovaSenha={setNovaSenha}
        confirmarNovaSenha={confirmarNovaSenha}
        setConfirmarNovaSenha={setConfirmarNovaSenha}
        mostrarNovaSenha={mostrarNovaSenha}
        setMostrarNovaSenha={setMostrarNovaSenha}
        mostrarConfirmarNovaSenha={mostrarConfirmarNovaSenha}
        setMostrarConfirmarNovaSenha={setMostrarConfirmarNovaSenha}
        codigoSmsRedefinirSenha={codigoSmsRedefinirSenha}
        setCodigoSmsRedefinirSenha={setCodigoSmsRedefinirSenha}
        smsRedefinirSenhaEnviado={smsRedefinirSenhaEnviado}
        segundosReenvioRedefinirSenha={segundosReenvioRedefinirSenha}
        reenviandoSmsRedefinirSenha={reenviandoSmsRedefinirSenha}
        tipoPerfilInicial={tipoPerfilInicial}
        setTipoPerfilInicial={setTipoPerfilInicial}
        handleLogin={handleLogin}
        handleCadastroTeste={handleCadastroTeste}
        handleGoogleLogin={handleGoogleLogin}
        handleRecuperarSenha={handleRecuperarSenha}
        handleAtualizarSenha={handleAtualizarSenha}
        reenviarCodigoSmsCadastro={reenviarCodigoSmsCadastro}
        reenviarCodigoRedefinirSenha={reenviarCodigoRedefinirSenha}
      />
    );
  }

  // Cobrança: enquanto o estado de acesso não for conhecido, não renderiza o app
  // (evita o flash do conteúdo antes de o paywall bloquear).
  if (acessoLiberado && empresaId && (!cadastroPerfilCarregado || (COBRANCA_ATIVA && !estadoCarregado))) {
    return (
      <main className="avanta-loading-stage relative overflow-hidden font-sans">
        <FundoCarregamentoResponsivo />
        <div className="absolute inset-0 bg-transparent" />
        <div className="avanta-loading-glass avanta-loading-card relative z-10 rounded-3xl border shadow-2xl">
          <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
            <span className="avanta-loading-spinner animate-spin" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-800">Carregando…</p>
        </div>
      </main>
    );
  }

  // Cobrança: Empresa sem assinatura e Pessoal grátis não acessam a Gestão Web.
  // O plano Pessoal gratuito permanece disponível exclusivamente no Gestão Mobile.
  // As duas regras ficam inativas enquanto COBRANCA_ATIVA=false.
  const bloqueioWebPessoal = precisaPaywallWebPessoal(estadoAcesso);
  if (precisaPaywallEmpresa(estadoAcesso) || bloqueioWebPessoal) {
    return (
      <>
        <PaywallEmpresa
          nomePerfil={nomeEmpresaAtual}
          emailPadrao={emailUsuarioAtual}
          telefonePadrao={telefoneCobrancaPadrao}
          estadoAcesso={estadoAcesso}
          faturaPendenteUrl={faturaPendenteUrl}
          onAssinar={iniciarAssinatura}
          onEscolherPlano={faturaPendenteUrl ? undefined : setCicloCadastroPaywall}
          onAtualizarPagamento={atualizarEstadoCobranca}
          onResgatarCupom={resgatarCupom}
          onTrocarPerfil={empresasDoUsuario.length > 1 ? abrirTrocaEmpresa : undefined}
          onCriarPerfil={abrirCriacaoNovaEmpresa}
          onSair={handleLogout}
          tipoPerfil={bloqueioWebPessoal ? 'pessoal' : 'empresa'}
        />
        {cicloCadastroPaywall && empresaId && (
          <CadastroPerfilModal
            aberto
            empresaId={empresaId}
            statusInicial={cadastroPerfilStatus}
            contexto="paywall"
            ciclo={cicloCadastroPaywall}
            onCancelar={() => setCicloCadastroPaywall(null)}
            onConcluido={async (status, cobranca) => {
              setCadastroPerfilStatus(status);
              const resultado = await iniciarAssinatura(cicloCadastroPaywall, cobranca, true);
              if (!resultado.ok || !resultado.url) throw new Error(resultado.mensagem || 'Não foi possível iniciar a assinatura.');
              window.location.href = resultado.url;
            }}
          />
        )}
      </>
    );
  }

  if (acessoLiberado && empresaId && cadastroPerfilErro) {
    return (
      <main className="avanta-loading-stage relative overflow-hidden font-sans">
        <FundoCarregamentoResponsivo />
        <section className="relative z-10 mx-4 w-full max-w-sm rounded-xl border border-white/50 bg-white/90 p-5 text-center shadow-xl backdrop-blur-xl">
          <h1 className="text-base font-black text-slate-900">Não foi possível verificar o cadastro</h1>
          <p className="mt-2 text-sm text-slate-600">{cadastroPerfilErro}</p>
          <button
            type="button"
            onClick={() => setCadastroPerfilTentativa((atual) => atual + 1)}
            className="mt-4 h-9 rounded-lg bg-[#003E73] px-5 text-xs font-black text-white"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bgMain}`}>

      {empresaId && cadastroPerfilStatus && !cadastroPerfilStatus.completo && !cadastroPerfilAdiado && (
        <CadastroPerfilModal
          aberto
          empresaId={empresaId}
          statusInicial={cadastroPerfilStatus}
          contexto={cadastroPerfilStatus.obrigatorio ? 'bloqueio' : 'lembrete'}
          onLembrarDepois={cadastroPerfilStatus.obrigatorio ? undefined : () => setCadastroPerfilAdiado(true)}
          onConcluido={(status) => {
            setCadastroPerfilStatus(status);
            setNomeEmpresaAtual(status.cadastro.nome_fantasia);
          }}
        />
      )}

      {empresaId && cicloCadastroPaywall && !precisaPaywallEmpresa(estadoAcesso) && !precisaPaywallWebPessoal(estadoAcesso) && (
        <CadastroPerfilModal
          aberto
          empresaId={empresaId}
          statusInicial={cadastroPerfilStatus}
          contexto="paywall"
          ciclo={cicloCadastroPaywall}
          onCancelar={() => setCicloCadastroPaywall(null)}
          onConcluido={async (status, cobranca) => {
            setCadastroPerfilStatus(status);
            const resultado = await iniciarAssinatura(cicloCadastroPaywall, cobranca, true);
            if (!resultado.ok || !resultado.url) throw new Error(resultado.mensagem || 'Não foi possível iniciar a assinatura.');
            window.location.href = resultado.url;
          }}
        />
      )}

      {/* ================= MODAIS ================= */}

      {/* ================= MODAL AGENDA ================= */}
      {agendaAberta && (
        <div
          className="fixed inset-0 z-[8500] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => { setAgendaAberta(false); setAgendaDiaSelecionado(null); setAgendaFormAberto(false); }}
        >
          <DraggableModalCard
            className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div data-modal-drag-handle className="flex shrink-0 cursor-grab items-center justify-between px-6 py-4 active:cursor-grabbing" style={{ background: corPrimaria }}>
              <h2 className="text-xl font-black tracking-[0.2em] text-white">AGENDA</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navAgenda(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white transition hover:bg-white/30"
                >‹</button>
                <span className="min-w-[170px] text-center text-sm font-black uppercase tracking-wide text-white">
                  {MESES_AGENDA[agendaMesAtivo]} {agendaAnoAtivo}
                </span>
                <button
                  type="button"
                  onClick={() => navAgenda(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white transition hover:bg-white/30"
                >›</button>
                <button
                  type="button"
                  onClick={() => { setAgendaAberta(false); setAgendaDiaSelecionado(null); setAgendaFormAberto(false); }}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xl font-black text-white transition hover:bg-white/30"
                >&times;</button>
              </div>
            </div>

            {/* Body: calendar + detail panel */}
            <div className="flex min-h-0 flex-1 overflow-hidden">

              {/* Left: Calendar */}
              <div className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 p-4">
                {/* Weekday headers */}
                <div className="mb-1 grid grid-cols-7">
                  {['D','S','T','Q','Q','S','S'].map((d, i) => (
                    <div key={i} className="py-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">{d}</div>
                  ))}
                </div>
                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: new Date(agendaAnoAtivo, agendaMesAtivo, 1).getDay() }).map((_, i) => (
                    <div key={`v-${i}`} />
                  ))}
                  {Array.from({ length: new Date(agendaAnoAtivo, agendaMesAtivo + 1, 0).getDate() }).map((_, idx) => {
                    const dia = idx + 1;
                    const hoje = new Date();
                    const ehHoje = dia === hoje.getDate() && agendaMesAtivo === hoje.getMonth() && agendaAnoAtivo === hoje.getFullYear();
                    const ehSelecionado = dia === agendaDiaSelecionado;
                    const temLembretes = itensAgendaDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, dia).length > 0;
                    const temDespesasFuturas = despesasFuturasDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, dia).length > 0;
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => { setAgendaDiaSelecionado(dia); setAgendaFormAberto(false); }}
                        className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 text-center transition ${
                          ehSelecionado
                            ? 'font-black text-white shadow-md'
                            : ehHoje
                              ? 'border border-slate-300 bg-slate-100 font-black text-slate-900'
                              : 'font-semibold text-slate-700 hover:bg-slate-50'
                        }`}
                        style={ehSelecionado ? { background: corPrimaria } : {}}
                      >
                        <span className="text-xs leading-none">{String(dia).padStart(2, '0')}</span>
                        {(temLembretes || temDespesasFuturas) && (
                          <span className="mt-0.5 flex items-center gap-0.5">
                            {temLembretes && <span className={`h-1 w-1 rounded-full ${ehSelecionado ? 'bg-white' : 'bg-cyan-500'}`} />}
                            {temDespesasFuturas && <span className={`h-1 w-1 rounded-full ${ehSelecionado ? 'bg-white/90' : 'bg-rose-500'}`} />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Day details */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                {agendaDiaSelecionado ? (
                  <div className="flex flex-col gap-4 p-5">
                    {/* Day header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dia selecionado</p>
                        <h3 className="mt-1 text-xl font-black text-slate-900">
                          {String(agendaDiaSelecionado).padStart(2, '0')} de {MESES_AGENDA[agendaMesAtivo]}
                        </h3>
                      </div>
                      {!agendaFormAberto && (
                        <button
                          type="button"
                          onClick={() => { setAgendaFormAberto(true); setAgendaTitulo(''); setAgendaDescricao(''); setAgendaRepetir(false); setAgendaRepeticao('mensal'); }}
                          className="rounded-xl px-4 py-2 text-xs font-black uppercase text-white shadow transition hover:opacity-90"
                          style={{ background: corPrimaria }}
                        >+ Adicionar</button>
                      )}
                    </div>

                    {/* Add form */}
                    {agendaFormAberto && (
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Novo lembrete</p>
                        <input
                          type="text"
                          value={agendaTitulo}
                          onChange={e => setAgendaTitulo(e.target.value)}
                          placeholder="Título"
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-400"
                          onKeyDown={e => { if (e.key === 'Enter') adicionarItemAgenda(); }}
                          autoFocus
                        />
                        <textarea
                          value={agendaDescricao}
                          onChange={e => setAgendaDescricao(e.target.value)}
                          placeholder="Descrição (opcional)"
                          rows={2}
                          className="resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-400"
                        />
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800">
                          <input
                            type="checkbox"
                            checked={agendaRepetir}
                            onChange={e => setAgendaRepetir(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>Repetir</span>
                        </label>
                        {agendaRepetir && (
                          <select
                            value={agendaRepeticao}
                            onChange={e => setAgendaRepeticao(e.target.value as 'diaria'|'semanal'|'quinzenal'|'mensal'|'anual')}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none"
                          >
                            <option value="diaria">Diária</option>
                            <option value="semanal">Semanal</option>
                            <option value="quinzenal">Quinzenal</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual</option>
                          </select>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAgendaFormAberto(false)}
                            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase text-slate-600 transition hover:bg-slate-50"
                          >Cancelar</button>
                          <button
                            type="button"
                            onClick={adicionarItemAgenda}
                            className="h-10 flex-1 rounded-xl text-xs font-black uppercase text-white transition hover:opacity-90"
                            style={{ background: corPrimaria }}
                          >Salvar</button>
                        </div>
                      </div>
                    )}

                    {/* Items list */}
                    {itensAgendaDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, agendaDiaSelecionado).length === 0 && despesasFuturasDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, agendaDiaSelecionado).length === 0 && !agendaFormAberto ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                        <p className="text-sm font-black text-slate-500">Nenhum lembrete neste dia.</p>
                        <p className="mt-1 text-xs text-slate-400">Clique em Adicionar para criar um lembrete.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {itensAgendaDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, agendaDiaSelecionado).map(item => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{item.titulo}</p>
                                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-700">Lembrete</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {item.repetir && (
                                  <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-700">
                                    {rotuloRepeticaoAgendaWeb(item.repeticao)}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setAgendaItemParaExcluir(item)}
                                  title="Excluir"
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {item.descricao && (
                              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{item.descricao}</p>
                            )}
                          </div>
                        ))}
                        {despesasFuturasDoDiaWeb(agendaAnoAtivo, agendaMesAtivo, agendaDiaSelecionado).map((lancamento) => {
                          const tipo = lancamento.tipo === 'fixa' || lancamento.recorrenciaId
                            ? 'Fixa'
                            : lancamento.tipo === 'parcela'
                              ? 'Parcela'
                              : 'Previsto';
                          return (
                            <div key={`despesa-${lancamento.id}`} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-900">{lancamento.despesa || 'Despesa'}</p>
                                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Despesa futura · {tipo}</p>
                                </div>
                                <strong className="shrink-0 text-sm font-black tabular-nums text-rose-600">{formatarMoeda(Number(lancamento.valor || 0))}</strong>
                              </div>
                              {lancamento.descricao && <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{lancamento.descricao}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-slate-400">
                    <div className="text-center">
                      <svg className="mx-auto mb-3 h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-bold">Selecione um dia</p>
                      <p className="mt-1 text-xs">Clique em um dia no calendário para ver os lembretes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

        {/* Confirmação de exclusão de item com repetição */}
        {agendaItemParaExcluir && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Excluir lembrete</p>
              <h3 className="mt-2 text-base font-black text-slate-900">{agendaItemParaExcluir.titulo}</h3>
              {agendaItemParaExcluir.repetir ? (
                <>
                  <p className="mt-1 text-xs text-slate-500">Este lembrete se repete. O que deseja excluir?</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (agendaDiaSelecionado) excluirItemAgendaDia(agendaItemParaExcluir.id, agendaAnoAtivo, agendaMesAtivo, agendaDiaSelecionado);
                        setAgendaItemParaExcluir(null);
                      }}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                    >Somente este dia</button>
                    <button
                      type="button"
                      onClick={() => {
                        excluirItemAgendaWeb(agendaItemParaExcluir.id);
                        setAgendaItemParaExcluir(null);
                      }}
                      className="h-10 w-full rounded-xl bg-red-500 text-xs font-black text-white transition hover:bg-red-600"
                    >Excluir de todos os meses</button>
                    <button
                      type="button"
                      onClick={() => setAgendaItemParaExcluir(null)}
                      className="h-8 w-full text-xs font-semibold text-slate-400 transition hover:text-slate-600"
                    >Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-slate-500">Tem certeza que deseja excluir este lembrete?</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        excluirItemAgendaWeb(agendaItemParaExcluir.id);
                        setAgendaItemParaExcluir(null);
                      }}
                      className="h-10 w-full rounded-xl bg-red-500 text-xs font-black text-white transition hover:bg-red-600"
                    >Excluir</button>
                    <button
                      type="button"
                      onClick={() => setAgendaItemParaExcluir(null)}
                      className="h-8 w-full text-xs font-semibold text-slate-400 transition hover:text-slate-600"
                    >Cancelar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        </DraggableModalCard>
        </div>
      )}

      <ModalInstrucoes
  aberto={modalInstrucoes}
  aoFechar={() => setModalInstrucoes(false)}
  bgCard={bgCard}
  textMuted={textMuted}
  textStrong={textStrong}
  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  corEhClara={corEhClara}
  categoriasPerfil={categoriasPerfilAtual}
  tipoPerfil={tipoPerfilAtualNormalizado}
/>

      <ModalDespesasBase
  aberto={modalDespesasBase}
  aoFechar={() => setModalDespesasBase(false)}

  bgCard={bgCard}
  textMuted={textMuted}
  textStrong={textStrong}
  darkMode={darkMode}

  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  estiloTemaPrimario={estiloTemaPrimario}
  corEhClara={corEhClara}

  ajudaCategoriasAberta={ajudaCategoriasAberta}
  setAjudaCategoriasAberta={setAjudaCategoriasAberta}

  novaBaseNome={novaBaseNome}
  setNovaBaseNome={setNovaBaseNome}

  novaBaseCat={novaBaseCat}
  setNovaBaseCat={setNovaBaseCat}

  despesasCadastradas={despesasCadastradas}
  categoriasPerfil={categoriasPerfilAtual}

  adicionarDespesaBase={adicionarDespesaBase}
  editarDespesaBase={editarDespesaBase}
  apagarDespesaBase={apagarDespesaBase}
/>

      <ModalLogo
  aberto={modalLogo}
  aoFechar={() => setModalLogo(false)}
  aoLimpar={limparLogo}
  aoOcultar={ocultarLogo}

  bgCard={bgCard}
  textMuted={textMuted}
  textStrong={textStrong}

  corPrimaria={corPrimaria}
  estiloTemaPrimario={estiloTemaPrimario}

  logoUrl={logoUrl}
  logoSettings={logoSettings}
  setLogoSettings={setLogoSettings}

  painelAjusteLogo={painelAjusteLogo}
  setPainelAjusteLogo={setPainelAjusteLogo}

  fileInputRef={fileInputRef}
  handleImageUpload={handleImageUpload}
/>

<ModulosModal
  aberto={modalModulos}
  onFechar={() => setModalModulos(false)}
  modulos={modulosCatalogo.filter((m) => m.perfis.length === 0 || m.perfis.includes(tipoPerfilAtualNormalizado))}
  ativos={modulosAtivos}
  carregando={modulosCarregando}
  acaoEmId={moduloAcaoId}
  onInstalar={instalarModulo}
  onDesinstalar={desinstalarModulo}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
/>

<PontoAdminModal
  key={`${abaInicialPontoAdmin}-${instanciaPontoAdmin}`}
  aberto={modalPontoAdmin}
  abaInicial={abaInicialPontoAdmin}
  relatorioInicial={relatorioInicialPonto}
  onFechar={() => setModalPontoAdmin(false)}
  funcionarios={pontoFuncionarios}
  carregando={pontoFuncCarregando}
  onCriar={criarFuncionarioPonto}
  onAtualizar={atualizarFuncionarioPonto}
  onRedefinirSenha={redefinirSenhaPonto}
  config={pontoConfig}
  onSalvarConfig={salvarPontoConfig}
  onCarregarRegistros={carregarRegistrosPonto}
  onCarregarAuditoria={carregarAuditoriaPonto}
  onCarregarAssinatura={carregarAssinaturaPonto}
  onBaixarAfd={baixarAfdPonto}
  onCarregarDocumentosRepP={carregarDocumentosRepP}
  onBaixarDocumentoRepP={baixarDocumentoRepP}
  onPrepararManualRepP={prepararManualRepP}
  onGerarEspelhoPonto={gerarEspelhoPonto}
  diasNaoUteis={pontoDiasNaoUteis}
  diasNaoUteisCarregando={pontoDiasNaoUteisCarregando}
  onCriarDiaNaoUtil={criarDiaNaoUtilPonto}
  onExcluirDiaNaoUtil={excluirDiaNaoUtilPonto}
  darkMode={darkMode}
/>

<RecebimentosAdminModal
  aberto={modalRecebimentos && podeGerenciarRecebimentos && modulosAtivos.includes('recebimentos_presencial')}
  empresaId={empresaId || ''}
  perfil={perfilUsuario === 'administrador' ? 'administrador' : 'gestor'}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  onAviso={abrirAviso}
  onConfirmacao={abrirConfirmacao}
  onFechar={() => setModalRecebimentos(false)}
  onFinanceiroAtualizado={notificarFinanceiroAtualizado}
/>

<SobreModal
  aberto={modalSobre}
  onFechar={() => setModalSobre(false)}
  darkMode={darkMode}
  versaoAtual={APP_VERSION}
/>

<NovidadesVendasModal
  aberto={modalNovidadesVendas}
  empresaId={empresaId}
  nomeEmpresa={nomeEmpresaAtual}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  onFechar={() => setModalNovidadesVendas(false)}
/>

<AssinaturaModal
  aberto={modalAssinatura}
  onFechar={() => setModalAssinatura(false)}
  onEstadoAtualizado={setEstadoAcesso}
  onAssinar={iniciarAssinatura}
  empresaId={empresaId}
  nomePadrao={nomeEmpresaAtual}
  emailPadrao={emailUsuarioAtual}
  telefonePadrao={telefoneCobrancaPadrao}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  estado={estadoAcesso}
  tipoPerfil={tipoPerfilAtualNormalizado}
/>

<PremiumPessoalModal
  aberto={premiumRecurso !== null}
  recurso={premiumRecurso}
  onFechar={() => setPremiumRecurso(null)}
  onAssinar={() => setModalAssinatura(true)}
  onResgatarCupom={resgatarCupom}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
/>

<ModalConfirmacao
  aberto={modalConfirmacaoAberto}
  titulo={tituloConfirmacao}
  mensagem={mensagemConfirmacao}
  textoConfirmar={textoConfirmarConfirmacao}
  carregando={confirmacaoCarregando}
  textoCancelar={textoCancelarConfirmacao}
  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  aoCancelar={() => { fecharConfirmacao(); if (acaoCancelarConfirmacao) acaoCancelarConfirmacao(); }}
  aoConfirmar={confirmarAcao}
/>

{modalRestauracaoBackupAberto && backupRestauracaoAnalise && (
  <div
    className="fixed inset-0 z-[6200] flex items-center justify-center bg-black/70 px-4"
    onClick={fecharModalRestauracaoBackup}
  >
    <DraggableModalCard
      className={`flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle className="cursor-grab px-6 py-5 active:cursor-grabbing" style={estiloTemaPrimario}>
        <p className="text-xs font-black uppercase tracking-[0.18em]">
          Restauracao de dados
        </p>
        <h2 className="mt-1 text-2xl font-black">
          Importar backup
        </h2>
      </div>

      <div className="overflow-y-auto px-6 py-5">
        <div
          className={`rounded-xl border p-4 text-sm ${
            darkMode
              ? 'border-slate-700 bg-slate-900/60 text-slate-300'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <p><strong className={textStrong}>Arquivo:</strong> {backupRestauracaoAnalise.nomeArquivo}</p>
          <p><strong className={textStrong}>Perfil de origem:</strong> {backupRestauracaoAnalise.perfilOrigem || 'Nao identificado'}</p>
          <p><strong className={textStrong}>Versao do backup:</strong> {backupRestauracaoAnalise.versaoBackup || 'Nao identificada'}</p>
          <div className="mt-3 grid gap-2 text-xs font-black uppercase tracking-wide sm:grid-cols-5">
            <span>Base: {backupRestauracaoAnalise.totalDespesasBase}</span>
            <span>Despesas: {backupRestauracaoAnalise.totalLancamentos}</span>
            <span>Entradas: {backupRestauracaoAnalise.totalReceitasEntradas}</span>
            <span>Totais: {backupRestauracaoAnalise.totalReceitasTotais}</span>
            <span>Fixas: {backupRestauracaoAnalise.totalRecorrencias}</span>
          </div>
        </div>

        {backupRestauracaoAnalise.avisos.length > 0 && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm font-semibold leading-relaxed ${
              darkMode
                ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {backupRestauracaoAnalise.avisos.map((aviso) => (
              <p key={aviso}>{aviso}</p>
            ))}
          </div>
        )}

        <div
          className={`mt-5 rounded-xl border p-3 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/45'
              : 'border-slate-200 bg-white'
          }`}
        >
          {([
            {
              modo: 'atualizar' as ModoImportacaoBackup,
              titulo: 'Atualizar dados',
              texto: 'Aplica alteracoes feitas no backup e adiciona os registros que ainda nao existem.',
            },
            {
              modo: 'substituir' as ModoImportacaoBackup,
              titulo: 'Importar copia limpa',
              texto: 'Apaga os dados financeiros atuais e importa somente o conteudo do backup, sem mesclagem.',
            },
          ]).map((opcao) => {
            const ativo = modoRestauracaoBackup === opcao.modo;
            const perigo = opcao.modo === 'substituir';

            return (
              <label
                key={opcao.modo}
                className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                  ativo
                    ? darkMode
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-50 text-slate-900'
                    : perigo
                      ? darkMode
                        ? 'text-red-100 hover:bg-red-950/20'
                        : 'text-red-800 hover:bg-red-50'
                      : darkMode
                        ? 'text-slate-300 hover:bg-slate-800/70'
                        : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="modo-restauracao-backup"
                  checked={ativo}
                  onChange={() => setModoRestauracaoBackup(opcao.modo)}
                  disabled={importandoBackup}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: perigo ? '#b91c1c' : corPrimaria }}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-wide">
                    {opcao.titulo}
                  </span>
                  <span className={`mt-0.5 block text-xs font-semibold leading-relaxed ${
                    ativo ? textMuted : 'opacity-75'
                  }`}>
                    {opcao.texto}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {modoRestauracaoBackup === 'substituir' && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              darkMode
                ? 'border-red-500/30 bg-red-950/25'
                : 'border-red-100 bg-red-50'
            }`}
          >
            <p className={`text-sm font-bold ${darkMode ? 'text-red-100' : 'text-red-800'}`}>
              Este modo apaga os dados financeiros atuais antes de importar o backup. Um ponto de restauracao sera baixado antes da operacao.
            </p>
            <label className={`mt-3 block text-xs font-semibold normal-case tracking-normal ${textMuted}`}>
              digite <strong className="font-black uppercase">SUBSTITUIR</strong> para confirmar
            </label>
            <input
              value={confirmacaoSubstituirBackup}
              onChange={(e) => setConfirmacaoSubstituirBackup(e.target.value)}
              disabled={importandoBackup}
              className={`mt-2 w-full rounded-xl border px-3 py-3 text-sm font-black uppercase outline-none ${
                darkMode
                  ? 'border-slate-600 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-800'
              }`}
            />
          </div>
        )}

        <p className={`mt-4 text-xs font-semibold leading-relaxed ${textMuted}`}>
          Antes de qualquer importacao, o sistema baixa um ponto de restauracao com o estado atual deste perfil.
        </p>
      </div>

      <div className={`flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end ${
        darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'
      }`}>
        <button
          type="button"
          onClick={fecharModalRestauracaoBackup}
          disabled={importandoBackup}
          className={`rounded-xl border px-5 py-3 text-xs font-black uppercase transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={executarImportacaoBackup}
          disabled={
            importandoBackup ||
            (modoRestauracaoBackup === 'substituir' &&
              confirmacaoSubstituirBackup.trim().toUpperCase() !== 'SUBSTITUIR')
          }
          className={`rounded-xl px-5 py-3 text-xs font-black uppercase text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
            modoRestauracaoBackup === 'substituir'
              ? 'bg-red-700 hover:bg-red-800'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {importandoBackup ? 'Importando...' : rotuloModoRestauracaoBackup(modoRestauracaoBackup)}
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{modalReceitaDashboardAberto && (
  <div
    className="fixed inset-0 z-[6200] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharModalReceitaDashboard}
  >
    <DraggableModalCard
      className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle
        className="mb-4 cursor-grab rounded-xl px-4 py-3 active:cursor-grabbing"
        style={estiloTemaPrimario}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em]">
          Confirmar lançamento
        </p>

        <h2 className="mt-1 text-xl font-black">
          ADICIONAR RECEITA
        </h2>
      </div>

      <div className={`space-y-3 text-sm ${textMuted}`}>
        <p>
          Confirme em qual mês esta receita será adicionada.
        </p>

        <select
          value={mesReceitaDashboard}
          onChange={(e) => setMesReceitaDashboard(e.target.value)}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none ${
            darkMode
              ? 'border-slate-600 bg-slate-900 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          {meses.map((mes) => (
            <option key={mes} value={mes}>
              {mes}
            </option>
          ))}
        </select>

        <div
          className={`rounded-xl border px-3 py-3 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/60'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className={`text-xs font-black uppercase tracking-wide ${textMuted}`}>
            {tipoReceitaDashboard === 'entrada' ? 'Valor da receita' : 'Total informado'}
          </p>
          <p className={`mt-1 text-lg font-black ${textStrong}`}>
            {formatarMoeda(
              tipoReceitaDashboard === 'entrada'
                ? entradaFaturamentoValorNumerico
                : valorReceitaDashboardConfirmacao
            )}
          </p>
          {tipoReceitaDashboard === 'total' && getEntradasPorMes(mesReceitaDashboard).length > 0 && (
            <p className={`mt-2 text-xs font-semibold leading-relaxed ${textMuted}`}>
              Este mês já possui {getEntradasPorMes(mesReceitaDashboard).length} receita(s) avulsa(s). Ao confirmar, escolha se deseja apagar esses lançamentos ou manter e somar.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={fecharModalReceitaDashboard}
          className={`rounded-xl border px-4 py-3 text-xs font-black uppercase transition cursor-pointer ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={confirmarEntradaFaturamentoDashboard}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase text-white shadow-md transition hover:bg-emerald-700 cursor-pointer"
        >
          Confirmar
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{modalExcluirEmpresa && (
  <div
    className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/60 px-4"
    onClick={() => {
      if (excluindoEmpresa) return;

      setModalExcluirEmpresa(false);
      setNomeConfirmacaoExclusao('');
    }}
  >
    <DraggableModalCard
      className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle className="mb-5 cursor-grab active:cursor-grabbing">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
          Exclusão definitiva
        </p>

        <h2 className={`mt-2 text-2xl font-black ${
          darkMode ? 'text-white' : 'text-slate-800'
        }`}>
          Confirmar exclusão da empresa
        </h2>

        <p className={`mt-3 text-sm leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          O backup já foi solicitado. Agora, para excluir definitivamente a empresa,
          digite exatamente o nome abaixo:
        </p>

        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-black ${
          darkMode
            ? 'border-slate-600 bg-slate-900 text-white'
            : 'border-slate-200 bg-slate-50 text-slate-800'
        }`}>
          {nomeEmpresaAtual}
        </div>
      </div>

      <label className={`mb-1 block text-sm font-bold ${
        darkMode ? 'text-slate-200' : 'text-slate-700'
      }`}>
        Digite o nome da empresa
      </label>

      <input
        type="text"
        value={nomeConfirmacaoExclusao}
        onChange={(e) => setNomeConfirmacaoExclusao(e.target.value)}
        placeholder={nomeEmpresaAtual}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition ${
          darkMode
            ? 'border-slate-600 bg-slate-900 text-white focus:border-red-500'
            : 'border-slate-300 bg-white text-slate-800 focus:border-red-500'
        }`}
      />

      <p className={`mt-3 text-xs leading-relaxed ${
        darkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        Esta ação é irreversível e removerá lançamentos, despesas cadastradas,
        configurações, vínculos de usuários e a empresa atual.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            if (excluindoEmpresa) return;

            setModalExcluirEmpresa(false);
            setNomeConfirmacaoExclusao('');
          }}
          disabled={excluindoEmpresa}
          className={`rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide transition cursor-pointer ${
  darkMode
    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={executarExclusaoEmpresaAtual}
          disabled={
            excluindoEmpresa ||
            nomeConfirmacaoExclusao.trim() !== nomeEmpresaAtual
          }
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {excluindoEmpresa ? 'Excluindo...' : 'Excluir definitivamente'}
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{modalEditarEmpresaAberto && (
  <div
    className="fixed inset-0 z-[5600] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharEdicaoEmpresaAtual}
  >
    <DraggableModalCard
      className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        data-modal-drag-handle
        className="mb-5 cursor-grab rounded-2xl px-4 py-3 active:cursor-grabbing"
        style={estiloTemaPrimarioGradiente}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
          Gerenciar perfil financeiro
        </p>
        <h2 className="mt-1 text-xl font-black">
          Editar dados
        </h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
            {labelNomePerfilEdicao}
          </label>
          <input
            type="text"
            value={editEmpresaNome}
            onChange={(e) => setEditEmpresaNome(e.target.value)}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none ${
              darkMode
                ? 'border-slate-600 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-800'
            }`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Tipo do perfil financeiro
          </label>

          <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${
            darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
          }`}>
            {(['empresa', 'pessoal'] as TipoPerfil[]).map((tipo) => {
              const ativo = editTipoPerfilNormalizado === tipo;

              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setEditTipoPerfil(tipo)}
                  className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                    ativo
                      ? 'text-white shadow-md'
                      : darkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                  style={ativo ? estiloTemaPrimario : undefined}
                >
                  {rotuloTipoPerfil(tipo)}
                </button>
              );
            })}
          </div>

          <p className={`mt-2 text-xs font-semibold leading-relaxed ${textMuted}`}>
            Alterar o tipo muda os textos e as categorias sugeridas, sem apagar lançamentos antigos.
          </p>
        </div>

        <div>
          <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Login ou email do acesso atual
          </label>
          <input
            type="text"
            value={editEmpresaLogin}
            onChange={(e) => setEditEmpresaLogin(e.target.value)}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none ${
              darkMode
                ? 'border-slate-600 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-800'
            }`}
          />
        </div>

        <div>
          <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Nova senha
          </label>
          <input
            type="password"
            value={editEmpresaSenha}
            onChange={(e) => setEditEmpresaSenha(e.target.value)}
            placeholder="Deixe em branco para manter a senha atual"
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none ${
              darkMode
                ? 'border-slate-600 bg-slate-900 text-white placeholder:text-slate-500'
                : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400'
            }`}
          />
          {perfilUsuario === 'gestor_master' && (
            <p className={`mt-2 text-xs font-semibold leading-relaxed ${textMuted}`}>
              Para Gestor Master, a senha deve ser alterada pela recuperação de senha.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={fecharEdicaoEmpresaAtual}
          disabled={editEmpresaSalvando}
          className={`rounded-xl border px-4 py-3 text-xs font-black uppercase transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={salvarEdicaoEmpresaAtual}
          disabled={editEmpresaSalvando}
          className="rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={estiloTemaPrimario}
        >
          {editEmpresaSalvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{perfilCadastroEdicaoId && (
  <CadastroPerfilModal
    key={perfilCadastroEdicaoId}
    aberto
    empresaId={perfilCadastroEdicaoId}
    contexto="edicao"
    onCancelar={() => {
      setPerfilCadastroEdicaoId(null);
      setModalEmpresasAberto(true);
    }}
    onConcluido={(status) => {
      const nomeAtualizado = status.cadastro.nome_fantasia;
      setEmpresasDoUsuario((perfis) => perfis.map((perfil) => (
        perfil.id === perfilCadastroEdicaoId
          ? { ...perfil, nome: nomeAtualizado, empresa_nome: nomeAtualizado }
          : perfil
      )));
      if (perfilCadastroEdicaoId === empresaId) {
        setNomeEmpresaAtual(nomeAtualizado);
        setCadastroPerfilStatus(status);
      }
      setPerfilCadastroEdicaoId(null);
      abrirAviso('Cadastro atualizado', 'Os dados do perfil foram salvos com sucesso.', undefined, 'sucesso');
    }}
  />
)}

{modalEmpresasAberto && (
  <div
    className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/60 px-4"
    onClick={() => { if (!editEmpresaSalvando && !criandoEmpresaInicial) { setSubAcaoGerenciar(null); setModalEmpresasAberto(false); } }}
  >
    <DraggableModalCard
      className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
        darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabeçalho */}
      <div
        data-modal-drag-handle
        className="cursor-grab px-6 pb-4 pt-5 active:cursor-grabbing"
        style={estiloTemaPrimarioGradiente}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
              Perfis financeiros
            </p>
            <h2 className="mt-1 text-xl font-black">
              {subAcaoGerenciar === 'editar'
                ? 'Editar dados do perfil'
                : subAcaoGerenciar === 'criar'
                  ? 'Criar novo perfil'
                  : 'Gerenciar perfil financeiro'}
            </h2>
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setSubAcaoGerenciar(null); setModalEmpresasAberto(false); }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {!subAcaoGerenciar && (
          <div className="mt-3 rounded-xl border bg-white/10 p-2.5" style={{ borderColor: bordaSobreCorPrimaria }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-current opacity-90" aria-hidden="true" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
                Perfil ativo
              </p>
            </div>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(72px,1fr)_minmax(64px,1fr)] gap-2 text-xs">
              <div className="min-w-0">
                <span className="block text-[8px] font-black uppercase tracking-wide opacity-65">Nome</span>
                <strong className="mt-0.5 block truncate text-xs font-black">{nomeEmpresaAtual || 'Não carregado'}</strong>
              </div>
              <div className="min-w-0">
                <span className="block text-[8px] font-black uppercase tracking-wide opacity-65">Acesso</span>
                <strong className="mt-0.5 block truncate text-xs font-black">{perfilUsuarioFormatado}</strong>
              </div>
              <div className="min-w-0">
                <span className="block text-[8px] font-black uppercase tracking-wide opacity-65">Tipo</span>
                <strong className="mt-0.5 block truncate text-xs font-black">{rotuloTipoPerfilAtual}</strong>
              </div>
            </div>
            {podeAcessarAjustes && (
              <div className="mt-2 border-t border-white/20 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-wide opacity-65">Código Vendas</span>
                    <strong className="truncate font-mono text-xs font-black tracking-[0.1em]">
                      {codigoVinculoCarregando ? 'Carregando...' : codigoVinculoEmpresa || 'Indisponível'}
                    </strong>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={copiarCodigoVinculoEmpresa}
                      disabled={!codigoVinculoEmpresa}
                      className="rounded-md border border-white/30 bg-white/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={confirmarRegeneracaoCodigoVinculo}
                      className="rounded-md border border-white/30 bg-white/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide transition hover:bg-white/20"
                    >
                      Gerar novo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`px-6 pb-6 pt-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>

        {/* ── VISTA: menu de ações ── */}
        {!subAcaoGerenciar && (
          <div className="space-y-2.5">
            <div>
              <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.18em] ${textMuted}`}>
                Selecione o perfil para editar
              </p>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {empresasDoUsuario.map((perfil) => {
                  const podeEditarPerfil = perfil.perfil === 'gestor_master' || perfil.perfil === 'administrador';
                  const perfilAtivo = perfil.id === empresaId;
                  return (
                    <button
                      key={perfil.id}
                      type="button"
                      disabled={!podeEditarPerfil}
                      onClick={() => {
                        setModalEmpresasAberto(false);
                        setPerfilCadastroEdicaoId(perfil.id);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        podeEditarPerfil
                          ? darkMode
                            ? 'cursor-pointer border-slate-700 bg-slate-800/70 hover:bg-slate-800'
                            : 'cursor-pointer border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50'
                          : darkMode
                            ? 'cursor-not-allowed border-slate-700 bg-slate-800/40 opacity-55'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                      }`}
                    >
                      <span className="min-w-0">
                        <strong className={`block truncate text-sm font-black ${textStrong}`}>
                          {String(perfil.nome || perfil.empresa_nome || 'Perfil')}
                        </strong>
                        <span className={`mt-0.5 block text-[10px] font-bold ${textMuted}`}>
                          {rotuloTipoPerfil(perfil.tipo_perfil)}{perfilAtivo ? ' · Perfil ativo' : ''}
                        </span>
                      </span>
                      <span className={`shrink-0 text-[10px] font-black uppercase ${podeEditarPerfil ? 'text-sky-600' : textMuted}`}>
                        {podeEditarPerfil ? 'Editar' : 'Sem permissão'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`my-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

            <div className="grid grid-cols-2 gap-2">
            {podeAcessarAjustes && (
              <button
                type="button"
                onClick={async () => {
                  await abrirEdicaoEmpresaAtual(podeAcessarAjustes, tipoPerfilAtualNormalizado, true);
                  setSubAcaoGerenciar('editar');
                }}
                className={`flex min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-black leading-tight shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  darkMode ? 'border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${corPrimaria}14`, color: corPrimaria }}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </span>
                <span>Editar dados básicos e acesso</span>
              </button>
            )}

            {podeCriarNovaEmpresa && (
              <button
                type="button"
                onClick={() => {
                  setNomeEmpresaInicial('');
                  setTipoPerfilInicial('empresa');
                  setAuthErro('');
                  setSubAcaoGerenciar('criar');
                }}
                className={`flex min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-black leading-tight shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  darkMode ? 'border-slate-700 bg-slate-800/70 text-slate-100 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${corPrimaria}14`, color: corPrimaria }}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span>Criar novo perfil</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setModalEmpresasAberto(false); abrirTrocaEmpresa(); }}
              disabled={!podeTrocarEmpresa}
              className={`flex min-h-0 w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-black leading-tight shadow-sm transition ${
                podeTrocarEmpresa
                  ? darkMode
                    ? 'cursor-pointer border-slate-700 bg-slate-800/70 text-slate-100 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md'
                    : 'cursor-pointer border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md'
                  : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${corPrimaria}14`, color: corPrimaria }}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M7 7h11m0 0l-3-3m3 3l-3 3M17 17H6m0 0l3 3m-3-3l3-3" />
                </svg>
              </span>
              <span>Trocar perfil</span>
            </button>

            <button
              type="button"
              onClick={() => { setModalEmpresasAberto(false); confirmarExclusaoEmpresaAtual(); }}
              disabled={perfilUsuario !== 'gestor_master'}
              title={perfilUsuario === 'gestor_master' ? 'Excluir o perfil atual' : 'Somente o Gestor Master pode excluir o perfil'}
              className={`flex min-h-0 w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-black leading-tight shadow-sm transition ${
                perfilUsuario === 'gestor_master'
                  ? darkMode
                    ? 'cursor-pointer border-red-900/60 bg-red-950/30 text-red-200 hover:-translate-y-0.5 hover:bg-red-950/50 hover:shadow-md'
                    : 'cursor-pointer border-red-200 bg-red-50 text-red-700 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md'
                  : darkMode
                    ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-500 opacity-70'
                    : 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-80'
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                perfilUsuario === 'gestor_master' ? 'bg-red-100 text-red-700' : darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
              }`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
              <span>Excluir perfil</span>
            </button>
            </div>
          </div>
        )}

        {/* ── VISTA: editar dados inline ── */}
        {subAcaoGerenciar === 'editar' && (
          <div className="space-y-4">
            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                {labelNomePerfilEdicao}
              </label>
              <input
                type="text"
                value={editEmpresaNome}
                onChange={(e) => setEditEmpresaNome(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                  darkMode
                    ? 'border-slate-600 bg-slate-900 text-white focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-300 bg-white text-slate-800 focus:border-sky-600 focus:ring-sky-600/20'
                }`}
              />
            </div>

            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Tipo do perfil financeiro
              </label>
              <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${
                darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              }`}>
                {(['empresa', 'pessoal'] as TipoPerfil[]).map((tipo) => {
                  const ativo = editTipoPerfilNormalizado === tipo;
                  return (
                    <button key={tipo} type="button" onClick={() => setEditTipoPerfil(tipo)}
                      className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                        ativo ? 'text-white shadow-md' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-white hover:text-slate-800'
                      }`}
                      style={ativo ? estiloTemaPrimario : undefined}
                    >
                      {rotuloTipoPerfil(tipo)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Login ou email
              </label>
              <input
                type="text"
                value={editEmpresaLogin}
                onChange={(e) => setEditEmpresaLogin(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                  darkMode
                    ? 'border-slate-600 bg-slate-900 text-white focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-300 bg-white text-slate-800 focus:border-sky-600 focus:ring-sky-600/20'
                }`}
              />
            </div>

            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Nova senha
              </label>
              <input
                type="password"
                value={editEmpresaSenha}
                onChange={(e) => setEditEmpresaSenha(e.target.value)}
                placeholder="Deixe em branco para manter"
                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                  darkMode
                    ? 'border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-600/20'
                }`}
              />
              {perfilUsuario === 'gestor_master' && (
                <p className={`mt-1.5 text-xs font-semibold ${textMuted}`}>
                  Para Gestor Master, a senha deve ser alterada pela recuperação de senha.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => { fecharEdicaoEmpresaAtual(); setSubAcaoGerenciar(null); }}
                disabled={editEmpresaSalvando}
                className={`rounded-xl border px-4 py-3 text-xs font-black uppercase transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await salvarEdicaoEmpresaAtual();
                  if (ok) { setSubAcaoGerenciar(null); setModalEmpresasAberto(false); }
                }}
                disabled={editEmpresaSalvando}
                className="rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                style={estiloTemaPrimario}
              >
                {editEmpresaSalvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* ── VISTA: criar novo perfil inline ── */}
        {subAcaoGerenciar === 'criar' && (
          <div className="space-y-4">
            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                {labelNomePerfilInicial}
              </label>
              <input
                type="text"
                value={nomeEmpresaInicial}
                onChange={(e) => setNomeEmpresaInicial(e.target.value)}
                placeholder={placeholderPerfilInicial}
                autoFocus
                className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none transition focus:ring-2 ${
                  darkMode
                    ? 'border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-600/20'
                }`}
              />
            </div>

            <div>
              <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Tipo do perfil
              </label>
              <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${
                darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              }`}>
                {(['empresa', 'pessoal'] as TipoPerfil[]).map((tipo) => {
                  const ativo = tipoPerfilInicialNormalizado === tipo;
                  return (
                    <button key={tipo} type="button" onClick={() => setTipoPerfilInicial(tipo)}
                      className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                        ativo ? 'text-white shadow' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-white hover:text-slate-800'
                      }`}
                      style={ativo ? estiloTemaPrimario : undefined}
                    >
                      {rotuloTipoPerfil(tipo)}
                      {tipo === 'pessoal' && criandoNovaEmpresaLogada && criarPerfilPessoalBloqueado() && <span className="ml-1 text-xs" title="Recurso Premium">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {COBRANCA_ATIVA && tipoPerfilInicialNormalizado === 'empresa' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p className="text-xs font-bold leading-snug text-sky-900">
                  Perfil empresa tem <b>7 dias grátis</b>. Depois: R$ 34,90/mês, ou R$ 29,00/mês no plano anual.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['trial', 'assinar'] as const).map((m) => {
                    const ativo = inicioEmpresaModo === m;
                    return (
                      <button key={m} type="button" onClick={() => setInicioEmpresaModo(m)}
                        className={`rounded-lg px-2 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                          ativo ? 'bg-sky-700 text-white shadow' : 'bg-white text-slate-600 hover:bg-sky-100'
                        }`}
                      >
                        {m === 'trial' ? '7 dias grátis' : 'Assinar agora'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {authErro && (
              <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
                {authErro}
              </div>
            )}
            {authMensagem && (
              <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700">
                {authMensagem}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setAuthErro(''); setSubAcaoGerenciar(null); }}
                disabled={criandoEmpresaInicial}
                className={`rounded-xl border px-4 py-3 text-xs font-black uppercase transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarEmpresaInicialComGate}
                disabled={criandoEmpresaInicial}
                className="rounded-xl px-4 py-3 text-xs font-black uppercase text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                style={estiloTemaPrimario}
              >
                {criandoEmpresaInicial ? 'Criando...' : 'Criar perfil'}
              </button>
            </div>
          </div>
        )}

      </div>
    </DraggableModalCard>
  </div>
)}

{modalAvisoAberto && (
  <div
    className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharAviso}
  >
    <DraggableModalCard
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle className="mb-4 flex cursor-grab items-center gap-3 active:cursor-grabbing">
        <div
  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
    tipoAviso === 'sucesso'
      ? 'bg-emerald-100 text-emerald-700'
      : tipoAviso === 'erro'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700'
  }`}
>
  {tipoAviso === 'sucesso' ? (
    <span className="text-2xl font-black leading-none">✓</span>
  ) : (
    <span className="text-2xl font-black leading-none">!</span>
  )}
</div>

        <div>
          <h2 className="text-lg font-black text-slate-900">
            {tituloAviso}
          </h2>

          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {mensagemAviso}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={fecharAviso}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98] cursor-pointer"
        >
          Entendi
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{usuarioEditandoId && (
  <div
    className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 px-4"
    onClick={cancelarEdicaoUsuario}
  >
    <DraggableModalCard
      className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        data-modal-drag-handle
        className="-mx-6 -mt-6 mb-5 flex min-h-[96px] cursor-grab items-center justify-between gap-4 rounded-t-2xl px-6 py-5 active:cursor-grabbing"
        style={estiloTemaPrimario}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Usuários e permissões</p>
          <h2 className="mt-1 text-xl font-black">
            Editar usuário
          </h2>

          <p className="mt-1 text-sm opacity-80">
            Altere os dados do usuário ou redefina a senha diretamente.
          </p>
        </div>

        <button
          type="button"
          onClick={cancelarEdicaoUsuario}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-lg font-black transition hover:bg-black/10"
          style={{ borderColor: bordaSobreCorPrimaria, color: textoSobreCorPrimaria }}
          title="Fechar"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={editUsuarioNome}
          onChange={(e) => setEditUsuarioNome(e.target.value)}
          placeholder="Nome"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        />

        <input
          type="text"
          value={editUsuarioLogin}
          onChange={(e) => setEditUsuarioLogin(e.target.value)}
          placeholder="Login"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        />

        <input type="email" value={editUsuarioEmail} onChange={(e) => setEditUsuarioEmail(e.target.value)} placeholder="E-mail (opcional)" className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`} />

        <select
          value={editUsuarioPerfil}
          onChange={(e) =>
            setEditUsuarioPerfil(
              e.target.value as
                | 'gestor_master'
                | 'administrador'
                | 'operador_completo'
                | 'operador_simples'
            )
          }
          disabled={usuarioOriginalEditando?.perfil === 'gestor_master' && perfilUsuario !== 'gestor_master'}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        >
          <option value="operador_simples">Operador Simples</option>
          <option value="operador_completo">Operador Completo</option>
          <option value="administrador">Administrador</option>
          <option value="gestor_master">Gestor Master</option>
        </select>

        <div
          className={`rounded-xl border p-3 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/50'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className={`mb-2 text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Redefinir senha
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <input
                type={mostrarEditUsuarioNovaSenha ? 'text' : 'password'}
                value={editUsuarioNovaSenha}
                onChange={(e) => setEditUsuarioNovaSenha(e.target.value)}
                placeholder="Nova senha"
                className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm font-semibold outline-none ${
                  darkMode
                    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
                    : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
                }`}
              />
              <input type={mostrarEditUsuarioNovaSenha ? 'text' : 'password'} value={editUsuarioConfirmarSenha} onChange={(e) => setEditUsuarioConfirmarSenha(e.target.value)} placeholder="Confirmar nova senha" className={`mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`} />

              <button
  type="button"
  onClick={() => setMostrarEditUsuarioNovaSenha((mostrar) => !mostrar)}
  className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition cursor-pointer ${
    darkMode
      ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
  }`}
  title={mostrarEditUsuarioNovaSenha ? 'Ocultar senha' : 'Ver senha'}
>
  {mostrarEditUsuarioNovaSenha ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91" />
    </svg>
  )}
</button>
            </div>

            <button
              type="button"
              onClick={redefinirSenhaUsuario}
              className="rounded-xl border border-amber-500/40 px-4 py-2 text-xs font-black uppercase text-amber-600 transition hover:bg-amber-500/10 cursor-pointer"
            >
              Redefinir senha
            </button>
          </div>

          <p className={`mt-2 text-[11px] font-semibold ${textMuted}`}>
            A senha é salva imediatamente ao clicar em Redefinir senha.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={cancelarEdicaoUsuario}
          className={`rounded-xl border px-4 py-2 text-xs font-black uppercase transition cursor-pointer ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={!dadosUsuarioAlterados}
          onClick={salvarEdicaoUsuario}
          className={`rounded-xl px-5 py-2 text-xs font-black uppercase tracking-wide shadow-md transition ${
            dadosUsuarioAlterados
              ? 'cursor-pointer hover:brightness-110 active:scale-[0.98]'
              : 'cursor-not-allowed opacity-50'
          }`}
          style={estiloTemaPrimario}
        >
          Salvar alterações
        </button>
      </div>
    </DraggableModalCard>
  </div>
)}

{modalUsuarios && (
  <div
    className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 px-4 py-6"
    onClick={() => {
      setModalUsuarios(false);
      setAjudaUsuariosAberta(false);
    }}
  >
    <DraggableModalCard
      className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div data-modal-drag-handle
        className="-mx-6 -mt-6 mb-5 flex min-h-[108px] items-center justify-between gap-4 rounded-t-2xl border-b px-6 py-5"
        style={{ ...estiloTemaPrimario, borderColor: bordaSobreCorPrimaria }}
      >
  <div className="min-w-0 flex-1">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Configurações</p>
    <h2 className="mt-1 text-xl font-black">
      Usuários e Permissões
    </h2>

    <p className="mt-1 text-sm opacity-80">
      Cadastre usuários para acessar esta empresa e defina o nível de permissão.
    </p>
  </div>

  <div className="relative flex shrink-0 flex-col items-center gap-2">
    <button
      type="button"
      onClick={() => {
        setModalUsuarios(false);
        setAjudaUsuariosAberta(false);
      }}
      className="cursor-pointer rounded-lg px-3 py-1 text-sm font-black transition hover:bg-black/10"
      style={{ color: textoSobreCorPrimaria }}
    >
      ✕
    </button>

    <button
      type="button"
      onClick={() => setAjudaUsuariosAberta((aberto) => !aberto)}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-xs font-black transition hover:bg-black/10"
      style={{ borderColor: bordaSobreCorPrimaria, color: textoSobreCorPrimaria }}
      title="Ver explicação dos tipos de usuário"
    >
      ?
    </button>

    {ajudaUsuariosAberta && (
      <div
        className={`absolute right-0 top-16 z-[7000] w-80 rounded-2xl border p-4 text-left shadow-2xl ${
          darkMode
            ? 'border-slate-600 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className={`text-sm font-black uppercase ${textStrong}`}>
            Tipos de usuário
          </h3>

          <button
            type="button"
            onClick={() => setAjudaUsuariosAberta(false)}
            className={`text-xs font-black transition cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <strong className={textStrong}>Administrador:</strong>
            <p className={textMuted}>
              Pode gerenciar usuários, acessar o menu, inserir, editar e excluir lançamentos.
            </p>
          </div>

          <div>
            <strong className={textStrong}>Operador Completo:</strong>
            <p className={textMuted}>
              Pode inserir e editar lançamentos, mas não pode excluir lançamentos nem gerenciar usuários.
            </p>
          </div>

          <div>
            <strong className={textStrong}>Operador Simples:</strong>
            <p className={textMuted}>
              Pode apenas inserir lançamentos. Não pode editar, excluir ou acessar áreas administrativas.
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

      <div className="mb-5 mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => { if (recursoBloqueado('usuarios_internos')) { abrirPremium('usuarios_internos'); return; } abrirCriarNovoUsuario(); }}
          className={`rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-wide shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${
            modoFormularioUsuario === 'criar'
              ? darkMode
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200'
                : 'border-cyan-500 bg-cyan-50 text-cyan-800'
              : darkMode
                ? 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                : 'border-sky-100 bg-sky-50/80 text-sky-800 hover:border-sky-200 hover:bg-sky-100'
          }`}
        >
          Criar novo usuário{recursoBloqueado('usuarios_internos') && <span className="ml-1.5 text-xs" title="Recurso Premium">🔒</span>}
        </button>

        <button
          type="button"
          onClick={() => { if (recursoBloqueado('usuarios_internos')) { abrirPremium('usuarios_internos'); return; } abrirAdicionarUsuarioExistente(); }}
          className={`rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-wide shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${
            modoFormularioUsuario === 'existente'
              ? darkMode
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200'
                : 'border-cyan-500 bg-cyan-50 text-cyan-800'
              : darkMode
                ? 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                : 'border-emerald-100 bg-emerald-50/80 text-emerald-800 hover:border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          Adicionar usuário existente{recursoBloqueado('usuarios_internos') && <span className="ml-1.5 text-xs" title="Recurso Premium">🔒</span>}
        </button>
      </div>

      {modoFormularioUsuario === 'criar' ? (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.35fr_1fr_0.85fr_1.20fr_auto] md:items-center">
  <input
  type="text"
  value={usuarioNome}
  onChange={(e) => setUsuarioNome(e.target.value)}
  placeholder="Nome do usuário"
  autoComplete="off"
  name="novo-usuario-nome"
    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
  />

  <input
    type="text"
    value={usuarioLogin}
    onChange={(e) => setUsuarioLogin(e.target.value)}
    placeholder="Login"
    autoComplete="off"
name="novo-usuario-login"
    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
  />

  <div className="relative">
  <input
    type={mostrarUsuarioSenha ? 'text' : 'password'}
    value={usuarioSenha}
    onChange={(e) => setUsuarioSenha(e.target.value)}
    placeholder="Senha inicial"
    autoComplete="new-password"
    name="novo-usuario-senha"
    className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm font-semibold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
  />

  <button
    type="button"
    onClick={() => setMostrarUsuarioSenha((mostrar) => !mostrar)}
    className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition cursor-pointer ${
      darkMode
        ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`}
    title={mostrarUsuarioSenha ? 'Ocultar senha' : 'Ver senha'}
  >
    {mostrarUsuarioSenha ? (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" strokeWidth="2" />
      </svg>
    ) : (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91" />
      </svg>
    )}
  </button>
</div>

  <select
  value={usuarioPerfil}
  onChange={(e) =>
    setUsuarioPerfil(
      e.target.value as
        | ''
        | 'administrador'
        | 'operador_completo'
        | 'operador_simples'
    )
  }
  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none transition ${
    darkMode
      ? `bg-slate-900 border-slate-600 ${usuarioPerfil ? 'text-white' : 'text-slate-400'}`
      : `bg-white border-slate-300 ${usuarioPerfil ? 'text-slate-700' : 'text-slate-400'}`
  }`}
>
  <option
    value=""
    disabled
    className={darkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}
  >
    Tipo de usuário
  </option>

  <option
    value="operador_simples"
    className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}
  >
    Operador Simples
  </option>

  <option
    value="operador_completo"
    className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}
  >
    Operador Completo
  </option>

  <option
    value="administrador"
    className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}
  >
    Administrador
  </option>
</select>
<button
  type="button"
  onClick={adicionarUsuarioEmpresa}
  className="h-[38px] self-center rounded-md px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
  style={estiloTemaPrimario}
>
  Criar
</button>
</div>
      ) : modoFormularioUsuario === 'existente' ? (
        <div
          className={`rounded-2xl border p-4 ${
            darkMode
              ? 'border-slate-700 bg-slate-900/50'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="mb-3">
            <h3 className={`text-base font-black ${textStrong}`}>
              Adicionar usuário existente
            </h3>

            <p className={`mt-1 text-sm ${textMuted}`}>
              Informe o e-mail ou login do usuário já cadastrado para vinculá-lo à empresa atual.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <input
              type="text"
              value={usuarioExistenteTermo}
              onChange={(e) => {
                setUsuarioExistenteTermo(e.target.value);
                setUsuarioEncontrado(null);
                setPerfilUsuarioExistente('');
              }}
              placeholder="E-mail ou login do usuário"
              autoComplete="off"
              name="usuario-existente-termo"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
                  : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
              }`}
            />

            <button
              type="button"
              onClick={buscaUsuarioExistente}
              disabled={pesquisandoUsuarioExistente}
              className="h-[38px] rounded-md px-4 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] cursor-pointer"
              style={estiloTemaPrimario}
            >
              {pesquisandoUsuarioExistente ? 'Pesquisando...' : 'Pesquisar usuário'}
            </button>

            <button
              type="button"
              onClick={ocultarFormularioUsuario}
              className={`h-[38px] rounded-md border px-4 py-1 text-[11px] font-black uppercase tracking-wide transition cursor-pointer ${
                darkMode
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 text-slate-600 hover:bg-white'
              }`}
            >
              Cancelar
            </button>
          </div>

          {usuarioEncontrado && (
            <div
              className={`mt-4 rounded-2xl border p-4 ${
                darkMode
                  ? 'border-cyan-500/30 bg-cyan-500/10'
                  : 'border-cyan-100 bg-white'
              }`}
            >
              <p className={`text-xs font-black uppercase tracking-wide ${textMuted}`}>
                Usuário encontrado
              </p>

              <div className="mt-3 grid gap-2 text-sm">
                <p className={textMuted}>
                  <strong className={textStrong}>E-mail:</strong>{' '}
                  {usuarioEncontrado.email || '-'}
                </p>

                <p className={textMuted}>
                  <strong className={textStrong}>Login:</strong>{' '}
                  {usuarioEncontrado.login || '-'}
                </p>

                <p className={textMuted}>
                  <strong className={textStrong}>Status:</strong>{' '}
                  ainda não vinculado a esta empresa
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <select
                  value={perfilUsuarioExistente}
                  onChange={(e) =>
                    setPerfilUsuarioExistente(
                      e.target.value as
                        | ''
                        | 'gestor_master'
                        | 'administrador'
                        | 'operador_completo'
                        | 'operador_simples'
                    )
                  }
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none transition ${
                    darkMode
                      ? `bg-slate-900 border-slate-600 ${perfilUsuarioExistente ? 'text-white' : 'text-slate-400'}`
                      : `bg-white border-slate-300 ${perfilUsuarioExistente ? 'text-slate-700' : 'text-slate-400'}`
                  }`}
                >
                  <option
                    value=""
                    disabled
                    className={darkMode ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}
                  >
                    Selecione o perfil de acesso
                  </option>

                  <option value="gestor_master" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}>
                    Gestor Master
                  </option>

                  <option value="administrador" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}>
                    Administrador
                  </option>

                  <option value="operador_completo" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}>
                    Operador Completo
                  </option>

                  <option value="operador_simples" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}>
                    Operador Simples
                  </option>
                </select>

                <button
                  type="button"
                  onClick={confirmarVinculoUsuarioExistente}
                  disabled={vinculandoUsuarioExistente}
                  className="h-[38px] rounded-md px-4 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] cursor-pointer"
                  style={estiloTemaPrimario}
                >
                  {vinculandoUsuarioExistente ? 'Vinculando...' : 'Confirmar vínculo'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsuarioEncontrado(null);
                    setPerfilUsuarioExistente('');
                  }}
                  className={`h-[38px] rounded-md border px-4 py-1 text-[11px] font-black uppercase tracking-wide transition cursor-pointer ${
                    darkMode
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-0 flex justify-end">
        
      </div>

      <div className="mt-6 border-t border-slate-200/20 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Usuários cadastrados
          </h3>

          {usuariosCarregando && (
            <span className={`text-[11px] font-bold ${textMuted}`}>
              Carregando...
            </span>
          )}
        </div>

        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {usuariosEmpresa.length === 0 ? (
            <div
              className={`rounded-xl border px-3 py-3 text-xs font-semibold ${
                darkMode
                  ? 'border-slate-700 text-slate-400'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              Nenhum usuário cadastrado ainda.
            </div>
          ) : (
            usuariosEmpresa.map((usuario) => (
              <div
  key={usuario.id}
  className={`rounded-xl border px-3 py-3 ${
    darkMode
      ? 'border-slate-700 bg-slate-900/60'
      : 'border-slate-200 bg-slate-50'
  }`}
>
      <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-sm font-black ${textStrong}`}>
          {usuario.nome || 'Sem nome'}
        </p>

        <p className={`text-xs font-semibold ${textMuted}`}>
  Login: {usuario.login || (String(usuario.email || '').includes('@usuarios.avantalab.local') ? String(usuario.email || '').split('+')[0] : usuario.email)}
</p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
              usuario.status === 'ativo'
                ? darkMode
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-100 text-emerald-700'
                : usuario.status === 'pendente'
                  ? darkMode
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-amber-100 text-amber-700'
                  : darkMode
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-red-100 text-red-700'
            }`}
          >
            {usuario.status}
          </span>

          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
              darkMode
                ? 'bg-slate-700 text-slate-300'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {usuario.perfil === 'gestor_master'
              ? 'Gestor Master'
              : usuario.perfil === 'administrador'
                ? 'Administrador'
                : usuario.perfil === 'operador_completo'
                  ? 'Operador Completo'
                  : 'Operador Simples'}
          </span>
        </div>
      </div>

      {(
  perfilUsuario === 'gestor_master' ||
  usuario.perfil !== 'gestor_master' ||
  (usuario.login || usuario.email || '').toLowerCase() ===
    (emailUsuarioAtual || '').toLowerCase()
) && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => iniciarEdicaoUsuario(usuario)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase transition cursor-pointer ${
              darkMode
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => excluirAcessoUsuario(usuario.id)}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase transition cursor-pointer ${
              darkMode
                ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
</div>
            ))
          )}
        </div>
      </div>
    </DraggableModalCard>
  </div>
)}

      {calcAberta && (
        <Calculadora onClose={() => setCalcAberta(false)} corPrimaria={corPrimaria} darkMode={darkMode} />
      )}

      {/* ================= HEADER GLOBAL ================= */}

      <div className="contents">
      <AppHeader
        darkMode={darkMode}
        textMuted={textMuted}
        textStrong={textStrong}
        bgCard={bgCard}
        corPrimaria={corPrimaria}
        textoSobreCorPrimaria={textoSobreCorPrimaria}
        bordaSobreCorPrimaria={bordaSobreCorPrimaria}
        corEhClara={corEhClara}
        estiloTemaPrimario={estiloTemaPrimario}
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtivaComGate}
        abasPremium={recursoBloqueado('analises') ? ['Gráficos', 'Relatório'] : []}
        ajustesAberto={ajustesAberto}
        setAjustesAberto={setAjustesAberto}
        menuResponsivoAberto={menuResponsivoAberto}
        setMenuResponsivoAberto={setMenuResponsivoAberto}
        painelAvisosAberto={painelAvisosAberto}
        setPainelAvisosAberto={setPainelAvisosAberto}
        anoSelecionado={anoSelecionado}
        setAnoSelecionado={setAnoSelecionado}
        setMesAtivo={setMesAtivo}
        alertasSistema={alertasSistema}
        onExcluirAviso={excluirNotificacaoWeb}
        onLimparAvisos={limparNotificacoesWeb}
        calcAberta={calcAberta}
        setCalcAberta={setCalcAberta}
        confirmarLogout={confirmarLogout}
        logoUrl={logoUrl}
        logoSettings={logoSettings}
        onAbrirLogo={abrirModalLogoPeloHeader}
        setModalEmpresasAberto={setModalEmpresasAberto}
        agendaHojeCount={agendaHojeCount}
        onAbrirAgenda={() => {
          const hoje = new Date();
          setAgendaMesAtivo(hoje.getMonth());
          setAgendaAnoAtivo(hoje.getFullYear());
          setAgendaDiaSelecionado(hoje.getDate());
          setAgendaFormAberto(false);
          setAgendaAberta(true);
        }}
      />
      </div>
      {emCarencia(estadoAcesso) && (
        <button
          type="button"
          onClick={() => setModalAssinatura(true)}
          className="print-ocultar w-full border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          Pagamento pendente. Regularize até {new Date(estadoAcesso!.validoAte!).toLocaleDateString('pt-BR')} para evitar o bloqueio. Ver assinatura
        </button>
      )}

      <input
        ref={backupImportInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={selecionarArquivoBackup}
      />

            {/* ================= MENU GERAL ================= */}
{ajustesAberto && (
  <>
    <div
      className="fixed inset-0 z-[1190] bg-transparent"
      onPointerDown={() => { setAjustesAberto(false); setMenuAjuste(null); }}
    />

    <div
      className="print-ocultar fixed bottom-0 left-0 top-[92px] z-[1200] flex w-[296px] max-w-[calc(100vw-18px)] flex-col gap-2 overflow-hidden rounded-r-2xl border border-l-0 border-slate-700 bg-slate-900 p-3 text-white shadow-2xl transition-[transform,opacity] xl:top-[108px]"
    style={{ borderTopColor: corPrimaria, borderTopWidth: '3px', borderRightColor: corPrimaria }}
    onMouseMove={reiniciarTimerAjustes}
    onMouseDown={reiniciarTimerAjustes}
    onKeyDown={reiniciarTimerAjustes}
    onFocus={reiniciarTimerAjustes}
  >
    <div className="mb-2 flex shrink-0 items-center justify-between border-b border-slate-700 pb-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AvantaLab</p><h2 className="mt-1 text-base font-black">Menu</h2></div>
      <button type="button" onClick={() => { setAjustesAberto(false); setMenuAjuste(null); }} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-lg text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Fechar menu">×</button>
    </div>
    <div ref={painelAjustesRef} className="custom-scroll flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto pr-1">

        {/* 1. Cadastrar Despesas + 2. Instrucoes (icone ?) */}
        <div className="order-10 flex w-full items-center gap-1.5">
          <Tooltip texto="Cadastre e edite as despesas base (modelos) usadas nos lançamentos." posicao="right" wrapperClassName="flex-1">
            <button
              onClick={() => { setAjustesAberto(false); setModalDespesasBase(true); }}
              className="flex min-h-10 flex-1 items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Cadastrar Despesas
            </button>
          </Tooltip>

          <Tooltip texto="Instruções sobre categoria" posicao="right">
            <button
              type="button"
              aria-label="Instruções sobre categoria"
              onClick={() => { setAjustesAberto(false); setModalInstrucoes(true); }}
              className="flex h-6 w-6 items-center justify-center rounded-full border bg-slate-800 hover:bg-slate-700 transition-colors"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* 3. Modulos */}
        <Tooltip texto="Ative módulos extras (como o Controle de Ponto) para a sua empresa." posicao="right" wrapperClassName="order-20 w-full">
          <button
            onClick={() => { setAjustesAberto(false); setModalModulos(true); }}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black shadow-md transition-all hover:brightness-110 hover:shadow-lg"
            style={{
              color: corEhClara(corPrimaria) ? '#0f172a' : '#ffffff',
              background: `linear-gradient(90deg, ${corPrimaria} 0%, color-mix(in srgb, ${corPrimaria} 72%, #0f172a) 100%)`,
              borderColor: corPrimaria,
              boxShadow: `0 7px 18px ${corPrimaria}42`,
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Módulos
          </button>
        </Tooltip>

        {/* 3b. Assinatura (só com cobrança ativa, para gestor master / administrador) */}
        {COBRANCA_ATIVA && (perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador') && (
          <Tooltip texto="Veja a situação da sua assinatura e do plano." posicao="right" wrapperClassName="order-25 w-full">
            <button
              onClick={() => { setAjustesAberto(false); setModalAssinatura(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Assinatura
            </button>
          </Tooltip>
        )}

        {/* 4. Ponto */}
        {modulosAtivos.includes('ponto') && podeGerenciarPonto && (
          <Tooltip texto="Gerencie funcionários, local da empresa e relatórios de ponto." posicao="right" wrapperClassName="order-30 w-full">
            <button
              onClick={() => { setAjustesAberto(false); setAbaInicialPontoAdmin('lista'); setRelatorioInicialPonto(null); setInstanciaPontoAdmin((atual) => atual + 1); setModalPontoAdmin(true); carregarFuncionariosPonto(); carregarPontoConfig(); carregarDiasNaoUteisPonto(); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ponto
            </button>
          </Tooltip>
        )}

        {/* 4a. Recebimentos Presenciais */}
        {modulosAtivos.includes('recebimentos_presencial') && podeGerenciarRecebimentos && (
          <Tooltip texto="Gerencie empresas, colaboradores e a conferência dos recebimentos em campo." posicao="right" wrapperClassName="order-40 w-full">
            <button
              onClick={() => { setAjustesAberto(false); setModalRecebimentos(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 3h12v18l-2.5-1.7L13 21l-2.5-1.7L8 21l-2-1.4V3Zm3 5h6M9 12h6M9 16h3" />
              </svg>
              Recebimentos
            </button>
          </Tooltip>
        )}

        {/* 4b. Vendas Mobile */}
        {modulosAtivos.includes('vendas_mobile') && podeAcessarVendasMobileWeb && (
          <Tooltip texto="Publique novidades e organize fotos e vídeos para a equipe do Vendas Mobile." posicao="right" wrapperClassName="order-50 w-full">
            <button
              onClick={() => { setAjustesAberto(false); setMenuAjuste(null); setModalNovidadesVendas(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 11 18-5v12L3 14zM11.6 16.4 13 21H8l-1.5-6" /></svg>
              Vendas Mobile
            </button>
          </Tooltip>
        )}

        {/* 5. Visual (dropdown) */}
        <Tooltip texto="Personalize a aparência: logo, cor do tema e modo escuro." posicao="right" wrapperClassName="order-60 w-full">
          <button
            type="button"
            onClick={(e) => alternarMenuAjuste('visual', e)}
            aria-expanded={menuAjuste === 'visual'}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold shadow transition-colors hover:bg-slate-700"
            style={{ borderColor: corPrimaria }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 16l.75 2.25L8 19l-2.25.75L5 22l-.75-2.25L2 19l2.25-.75L5 16zM19 14l.65 1.85L21.5 16.5l-1.85.65L19 19l-.65-1.85-1.85-.65 1.85-.65L19 14z" />
            </svg>
            Visual
            <svg className="w-3 h-3" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </Tooltip>

        {/* 7. Configuracoes (dropdown) */}
        <Tooltip texto="Configurações: duplicados, usuários, perfil, backup e restauração." posicao="right" wrapperClassName="order-80 w-full">
          <button
            type="button"
            onClick={(e) => alternarMenuAjuste('config', e)}
            aria-expanded={menuAjuste === 'config'}
            className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold text-white shadow transition-colors hover:bg-slate-700 cursor-pointer"
            style={{ borderColor: corPrimaria }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configurações
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </Tooltip>

        {/* 8. Sobre + Tutorial (colados à direita) */}
        <div className="order-100 flex w-full flex-col gap-2 border-t border-slate-700 pt-2">
          <Tooltip texto="Sobre o AvantaLab e novidades das versões." posicao="right" wrapperClassName="w-full">
            <button
              type="button"
              onClick={() => { setAjustesAberto(false); setModalSobre(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border bg-slate-800 px-3 py-2 text-left text-xs font-bold text-white shadow transition-colors hover:bg-slate-700 cursor-pointer"
              style={{ borderColor: corPrimaria }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Sobre
            </button>
          </Tooltip>
          <Tooltip texto="Reveja o tour guiado de uso do sistema." posicao="right" wrapperClassName="w-full">
            <button
              type="button"
              onClick={() => { setAjustesAberto(false); setTourAberto(true); }}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-indigo-400/50 bg-gradient-to-r from-indigo-700 to-indigo-500 px-3 py-2 text-left text-xs font-bold text-white shadow transition-all hover:brightness-110 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Tutorial
            </button>
          </Tooltip>
        </div>
    {/* ===== DROPDOWN: VISUAL ===== */}
    {menuAjuste === 'visual' && menuAjusteRect && (
        <div data-ajustes-submenu="visual" className="relative z-[1210] order-70 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2 shadow-xl">
          <button
            type="button"
            onClick={() => { if (!podeAcessarAjustes) { abrirAviso('Acesso não permitido', 'Você não tem permissão para alterar a logomarca da empresa.'); return; } setAjustesAberto(false); setModalLogo(true); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-slate-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="#ffffff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Logo
          </button>

          <div className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: corPrimaria }}></span>
            Cor do tema
            {podeAcessarAjustes ? (
              <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            ) : (
              <button type="button" onClick={() => abrirAviso('Acesso não permitido', 'Você não tem permissão para alterar a cor tema da empresa.')} className="absolute inset-0 w-full h-full cursor-not-allowed opacity-0" aria-label="Sem permissao para alterar a cor tema" />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
            <span>Modo escuro</span>
            <div className={`w-7 h-3.5 rounded-full relative transition-colors ${darkMode ? '' : 'bg-slate-600'}`} style={{ backgroundColor: darkMode ? corPrimaria : '', border: darkMode && corEhClara(corPrimaria) ? '1px solid rgba(15, 23, 42, 0.35)' : '' }}>
              <span className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${darkMode ? 'translate-x-3.5' : ''}`} style={{ backgroundColor: darkMode && corEhClara(corPrimaria) ? '#0f172a' : '#ffffff' }} />
            </div>
          </div>
        </div>
    )}

    {/* ===== DROPDOWN: CONFIGURACOES ===== */}
    {menuAjuste === 'config' && menuAjusteRect && (
        <div data-ajustes-submenu="config" className="relative z-[1210] order-90 w-full rounded-xl border border-slate-700 bg-slate-950/80 p-2 shadow-xl">
          <Tooltip texto="Ativa ou desativa o aviso ao lançar uma despesa duplicada no mesmo mês." posicao="right" wrapperClassName="w-full">
            <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer" onClick={() => setDuplicadosAtivo(!duplicadosAtivo)}>
              <span>Duplicados</span>
              <div className={`w-7 h-3.5 rounded-full relative transition-colors ${duplicadosAtivo ? '' : 'bg-slate-600'}`} style={{ backgroundColor: duplicadosAtivo ? corPrimaria : '', border: duplicadosAtivo && corEhClara(corPrimaria) ? '1px solid rgba(15, 23, 42, 0.35)' : '' }}>
                <span className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${duplicadosAtivo ? 'translate-x-3.5' : ''}`} style={{ backgroundColor: duplicadosAtivo && corEhClara(corPrimaria) ? '#0f172a' : '#ffffff' }} />
              </div>
            </button>
          </Tooltip>

          <Tooltip texto="Define se os valores financeiros começam ocultos ao abrir o sistema neste dispositivo." posicao="right" wrapperClassName="w-full">
            <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer" onClick={alternarInicioValoresOcultos}>
              <span className="min-w-0 text-left">
                <span className="block truncate">Iniciar valores ocultos</span>
                <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-400">
                  {iniciarValoresOcultos ? 'Privacidade ativa ao abrir' : 'Valores visíveis ao abrir'}
                </span>
              </span>
              <div className={`relative h-3.5 w-7 shrink-0 rounded-full transition-colors ${iniciarValoresOcultos ? '' : 'bg-slate-600'}`} style={{ backgroundColor: iniciarValoresOcultos ? corPrimaria : '', border: iniciarValoresOcultos && corEhClara(corPrimaria) ? '1px solid rgba(15, 23, 42, 0.35)' : '' }}>
                <span className={`absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full transition-transform ${iniciarValoresOcultos ? 'translate-x-3.5' : ''}`} style={{ backgroundColor: iniciarValoresOcultos && corEhClara(corPrimaria) ? '#0f172a' : '#ffffff' }} />
              </div>
            </button>
          </Tooltip>

          {podeGerenciarUsuarios && (
            <Tooltip texto="Cadastre usuários e gerencie suas permissões de acesso ao perfil." posicao="right" wrapperClassName="w-full">
              <button type="button" onClick={() => { setAjustesAberto(false); abrirModalUsuarios(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-6a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Usuários
              </button>
            </Tooltip>
          )}

          <Tooltip texto="Gerencie, alterne ou edite seus perfis financeiros." posicao="right" wrapperClassName="w-full">
            <button type="button" onClick={() => { setAjustesAberto(false); setModalEmpresasAberto(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13 13 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Perfil
            </button>
          </Tooltip>

          {podeAcessarAjustes && (
            <Tooltip texto="Analise solicitações de acesso aos módulos deste perfil." posicao="right" wrapperClassName="w-full">
              <button type="button" onClick={() => { setAjustesAberto(false); setMenuAjuste(null); abrirAprovacoes(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-white transition-colors hover:bg-slate-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                Aprovações
                {solicitacoesAprovacao.length > 0 && <span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">{solicitacoesAprovacao.length}</span>}
              </button>
            </Tooltip>
          )}

          <div className="my-1 border-t border-slate-700" />

          <Tooltip texto="Exporte os dados do perfil atual para um arquivo Excel." posicao="right" wrapperClassName="w-full">
            <button
              onClick={() => { if (recursoBloqueado('exportacao')) { setAjustesAberto(false); abrirPremium('exportacao'); return; } if (!podeAcessarAjustes) { abrirAviso('Acesso não permitido', 'Você não tem permissão para gerar backup dos dados da empresa.'); return; } setAjustesAberto(false); abrirConfirmacao({ titulo: 'Gerar backup', mensagem: 'O sistema vai gerar um arquivo Excel com os dados da empresa atual.\n\nDeseja continuar?', textoConfirmar: 'Gerar backup', acao: async () => { await gerarBackupExcel(backupParams()); } }); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-emerald-300 transition-colors hover:bg-slate-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Backup{recursoBloqueado('exportacao') && <span className="ml-auto text-[10px]" title="Recurso Premium">🔒</span>}
            </button>
          </Tooltip>

          <Tooltip texto="Importe um arquivo de backup para restaurar os dados do perfil." posicao="right" wrapperClassName="w-full">
            <button type="button" onClick={() => { if (recursoBloqueado('exportacao')) { setAjustesAberto(false); setMenuAjuste(null); abrirPremium('exportacao'); return; } setMenuAjuste(null); abrirImportacaoBackup(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-cyan-300 transition-colors hover:bg-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V7a3 3 0 013-3h10a3 3 0 013 3v1M12 4v12m0 0l-4-4m4 4l4-4M5 20h14" /></svg>
              Restauração{recursoBloqueado('exportacao') && <span className="ml-auto text-[10px]" title="Recurso Premium">🔒</span>}
            </button>
          </Tooltip>
        </div>
    )}

          {statusConfig !== 'idle' && (
            <div
              className={`order-[95] rounded-full px-3 py-0.5 text-center text-[10px] font-bold leading-tight ${
                statusConfig === 'saving'
                  ? 'bg-sky-50 text-sky-700'
                  : statusConfig === 'saved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
              }`}
            >
              {statusConfig === 'saving' && 'Salvando configurações.'}
              {statusConfig === 'saved' && 'Configurações salvas'}
              {statusConfig === 'error' && 'Erro ao salvar configurações'}
            </div>
          )}
        </div>
    </div>
      </>
)}

      {/* RENDERIZAÇÃO CONDICIONAL DAS TELAS */}
      {mesAtivo ? (
        <>
          <div
  className="print-ocultar sticky top-[92px] z-[850] shadow-md pt-1 pb-2 text-white xl:top-[108px]"
  style={{ backgroundColor: corPrimaria }}
>
  <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 items-center gap-3 px-3 sm:px-5 lg:px-6 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] xl:gap-4 xl:px-8">
    {/* ESQUERDA: MÊS COM SETAS + DESPESAS FIXAS */}
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      {/* MÊS SELECIONADO */}
      <div className="flex min-w-0 flex-col items-center gap-1">
        <span className="text-[8px] font-black uppercase tracking-[0.26em] text-white/70 leading-none">
          Mês do lançamento
        </span>
        <div className="flex min-w-0 items-stretch overflow-hidden rounded-xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={() => {
              const indiceAtual = meses.indexOf(mesAtivo);
              const mesAnterior = meses[indiceAtual - 1];

              if (mesAnterior) {
                setMesAtivo(mesAnterior);
              }
            }}
            disabled={meses.indexOf(mesAtivo) === 0}
            className="flex shrink-0 items-center justify-center px-3.5 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
            style={{ color: corPrimaria }}
            aria-label="Mês anterior"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
            </svg>
          </button>

          <div className="w-px shrink-0 bg-slate-200" />

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2 sm:min-w-[168px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-4 w-4 shrink-0 opacity-70" style={{ color: corPrimaria }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
            </svg>
            <span className="truncate text-base font-black uppercase tracking-wide sm:text-lg" style={{ color: corPrimaria }}>
              {mesAtivo}
            </span>
            <span className="shrink-0 text-sm font-bold text-slate-400 sm:text-base">
              {anoSelecionado}
            </span>
          </div>

          <div className="w-px shrink-0 bg-slate-200" />

          <button
            type="button"
            onClick={() => {
              const indiceAtual = meses.indexOf(mesAtivo);
              const proximoMes = meses[indiceAtual + 1];

              if (proximoMes) {
                setMesAtivo(proximoMes);
              }
            }}
            disabled={meses.indexOf(mesAtivo) === meses.length - 1}
            className="flex shrink-0 items-center justify-center px-3.5 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
            style={{ color: corPrimaria }}
            aria-label="Próximo mês"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* DESPESAS FIXAS */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[8px] font-black uppercase tracking-[0.26em] text-white/70 leading-none">
          Repetem todo mês
        </span>
        <button
          type="button"
          onClick={abrirModalDespesasFixas}
          className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-black/15 px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-black/25 sm:w-auto cursor-pointer"
          title="Gerenciar despesas fixas"
        >
          <span>⚙</span>
          <span>Despesas fixas</span>
        </button>
      </div>
    </div>

    {/* DIREITA: RESUMOS ALINHADOS AO LIMITE DO CONTEÚDO */}
    <div className="flex min-w-0 max-w-full flex-1 flex-col items-end gap-1.5 overflow-hidden">
      <div className="grid w-full max-w-[520px] grid-cols-2 items-stretch justify-end gap-1.5 min-[1180px]:grid-cols-4">
  <div className="h-10 min-w-0 rounded-md bg-white px-2 py-1 text-left shadow-sm border border-white/20">
  <div className="mb-1 flex items-center justify-between gap-2">
    <span className="min-w-0 truncate text-[9px] font-bold uppercase text-slate-500">
  {mostrarBarraComparativoDespesas
    ? `Vs. ${mesAnteriorParaAnalise}`
    : 'Vs. mês ant.'}
</span>

    <span
      className="shrink-0 text-[9px] font-black"
      style={{
        color: mostrarBarraComparativoDespesas
          ? corBarraDespesas
          : '#94a3b8',
      }}
    >
      {mostrarBarraComparativoDespesas
        ? `${percentualDespesasVsMesAnterior.toFixed(1)}%`
        : '--'}
    </span>
  </div>

  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: mostrarBarraComparativoDespesas
          ? `${percentualBarraDespesas}%`
          : '0%',
        backgroundColor: mostrarBarraComparativoDespesas
          ? corBarraDespesas
          : '#94a3b8',
      }}
    />
  </div>
</div>

  {/* Total Despesas */}
  <div className="h-10 min-w-0 rounded-md bg-white px-2 py-1.5 text-right shadow-sm border border-white/20">
    <span className="block truncate text-[9px] font-bold uppercase text-slate-500">
      Total Despesas
    </span>
    <span className="block truncate text-[10px] font-black text-red-500">
      {formatarMoeda(totalDespesasMes)}
    </span>
  </div>

  {/* Total Faturado */}
  <div className="h-10 min-w-0 rounded-md bg-white px-2 py-1.5 text-right shadow-sm border border-white/20">
    <span className="block truncate text-[9px] font-bold uppercase text-slate-500">
      Total faturado
    </span>
    <span className="block truncate text-[10px] font-black text-emerald-600">
      {formatarMoeda(faturamentoDoMesAtual)}
    </span>
  </div>
  {/* Saldo do Mês */}
  <div className="h-10 min-w-0 rounded-md bg-white px-2 py-1.5 text-right shadow-sm border border-white/20">
    <span className="block truncate text-[9px] font-bold uppercase text-slate-500">
      Saldo do Mês
    </span>
    <span
      className={`block truncate text-[10px] font-black ${
        lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {formatarMoeda(lucroOperacional)}
    </span>
  </div>
</div>

      
    </div>
  </div>
</div>

          <main className={classePaginaInterna}>
            <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-start">
              <div onClick={() => setBlocoAtivo('despesa')} className="min-w-0 cursor-pointer transition-[width,opacity] duration-300 ease-in-out" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1280 ? (blocoAtivo === 'despesa' ? '62%' : blocoAtivo === 'receita' ? '38%' : '50%') : '100%', opacity: blocoAtivo === 'receita' ? 0.5 : 1 }}>
<TabelaLancamentosDespesa
              bgCard={bgCard}
              corPrimaria={corPrimaria}
              darkMode={darkMode}
              textStrong={textStrong}
              textMuted={textMuted}
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
              buscaLancamento={buscaLancamento}
              setBuscaLancamento={setBuscaLancamento}
              buscaBloqueada={recursoBloqueado('busca_lancamentos')}
              onBuscaBloqueada={() => abrirPremium('busca_lancamentos')}
              lancamentosFiltradosDoMes={lancamentosFiltradosDoMes}
              lancamentoEditandoId={lancamentoEditandoId}
              editDia={editDia}
              setEditDia={setEditDia}
              editDespesa={editDespesa}
              setEditDespesa={setEditDespesa}
              editDescricao={editDescricao}
              setEditDescricao={setEditDescricao}
              editValor={editValor}
              handleEditValorChange={handleEditValorChange}
              salvarEdicaoLancamento={salvarEdicaoLancamento}
              cancelarEdicaoLancamento={cancelarEdicaoLancamento}
              iniciarEdicaoLancamento={iniciarEdicaoLancamento}
              onSolicitarExclusaoLancamento={solicitarExclusaoLancamento}
              alturaTabelaLancamentos={alturaTabelaLancamentos}
              setAlturaTabelaLancamentos={setAlturaTabelaLancamentos}
              alturaFinalTabelaLancamentos={alturaFinalTabelaLancamentos}
              alturaMaximaTabelaLancamentos={alturaMaximaTabelaLancamentos}
              quantidadeLancamentosMes={quantidadeLancamentosMes}
              alturaPadraoTabela={ALTURA_PADRAO_TABELA}
              espacoPuxadorTabela={ESPACO_PUXADOR_TABELA}
              estiloTemaPrimario={estiloTemaPrimario}
              getMaxDias={getMaxDias}
              formatarMoeda={formatarMoeda}
              formatarDescricao={formatarDescricao}
              expandidoDespesa={blocoAtivo === 'despesa'}
              onFocoDespesa={() => setBlocoAtivo('despesa')}
              formParcelar={formParcelar}
              setFormParcelar={setFormParcelar}
              formParcelas={formParcelas}
              setFormParcelas={setFormParcelas}
              lerNotaPorFoto={lerNotaPorFoto}
              lendoNota={lendoNota}
              notaPendente={Boolean(notaPendente)}
              limparNotaPendente={() => setNotaPendente(null)}
              temRascunhoImportador={temRascunhoImportador}
              onRetomarRascunhoImportador={() => setRetomarRascunhoImportador(true)}
              onVerNota={abrirNotaLancamento}
              salvandoDespesa={salvandoDespesa}
            />
              </div>

              <div onClick={() => setBlocoAtivo('receita')} className="min-w-0 cursor-pointer transition-[width,opacity] duration-300 ease-in-out" style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1280 ? (blocoAtivo === 'receita' ? '62%' : blocoAtivo === 'despesa' ? '38%' : '50%') : '100%', opacity: blocoAtivo === 'despesa' ? 0.5 : 1 }}>
<CardEntradaFaturamento
  mesAtivo={mesAtivo}
  anoSelecionado={anoSelecionado}
  entradaFaturamentoDia={entradaFaturamentoDia}
  setEntradaFaturamentoDia={setEntradaFaturamentoDia}
  entradaFaturamentoOrigem={entradaFaturamentoOrigem}
  setEntradaFaturamentoOrigem={setEntradaFaturamentoOrigem}
  entradaFaturamentoValor={entradaFaturamentoValor}
  handleEntradaFaturamentoValorChange={handleEntradaFaturamentoValorChange}
  adicionarEntradaFaturamento={adicionarEntradaFaturamento}
  entradaFaturamentoSalvando={entradaFaturamentoSalvando}
  faturamentoDoMes={faturamentos[mesAtivo || ''] || 0}
  totalEntradasFaturamentoDoMes={totalEntradasFaturamentoDoMes}
  ordemEntradasFaturamento={ordemEntradasFaturamento}
  setOrdemEntradasFaturamento={setOrdemEntradasFaturamento}
  buscaEntradaFaturamento={buscaEntradaFaturamento}
  setBuscaEntradaFaturamento={setBuscaEntradaFaturamento}
  getMaxDias={getMaxDias}
  formatarMoeda={formatarMoeda}
  corPrimaria={corPrimaria}
  darkMode={darkMode}
  bgCard={bgCard}
  textStrong={textStrong}
  textMuted={textMuted}
  entradas={entradasFaturamentoDoMes}
  podeEditarEntradas={podeEditarLancamentos}
  entradaEditandoId={entradaFaturamentoEditandoId}
  editEntradaDia={editEntradaFaturamentoDia}
  setEditEntradaDia={setEditEntradaFaturamentoDia}
  editEntradaOrigem={editEntradaFaturamentoOrigem}
  setEditEntradaOrigem={setEditEntradaFaturamentoOrigem}
  editEntradaValor={editEntradaFaturamentoValor}
  handleEditEntradaValorChange={handleEditEntradaFaturamentoValorChange}
  onIniciarEdicaoEntrada={iniciarEdicaoEntradaFaturamento}
  onSalvarEdicaoEntrada={salvarEdicaoEntradaFaturamento}
  onCancelarEdicaoEntrada={cancelarEdicaoEntradaFaturamento}
  onExcluirEntrada={excluirEntradaFaturamento}
  onFocoReceita={() => setBlocoAtivo('receita')}
  ativo={blocoAtivo === 'receita'}
/>
              </div>
            </div>

<div className="mb-3 mt-12 flex min-w-0 items-center justify-between print-ocultar">
  <div className="flex min-w-0 items-center gap-3">
  <span
    className="block h-6 w-2 shrink-0 rounded-full shadow-sm"
    style={{ backgroundColor: corPrimaria }}
  />

  <h2 className={`m-0 min-w-0 break-words text-base font-black leading-tight sm:text-xl ${textStrong} uppercase tracking-wider`}>
    Análise de despesas de {mesAtivo}
  </h2>
</div>
</div>

<div
  className={`${bgCard} rounded-lg shadow-md border-x border-b border-t-[3px] p-3`}
  style={{ borderTopColor: corPrimaria }}
>
  <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-200/10 pb-2">
    <h3 className={`text-xs font-black uppercase tracking-wide ${textStrong}`}>
      Total por tipo e composição de gastos
    </h3>
  </div>

  {analiseDespesas.dados.length > 0 ? (
    <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        {analiseDespesas.dados.map((item) => (
          <button
            type="button"
            key={item.nome}
            onClick={() => setDespesaRelatorioAberta(item)}
            className={`min-w-0 rounded-md border px-2.5 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 ${
              darkMode
                ? 'border-slate-700 bg-slate-800/50'
                : 'border-slate-200 bg-slate-50'
            }`}
            style={{ '--tw-ring-color': item.cor } as React.CSSProperties}
            aria-label={`Ver lançamentos de ${item.nome}`}
            title="Ver lançamentos"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                  style={{ backgroundColor: item.cor }}
                />

                <span className={`truncate text-[11px] font-bold uppercase ${textStrong}`}>
                  {item.nome}
                </span>
              </div>

              <span
                className="shrink-0 text-[11px] font-black"
                style={{ color: item.cor }}
              >
                {item.percentual.toFixed(1)}%
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(item.percentual, 100)}%`,
                    backgroundColor: item.cor,
                  }}
                />
              </div>

              <span className="w-[86px] shrink-0 text-right text-[11px] font-black text-red-500">
                {formatarMoeda(item.valor)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div
        className={`flex h-full min-h-[238px] flex-col items-center justify-center rounded-md border p-3 ${
          darkMode
            ? 'border-slate-700 bg-slate-800/50'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="mb-2 flex h-8 w-full items-center justify-center px-2 text-center">
          <span
            className={`max-w-full truncate text-xs font-black uppercase tracking-wide ${
              despesaAnaliseAtiva ? textStrong : textMuted
            }`}
            style={{ color: despesaAnaliseAtiva?.cor }}
          >
            {despesaAnaliseAtiva ? despesaAnaliseAtiva.nome : 'Passe o mouse sobre o gráfico'}
          </span>
        </div>

        <div className="relative flex items-center justify-center">
          <svg
            className="h-52 w-52 -rotate-90 transition-transform hover:scale-[1.03]"
            viewBox="0 0 120 120"
            role="img"
            aria-label="Composição de gastos"
          >
            <circle
              cx="60"
              cy="60"
              r="43"
              fill="none"
              stroke={darkMode ? '#1e293b' : '#e2e8f0'}
              strokeWidth="14"
            />

            {(() => {
              const raio = 43;
              const circunferencia = 2 * Math.PI * raio;
              let percentualAcumulado = 0;

              return analiseDespesas.dados.map((item) => {
                const tamanhoSegmento = (item.percentual / 100) * circunferencia;
                const deslocamento = -(percentualAcumulado / 100) * circunferencia;

                percentualAcumulado += item.percentual;

                return (
                  <g key={item.nome}>
                    <circle
                      cx="60"
                      cy="60"
                      r="43"
                      fill="none"
                      stroke={item.cor}
                      strokeWidth="14"
                      strokeDasharray={`${tamanhoSegmento} ${circunferencia}`}
                      strokeDashoffset={deslocamento}
                      onMouseEnter={() => setDespesaAnaliseAtiva(item)}
                      onMouseLeave={() => setDespesaAnaliseAtiva(null)}
                      onFocus={() => setDespesaAnaliseAtiva(item)}
                      onBlur={() => setDespesaAnaliseAtiva(null)}
                      tabIndex={0}
                      className="cursor-pointer transition-all hover:opacity-80 focus:opacity-80 focus:outline-none"
                    />
                  </g>
                );
              });
            })()}
          </svg>

          <div
            className={`absolute flex h-24 w-24 flex-col items-center justify-center rounded-full px-2 text-center shadow-md ${bgCard}`}
            style={{
              border: despesaAnaliseAtiva ? `2px solid ${despesaAnaliseAtiva.cor}` : undefined,
            }}
          >
            <span
              className={`text-lg font-black ${despesaAnaliseAtiva ? '' : textStrong}`}
              style={{ color: despesaAnaliseAtiva?.cor }}
            >
              {despesaAnaliseAtiva ? `${despesaAnaliseAtiva.percentual.toFixed(1)}%` : '--'}
            </span>

            <span className={`mt-0.5 max-w-[82px] truncate text-[10px] font-bold ${despesaAnaliseAtiva ? 'text-red-500' : textMuted}`}>
              {despesaAnaliseAtiva ? formatarMoeda(despesaAnaliseAtiva.valor) : 'Selecione'}
            </span>
          </div>
        </div>

        <span className={`mt-2 text-[10px] font-black uppercase tracking-wide ${textMuted}`}>
          Composição de gastos
        </span>
      </div>
    </div>
  ) : (
    <div className="flex min-h-[120px] items-center justify-center">
      <span className={textMuted}>Sem dados para exibir.</span>
    </div>
  )}
</div>

          </main>
        </>
      ) : abaAtiva === 'Balanço Geral' ? (
  <main className={classePaginaInterna}>
  <div className={classeConteudoPagina}>
    <BalancoGeral 
      meses={meses}
      lancamentos={lancamentos}
      faturamentos={faturamentos}
      setFaturamentos={setFaturamentos}
      corPrimaria={corPrimaria}
      darkMode={darkMode}
      formatarMoeda={formatarMoeda}
      anoSelecionado={anoSelecionado}
      salvarFaturamentoMes={salvarFaturamentoMes}
      nomeEmpresa={nomeEmpresaAtual}
    />
  </div>
</main>
) : abaAtiva === 'Gráficos' ? (
  <main className={classePaginaInterna}>
    <div className={classeConteudoPagina}>
      <Graficos
        meses={meses}
        lancamentos={lancamentos}
        faturamentos={faturamentos}
        despesasCadastradas={despesasCadastradas}
        tipoPerfil={tipoPerfilAtualNormalizado}
        empresaId={empresaId}
        corPrimaria={corPrimaria}
        darkMode={darkMode}
        formatarMoeda={formatarMoeda}
      />
    </div>
  </main>
) : abaAtiva === 'Por Categoria' ? (
  <main className={classePaginaInterna}>
    <div className={classeConteudoPagina}>
      <PorCategoria 
        meses={meses}
        lancamentos={lancamentos}
        despesasCadastradas={despesasCadastradas}
        tipoPerfil={tipoPerfilAtualNormalizado}
        corPrimaria={corPrimaria}
        darkMode={darkMode}
        formatarMoeda={formatarMoeda}
      />
    </div>
  </main>
) : abaAtiva === 'Relatório' ? (
  <main className={classePaginaInterna}>
    <div className={classeConteudoPagina}>
      <Relatorio 
        meses={meses}
        lancamentos={lancamentos}
        faturamentos={faturamentos}
        despesasCadastradas={despesasCadastradas}
        corPrimaria={corPrimaria}
        darkMode={darkMode}
        anoSelecionado={anoSelecionado}
        setAnoSelecionado={setAnoSelecionado}
        empresaId={empresaId}
      />
    </div>
  </main>
) : (
  <main className={classePaginaInterna}>
    <div className={classeConteudoPagina}>
      <Dashboard 
        meses={meses}
        lancamentos={lancamentos}
        faturamentos={faturamentos}
        anoSelecionado={anoSelecionado}
        empresaId={empresaId}
        nomePerfilAtual={nomeEmpresaAtual}
        resumoPerfis={resumoPerfisDashboard}
        mesPerfis={mesAtivo || mesResumoDash}
        setMesAtivo={setMesAtivo}
        bgCard={bgCard}
        corPrimaria={corPrimaria}
        textStrong={textStrong}
        textMuted={textMuted}
        darkMode={darkMode}
        iniciarValoresOcultos={iniciarValoresOcultos}
        mesResumoDash={mesResumoDash}
        setMesResumoDash={setMesResumoDash}
        totalDespesasMes={totalDespesasMes}
        maiorGasto={maiorGasto}
        lucroOperacional={lucroOperacional}
  inputFaturamento={inputFaturamento}
  setInputFaturamento={setInputFaturamento}
  placeholderFaturamento="0,00"
  solicitarFaturamentoDashboard={solicitarFaturamentoDashboard}
  excluirTotalMes={excluirTotalMes}
  faturamentoDoMes={faturamentoDoMesAtual}
        entradaFaturamentoDia={entradaFaturamentoDia}
        setEntradaFaturamentoDia={setEntradaFaturamentoDia}
        entradaFaturamentoOrigem={entradaFaturamentoOrigem}
        setEntradaFaturamentoOrigem={setEntradaFaturamentoOrigem}
  entradaFaturamentoValor={entradaFaturamentoValor}
  handleEntradaFaturamentoValorChange={handleEntradaFaturamentoValorChange}
  solicitarEntradaFaturamentoDashboard={solicitarEntradaFaturamentoDashboard}
        receitasTotais={receitasTotais}
        despesasTotais={despesasTotais}
        lucroTotalAnual={lucroTotalAnual}
        formatarMoeda={formatarMoeda}
        despesasAConfirmar={despesasAConfirmar}
        onConfirmarPrevista={confirmarDespesaPrevista}
        onAjustarPrevista={ajustarDespesaPrevista}
        onExcluirPrevista={excluirDespesaPrevista}
        receitasAConfirmar={receitasAConfirmar}
        onConfirmarReceita={confirmarReceitaPrevista}
        onEditarReceita={editarReceitaPrevista}
        onExcluirReceita={excluirReceitaPrevista}
        saldoCardMesIdx={saldoCardMesIdx}
        setSaldoCardMesIdx={setSaldoCardMesIdx}
        saldoInicial={saldoInicialCard}
        saldoFinal={saldoFinalCard}
        saldoPrevisto={saldoPrevistoCard}
        caixinhaSaldo={caixinhaSaldo}
        caixinhaSaldoInicial={caixinhaSaldoInicial}
        caixinhaAportesMes={caixinhaAportesMes}
        caixinhaUltimosMovimentos={caixinhaUltimosMovimentos}
        onAdicionarAporteCaixinha={adicionarAporteCaixinha}
        onDefinirSaldoInicialCaixinha={definirSaldoInicialCaixinha}
        tipoPerfil={tipoPerfilAtualNormalizado}
        dashboardOrdem={recursoBloqueado('organizar_dashboard') ? ordemDashboardPadrao : dashboardOrdem}
        dashboardOcultos={recursoBloqueado('organizar_dashboard') ? ocultosDashboardPadrao : dashboardOcultos}
        dashboardExpandidos={recursoBloqueado('organizar_dashboard') ? [] : dashboardExpandidos}
        onAtualizarLayoutDashboard={atualizarLayoutDashboard}
        onOcultarCardDashboard={ocultarCardDashboard}
        onDefinirOcultosDashboard={definirOcultosDashboard}
        pontoDisponivel={podeGerenciarPonto}
        pontoResumo={pontoResumoDia}
        pontoResumoCarregando={pontoResumoCarregando}
        pontoFuncionariosHoje={pontoFuncionariosHoje}
        onAbrirControlePonto={(funcionarioUserId) => {
          setAbaInicialPontoAdmin('relatorios');
          setRelatorioInicialPonto(funcionarioUserId ? {
            funcionarioUserId,
            data: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
          } : null);
          setInstanciaPontoAdmin((atual) => atual + 1);
          setModalPontoAdmin(true);
          carregarFuncionariosPonto();
          carregarPontoConfig();
          carregarDiasNaoUteisPonto();
        }}
      />
    </div>
  </main>
)}

      {carregandoPerfil && (
        <div className="avanta-loading-stage fixed inset-0 z-[9500] bg-slate-950/70 backdrop-blur-sm">
          <div className="avanta-loading-glass avanta-loading-card rounded-3xl border shadow-2xl">
            <div className="avanta-loading-glass-icon mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
              <span className="avanta-loading-spinner animate-spin" />
            </div>
            <p className="text-sm font-black uppercase tracking-wide text-sky-800">Carregando perfil...</p>
          </div>
        </div>
      )}

      {despesaRelatorioAberta && (
        <div
          className="fixed inset-0 z-[9200] flex items-center justify-center bg-slate-950/60 px-4 py-6"
          onClick={(e) => { if (e.target === e.currentTarget) setDespesaRelatorioAberta(null); }}
        >
          <DraggableModalCard className={`flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-2xl ${bgCard}`}>
            <div
              data-modal-drag-handle
              className="flex shrink-0 cursor-grab items-center justify-between gap-4 px-5 py-4 text-white active:cursor-grabbing"
              style={{ backgroundColor: corPrimaria }}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Lançamentos da despesa</p>
                <h2 className="truncate text-lg font-black">{despesaRelatorioAberta.nome}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDespesaRelatorioAberta(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl transition hover:bg-white/20"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
              <div className={`mb-3 flex items-center justify-between gap-4 rounded-lg border px-3 py-2 ${darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`text-xs font-bold uppercase ${textMuted}`}>{mesAtivo} de {anoSelecionado}</span>
                <strong className="text-sm font-black text-red-500">{formatarMoeda(despesaRelatorioAberta.valor)}</strong>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {lancamentosDoMes
                  .filter((l) => normalizarTexto(l.despesa) === normalizarTexto(despesaRelatorioAberta.nome))
                  .sort((a, b) => Number(a.dia || 0) - Number(b.dia || 0))
                  .map((l) => (
                    <div key={l.id} className={`flex items-center justify-between gap-4 border-b px-1 py-3 last:border-b-0 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <div className="min-w-0">
                        <strong className={`block text-sm ${textStrong}`}>Dia {l.dia}</strong>
                        <span className={`block truncate text-xs font-semibold ${textMuted}`}>{l.descricao || 'Sem descrição'}</span>
                      </div>
                      <strong className="shrink-0 text-sm font-black text-red-500">{formatarMoeda(Number(l.valor || 0))}</strong>
                    </div>
                  ))}
              </div>
            </div>
          </DraggableModalCard>
        </div>
      )}

      <ModalAprovacoes
  aberto={modalAprovacoesAberto}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  solicitacoes={solicitacoesAprovacao}
  acessosAprovados={acessosVendasAprovados}
  carregando={aprovacoesCarregando}
  processandoId={aprovacaoProcessandoId}
  onFechar={() => setModalAprovacoesAberto(false)}
  onAprovar={(solicitacao) => confirmarAnaliseSolicitacao(solicitacao, true)}
  onRejeitar={(solicitacao) => confirmarAnaliseSolicitacao(solicitacao, false)}
  onRevogar={(acesso) => confirmarGerenciamentoAcesso(acesso, 'revogar')}
  onReativar={(acesso) => confirmarGerenciamentoAcesso(acesso, 'reativar')}
  onExcluir={(acesso) => confirmarGerenciamentoAcesso(acesso, 'excluir')}
/>

      <ModalTermos
  aberto={modalTermos}
  onClose={() => setModalTermos(false)}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  bordaSobreCorPrimaria={bordaSobreCorPrimaria}
  textMuted={textMuted}
  estiloTemaPrimario={estiloTemaPrimario}
/>

<ModalPrivacidade
  aberto={modalPrivacidade}
  onClose={() => setModalPrivacidade(false)}
  darkMode={darkMode}
  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  bordaSobreCorPrimaria={bordaSobreCorPrimaria}
  textMuted={textMuted}
  estiloTemaPrimario={estiloTemaPrimario}
/>

<ModalNotaLancamento
  aberto={Boolean(notaAbertaUrl)}
  url={notaAbertaUrl}
  darkMode={darkMode}
  onFechar={() => setNotaAbertaUrl('')}
/>

<ImportadorDespesasModal
  arquivo={arquivoImportador}
  retomarRascunho={retomarRascunhoImportador}
  empresaId={empresaId || ''}
  mesDestino={mesAtivo || ''}
  anoDestino={Number(anoSelecionado)}
  despesasCadastradas={despesasCadastradas}
  corPrimaria={corPrimaria}
  darkMode={darkMode}
  onFechar={() => { setArquivoImportador(null); setRetomarRascunhoImportador(false); }}
  onConcluido={notificarFinanceiroAtualizado}
  onEstadoRascunho={setTemRascunhoImportador}
  onArquivoDescartado={() => setArquivoImportador(null)}
  onSessaoExpirada={() => { void encerrarSessaoExpirada(); }}
  onSolicitarDescarte={(descartar) => abrirConfirmacao({ titulo: 'Descartar importação salva?', mensagem: 'As classificações, descrições e valores ajustados serão perdidos. Nenhum lançamento será criado.', textoConfirmar: 'Descartar', acao: descartar })}
/>

<ProcessandoImagemModal aberto={lendoNota || baixandoNota} darkMode={darkMode} titulo={baixandoNota ? 'Baixando imagem' : 'Processando imagem'} />

{/* ================= TOUR PRIMEIRO ACESSO ================= */}
<TourPrimeiroAcesso
  aberto={tourAberto}
  aoFinalizar={finalizarTour}
  aoPular={pularTour}
  corPrimaria={corPrimaria}
  darkMode={darkMode}
/>

<ChatFlutuante
  darkMode={darkMode}
  textMuted={textMuted}
  nomeUsuario={nomeUsuarioAtual}
  chatFeedbackAberto={chatFeedbackAberto}
  setChatFeedbackAberto={setChatFeedbackAberto}
  chatFeedbackEtapa={chatFeedbackEtapa}
  setChatFeedbackEtapa={setChatFeedbackEtapaComGate}
  empresaId={empresaId}
  avaBloqueada={recursoBloqueado('ava')}
  feedbackTipo={feedbackTipo}
  feedbackMensagem={feedbackMensagem}
  setFeedbackMensagem={setFeedbackMensagem}
  feedbackEnviando={feedbackEnviando}
  fecharChatFeedback={fecharChatFeedback}
  abrirFormularioFeedback={abrirFormularioFeedback}
  voltarInicioChatFeedback={voltarInicioChatFeedback}
  enviarFeedbackVisual={enviarFeedbackVisual}
  supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
  contexto={(() => {
    const porCategoria = lancamentosDoMes.reduce<Record<string, number>>((acc, l) => {
      acc[l.despesa] = (acc[l.despesa] || 0) + l.valor;
      return acc;
    }, {});
    const cats = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, val]) => `  - ${nome}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      .join('\n');
    return [
      `Empresa: ${nomeEmpresaAtual}`,
      `Período: ${mesParaAnalise} / ${anoSelecionado}`,
      `Receita total: R$ ${faturamentoDoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `Total de despesas: R$ ${totalDespesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `Resultado (lucro/prejuízo): R$ ${lucroOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `Lançamentos no mês: ${lancamentosDoMes.length}`,
      cats ? `Despesas por tipo:\n${cats}` : '',
      totalDespesasMesAnterior > 0 ? `Despesas mês anterior: R$ ${totalDespesasMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    ].filter(Boolean).join('\n');
  })()}
/>

{/* ── MODAL DESPESAS FIXAS ─────────────────────────────────────────── */}
{modalDespesasFixas && (
  <div
    className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-950/60 px-4 py-6"
    onClick={(e) => { if (e.target === e.currentTarget) setModalDespesasFixas(false); }}
  >
    <DraggableModalCard className={`relative flex w-full max-w-lg flex-col rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
      <div data-modal-drag-handle className="flex shrink-0 cursor-grab items-center justify-between px-5 py-4 active:cursor-grabbing" style={{ backgroundColor: corPrimaria }}>
        <div>
          <h2 className="text-base font-black text-white">Gerenciar despesas fixas</h2>
        </div>
        <button type="button" onClick={() => setModalDespesasFixas(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition cursor-pointer">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`mb-3 text-xs font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Nova despesa fixa</p>
          <div className="grid gap-2">
            <div className="grid grid-cols-[64px_1fr] gap-2">
              <input type="number" min="1" max="31" value={novaRecorrDia}
                onChange={(e) => setNovaRecorrDia(e.target.value)} placeholder="Dia"
                className={`h-9 w-full rounded-md border px-2.5 text-center text-xs font-bold outline-none transition focus:ring-1 ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              />
              <select
                value={novaRecorrNome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setNovaRecorrNome(nome);
                  const base = despesasCadastradas.find((d) => d.nome === nome);
                  if (base) setNovaRecorrCategoria(base.categoria);
                }}
                className={`h-9 w-full rounded-md border px-2.5 text-xs font-semibold outline-none transition focus:ring-1 ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                <option value="">Selecione a despesa</option>
                {despesasCadastradas.map((d) => (
                  <option key={d.nome} value={d.nome}>{d.nome}</option>
                ))}
              </select>
            </div>
            <input type="text" value={novaRecorrDescricao}
              onChange={(e) => setNovaRecorrDescricao(e.target.value)} placeholder="Descrição (opcional)"
              className={`h-9 w-full rounded-md border px-2.5 text-xs font-semibold outline-none transition focus:ring-1 ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            />
            {/* Incluir no mês + Valor na mesma linha */}
            <div className="grid grid-cols-[1fr_100px] gap-2 items-center">
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 h-9 transition ${
                novaRecorrLancarAgora
                  ? darkMode ? 'border-blue-500/50 bg-blue-950/30' : 'border-blue-200 bg-blue-50'
                  : darkMode ? 'border-slate-600' : 'border-slate-200'
              }`}>
                <input type="checkbox" checked={novaRecorrLancarAgora}
                  onChange={(e) => setNovaRecorrLancarAgora(e.target.checked)}
                  className="h-4 w-4 accent-blue-600" />
                <span className={`text-xs font-black ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Incluir em {mesAtivo || 'este mês'}
                </span>
              </label>
              <input type="text" inputMode="numeric" value={novaRecorrValor}
                onChange={handleNovaRecorrValorChange}
                onFocus={(e) => { const l = e.target.value.length; e.target.setSelectionRange(l, l); }}
                placeholder="0,00"
                className={`h-9 w-full rounded-md border px-2.5 text-right text-xs font-bold outline-none transition focus:ring-1 ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              />
            </div>
            <label className={`grid gap-1 text-[10px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
              Aplicar nos próximos meses
              <input
                type="number"
                min="1"
                max="60"
                value={novaRecorrMesesFrente}
                onChange={(e) => setNovaRecorrMesesFrente(e.target.value)}
                className={`h-9 w-full rounded-md border px-2.5 text-xs font-bold outline-none transition focus:ring-1 ${darkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
              />
            </label>
            <button type="button" onClick={salvarNovaRecorrencia}
              disabled={recorrSalvando || !novaRecorrNome.trim()}
              className="h-9 rounded-md text-xs font-black uppercase text-white shadow-sm transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: corPrimaria }}>
              {recorrSalvando ? 'Salvando...' : '+ Adicionar'}
            </button>
          </div>
        </div>

        <div>
          <p className={`mb-2 text-xs font-black uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {recorrencias.length === 0 ? 'Nenhuma despesa fixa cadastrada' : `${recorrencias.length} despesa(s) fixa(s)`}
          </p>
          <div className="space-y-2">
            {recorrencias.map((r) => (
              <div key={r.id} className={`rounded-xl border p-3 transition ${
                r.ativo
                  ? darkMode ? 'border-slate-600 bg-slate-700/60' : 'border-slate-200 bg-white'
                  : darkMode ? 'border-slate-700 bg-slate-800/40 opacity-60' : 'border-slate-200 bg-slate-50 opacity-60'
              }`}>
                {recorrEditandoId === r.id ? (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <input type="number" min="1" max="31" value={editRecorrDia} onChange={(e) => setEditRecorrDia(e.target.value)}
                        placeholder="Dia"
                        className={`h-8 rounded-md border px-2 text-center text-xs font-bold outline-none ${darkMode ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`} />
                      <input type="text" value={editRecorrNome} onChange={(e) => setEditRecorrNome(e.target.value)}
                        className={`h-8 rounded-md border px-2 text-xs font-bold outline-none ${darkMode ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`} />
                    </div>
                    <input type="text" value={editRecorrDescricao} onChange={(e) => setEditRecorrDescricao(e.target.value)}
                      placeholder="Descrição (opcional)"
                      className={`h-8 rounded-md border px-2 text-xs font-semibold outline-none ${darkMode ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`} />
                    <div className="grid grid-cols-[1fr_100px] gap-2 items-center">
                      <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 h-8 transition ${
                        editRecorrLancarAgora
                          ? darkMode ? 'border-blue-500/50 bg-blue-950/30' : 'border-blue-200 bg-blue-50'
                          : darkMode ? 'border-slate-600' : 'border-slate-200'
                      }`}>
                        <input type="checkbox" checked={editRecorrLancarAgora}
                          onChange={(e) => setEditRecorrLancarAgora(e.target.checked)}
                          className="h-3.5 w-3.5 accent-blue-600" />
                        <span className={`text-[10px] font-black ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          Incluir em {mesAtivo || 'este mês'}
                        </span>
                      </label>
                      <input type="text" inputMode="numeric" value={editRecorrValor}
                        onChange={handleEditRecorrValorChange}
                        onFocus={(e) => { const l = e.target.value.length; e.target.setSelectionRange(l, l); }}
                        placeholder="0,00"
                        className={`h-8 w-full rounded-md border px-2 text-right text-xs font-bold outline-none ${darkMode ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={salvarEdicaoRecorrencia}
                        className="h-7 flex-1 rounded-md bg-emerald-600 text-[10px] font-black uppercase text-white hover:bg-emerald-700 transition cursor-pointer">Salvar</button>
                      <button type="button" onClick={() => setRecorrEditandoId(null)}
                        className={`h-7 flex-1 rounded-md border text-[10px] font-black uppercase transition cursor-pointer ${darkMode ? 'border-slate-500 text-slate-300 hover:bg-slate-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{r.nome}</p>
                      <p className={`text-[10px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {r.descricao || r.categoria} · todo dia {r.dia}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => toggleRecorrenciaAtivo(r.id, r.ativo)}
                        className={`rounded-md px-2 py-1 text-[10px] font-black uppercase transition cursor-pointer ${
                          r.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`} title={r.ativo ? 'Pausar' : 'Ativar'}>
                        {r.ativo ? 'Ativa' : 'Pausada'}
                      </button>
                      <button type="button" onClick={() => iniciarEdicaoRecorrencia(r)}
                        className={`h-7 w-7 rounded-md text-sm transition cursor-pointer ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        title="Editar">✎</button>
                      <button type="button" onClick={() => excluirRecorrenciaHandler(r.id, r.nome)}
                        className="h-7 w-7 rounded-md bg-red-50 text-sm text-red-500 hover:bg-red-100 transition cursor-pointer"
                        title="Excluir">×</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`shrink-0 border-t px-5 py-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
        <p className={`text-[10px] font-semibold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Despesas fixas são lançadas automaticamente no início de cada mês com o valor do mês anterior.
        </p>
      </div>
    </DraggableModalCard>
  </div>
)}

<footer
  className={`print-ocultar w-full border-t px-6 py-4 mt-8 ${
    darkMode
      ? 'border-slate-700 bg-slate-900 text-slate-400'
      : 'border-slate-200 bg-white text-slate-500'
  }`}
>
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
    
    <div className="flex flex-wrap items-center justify-center gap-2 font-bold">
      <span className="text-sm tracking-wide">
        <span style={{ color: '#003E73' }}>AVANTA</span>
        <span style={{ color: '#00A6C8' }}>LAB</span>
        <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}> Gestão v{APP_VERSION}</span>
      </span>

      <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
        © {new Date().getFullYear()} Todos os direitos reservados.
      </span>

      <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>|</span>

      <a
        href="https://www.instagram.com/avanta.lab"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors cursor-pointer hover:underline"
        style={{ color: '#00A6C8' }}
      >
        @avanta.lab
      </a>
    </div>

    <div className="flex items-center gap-4 font-semibold">
      <button
        type="button"
        onClick={() => setModalTermos(true)}
        className={`transition-colors cursor-pointer ${
          darkMode
            ? 'hover:text-white'
            : 'hover:text-slate-800'
        }`}
      >
        Termos de Uso
      </button>

      <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>|</span>

      <button
        type="button"
        onClick={() => setModalPrivacidade(true)}
        className={`transition-colors cursor-pointer ${
          darkMode
            ? 'hover:text-white'
            : 'hover:text-slate-800'
        }`}
      >
        Política de Privacidade
      </button>
    </div>

  </div>
</footer>


    </div>
  );
}
