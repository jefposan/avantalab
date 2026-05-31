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
  const [acessoNaoConfigurado, setAcessoNaoConfigurado] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
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

  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const corEhClara = (hex: string) => {
  const cor = hex.replace('#', '');

  if (cor.length !== 6) return false;

  const r = parseInt(cor.substring(0, 2), 16);
  const g = parseInt(cor.substring(2, 4), 16);
  const b = parseInt(cor.substring(4, 6), 16);

  const brilho = (r * 299 + g * 587 + b * 114) / 1000;

  return brilho > 180;
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

useEffect(() => {
  const verificarTela = () => {
    setIsTelaMobile(window.innerWidth < 1024);
  };

  verificarTela();

  window.addEventListener('resize', verificarTela);

  return () => {
    window.removeEventListener('resize', verificarTela);
  };
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
      }, 10000); // <-- 10000 milissegundos = 10 segundos. Altere este valor como preferir!

      // Limpa o cronômetro se o utilizador fechar o menu manualmente antes do tempo
      return () => clearTimeout(tempo);
    }
  }, [ajustesAberto]);

  // --- CÁLCULOS E FUNÇÕES ---
  const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  const formatarDescricao = (texto: string) => {
  const textoLimpo = texto.trim().toLowerCase();

  if (!textoLimpo) return '';

  return textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
};

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
  const maiorGasto = lancamentosDoMes.length > 0 ? lancamentosDoMes.reduce((prev, curr) => (curr.valor > prev.valor ? curr : prev), { despesa: '', valor: 0 }) : { despesa: 'Nenhuma despesa', valor: 0 };
  const receitasTotais = Object.values(faturamentos).reduce((a, b) => a + b, 0);
  const despesasTotais = lancamentos.reduce((a, b) => a + b.valor, 0);
  const lucroTotalAnual = receitasTotais - despesasTotais;

  const salvarFaturamento = async () => {
  if (!empresaId) {
    alert("Empresa não carregada. Tente atualizar a página.");
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
      alert("Erro ao salvar faturamento no banco.");
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

const getMaxDias = (mes: string | null) => {
  if (!mes) return 31;

  if (['ABRIL', 'JUNHO', 'SETEMBRO', 'NOVEMBRO'].includes(mes)) {
    return 30;
  }

  if (mes === 'FEVEREIRO') {
    return parseInt(anoSelecionado) % 4 === 0 ? 29 : 28;
  }

  return 31;
};

const adicionarDespesaBase = async () => {
  const nomeLimpo = novaBaseNome.trim();

  if (!nomeLimpo || !novaBaseCat) {
    alert('Preencha o Nome e a Categoria!');
    return;
  }

  if (!empresaId) {
    alert('Empresa não carregada. Saia e entre novamente no sistema.');
    return;
  }

  const jaExiste = despesasCadastradas.some(
    (d) => d.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
  );

  if (jaExiste) {
    alert('Esta despesa já está cadastrada.');
    return;
  }

  const despesaSalva = await salvarDespesaCadastrada(
    empresaId,
    nomeLimpo,
    novaBaseCat
  );

  if (!despesaSalva) {
    alert('Não foi possível salvar a despesa no banco. Tente novamente.');
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
  if (!empresaId) {
    alert('Empresa não carregada. Atualize a página e tente novamente.');
    return;
  }

  const apagou = await apagarDespesaCadastrada(empresaId, nome);

  if (!apagou) {
    alert('Não foi possível apagar a despesa cadastrada no banco.');
    return;
  }

  setDespesasCadastradas((prev) => prev.filter((d) => d.nome !== nome));
};

const adicionarDespesa = async () => {
  if (!empresaId) {
    alert("Empresa não carregada. Tente atualizar a página.");
    return;
  }

  if (!mesAtivo) {
    alert("Selecione um mês antes de lançar a despesa.");
    return;
  }

  if (!formDia || !formDespesa || valorNumericoRaw <= 0) {
    alert("Preencha Dia, Despesa e Valor!");
    return;
  }

  if (duplicadosAtivo) {
    const existeIgual = lancamentosDoMes.some(
      (l) => l.despesa === formDespesa && l.valor === valorNumericoRaw
    );

    if (
      existeIgual &&
      !window.confirm("Aviso: Valor e despesa duplicados. Deseja adicionar mesmo assim?")
    ) {
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
    alert(`Erro ao salvar lançamento: ${salvo.mensagem}`);
  }
};

const apagarDespesa = async (id: string) => {
  const apagou = await apagarLancamento(id);

  if (apagou) {
    setLancamentos((prev) => prev.filter((l) => l.id !== id));
  } else {
    alert("Erro ao apagar lançamento no banco.");
  }
};

const iniciarEdicaoLancamento = (lanc: any) => {
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
    alert('Empresa não carregada. Tente atualizar a página.');
    return;
  }

  if (!mesAtivo) {
    alert('Selecione um mês antes de editar o lançamento.');
    return;
  }

  if (!lancamentoEditandoId || !editDia || !editDespesa || editValorNumerico <= 0) {
    alert('Preencha Dia, Despesa e Valor.');
    return;
  }

  const diaNumerico = parseInt(editDia, 10);
  const maxDias = getMaxDias(mesAtivo);

  if (Number.isNaN(diaNumerico) || diaNumerico < 1 || diaNumerico > maxDias) {
    alert(`Informe um dia válido entre 1 e ${maxDias}.`);
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
    alert(`Erro ao atualizar lançamento: ${salvo.mensagem}`);
  }
};

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (!empresaId) {
    alert("Empresa não carregada. Atualize a página e tente novamente.");
    return;
  }

  const reader = new FileReader();

  reader.onloadend = async () => {
    const novaLogoUrl = reader.result as string;

    setLogoUrl(novaLogoUrl);

    const salvo = await salvarConfiguracoesBanco({
      empresaId,
      corPrimaria,
      darkMode,
      duplicadosAtivo,
      logoUrl: novaLogoUrl,
      logoSettings,
    });

    if (!salvo) {
      alert("Erro ao salvar o logo no banco.");
      return;
    }

    setModalLogo(false);
  };

  reader.readAsDataURL(file);
};

  // ================= FUNÇÃO DE BACKUP EXCEL =================
  const gerarBackupExcel = async () => {
  if (!empresaId) {
    alert('Empresa não carregada. Faça login novamente e tente gerar o backup.');
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
    alert(`Erro ao buscar lançamentos para backup: ${erroLancamentos.message}`);
    return;
  }

  const { data: faturamentosBanco, error: erroFaturamentos } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ano', { ascending: true });

  if (erroFaturamentos) {
    console.error('Erro ao buscar faturamentos para backup:', erroFaturamentos);
    alert(`Erro ao buscar faturamentos para backup: ${erroFaturamentos.message}`);
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
    alert('Nenhum dado encontrado no Supabase para gerar backup.');
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
          despesasCadastradas.find((d) => d.nome === l.despesa_nome)?.categoria ||
          'Outros';

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
    const totais: Record<string, number> = {}; 
    lancamentosDoMes.forEach(l => { totais[l.despesa] = (totais[l.despesa] || 0) + l.valor; }); 
    const cores = [corPrimaria, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']; 
    const dadosGrafico = Object.entries(totais).sort((a, b) => b[1] - a[1]).map(([nome, valor], index) => ({ nome, valor, percentual: totalDespesasMes > 0 ? (valor / totalDespesasMes) * 100 : 0, cor: cores[index % cores.length] })); 
    let anguloAtual = 0; 
    const conicParts = dadosGrafico.map(item => { const inicio = anguloAtual; anguloAtual += item.percentual; return `${item.cor} ${inicio}% ${anguloAtual}%`; }); 
    return { dados: dadosGrafico, gradiente: `conic-gradient(${conicParts.join(', ')})` }; 
  }, [lancamentosDoMes, totalDespesasMes, corPrimaria]);

  const bgMain = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800';
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';

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
    setAuthErro(`Erro Supabase: ${error.message}`);
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

  const emailLimpo = loginEmail.trim().toLowerCase();

  if (!emailLimpo) {
    setAuthErro('Informe seu email.');
    setAuthLoading(false);
    return;
  }

  if (!loginSenha) {
    setAuthErro('Informe sua senha.');
    setAuthLoading(false);
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: emailLimpo,
    password: loginSenha,
  });

  if (error) {
  console.error('Erro login:', error);

  if (error.message === 'Email not confirmed') {
    setAuthErro('Confirme o email recebido para liberar o acesso.');
  } else if (error.message === 'Invalid login credentials') {
    setAuthErro('Email ou senha incorretos. Verifique os dados e tente novamente.');
  } else {
    setAuthErro(`Erro ao entrar: ${error.message}`);
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

const handleLogout = async () => {
  await supabase.auth.signOut();

  setAcessoLiberado(false);
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
    setAuthErro(`Erro Supabase: ${error.message}`);
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

const quantidadeLancamentosMes = lancamentosOrdenados.filter(
  (l) => l.mes === mesAtivo
).length;

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
              setModoAuth('login');
              setAcessoLiberado(false);
              setAuthErro('');
              setAuthMensagem('');
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <svg
              className="h-8 w-8 text-amber-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
            AvantaLab Gestão
          </p>

          <h1 className="text-2xl font-black leading-tight text-slate-900">
            Acesso ainda não configurado
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Sua conta foi autenticada, mas ainda não encontramos um ambiente de trabalho ativo
            para ela. Tente sair e entrar novamente. Se o problema continuar, entre em contato
            com o suporte.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
          >
            Voltar para o login
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
      Email
    </label>

    <input
      type="email"
      placeholder="seuemail@exemplo.com"
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

      {modalInstrucoes && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div
      className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 flex flex-col`}
      style={{ borderColor: corPrimaria }}
    >
      <div
        className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center shadow-md z-10"
        style={estiloTemaPrimario}
      >
        <h2 className="text-lg font-bold uppercase">
          Instruções sobre Categorias
        </h2>

        <button
          onClick={() => setModalInstrucoes(false)}
          className="px-3 py-1 rounded-lg font-bold transition-colors"
          style={{
            color: textoSobreCorPrimaria,
            backgroundColor: corEhClara(corPrimaria)
              ? 'rgba(15, 23, 42, 0.08)'
              : 'rgba(255, 255, 255, 0.16)',
          }}
        >
          X
        </button>
      </div>
            <div className={`p-8 space-y-6 text-sm ${textMuted} leading-relaxed overflow-y-auto`}>
              <div><strong className={textStrong}>AMORTIZAÇÃO:</strong><br/>- Gastos para dividir o custo de coisas que não são físicas...<br/>- Exemplos: softwares comprados, valor pago por patente.</div>
              <div><strong className={textStrong}>CUSTOS VARIÁVEIS:</strong><br/>- Gastos que aumentam ou diminuem conforme a quantidade produzida/vendida.<br/>- Exemplos: embalagens, matéria-prima, frete, comissões.</div>
              <div><strong className={textStrong}>DEPRECIAÇÃO:</strong><br/>- Gastos para dividir o custo de coisas físicas que a empresa usa.<br/>- Exemplos: desgaste de máquinas, veículos.</div>
              <div><strong className={textStrong}>DESPESAS FINANCEIRAS:</strong><br/>- Gastos relacionados a dinheiro e bancos.<br/>- Exemplos: juros, tarifas, variações de câmbio.</div>
              <div><strong className={textStrong}>DESPESAS OPERACIONAIS:</strong><br/>- Gastos para manter a empresa funcionando.<br/>- Exemplos: aluguel, água, luz, salários, manutenção, pro labore, publicidade.</div>
              <div><strong className={textStrong}>IMPOSTOS SOBRE LUCRO:</strong><br/>- Tributos que a empresa paga sobre o dinheiro que ela ganha.<br/>- Exemplos: imposto de renda, CSLL.</div>
              <div className="p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-xl text-yellow-700 dark:text-yellow-400 mt-6">
                <strong>Observações:</strong> Se tiver dúvida sobre onde colocar algum gasto, pergunte ao contador. Estes são exemplos gerais.
              </div>
            </div>
          </div>
        </div>
      )}

      {modalDespesasBase && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    
    {/* MODAL PRINCIPAL */}
    <div
      className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 overflow-hidden`}
      style={{ borderColor: corPrimaria }}
    >
      <div
        className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center z-10"
        style={estiloTemaPrimario}
      >
        <div className="flex w-full items-center justify-between gap-4">
  <h2 className="text-lg font-bold uppercase">
    Gerenciar Despesas
  </h2>

  <div className="flex items-center gap-6 pr-4">
    <button
      type="button"
      onClick={() => setAjudaCategoriasAberta(!ajudaCategoriasAberta)}
      className="group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
      style={{
        borderColor: textoSobreCorPrimaria,
        color: textoSobreCorPrimaria,
        backgroundColor: ajudaCategoriasAberta
          ? corEhClara(corPrimaria)
            ? 'rgba(15, 23, 42, 0.14)'
            : 'rgba(255, 255, 255, 0.22)'
          : corEhClara(corPrimaria)
            ? 'rgba(15, 23, 42, 0.08)'
            : 'rgba(255, 255, 255, 0.14)',
      }}
      title="Entenda as categorias"
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black"
        style={{
          border: `1px solid ${textoSobreCorPrimaria}`,
          color: textoSobreCorPrimaria,
        }}
      >
        ?
      </span>

      <span>Entenda as categorias</span>
    </button>
  </div>
</div>

        <button
          onClick={() => {
            setModalDespesasBase(false);
            setAjudaCategoriasAberta(false);
          }}
          className="px-3 py-1 rounded-lg font-bold transition-colors"
          style={{
            color: textoSobreCorPrimaria,
            backgroundColor: corEhClara(corPrimaria)
              ? 'rgba(15, 23, 42, 0.08)'
              : 'rgba(255, 255, 255, 0.16)',
          }}
        >
          X
        </button>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
        <div
          className={`p-5 rounded-xl border shadow-sm ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h3 className={`font-bold mb-4 ${textStrong}`}>
            Nova Despesa
          </h3>

          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Nome (Ex: Aluguel)"
              value={novaBaseNome}
              onChange={e => setNovaBaseNome(e.target.value)}
              className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${
                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
              }`}
              style={{ outlineColor: corPrimaria }}
            />

            <select
              value={novaBaseCat}
              onChange={e => setNovaBaseCat(e.target.value)}
              className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${
                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
              }`}
              style={{ outlineColor: corPrimaria }}
            >
              <option value="">Categoria (Obrigatória)</option>
              <option value="Amortização">Amortização</option>
              <option value="Custos Variáveis">Custos Variáveis</option>
              <option value="Depreciação">Depreciação</option>
              <option value="Despesas Financeiras">Despesas Financeiras</option>
              <option value="Despesas Operacionais">Despesas Operacionais</option>
              <option value="Imposto sobre Lucro">Imposto sobre Lucro</option>
            </select>

            <button
              onClick={adicionarDespesaBase}
              style={estiloTemaPrimario}
              className="px-6 py-2.5 rounded-lg font-bold hover:brightness-110 w-full sm:w-auto shadow"
            >
              Salvar
            </button>
          </div>
        </div>

        <div className="space-y-2 pr-2">
          {despesasCadastradas.map(d => (
            <div
              key={d.nome}
              className={`flex justify-between items-center p-3 rounded-lg border border-slate-200/10 ${
                darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'
              }`}
            >
              <div>
                <span className={`font-bold ${textStrong}`}>
                  {d.nome}
                </span>

                <span className={`text-xs ml-2 px-2 py-1 rounded-md bg-slate-500/20 ${textMuted}`}>
                  {d.categoria}
                </span>
              </div>

              <button
                onClick={() => apagarDespesaBase(d.nome)}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg font-bold px-3 py-1 text-lg transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* POPUP LATERAL DE AJUDA */}
    {ajudaCategoriasAberta && (
      <div className="ml-4 hidden lg:block w-80 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-slate-900">
            Entenda as categorias
          </h3>

          <button
            type="button"
            onClick={() => setAjudaCategoriasAberta(false)}
            className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
          >
            X
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <strong>Amortização:</strong> pagamentos de dívidas, empréstimos ou parcelamentos.
          </div>

          <div>
            <strong>Custos Variáveis:</strong> despesas que variam conforme vendas ou produção.
          </div>

          <div>
            <strong>Depreciação:</strong> perda de valor de bens ao longo do tempo.
          </div>

          <div>
            <strong>Despesas Financeiras:</strong> juros, taxas bancárias e custos financeiros.
          </div>

          <div>
            <strong>Despesas Operacionais:</strong> gastos do funcionamento diário da empresa.
          </div>

          <div>
            <strong>Imposto sobre Lucro:</strong> tributos calculados sobre o resultado/lucro.
          </div>
        </div>
      </div>
    )}
  </div>
)}

      {modalLogo && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div
      className={`${bgCard} rounded-2xl shadow-2xl max-w-sm w-full border-2 p-6`}
      style={{ borderColor: corPrimaria }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-lg font-bold ${textStrong}`}>Adicionar Logo</h2>
        <button onClick={() => setModalLogo(false)} className={textMuted}>✕</button>
      </div>

      <div className="space-y-4">
        <div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-3 rounded-lg border border-dashed hover:bg-slate-500/10 transition-colors ${textStrong} border-slate-400 font-medium`}
          >
            ⬆ Upload do Computador
          </button>
        </div>

        <div className="text-center text-sm font-bold text-slate-400">OU</div>

        <div>
          <label className={`block text-xs font-bold mb-1 ${textMuted} uppercase`}>
            URL da Imagem
          </label>
          <input
            type="text"
            placeholder="https://..."
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            className={`w-full p-2.5 rounded-lg border focus:outline-none focus:ring-1 ${
              darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
            }`}
            style={{ outlineColor: corPrimaria }}
          />
        </div>

        <button
          onClick={() => setModalLogo(false)}
          style={estiloTemaPrimario}
          className="w-full py-2.5 rounded-lg font-bold hover:brightness-110 mt-2 shadow-md"
        >
          Salvar Logo
        </button>
      </div>
    </div>
  </div>
)}

      {calcAberta && (
        <Calculadora onClose={() => setCalcAberta(false)} corPrimaria={corPrimaria} darkMode={darkMode} />
      )}

      {/* ================= HEADER GLOBAL ================= */}
      <header className={`print-ocultar ${bgCard} shadow-sm border-b px-8 py-4 flex justify-between items-center z-30 relative`} style={{ borderBottomColor: darkMode ? '' : corPrimaria, borderBottomWidth: darkMode ? '1px' : '10px' }}>
        
        <div className="w-56 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => {setAbaAtiva('Dashboard'); setMesAtivo(null);}} style={!logoUrl ? { border: `2px dashed ${darkMode ? '#475569' : '#cbd5e1'}`, borderRadius: '0.5rem' } : {}}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="absolute" style={{ transform: `translate(${logoSettings.x}px, ${logoSettings.y}px) scale(${logoSettings.scale / 100})`, objectFit: 'contain', width: '100%', height: '100%', background: 'transparent' }} />
          ) : <span className="px-3 text-center leading-snug text-slate-500">
    <span className="block text-[11px] font-semibold">
  Acesse os Ajustes e adicione sua
</span>
    <span className="mt-1 block text-base font-black tracking-wide">
      LOGOMARCA
    </span>
  </span>}
        </div>

        {painelAjusteLogo && (
  <div
    className={`absolute top-24 left-8 ${bgCard} p-5 rounded-2xl shadow-2xl border-2 z-50 w-64`}
    style={{ borderColor: corPrimaria }}
  >
    <h4 className={`font-bold text-sm mb-4 ${textStrong} border-b border-slate-200/20 pb-2`}>
      Ajustar Posição da Logo
    </h4>

    <div className="space-y-3 text-xs">
      <label className={`block font-semibold ${textMuted}`}>
        Zoom ({logoSettings.scale}%)
      </label>
      <input
        type="range"
        min="10"
        max="300"
        value={logoSettings.scale}
        onChange={e => setLogoSettings({ ...logoSettings, scale: parseInt(e.target.value) })}
        className="w-full"
        style={{ accentColor: corPrimaria }}
      />

      <label className={`block font-semibold ${textMuted}`}>Eixo X</label>
      <input
        type="range"
        min="-100"
        max="100"
        value={logoSettings.x}
        onChange={e => setLogoSettings({ ...logoSettings, x: parseInt(e.target.value) })}
        className="w-full"
        style={{ accentColor: corPrimaria }}
      />

      <label className={`block font-semibold ${textMuted}`}>Eixo Y</label>
      <input
        type="range"
        min="-100"
        max="100"
        value={logoSettings.y}
        onChange={e => setLogoSettings({ ...logoSettings, y: parseInt(e.target.value) })}
        className="w-full"
        style={{ accentColor: corPrimaria }}
      />
    </div>

    <button
      onClick={() => setPainelAjusteLogo(false)}
      style={estiloTemaPrimario}
      className="w-full py-2 mt-5 rounded-lg font-bold shadow hover:brightness-110"
    >
      Concluir
    </button>
  </div>
)}

        <nav className="flex space-x-3">
  <button
    onClick={() => {
      setAbaAtiva('Dashboard');
      setMesAtivo(null);
    }}
    className={`font-bold py-2.5 px-6 rounded-full transition-all text-sm uppercase tracking-wide border-2 cursor-pointer ${
      abaAtiva === 'Dashboard' && !mesAtivo
        ? 'shadow-md transform scale-105'
        : darkMode
          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 shadow'
          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow hover:shadow-md'
    }`}
    style={estiloTemaPrimarioGradiente}
  >
    Home
  </button>

  {['Balanço Geral', 'Gráficos', 'Por Categoria', 'Relatório'].map((item) => (
            <button 
              key={item} 
              onClick={() => { setAbaAtiva(item); setMesAtivo(null); }}
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
              onMouseOver={e => { if(abaAtiva !== item) e.currentTarget.style.borderColor = corPrimaria }} 
              onMouseOut={e => { if(abaAtiva !== item) e.currentTarget.style.borderColor = darkMode ? '#334155' : '#e2e8f0' }}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-6 relative">

          <button
  type="button"
  onClick={handleLogout}
  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border shadow-sm transition-colors cursor-pointer ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
  }`}
>
  Sair
</button>

          {/* SELETOR DE ANO */}
          <div className="flex flex-col items-center border-l border-slate-200/20 pl-6 pr-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${textMuted}`}>Ano</span>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="bg-transparent font-black text-sm outline-none cursor-pointer text-center"
              style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }}
            >
              {Array.from(
                { length: (new Date().getFullYear() + 5) - 2024 + 1 }, 
                (_, i) => (2024 + i).toString()
              ).map(ano => (
                <option key={ano} value={ano} className="text-slate-800 bg-white">{ano}</option>
              ))}
            </select>
          </div>

          {!mesAtivo && (
  <button 
    onClick={() => setCalcAberta(!calcAberta)} 
    className={`p-2 rounded-lg transition-colors border shadow-sm cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`} 
    title="Calculadora"
  >
    <svg className="w-5 h-5" style={{ color: corEhClara(corPrimaria) ? '#0f172a' : corPrimaria }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
    </svg>
  </button>
)}

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
      </header>

      {/* ================= MENU DE AJUSTES GERAL ================= */}
{ajustesAberto && (
  <div
    className="print-ocultar bg-slate-900 text-white p-4 shadow-inner border-t border-slate-700 transition-all z-20"
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
        <button onClick={() => setModalLogo(true)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Adicionar Logo</button>
        <button onClick={() => setPainelAjusteLogo(!painelAjusteLogo)} className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs">Ajustar Logo</button>
        
        <div className="whitespace-nowrap relative overflow-hidden bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded shadow border border-slate-700 transition-colors text-xs flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: corPrimaria }}></span> Cor Tema
          <input
  type="color"
  value={corPrimaria}
  onChange={(e) => setCorPrimaria(e.target.value)}
  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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

              {/* BOTÃO DE BACKUP EXCEL */}
              <button 
                onClick={gerarBackupExcel} 
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
          <div className="print-ocultar shadow-md px-8 py-3 flex justify-between items-center text-white z-0" style={{ backgroundColor: corPrimaria }}>
            <div className="flex items-center gap-4">
              <button onClick={() => setMesAtivo(null)} className="flex items-center gap-2 hover:bg-white/20 transition-colors bg-black/10 px-4 py-2 rounded-lg border border-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <span className="font-bold uppercase text-sm">Início</span>
              </button>
              <button onClick={() => setCalcAberta(!calcAberta)} className="bg-black/10 hover:bg-black/20 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 border border-white/10">
                <span className="text-sm">Calculadora</span>
              </button>
            </div>

            <div className="flex items-center gap-8 w-1/3 justify-center">
              {meses.indexOf(mesAtivo) > 0 ? (
                <button onClick={() => setMesAtivo(meses[meses.indexOf(mesAtivo) - 1])} className="hover:bg-black/20 p-2 rounded-full transition-colors flex items-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                </button>
              ) : <div className="w-10"></div>}
              <h1 className="text-3xl font-black uppercase tracking-widest w-48 text-center">{mesAtivo}</h1>
              {meses.indexOf(mesAtivo) < 11 ? (
                <button onClick={() => setMesAtivo(meses[meses.indexOf(mesAtivo) + 1])} className="hover:bg-black/20 p-2 rounded-full transition-colors flex items-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                </button>
              ) : <div className="w-10"></div>}
            </div>

            <div className="flex gap-4">
              <div className={`${bgCard} rounded-lg shadow px-4 py-1.5 flex flex-col items-center min-w-[120px]`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Despesas</span>
                <span className="font-black text-lg text-red-500">{formatarMoeda(totalDespesasMes)}</span>
              </div>
              <div className={`${bgCard} rounded-lg shadow px-4 py-1.5 flex flex-col items-center min-w-[120px]`}>
                <span className="text-[10px] font-bold uppercase" style={{ color: corPrimaria }}>Saldo do Mês</span>
                <span className={`font-black text-lg ${lucroOperacional >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatarMoeda(lucroOperacional)}</span>
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
            max={getMaxDias(mesAtivo)}
            value={formDia}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val > getMaxDias(mesAtivo)) setFormDia(getMaxDias(mesAtivo).toString());
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

  <div
    className="overflow-y-auto overflow-x-auto custom-scroll"
    style={{
      height: `${alturaFinalTabelaLancamentos}px`,
      maxHeight: `${alturaMaximaTabelaLancamentos}px`,
    }}
  >
    <table className="w-full text-left border-collapse">
      <tbody>
        {lancamentosOrdenados.filter(l => l.mes === mesAtivo).length > 0 ? (
          lancamentosOrdenados.filter(l => l.mes === mesAtivo).map((lanc) => (
            <tr
  key={lanc.id}
  className={`border-b border-dotted transition-colors ${
    darkMode
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
          max={getMaxDias(mesAtivo)}
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
            onClick={() => apagarDespesa(lanc.id)}
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

            <div className="grid grid-cols-2 gap-8">
              <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6 flex flex-col items-center justify-center`} style={{ borderTopColor: corPrimaria }}>
                <h3 className={`text-lg font-bold ${textStrong} border-b border-slate-200/10 pb-3 mb-4 uppercase tracking-wider`}>Total por Tipo de Despesa</h3>
                <div className="space-y-4 w-full">
                  {analiseDespesas.dados.map((item) => (
                    <div key={item.nome} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.cor }}></span>
                        <span className={`font-semibold truncate max-w-[150px] ${textStrong}`}>{item.nome}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className={`text-sm font-bold w-12 text-right`} style={{ color: corPrimaria }}>{item.percentual.toFixed(1)}%</span>
                        <span className="font-bold text-red-500 w-24 text-right">{formatarMoeda(item.valor)}</span>
                      </div>
                    </div>
                  ))}
                  {analiseDespesas.dados.length === 0 && <span className={textMuted}>Sem dados.</span>}
                </div>
              </div>

              <div className={`${bgCard} rounded-xl shadow-lg border-x border-b border-t-[4px] p-6 flex flex-col items-center justify-center`} style={{ borderTopColor: corPrimaria }}>
                <h3 className={`text-lg font-bold ${textStrong} mb-6 uppercase tracking-wider w-full text-left`}>Composição de Gastos</h3>
                {lancamentosDoMes.length > 0 ? (
                  <div className="relative flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full shadow-inner transform transition-transform hover:scale-105" style={{ background: analiseDespesas.gradiente }}></div>
                    <div className={`absolute w-24 h-24 ${bgCard} rounded-full shadow-lg flex items-center justify-center`}>
                      <div className="text-center">
                        <span className={`block text-[10px] font-bold ${textMuted} uppercase tracking-widest`}>Total</span>
                        <span className={`block text-sm font-black ${textStrong}`}>{formatarMoeda(totalDespesasMes).replace('R$', '')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic text-sm py-10">Nenhum dado para exibir.</div>
                )}
              </div>
            </div>
          </main>
        </>
      ) : abaAtiva === 'Balanço Geral' ? (
        <BalancoGeral 
          meses={meses} lancamentos={lancamentos} faturamentos={faturamentos} setFaturamentos={setFaturamentos}
          corPrimaria={corPrimaria} darkMode={darkMode} formatarMoeda={formatarMoeda} 
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