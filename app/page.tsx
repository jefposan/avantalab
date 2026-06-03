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
import {
  formatarMoeda,
  formatarDescricao,
  corEhClara,
  getMaxDias,
  normalizarTexto,
} from './lib/formatters';
import {
  buscarEmpresaDoUsuario,
  buscarConfiguracoes,
  buscarDespesasCadastradas,
  buscarLancamentos,
  buscarFaturamentos,
  salvarLancamento,
  apagarLancamento,
  atualizarLancamento,
  salvarFaturamentoBanco,
  salvarConfiguracoesBanco,
  salvarDespesaCadastrada,
  apagarDespesaCadastrada,
  buscarUsuariosEmpresa,
  criarUsuarioEmpresa,
  atualizarUsuarioEmpresa,
  bloquearUsuarioEmpresa,
  excluirUsuarioEmpresa,
  criarEmpresaInicial,
  redefinirSenhaUsuarioEmpresa,
  buscarEmailPorLogin,
} from './lib/database';

import { supabase } from './lib/supabase';

export default function AppGestao() {

  // --- ESTADOS PRINCIPAIS ---
  
const [mounted, setMounted] = useState(false);
  const [isTelaMobile, setIsTelaMobile] = useState(false);
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');

  const [loginEmail, setLoginEmail] = useState('');
const [loginSenha, setLoginSenha] = useState('');

const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
const [mostrarSenhaCadastro, setMostrarSenhaCadastro] = useState(false);
const [mostrarConfirmarSenhaCadastro, setMostrarConfirmarSenhaCadastro] = useState(false);

const [cadastroNome, setCadastroNome] = useState('');
const [cadastroEmail, setCadastroEmail] = useState('');
const [cadastroSenha, setCadastroSenha] = useState('');
const [cadastroConfirmarSenha, setCadastroConfirmarSenha] = useState('');

const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
const [tituloConfirmacao, setTituloConfirmacao] = useState("");
const [mensagemConfirmacao, setMensagemConfirmacao] = useState("");
const [textoConfirmarConfirmacao, setTextoConfirmarConfirmacao] = useState("Confirmar");
const [modalAvisoAberto, setModalAvisoAberto] = useState(false);
const [tituloAviso, setTituloAviso] = useState("");
const [mensagemAviso, setMensagemAviso] = useState("");
const [acaoConfirmacao, setAcaoConfirmacao] = useState<(() => Promise<void> | void) | null>(null);
const [confirmacaoCarregando, setConfirmacaoCarregando] = useState(false);

const [authErro, setAuthErro] = useState('');
const [authMensagem, setAuthMensagem] = useState('');
const [authLoading, setAuthLoading] = useState(false);
const [googleLoading, setGoogleLoading] = useState(false);

const [modoRedefinirSenha, setModoRedefinirSenha] = useState(false);
const [novaSenha, setNovaSenha] = useState('');
const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState(false);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [nomeEmpresaAtual, setNomeEmpresaAtual] = useState('');
const [nomeUsuarioAtual, setNomeUsuarioAtual] = useState('');
const [emailUsuarioAtual, setEmailUsuarioAtual] = useState('');
  const [acessoNaoConfigurado, setAcessoNaoConfigurado] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [nomeEmpresaInicial, setNomeEmpresaInicial] = useState('');
const [criandoEmpresaInicial, setCriandoEmpresaInicial] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState<
  'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples' | null
>(null);
const [usuariosEmpresa, setUsuariosEmpresa] = useState<any[]>([]);
const [usuariosCarregando, setUsuariosCarregando] = useState(false);
const [usuarioNome, setUsuarioNome] = useState('');
const [usuarioLogin, setUsuarioLogin] = useState('');
const [usuarioSenha, setUsuarioSenha] = useState('');
const [usuarioPerfil, setUsuarioPerfil] = useState<
  'administrador' | 'operador_completo' | 'operador_simples'
>('operador_simples');
const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
const [editUsuarioNome, setEditUsuarioNome] = useState('');
const [editUsuarioEmail, setEditUsuarioEmail] = useState('');
const [editUsuarioNovaSenha, setEditUsuarioNovaSenha] = useState('');
const [mostrarEditUsuarioNovaSenha, setMostrarEditUsuarioNovaSenha] = useState(false);
const [editUsuarioPerfil, setEditUsuarioPerfil] = useState<
  'administrador' | 'operador_completo' | 'operador_simples'
>('operador_simples');
const [modalUsuarios, setModalUsuarios] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('Dashboard');
  const [ajustesAberto, setAjustesAberto] = useState(false);
  const [duplicadosAtivo, setDuplicadosAtivo] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [corPrimaria, setCorPrimaria] = useState('#003E73');
  const [corTemporaria, setCorTemporaria] = useState('#003E73');
  const [statusConfig, setStatusConfig] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [mesAtivo, setMesAtivo] = useState<string | null>(null);
  const [ajudaCategoriasAberta, setAjudaCategoriasAberta] = useState(false);
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

  const [despesasCadastradas, setDespesasCadastradas] = useState([
    { nome: 'Energia Elétrica', categoria: 'Despesas Operacionais' },
    { nome: 'Tráfego Pago (Ads)', categoria: 'Custos Variáveis' },
  ]);
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
const [buscaLancamento, setBuscaLancamento] = useState('');

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

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

    setIsTelaMobile(larguraPequena && (dispositivoComToque || userAgentMobile));
  };

  verificarDispositivoMobile();
}, []);

  // --- LOCAL STORAGE (LÓGICA SEPARADA POR ANO E CONFIGURAÇÕES) ---
  
  // 1. Carrega Configurações Globais
  // 1. Carrega Configurações Globais do Supabase

useEffect(() => {
  const carregarConfiguracoesIniciais = async () => {
    const paramsConfirmacao = new URLSearchParams(window.location.search);

if (paramsConfirmacao.get('confirmado') === '1') {
  await supabase.auth.signOut();

  setEmailConfirmado(true);
  setAcessoLiberado(false);
  setAcessoNaoConfigurado(false);
  setModoRedefinirSenha(false);
  setModoAuth('login');
  setMounted(true);

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
        setAcessoLiberado(false);
      } else {
        setAcessoLiberado(true);
      }

      empresa = await buscarEmpresaDoUsuario(sessaoAtual.session.user.id);

if (!empresa) {
  setAcessoNaoConfigurado(true);
  setAcessoLiberado(false);
} else {
  setAcessoNaoConfigurado(false);
}

    }


    if (empresa) {
  setEmpresaId(empresa.id);
  setNomeEmpresaAtual(empresa.nome || '');
  setPerfilUsuario(empresa.perfil || null);

  const { data: usuarioLogado } = await supabase.auth.getUser();

  setNomeUsuarioAtual(
    usuarioLogado.user?.user_metadata?.nome ||
      usuarioLogado.user?.email?.split('@')[0] ||
      ''
  );

  setEmailUsuarioAtual(usuarioLogado.user?.email || '');

      const config = await buscarConfiguracoes(empresa.id);
      const despesas = await buscarDespesasCadastradas(empresa.id);

      if (config) {
        if (config.cor_primaria) {
  setCorPrimaria(config.cor_primaria);
  setCorTemporaria(config.cor_primaria);
}
        if (config.dark_mode !== undefined) setDarkMode(config.dark_mode);
        if (config.duplicados_ativo !== undefined) setDuplicadosAtivo(config.duplicados_ativo);
        if (config.logo_url) setLogoUrl(config.logo_url);
        if (config.logo_settings) setLogoSettings(config.logo_settings);
      }

      if (despesas && despesas.length > 0) {
        setDespesasCadastradas(
          despesas.map((d: any) => ({
            nome: d.nome,
            categoria: d.categoria,
          }))
        );
      }
    }

    const mesAtual = meses[new Date().getMonth()];
    setMesResumoDash(mesAtual);
    setMesFaturamento(mesAtual);

    setMounted(true);
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
  if (!mounted || !empresaId) return;

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
      darkMode,
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
}, [corPrimaria, darkMode, duplicadosAtivo, logoUrl, logoSettings, mounted, empresaId]);

  
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

  // --- CÁLCULOS E FUNÇÕES ---
  
  const mesParaAnalise = mesAtivo || mesResumoDash;
  const lancamentosDoMes = lancamentos.filter(l => l.mes === mesParaAnalise);
  const totalDespesasMes = lancamentosDoMes.reduce((acc, lanc) => acc + lanc.valor, 0);
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

  const maiorGasto = lancamentosDoMes.length > 0 ? lancamentosDoMes.reduce((prev, curr) => (curr.valor > prev.valor ? curr : prev), { despesa: '', valor: 0 }) : { despesa: 'Nenhuma despesa', valor: 0 };
  const receitasTotais = Object.values(faturamentos).reduce((a, b) => a + b, 0);
  const despesasTotais = lancamentos.reduce((a, b) => a + b.valor, 0);
  const lucroTotalAnual = receitasTotais - despesasTotais;

  const salvarFaturamentoMes = async (mes: string, valor: number) => {
  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Tente atualizar a página e acessar novamente.'
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

  const salvarFaturamento = async () => {
  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Tente atualizar a página e acessar novamente.'
  );
  return;
}

  const valorLimpo = parseInt(inputFaturamento.replace(/\D/g, '') || '0', 10) / 100;

  if (valorLimpo > 0) {
    const salvo = await salvarFaturamentoBanco({
      empresaId,
      ano: Number(anoSelecionado),
      mes: mesFaturamento,
      valor: valorLimpo,
    });

    if (salvo) {
      setFaturamentos(prev => ({
        ...prev,
        [mesFaturamento]: valorLimpo,
      }));

      setInputFaturamento('');
    } else {
  abrirAviso(
    'Erro ao salvar faturamento',
    'Não foi possível salvar o faturamento no banco.'
  );
}
  }
};
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, "");

  if (!value) {
    setFormValor("");
    setValorNumericoRaw(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setValorNumericoRaw(numericValue);
  setFormValor(formatarMoeda(numericValue));
};

const carregarUsuariosEmpresa = async () => {
  if (!empresaId || !podeGerenciarUsuarios) return;

  setUsuariosCarregando(true);

  const usuarios = await buscarUsuariosEmpresa(empresaId);

  setUsuariosEmpresa(usuarios);
  setUsuariosCarregando(false);
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

  if (!nomeLimpo || !loginLimpo || !senhaLimpa) {
    abrirAviso(
      'Campos obrigatórios',
      'Informe nome, login e senha do usuário.'
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
  if (usuario.perfil === 'gestor_master') {
    abrirAviso(
  'Acesso não permitido',
  'O gestor master não pode ser editado por esta tela.'
);
    return;
  }

  setUsuarioEditandoId(usuario.id);
  setEditUsuarioNome(usuario.nome || '');
  setEditUsuarioEmail(usuario.email || '');
  setEditUsuarioPerfil(
    usuario.perfil as 'administrador' | 'operador_completo' | 'operador_simples'
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
      'Não foi possível identificar o login/email deste usuário.'
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

  cancelarEdicaoUsuario();
  await carregarUsuariosEmpresa();
};

const redefinirSenhaUsuario = async () => {
  if (!usuarioEditandoId) return;

  const senhaLimpa = editUsuarioNovaSenha.trim();

  if (!senhaLimpa) {
    abrirAviso(
      'Senha obrigatória',
      'Informe a nova senha do usuário.'
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

  abrirAviso(
    'Senha redefinida',
    'A senha do usuário foi atualizada com sucesso.'
  );
};

const excluirAcessoUsuario = async (acessoId: string) => {
  abrirConfirmacao({
    titulo: 'Excluir usuário',
    mensagem:
      'Deseja excluir este usuário?\n\nEle perderá o acesso a esta empresa. Essa ação não poderá ser desfeita.',
    acao: async () => {
      const resultado = await excluirUsuarioEmpresa(acessoId);

      if (resultado.erro) {
        abrirAviso('Erro ao excluir usuário', resultado.mensagem);
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

  const apagou = await apagarDespesaCadastrada(empresaId, nome);

  if (!apagou) {
  abrirAviso(
    'Erro ao apagar despesa',
    'Não foi possível apagar a despesa cadastrada no banco.'
  );
  return;
}

  setDespesasCadastradas((prev) => prev.filter((d) => d.nome !== nome));
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

function abrirAviso(titulo: string, mensagem: string) {
  setTituloAviso(titulo);
  setMensagemAviso(mensagem);
  setModalAvisoAberto(true);
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
  setEditValor(formatarMoeda(Number(lanc.valor)));
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

const handleEditValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.replace(/\D/g, '');

  if (!value) {
    setEditValor('');
    setEditValorNumerico(0);
    return;
  }

  const numericValue = parseInt(value, 10) / 100;

  setEditValorNumerico(numericValue);
  setEditValor(formatarMoeda(numericValue));
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

    const salvo = await salvarConfiguracoesBanco({
      empresaId,
      corPrimaria,
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
  const gerarBackupExcel = async () => {
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
    'Nenhum dado foi encontrado para gerar o backup.'
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
};

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

  const tratarErroAuth = (mensagem: string) => {
  const texto = mensagem.toLowerCase();

  if (
    texto.includes('email rate limit') ||
    texto.includes('rate limit') ||
    texto.includes('too many requests') ||
    texto.includes('for security purposes') ||
    texto.includes('only request this after')
  ) {
    return {
      tipo: 'limite_email',
      mensagem:
        'Por segurança, existe um limite temporário para envio de emails de confirmação e recuperação de senha. Aguarde cerca de 1 hora e tente novamente.',
    };
  }

  if (mensagem === 'Email not confirmed') {
    return {
      tipo: 'erro',
      mensagem: 'Confirme o email recebido para liberar o acesso.',
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

  const handleCadastroTeste = async () => {
  setAuthErro('');
  setAuthMensagem('');
  setAuthLoading(true);

  const nomeLimpo = cadastroNome.trim();
  const emailLimpo = cadastroEmail.trim().toLowerCase();

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

  const { error } = await supabase.auth.signUp({
  email: emailLimpo,
  password: cadastroSenha,
  options: {
    data: {
      nome: nomeLimpo,
    },
    emailRedirectTo: `${window.location.origin}/?confirmado=1`,
  },
});

  setAuthLoading(false);

  if (error) {
  console.error('Erro cadastro:', error);

  const erroTratado = tratarErroAuth(error.message);

  if (erroTratado.tipo === 'limite_email') {
    abrirAviso('Limite temporário de emails', erroTratado.mensagem);
  } else {
    setAuthErro(erroTratado.mensagem);
  }

  return;
}

  setAuthMensagem(
  'Cadastro criado com sucesso. Enviamos um email de confirmação para liberar o acesso. Verifique sua caixa de entrada ou spam.'
);

  setCadastroNome('');
  setCadastroEmail('');
  setCadastroSenha('');
  setCadastroConfirmarSenha('');

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

  if (erroTratado.tipo === 'limite_email') {
    abrirAviso('Limite temporário de emails', erroTratado.mensagem);
  } else {
    setAuthErro(erroTratado.mensagem);
  }

  setAuthLoading(false);
  return;
}

  setAuthMensagem('Login realizado. Carregando seus dados...');

setTimeout(() => {
  window.location.href = window.location.origin + window.location.pathname;
}, 600);

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

  setAuthMensagem('Ambiente criado com sucesso. Carregando o sistema...');

  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, 700);
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

const handleLogout = async () => {
  await supabase.auth.signOut();

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
  setAuthMensagem('');
};

const handleRecuperarSenha = async () => {
  setAuthErro('');
  setAuthMensagem('');

  const emailLimpo = loginEmail.trim().toLowerCase();

  if (!emailLimpo) {
    setAuthErro('Digite seu email no campo acima para recuperar a senha.');
    return;
  }

  setAuthLoading(true);

  const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
    redirectTo: `${window.location.origin}/`,
  });

  setAuthLoading(false);

  if (error) {
  console.error('Erro recuperação de senha:', error);

  const erroTratado = tratarErroAuth(error.message);

  if (erroTratado.tipo === 'limite_email') {
    abrirAviso('Limite temporário de emails', erroTratado.mensagem);
  } else {
    setAuthErro(erroTratado.mensagem);
  }

  return;
}

  setAuthMensagem('Enviamos um email para você redefinir sua senha.');
};

const handleAtualizarSenha = async () => {
  setAuthErro('');
  setAuthMensagem('');

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

  const { error } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  setAuthLoading(false);

  if (error) {
    setAuthErro('Não foi possível atualizar a senha. Tente solicitar um novo link.');
    return;
  }

  setAuthMensagem('Senha atualizada com sucesso. Faça login novamente.');

  await supabase.auth.signOut();

  setNovaSenha('');
  setConfirmarNovaSenha('');
  setModoRedefinirSenha(false);
  setModoAuth('login');
  setAcessoLiberado(false);
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

  if (!mounted) return null;

  if (emailConfirmado) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/bg-avantalab.png')" }}
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
            Email confirmado com sucesso
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Seu cadastro foi confirmado. Agora você já pode acessar o sistema usando seu email e senha.
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
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/bg-avantalab.png')" }}
      />

      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
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
  Criar ambiente da empresa
</h1>

<p className="mt-4 text-sm leading-relaxed text-slate-600">
  Sua conta foi confirmada, mas ainda não existe uma empresa vinculada a este acesso.
  Informe o nome da empresa para iniciar o ambiente de gestão.
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

<button
  type="button"
  onClick={handleCriarEmpresaInicial}
  disabled={criandoEmpresaInicial}
  className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {criandoEmpresaInicial ? 'Criando ambiente...' : 'Criar ambiente'}
</button>

<button
  type="button"
  onClick={confirmarLogout}
  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm transition-colors cursor-pointer ${
    darkMode
      ? 'bg-red-950/30 border-red-800/50 text-red-300 hover:bg-red-900/50'
      : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
  }`}
>
  Sair
</button>
        </div>
      </section>
    </main>
  );
}

if (isTelaMobile) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      <div
  className="absolute inset-0 bg-no-repeat"
  style={{
    backgroundImage: "url('/images/bg-avantalab-mobile.png')",
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
  }}
/>

<div className="absolute inset-0 bg-white/10" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-7 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-100">
            <svg
              className="h-10 w-10 text-sky-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <h1 className="text-2xl font-black leading-tight text-slate-900">
            Acesso permitido somente pelo computador
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Para garantir a melhor experiência e o funcionamento completo das ferramentas,
            acesse o sistema por um navegador em computador ou notebook.
          </p>

          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
            Em breve, uma versão mobile poderá ser disponibilizada.
          </div>
        </div>
      </section>
    </main>
  );
}

  if (!acessoLiberado) {
  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      {modalAvisoAberto && (
  <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
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
          onClick={() => setModalAvisoAberto(false)}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-md transition hover:bg-slate-800 active:scale-[0.98] cursor-pointer"
        >
          Entendi
        </button>
      </div>
    </div>
  </div>
)}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/bg-avantalab.png')" }}
      />

      <div className="absolute inset-0 bg-white/10" />

      <section className="relative z-10 flex min-h-screen items-center px-8 py-10 lg:px-20">
        <div className="w-full max-w-7xl">
          <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-7">
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
                {modoAuth === 'login'
                  ? 'Entre para acompanhar sua gestão financeira, lançamentos, relatórios e evolução operacional.'
                  : 'Crie seu acesso para começar a usar o sistema de gestão da AvantaLab.'}
              </p>
            </div>

          {modoRedefinirSenha ? (
  <div className="space-y-4">
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Nova senha
      </label>

      <div className="relative">
        <input
          type={mostrarNovaSenha ? 'text' : 'password'}
          placeholder="Digite a nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-14 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
        />

        <button
          type="button"
          onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-sky-700"
        >
          {mostrarNovaSenha ? 'Ocultar' : 'Ver'}
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
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-14 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
        />

        <button
          type="button"
          onClick={() => setMostrarConfirmarNovaSenha(!mostrarConfirmarNovaSenha)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-sky-700"
        >
          {mostrarConfirmarNovaSenha ? 'Ocultar' : 'Ver'}
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
      {authLoading ? 'Salvando...' : 'Salvar nova senha'}
    </button>
  </div>
) : modoAuth === 'login' ? (
  <div className="space-y-4">

        {/* ================= INÍCIO DO FORMULÁRIO DE LOGIN ================= */}

<form
  onSubmit={(e) => {
    e.preventDefault();
    handleLogin();
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
        className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-14 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
      />

      <button
        type="button"
        onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-sky-700"
      >
        {mostrarSenhaLogin ? 'Ocultar' : 'Ver'}
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

{/* ================= FIM DO FORMULÁRIO DE LOGIN ================= */}

              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Nome
                  </label>
                  <input
  type="text"
  placeholder="Seu nome completo"
  value={cadastroNome}
  onChange={(e) => setCadastroNome(e.target.value)}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
  type="email"
  placeholder="seuemail@exemplo.com"
  value={cadastroEmail}
  onChange={(e) => setCadastroEmail(e.target.value)}
  className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
/>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Senha
                  </label>
                  <div className="relative">
  <input
    type={mostrarSenhaCadastro ? 'text' : 'password'}
    placeholder="Crie uma senha"
    value={cadastroSenha}
    onChange={(e) => setCadastroSenha(e.target.value)}
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-14 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />

  <button
    type="button"
    onClick={() => setMostrarSenhaCadastro(!mostrarSenhaCadastro)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-sky-700"
  >
    {mostrarSenhaCadastro ? 'Ocultar' : 'Ver'}
  </button>
</div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Confirmar senha
                  </label>
                  <div className="relative">
  <input
    type={mostrarConfirmarSenhaCadastro ? 'text' : 'password'}
    placeholder="Repita a senha"
    value={cadastroConfirmarSenha}
    onChange={(e) => setCadastroConfirmarSenha(e.target.value)}
    className="w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 pr-14 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
  />

  <button
    type="button"
    onClick={() => setMostrarConfirmarSenhaCadastro(!mostrarConfirmarSenhaCadastro)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-sky-700"
  >
    {mostrarConfirmarSenhaCadastro ? 'Ocultar' : 'Ver'}
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
  onClick={handleCadastroTeste}
  disabled={authLoading}
  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {authLoading ? 'Criando conta...' : 'Criar conta'}
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
  carregando={confirmacaoCarregando}
  aoCancelar={fecharConfirmacao}
  aoConfirmar={confirmarAcao}
/>

{modalAvisoAberto && (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4">
    <div
      className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <div>
          <h2 className={`text-lg font-black ${textStrong}`}>
            {tituloAviso}
          </h2>

          <p className={`mt-1 text-sm ${textMuted}`}>
            {mensagemAviso}
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setModalAvisoAberto(false)}
          className="rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wide shadow-md transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
          style={estiloTemaPrimario}
        >
          Entendi
        </button>
      </div>
    </div>
  </div>
)}

{modalUsuarios && (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4">
    <div
      className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl ${
        darkMode
          ? 'bg-slate-800 border-slate-700'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl font-black ${textStrong}`}>
            Usuários e Permissões
          </h2>

          <p className={`mt-1 text-sm ${textMuted}`}>
            Cadastre usuários para acessar esta empresa e defina o nível de permissão.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalUsuarios(false)}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
  <input
    type="text"
    value={usuarioNome}
    onChange={(e) => setUsuarioNome(e.target.value)}
    placeholder="Nome do usuário"
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
    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
  />

  <input
    type="password"
    value={usuarioSenha}
    onChange={(e) => setUsuarioSenha(e.target.value)}
    placeholder="Senha inicial"
    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
  />

  <select
    value={usuarioPerfil}
    onChange={(e) =>
      setUsuarioPerfil(
        e.target.value as 'administrador' | 'operador_completo' | 'operador_simples'
      )
    }
    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none transition ${
      darkMode
        ? 'bg-slate-900 border-slate-600 text-white'
        : 'bg-white border-slate-300 text-slate-700'
    }`}
  >
    <option value="operador_simples">Operador Simples</option>
    <option value="operador_completo">Operador Completo</option>
    <option value="administrador">Administrador</option>
  </select>
</div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={adicionarUsuarioEmpresa}
          className="rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wide shadow-md transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
          style={estiloTemaPrimario}
        >
          Criar acesso
        </button>
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
  {usuarioEditandoId === usuario.id ? (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="text"
          value={editUsuarioNome}
          onChange={(e) => setEditUsuarioNome(e.target.value)}
          placeholder="Nome"
          className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
            darkMode
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        />

        <input
          type="email"
          value={editUsuarioEmail}
          onChange={(e) => setEditUsuarioEmail(e.target.value)}
          placeholder="Email"
          disabled={usuario.status === 'ativo'}
          className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
            darkMode
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        />

        <select
          value={editUsuarioPerfil}
          onChange={(e) =>
            setEditUsuarioPerfil(
              e.target.value as 'administrador' | 'operador_completo' | 'operador_simples'
            )
          }
          className={`w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${
            darkMode
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-white border-slate-300 text-slate-700'
          }`}
        >
          <option value="operador_simples">Operador Simples</option>
          <option value="operador_completo">Operador Completo</option>
          <option value="administrador">Administrador</option>
        </select>
      </div>

      {usuario.status === 'ativo' && (
        <p className={`text-[11px] font-semibold ${textMuted}`}>
          O email de usuários ativos não é alterado aqui. Para trocar o login, crie um novo acesso.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
  <div className="relative">
    <input
      type={mostrarEditUsuarioNovaSenha ? 'text' : 'password'}
      value={editUsuarioNovaSenha}
      onChange={(e) => setEditUsuarioNovaSenha(e.target.value)}
      placeholder="Nova senha"
      className={`w-full rounded-xl border px-3 py-2 pr-16 text-sm font-semibold outline-none ${
        darkMode
          ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-400'
          : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
      }`}
    />

    <button
      type="button"
      onClick={() => setMostrarEditUsuarioNovaSenha(!mostrarEditUsuarioNovaSenha)}
      className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black transition cursor-pointer ${
        darkMode
          ? 'text-slate-300 hover:text-white'
          : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {mostrarEditUsuarioNovaSenha ? 'Ocultar' : 'Ver'}
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
 
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cancelarEdicaoUsuario}
          className={`rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase transition cursor-pointer ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={salvarEdicaoUsuario}
          className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-[11px] font-black uppercase text-emerald-600 transition hover:bg-emerald-500/10 cursor-pointer"
        >
          Salvar
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-sm font-black ${textStrong}`}>
          {usuario.nome || 'Sem nome'}
        </p>

        <p className={`text-xs font-semibold ${textMuted}`}>
  Login: {usuario.login || usuario.email}
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

      {usuario.perfil !== 'gestor_master' && (
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
  )}
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
<header
  className={`print-ocultar ${bgCard} sticky top-0 z-[900] shadow-sm border-b px-8 pt-1 pb-4 flex items-center gap-8 relative overflow-hidden`}
  style={{
    borderBottomColor: darkMode ? '#334155' : 'transparent',
    borderBottomWidth: '1px',
  }}
>
  {/* LOGO */}
  <div
    className="w-64 h-24 flex items-center justify-center overflow-hidden relative cursor-pointer shrink-0"
    onClick={() => {
      setAbaAtiva('Dashboard');
      setMesAtivo(null);
    }}
    style={
      !logoUrl
        ? {
            border: `2px dashed ${darkMode ? '#475569' : '#cbd5e1'}`,
            borderRadius: '0.5rem',
          }
        : {}
    }
  >
    {logoUrl ? (
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
    ) : (
      <span className="px-3 text-center leading-snug text-slate-500">
        <span className="block text-[11px] font-semibold">
          Acesse os Ajustes e adicione sua
        </span>
        <span className="mt-1 block text-base font-black tracking-wide">
          LOGOMARCA
        </span>
      </span>
    )}
  </div>

  {/* ÁREA DIREITA DO HEADER */}
  <div className="flex-1 flex flex-col gap-5 min-w-0">
    {/* LINHA 1: MENU */}
    <div className="flex items-center justify-start gap-6">
      <nav className="flex space-x-2">
        <button
          onClick={() => {
            setAbaAtiva('Dashboard');
            setMesAtivo(null);
          }}
          className="flex items-center gap-2 font-bold py-2 px-4 rounded-full transition-all text-xs uppercase tracking-wide border-2 cursor-pointer shadow-md hover:brightness-110 active:scale-[0.98]"
          style={estiloTemaPrimarioGradiente}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>

          <span>Início</span>
        </button>

        {['Balanço Geral', 'Gráficos', 'Por Categoria', 'Relatório'].map((item) => (
          <button
            key={item}
            onClick={() => {
              setAbaAtiva(item);
              setMesAtivo(null);
            }}
            className={`font-bold py-2.5 px-6 rounded-full transition-all text-sm uppercase tracking-wide border-2 cursor-pointer ${
              abaAtiva === item
                ? 'shadow-md transform scale-105'
                : darkMode
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 shadow'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow hover:shadow-md'
            }`}
            style={{
              backgroundColor: abaAtiva === item ? corPrimaria : '',
              borderColor: abaAtiva === item ? corPrimaria : '',
              color: abaAtiva === item ? textoSobreCorPrimaria : '',
            }}
            onMouseOver={(e) => {
              if (abaAtiva !== item) e.currentTarget.style.borderColor = corPrimaria;
            }}
            onMouseOut={(e) => {
              if (abaAtiva !== item) {
                e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0';
              }
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="flex items-center space-x-2 relative">
        <button
          type="button"
          onClick={() => setCalcAberta(!calcAberta)}
          className={`p-2 rounded-lg transition-colors border shadow-sm cursor-pointer ${
            darkMode
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
          title="Calculadora"
        >
          <svg
            className="w-5 h-5"
            style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
  onClick={confirmarLogout}
  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm transition-colors cursor-pointer ${
    darkMode
      ? 'bg-red-950/30 border-red-800/50 text-red-300 hover:bg-red-900/50'
      : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
  }`}
>
  Sair
</button>

        {/* SELETOR DE ANO */}
        <div className="flex flex-col items-center border-l border-slate-200/20 pl-3 pr-2 -ml-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>
            Ano
          </span>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="bg-transparent font-black text-sm outline-none cursor-pointer text-center"
            style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
          >
            {Array.from(
              { length: new Date().getFullYear() + 5 - 2024 + 1 },
              (_, i) => (2024 + i).toString()
            ).map((ano) => (
              <option key={ano} value={ano} className="text-slate-800 bg-white">
                {ano}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setAjustesAberto(!ajustesAberto)}
          className="group relative flex items-center gap-2 rounded-full px-3 py-1.5 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer"
          style={estiloTemaPrimarioGradiente}
          title="Abrir ajustes"
        >
          <span
            className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              backgroundColor: corEhClara(corPrimaria)
                ? 'rgba(15, 23, 42, 0.08)'
                : 'rgba(255, 255, 255, 0.10)',
            }}
          />

          <span className="relative flex h-5 w-5 items-center justify-center">
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-500 ${
                ajustesAberto ? 'rotate-90' : 'rotate-0'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                d="M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066 1.724 1.724 0 012.451 2.451 1.724 1.724 0 001.066 2.573 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573 1.724 1.724 0 01-2.451 2.451 1.724 1.724 0 00-2.573 1.066 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066 1.724 1.724 0 01-2.451-2.451 1.724 1.724 0 00-1.066-2.573 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573 1.724 1.724 0 012.451-2.451 1.724 1.724 0 002.573-1.066z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z"
              />
            </svg>
          </span>

          <span
            className="relative h-4 w-px"
            style={{
              backgroundColor: corEhClara(corPrimaria)
                ? 'rgba(15, 23, 42, 0.30)'
                : 'rgba(255, 255, 255, 0.25)',
            }}
          />

          <span className="relative text-xs font-bold leading-none">
            Ajustes
          </span>

          <svg
            className={`relative h-3 w-3 transition-transform duration-300 ${
              ajustesAberto ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.7"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>

    {/* TEXTO DENTRO DA FAIXA INFERIOR */}
<div
  className="absolute bottom-0 left-0 right-0 h-5 pl-8 pr-4 flex items-center justify-between text-xs font-semibold z-10"
  style={{
    backgroundColor: corPrimaria,
    color: textoSobreCorPrimaria,
  }}
>
  <div className="flex items-center gap-2 min-w-0 ml-[130px]">
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

  <div className="hidden xl:flex items-center justify-end gap-4 min-w-0 mr-36">
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="font-black uppercase tracking-wide opacity-80">
        Usuário:
      </span>

      <span className="truncate max-w-[360px]">
        {emailUsuarioAtual || 'Usuário logado'}
      </span>
    </div>

    <span
      className="h-4 w-px"
      style={{
        backgroundColor: corEhClara(corPrimaria)
          ? 'rgba(15, 23, 42, 0.35)'
          : 'rgba(255, 255, 255, 0.35)',
      }}
    />

    <div className="flex items-center gap-1.5 shrink-0">
      <span className="font-black uppercase tracking-wide opacity-80">
        Perfil:
      </span>

      <span>
        {perfilUsuario === 'gestor_master'
          ? 'Gestor Master'
          : perfilUsuario === 'administrador'
            ? 'Administrador'
            : perfilUsuario === 'operador_completo'
              ? 'Operador Completo'
              : perfilUsuario === 'operador_simples'
                ? 'Operador Simples'
                : 'Não definido'}
      </span>
    </div>
  </div>
</div>

  </div>
</header>

      {/* ================= MENU DE AJUSTES GERAL ================= */}
{ajustesAberto && (
  <div
    className="print-ocultar fixed left-0 right-0 top-[116px] z-[1200] bg-slate-900 text-white p-4 shadow-xl border-t border-slate-700 transition-all"
    style={{ borderTopColor: corPrimaria, borderTopWidth: '2px' }}
  >
    {statusConfig !== 'idle' && (
      <div
        className={`mb-3 mx-auto max-w-7xl rounded-full px-3 py-1.5 text-center text-xs font-bold ${
          statusConfig === 'saving'
            ? 'bg-sky-50 text-sky-700'
            : statusConfig === 'saved'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
        }`}
      >
        {statusConfig === 'saving' && 'Salvando configurações...'}
        {statusConfig === 'saved' && 'Configurações salvas'}
        {statusConfig === 'error' && 'Erro ao salvar configurações'}
      </div>
    )}

    {/* Adicionado overflow-x-auto e removido flex-wrap para forçar 1 linha */}
    <div className="flex justify-between items-center max-w-7xl mx-auto gap-4 overflow-x-auto custom-scroll pb-1">
      
      {/* GRUPO DA ESQUERDA (Botões menores: text-xs, py-1.5) */}
      <div className="flex items-center gap-3">
        <button
  onClick={() => setModalDespesasBase(true)}
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
  onClick={() => setModalInstrucoes(true)}
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

  setModalLogo(true);
}} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Adicionar Logo</button>
        
        <div className="whitespace-nowrap relative overflow-hidden bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: corPrimaria }}></span> Cor Tema
          <input
  type="color"
  value={corPrimaria}
  onChange={(e) => {
    if (!podeAcessarAjustes) {
      abrirAviso(
        'Acesso não permitido',
        'Você não tem permissão para alterar a cor tema da empresa.'
      );
      return;
    }

    setCorPrimaria(e.target.value);
  }}
  className={`absolute inset-0 w-full h-full opacity-0 ${
    podeAcessarAjustes ? 'cursor-pointer' : 'cursor-not-allowed'
  }`}
/>
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
    onClick={() => setModalUsuarios(true)}
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

  gerarBackupExcel();
}} 
                className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded shadow border border-emerald-700 transition-colors font-bold flex items-center gap-1.5 text-xs text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO CONDICIONAL DAS TELAS */}
      {mesAtivo ? (
        <>
          <div
  className="print-ocultar shadow-md px-8 py-3 text-white z-0"
  style={{ backgroundColor: corPrimaria }}
>
  <div className="max-w-6xl mx-auto w-full grid grid-cols-[1fr_auto_1fr] items-center gap-6">

    {/* ESQUERDA VAZIA PARA EQUILIBRAR O CENTRO */}
    <div />

    {/* CENTRO: MÊS COM SETAS */}
    <div className="flex items-center justify-center gap-4">
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
        className="rounded-lg bg-black/10 px-3 py-2 font-bold transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>

      <h2 className="min-w-[220px] text-center text-xl font-black uppercase tracking-wider">
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
        className="rounded-lg bg-black/10 px-3 py-2 font-bold transition hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>

    {/* DIREITA: RESUMOS ALINHADOS AO LIMITE DO CONTEÚDO */}
<div className="flex justify-end items-center gap-3">
  <div className="rounded-lg bg-white px-4 py-2 text-right shadow-sm border border-white/20">
    <span className="block text-[10px] font-bold uppercase text-slate-500">
      Total Despesas
    </span>
    <span className="block text-sm font-black text-red-500">
      {formatarMoeda(totalDespesasMes)}
    </span>
  </div>

  <div className="rounded-lg bg-white px-4 py-2 text-right shadow-sm border border-white/20">
    <span className="block text-[10px] font-bold uppercase text-slate-500">
      Saldo do Mês
    </span>
    <span
      className={`block text-sm font-black ${
        lucroOperacional >= 0 ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {formatarMoeda(lucroOperacional)}
    </span>
  </div>
</div>
  </div>
</div>

          <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
            <div
  className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6`}
  style={{ borderTopColor: corPrimaria }}
>
   <div
    className="relative custom-scroll"
  style={{
    height: `${alturaFinalTabelaLancamentos + 130 + ESPACO_PUXADOR_TABELA}px`,
    minHeight: `${ALTURA_PADRAO_TABELA + 130 + ESPACO_PUXADOR_TABELA}px`,
    maxHeight: `${alturaMaximaTabelaLancamentos + 130 + ESPACO_PUXADOR_TABELA}px`,
    overflow: 'hidden',
  }}
>
  <table className="w-full text-left border-collapse">
    <thead className={darkMode ? 'bg-slate-700' : 'bg-slate-100'}>
  <tr>
    <th colSpan={5} className="p-3">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={() =>
            setOrdemLancamentos((prev) => (prev === 'desc' ? 'asc' : 'desc'))
          }
          className={`absolute left-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide border shadow-sm transition-all hover:scale-[1.03] active:scale-95 cursor-pointer ${
            darkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={
            ordemLancamentos === 'desc'
              ? 'Clique para ordenar do menor dia para o maior'
              : 'Clique para ordenar do maior dia para o menor'
          }
        >
          <span>Mudar ordem</span>
          <span className="text-xs font-black">
            {ordemLancamentos === 'desc' ? '↓' : '↑'}
          </span>
        </button>

        <span
          className={`text-sm font-black uppercase tracking-widest ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          PREENCHA OS CAMPOS PARA LANÇAR UMA DESPESA
        </span>
      </div>
    </th>
  </tr>
</thead>

    <tbody>
      <tr className={`${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/80 border-slate-200'} border-b-2`}>
        <td className="p-3">
          <input
            type="number"
            min="1"
            max={getMaxDias(mesAtivo, anoSelecionado)}
            value={formDia}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val > getMaxDias(mesAtivo, anoSelecionado)) setFormDia(getMaxDias(mesAtivo, anoSelecionado).toString());
              else setFormDia(e.target.value);
            }}
            placeholder="Dia"
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 text-center font-bold shadow-sm ${
              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-700'
            }`}
            style={{ outlineColor: corPrimaria }}
          />
        </td>

        <td className="p-3">
          <select
  value={formDespesa}
  onChange={(e) => setFormDespesa(e.target.value)}
  className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 font-semibold shadow-sm ${
    darkMode
      ? 'bg-slate-700 border-slate-600'
      : 'bg-white border-slate-300'
  }`}
  style={{
    outlineColor: corPrimaria,
    color: formDespesa
      ? darkMode ? '#ffffff' : '#334155'
      : darkMode ? '#cbd5e1' : '#94a3b8',
  }}
>
  <option value="" className="text-slate-400">
    Selecione a despesa
  </option>

  {despesasCadastradas.map((d) => (
    <option key={d.nome} value={d.nome} className="text-slate-800">
      {d.nome}
    </option>
  ))}
</select>
        </td>

        <td className="p-3">
          <input
            type="text"
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
            onBlur={() => setFormDescricao(formatarDescricao(formDescricao))}
            placeholder="Descrição..."
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 shadow-sm ${
              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300'
            }`}
            style={{ outlineColor: corPrimaria }}
          />
        </td>

        <td className="p-3">
          <input
            type="text"
            value={formValor}
            onChange={handleValorChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                adicionarDespesa();
              }
            }}
            placeholder="R$ 0,00"
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-1 text-right font-bold shadow-sm ${
              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
            }`}
            style={{ outlineColor: corPrimaria }}
          />
        </td>

        <td className="p-3 text-center">
          <button
  onClick={adicionarDespesa}
  style={estiloTemaPrimario}
  className="px-4 py-2.5 rounded-lg font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
>
  Adicionar
</button>
        </td>
      </tr>
    </tbody>
  </table>

  <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200/20">
  <div className="flex-1">
   <div className="relative">
  <svg
    className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
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
    value={buscaLancamento}
    onChange={(e) => setBuscaLancamento(e.target.value)}
    placeholder="Buscar lançamento do mês por despesa, descrição, dia ou valor..."
    className={`w-full rounded-xl border py-2.5 pl-11 pr-11 text-sm font-semibold outline-none transition focus:ring-2 ${
      darkMode
        ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400'
        : 'bg-white border-slate-300 text-slate-700 placeholder:text-slate-400'
    }`}
    style={{
      borderColor: buscaLancamento ? corPrimaria : undefined,
      boxShadow: buscaLancamento ? `0 0 0 2px ${corPrimaria}22` : undefined,
    }}
  />

  {buscaLancamento && (
    <button
      type="button"
      onClick={() => setBuscaLancamento('')}
      className={`absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-xs font-black transition cursor-pointer ${
        darkMode
          ? 'text-slate-300 hover:bg-slate-600 hover:text-white'
          : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
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
  <div className={`px-4 py-2 text-xs font-bold ${
    lancamentosFiltradosDoMes.length > 0
      ? darkMode ? 'text-emerald-300' : 'text-emerald-700'
      : darkMode ? 'text-red-300' : 'text-red-600'
  }`}>
    {lancamentosFiltradosDoMes.length > 0
      ? `${lancamentosFiltradosDoMes.length} lançamento(s) localizado(s).`
      : 'Nenhum lançamento localizado com esse argumento.'}
  </div>
)}

  <div
    className="overflow-y-auto overflow-x-auto custom-scroll"
    style={{
      height: `${alturaFinalTabelaLancamentos}px`,
      maxHeight: `${alturaMaximaTabelaLancamentos}px`,
    }}
  >
    <table className="w-full text-left border-collapse">
      <tbody>
        {lancamentosFiltradosDoMes.length > 0 ? (
  lancamentosFiltradosDoMes.map((lanc) => (
            <tr
  key={lanc.id}
  className={`border-b border-dotted transition-colors ${
    buscaLancamento.trim()
      ? darkMode
        ? 'bg-sky-900/30 border-sky-700/50'
        : 'bg-sky-50 border-sky-200'
      : darkMode
        ? 'border-slate-600/40 hover:bg-slate-700/30'
        : 'border-slate-300/60 hover:bg-slate-50'
  }`}
>
  {lancamentoEditandoId === lanc.id ? (
    <>
      <td className="py-1.5 px-4 w-24 text-center">
        <input
          type="number"
          min={1}
          max={getMaxDias(mesAtivo, anoSelecionado)}
          value={editDia}
          onChange={(e) => setEditDia(e.target.value)}
          className={`w-full p-2 border rounded-lg text-center font-bold ${
            darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
          }`}
        />
      </td>

      <td className="py-1.5 px-4 w-1/4">
        <select
  value={editDespesa}
  onChange={(e) => setEditDespesa(e.target.value)}
  className={`w-full p-2 border rounded-lg font-bold ${
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

      <td className="py-1.5 px-4 w-1/3">
        <input
          type="text"
          value={editDescricao}
          onChange={(e) => setEditDescricao(e.target.value)}
          className={`w-full p-2 border rounded-lg ${
            darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
          }`}
          placeholder="Descrição..."
        />
      </td>

      <td className="py-1.5 px-4 w-40">
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
          className={`w-full p-2 border rounded-lg text-right font-bold ${
            darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-300 text-slate-800'
          }`}
          placeholder="R$ 0,00"
        />
      </td>

      <td className="py-1.5 px-4 w-28 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={salvarEdicaoLancamento}
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
      <td className={`py-1.5 px-4 w-24 text-center font-bold text-sm ${textStrong}`}>
        {lanc.dia.toString().padStart(2, '0')}
      </td>

      <td className={`py-1.5 px-4 w-1/4 font-bold text-sm ${textStrong}`}>
        {lanc.despesa}
      </td>

      <td className={`py-1.5 px-4 w-1/3 text-xs ${textMuted}`}>
        {lanc.descricao || '-'}
      </td>

      <td className="py-1.5 px-4 w-40 text-right font-black text-sm text-red-500">
        - {formatarMoeda(lanc.valor)}
      </td>

      <td className="py-1.5 px-4 w-28 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => iniciarEdicaoLancamento(lanc)}
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
            onClick={() => {
  if (!podeExcluirLancamentos) {
    abrirAviso(
  'Acesso não permitido',
  'Você não tem permissão para excluir lançamentos.'
);
    return;
  }

  abrirConfirmacao({
    titulo: "Excluir lançamento",
    mensagem: `Deseja excluir este lançamento?\n\n${lanc.despesa} - ${formatarMoeda(Number(lanc.valor))}\n\nEssa ação não poderá ser desfeita.`,
    acao: () => apagarDespesa(lanc.id),
  });
}}
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
          ))
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
  </div>

  <div
  className="flex items-center justify-center"
  style={{ height: `${ESPACO_PUXADOR_TABELA}px` }}
>
  {quantidadeLancamentosMes > 10 && (
    <div
      title="Arraste para aumentar ou reduzir a área de lançamentos"
      className="flex h-5 w-28 cursor-row-resize items-center justify-center rounded-full border border-slate-400 bg-white shadow-md transition hover:bg-slate-100"
      onPointerDown={(e) => {
        e.preventDefault();

        const inicioY = e.clientY;
        const alturaInicial = alturaTabelaLancamentos;

        const aoMover = (event: PointerEvent) => {
          const diferenca = event.clientY - inicioY;

          const novaAltura = Math.min(
            Math.max(alturaInicial + diferenca, ALTURA_PADRAO_TABELA),
            alturaMaximaTabelaLancamentos
          );

          setAlturaTabelaLancamentos(novaAltura);
        };

        const aoSoltar = () => {
          window.removeEventListener('pointermove', aoMover);
          window.removeEventListener('pointerup', aoSoltar);
        };

        window.addEventListener('pointermove', aoMover);
        window.addEventListener('pointerup', aoSoltar);
      }}
    >
      <span className="h-1 w-16 rounded-full bg-slate-500" />
    </div>
  )}
</div>
</div>

<div className="flex justify-between items-center mt-8 mb-4 print-ocultar">
  <div className="flex items-center">
    <span
      className="w-3 h-8 rounded-full mr-4 shadow-sm"
      style={{ backgroundColor: corPrimaria }}
    ></span>

    <h2 className={`text-2xl font-black ${textStrong} uppercase tracking-wider`}>
  TOTAIS DE {mesAtivo}
</h2>
  </div>
</div>

            <div className="grid grid-cols-2 gap-6">
  <div
    className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-4 flex flex-col`}
    style={{ borderTopColor: corPrimaria }}
  >
    <h3
      className={`text-base font-black ${textStrong} border-b border-slate-200/10 pb-2 mb-3 uppercase tracking-wider text-center`}
    >
      Total por Tipo de Despesa
    </h3>

    <div className="space-y-1.5 w-full">
      {analiseDespesas.dados.map((item) => (
        <div
          key={item.nome}
          className={`py-2 border-b border-dotted ${
            darkMode ? 'border-slate-600/40' : 'border-slate-300/60'
          }`}
        >
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: item.cor }}
              ></span>

              <span className={`text-xs font-bold uppercase truncate max-w-[180px] ${textStrong}`}>
                {item.nome}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <span
                className="text-xs font-black w-12 text-right"
                style={{ color: corPrimaria }}
              >
                {item.percentual.toFixed(1)}%
              </span>

              <span className="text-xs font-black text-red-500 w-24 text-right">
                {formatarMoeda(item.valor)}
              </span>
            </div>
          </div>
        </div>
      ))}

      {analiseDespesas.dados.length === 0 && (
        <span className={textMuted}>Sem dados.</span>
      )}
    </div>
  </div>

  <div
    className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-5 flex flex-col`}
    style={{ borderTopColor: corPrimaria }}
  >
    <h3
      className={`text-center text-base font-black uppercase tracking-wider ${textStrong} border-b border-slate-200/10 pb-2 mb-3`}
    >
      Composição de Gastos
    </h3>

    {lancamentosDoMes.length > 0 ? (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div
            className="w-56 h-56 rounded-full shadow-inner transform transition-transform hover:scale-105"
            style={{ background: analiseDespesas.gradiente }}
          ></div>

          <div
            className={`absolute w-32 h-32 ${bgCard} rounded-full shadow-xl flex flex-col items-center justify-center`}
          >
            <span className={`text-[12px] font-bold uppercase ${textMuted}`}>
              Total
            </span>

            <span className={`text-xs font-black ${textStrong}`}>
              {formatarMoeda(totalDespesasMes)}
            </span>
          </div>
        </div>

        <div className="w-full mt-4 space-y-2">
          {analiseDespesas.dados.slice(0, 5).map((item) => (
            <div
              key={item.nome}
              className={`flex items-center justify-between gap-3 py-1.5 border-b border-dotted ${
                darkMode ? 'border-slate-600/40' : 'border-slate-300/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.cor }}
                ></span>

                <span className={`text-[11px] font-bold uppercase truncate ${textStrong}`}>
                  {item.nome}
                </span>
              </div>

              <span className="text-[11px] font-black text-red-500 flex-shrink-0">
                {formatarMoeda(item.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="flex-1 flex items-center justify-center">
        <span className={textMuted}>Sem dados para exibir.</span>
      </div>
    )}
  </div>
</div>
          </main>
        </>
      ) : abaAtiva === 'Balanço Geral' ? (
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
/>
      ) : abaAtiva === 'Gráficos' ? (
        <Graficos
          meses={meses} lancamentos={lancamentos} faturamentos={faturamentos} 
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
        />
      ) : abaAtiva === 'Por Categoria' ? (
        <PorCategoria 
          meses={meses} lancamentos={lancamentos} despesasCadastradas={despesasCadastradas} 
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
        />
      ) : abaAtiva === 'Relatório' ? (
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
      ) : (
        <Dashboard 
          meses={meses} setMesAtivo={setMesAtivo} bgCard={bgCard} corPrimaria={corPrimaria} textStrong={textStrong} textMuted={textMuted} darkMode={darkMode} mesResumoDash={mesResumoDash} setMesResumoDash={setMesResumoDash} totalDespesasMes={totalDespesasMes} maiorGasto={maiorGasto} lucroOperacional={lucroOperacional} mesFaturamento={mesFaturamento} setMesFaturamento={setMesFaturamento} inputFaturamento={inputFaturamento} setInputFaturamento={setInputFaturamento} salvarFaturamento={salvarFaturamento} receitasTotais={receitasTotais} despesasTotais={despesasTotais} lucroTotalAnual={lucroTotalAnual} formatarMoeda={formatarMoeda}
        />
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

<footer
  className={`w-full border-t px-6 py-4 mt-8 ${
    darkMode
      ? 'border-slate-700 bg-slate-900 text-slate-400'
      : 'border-slate-200 bg-white text-slate-500'
  }`}
>
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
    
    <div className="flex items-center gap-2 font-bold">
      <span className="text-sm tracking-wide">
        <span style={{ color: '#003E73' }}>AVANTA</span>
        <span style={{ color: '#00A6C8' }}>LAB</span>
      </span>
      <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
        © {new Date().getFullYear()} Todos os direitos reservados.
      </span>
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