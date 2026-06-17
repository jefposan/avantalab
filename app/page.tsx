'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
import ModalConfirmacao from "./components/ModalConfirmacao";
import CardEntradaFaturamento from './components/CardEntradaFaturamento';
import TabelaLancamentosDespesa from './components/TabelaLancamentosDespesa';
import {
  formatarMoeda,
  formatarDescricao,
  corEhClara,
  getMaxDias,
  normalizarTexto,
} from './lib/formatters';
import {
  buscarEmpresaDoUsuario,
  buscarEmpresasDoUsuario,
  buscarConfiguracoes,
  buscarDespesasCadastradas,
  buscarLancamentos,
  buscarFaturamentos,
  buscarFaturamentosEntradas,
  salvarLancamento,
  apagarLancamento,
  atualizarLancamento,
  salvarFaturamentoBanco,
  salvarFaturamentoEntrada,
  atualizarFaturamentoEntrada,
  apagarFaturamentoEntrada,
  salvarConfiguracoesBanco,
  salvarDespesaCadastrada,
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
} from './lib/database';

import { supabase } from './lib/supabase';

export default function AppGestao() {

  // --- ESTADOS PRINCIPAIS ---
  
const [mounted, setMounted] = useState(false);
  const [isTelaMobile, setIsTelaMobile] = useState(false);
const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');
  const [mostrarLandingPreLogin, setMostrarLandingPreLogin] = useState(true);

  const [loginEmail, setLoginEmail] = useState('');
const [loginSenha, setLoginSenha] = useState('');

const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
const [mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro] = useState(false);

const [cadastroNome, setCadastroNome] = useState('');
const [cadastroEmail, setCadastroEmail] = useState('');
const [cadastroTelefone, setCadastroTelefone] = useState('');
const [cadastroSenha, setCadastroSenha] = useState('');
const [cadastroConfirmarSenha, setCadastroConfirmarSenha] = useState('');

const [codigoSmsCadastro, setCodigoSmsCadastro] = useState('');
const [smsCadastroEnviado, setSmsCadastroEnviado] = useState(false);
const [telefoneSmsCadastroConfirmado, setTelefoneSmsCadastroConfirmado] = useState('');
const [segundosReenvioSms, setSegundosReenvioSms] = useState(0);
const [reenviandoSmsCadastro, setReenviandoSmsCadastro] = useState(false);
const [validacaoTelefoneObrigatoria, setValidacaoTelefoneObrigatoria] = useState(false);
const [empresaAguardandoTelefone, setEmpresaAguardandoTelefone] = useState<any | null>(null);
const [telefoneObrigatorio, setTelefoneObrigatorio] = useState('');
const [codigoSmsTelefoneObrigatorio, setCodigoSmsTelefoneObrigatorio] = useState('');
const [smsTelefoneObrigatorioEnviado, setSmsTelefoneObrigatorioEnviado] = useState(false);
const [telefoneObrigatorioConfirmado, setTelefoneObrigatorioConfirmado] = useState('');
const [segundosReenvioTelefoneObrigatorio, setSegundosReenvioTelefoneObrigatorio] = useState(0);
const [reenviandoTelefoneObrigatorio, setReenviandoTelefoneObrigatorio] = useState(false);
const [validandoTelefoneObrigatorio, setValidandoTelefoneObrigatorio] = useState(false);

const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
const [tituloConfirmacao, setTituloConfirmacao] = useState("");
const [mensagemConfirmacao, setMensagemConfirmacao] = useState("");
const [textoConfirmarConfirmacao, setTextoConfirmarConfirmacao] = useState("Confirmar");
const [modalAvisoAberto, setModalAvisoAberto] = useState(false);
const [tituloAviso, setTituloAviso] = useState("");
const [mensagemAviso, setMensagemAviso] = useState("");
const [tipoAviso, setTipoAviso] = useState<'alerta' | 'erro' | 'sucesso'>('alerta');
const [acaoDepoisDoAviso, setAcaoDepoisDoAviso] = useState<(() => void) | null>(null);
const [acaoConfirmacao, setAcaoConfirmacao] = useState<(() => Promise<void> | void) | null>(null);
const [confirmacaoCarregando, setConfirmacaoCarregando] = useState(false);

const [authErro, setAuthErro] = useState('');
const [authMensagem, setAuthMensagem] = useState('');
const [authLoading, setAuthLoading] = useState(false);
const [carregandoSistema, setCarregandoSistema] = useState(true);
const [mensagemCarregamentoSistema, setMensagemCarregamentoSistema] = useState('Carregando sistema...');
const [googleLoading, setGoogleLoading] = useState(false);

const [modoRedefinirSenha, setModoRedefinirSenha] = useState(false);
const [novaSenha, setNovaSenha] = useState('');
const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState(false);

const [codigoSmsRedefinirSenha, setCodigoSmsRedefinirSenha] = useState('');
const [smsRedefinirSenhaEnviado, setSmsRedefinirSenhaEnviado] = useState(false);
const [segundosReenvioRedefinirSenha, setSegundosReenvioRedefinirSenha] = useState(0);
const [reenviandoSmsRedefinirSenha, setReenviandoSmsRedefinirSenha] = useState(false);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresaAtual, setNomeEmpresaAtual] = useState('');
const [nomeUsuarioAtual, setNomeUsuarioAtual] = useState('');
const [emailUsuarioAtual, setEmailUsuarioAtual] = useState('');
const [acessoUsuarioAtualId, setAcessoUsuarioAtualId] = useState<string | null>(null);
const [empresasDoUsuario, setEmpresasDoUsuario] = useState<any[]>([]);
const [empresaParaSelecionar, setEmpresaParaSelecionar] = useState<any | null>(null);
const [modalSelecionarEmpresa, setModalSelecionarEmpresa] = useState(false);
const [modalEmpresasAberto, setModalEmpresasAberto] = useState(false);
const [modalEditarEmpresaAberto, setModalEditarEmpresaAberto] = useState(false);
const [editEmpresaNome, setEditEmpresaNome] = useState('');
const [editEmpresaLogin, setEditEmpresaLogin] = useState('');
const [editEmpresaSenha, setEditEmpresaSenha] = useState('');
const [editEmpresaSalvando, setEditEmpresaSalvando] = useState(false);
const [modalExcluirEmpresa, setModalExcluirEmpresa] = useState(false);
const [nomeConfirmacaoExclusao, setNomeConfirmacaoExclusao] = useState('');
const [excluindoEmpresa, setExcluindoEmpresa] = useState(false);
const [acessoNaoConfigurado, setAcessoNaoConfigurado] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [nomeEmpresaInicial, setNomeEmpresaInicial] = useState('');
const [criandoEmpresaInicial, setCriandoEmpresaInicial] = useState(false);
const [criandoNovaEmpresaLogada, setCriandoNovaEmpresaLogada] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<
  'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples' | null
>(null);
const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
const [usuariosCarregando, setUsuariosCarregando] = useState(false);
const [usuarioNome, setUsuarioNome] = useState('');
const [usuarioLogin, setUsuarioLogin] = useState('');
const [usuarioSenha, setUsuarioSenha] = useState('');
const [mostrarUsuarioSenha, setMostrarUsuarioSenha] = useState(false);
const [usuarioPerfil, setUsuarioPerfil] = useState<
  '' | 'administrador' | 'operador_completo' | 'operador_simples'
>('');
const [modoFormularioUsuario, setModoFormularioUsuario] = useState<
  '' | 'criar' | 'existente'
>('');
const [usuarioExistenteTermo, setUsuarioExistenteTermo] = useState('');
const [usuarioEncontrado, setUsuarioEncontrado] = useState<any | null>(null);
const [perfilUsuarioExistente, setPerfilUsuarioExistente] = useState<
  '' | 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
>('');
const [pesquisandoUsuarioExistente, setPesquisandoUsuarioExistente] =
  useState(false);
const [vinculandoUsuarioExistente, setVinculandoUsuarioExistente] =
  useState(false);
const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
const [editUsuarioNome, setEditUsuarioNome] = useState('');
const [editUsuarioEmail, setEditUsuarioEmail] = useState('');
const [editUsuarioNovaSenha, setEditUsuarioNovaSenha] = useState('');
const [mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha] = useState(false);
const [editUsuarioPerfil, setEditUsuarioPerfil] = useState<
  'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
>('operador_simples');  
const [modalUsuarios, setModalUsuarios] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('Dashboard');
const [ajustesAberto, setAjustesAberto] = useState(false);
const [menuResponsivoAberto, setMenuResponsivoAberto] = useState(false);
  const [duplicadosAtivo, setDuplicadosAtivo] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [painelAvisosAberto, setPainelAvisosAberto] = useState(false);
  const [ultimoBackupEm, setUltimoBackupEm] = useState<string | null>(null);
  const [corPrimaria, setCorPrimaria] = useState('#003E73');
  const [corTemporaria, setCorTemporaria] = useState('#003E73');
  const [statusConfig, setStatusConfig] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [configuracoesCarregadas, setConfiguracoesCarregadas] = useState(false);
  const [mesAtivo, setMesAtivo] = useState<string | null>(null);
  const [ajudaCategoriasAberta, setAjudaCategoriasAberta] = useState(false);
  const [ajudaUsuariosAberta, setAjudaUsuariosAberta] = useState(false);
  const [chatFeedbackAberto, setChatFeedbackAberto] = useState(false);
const [chatFeedbackEtapa, setChatFeedbackEtapa] = useState<
  'inicio' | 'formulario' | 'confirmacao'
>('inicio');
const [feedbackTipo, setFeedbackTipo] = useState<'sugestao' | 'duvida' | null>(
  null
);
const [feedbackMensagem, setFeedbackMensagem] = useState('');
const [feedbackEnviando, setFeedbackEnviando] = useState(false);
const [despesaAnaliseAtiva, setDespesaAnaliseAtiva] = useState<{
  nome: string;
  valor: number;
  percentual: number;
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
  const [painelAjusteLogo, setPainelAjusteLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modais e Calc
  const [modalInstrucoes, setModalInstrucoes] = useState(false);
  const [modalDespesasBase, setModalDespesasBase] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const [modalTermos, setModalTermos] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);

  // Dados Financeiros
const [mesFaturamento, setMesFaturamento] = useState('JANEIRO');
const [faturamentos, setFaturamentos] = useState<Record<string, number>>({});
const [inputFaturamento, setInputFaturamento] = useState('');
const [mesResumoDash, setMesResumoDash] = useState('JANEIRO');

const [faturamentosEntradas, setFaturamentosEntradas] = useState<any[]>([]);
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
  { nome: string; categoria: string }[]
>([]);

  const [novaBaseNome, setNovaBaseNome] = useState('');
  const [novaBaseCat, setNovaBaseCat] = useState('');

  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [formDia, setFormDia] = useState('');
  const [formDespesa, setFormDespesa] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formValor, setFormValor] = useState('');
  const [valorNumericoRaw, setValorNumericoRaw] = useState(0);
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

const podeGerenciarUsuarios =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

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

const podeAcessarAjustes =
  perfilUsuario === 'gestor_master' || perfilUsuario === 'administrador';

const podeCriarNovaEmpresa =
  perfilUsuario === 'gestor_master' ||
  empresasDoUsuario.some((empresa) => empresa.perfil === 'gestor_master');

const podeTrocarEmpresa = empresasDoUsuario.length > 1;

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

    if (ehMobile && window.location.pathname !== '/mobile') {
      window.location.replace('/mobile');
    }
  };

  verificarDispositivoMobile();
}, []);

const carregarEmpresaSelecionada = async (empresa: any) => {
  const mesAtual = meses[new Date().getMonth()];
setMesResumoDash(mesAtual);
setMesFaturamento(mesAtual);
setMesAtivo(null);
  setConfiguracoesCarregadas(false);

  console.log('EMPRESA CARREGADA:', empresa);
console.log('TELEFONE CONFIRMADO:', empresa.telefone_confirmado);

  setEmpresaId(empresa.id);
  setNomeEmpresaAtual(empresa.nome || empresa.empresa_nome || '');
  setPerfilUsuario(empresa.perfil || null);
  setAcessoUsuarioAtualId(empresa.acessoId || empresa.acesso_id || null);

  const { data: usuarioLogado } = await supabase.auth.getUser();

  const emailLogado = usuarioLogado.user?.email || '';

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

if (empresa.telefone_confirmado !== true) {
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

  return;
}

  const config = await buscarConfiguracoes(empresa.id);
  const despesas = await buscarDespesasCadastradas(empresa.id);

  if (config) {
    if (config.cor_primaria) {
      setCorPrimaria(config.cor_primaria);
      setCorTemporaria(config.cor_primaria);
    }

    setDarkMode(false);
    if (config.duplicados_ativo !== undefined) setDuplicadosAtivo(config.duplicados_ativo);
    if (config.logo_url) setLogoUrl(config.logo_url);
    if (config.logo_settings) setLogoSettings(config.logo_settings);

    if (config.ultimo_backup_em) {
      setUltimoBackupEm(config.ultimo_backup_em);
    }
  }

  if (despesas && despesas.length > 0) {
    setDespesasCadastradas(
      despesas.map((d: any) => ({
        nome: d.nome,
        categoria: d.categoria,
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
  setPerfilUsuario(null);
  setAuthErro('');
  setAuthMensagem('');
  setMounted(true);
  setCarregandoSistema(false);

  return;
}

if (paramsConfirmacao.get('confirmado') === '1') {
      await supabase.auth.signOut();

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

    if (sessaoAtual.session) {
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
  setAcessoNaoConfigurado(true);
  setAcessoLiberado(false);
  const empresaFallback = await buscarEmpresaDoUsuario(
    sessaoAtual.session.user.id
  );

  if (!empresaFallback) {
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
  setPerfilUsuario(null);
  setLogoUrl('');
  setLogoSettings({ scale: 100, x: 0, y: 0 });
  setDespesasCadastradas([]);
  setLancamentos([]);
  setFaturamentos({});
  setFaturamentosEntradas([]);

  setEmpresasDoUsuario(empresasEncontradas);
  setEmpresaParaSelecionar(empresasEncontradas[0]);
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

    const lancamentosBanco = await buscarLancamentos(empresaId, ano);
    const faturamentosBanco = await buscarFaturamentos(empresaId, ano);
    const faturamentosEntradasBanco = await buscarFaturamentosEntradas(
      empresaId,
      ano
    );

    setLancamentos(
      lancamentosBanco.map((l: any) => ({
        id: l.id,
        mes: l.mes,
        dia: l.dia,
        despesa: l.despesa_nome,
        descricao: l.descricao || '',
        valor: Number(l.valor),
      }))
    );
        setFaturamentosEntradas(
      faturamentosEntradasBanco.map((entrada: any) => ({
        id: entrada.id,
        mes: entrada.mes,
        dia: entrada.dia,
        origem: entrada.origem,
        valor: Number(entrada.valor),
      }))
    );

    const faturamentosFormatados: Record<string, number> = {};

    faturamentosBanco.forEach((f: any) => {
      faturamentosFormatados[f.mes] = Number(f.valor);
      
    });

    setFaturamentos(faturamentosFormatados);
  };

  carregarDadosFinanceiros();
}, [anoSelecionado, mounted, empresaId]);

  // 3. Salva Configurações Globais no Supabase
useEffect(() => {
  if (!mounted || !empresaId || !configuracoesCarregadas) return;

  if (!podeAcessarAjustes) {
    setStatusConfig('idle');
    return;
  }

  let ativo = true;

  const salvarConfiguracoes = async () => {
    setStatusConfig('saving');

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

  
// 5. Auto-fechar o Menu de Ajustes após tempo inativo
  useEffect(() => {
    // Se o menu estiver aberto, inicia o cronômetro
    if (ajustesAberto) {
      const tempo = setTimeout(() => {
        setAjustesAberto(false);
      }, 20000); // <-- 10000 milissegundos = 10 segundos. Altere este valor como preferir!

      // Limpa o cronômetro se o utilizador fechar o menu manualmente antes do tempo
      return () => clearTimeout(tempo);
    }
  }, [ajustesAberto]);

  useEffect(() => {
  if (!modalUsuarios) return;
  if (!empresaId) return;
  if (!podeGerenciarUsuarios) return;

  carregarUsuariosEmpresa();
}, [modalUsuarios, empresaId, podeGerenciarUsuarios]);

useEffect(() => {
  if (!mounted || !acessoLiberado) return;

  setBuscaLancamento('');
  setBuscaEntradaFaturamento('');
  setLancamentoEditandoId(null);

  setFormDia('');
  setFormDespesa('');
  setFormDescricao('');
  setFormValor('');
  setValorNumericoRaw(0);

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
}, [abaAtiva, mesAtivo, mounted, acessoLiberado]);

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
    await supabase.auth.signOut();

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

  // --- CÁLCULOS E FUNÇÕES ---
  
  const mesParaAnalise = mesAtivo || mesResumoDash;
const indiceMesParaAnalise = meses.indexOf(mesParaAnalise);

const mesAnteriorParaAnalise =
  indiceMesParaAnalise > 0 ? meses[indiceMesParaAnalise - 1] : null;

const lancamentosDoMes = lancamentos.filter(l => l.mes === mesParaAnalise);

const lancamentosDoMesAnterior = mesAnteriorParaAnalise
  ? lancamentos.filter(l => l.mes === mesAnteriorParaAnalise)
  : [];

const totalDespesasMes = lancamentosDoMes.reduce((acc, lanc) => acc + lanc.valor, 0);

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
  (acc, entrada) => acc + Number(entrada.valor || 0),
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

  const getTotalEntradasPorMes = (mes: string) =>
    faturamentosEntradas
      .filter((entrada) => entrada.mes === mes)
      .reduce((acc, entrada) => acc + Number(entrada.valor || 0), 0);

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
};

const salvarFaturamento = async (
  confirmarSomaComEntradas = false,
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

  const totalEntradasMes = getTotalEntradasPorMes(mesSelecionado);
  const valorFinal = totalEntradasMes > 0
    ? totalEntradasMes + valorLimpo
    : valorLimpo;

  if (totalEntradasMes > 0 && !confirmarSomaComEntradas) {
    abrirConfirmacao({
      titulo: 'Confirmar total da receita',
      mensagem:
        `Este mes ja possui ${formatarMoeda(totalEntradasMes)} em receitas lancadas.\n\nO valor informado (${formatarMoeda(valorLimpo)}) sera somado as receitas existentes.\n\nTotal final de ${mesSelecionado}: ${formatarMoeda(valorFinal)}.`,
      textoConfirmar: 'Confirmar total',
      acao: async () => {
        await salvarFaturamento(true, mesSelecionado, valorLimpo);
      },
    });
    return;
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

    const entradaSalva = await salvarFaturamentoEntrada({
      empresaId,
      ano: Number(anoSelecionado),
      mes: mesReferenciaFaturamento,
      dia: diaNumerico,
      origem: origemLimpa,
      valor: entradaFaturamentoValorNumerico,
    });

    if (entradaSalva.erro || !entradaSalva.data) {
      abrirAviso(
        'Erro ao salvar entrada',
        entradaSalva.mensagem || 'Não foi possível salvar a entrada.'
      );
      return;
    }

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

    const novaEntrada = {
      id: entradaSalva.data.id,
      mes: entradaSalva.data.mes,
      dia: entradaSalva.data.dia,
      origem: entradaSalva.data.origem,
      valor: Number(entradaSalva.data.valor),
    };

    
    setFaturamentosEntradas((prev) => [novaEntrada, ...prev]);

    setFaturamentos((prev) => ({
      ...prev,
      [mesReferenciaFaturamento]: novoTotal,
    }));

    setEntradaFaturamentoDia('');
    setEntradaFaturamentoOrigem('');
    setEntradaFaturamentoValor('');
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

  await salvarFaturamento(true, mesSelecionado, valorReceitaDashboardConfirmacao);
  limparCamposReceitaDashboard('total');
};
const abrirModalUsuarios = () => {
  setUsuarioNome('');
  setUsuarioLogin('');
  setUsuarioSenha('');
  setMostrarUsuarioSenha(false);
  setUsuarioPerfil('');
  setModoFormularioUsuario('');
  setUsuarioExistenteTermo('');
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');
  setPesquisandoUsuarioExistente(false);
  setVinculandoUsuarioExistente(false);
  setAjudaUsuariosAberta(false);

  setUsuarioEditandoId(null);
  setEditUsuarioNome('');
  setEditUsuarioEmail('');
  setEditUsuarioNovaSenha('');
  setMostrarEditUsuarioNovaSenha(false);
  setEditUsuarioPerfil('operador_simples');

  setModalUsuarios(true);

  setTimeout(() => {
    setUsuarioNome('');
    setUsuarioLogin('');
    setUsuarioSenha('');
    setUsuarioPerfil('');
    setModoFormularioUsuario('');
    setUsuarioExistenteTermo('');
    setUsuarioEncontrado(null);
    setPerfilUsuarioExistente('');
  }, 50);
};
const carregarUsuariosEmpresa = async () => {
  if (!empresaId || !podeGerenciarUsuarios) return;

  setUsuariosCarregando(true);

  const usuarios = await buscarUsuariosEmpresa(empresaId);

  setUsuariosEmpresa(usuarios);
  setUsuariosCarregando(false);
};

const abrirCriarNovoUsuario = () => {
  setModoFormularioUsuario('criar');
  setUsuarioExistenteTermo('');
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');
  setPesquisandoUsuarioExistente(false);
  setVinculandoUsuarioExistente(false);
};

const abrirAdicionarUsuarioExistente = () => {
  setModoFormularioUsuario('existente');
  setUsuarioEditandoId(null);
  setUsuarioExistenteTermo('');
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');
  setPesquisandoUsuarioExistente(false);
  setVinculandoUsuarioExistente(false);
};

const ocultarFormularioUsuario = () => {
  setModoFormularioUsuario('');
  setUsuarioExistenteTermo('');
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');
  setPesquisandoUsuarioExistente(false);
  setVinculandoUsuarioExistente(false);
};

const buscaUsuarioExistente = async () => {
  if (!empresaId) {
    abrirAviso('Erro', 'Empresa não carregada.');
    return;
  }

  if (!podeGerenciarUsuarios) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para gerenciar usuários.'
    );
    return;
  }

  const termoLimpo = usuarioExistenteTermo.trim().toLowerCase();

  if (!termoLimpo) {
    abrirAviso(
      'Campo obrigatório',
      'Informe o e-mail ou login do usuário já cadastrado.'
    );
    return;
  }

  setPesquisandoUsuarioExistente(true);
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');

  const resultado = await buscarUsuarioExistenteEmpresa({
    empresaId,
    termo: termoLimpo,
  });

  setPesquisandoUsuarioExistente(false);

  if (resultado.erro) {
    abrirAviso('Erro ao pesquisar usuário', resultado.mensagem);
    return;
  }

  if (!resultado.encontrado) {
    abrirAviso(
      'Usuário não encontrado',
      'Nenhum usuário encontrado com este e-mail ou login.'
    );
    return;
  }

  if (resultado.jaVinculado) {
    abrirAviso(
      'Usuário já vinculado',
      'Este usuário já está vinculado a esta empresa.'
    );
    return;
  }

  setUsuarioEncontrado(resultado.usuario);
  setPerfilUsuarioExistente('operador_simples');
};

const confirmarVinculoUsuarioExistente = async () => {
  if (!empresaId || !usuarioEncontrado?.id) return;

  if (!perfilUsuarioExistente) {
    abrirAviso(
      'Perfil obrigatório',
      'Selecione o perfil de acesso para este usuário.'
    );
    return;
  }

  setVinculandoUsuarioExistente(true);

  const resultado = await vincularUsuarioExistenteEmpresa({
    empresaId,
    userId: usuarioEncontrado.id,
    perfil: perfilUsuarioExistente,
  });

  setVinculandoUsuarioExistente(false);

  if (resultado.erro) {
    abrirAviso('Erro ao vincular usuário', resultado.mensagem);
    return;
  }

  setModalUsuarios(false);
  setUsuarioExistenteTermo('');
  setUsuarioEncontrado(null);
  setPerfilUsuarioExistente('');
  setModoFormularioUsuario('criar');

  await carregarUsuariosEmpresa();

  abrirAviso(
    'Usuário vinculado',
    'Usuário vinculado com sucesso.',
    undefined,
    'sucesso'
  );
};

const adicionarUsuarioEmpresa = async () => {
  if (!empresaId) {
    abrirAviso('Erro', 'Empresa não carregada.');
    return;
  }

  if (!podeGerenciarUsuarios) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para gerenciar usuários.'
    );
    return;
  }

  const nomeLimpo = usuarioNome.trim();
  const loginLimpo = usuarioLogin.trim().toLowerCase();
  const senhaLimpa = usuarioSenha.trim();

  if (!nomeLimpo || !loginLimpo || !senhaLimpa || !usuarioPerfil) {
  abrirAviso(
    'Campos obrigatórios',
    'Informe nome, login, senha e tipo de usuário.'
  );
  return;
}

const loginJaExiste = usuariosEmpresa.some(
  (usuario) =>
    (usuario.login || '').trim().toLowerCase() === loginLimpo
);

if (loginJaExiste) {
  abrirAviso(
    'Login indisponível',
    'Este login já está em uso nesta empresa. Escolha outro login para criar o usuário.'
  );
  return;
}

  if (loginLimpo.includes('@')) {
    abrirAviso(
      'Login inválido',
      'Para usuários internos, use um login simples, sem @. Exemplo: financeiro, caixa ou operador1.'
    );
    return;
  }

  if (senhaLimpa.length < 8) {
    abrirAviso(
      'Senha muito curta',
      'A senha deve ter pelo menos 8 caracteres.'
    );
    return;
  }

  const resultado = await criarUsuarioEmpresa({
    empresaId,
    nome: nomeLimpo,
    login: loginLimpo,
    senha: senhaLimpa,
    perfil: usuarioPerfil,
  });

  if (resultado.erro) {
    abrirAviso('Erro ao criar usuário', resultado.mensagem);
    return;
  }

  setUsuarioNome('');
  setUsuarioLogin('');
  setUsuarioSenha('');
  setUsuarioPerfil('operador_simples');

  await carregarUsuariosEmpresa();
};

const bloquearAcessoUsuario = async (acessoId: string) => {
  if (!podeGerenciarUsuarios) {
  abrirAviso(
    'Acesso não permitido',
    'Você não tem permissão para bloquear usuários.'
  );
  return;
}

  abrirConfirmacao({
    titulo: 'Bloquear usuário',
    mensagem: 'Deseja bloquear este usuário?\n\nEle não conseguirá mais acessar esta empresa.',
    acao: async () => {
      const resultado = await bloquearUsuarioEmpresa(acessoId);

      if (resultado.erro) {
  abrirAviso(
    'Erro ao bloquear usuário',
    resultado.mensagem
  );
  return;
}

      await carregarUsuariosEmpresa();
    },
  });
};

const iniciarEdicaoUsuario = (usuario: any) => {
  const loginUsuario = (usuario.login || usuario.email || '').toLowerCase();
  const emailAtual = (emailUsuarioAtual || '').toLowerCase();

  const usuarioEhAtual =
    loginUsuario === emailAtual ||
    usuario.email?.toLowerCase() === emailAtual;

  if (usuario.perfil === 'gestor_master' && !usuarioEhAtual && perfilUsuario !== 'gestor_master') {
    abrirAviso(
      'Acesso não permitido',
      'O gestor master só pode editar o próprio acesso.'
    );
    return;
  }

  setUsuarioEditandoId(usuario.id);
  setEditUsuarioNome(usuario.nome || '');
  setEditUsuarioEmail(usuario.login || usuario.email || '');
  setEditUsuarioNovaSenha('');
  setMostrarEditUsuarioNovaSenha(false);
  setEditUsuarioPerfil(
    usuario.perfil as 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples'
  );
};

const cancelarEdicaoUsuario = () => {
  setUsuarioEditandoId(null);
  setEditUsuarioNome('');
  setEditUsuarioEmail('');
  setEditUsuarioPerfil('operador_simples');
  setEditUsuarioNovaSenha('');
  setMostrarEditUsuarioNovaSenha(false);
};

const salvarEdicaoUsuario = async () => {
  if (!usuarioEditandoId) return;

  const usuarioOriginal = usuariosEmpresa.find(
    (usuario) => usuario.id === usuarioEditandoId
  );

  if (!usuarioOriginal) {
    abrirAviso('Erro', 'Usuário não encontrado para edição.');
    return;
  }

  const nomeLimpo = editUsuarioNome.trim();
  const emailLimpo = editUsuarioEmail.trim().toLowerCase();

  if (!nomeLimpo) {
    abrirAviso(
      'Campo obrigatório',
      'Informe o nome do usuário.'
    );
    return;
  }

  if (!emailLimpo) {
    abrirAviso(
      'Campo obrigatório',
      'Informe o login/email deste usuário.'
    );
    return;
  }

  const nomeOriginal = (usuarioOriginal.nome || '').trim();
  const loginOriginal = (
    usuarioOriginal.login ||
    usuarioOriginal.email ||
    ''
  ).toLowerCase();
  const perfilOriginal = usuarioOriginal.perfil;

  const houveAlteracao =
    nomeLimpo !== nomeOriginal ||
    emailLimpo !== loginOriginal ||
    editUsuarioPerfil !== perfilOriginal;

  if (!houveAlteracao) {
    abrirAviso(
      'Nenhuma alteração',
      'Altere algum dado do usuário antes de salvar.'
    );
    return;
  }

  const resultado = await atualizarUsuarioEmpresa({
    acessoId: usuarioEditandoId,
    nome: nomeLimpo,
    email: emailLimpo,
    perfil: editUsuarioPerfil,
  });

  if (resultado.erro) {
    abrirAviso('Erro ao atualizar usuário', resultado.mensagem);
    return;
  }

  await carregarUsuariosEmpresa();

  abrirAviso(
    'Usuário atualizado',
    'Os dados do usuário foram salvos com sucesso.'
  );
};

const redefinirSenhaUsuario = async () => {
  if (!usuarioEditandoId) return;

  const senhaLimpa = editUsuarioNovaSenha.trim();

  if (!senhaLimpa) {
    abrirAviso(
      'Senha obrigatória',
      'Informe a nova senha antes de redefinir.'
    );
    return;
  }

  if (senhaLimpa.length < 8) {
    abrirAviso(
      'Senha muito curta',
      'A nova senha deve ter pelo menos 8 caracteres.'
    );
    return;
  }

  const resultado = await redefinirSenhaUsuarioEmpresa({
    acessoId: usuarioEditandoId,
    novaSenha: senhaLimpa,
  });

  if (resultado.erro) {
    abrirAviso('Erro ao redefinir senha', resultado.mensagem);
    return;
  }

  setEditUsuarioNovaSenha('');
  setMostrarEditUsuarioNovaSenha(false);

  abrirAviso(
    'Senha redefinida',
    'A nova senha foi salva com sucesso. Não é necessário clicar em Salvar para confirmar a senha.',
    undefined,
    'sucesso'
  );
};

const excluirAcessoUsuario = async (acessoId: string) => {
  const excluindoProprioAcesso = acessoId === acessoUsuarioAtualId;

  abrirConfirmacao({
    titulo: excluindoProprioAcesso ? 'Excluir minha conta' : 'Excluir usuário',
    mensagem: excluindoProprioAcesso
      ? 'Você está prestes a excluir o seu próprio acesso a esta empresa.\n\nApós a exclusão, você será desconectado e voltará para a tela de login.\n\nDeseja continuar?'
      : 'Deseja excluir este usuário?\n\nEle perderá o acesso a esta empresa. Essa ação não poderá ser desfeita.',
    textoConfirmar: 'Excluir',
    acao: async () => {
      const resultado = await excluirUsuarioEmpresa(acessoId);

      if (resultado.erro) {
        abrirAviso('Erro ao excluir usuário', resultado.mensagem);
        return;
      }

      if (excluindoProprioAcesso) {
        setModalUsuarios(false);
        setUsuarioEditandoId(null);
        setAcessoUsuarioAtualId(null);

        await handleLogout();

        window.location.href = window.location.origin + window.location.pathname;
        return;
      }

      await carregarUsuariosEmpresa();
    },
  });
};

const adicionarDespesaBase = async () => {
  if (!podeAcessarAjustes) {
  abrirAviso(
    'Acesso não permitido',
    'Você não tem permissão para cadastrar ou alterar despesas base.'
  );
  return;
}
  const nomeLimpo = novaBaseNome.trim();

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
    novaBaseCat
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

  if (!podeInserirLancamentos) {
  abrirAviso(
  'Acesso não permitido',
  'Você não tem permissão para inserir lançamentos.'
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

  if (!mesAtivo) {
  abrirAviso(
    'Mês não selecionado',
    'Selecione um mês antes de lançar a despesa.'
  );
  return;
}

  if (!formDia || !formDespesa || valorNumericoRaw <= 0) {
  abrirAviso(
    'Campos obrigatórios',
    'Preencha dia, despesa e valor antes de salvar.'
  );
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
        const salvo = await salvarLancamento({
          empresaId,
          ano: Number(anoSelecionado),
          mes: mesAtivo,
          dia: parseInt(formDia),
          despesaNome: formDespesa,
          descricao: formatarDescricao(formDescricao),
          valor: valorNumericoRaw,
        });

        if (!salvo.erro && salvo.data) {
          const novoLancamento = {
            id: salvo.data.id,
            mes: salvo.data.mes,
            dia: salvo.data.dia,
            despesa: salvo.data.despesa_nome,
            descricao: salvo.data.descricao || '',
            valor: Number(salvo.data.valor),
          };

          setLancamentos((prev) => [novoLancamento, ...prev]);

          setFormDia('');
          setFormDespesa('');
          setFormDescricao('');
          setFormValor('');
          setValorNumericoRaw(0);
        } else {
          abrirAviso(
            'Erro ao salvar lançamento',
            salvo.mensagem || 'Não foi possível salvar o lançamento.'
          );
        }
      },
    });

    return;
  }
}

  const salvo = await salvarLancamento({
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesAtivo,
    dia: parseInt(formDia),
    despesaNome: formDespesa,
    descricao: formatarDescricao(formDescricao),
    valor: valorNumericoRaw,
  });

  if (!salvo.erro && salvo.data) {
    const novoLancamento = {
      id: salvo.data.id,
      mes: salvo.data.mes,
      dia: salvo.data.dia,
      despesa: salvo.data.despesa_nome,
      descricao: salvo.data.descricao || '',
      valor: Number(salvo.data.valor),
    };

    setLancamentos((prev) => [novoLancamento, ...prev]);

    setFormDia('');
    setFormDespesa('');
    setFormDescricao('');
    setFormValor('');
    setValorNumericoRaw(0);
  } else {
  abrirAviso(
    'Erro ao salvar lançamento',
    salvo.mensagem || 'Não foi possível salvar o lançamento.'
  );
}
};

const apagarDespesa = async (id: string) => {
  const apagou = await apagarLancamento(id);

  if (apagou) {
    setLancamentos((prev) => prev.filter((l) => l.id !== id));
  } else {
    abrirAviso(
      'Erro ao apagar lançamento',
      'Não foi possível apagar o lançamento no banco.'
    );
  }
};

const solicitarExclusaoLancamento = (lanc: any) => {
  if (!podeExcluirLancamentos) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para excluir lançamentos.'
    );
    return;
  }

  abrirConfirmacao({
    titulo: 'Excluir lançamento',
    mensagem: `Deseja excluir este lançamento?\n\n${lanc.despesa} - ${formatarMoeda(Number(lanc.valor))}\n\nEssa ação não poderá ser desfeita.`,
    acao: () => apagarDespesa(lanc.id),
  });
};

const excluirEntradaFaturamento = async (entrada: any) => {
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

  abrirConfirmacao({
    titulo: 'Excluir entrada',
    mensagem:
      `Deseja excluir a entrada "${entrada.origem}" no valor de ${formatarMoeda(Number(entrada.valor || 0))}?\n\nO valor será descontado do faturamento total do mês.`,
    textoConfirmar: 'Excluir',
    acao: async () => {
      const resultado = await apagarFaturamentoEntrada(entrada.id);

      if (resultado.erro) {
        abrirAviso(
          'Erro ao excluir entrada',
          resultado.mensagem || 'Não foi possível excluir a entrada.'
        );
        return;
      }

      const mesEntrada = entrada.mes;
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
    },
  });
};


function abrirAviso(
  titulo: string,
  mensagem: string,
  acaoDepois?: () => void,
  tipo: 'alerta' | 'erro' | 'sucesso' = 'alerta'
) {
  setTituloAviso(titulo);
  setMensagemAviso(mensagem);
  setTipoAviso(tipo);
  setAcaoDepoisDoAviso(() => acaoDepois || null);
  setModalAvisoAberto(true);
}

function fecharAviso() {
  setModalAvisoAberto(false);

  const acao = acaoDepoisDoAviso;

  setAcaoDepoisDoAviso(null);

  if (acao) {
    setTimeout(() => {
      acao();
    }, 150);
  }
}

function abrirFormularioFeedback(tipo: 'sugestao' | 'duvida') {
  setFeedbackTipo(tipo);
  setFeedbackMensagem('');
  setChatFeedbackEtapa('formulario');
}

function voltarInicioChatFeedback() {
  setFeedbackTipo(null);
  setFeedbackMensagem('');
  setChatFeedbackEtapa('inicio');
}

function fecharChatFeedback() {
  setChatFeedbackAberto(false);
  setFeedbackTipo(null);
  setFeedbackMensagem('');
  setFeedbackEnviando(false);
  setChatFeedbackEtapa('inicio');
}

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

function abrirConfirmacao({
  titulo,
  mensagem,
  textoConfirmar = "Confirmar",
  acao,
}: {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  acao: () => Promise<void> | void;
}) {
  setTituloConfirmacao(titulo);
  setMensagemConfirmacao(mensagem);
  setTextoConfirmarConfirmacao(textoConfirmar);
  setAcaoConfirmacao(() => acao);
  setModalConfirmacaoAberto(true);
}

function fecharConfirmacao() {
  if (confirmacaoCarregando) return;

  setModalConfirmacaoAberto(false);
  setTituloConfirmacao("");
  setMensagemConfirmacao("");
  setAcaoConfirmacao(null);
}

async function confirmarAcao() {
  if (!acaoConfirmacao) return;

  try {
    setConfirmacaoCarregando(true);

    await acaoConfirmacao();

    setModalConfirmacaoAberto(false);
    setTituloConfirmacao("");
    setMensagemConfirmacao("");
    setAcaoConfirmacao(null);
  } catch (error) {
  console.error("Erro ao confirmar ação:", error);
  abrirAviso(
    'Erro ao concluir ação',
    'Não foi possível concluir a ação. Tente novamente.'
  );
} finally {
    setConfirmacaoCarregando(false);
  }
}

const iniciarEdicaoLancamento = (lanc: any) => {

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

const iniciarEdicaoEntradaFaturamento = (entrada: any) => {
  if (!podeEditarLancamentos) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para editar lançamentos.'
    );
    return;
  }

  setEntradaFaturamentoEditandoId(entrada.id);
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

  const resultado = await atualizarFaturamentoEntrada({
    id: entradaFaturamentoEditandoId,
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesEntrada,
    dia: diaNumerico,
    origem: origemLimpa,
    valor: editEntradaFaturamentoValorNumerico,
  });

  if (resultado.erro || !resultado.data) {
    abrirAviso(
      'Erro ao editar entrada',
      resultado.mensagem || 'Não foi possível salvar a edição da entrada.'
    );
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
};

const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, '');

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

  const salvo = await atualizarLancamento({
    id: lancamentoEditandoId,
    empresaId,
    ano: Number(anoSelecionado),
    mes: mesAtivo,
    dia: diaNumerico,
    despesaNome: editDespesa,
    descricao: formatarDescricao(editDescricao),
    valor: editValorNumerico,
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
            }
          : l
      )
    );

    cancelarEdicaoLancamento();
  } else {
  abrirAviso(
    'Erro ao atualizar lançamento',
    salvo.mensagem || 'Não foi possível atualizar o lançamento.'
  );
}
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



  // ================= FUNÇÃO DE BACKUP EXCEL =================
  const gerarBackupExcel = async (abrirExclusaoDepois = false) => {
  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Faça login novamente e tente gerar o backup.'
  );
  return;
}

  const dadosResumo: any[] = [];
  const dadosLancamentos: any[] = [];

  const { data: lancamentosBanco, error: erroLancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ano', { ascending: true })
    .order('mes', { ascending: true })
    .order('dia', { ascending: true });

  if (erroLancamentos) {
  console.error('Erro ao buscar lançamentos para backup:', erroLancamentos);
  abrirAviso(
    'Erro ao gerar backup',
    erroLancamentos.message || 'Não foi possível buscar os lançamentos para o backup.'
  );
  return;
}

  const { data: faturamentosBanco, error: erroFaturamentos } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ano', { ascending: true });

  if (erroFaturamentos) {
  console.error('Erro ao buscar faturamentos para backup:', erroFaturamentos);
  abrirAviso(
    'Erro ao gerar backup',
    erroFaturamentos.message || 'Não foi possível buscar os faturamentos para o backup.'
  );
  return;
}

  const lancamentosBackup = lancamentosBanco || [];
  const faturamentosBackup = faturamentosBanco || [];

  const anosNoBanco = Array.from(
    new Set([
      ...lancamentosBackup.map((l: any) => String(l.ano)),
      ...faturamentosBackup.map((f: any) => String(f.ano)),
    ])
  ).sort();

  if (anosNoBanco.length === 0) {
  abrirAviso(
    'Backup sem dados',
    'Nenhum dado foi encontrado para gerar o backup.',
    abrirExclusaoDepois
      ? () => {
          setNomeConfirmacaoExclusao('');
          setModalExcluirEmpresa(true);
        }
      : undefined
  );
  return;
}

  anosNoBanco.forEach((ano) => {
    const lancsAno = lancamentosBackup.filter((l: any) => String(l.ano) === ano);
    const fatsAno = faturamentosBackup.filter((f: any) => String(f.ano) === ano);

    const faturamentosPorMes: Record<string, number> = {};

    fatsAno.forEach((f: any) => {
      faturamentosPorMes[f.mes] = Number(f.valor || 0);
    });

    let totalFatAno = 0;
    let totalDespAno = 0;
    let totalLucroAno = 0;
    let totalEbitdaAno = 0;

    lancsAno.forEach((l: any) => {
      dadosLancamentos.push({
        Ano: ano,
        Mês: l.mes,
        Dia: l.dia,
        Despesa: l.despesa_nome,
        Descrição: l.descricao || '-',
        'Valor (R$)': Number(l.valor || 0),
      });
    });

    meses.forEach((mes) => {
      const faturamento = faturamentosPorMes[mes] || 0;
      const lancsMes = lancsAno.filter((l: any) => l.mes === mes);

      let despesas = 0;
      let exclusoesEbitda = 0;

      lancsMes.forEach((l: any) => {
        const valor = Number(l.valor || 0);
        despesas += valor;

        const despesaCat =
  despesasCadastradas.find(
    (d) => normalizarTexto(d.nome) === normalizarTexto(l.despesa_nome)
  )?.categoria || 'Outros';

        if (
          [
            'Amortização',
            'Depreciação',
            'Despesas Financeiras',
            'Imposto sobre Lucro',
          ].includes(despesaCat)
        ) {
          exclusoesEbitda += valor;
        }
      });

      const lucro = faturamento - despesas;
      const ebitda = lucro + exclusoesEbitda;

      if (faturamento > 0 || despesas > 0) {
        dadosResumo.push({
          Ano: ano,
          Mês: mes,
          'Faturamento (R$)': faturamento,
          'Despesas (R$)': despesas,
          'Lucro (R$)': lucro,
          'EBITDA (R$)': ebitda,
        });

        totalFatAno += faturamento;
        totalDespAno += despesas;
        totalLucroAno += lucro;
        totalEbitdaAno += ebitda;
      }
    });

    if (totalFatAno > 0 || totalDespAno > 0) {
      dadosResumo.push({
        Ano: ano,
        Mês: 'TOTAL ANUAL',
        'Faturamento (R$)': totalFatAno,
        'Despesas (R$)': totalDespAno,
        'Lucro (R$)': totalLucroAno,
        'EBITDA (R$)': totalEbitdaAno,
      });

      dadosResumo.push({
        Ano: '',
        Mês: '',
        'Faturamento (R$)': null,
        'Despesas (R$)': null,
        'Lucro (R$)': null,
        'EBITDA (R$)': null,
      });
    }
  });

  const wb = XLSX.utils.book_new();

  const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Financeiro');

  if (dadosLancamentos.length > 0) {
    const wsLancs = XLSX.utils.json_to_sheet(dadosLancamentos);
    XLSX.utils.book_append_sheet(wb, wsLancs, 'Lançamentos Detalhados');
  }

  const dadosConfiguracoes = [
    {
      chave: 'empresaId',
      valor: empresaId,
    },
    {
      chave: 'logoUrl',
      valor: logoUrl || '',
    },
    {
      chave: 'logoSettings',
      valor: JSON.stringify(logoSettings || { scale: 100, x: 0, y: 0 }),
    },
    {
      chave: 'corPrimaria',
      valor: corPrimaria || '#003E73',
    },
    {
      chave: 'darkMode',
      valor: String(darkMode),
    },
    {
      chave: 'duplicadosAtivo',
      valor: String(duplicadosAtivo),
    },
    {
      chave: 'despesasCadastradas',
      valor: JSON.stringify(despesasCadastradas || []),
    },
  ];

  const wsConfig = XLSX.utils.json_to_sheet(dadosConfiguracoes);
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configurações');

  const dataHoje = new Date().toISOString().split('T')[0];
XLSX.writeFile(wb, `backup_avantalab_${dataHoje}.xlsx`);

const agora = new Date().toISOString();

const { error: erroSalvarBackup } = await supabase
  .from('configuracoes')
  .upsert(
    {
      empresa_id: empresaId,
      ultimo_backup_em: agora,
    },
    {
      onConflict: 'empresa_id',
    }
  );

if (erroSalvarBackup) {
  console.error('Erro ao salvar data do backup:', erroSalvarBackup);
  abrirAviso(
    'Backup gerado',
    'O arquivo foi gerado, mas não foi possível salvar a data do último backup.'
  );
  return;
}

setUltimoBackupEm(agora);

if (abrirExclusaoDepois) {
  abrirAviso(
    'Backup gerado',
    'O backup foi gerado com sucesso. Agora confirme a exclusão digitando exatamente o nome da empresa.',
    () => {
      setNomeConfirmacaoExclusao('');
      setModalExcluirEmpresa(true);
    }
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
  }[] = [];

  if (backupPendente) {
    alertas.push({
      id: 'backup-pendente',
      titulo: 'Backup recomendado',
      mensagem:
        'Recomendamos gerar um backup local dos dados da empresa após o encerramento de cada mês.',
      acaoTexto: 'Gerar backup agora',
      acao: gerarBackupExcel,
    });
  }

  return alertas;
}, [backupPendente, gerarBackupExcel]);

  const analiseDespesas = useMemo(() => {
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

  let anguloAtual = 0;

  const conicParts = dadosGrafico.map((item) => {
    const inicio = anguloAtual;
    anguloAtual += item.percentual;
    return `${item.cor} ${inicio}% ${anguloAtual}%`;
  });

  return {
    dados: dadosGrafico,
    gradiente: `conic-gradient(${conicParts.join(', ')})`,
  };
}, [lancamentosDoMes, totalDespesasMes, corPrimaria, despesasCadastradas]);

  const bgMain = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';

  const classePaginaInterna =
  'av-page flex-1 w-full max-w-7xl mx-auto px-8 pt-3 pb-8';

const classeConteudoPagina =
  'w-full [&>*:first-child]:!mt-0 [&>*:first-child]:!pt-0';

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
    texto.includes('twilio') ||
    texto.includes('configuração') ||
    texto.includes('configuracao') ||
    texto.includes('environment') ||
    texto.includes('env') ||
    texto.includes('token') ||
    texto.includes('sid') ||
    texto.includes('auth')
  ) {
    return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
  }

  if (
    texto.includes('rate limit') ||
    texto.includes('too many requests') ||
    texto.includes('limite') ||
    texto.includes('many attempts')
  ) {
    return 'Por segurança, existe um limite temporário de tentativas. Aguarde alguns minutos e tente novamente.';
  }

  if (
    texto.includes('telefone') ||
    texto.includes('phone') ||
    texto.includes('number') ||
    texto.includes('invalid')
  ) {
    return 'Informe um celular válido com DDD.';
  }

  if (tipo === 'verificar') {
    return 'Código inválido ou expirado. Verifique o código recebido ou solicite um novo.';
  }

  if (tipo === 'redefinir') {
    return 'Não foi possível redefinir a senha neste momento. Tente novamente em alguns minutos.';
  }

  if (tipo === 'reenviar') {
    return 'Não foi possível reenviar o SMS neste momento. Tente novamente em alguns minutos.';
  }

  return 'Não foi possível enviar o SMS neste momento. Tente novamente em alguns minutos.';
};

  const tratarErroAuth = (mensagem: string) => {
  const texto = mensagem.toLowerCase();

  if (
  texto.includes('rate limit') ||
  texto.includes('too many requests') ||
  texto.includes('for security purposes') ||
  texto.includes('only request this after')
) {
  return {
    tipo: 'limite',
    mensagem:
      'Por segurança, existe um limite temporário de tentativas. Aguarde alguns minutos e tente novamente.',
  };
}

  if (
    texto.includes('already registered') ||
    texto.includes('already been registered') ||
    texto.includes('user already registered') ||
    texto.includes('email address has already')
  ) {
    return {
      tipo: 'erro',
      mensagem:
        'Este e-mail já possui cadastro. Faça login ou use a recuperação de senha.',
    };
  }

  if (mensagem === 'Email not confirmed') {
    return {
      tipo: 'erro',
      mensagem: 'Não foi possível liberar este acesso. Solicite um novo cadastro ou entre em contato com o suporte.',
    };
  }

  if (mensagem === 'Invalid login credentials') {
    return {
      tipo: 'erro',
      mensagem: 'Email, login ou senha incorretos. Verifique os dados e tente novamente.',
    };
  }

  return {
    tipo: 'erro',
    mensagem,
  };
};

const reenviarCodigoSmsCadastro = async () => {
  if (reenviandoSmsCadastro || segundosReenvioSms > 0) return;

  const telefoneLimpo = cadastroTelefone.replace(/\D/g, '');

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    setAuthErro('Informe um celular válido com DDD.');
    return;
  }

  setAuthErro('');
  setAuthMensagem('');
  setReenviandoSmsCadastro(true);

  const respostaSms = await fetch('/api/sms/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telefone: telefoneLimpo,
    }),
  });

  const resultadoSms = await lerRespostaApi(respostaSms);

  setReenviandoSmsCadastro(false);

  if (!respostaSms.ok || resultadoSms.erro) {
    setAuthErro(mensagemSmsAmigavel(resultadoSms.mensagem, 'reenviar'));
    return;
  }

  setSmsCadastroEnviado(true);
  setTelefoneSmsCadastroConfirmado(telefoneLimpo);
  setCodigoSmsCadastro('');
  setSegundosReenvioSms(60);
  setAuthMensagem('Reenviamos o código por SMS. Digite o código mais recente para concluir o cadastro.');
};

  const handleCadastroTeste = async () => {
  setAuthErro('');
  setAuthMensagem('');
  setAuthLoading(true);

  const nomeLimpo = cadastroNome.trim();
const emailLimpo = cadastroEmail.trim().toLowerCase();
const telefoneLimpo = cadastroTelefone.replace(/\D/g, '');

  if (!nomeLimpo) {
    setAuthErro('Informe seu nome completo.');
    setAuthLoading(false);
    return;
  }

  if (!emailLimpo) {
    setAuthErro('Informe seu email.');
    setAuthLoading(false);
    return;
  }

  if (!emailLimpo.includes('@') || !emailLimpo.includes('.')) {
    setAuthErro('Informe um email válido.');
    setAuthLoading(false);
    return;
  }

  if (!telefoneLimpo) {
  setAuthErro('Informe seu número de celular.');
  setAuthLoading(false);
  return;
}

if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
  setAuthErro('Informe um celular válido com DDD.');
  setAuthLoading(false);
  return;
}

  if (!cadastroSenha) {
    setAuthErro('Crie uma senha.');
    setAuthLoading(false);
    return;
  }

  if (cadastroSenha.length < 8) {
    setAuthErro('A senha deve ter pelo menos 8 caracteres.');
    setAuthLoading(false);
    return;
  }

  if (!cadastroConfirmarSenha) {
    setAuthErro('Repita a senha para confirmação.');
    setAuthLoading(false);
    return;
  }

  if (cadastroSenha !== cadastroConfirmarSenha) {
    setAuthErro('As senhas não coincidem.');
    setAuthLoading(false);
    return;
  }

  if (!smsCadastroEnviado) {
  const respostaSms = await fetch('/api/sms/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      telefone: telefoneLimpo,
    }),
  });

  const resultadoSms = await lerRespostaApi(respostaSms);

  setAuthLoading(false);

  if (!respostaSms.ok || resultadoSms.erro) {
    setAuthErro(
      resultadoSms.mensagem || 'Não foi possível enviar o código por SMS.'
    );
    return;
  }

  setSmsCadastroEnviado(true);
setTelefoneSmsCadastroConfirmado(telefoneLimpo);
setCodigoSmsCadastro('');
setSegundosReenvioSms(60);
setAuthMensagem(
  'Enviamos um código por SMS. Digite o código recebido para concluir o cadastro.'
);
return;
}

if (!codigoSmsCadastro.trim()) {
  setAuthErro('Digite o código recebido por SMS.');
  setAuthLoading(false);
  return;
}

if (telefoneLimpo !== telefoneSmsCadastroConfirmado) {
  setAuthErro(
    'O número de celular foi alterado. Solicite um novo código antes de concluir o cadastro.'
  );
  setSmsCadastroEnviado(false);
  setCodigoSmsCadastro('');
  setTelefoneSmsCadastroConfirmado('');
  setAuthLoading(false);
  return;
}

const respostaVerificacaoSms = await fetch('/api/sms/verificar-codigo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    telefone: telefoneLimpo,
    codigo: codigoSmsCadastro.trim(),
  }),
});

const resultadoVerificacaoSms = await lerRespostaApi(respostaVerificacaoSms);

if (!respostaVerificacaoSms.ok || resultadoVerificacaoSms.erro) {
  setAuthErro(mensagemSmsAmigavel(resultadoVerificacaoSms.mensagem, 'verificar'));
  setAuthLoading(false);
  return;
}

const { error } = await supabase.auth.signUp({
  email: emailLimpo,
  password: cadastroSenha,
  options: {
    data: {
      nome: nomeLimpo,
      telefone: telefoneLimpo,
    },
  },
});

  setAuthLoading(false);

  if (error) {
  console.error('Erro cadastro:', error);

  const erroTratado = tratarErroAuth(error.message);

  if (erroTratado.tipo === 'limite') {
  abrirAviso('Limite temporário', erroTratado.mensagem);
} else {
  setAuthErro(erroTratado.mensagem);
}

  return;
}

  setAuthMensagem(
  'Cadastro criado e celular confirmado com sucesso. Faça login para acessar o sistema.'
);

  setCadastroNome('');
setCadastroEmail('');
setCadastroTelefone('');
setCadastroSenha('');
setCadastroConfirmarSenha('');
setCodigoSmsCadastro('');
setSmsCadastroEnviado(false);
setTelefoneSmsCadastroConfirmado('');
setSegundosReenvioSms(0);
setReenviandoSmsCadastro(false);

setModoAuth('login');
};

const handleLogin = async () => {
  setAuthErro('');
  setAuthMensagem('');
  setAuthLoading(true);

  const loginDigitado = loginEmail.trim().toLowerCase();

if (!loginDigitado) {
  setAuthErro('Informe seu email ou login.');
  setAuthLoading(false);
  return;
}

if (!loginSenha) {
  setAuthErro('Informe sua senha.');
  setAuthLoading(false);
  return;
}

let emailParaLogin = loginDigitado;

if (!loginDigitado.includes('@')) {
  const emailEncontrado = await buscarEmailPorLogin(loginDigitado);

  if (!emailEncontrado) {
    setAuthErro('Login não encontrado.');
    setAuthLoading(false);
    return;
  }

  emailParaLogin = emailEncontrado;
}

const { error } = await supabase.auth.signInWithPassword({
  email: emailParaLogin,
  password: loginSenha,
});

  if (error) {
  console.error('Erro login:', error);

  const erroTratado = tratarErroAuth(error.message);

  if (erroTratado.tipo === 'limite') {
  abrirAviso('Limite temporário', erroTratado.mensagem);
} else {
  setAuthErro(erroTratado.mensagem);
}

  setAuthLoading(false);
  return;
}

setAuthMensagem('Login realizado. Carregando seus dados...');
setMensagemCarregamentoSistema('Carregando seus dados...');
setCarregandoSistema(true);

localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));

try {
  const { data: usuarioLogado } = await supabase.auth.getUser();
  const usuarioId = usuarioLogado.user?.id;

  if (!usuarioId) {
    setAuthErro('Não foi possível confirmar sua sessão. Tente entrar novamente.');
    return;
  }

  const empresasEncontradas = await buscarEmpresasDoUsuario(usuarioId);

  if (!empresasEncontradas || empresasEncontradas.length === 0) {
    setCriandoNovaEmpresaLogada(false);
    setAcessoNaoConfigurado(true);
    setAcessoLiberado(false);

    const empresaFallback = await buscarEmpresaDoUsuario(usuarioId);

    if (empresaFallback) {
      await carregarEmpresaSelecionada(empresaFallback);
    }
  } else if (empresasEncontradas.length === 1) {
    await carregarEmpresaSelecionada(empresasEncontradas[0]);
  } else {
    setEmpresaId(null);
    setNomeEmpresaAtual('');
    setPerfilUsuario(null);
    setLogoUrl('');
    setLogoSettings({ scale: 100, x: 0, y: 0 });
    setDespesasCadastradas([]);
    setLancamentos([]);
    setFaturamentos({});
    setFaturamentosEntradas([]);
    setEmpresasDoUsuario(empresasEncontradas);
    setEmpresaParaSelecionar(empresasEncontradas[0]);
    setModalSelecionarEmpresa(true);
    setAcessoNaoConfigurado(false);
    setAcessoLiberado(true);
  }
} catch (error) {
  console.error('Erro ao carregar dados após login:', error);
  setAuthErro('Login realizado, mas não foi possível carregar seus dados. Tente novamente.');
} finally {
  setCarregandoSistema(false);
  setAuthLoading(false);
}

return;
};

const handleCriarEmpresaInicial = async () => {
  const nomeLimpo = nomeEmpresaInicial.trim();

  if (!nomeLimpo) {
    setAuthErro('Informe o nome da empresa para criar o ambiente.');
    return;
  }

  setAuthErro('');
  setAuthMensagem('');
  setCriandoEmpresaInicial(true);

  const resultado = await criarEmpresaInicial(nomeLimpo);

  setCriandoEmpresaInicial(false);

  if (resultado.erro || !resultado.data) {
    setAuthErro(resultado.mensagem || 'Não foi possível criar o ambiente da empresa.');
    return;
  }

  const empresaCriada = Array.isArray(resultado.data)
    ? resultado.data[0]
    : resultado.data;

  const empresaCriadaId = empresaCriada?.id || empresaCriada?.empresa_id;

  if (empresaCriadaId) {
    const { error: erroConfigInicial } = await supabase
      .from('configuracoes')
      .upsert(
        {
          empresa_id: empresaCriadaId,
          duplicados_ativo: true,
        },
        {
          onConflict: 'empresa_id',
        }
      );

    if (erroConfigInicial) {
      console.error('Erro ao salvar configuração inicial de duplicados:', erroConfigInicial);
    }
  }

  setDuplicadosAtivo(true);

  setAuthMensagem('Ambiente criado com sucesso. Carregando o sistema...');

  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, 700);
};

const abrirCriacaoNovaEmpresa = () => {
  const podeCriarEmpresa =
    perfilUsuario === 'gestor_master' ||
    empresasDoUsuario.some((empresa) => empresa.perfil === 'gestor_master');

  if (!podeCriarEmpresa) {
    abrirAviso(
      'Acesso não permitido',
      'Somente o Gestor Master pode criar uma nova empresa.'
    );
    return;
  }

  setNomeEmpresaInicial('');
  setAuthErro('');
  setAuthMensagem('');
  setModalSelecionarEmpresa(false);
  setAjustesAberto(false);
  setPainelAvisosAberto(false);

  setCriandoNovaEmpresaLogada(true);

  setAcessoNaoConfigurado(true);
  setAcessoLiberado(false);
};

const abrirTrocaEmpresa = async () => {
  const { data: usuarioLogado } = await supabase.auth.getUser();
  const usuarioId = usuarioLogado.user?.id;

  if (!usuarioId) {
    abrirAviso(
      'Sessao nao encontrada',
      'Entre novamente para carregar suas empresas vinculadas.'
    );
    return;
  }

  const empresasAtualizadas = (await buscarEmpresasDoUsuario(usuarioId)).filter(
    (empresa): empresa is NonNullable<typeof empresa> => Boolean(empresa)
  );
  setEmpresasDoUsuario(empresasAtualizadas);

  if (empresasAtualizadas.length <= 1) {
    abrirAviso(
      'Troca indisponível',
      'Este usuário possui acesso a apenas uma empresa no momento.'
    );
    return;
  }

  setAjustesAberto(false);
  setPainelAvisosAberto(false);
  setEmpresaParaSelecionar(
    empresasAtualizadas.find((empresa) => empresa.id !== empresaId) ||
      empresasAtualizadas[0] ||
      null
  );
  setModalSelecionarEmpresa(true);
};

const abrirEdicaoEmpresaAtual = async () => {
  if (!empresaId) {
    abrirAviso(
      'Empresa não carregada',
      'Não foi possível identificar a empresa atual.'
    );
    return;
  }

  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Somente Gestor Master e Administrador podem editar estes dados.'
    );
    return;
  }

  setEditEmpresaNome(nomeEmpresaAtual || '');
  setEditEmpresaLogin(emailUsuarioAtual || '');
  setEditEmpresaSenha('');

  const { data: usuarioLogado } = await supabase.auth.getUser();
  const usuarioId = usuarioLogado.user?.id;

  if (usuarioId) {
    const acessoAtual = await buscarMeuAcessoEmpresa(empresaId, usuarioId);
    if (acessoAtual) {
      setEditEmpresaLogin(acessoAtual.login || acessoAtual.email || emailUsuarioAtual || '');
    }
  }

  setModalEmpresasAberto(false);
  setModalEditarEmpresaAberto(true);
};

const fecharEdicaoEmpresaAtual = () => {
  if (editEmpresaSalvando) return;

  setModalEditarEmpresaAberto(false);
  setEditEmpresaNome('');
  setEditEmpresaLogin('');
  setEditEmpresaSenha('');
};

const salvarEdicaoEmpresaAtual = async () => {
  if (!empresaId || !acessoUsuarioAtualId) {
    abrirAviso(
      'Dados incompletos',
      'Não foi possível identificar a empresa ou o acesso atual.'
    );
    return;
  }

  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Somente Gestor Master e Administrador podem editar estes dados.'
    );
    return;
  }

  const nomeLimpo = editEmpresaNome.trim();
  const loginLimpo = editEmpresaLogin.trim().toLowerCase();
  const senhaLimpa = editEmpresaSenha.trim();

  if (!nomeLimpo) {
    abrirAviso('Nome obrigatório', 'Informe o nome da empresa.');
    return;
  }

  if (!loginLimpo) {
    abrirAviso('Login obrigatório', 'Informe o login ou email do acesso atual.');
    return;
  }

  if (senhaLimpa && senhaLimpa.length < 8) {
    abrirAviso('Senha inválida', 'A nova senha deve ter pelo menos 8 caracteres.');
    return;
  }

  try {
    setEditEmpresaSalvando(true);

    const resultadoEmpresa = await atualizarEmpresa({ empresaId, nome: nomeLimpo });

    if (resultadoEmpresa.erro) {
      abrirAviso(
        'Erro ao salvar empresa',
        resultadoEmpresa.mensagem || 'Não foi possível atualizar o nome da empresa.',
        undefined,
        'erro'
      );
      return;
    }

    const resultadoUsuario = await atualizarUsuarioEmpresa({
      acessoId: acessoUsuarioAtualId,
      nome: nomeUsuarioAtual || nomeLimpo,
      email: loginLimpo,
      perfil: perfilUsuario || 'operador_simples',
    });

    if (resultadoUsuario.erro) {
      abrirAviso(
        'Erro ao salvar acesso',
        resultadoUsuario.mensagem || 'Não foi possível atualizar login/email.',
        undefined,
        'erro'
      );
      return;
    }

    if (senhaLimpa) {
      const resultadoSenha = await redefinirSenhaUsuarioEmpresa({
        acessoId: acessoUsuarioAtualId,
        novaSenha: senhaLimpa,
      });

      if (resultadoSenha.erro) {
        abrirAviso(
          'Dados salvos parcialmente',
          resultadoSenha.mensagem || 'Empresa e login foram salvos, mas a senha não foi alterada.',
          undefined,
          'alerta'
        );
        setNomeEmpresaAtual(nomeLimpo);
        setEmpresasDoUsuario((empresas) =>
          empresas.map((empresa) =>
            empresa.id === empresaId
              ? { ...empresa, nome: nomeLimpo, empresa_nome: nomeLimpo }
              : empresa
          )
        );
        setEditEmpresaSenha('');
        return;
      }
    }

    setNomeEmpresaAtual(nomeLimpo);
    setEmailUsuarioAtual(loginLimpo.includes('@') ? loginLimpo : emailUsuarioAtual);
    setEmpresasDoUsuario((empresas) =>
      empresas.map((empresa) =>
        empresa.id === empresaId
          ? { ...empresa, nome: nomeLimpo, empresa_nome: nomeLimpo, usuario_login: loginLimpo }
          : empresa
      )
    );

    fecharEdicaoEmpresaAtual();
    abrirAviso('Dados atualizados', 'Empresa e acesso foram atualizados com sucesso.', undefined, 'sucesso');
  } finally {
    setEditEmpresaSalvando(false);
  }
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

    await gerarBackupExcel(true);
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

  const empresasRestantes = await buscarEmpresasDoUsuario(usuarioLogado.user.id);

  setModalExcluirEmpresa(false);
  setNomeConfirmacaoExclusao('');
  setExcluindoEmpresa(false);

  setEmpresaId(null);
  setNomeEmpresaAtual('');
  setPerfilUsuario(null);
  setLogoUrl('');
  setLogoSettings({ scale: 100, x: 0, y: 0 });
  setDespesasCadastradas([]);
  setLancamentos([]);
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
  setModalSelecionarEmpresa(false);
  setEmpresaParaSelecionar(null);
  setEmpresasDoUsuario([]);
  setAcessoLiberado(false);
  setAcessoNaoConfigurado(false);
  setCriandoNovaEmpresaLogada(false);

  await handleLogout();
};

const handleLogout = async () => {
  await supabase.auth.signOut();

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
};

const handleRecuperarSenha = async () => {
  setAuthErro('');
  setAuthMensagem('');

  const loginLimpo = loginEmail.trim().toLowerCase();

  if (!loginLimpo) {
    setAuthErro('Informe seu email ou login para recuperar a senha.');
    return;
  }

  setAuthLoading(true);

  const resposta = await fetch('/api/senha/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login: loginLimpo,
    }),
  });

  const resultado = await lerRespostaApi(resposta);

  setAuthLoading(false);

  if (!resposta.ok || resultado.erro) {
    setAuthErro(
      resultado.mensagem || 'Não foi possível enviar o código por SMS.'
    );
    return;
  }

  setModoRedefinirSenha(true);
setSmsRedefinirSenhaEnviado(true);
setCodigoSmsRedefinirSenha('');
setNovaSenha('');
setConfirmarNovaSenha('');
setSegundosReenvioRedefinirSenha(60);
setAuthMensagem('Enviamos um código por SMS para o celular confirmado neste acesso.');
};

const reenviarCodigoRedefinirSenha = async () => {
  if (reenviandoSmsRedefinirSenha || segundosReenvioRedefinirSenha > 0) return;

  setAuthErro('');
  setAuthMensagem('');

  const loginLimpo = loginEmail.trim().toLowerCase();

  if (!loginLimpo) {
    setAuthErro('Informe seu email ou login para recuperar a senha.');
    return;
  }

  setReenviandoSmsRedefinirSenha(true);

  const resposta = await fetch('/api/senha/enviar-codigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login: loginLimpo,
    }),
  });

  const resultado = await lerRespostaApi(resposta);

  setReenviandoSmsRedefinirSenha(false);

  if (!resposta.ok || resultado.erro) {
    setAuthErro(
      resultado.mensagem || 'Não foi possível reenviar o código por SMS.'
    );
    return;
  }

  setSmsRedefinirSenhaEnviado(true);
  setCodigoSmsRedefinirSenha('');
  setSegundosReenvioRedefinirSenha(60);
  setAuthMensagem('Reenviamos o código por SMS. Digite o código mais recente para redefinir sua senha.');
};

const handleAtualizarSenha = async () => {
  setAuthErro('');
  setAuthMensagem('');

  const loginLimpo = loginEmail.trim().toLowerCase();

  if (!loginLimpo) {
    setAuthErro('Informe seu email ou login para recuperar a senha.');
    return;
  }

  if (!smsRedefinirSenhaEnviado) {
    await handleRecuperarSenha();
    return;
  }

  if (!codigoSmsRedefinirSenha.trim()) {
    setAuthErro('Digite o código recebido por SMS.');
    return;
  }

  if (!novaSenha) {
    setAuthErro('Digite a nova senha.');
    return;
  }

  if (novaSenha.length < 8) {
    setAuthErro('A nova senha deve ter pelo menos 8 caracteres.');
    return;
  }

  if (!confirmarNovaSenha) {
    setAuthErro('Confirme a nova senha.');
    return;
  }

  if (novaSenha !== confirmarNovaSenha) {
    setAuthErro('As senhas não coincidem.');
    return;
  }

  setAuthLoading(true);

  const resposta = await fetch('/api/senha/redefinir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      login: loginLimpo,
      codigo: codigoSmsRedefinirSenha.trim(),
      novaSenha,
    }),
  });

  const resultado = await lerRespostaApi(resposta);

  setAuthLoading(false);

  if (!resposta.ok || resultado.erro) {
    setAuthErro(mensagemSmsAmigavel(resultado.mensagem, 'redefinir'));
    return;
  }

  setModoRedefinirSenha(false);
  setSmsRedefinirSenhaEnviado(false);
  setCodigoSmsRedefinirSenha('');
  setNovaSenha('');
  setConfirmarNovaSenha('');
  setSegundosReenvioRedefinirSenha(0);

  setModoAuth('login');
  setLoginSenha('');
  setAuthMensagem('Senha redefinida com sucesso. Faça login com a nova senha.');
};

const handleGoogleLogin = async () => {
  setAuthErro('');
  setAuthMensagem('');
  setGoogleLoading(true);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

  if (error) {
    console.error('Erro login Google:', error);
    setAuthErro(`Erro Google: ${error.message}`);
    setGoogleLoading(false);
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

const enviarCodigoTelefoneObrigatorio = async () => {
  if (validandoTelefoneObrigatorio) return;

  const telefoneLimpo = telefoneObrigatorio.replace(/\D/g, '');

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    setAuthErro('Informe um celular válido com DDD.');
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
      telefone: telefoneLimpo,
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

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    setAuthErro('Informe um celular válido com DDD.');
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
      telefone: telefoneLimpo,
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

  if (!telefoneLimpo) {
    setAuthErro('Informe seu número de celular.');
    return;
  }

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) {
    setAuthErro('Informe um celular válido com DDD.');
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
      telefone: telefoneLimpo,
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
  setEmpresaParaSelecionar((empresaAtual: any | null) =>
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
    editUsuarioEmail.trim().toLowerCase() !==
      (
        usuarioOriginalEditando.login ||
        usuarioOriginalEditando.email ||
        ''
      ).toLowerCase() ||
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

const TelaCarregandoSistema = ({ mensagem }: { mensagem: string }) => (
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

    <div className="absolute inset-0 bg-white/75 backdrop-blur-sm" />

    <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">
          <span className="h-7 w-7 animate-spin rounded-full border-3 border-slate-200 border-t-sky-700" />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
          AvantaLab Gestão
        </p>

        <h1 className="mt-2 text-xl font-black text-slate-900">
          Carregando...
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          {mensagem}
        </p>
      </div>
    </section>
  </main>
);

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
  ? 'Criar nova empresa'
  : 'Criar ambiente da empresa'}
</h1>

<p className="mt-4 text-sm leading-relaxed text-slate-600">
  {criandoNovaEmpresaLogada
    ? 'Informe o nome da nova empresa para criar um novo ambiente de gestão.'
    : 'Sua conta foi confirmada, mas ainda não existe uma empresa vinculada a este acesso. Informe o nome da empresa para iniciar o ambiente de gestão.'}
</p>

<div className="mt-6 text-left">
  <label className="mb-1 block text-sm font-semibold text-slate-700">
    Nome da empresa
  </label>

  <input
    type="text"
    value={nomeEmpresaInicial}
    onChange={(e) => setNomeEmpresaInicial(e.target.value)}
    placeholder="Ex: Minha Empresa"
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />
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
    onClick={handleCriarEmpresaInicial}
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
    <main className={`min-h-screen flex items-center justify-center px-4 py-10 font-sans ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      <section
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-700'
            : 'bg-white border-slate-200'
        }`}
      >
        <div
          className="px-6 py-5"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
          }}
        >
          <h2 className="text-lg font-black uppercase tracking-wide">
            Selecionar empresa
          </h2>

          <p className="mt-1 text-sm opacity-85">
            Escolha qual empresa deseja acessar neste momento.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {empresasDoUsuario.map((empresa) => {
              const selecionada = empresaParaSelecionar?.id === empresa.id;

              return (
                <button
                  key={empresa.id}
                  type="button"
                  onClick={() => setEmpresaParaSelecionar(empresa)}
                  className={`w-full rounded-2xl border p-4 text-left transition cursor-pointer ${
                    selecionada
                      ? darkMode
                        ? 'border-sky-400 bg-sky-950/40'
                        : 'border-sky-400 bg-sky-50'
                      : darkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-black ${
                        darkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        {empresa.nome || empresa.empresa_nome}
                      </h3>

                      <p className={`mt-1 text-xs ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Perfil:{' '}
                        {empresa.perfil === 'gestor_master'
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

                    <span
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selecionada
                          ? 'border-sky-500 bg-sky-500'
                          : darkMode
                            ? 'border-slate-500'
                            : 'border-slate-300'
                      }`}
                    >
                      {selecionada && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 pt-2">
            <button
              type="button"
              disabled={!empresaParaSelecionar}
              onClick={async () => {
                if (!empresaParaSelecionar) return;
                await carregarEmpresaSelecionada(empresaParaSelecionar);
              }}
              className="rounded-xl px-4 py-3 text-sm font-black shadow transition hover:brightness-110 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              style={estiloTemaPrimario}
            >
              Confirmar acesso
            </button>

            <button
              type="button"
              onClick={sairDaSelecaoEmpresa}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition cursor-pointer ${
                darkMode
                  ? 'border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/50'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

if (validacaoTelefoneObrigatoria) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
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
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
            />
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

if (isTelaMobile) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-sm text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
          AvantaLab Gestao
        </p>

        <h1 className="mt-3 text-2xl font-black">
          Abrindo versao mobile...
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Voce sera direcionado automaticamente.
        </p>
      </section>
    </main>
  );
}

  if (!acessoLiberado) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      {modalAvisoAberto && (
  <div
    className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharAviso}
  >
    <div
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center gap-3">
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
    </div>
  </div>
)}
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

      <div className="pointer-events-none absolute inset-0 hidden bg-white/10 lg:block" />

      <section className="relative z-10 flex min-h-screen items-start px-4 pb-6 pt-8 lg:items-center lg:px-20 lg:py-10">
        <div className="w-full lg:max-w-7xl">
          <div className={`relative z-20 w-full rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl lg:border-white/30 lg:bg-white/70 lg:p-8 lg:backdrop-blur-xl ${
            mostrarLandingPreLoginAtiva ? 'lg:max-w-2xl' : 'lg:max-w-md'
          }`}>
            {mostrarLandingPreLoginAtiva ? (
              <div className="grid gap-6">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-sky-700">
                    AvantaLab Gestão
                  </p>

                  <h1 className="max-w-xl text-3xl font-black leading-tight text-slate-900 lg:text-4xl">
                    Descubra quanto realmente sobra no seu negócio ou nas suas despesas pessoais.
                  </h1>

                  <p className="mt-4 max-w-lg text-base font-semibold leading-relaxed text-slate-600">
                    Controle entradas e despesas de forma simples, compare resultados mês a mês e entenda quais gastos mais impactam seu lucro.
                  </p>
                </div>

                <div className="grid gap-2 rounded-2xl border border-white/35 bg-white/35 p-4 text-sm font-bold leading-snug text-slate-700 shadow-sm backdrop-blur">
                  <p>✓ Entenda seus gastos.</p>
                  <p>✓ Compare seus resultados mês a mês.</p>
                  <p>✓ Descubra quais despesas mais impactam seu lucro.</p>
                  <p>✓ Use no computador ou celular.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarLandingPreLogin(false);
                      setModoAuth('cadastro');
                    }}
                    className="h-12 rounded-xl px-5 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg,#003E73,#00A6C8)',
                    }}
                  >
                    Criar conta grátis
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMostrarLandingPreLogin(false);
                      setModoAuth('login');
                    }}
                    className="h-12 rounded-xl border border-slate-300 bg-white/85 px-5 text-sm font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] cursor-pointer"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="mb-5 lg:mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-sky-700">
                AvantaLab Gestão
              </p>

              <h1 className="text-3xl font-black text-slate-900">
  {modoRedefinirSenha
    ? 'Criar nova senha'
    : modoAuth === 'login'
      ? 'Acesse sua conta'
      : 'Criar cadastro'}
</h1>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
  {modoRedefinirSenha
    ? 'Digite e confirme sua nova senha para recuperar o acesso ao sistema.'
    : modoAuth === 'login'
      ? 'Entre para acompanhar sua gestão financeira, lançamentos, relatórios e evolução operacional.'
      : 'Crie seu acesso para começar a usar o sistema de gestão da AvantaLab.'}
</p>
            </div>

          {modoRedefinirSenha ? (
  <div className="space-y-4">
    <div>

{smsRedefinirSenhaEnviado && (
  <div>
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      Código recebido por SMS
    </label>

    <input
      type="text"
      inputMode="numeric"
      value={codigoSmsRedefinirSenha}
      onChange={(e) => setCodigoSmsRedefinirSenha(e.target.value)}
      placeholder="Digite o código recebido"
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={reenviarCodigoRedefinirSenha}
      disabled={
        reenviandoSmsRedefinirSenha ||
        segundosReenvioRedefinirSenha > 0
      }
      className="mt-2 text-xs font-bold text-sky-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
    >
      {segundosReenvioRedefinirSenha > 0
        ? `Reenviar código em ${segundosReenvioRedefinirSenha}s`
        : reenviandoSmsRedefinirSenha
          ? 'Reenviando código...'
          : 'Reenviar código'}
    </button>
  </div>
)}

      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Nova senha
      </label>

      <div className="relative">
        <input
          type={mostrarNovaSenha ? 'text' : 'password'}
          placeholder="Digite a nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
        />

        <button
  type="button"
  onClick={() => setMostrarNovaSenha((mostrar) => !mostrar)}
  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
  title={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
>
  {mostrarNovaSenha ? (
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
    </div>

    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Confirmar nova senha
      </label>

      <div className="relative">
        <input
          type={mostrarConfirmarNovaSenha ? 'text' : 'password'}
          placeholder="Repita a nova senha"
          value={confirmarNovaSenha}
          onChange={(e) => setConfirmarNovaSenha(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
        />

        <button
  type="button"
  onClick={() => setMostrarConfirmarNovaSenha((mostrar) => !mostrar)}
  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
  title={mostrarConfirmarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
>
  {mostrarConfirmarNovaSenha ? (
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
    </div>

    {authErro && (
      <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
        {authErro}
      </div>
    )}

    {authMensagem && (
      <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
        {authMensagem}
      </div>
    )}

    <button
      type="button"
      onClick={handleAtualizarSenha}
      disabled={authLoading}
      className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {authLoading
  ? smsRedefinirSenhaEnviado
    ? 'Redefinindo...'
    : 'Enviando...'
  : smsRedefinirSenhaEnviado
    ? 'Redefinir senha'
    : 'Enviar código por SMS'}
    </button>
  </div>
) : modoAuth === 'login' ? (
  <div className="space-y-4">

        {/* ================= INÍCIO DO FORMULÁRIO DE LOGIN ================= */}

<form
  onSubmit={(e) => {
    e.preventDefault();
    void handleLogin();
  }}
  className="space-y-4"
>
  <div>
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      Email ou login
    </label>

    <input
      type="text"
      placeholder="seuemail@exemplo.com ou seu login"
      value={loginEmail}
      onChange={(e) => setLoginEmail(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />
  </div>

  <div>
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      Senha
    </label>

    <div className="relative">
  <input
    type={mostrarSenhaLogin ? 'text' : 'password'}
    placeholder="Digite sua senha"
    value={loginSenha}
    onChange={(e) => setLoginSenha(e.target.value)}
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
  />

  <button
    type="button"
    onClick={() => setMostrarSenhaLogin((mostrar) => !mostrar)}
    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
    title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
  >
    {mostrarSenhaLogin ? (
      // Olho aberto
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth="2" />
      </svg>
    ) : (
      // Olho cortado
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3l18 18"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
        />
      </svg>
    )}
  </button>
</div>
  </div>

  <div className="text-right">
    <button
      type="button"
      onClick={handleRecuperarSenha}
      className="text-xs font-bold text-sky-700 hover:underline"
    >
      Esqueci minha senha
    </button>
  </div>

  {authErro && (
    <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
      {authErro}
    </div>
  )}

  {authMensagem && (
    <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
      {authMensagem}
    </div>
  )}

  <button
    type="submit"
    disabled={authLoading}
    className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {authLoading ? 'Entrando...' : 'Entrar'}
  </button>
</form>

<button
  type="button"
  onClick={handleGoogleLogin}
  disabled={googleLoading}
  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white/90 px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
>
  {googleLoading ? (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-700" />
  ) : (
    <img
      src="/images/google-logo.svg"
      alt="Google"
      className="h-5 w-5"
    />
  )}

  <span>
    {googleLoading ? 'Conectando ao Google...' : 'Entrar ou cadastrar com Google'}
  </span>
</button>

<p className="-mt-2 text-center text-[11px] leading-snug text-slate-500">
  Se este for seu primeiro acesso com este email, uma nova conta será criada automaticamente.
</p>

<div className="pt-2 text-center text-sm text-slate-600">
  Ainda não tem conta?{' '}
  <button
    type="button"
    onClick={() => setModoAuth('cadastro')}
    className="font-bold text-sky-700 hover:underline"
  >
    Criar cadastro
  </button>
</div>

{/* ================= FIM DO FORMULÁRIO DE CADASTRO ================= */}

              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="mb-0.5 block text-xs font-semibold text-slate-700">
                    Nome
                  </label>
                  <input
  type="text"
  placeholder="Seu nome completo"
  value={cadastroNome}
  onChange={(e) => setCadastroNome(e.target.value)}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>
                </div>

                <div>
                  <label className="mb-0.5 block text-xs font-semibold text-slate-700">
                    Email
                  </label>
                  <input
  type="email"
  placeholder="seuemail@exemplo.com"
  value={cadastroEmail}
  onChange={(e) => setCadastroEmail(e.target.value)}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>
                </div>

                <div>
  <label className="mb-0.5 block text-xs font-semibold text-slate-700">
    Celular
  </label>
  <input
    type="tel"
    placeholder="DDD + número. Ex: 11999999999"
    value={cadastroTelefone}
    onChange={(e) => setCadastroTelefone(e.target.value)}
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />
</div>

                <div>
  <label className="mb-0.5 block text-xs font-semibold text-slate-700">
    Senha
  </label>

  <div className="relative">
    <input
      type={mostrarSenhaCadastro ? 'text' : 'password'}
      placeholder="Crie uma senha"
      value={cadastroSenha}
      onChange={(e) => setCadastroSenha(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={() => setMostrarSenhaCadastro((mostrar) => !mostrar)}
      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      title={mostrarSenhaCadastro ? 'Ocultar senha' : 'Ver senha'}
    >
      {mostrarSenhaCadastro ? (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
          />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 3l18 18"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
          />
        </svg>
      )}
    </button>
  </div>
</div>

                <div>
  <label className="mb-0.5 block text-xs font-semibold text-slate-700">
    Confirmar senha
  </label>

  <div className="relative">
    <input
      type={mostrarConfirmarSenhaCadastro ? 'text' : 'password'}
      placeholder="Repita a senha"
      value={cadastroConfirmarSenha}
      onChange={(e) => setCadastroConfirmarSenha(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 pr-10 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <button
      type="button"
      onClick={() =>
        setMostrarConfirmarSenhaCadastro((mostrar) => !mostrar)
      }
      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
      title={mostrarConfirmarSenhaCadastro ? 'Ocultar senha' : 'Ver senha'}
    >
      {mostrarConfirmarSenhaCadastro ? (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
          />
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 3l18 18"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.88 5.09A10.94 10.94 0 0112 5c5 0 9 4 10 7a12.7 12.7 0 01-3.02 4.45"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6.61 6.61A12.47 12.47 0 002 12c1 3 5 7 10 7a10.94 10.94 0 004.39-.91"
          />
        </svg>
      )}
    </button>
  </div>
</div>

                {smsCadastroEnviado && (
  <div>
    <label className="mb-0.5 block text-xs font-semibold text-slate-700">
      Código recebido por SMS
    </label>

    <input
      type="text"
      inputMode="numeric"
      placeholder="Digite o código recebido"
      value={codigoSmsCadastro}
      onChange={(e) => setCodigoSmsCadastro(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-2 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
    />

    <p className="mt-0.5 text-[11px] text-slate-500">
      Enviamos o código para o celular informado.
    </p>
<button
  type="button"
  onClick={reenviarCodigoSmsCadastro}
  disabled={reenviandoSmsCadastro || segundosReenvioSms > 0}
  className="mt-1 text-[11px] font-bold text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:no-underline"
>
  {reenviandoSmsCadastro
    ? 'Reenviando código...'
    : segundosReenvioSms > 0
      ? `Reenviar código em ${segundosReenvioSms}s`
      : 'Reenviar código'}
</button>
  </div>
)}

{authErro && (
  <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
    {authErro}
  </div>
)}

{authMensagem && (
  <div className="rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700">
    {authMensagem}
  </div>
)}

                <button
  type="button"
  onClick={handleCadastroTeste}
  disabled={authLoading}
  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {authLoading
  ? smsCadastroEnviado
    ? 'Validando código...'
    : 'Enviando código...'
  : smsCadastroEnviado
    ? 'Concluir cadastro'
    : 'Enviar código por SMS'}
</button>

                <div className="pt-2 text-center text-sm text-slate-600">
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => setModoAuth('login')}
                    className="font-bold text-sky-700 hover:underline"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            )}
            </>
            )}
            </div>
          </div>
      </section>
    </main>
  );
}

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${bgMain}`}>
      
      {/* ================= MODAIS ================= */}

      <ModalInstrucoes
  aberto={modalInstrucoes}
  aoFechar={() => setModalInstrucoes(false)}
  bgCard={bgCard}
  textMuted={textMuted}
  textStrong={textStrong}
  corPrimaria={corPrimaria}
  textoSobreCorPrimaria={textoSobreCorPrimaria}
  corEhClara={corEhClara}
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

  adicionarDespesaBase={adicionarDespesaBase}
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

<ModalConfirmacao
  aberto={modalConfirmacaoAberto}
  titulo={tituloConfirmacao}
  mensagem={mensagemConfirmacao}
  textoConfirmar={textoConfirmarConfirmacao}
  carregando={confirmacaoCarregando}
  aoCancelar={fecharConfirmacao}
  aoConfirmar={confirmarAcao}
/>

{modalReceitaDashboardAberto && (
  <div
    className="fixed inset-0 z-[6200] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharModalReceitaDashboard}
  >
    <div
      className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="mb-4 rounded-xl px-4 py-3"
        style={estiloTemaPrimario}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em]">
          Confirmar lançamento
        </p>

        <h2 className="mt-1 text-xl font-black">
          LANÇAR RECEITA
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
          {tipoReceitaDashboard === 'total' && getTotalEntradasPorMes(mesReceitaDashboard) > 0 && (
            <p className={`mt-2 text-xs font-semibold leading-relaxed ${textMuted}`}>
              Este mês já possui {formatarMoeda(getTotalEntradasPorMes(mesReceitaDashboard))} em receitas lançadas. O valor informado será somado a elas.
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
    </div>
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
    <div
      className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-5">
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
    </div>
  </div>
)}

{modalEditarEmpresaAberto && (
  <div
    className="fixed inset-0 z-[5600] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharEdicaoEmpresaAtual}
  >
    <div
      className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="mb-5 rounded-xl px-4 py-3"
        style={estiloTemaPrimario}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em]">
          Gerenciar empresa
        </p>
        <h2 className="mt-1 text-xl font-black">
          Editar dados
        </h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className={`mb-1 block text-xs font-black uppercase tracking-wide ${textMuted}`}>
            Nome da empresa
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
    </div>
  </div>
)}

{modalEmpresasAberto && (
  <div
    className="fixed inset-0 z-[5500] flex items-center justify-center bg-black/60 px-4"
    onClick={() => setModalEmpresasAberto(false)}
  >
    <div
      className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-5">
        <p className={`text-xs font-black uppercase tracking-[0.18em] ${
          darkMode ? 'text-slate-400' : 'text-slate-400'
        }`}>
          Empresas
        </p>

        <h2 className={`mt-2 text-2xl font-black ${
          darkMode ? 'text-white' : 'text-slate-800'
        }`}>
          Gerenciar empresa
        </h2>

        <p className={`mt-3 text-sm font-semibold ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Empresa atual: {nomeEmpresaAtual || 'Empresa não carregada'}
        </p>

        <p className={`mt-1 text-sm font-semibold ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Perfil: {perfilUsuarioFormatado}
        </p>
      </div>

      <div className="space-y-3">
        {podeAcessarAjustes && (
          <button
            type="button"
            onClick={abrirEdicaoEmpresaAtual}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800 cursor-pointer"
          >
            Editar dados
          </button>
        )}

        {podeCriarNovaEmpresa && (
          <button
            type="button"
            onClick={() => {
              setModalEmpresasAberto(false);
              abrirCriacaoNovaEmpresa();
            }}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-700 cursor-pointer"
          >
            Criar nova empresa
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setModalEmpresasAberto(false);
            abrirTrocaEmpresa();
          }}
          disabled={!podeTrocarEmpresa}
          className={`w-full rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide transition ${
            podeTrocarEmpresa
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          Trocar empresa
        </button>

        {perfilUsuario === 'gestor_master' && (
          <button
            type="button"
            onClick={() => {
              setModalEmpresasAberto(false);
              confirmarExclusaoEmpresaAtual();
            }}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 cursor-pointer"
          >
            Excluir empresa
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setModalEmpresasAberto(false)}
        className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide transition cursor-pointer ${
          darkMode
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        Cancelar
      </button>
    </div>
  </div>
)}

{modalAvisoAberto && (
  <div
    className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 px-4"
    onClick={fecharAviso}
  >
    <div
      className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center gap-3">
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
    </div>
  </div>
)}

{usuarioEditandoId && (
  <div
    className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 px-4"
    onClick={cancelarEdicaoUsuario}
  >
    <div
      className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl font-black ${textStrong}`}>
            Editar usuário
          </h2>

          <p className={`mt-1 text-sm ${textMuted}`}>
            Altere os dados do usuário ou redefina a senha diretamente.
          </p>
        </div>

        <button
          type="button"
          onClick={cancelarEdicaoUsuario}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition cursor-pointer ${
            darkMode
              ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
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
          value={editUsuarioEmail}
          onChange={(e) => setEditUsuarioEmail(e.target.value)}
          placeholder="Login ou email"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none ${
            darkMode
              ? 'bg-slate-900 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        />

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
    </div>
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
    <div
      className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex items-start justify-between gap-4 border-b px-6 py-4 backdrop-blur ${
          darkMode
            ? 'border-slate-700 bg-slate-800/95'
            : 'border-slate-200 bg-white/95'
        }`}
      >
  <div className="min-w-0 flex-1">
    <h2 className={`text-xl font-black ${textStrong}`}>
      Usuários e Permissões
    </h2>

    <p className={`mt-1 text-sm ${textMuted}`}>
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
      className={`rounded-lg px-3 py-1 text-sm font-black transition cursor-pointer ${
        darkMode
          ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      ✕
    </button>

    <button
      type="button"
      onClick={() => setAjudaUsuariosAberta((aberto) => !aberto)}
      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black transition cursor-pointer ${
        darkMode
          ? 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-700'
          : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
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
              Pode gerenciar usuários, acessar ajustes, inserir, editar e excluir lançamentos.
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
          onClick={abrirCriarNovoUsuario}
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
          Criar novo usuário
        </button>

        <button
          type="button"
          onClick={abrirAdicionarUsuarioExistente}
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
          Adicionar usuário existente
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
    </div>
  </div>
)}

      {calcAberta && (
        <Calculadora onClose={() => setCalcAberta(false)} corPrimaria={corPrimaria} darkMode={darkMode} />
      )}

      {/* ================= HEADER GLOBAL ================= */}

{/* ================= MENU RESPONSIVO ================= */}
{menuResponsivoAberto && (
  <div
    className="fixed inset-0 z-[1200] bg-black/50 lg:hidden"
    onClick={() => setMenuResponsivoAberto(false)}
  >
    <aside
      onClick={(e) => e.stopPropagation()}
      className={`flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-r p-4 shadow-2xl ${
        darkMode
          ? 'border-slate-700 bg-slate-900 text-slate-100'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.25em] ${textMuted}`}>
            AvantaLab
          </p>
          <h2 className={`mt-1 text-lg font-black ${textStrong}`}>
            Menu
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setMenuResponsivoAberto(false)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-black transition cursor-pointer ${
            darkMode
              ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
              : 'border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
          title="Fechar menu"
        >
          ×
        </button>
      </div>

      <div className="space-y-1">
        {['Dashboard', 'Balanço Geral', 'Gráficos', 'Por Categoria', 'Relatório'].map((aba) => (
          <button
            key={aba}
            type="button"
            onClick={() => {
              setAbaAtiva(aba);
              setMenuResponsivoAberto(false);
              if (aba === 'Dashboard') {
                setMesAtivo(null);
              }
            }}
            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-black transition cursor-pointer ${
              abaAtiva === aba
                ? ''
                : darkMode
                  ? 'hover:bg-slate-800 text-slate-300'
                  : 'hover:bg-slate-100 text-slate-600'
            }`}
            style={abaAtiva === aba ? estiloTemaPrimario : undefined}
          >
            {aba === 'Dashboard' ? 'Início' : aba}
          </button>
        ))}
      </div>

      <div className={`my-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setCalcAberta(true);
            setMenuResponsivoAberto(false);
          }}
          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-black transition cursor-pointer ${
            darkMode
              ? 'hover:bg-slate-800 text-slate-300'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Calculadora
        </button>

        

        <button
          type="button"
          onClick={() => {
            setMenuResponsivoAberto(false);
            confirmarLogout();
          }}
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-red-600 transition hover:bg-red-50 cursor-pointer"
        >
          Sair
        </button>
      </div>
    </aside>
  </div>
)}

<header
  className={`print-ocultar ${bgCard} sticky top-0 z-[900] shadow-[0_4px_18px_rgba(15,23,42,0.10)] border-b px-8 pt-1 pb-4 relative overflow-hidden`}
  style={{
    borderBottomColor: darkMode ? '#334155' : 'transparent',
    borderBottomWidth: '1px',
  }}
>
    <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 xl:gap-6 xl:px-8">
  {/* LOGO */}
  <div
    className="w-44 h-20 xl:w-64 xl:h-24 flex items-center justify-center relative cursor-pointer shrink-0"
    onClick={() => {
      setAbaAtiva('Dashboard');
      setMesAtivo(null);
      setMenuResponsivoAberto(false);
    }}
  >
    {logoUrl && logoUrl !== '__blank__' ? (
      /* Imagem: overflow-hidden no wrapper interno, não no container */
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <img
          src={logoUrl}
          alt="Logo"
          className="absolute"
          style={{
            transform: `translate(${logoSettings.x}px, ${logoSettings.y}px) scale(${logoSettings.scale / 100})`,
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        />
      </div>
    ) : logoUrl !== '__blank__' ? (
      /* Placeholder: borda num elemento absolute com inset 2px
         para garantir que a borda nunca toque o limite de clipping do header */
      <>
        <div
          className="absolute pointer-events-none rounded-lg"
          style={{
            inset: '2px',
            border: `2px dashed ${darkMode ? '#475569' : '#cbd5e1'}`,
          }}
        />
        <span className="relative px-3 text-center leading-snug text-slate-500">
          <span className="block text-[11px] font-semibold">
            Acesse os Ajustes e adicione sua
          </span>
          <span className="mt-1 block text-base font-black tracking-wide">
            LOGOMARCA
          </span>
        </span>
      </>
    ) : null}
  </div>

  <button
  type="button"
  onClick={() => setMenuResponsivoAberto(true)}
  className={`lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-2xl font-black transition cursor-pointer ${
    darkMode
      ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
  }`}
  title="Abrir menu"
>
  ☰
</button>

  {/* ÁREA DIREITA DO HEADER */}
  <div className="flex-1 flex flex-col gap-3 xl:gap-5 min-w-0">
    {/* LINHA 1: MENU */}
<div className="relative hidden items-center gap-3 lg:flex">
  <nav
    className={`relative grid min-w-0 grid-cols-5 overflow-hidden rounded-xl border p-1 shadow-sm ${
      darkMode
        ? 'border-slate-700 bg-slate-900/70'
        : 'border-slate-200 bg-slate-50'
    }`}
  >
    {(() => {
      const itensMenuPrincipal = [
        { aba: 'Dashboard', label: 'Início' },
        { aba: 'Balanço Geral', label: 'Balanço' },
        { aba: 'Gráficos', label: 'Gráficos' },
        { aba: 'Por Categoria', label: 'Categorias' },
        { aba: 'Relatório', label: 'Relatório' },
      ];

      const indiceAtivo = Math.max(
        0,
        itensMenuPrincipal.findIndex((item) => item.aba === abaAtiva)
      );

      return (
        <>
          <span
            className="absolute bottom-1 left-1 top-1 rounded-lg shadow-sm transition-transform duration-300 ease-out"
            style={{
              width: 'calc((100% - 0.5rem) / 5)',
              transform: `translateX(${indiceAtivo * 100}%)`,
              backgroundColor: corPrimaria,
            }}
          />

          {itensMenuPrincipal.map((item) => {
            const ativo = abaAtiva === item.aba;

            return (
              <button
                key={item.aba}
                type="button"
                onClick={() => {
                  setAjustesAberto(false);
                  setPainelAvisosAberto(false);
                  setMesAtivo(null);
                  setAbaAtiva(item.aba);
                  setMenuResponsivoAberto(false);
                }}
                className={`relative z-10 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-colors active:scale-[0.98] cursor-pointer ${
                  ativo
                    ? ''
                    : darkMode
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
                style={
                  ativo
                    ? {
                        color: textoSobreCorPrimaria,
                      }
                    : undefined
                }
              >
                {item.label}
              </button>
            );
          })}
        </>
      );
    })()}
  </nav>

  <div className="ml-auto flex items-center gap-2">
    <div
      className={`flex h-9 items-center gap-2 rounded-lg border px-2.5 shadow-sm ${
        darkMode
          ? 'border-slate-700 bg-slate-800 text-slate-100'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
    >
      <span className={`text-[9px] font-black uppercase tracking-wide ${textMuted}`}>
        Ano
      </span>

      <select
        value={anoSelecionado}
        onChange={(e) => setAnoSelecionado(e.target.value)}
        className="bg-transparent text-sm font-black outline-none cursor-pointer"
        style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
      >
        {Array.from(
          { length: new Date().getFullYear() + 5 - 2024 + 1 },
          (_, i) => (2024 + i).toString()
        ).map((ano) => (
          <option key={ano} value={ano} className="bg-white text-slate-800">
            {ano}
          </option>
        ))}
      </select>
    </div>

    <button
      type="button"
      onClick={() => setCalcAberta(!calcAberta)}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
        darkMode
          ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      title="Calculadora"
    >
      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </button>

    <button
      type="button"
      onClick={() => {
        setAjustesAberto(false);
        setPainelAvisosAberto((prev) => !prev);
      }}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
        darkMode
          ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      title="Avisos do sistema"
    >
      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
        />
      </svg>

      {alertasSistema.length > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white shadow-md">
          {alertasSistema.length}
        </span>
      )}
    </button>

    <button
      type="button"
      onClick={() => {
        setPainelAvisosAberto(false);
        setAjustesAberto(!ajustesAberto);
      }}
      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black uppercase tracking-wide shadow-sm transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
        ajustesAberto
          ? 'text-white'
          : darkMode
            ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      style={
        ajustesAberto
          ? {
              backgroundColor: '#475569',
              borderColor: '#475569',
            }
          : undefined
      }
      title="Abrir ajustes"
    >
      <svg
        className={`h-4 w-4 transition-transform duration-300 ${
          ajustesAberto ? 'rotate-90' : 'rotate-0'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.451 2.451 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.451 2.451 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.451-2.451 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.451-2.451 1.724 1.724 0 002.573-1.066z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z"
        />
      </svg>
      Ajustes
    </button>

    <button
      type="button"
      onClick={confirmarLogout}
      className={`h-9 rounded-lg border px-3 text-xs font-black uppercase tracking-wide shadow-sm transition active:scale-[0.98] cursor-pointer ${
        darkMode
          ? 'border-red-800/50 bg-red-950/30 text-red-300 hover:bg-red-900/50'
          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
      }`}
    >
      Sair
    </button>
  </div>
</div>

    {/* TEXTO DENTRO DA FAIXA INFERIOR */}
<div
  className="absolute bottom-0 left-0 right-0 h-5 text-xs font-semibold z-10"
  style={{
    backgroundColor: corPrimaria,
    color: textoSobreCorPrimaria,
  }}
>
  <div className="mx-auto flex h-full w-full max-w-[1280px] items-center px-8">
    <div className="flex items-center gap-2 min-w-0">
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>

    <span className="truncate font-black">
      Olá, {nomeEmpresaAtual || 'Empresa'}
    </span>
  </div>
</div>
</div>
  </div>
  </div>
</header>

{painelAvisosAberto && (
  <>
    <div
      className="fixed inset-0 z-[8400] bg-black/40"
      onClick={() => setPainelAvisosAberto(false)}
    />

    <div
      className={`fixed right-8 top-[135px] w-80 overflow-hidden rounded-2xl border shadow-2xl z-[8500] ${
        darkMode
          ? 'bg-slate-900 border-slate-700 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: corPrimaria,
          color: textoSobreCorPrimaria,
          borderColor: bordaSobreCorPrimaria,
        }}
      >
        <h3 className="text-sm font-black uppercase tracking-wide">
          Avisos do sistema
        </h3>

        <p className="text-[11px] opacity-80">
          {alertasSistema.length > 0
            ? `${alertasSistema.length} aviso(s) pendente(s)`
            : 'Nenhum aviso pendente'}
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto p-3">
        {alertasSistema.length === 0 ? (
          <div className={`rounded-xl p-4 text-sm ${textMuted}`}>
            Tudo certo por enquanto.
          </div>
        ) : (
          <div className="space-y-3">
            {alertasSistema.map((aviso) => (
              <div
                key={aviso.id}
                className={`rounded-xl border p-3 ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800/70'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <h4 className={`text-sm font-black ${textStrong}`}>
                  {aviso.titulo}
                </h4>
                
                <p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>
                  {aviso.mensagem}
                </p>

                {aviso.acao && aviso.acaoTexto && (
                  <button
                    type="button"
                    onClick={async () => {
                      setPainelAvisosAberto(false);
                      await aviso.acao?.();
                    }}
                    className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition hover:brightness-110 cursor-pointer"
                    style={estiloTemaPrimario}
                  >
                    {aviso.acaoTexto}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
)}

      {/* ================= MENU DE AJUSTES GERAL ================= */}
{ajustesAberto && (
  <>
    <div
      className="fixed inset-0 z-[1190] bg-transparent"
      onClick={() => setAjustesAberto(false)}
    />

    <div
      className="print-ocultar fixed left-0 right-0 top-[116px] z-[1200] bg-slate-900 text-white p-4 shadow-xl border-t border-slate-700 transition-all"
    style={{ borderTopColor: corPrimaria, borderTopWidth: '2px' }}
  >
    {/* Adicionado overflow-x-auto e removido flex-wrap para forçar 1 linha */}
    <div className="flex justify-between items-center max-w-7xl mx-auto gap-4 overflow-x-auto custom-scroll pb-1">
      
      {/* GRUPO DA ESQUERDA (Botões menores: text-xs, py-1.5) */}
      <div className="flex items-center gap-3">
        <button
  onClick={() => {
  setAjustesAberto(false);
  setModalDespesasBase(true);
}}
  className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border transition-colors font-bold shadow flex items-center gap-1.5 text-xs"
  style={{ borderColor: corPrimaria }}
>
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="#ffffff"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 4v16m8-8H4"
    />
  </svg>
  Cadastrar Despesas
</button>


        
        <button
  onClick={() => {
  setAjustesAberto(false);
  setModalInstrucoes(true);
}}
  className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border transition-colors font-bold shadow flex items-center gap-1.5 text-xs"
  style={{ borderColor: corPrimaria }}
>
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="#ffffff"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
  Instruções categorias
</button>
      </div>
      
      {/* GRUPO DA DIREITA (Removido flex-wrap, botões menores) */}
      
      <div className="flex items-center gap-2">
        <button onClick={() => {
  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para alterar a logomarca da empresa.'
    );
    return;
  }

  setAjustesAberto(false);
setModalLogo(true);
}} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Adicionar Logo</button>

<div className="whitespace-nowrap relative overflow-hidden bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs flex items-center gap-1.5">
  <span
    className="w-2.5 h-2.5 rounded-full"
    style={{ backgroundColor: corPrimaria }}
  ></span>

  <span>Cor Tema</span>

  {podeAcessarAjustes ? (
    <input
      type="color"
      value={corPrimaria}
      onChange={(e) => {
        setCorPrimaria(e.target.value);
      }}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        abrirAviso(
          'Acesso não permitido',
          'Você não tem permissão para alterar a cor tema da empresa.'
        );
      }}
      className="absolute inset-0 w-full h-full cursor-not-allowed opacity-0"
      aria-label="Sem permissão para alterar a cor tema"
    />
  )}
</div>

<div className="whitespace-nowrap flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded shadow border border-slate-700 cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
          <span className="text-xs">Modo Escuro</span>
          <div
  className={`w-7 h-3.5 rounded-full relative transition-colors ${
    darkMode ? '' : 'bg-slate-600'
  }`}
  style={{
    backgroundColor: darkMode ? corPrimaria : '',
    border: darkMode && corEhClara(corPrimaria) ? '1px solid rgba(15, 23, 42, 0.35)' : '',
  }}
>
  <span
    className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${
      darkMode ? 'translate-x-3.5' : ''
    }`}
    style={{
      backgroundColor: darkMode && corEhClara(corPrimaria) ? '#0f172a' : '#ffffff',
    }}
  />
</div>
        </div>
        <Tooltip
  texto="Quando ativado, o sistema avisa se você tentar lançar uma despesa com o mesmo nome e valor no mesmo mês."
  posicao="bottom"
>
  <div
    className="whitespace-nowrap flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded shadow border border-slate-700 cursor-pointer"
    onClick={() => setDuplicadosAtivo(!duplicadosAtivo)}
  >
    <span className="text-xs">Duplicados</span>

    <div
      className={`w-7 h-3.5 rounded-full relative transition-colors ${
        duplicadosAtivo ? '' : 'bg-slate-600'
      }`}
      style={{
        backgroundColor: duplicadosAtivo ? corPrimaria : '',
        border:
          duplicadosAtivo && corEhClara(corPrimaria)
            ? '1px solid rgba(15, 23, 42, 0.35)'
            : '',
      }}
    >
      <span
        className={`absolute left-0.5 top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${
          duplicadosAtivo ? 'translate-x-3.5' : ''
        }`}
        style={{
          backgroundColor:
            duplicadosAtivo && corEhClara(corPrimaria)
              ? '#0f172a'
              : '#ffffff',
        }}
      />
    </div>
  </div>
</Tooltip>

{podeGerenciarUsuarios && (
  <button
    type="button"
    onClick={() => {
  setAjustesAberto(false);
  abrirModalUsuarios();
}}
    className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors font-bold flex items-center gap-1.5 text-xs text-white cursor-pointer"
  >
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-6a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>

    Usuário
  </button>
)}

<button
  type="button"
  onClick={() => {
    setAjustesAberto(false);
    setModalEmpresasAberto(true);
  }}
  className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs cursor-pointer"
>
  Gerenciar empresa
</button>

              {/* BOTÃO DE BACKUP EXCEL */}
              <button 
                onClick={() => {
  if (!podeAcessarAjustes) {
    abrirAviso(
      'Acesso não permitido',
      'Você não tem permissão para gerar backup dos dados da empresa.'
    );
    return;
  }
setAjustesAberto(false);
  abrirConfirmacao({
    titulo: 'Gerar backup',
    mensagem:
      'O sistema vai gerar um arquivo Excel com os dados da empresa atual.\n\nDeseja continuar?',
    textoConfirmar: 'Gerar backup',
    acao: async () => {
      await gerarBackupExcel();
    },
  });
}}
                className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded shadow border border-emerald-700 transition-colors font-bold flex items-center gap-1.5 text-xs text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Backup
              </button>
            </div>
          </div>

          {statusConfig !== 'idle' && (
            <div
              className={`mt-2 rounded-full px-3 py-0.5 text-center text-[10px] font-bold leading-tight ${
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
      </>
)}

      {/* RENDERIZAÇÃO CONDICIONAL DAS TELAS */}
      {mesAtivo ? (
        <>
          <div
  className="print-ocultar sticky top-[116px] z-[850] shadow-md py-2 text-white"
  style={{ backgroundColor: corPrimaria }}
>
  <div className="max-w-7xl mx-auto grid w-full grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] items-center gap-4 px-8">
    {/* ESQUERDA: MÊS COM SETAS */}
    <div className="flex items-center justify-center gap-2">
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
        className="rounded-md bg-black/10 px-2.5 py-1.5 text-sm font-bold transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>

      <h2 className="min-w-[190px] text-center text-lg font-black uppercase tracking-wider">
        {mesAtivo} / {anoSelecionado}
      </h2>

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
        className="rounded-md bg-black/10 px-2.5 py-1.5 text-sm font-bold transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
              <div className="min-w-0">
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
            />
              </div>

              <div className="min-w-0">
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
/>
              </div>
            </div>

<div className="flex justify-between items-center mt-6 mb-3 print-ocultar">
  <div className="flex items-center gap-3">
  <span
    className="block h-6 w-2 shrink-0 rounded-full shadow-sm"
    style={{ backgroundColor: corPrimaria }}
  />

  <h2 className={`m-0 text-xl font-black leading-none ${textStrong} uppercase tracking-wider`}>
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
          <div
            key={item.nome}
            className={`min-w-0 rounded-md border px-2.5 py-2 ${
              darkMode
                ? 'border-slate-700 bg-slate-800/50'
                : 'border-slate-200 bg-slate-50'
            }`}
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
          </div>
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
        setMesAtivo={setMesAtivo}
        bgCard={bgCard}
        corPrimaria={corPrimaria}
        textStrong={textStrong}
        textMuted={textMuted}
        darkMode={darkMode}
        mesResumoDash={mesResumoDash}
        setMesResumoDash={setMesResumoDash}
        totalDespesasMes={totalDespesasMes}
        maiorGasto={maiorGasto}
        lucroOperacional={lucroOperacional}
  inputFaturamento={inputFaturamento}
  setInputFaturamento={setInputFaturamento}
  placeholderFaturamento="0,00"
  solicitarFaturamentoDashboard={solicitarFaturamentoDashboard}
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
      />
    </div>
  </main>
)}

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

{/* ================= CHAT FLUTUANTE DE FEEDBACK ================= */}

<div className="print-ocultar fixed bottom-6 right-6 z-[7800]">
  {chatFeedbackAberto && (
    <div
      className={`mb-4 w-[360px] overflow-hidden rounded-3xl border shadow-2xl ${
        darkMode
          ? 'border-slate-700 bg-slate-900 text-slate-100'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <div
        className="flex items-start justify-between gap-3 px-5 py-4"
        style={{
          background: 'linear-gradient(135deg, #020617, #003E73)',
          color: '#ffffff',
        }}
      >
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">
            AvantaLab
          </p>

          <h3 className="mt-1 text-base font-black leading-tight">
            Como podemos ajudar?
          </h3>
        </div>

        <button
          type="button"
          onClick={fecharChatFeedback}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-white/20 cursor-pointer"
          aria-label="Fechar chat"
        >
          ×
        </button>
      </div>

      <div className="p-5">
        {chatFeedbackEtapa === 'inicio' && (
          <div>
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              Olá, agradecemos sua interação com a AvantaLab.
              <br />
              Selecione uma das opções abaixo:
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => abrirFormularioFeedback('sugestao')}
                className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-50 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                    ✦
                  </span>

                  <div>
                    <p className="text-sm font-black">Sugestões</p>
                    <p className={`mt-0.5 text-xs ${textMuted}`}>
                      Envie ideias, avaliações ou pontos de melhoria.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => abrirFormularioFeedback('duvida')}
                className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-50 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                    ?
                  </span>

                  <div>
                    <p className="text-sm font-black">Dúvidas</p>
                    <p className={`mt-0.5 text-xs ${textMuted}`}>
                      Envie uma dúvida sobre o uso do sistema.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {chatFeedbackEtapa === 'formulario' && (
          <div>
            <button
              type="button"
              onClick={voltarInicioChatFeedback}
              className={`mb-4 text-xs font-black uppercase tracking-wide transition hover:underline cursor-pointer ${
                darkMode ? 'text-sky-300' : 'text-sky-700'
              }`}
            >
              ← Voltar
            </button>

            <h4 className="text-lg font-black">
              {feedbackTipo === 'sugestao' ? 'Enviar sugestão' : 'Enviar dúvida'}
            </h4>

            <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
              {feedbackTipo === 'sugestao'
                ? 'Sua opinião é muito importante para melhorarmos o AvantaLab. Escreva abaixo sua sugestão, avaliação ou ponto de melhoria.'
                : 'Descreva sua dúvida sobre o uso do AvantaLab. Em breve, este atendimento poderá ser respondido por uma IA treinada para ajudar no sistema.'}
            </p>

            <textarea
              value={feedbackMensagem}
              onChange={(e) => setFeedbackMensagem(e.target.value)}
              placeholder={
                feedbackTipo === 'sugestao'
                  ? 'Escreva sua sugestão...'
                  : 'Escreva sua dúvida...'
              }
              rows={5}
              className={`mt-4 w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                darkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                  : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-600/20'
              }`}
            />

            <button
              type="button"
              onClick={enviarFeedbackVisual}
              disabled={feedbackEnviando}
              className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #003E73, #00A6C8)',
              }}
            >
              {feedbackEnviando ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </div>
        )}

        {chatFeedbackEtapa === 'confirmacao' && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-700">
              ✓
            </div>

            <h4 className="mt-4 text-lg font-black">
              Mensagem registrada
            </h4>

            <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
              Obrigado! Sua mensagem foi registrada com sucesso.
            </p>

            <button
              type="button"
              onClick={voltarInicioChatFeedback}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-slate-800 cursor-pointer"
            >
              Enviar outra mensagem
            </button>
          </div>
        )}
      </div>
    </div>
  )}

  <button
    type="button"
    onClick={() => setChatFeedbackAberto((aberto) => !aberto)}
    className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-sky-900/30 active:scale-95 cursor-pointer"
    style={{
      background: 'linear-gradient(135deg, #020617, #003E73)',
    }}
    aria-label="Abrir chat AvantaLab"
  >
    {chatFeedbackAberto ? (
      <span className="text-3xl font-black leading-none">×</span>
    ) : (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          d="M8 10h8M8 14h5m7-2a8 8 0 11-3.2-6.4L21 5l-1.2 4.2A7.96 7.96 0 0120 12z"
        />
      </svg>
    )}
  </button>
</div>

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
