'use client';

import { useMemo, useState } from 'react';

type FeedbackStatus = 'novo' | 'em_analise' | 'respondido' | 'arquivado';
type AdminView = 'avaliacoes' | 'disparos' | 'conteudo-vendas' | 'cupons' | 'perfis' | 'consumo' | 'rep-p' | 'configuracoes';

type CertificadoRepP = {
  id: string;
  modo: 'homologacao' | 'producao';
  validadeInicio: string;
  validadeFim: string;
  impressaoSha256: string;
  criadoEm: string;
};

type ConsumoItem = {
  nome: string;
  usado: number | null;
  limite: number | null;
  formato: 'bytes' | 'numero' | 'minutos' | 'reais' | 'brl' | 'percentual';
  detalhe?: string;
};

type ConsumoPlataforma = {
  nome: string;
  configurado: boolean;
  itens: ConsumoItem[];
  avisos: string[];
  link: string;
};

type Perfil = {
  id: string;
  nome: string;
  tipo_perfil: string;
  status: string;
  plano: string | null;
  ciclo: string | null;
  valido_ate: string | null;
  trial_fim: string | null;
  cupom_id: string | null;
  tem_acesso: boolean;
  tem_registro: boolean;
};
type PerfilFiltro = 'todos' | 'com_acesso' | 'sem_acesso' | 'trial' | 'ativa' | 'cortesia' | 'inadimplente' | 'cancelada' | 'expirada';
type PerfilTipoFiltro = 'todos' | 'empresa' | 'pessoal';

const FILTROS_PERFIL: Array<{ id: PerfilFiltro; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'com_acesso', label: 'Com acesso' },
  { id: 'sem_acesso', label: 'Sem acesso' },
  { id: 'ativa', label: 'Assinatura ativa' },
  { id: 'trial', label: 'Trial' },
  { id: 'cortesia', label: 'Cortesia / Cupom' },
  { id: 'inadimplente', label: 'Pagamento pendente' },
  { id: 'cancelada', label: 'Cancelado / Revogado' },
  { id: 'expirada', label: 'Expirado / Grátis' },
];

function situacaoPerfil(perfil: Perfil) {
  const situacoes: Record<string, string> = {
    ativa: 'Ativa',
    trial: 'Em teste',
    cortesia: 'Cortesia',
    inadimplente: 'Pagamento pendente',
    cancelada: 'Cancelada',
    expirada: perfil.tipo_perfil === 'pessoal' ? 'Grátis' : 'Expirada',
  };
  return situacoes[perfil.status] || (perfil.tem_acesso ? 'Ativo' : 'Inativo');
}

type UsuariosAtivosSistema = {
  total: number | null;
  carregando: boolean;
};

function detalheAcesso(p: Perfil): string {
  if (p.status === 'cortesia') {
    const origem = p.cupom_id ? 'Cupom' : 'Cortesia';
    return p.valido_ate ? `${origem} até ${formatDate(p.valido_ate)}` : `${origem} (sem prazo)`;
  }
  if (p.status === 'trial') return p.trial_fim ? `Trial até ${formatDate(p.trial_fim)}` : 'Trial';
  if (p.status === 'ativa') {
    if (p.plano) {
      const plano = p.plano === 'pessoal_premium' ? 'Premium Pessoal' : 'Empresa';
      const ciclo = p.ciclo === 'anual' ? 'Anual' : p.ciclo === 'mensal' ? 'Mensal' : '';
      return ciclo ? `Assinatura · ${plano} · ${ciclo}` : `Assinatura · ${plano}`;
    }
    return 'Assinatura ativa';
  }
  if (p.status === 'cancelada') return 'Acesso revogado';
  if (p.status === 'expirada') return p.tipo_perfil === 'pessoal' ? 'Grátis' : 'Expirada';
  if (p.status === 'inadimplente') return p.valido_ate ? `Pagamento pendente até ${formatDate(p.valido_ate)}` : 'Pagamento pendente';
  return p.status || 'Sem assinatura';
}
type StatusFilter = 'ativos' | 'todos' | FeedbackStatus;

type Cupom = {
  id: string;
  codigo: string;
  tipo: 'vitalicio' | 'periodo';
  duracao_valor: number | null;
  duracao_unidade: 'dias' | 'semanas' | 'meses' | null;
  max_usos: number | null;
  usos: number;
  validade: string | null;
  ativo: boolean;
  criado_em: string;
};

type Feedback = {
  id: string;
  empresa_id: string | null;
  usuario_id: string | null;
  acesso_id: string | null;
  nome_empresa: string | null;
  nome_usuario: string | null;
  email_usuario: string | null;
  tipo: 'sugestao' | 'duvida' | 'reclamacao' | 'avaliacao';
  mensagem: string;
  status: FeedbackStatus;
  created_at: string;
};

type Disparo = {
  id?: string;
  titulo: string;
  mensagem: string;
  usuarios: number;
  pushes_enviados: number;
  total_inscricoes: number;
  status: 'enviado' | 'erro';
  erro?: string | null;
  created_at?: string;
};

type ConteudoVendasPagina = 'novidades' | 'informacoes';
type ConteudoVendas = {
  id: string;
  pagina: ConteudoVendasPagina;
  tipo: string;
  titulo: string;
  descricao: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

type ConteudoVendasForm = { tipo: string; titulo: string; descricao: string };

type IconName = 'inbox' | 'send' | 'content' | 'settings' | 'refresh' | 'check' | 'archive' | 'trash' | 'reopen' | 'logout' | 'lock' | 'ticket' | 'search' | 'filter' | 'gauge';

function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'send') return <svg {...common}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
  if (name === 'settings') return <svg {...common}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.5A1.7 1.7 0 0 0 4.2 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.9v4h-.9a1.7 1.7 0 0 0-1.7 1.6Z" /></svg>;
  if (name === 'refresh') return <svg {...common}><path d="M20 7h-5V2" /><path d="M20 7a8 8 0 1 0 1 8" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === 'archive') return <svg {...common}><path d="M3 5h18v4H3zM5 9v11h14V9M9 13h6" /></svg>;
  if (name === 'trash') return <svg {...common}><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></svg>;
  if (name === 'reopen') return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>;
  if (name === 'logout') return <svg {...common}><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></svg>;
  if (name === 'lock') return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  if (name === 'ticket') return <svg {...common}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M13 7v10" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
  if (name === 'filter') return <svg {...common}><path d="M4 5h16M7 12h10M10 19h4" /></svg>;
  if (name === 'gauge') return <svg {...common}><path d="M12 14 8 8" /><path d="M3.3 17a10 10 0 1 1 17.4 0" /></svg>;
  if (name === 'content') return <svg {...common}><rect x="3" y="4" width="8" height="7" rx="1" /><rect x="13" y="4" width="8" height="7" rx="1" /><path d="M3 15h8M3 19h8M13 15h8M13 19h5" /></svg>;
  return <svg {...common}><path d="M4 4h16v13H7l-3 3Z" /><path d="M8 9h8M8 13h5" /></svg>;
}

function formatBytes(valor: number) {
  if (valor >= 1024 * 1024 * 1024) return `${(valor / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (valor >= 1024 * 1024) return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
  if (valor >= 1024) return `${(valor / 1024).toFixed(0)} KB`;
  return `${valor} B`;
}

function formatConsumo(valor: number | null, formato: ConsumoItem['formato']) {
  if (valor === null) return '—';
  if (formato === 'bytes') return formatBytes(valor);
  if (formato === 'minutos') return `${valor.toLocaleString('pt-BR')} min`;
  if (formato === 'reais') return `US$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (formato === 'brl') return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (formato === 'percentual') return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
  return valor.toLocaleString('pt-BR');
}

function corBarraConsumo(pct: number) {
  if (pct >= 90) return '#DC2626';
  if (pct >= 70) return '#D97706';
  return '#059669';
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function typeLabel(type: Feedback['tipo']) {
  return { sugestao: 'Sugestão', duvida: 'Dúvida', reclamacao: 'Reclamação', avaliacao: 'Avaliação' }[type];
}

function statusLabel(status: FeedbackStatus) {
  return { novo: 'Novo', em_analise: 'Em análise', respondido: 'Resolvido', arquivado: 'Arquivado' }[status];
}

function typeClass(type: Feedback['tipo']) {
  if (type === 'reclamacao') return 'border-red-200 bg-red-50 text-red-700';
  if (type === 'duvida') return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  if (type === 'avaliacao') return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function statusClass(status: FeedbackStatus) {
  if (status === 'novo') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'respondido') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'arquivado') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-cyan-200 bg-cyan-50 text-cyan-800';
}

const tiposConteudoVendas: Record<ConteudoVendasPagina, { value: string; label: string; icon: IconName }[]> = {
  novidades: [
    { value: 'inclusao', label: 'Inclusão', icon: 'check' },
    { value: 'ajuste', label: 'Ajuste', icon: 'settings' },
    { value: 'correcao', label: 'Correção', icon: 'refresh' },
    { value: 'melhoria', label: 'Melhoria', icon: 'gauge' },
    { value: 'aviso', label: 'Aviso', icon: 'inbox' },
    { value: 'comunicado', label: 'Comunicado', icon: 'send' },
  ],
  informacoes: [
    { value: 'versao', label: 'Versão', icon: 'content' },
    { value: 'melhorias', label: 'Melhorias', icon: 'gauge' },
    { value: 'atualizacoes', label: 'Atualizações', icon: 'refresh' },
    { value: 'participe', label: 'Participe', icon: 'send' },
    { value: 'orientacao', label: 'Orientação', icon: 'inbox' },
    { value: 'seguranca', label: 'Segurança', icon: 'lock' },
    { value: 'dica', label: 'Dica', icon: 'check' },
  ],
};

function dadosTipoConteudo(pagina: ConteudoVendasPagina, tipo: string) {
  return tiposConteudoVendas[pagina].find((item) => item.value === tipo)
    || { value: tipo, label: tipo, icon: 'content' as IconName };
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [view, setView] = useState<AdminView>('avaliacoes');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [broadcasts, setBroadcasts] = useState<Disparo[]>([]);
  const [conteudosVendas, setConteudosVendas] = useState<ConteudoVendas[]>([]);
  const [conteudosVendasPendente, setConteudosVendasPendente] = useState(false);
  const [conteudoVendasSalvando, setConteudoVendasSalvando] = useState<ConteudoVendasPagina | null>(null);
  const [formulariosConteudoVendas, setFormulariosConteudoVendas] = useState<Record<ConteudoVendasPagina, ConteudoVendasForm>>({
    novidades: { tipo: 'inclusao', titulo: '', descricao: '' },
    informacoes: { tipo: 'versao', titulo: '', descricao: '' },
  });
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | Feedback['tipo']>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativos');
  const [broadcastTitle, setBroadcastTitle] = useState('Novidade no AvantaLab');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [historyPending, setHistoryPending] = useState(false);
  const [customPassword, setCustomPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [cupomCodigo, setCupomCodigo] = useState('');
  const [cupomTipo, setCupomTipo] = useState<'vitalicio' | 'periodo'>('vitalicio');
  const [cupomDuracaoValor, setCupomDuracaoValor] = useState('3');
  const [cupomDuracaoUnidade, setCupomDuracaoUnidade] = useState<'dias' | 'semanas' | 'meses'>('meses');
  const [cupomUsosIlimitado, setCupomUsosIlimitado] = useState(true);
  const [cupomMaxUsos, setCupomMaxUsos] = useState('50');
  const [creatingCupom, setCreatingCupom] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilBusca, setPerfilBusca] = useState('');
  const [perfilFiltro, setPerfilFiltro] = useState<PerfilFiltro>('todos');
  const [perfilTipoFiltro, setPerfilTipoFiltro] = useState<PerfilTipoFiltro>('todos');
  const [filtrosPerfilAbertos, setFiltrosPerfilAbertos] = useState(false);
  const [buscandoPerfis, setBuscandoPerfis] = useState(false);
  const [perfilPagina, setPerfilPagina] = useState(1);
  const [perfilPorPagina, setPerfilPorPagina] = useState(20);
  const [perfilTotal, setPerfilTotal] = useState(0);
  const [perfisCarregados, setPerfisCarregados] = useState(false);
  const [usuariosAtivosSistema, setUsuariosAtivosSistema] = useState<UsuariosAtivosSistema>({ total: null, carregando: false });
  const [consumo, setConsumo] = useState<ConsumoPlataforma[]>([]);
  const [consumoCarregando, setConsumoCarregando] = useState(false);
  const [consumoGeradoEm, setConsumoGeradoEm] = useState('');
  const [liberarPerfil, setLiberarPerfil] = useState<Perfil | null>(null);
  const [liberarTipo, setLiberarTipo] = useState<'indeterminado' | 'periodo'>('indeterminado');
  const [liberarValor, setLiberarValor] = useState('1');
  const [liberarUnidade, setLiberarUnidade] = useState<'dias' | 'semanas' | 'meses'>('meses');
  const [certificadoRepP, setCertificadoRepP] = useState<CertificadoRepP | null>(null);
  const [arquivoRepP, setArquivoRepP] = useState<File | null>(null);
  const [senhaRepP, setSenhaRepP] = useState('');
  const [modoRepP, setModoRepP] = useState<'homologacao' | 'producao'>('homologacao');
  const [enviandoCertificadoRepP, setEnviandoCertificadoRepP] = useState(false);
  const [registroInpiRepP, setRegistroInpiRepP] = useState('');
  const [documentoDesenvolvedorRepP, setDocumentoDesenvolvedorRepP] = useState('');

  const totalFiltrosPerfilAtivos = Number(perfilFiltro !== 'todos') + Number(perfilTipoFiltro !== 'todos');

  const authHeaders = (value = token) => ({ Authorization: `Bearer ${value.trim()}` });

  const carregarConsumo = async () => {
    if (consumoCarregando) return;
    setConsumoCarregando(true);
    setError('');
    try {
      const response = await fetch('/api/admin-consumo', { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível consultar o consumo.');
      setConsumo(data.plataformas || []);
      setConsumoGeradoEm(data.geradoEm || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível consultar o consumo.');
    } finally {
      setConsumoCarregando(false);
    }
  };

  const buscarPerfis = async (pagina = 1, filtros?: { situacao?: PerfilFiltro; tipo?: PerfilTipoFiltro }) => {
    setBuscandoPerfis(true);
    setError('');
    try {
      const situacao = filtros?.situacao ?? perfilFiltro;
      const tipo = filtros?.tipo ?? perfilTipoFiltro;
      const response = await fetch(`/api/admin-perfis?q=${encodeURIComponent(perfilBusca.trim())}&filtro=${situacao}&tipo=${tipo}&pagina=${pagina}&porPagina=${perfilPorPagina}`, { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível buscar.');
      setPerfis(data.perfis || []);
      setPerfilTotal(data.total || 0);
      setPerfilPagina(pagina);
      setPerfisCarregados(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível buscar.');
    } finally {
      setBuscandoPerfis(false);
    }
  };

  const carregarUsuariosAtivosSistema = async () => {
    setUsuariosAtivosSistema((current) => current.carregando ? current : { ...current, carregando: true });
    try {
      const response = await fetch('/api/usuarios-ativos');
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível contar usuários.');
      const total = Number(data?.total);
      setUsuariosAtivosSistema({ total: Number.isFinite(total) ? total : 0, carregando: false });
    } catch {
      setUsuariosAtivosSistema({ total: null, carregando: false });
    }
  };

  const executarAcaoPerfil = async (perfil: Perfil, corpo: { acao: 'revogar' | 'liberar'; duracaoValor?: number; duracaoUnidade?: string }) => {
    setWorkingId(perfil.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin-perfis', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: perfil.id, ...corpo }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível executar.');
      setPerfis((current) => current.map((item) => item.id === perfil.id
        ? { ...item, status: data.status, valido_ate: data.validoAte ?? null, trial_fim: data.trialFim ?? null, plano: null, ciclo: null, cupom_id: data.cupomId ?? null, tem_acesso: Boolean(data.temAcesso), tem_registro: Boolean(data.temRegistro) }
        : item));
      const mensagens: Record<string, string> = {
        revogar: 'Acesso revogado.',
        liberar: 'Acesso liberado por cortesia.',
      };
      setNotice(mensagens[corpo.acao]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível executar.');
    } finally {
      setWorkingId(null);
    }
  };

  const revogarPerfil = async (perfil: Perfil) => {
    if (!window.confirm(`Revogar a cortesia de "${perfil.nome}"? O perfil ficará bloqueado até assinar ou receber nova liberação.`)) return;
    await executarAcaoPerfil(perfil, { acao: 'revogar' });
  };

  const abrirLiberar = (perfil: Perfil) => {
    setLiberarTipo('indeterminado');
    setLiberarValor('1');
    setLiberarUnidade('meses');
    setLiberarPerfil(perfil);
  };

  const confirmarLiberar = async () => {
    if (!liberarPerfil) return;
    const alvo = liberarPerfil;
    const corpo = liberarTipo === 'periodo'
      ? { acao: 'liberar' as const, duracaoValor: Number(liberarValor), duracaoUnidade: liberarUnidade }
      : { acao: 'liberar' as const };
    setLiberarPerfil(null);
    await executarAcaoPerfil(alvo, corpo);
  };

  const loadCupons = async (value = token) => {
    const response = await fetch('/api/admin-cupons', { headers: authHeaders(value) });
    const data = await response.json().catch(() => null);
    if (response.ok && !data?.erro) setCupons(data.cupons || []);
  };

  const criarCupom = async () => {
    const codigo = cupomCodigo.trim().toUpperCase();
    if (!codigo) { setError('Informe o código do cupom.'); return; }
    setCreatingCupom(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin-cupons', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo,
          tipo: cupomTipo,
          duracaoValor: cupomTipo === 'periodo' ? Number(cupomDuracaoValor) : null,
          duracaoUnidade: cupomTipo === 'periodo' ? cupomDuracaoUnidade : null,
          maxUsos: cupomUsosIlimitado ? null : Number(cupomMaxUsos),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível criar o cupom.');
      setCupons((current) => [data.cupom, ...current]);
      setCupomCodigo('');
      setCupomMaxUsos('');
      setNotice(`Cupom "${codigo}" criado.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o cupom.');
    } finally {
      setCreatingCupom(false);
    }
  };

  const toggleCupom = async (cupom: Cupom) => {
    setWorkingId(cupom.id);
    setError('');
    try {
      const response = await fetch('/api/admin-cupons', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cupom.id, ativo: !cupom.ativo }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível atualizar.');
      setCupons((current) => current.map((item) => item.id === cupom.id ? { ...item, ativo: !item.ativo } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar.');
    } finally {
      setWorkingId(null);
    }
  };

  const loadBroadcasts = async (value = token) => {
    const response = await fetch('/api/admin-disparos', { headers: authHeaders(value) });
    const data = await response.json().catch(() => null);
    if (response.ok && !data?.erro) {
      setBroadcasts(data.disparos || []);
      setHistoryPending(Boolean(data.configuracaoPendente));
    }
  };

  const loadConteudosVendas = async (value = token) => {
    const response = await fetch('/api/admin-conteudos-vendas', { headers: authHeaders(value) });
    const data = await response.json().catch(() => null);
    if (response.ok && !data?.erro) {
      setConteudosVendas(data.conteudos || []);
      setConteudosVendasPendente(Boolean(data.configuracaoPendente));
    }
  };

  const atualizarFormularioConteudo = (pagina: ConteudoVendasPagina, campo: keyof ConteudoVendasForm, valor: string) => {
    setFormulariosConteudoVendas((atual) => ({ ...atual, [pagina]: { ...atual[pagina], [campo]: valor } }));
  };

  const publicarConteudoVendas = async (pagina: ConteudoVendasPagina) => {
    const formulario = formulariosConteudoVendas[pagina];
    if (!formulario.titulo.trim() || !formulario.descricao.trim()) {
      setError('Preencha o título e a descrição da publicação.');
      return;
    }
    setConteudoVendasSalvando(pagina);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin-conteudos-vendas', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina, ...formulario }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível publicar.');
      setConteudosVendas((atual) => [data.conteudo, ...atual]);
      setFormulariosConteudoVendas((atual) => ({ ...atual, [pagina]: { ...atual[pagina], titulo: '', descricao: '' } }));
      setNotice(`Conteúdo publicado em ${pagina === 'novidades' ? 'Novidades' : 'Informações'}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível publicar.');
    } finally {
      setConteudoVendasSalvando(null);
    }
  };

  const excluirConteudoVendas = async (conteudo: ConteudoVendas) => {
    if (!window.confirm(`Apagar “${conteudo.titulo}” do App Vendas?`)) return;
    setWorkingId(conteudo.id);
    setError('');
    try {
      const response = await fetch(`/api/admin-conteudos-vendas?id=${encodeURIComponent(conteudo.id)}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível apagar.');
      setConteudosVendas((atual) => atual.filter((item) => item.id !== conteudo.id));
      setNotice('Conteúdo apagado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível apagar.');
    } finally {
      setWorkingId(null);
    }
  };

  const loadSettings = async (value = token) => {
    const response = await fetch('/api/admin-configuracoes', { headers: authHeaders(value) });
    const data = await response.json().catch(() => null);
    if (response.ok && !data?.erro) setCustomPassword(Boolean(data.senhaPersonalizada));
  };

  const carregarCertificadoRepP = async (value = token) => {
    const response = await fetch('/api/admin-rep-p-certificado', { headers: authHeaders(value) });
    const data = await response.json().catch(() => null);
    if (response.ok && !data?.erro) { setCertificadoRepP(data.certificado || null); setRegistroInpiRepP(data.configuracao?.registro_inpi || ''); setDocumentoDesenvolvedorRepP(data.configuracao?.documento_desenvolvedor || ''); }
  };

  const salvarRegistroInpi = async () => { try { const resposta = await fetch('/api/admin-rep-p-certificado', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ registroInpi: registroInpiRepP, documentoDesenvolvedor: documentoDesenvolvedorRepP }) }); const dados = await resposta.json().catch(() => null); if (!resposta.ok || dados?.erro) throw new Error(dados?.mensagem || 'Não foi possível salvar.'); setNotice('Registro INPI guardado.'); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); } };

  const salvarCertificadoRepP = async () => {
    if (!arquivoRepP) { setError('Selecione o certificado A1 .pfx ou .p12.'); return; }
    if (!senhaRepP) { setError('Informe a senha do certificado.'); return; }
    setEnviandoCertificadoRepP(true);
    setError('');
    setNotice('');
    try {
      const formulario = new FormData();
      formulario.set('certificado', arquivoRepP);
      formulario.set('senha', senhaRepP);
      formulario.set('modo', modoRepP);
      const response = await fetch('/api/admin-rep-p-certificado', { method: 'POST', headers: authHeaders(), body: formulario });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível guardar o certificado.');
      setCertificadoRepP(data.certificado);
      setArquivoRepP(null);
      setSenhaRepP('');
      setNotice(data.situacao === 'vencido' ? 'Certificado vencido guardado somente para homologação.' : 'Certificado REP-P guardado com segurança.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível guardar o certificado.');
    } finally {
      setEnviandoCertificadoRepP(false);
    }
  };

  const loadPanel = async (value = token) => {
    const cleanToken = value.trim();
    if (!cleanToken) {
      setError('Informe a senha administrativa.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-feedbacks', { headers: authHeaders(cleanToken) });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) {
        setAuthorized(false);
        setUsuariosAtivosSistema({ total: null, carregando: false });
        setError(data?.mensagem || 'Não foi possível acessar o painel.');
        return;
      }
      setFeedbacks(data.feedbacks || []);
      setAuthorized(true);
      await Promise.allSettled([loadBroadcasts(cleanToken), loadConteudosVendas(cleanToken), loadSettings(cleanToken), loadCupons(cleanToken), carregarCertificadoRepP(cleanToken), carregarUsuariosAtivosSistema()]);
    } catch {
      setAuthorized(false);
      setError('Erro inesperado ao acessar o painel.');
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = useMemo(() => feedbacks.filter((feedback) => {
    const statusMatches = statusFilter === 'todos'
      || (statusFilter === 'ativos' && feedback.status !== 'arquivado')
      || feedback.status === statusFilter;
    const typeMatches = typeFilter === 'todos' || feedback.tipo === typeFilter;
    return statusMatches && typeMatches;
  }), [feedbacks, statusFilter, typeFilter]);

  const totals = useMemo(() => ({
    total: feedbacks.length,
    novos: feedbacks.filter((item) => item.status === 'novo').length,
    resolvidos: feedbacks.filter((item) => item.status === 'respondido').length,
    arquivados: feedbacks.filter((item) => item.status === 'arquivado').length,
  }), [feedbacks]);

  const updateFeedback = async (id: string, status: FeedbackStatus) => {
    setWorkingId(id);
    setError('');
    try {
      const response = await fetch('/api/admin-feedbacks', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível atualizar.');
      setFeedbacks((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar.');
    } finally {
      setWorkingId(null);
    }
  };

  const deleteFeedback = async (feedback: Feedback) => {
    if (!window.confirm('Apagar esta mensagem definitivamente? Esta ação não pode ser desfeita.')) return;
    setWorkingId(feedback.id);
    setError('');
    try {
      const response = await fetch(`/api/admin-feedbacks?id=${encodeURIComponent(feedback.id)}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível apagar.');
      setFeedbacks((current) => current.filter((item) => item.id !== feedback.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível apagar.');
    } finally {
      setWorkingId(null);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setError('Digite a mensagem do disparo.');
      return;
    }
    if (!window.confirm('Enviar este aviso para todos os usuários?')) return;

    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin-disparos', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: broadcastTitle, mensagem: broadcastMessage }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível enviar.');
      setNotice(`Aviso enviado para ${data.resultado?.usuarios || 0} usuários.`);
      setBroadcastMessage('');
      await loadBroadcasts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  };

  const changePassword = async () => {
    setSavingPassword(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin-configuracoes', {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: newPassword, confirmarSenha: confirmPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.erro) throw new Error(data?.mensagem || 'Não foi possível alterar a senha.');
      setToken(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setCustomPassword(true);
      setNotice('Senha alterada. Esta sessão já está usando a nova senha.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const logout = () => {
    setToken('');
    setAuthorized(false);
    setFeedbacks([]);
    setBroadcasts([]);
    setConteudosVendas([]);
    setConteudosVendasPendente(false);
    setCertificadoRepP(null);
    setArquivoRepP(null);
    setSenhaRepP('');
    setError('');
    setNotice('');
    setView('avaliacoes');
    setUsuariosAtivosSistema({ total: null, carregando: false });
  };

  const navigation: { id: AdminView; label: string; icon: IconName }[] = [
    { id: 'avaliacoes', label: 'Avaliações', icon: 'inbox' },
    { id: 'disparos', label: 'Disparos', icon: 'send' },
    { id: 'conteudo-vendas', label: 'Informações Vendas', icon: 'content' },
    { id: 'cupons', label: 'Cupons', icon: 'ticket' },
    { id: 'perfis', label: 'Perfis', icon: 'search' },
    { id: 'consumo', label: 'Consumo', icon: 'gauge' },
    { id: 'rep-p', label: 'REP-P', icon: 'lock' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  const renderColunaConteudoVendas = (pagina: ConteudoVendasPagina) => {
    const novidades = pagina === 'novidades';
    const formulario = formulariosConteudoVendas[pagina];
    const tipoSelecionado = dadosTipoConteudo(pagina, formulario.tipo);
    const historico = conteudosVendas.filter((item) => item.pagina === pagina);
    return <section className="min-w-0 space-y-4">
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className={`p-4 text-white ${novidades ? 'bg-gradient-to-br from-cyan-800 to-sky-600' : 'bg-gradient-to-br from-slate-900 to-cyan-800'}`}>
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15"><Icon name={novidades ? 'inbox' : 'content'} /></span><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">App Vendas</p><h2 className="text-lg font-black">{novidades ? 'Novidades' : 'Informações'}</h2></div></div>
          <p className="mt-2 text-xs leading-relaxed text-white/80">{novidades ? 'Publicações sobre inclusões, ajustes e correções exibidas na página Novidades.' : 'Conteúdos sobre versões, melhorias e orientações exibidos na página Informações.'}</p>
        </header>
        <div className="p-4">
          <label className="block text-[10px] font-black uppercase text-slate-500">Subtítulo / tipo</label>
          <div className="mt-1 flex gap-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name={tipoSelecionado.icon} size={16} /></span><select value={formulario.tipo} onChange={(event) => atualizarFormularioConteudo(pagina, 'tipo', event.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-cyan-700">{tiposConteudoVendas[pagina].map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}</select></div>
          <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Título</label>
          <input value={formulario.titulo} onChange={(event) => atualizarFormularioConteudo(pagina, 'titulo', event.target.value)} maxLength={120} placeholder="Título da publicação" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-cyan-700" />
          <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Descrição</label>
          <textarea value={formulario.descricao} onChange={(event) => atualizarFormularioConteudo(pagina, 'descricao', event.target.value)} maxLength={2000} rows={5} placeholder="Descreva a novidade ou informação..." className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm leading-relaxed outline-none focus:border-cyan-700" />
          <button type="button" onClick={() => void publicarConteudoVendas(pagina)} disabled={conteudoVendasSalvando !== null} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60"><Icon name="send" />{conteudoVendasSalvando === pagina ? 'Publicando...' : `Publicar em ${novidades ? 'Novidades' : 'Informações'}`}</button>
        </div>
      </article>
      <div><div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="text-sm font-black text-slate-950">Histórico de {novidades ? 'novidades' : 'informações'}</h3><p className="text-[11px] text-slate-500">Publicações mais recentes primeiro.</p></div><span className="rounded-full bg-slate-200 px-2 py-1 text-[9px] font-black text-slate-600">{historico.length}</span></div>
        {historico.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-500">Nenhuma publicação cadastrada.</div> : <div className="grid gap-2">{historico.map((conteudo) => { const tipo = dadosTipoConteudo(pagina, conteudo.tipo); return <article key={conteudo.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name={tipo.icon} size={15} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="text-[8px] font-black uppercase tracking-wide text-cyan-700">{tipo.label}</span><h4 className="truncate text-sm font-black text-slate-950">{conteudo.titulo}</h4></div><button type="button" onClick={() => void excluirConteudoVendas(conteudo)} disabled={workingId === conteudo.id} aria-label={`Apagar ${conteudo.titulo}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"><Icon name="trash" size={14} /></button></div><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{conteudo.descricao}</p><time className="mt-2 block border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400">{formatDate(conteudo.criado_em)}</time></div></div></article>; })}</div>}
      </div>
    </section>;
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 sm:px-5">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-700">AvantaLab</p>
              <h1 className="truncate text-base font-black text-slate-950">Central administrativa</h1>
            </div>
            {authorized && <button type="button" onClick={logout} className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><Icon name="logout" />Sair</button>}
          </div>

          {authorized && <nav className="grid grid-cols-4 gap-0.5 border-t border-slate-100 py-2 sm:grid-cols-8 sm:gap-1" aria-label="Áreas administrativas">
            {navigation.map((item) => <button key={item.id} type="button" title={item.label} onClick={() => { setView(item.id); setError(''); setNotice(''); }} className={`flex h-10 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-[8px] font-black transition sm:h-9 sm:flex-row sm:gap-1 sm:px-1 sm:text-[10px] ${view === item.id ? 'bg-cyan-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><Icon name={item.icon} size={13} /><span className="max-w-full truncate">{item.label}</span></button>)}
          </nav>}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        {!authorized ? <section className="mx-auto mt-8 max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name="lock" size={20} /></span>
          <h2 className="mt-4 text-lg font-black text-slate-950">Acesso administrativo</h2>
          <p className="mt-1 text-sm text-slate-500">Entre com a senha administrativa para acessar mensagens, disparos e configurações.</p>
          <label className="mt-5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Senha</label>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadPanel(); }} autoComplete="current-password" className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15" placeholder="Digite a senha" />
          {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
          <button type="button" onClick={() => void loadPanel()} disabled={loading} className="mt-4 h-11 w-full rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60">{loading ? 'Acessando...' : 'Acessar painel'}</button>
        </section> : <>
          {(error || notice) && <div className={`mb-4 rounded-md border px-3 py-2.5 text-sm font-bold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}

          {view === 'avaliacoes' && <div className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Totais de mensagens">
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
                {[['Total', totals.total, 'text-slate-950'], ['Novos', totals.novos, 'text-amber-700'], ['Resolvidos', totals.resolvidos, 'text-emerald-700'], ['Arquivados', totals.arquivados, 'text-slate-600']].map(([label, value, color]) => <div key={String(label)} className="px-4 py-3"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-0.5 text-xl font-black ${color}`}>{value}</p></div>)}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="text-base font-black text-slate-950">Mensagens recebidas</h2><p className="text-xs text-slate-500">Acompanhe, resolva ou arquive os contatos enviados pelo sistema.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-cyan-700"><option value="todos">Todos os tipos</option><option value="sugestao">Sugestões</option><option value="duvida">Dúvidas</option><option value="reclamacao">Reclamações</option><option value="avaliacao">Avaliações</option></select>
                  <button type="button" onClick={() => void loadPanel()} disabled={loading} className="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><Icon name="refresh" />Atualizar</button>
                </div>
              </div>
              <div className="mt-3 flex gap-1 overflow-x-auto border-t border-slate-100 pt-3">
                {([['ativos', 'Ativas'], ['novo', 'Novas'], ['respondido', 'Resolvidas'], ['arquivado', 'Arquivadas'], ['todos', 'Todas']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setStatusFilter(id)} className={`h-9 shrink-0 rounded-md px-3 text-[11px] font-black ${statusFilter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}
              </div>
            </section>

            {filteredFeedbacks.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhuma mensagem encontrada neste filtro.</div> : <div className="grid gap-3">
              {filteredFeedbacks.map((feedback) => {
                const busy = workingId === feedback.id;
                return <article key={feedback.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <header className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${typeClass(feedback.tipo)}`}>{typeLabel(feedback.tipo)}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${statusClass(feedback.status)}`}>{statusLabel(feedback.status)}</span></div><h3 className="mt-2 truncate text-sm font-black text-slate-950">{feedback.nome_empresa || 'Perfil não informado'}</h3><p className="mt-0.5 break-words text-[11px] text-slate-500">{feedback.nome_usuario || 'Usuário não informado'}{feedback.email_usuario ? ` · ${feedback.email_usuario}` : ''}</p></div>
                    <time className="shrink-0 text-[10px] font-bold text-slate-400">{formatDate(feedback.created_at)}</time>
                  </header>
                  <div className="p-3"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{feedback.mensagem}</p></div>
                  <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-2.5">
                    {feedback.status === 'respondido' || feedback.status === 'arquivado' ? <button type="button" onClick={() => void updateFeedback(feedback.id, 'novo')} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-md border border-cyan-200 px-3 text-[10px] font-black uppercase text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"><Icon name="reopen" size={15} />Reabrir</button> : <button type="button" onClick={() => void updateFeedback(feedback.id, 'respondido')} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[10px] font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50"><Icon name="check" size={15} />Resolver</button>}
                    {feedback.status !== 'arquivado' && <button type="button" onClick={() => void updateFeedback(feedback.id, 'arquivado')} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Icon name="archive" size={15} />Arquivar</button>}
                    <button type="button" onClick={() => void deleteFeedback(feedback)} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-md border border-red-200 px-3 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-50"><Icon name="trash" size={15} />Apagar</button>
                  </footer>
                </article>;
              })}
            </div>}
          </div>}

          {view === 'disparos' && <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-32">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700">Comunicação</p><h2 className="mt-1 text-lg font-black text-slate-950">Novo disparo</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Envia aviso no sininho e notificação push para todos os usuários.</p>
              <label className="mt-4 block text-[10px] font-black uppercase text-slate-500">Título</label><input value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-cyan-700" />
              <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Mensagem</label><textarea value={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.value)} rows={5} className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-cyan-700" placeholder="Escreva uma mensagem objetiva..." />
              <button type="button" onClick={() => void sendBroadcast()} disabled={sending} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60"><Icon name="send" />{sending ? 'Enviando...' : 'Disparar para todos'}</button>
            </section>
            <section className="min-w-0"><div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-black text-slate-950">Histórico de envios</h2><p className="text-xs text-slate-500">Últimos 100 disparos realizados.</p></div><button type="button" onClick={() => void loadBroadcasts()} className="flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-black uppercase"><Icon name="refresh" size={15} />Atualizar</button></div>
              {historyPending && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Execute a migração administrativa no Supabase para ativar o histórico.</div>}
              {broadcasts.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhum disparo registrado.</div> : <div className="grid gap-2">{broadcasts.map((item, index) => <article key={item.id || `${item.created_at}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950">{item.titulo}</h3><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{item.mensagem}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.status === 'enviado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{item.status}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500"><span>{formatDate(item.created_at)}</span><span>{item.usuarios} usuários</span><span>{item.pushes_enviados}/{item.total_inscricoes} pushes</span></div>{item.erro && <p className="mt-2 text-xs font-bold text-red-700">{item.erro}</p>}</article>)}</div>}
            </section>
          </div>}

          {view === 'conteudo-vendas' && <div className="space-y-4">
            {conteudosVendasPendente && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Execute a migração de conteúdos do Vendas no Supabase para ativar publicações e carregar o histórico inicial.</div>}
            <div className="mx-auto max-w-3xl">
              {renderColunaConteudoVendas('informacoes')}
            </div>
          </div>}

          {view === 'cupons' && <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-32">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700">Cortesias</p><h2 className="mt-1 text-lg font-black text-slate-950">Novo cupom</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Libera acesso sem pagamento (avaliadores, promoções). Vale para empresa e pessoal.</p>
              <label className="mt-4 block text-[10px] font-black uppercase text-slate-500">Código</label><input value={cupomCodigo} onChange={(event) => setCupomCodigo(event.target.value.toUpperCase())} placeholder="EX: AVALIADOR" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold uppercase tracking-wide outline-none focus:border-cyan-700" />
              <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Tipo</label><select value={cupomTipo} onChange={(event) => setCupomTipo(event.target.value as 'vitalicio' | 'periodo')} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-cyan-700"><option value="vitalicio">Vitalício (sem prazo)</option><option value="periodo">Período (meses)</option></select>
              {cupomTipo === 'periodo' && <><label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Duração do acesso</label><div className="mt-1 flex gap-2"><input type="number" min={1} value={cupomDuracaoValor} onChange={(event) => setCupomDuracaoValor(event.target.value)} className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" /><select value={cupomDuracaoUnidade} onChange={(event) => setCupomDuracaoUnidade(event.target.value as 'dias' | 'semanas' | 'meses')} className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-cyan-700"><option value="dias">Dias</option><option value="semanas">Semanas</option><option value="meses">Meses</option></select></div></>}
              <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Quantidade de usos</label>
              <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setCupomUsosIlimitado(true)} className={`rounded px-3 py-1.5 text-xs font-black uppercase transition ${cupomUsosIlimitado ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-white'}`}>Ilimitado</button>
                <button type="button" onClick={() => setCupomUsosIlimitado(false)} className={`rounded px-3 py-1.5 text-xs font-black uppercase transition ${!cupomUsosIlimitado ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-white'}`}>Definir número</button>
              </div>
              {!cupomUsosIlimitado && <input type="number" min={1} value={cupomMaxUsos} onChange={(event) => setCupomMaxUsos(event.target.value)} placeholder="Ex: 50" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" />}
              <button type="button" onClick={() => void criarCupom()} disabled={creatingCupom || !cupomCodigo.trim()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60"><Icon name="ticket" />{creatingCupom ? 'Criando...' : 'Criar cupom'}</button>
            </section>
            <section className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-black text-slate-950">Cupons</h2><p className="text-xs text-slate-500">Ative ou desative a qualquer momento.</p></div><button type="button" onClick={() => void loadCupons()} className="flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[10px] font-black uppercase"><Icon name="refresh" size={15} />Atualizar</button></div>
              {cupons.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhum cupom criado.</div> : <div className="grid gap-2">{cupons.map((cupom) => {
                const busy = workingId === cupom.id;
                const detalhe = cupom.tipo === 'vitalicio' ? 'Vitalício' : `${cupom.duracao_valor} ${cupom.duracao_unidade}`;
                const usosTxt = cupom.max_usos ? `${cupom.usos}/${cupom.max_usos} usos` : `${cupom.usos} usos`;
                return <article key={cupom.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-sm font-black text-slate-950">{cupom.codigo}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${cupom.ativo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{cupom.ativo ? 'Ativo' : 'Inativo'}</span></div><p className="mt-1 text-[11px] font-bold text-slate-500">{detalhe} · {usosTxt}</p></div>
                  <button type="button" onClick={() => void toggleCupom(cupom)} disabled={busy} className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-black uppercase disabled:opacity-50 ${cupom.ativo ? 'border-slate-300 text-slate-600 hover:bg-slate-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{cupom.ativo ? 'Desativar' : 'Ativar'}</button>
                </article>;
              })}</div>}
            </section>
          </div>}

          {view === 'perfis' && <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-950">Perfis</h2>
                  <p className="text-xs text-slate-500">Busque por nome, ou carregue a lista para ver qualquer perfil. Ordem alfabética.</p>
                </div>
                <div className="shrink-0 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-right">
                  <p className="text-[9px] font-black uppercase tracking-wide text-cyan-800">Usuários ativos/cadastrados</p>
                  <p className="mt-0.5 text-xl font-black leading-none text-cyan-950">
                    {usuariosAtivosSistema.carregando
                      ? '...'
                      : usuariosAtivosSistema.total === null
                        ? '-'
                        : usuariosAtivosSistema.total.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={perfilBusca} onChange={(event) => setPerfilBusca(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void buscarPerfis(1); }} placeholder="Nome do perfil (vazio = todos)" className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFiltrosPerfilAbertos((aberto) => !aberto)} className={`relative flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-black uppercase ${filtrosPerfilAbertos || totalFiltrosPerfilAtivos ? 'border-cyan-300 bg-cyan-50 text-cyan-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}><Icon name="filter" size={15} />Filtros{totalFiltrosPerfilAtivos > 0 && <span className="rounded-full bg-cyan-700 px-1.5 py-0.5 text-[9px] text-white">{totalFiltrosPerfilAtivos}</span>}</button>
                  <select value={perfilPorPagina} onChange={(event) => setPerfilPorPagina(Number(event.target.value))} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold outline-none focus:border-cyan-700"><option value={20}>20/pág</option><option value={50}>50/pág</option><option value={100}>100/pág</option></select>
                  <button type="button" onClick={() => void buscarPerfis(1)} disabled={buscandoPerfis} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60"><Icon name="search" size={15} />{buscandoPerfis ? 'Carregando...' : 'Carregar / Buscar'}</button>
                </div>
              </div>
              {filtrosPerfilAbertos && <div className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-3">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Situação de acesso</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{FILTROS_PERFIL.map((filtro) => <button key={filtro.id} type="button" onClick={() => setPerfilFiltro(filtro.id)} className={`rounded-full border px-2.5 py-1 text-[10px] font-black transition ${perfilFiltro === filtro.id ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'}`}>{filtro.label}</button>)}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Tipo de perfil</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{([['todos', 'Todos os tipos'], ['empresa', 'Empresa'], ['pessoal', 'Pessoal']] as Array<[PerfilTipoFiltro, string]>).map(([tipo, label]) => <button key={tipo} type="button" onClick={() => setPerfilTipoFiltro(tipo)} className={`rounded-full border px-2.5 py-1 text-[10px] font-black transition ${perfilTipoFiltro === tipo ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'}`}>{label}</button>)}</div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-cyan-100 pt-3"><button type="button" onClick={() => { setPerfilFiltro('todos'); setPerfilTipoFiltro('todos'); void buscarPerfis(1, { situacao: 'todos', tipo: 'todos' }); }} className="h-9 rounded-md px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-white">Limpar</button><button type="button" onClick={() => { setFiltrosPerfilAbertos(false); void buscarPerfis(1); }} disabled={buscandoPerfis} className="h-9 rounded-md bg-cyan-700 px-3 text-[10px] font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60">Aplicar filtros</button></div>
                </div>
              </div>}
            </section>
            {!perfisCarregados ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Clique em &quot;Carregar / Buscar&quot; para listar os perfis.</div>
             : perfis.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Nenhum perfil encontrado.</div>
             : <>
              <div className="grid gap-2">{perfis.map((perfil) => {
                const busy = workingId === perfil.id;
                const tipoTxt = perfil.tipo_perfil === 'pessoal' ? 'Pessoal' : 'Empresa';
                const podeRevogar = perfil.status === 'cortesia' && perfil.tem_acesso;
                return <article key={perfil.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-950">{perfil.nome}</h3>
                    <dl className="mt-1 grid gap-0.5 text-[11px] font-bold text-slate-500 sm:grid-cols-3 sm:gap-x-4">
                      <div><dt className="inline text-slate-400">Tipo: </dt><dd className="inline text-slate-700">{tipoTxt}</dd></div>
                      <div><dt className="inline text-slate-400">Situação: </dt><dd className={`inline ${perfil.tem_acesso ? 'text-emerald-700' : 'text-red-600'}`}>{situacaoPerfil(perfil)}</dd></div>
                      <div className="sm:col-span-3"><dt className="inline text-slate-400">Acesso: </dt><dd className="inline text-slate-700">{detalheAcesso(perfil)}</dd></div>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    {podeRevogar && (
                      <button type="button" onClick={() => void revogarPerfil(perfil)} disabled={busy} className="rounded-md border border-red-200 px-3 py-2 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-50">Revogar acesso</button>
                    )}
                    <button type="button" onClick={() => abrirLiberar(perfil)} disabled={busy} className="rounded-md border border-emerald-200 px-3 py-2 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Liberar</button>
                  </div>
                </article>;
              })}</div>
              {perfilTotal > perfilPorPagina && (() => {
                const totalPaginas = Math.ceil(perfilTotal / perfilPorPagina);
                return <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-bold text-slate-600">
                  <span>{perfilTotal} perfis · página {perfilPagina} de {totalPaginas}</span>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={perfilPagina <= 1 || buscandoPerfis} onClick={() => void buscarPerfis(perfilPagina - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Anterior</button>
                    <button type="button" disabled={perfilPagina >= totalPaginas || buscandoPerfis} onClick={() => void buscarPerfis(perfilPagina + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Próxima</button>
                  </div>
                </div>;
              })()}
             </>}
          </div>}

          {view === 'consumo' && <div className="space-y-4">
            <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Consumo das plataformas</h2>
                <p className="text-xs text-slate-500">Uso atual x limite do plano gratuito de cada serviço.{consumoGeradoEm ? ` Atualizado em ${formatDate(consumoGeradoEm)}.` : ''}</p>
              </div>
              <button type="button" onClick={() => void carregarConsumo()} disabled={consumoCarregando} className="flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-60">
                <Icon name="refresh" size={15} />{consumoCarregando ? 'Consultando...' : consumo.length ? 'Atualizar' : 'Consultar consumo'}
              </button>
            </section>

            {!consumo.length && !consumoCarregando && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">Clique em &quot;Consultar consumo&quot; para carregar os dados.</div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {consumo.map((plataforma) => (
                <section key={plataforma.nome} className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-950">{plataforma.nome}</h3>
                    <a href={plataforma.link} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50">Abrir painel</a>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {plataforma.itens.map((item) => {
                      const pct = item.usado !== null && item.limite ? Math.min(100, Math.round((item.usado / item.limite) * 100)) : null;
                      return (
                        <div key={item.nome}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700">{item.nome}</span>
                            <span className="text-xs font-black text-slate-900">
                              {formatConsumo(item.usado, item.formato)}
                              {item.limite !== null && <span className="font-bold text-slate-400"> / {formatConsumo(item.limite, item.formato)}</span>}
                            </span>
                          </div>
                          {pct !== null && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: corBarraConsumo(pct) }} />
                              </div>
                              <span className="w-9 text-right text-[10px] font-black" style={{ color: corBarraConsumo(pct) }}>{pct}%</span>
                            </div>
                          )}
                          {item.detalhe && <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{item.detalhe}</p>}
                        </div>
                      );
                    })}
                    {!plataforma.itens.length && <p className="text-xs text-slate-400">Sem métricas disponíveis.</p>}
                  </div>

                  {plataforma.avisos.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5">
                      {plataforma.avisos.map((aviso, indice) => aviso.trimStart().startsWith('create or replace')
                        ? <pre key={indice} className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-[9px] leading-relaxed text-emerald-300">{aviso}</pre>
                        : <p key={indice} className="text-[11px] font-semibold leading-snug text-amber-800">{aviso}</p>)}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>}

          {view === 'rep-p' && <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name="lock" /></span>
              <h2 className="mt-3 text-base font-black text-slate-950">Certificado REP-P</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">O A1 é criptografado antes de ser armazenado. O arquivo e a senha não podem ser visualizados ou baixados após o envio.</p>
              <label className="mt-4 block text-[10px] font-black uppercase text-slate-500" htmlFor="rep-p-certificado">Arquivo A1</label>
              <input id="rep-p-certificado" type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(event) => setArquivoRepP(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-cyan-700 file:px-3 file:text-xs file:font-black file:uppercase file:text-white hover:file:bg-cyan-800" />
              <label className="mt-3 block text-[10px] font-black uppercase text-slate-500" htmlFor="rep-p-senha">Senha do certificado</label>
              <input id="rep-p-senha" type="password" autoComplete="new-password" value={senhaRepP} onChange={(event) => setSenhaRepP(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" placeholder="Senha do A1" />
              <label className="mt-3 block text-[10px] font-black uppercase text-slate-500" htmlFor="rep-p-modo">Ambiente</label>
              <select id="rep-p-modo" value={modoRepP} onChange={(event) => setModoRepP(event.target.value as 'homologacao' | 'producao')} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-cyan-700"><option value="homologacao">Homologação — emissão legal bloqueada</option><option value="producao">Produção — exige certificado vigente</option></select>
              <button type="button" onClick={() => void salvarCertificadoRepP()} disabled={enviandoCertificadoRepP || !arquivoRepP || !senhaRepP} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-40"><Icon name="lock" size={15} />{enviandoCertificadoRepP ? 'Criptografando...' : 'Guardar certificado'}</button>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Icon name="check" /></span>
              <h2 className="mt-3 text-base font-black text-slate-950">Certificado ativo</h2>
              {!certificadoRepP ? <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">Nenhum certificado cadastrado.</p> : <dl className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 text-xs"><div className="flex justify-between gap-3 p-3"><dt className="font-bold text-slate-500">Ambiente</dt><dd className="font-black text-slate-900">{certificadoRepP.modo === 'homologacao' ? 'Homologação' : 'Produção'}</dd></div><div className="flex justify-between gap-3 p-3"><dt className="font-bold text-slate-500">Vigência</dt><dd className="text-right font-black text-slate-900">até {formatDate(certificadoRepP.validadeFim)}</dd></div><div className="p-3"><dt className="font-bold text-slate-500">Impressão SHA-256</dt><dd className="mt-1 break-all font-mono text-[10px] text-slate-700">{certificadoRepP.impressaoSha256}</dd></div></dl>}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">A substituição preserva o histórico criptografado e torna o novo certificado o único ativo.</p>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name="archive" /></span>
              <h2 className="mt-3 text-base font-black text-slate-950">Registro do software no INPI</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Informe o número do certificado de registro do programa de computador. A emissão e o histórico de AFD ficam disponíveis somente para a empresa, em Controle de Ponto &gt; Conformidade.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block text-[10px] font-black uppercase text-slate-500">Registro INPI<input value={registroInpiRepP} onChange={(event) => setRegistroInpiRepP(event.target.value.replace(/\D/g, '').slice(0, 17))} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-bold outline-none focus:border-cyan-700" inputMode="numeric" /></label>
                <div className="flex items-end"><button type="button" onClick={() => void salvarRegistroInpi()} className="h-10 w-full rounded-md border border-cyan-200 px-4 text-xs font-black uppercase text-cyan-800 hover:bg-cyan-50">Guardar registro INPI</button></div>
              </div>
            </section>
          </div>}

          {view === 'configuracoes' && <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-800"><Icon name="lock" /></span><h2 className="mt-3 text-base font-black text-slate-950">Senha administrativa</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{customPassword ? 'Uma senha personalizada está ativa.' : 'A senha inicial do ambiente ainda está ativa.'} A alteração vale no próximo acesso.</p><label className="mt-4 block text-[10px] font-black uppercase text-slate-500">Nova senha</label><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" placeholder="Mínimo de 10 caracteres" /><label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Confirmar nova senha</label><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" /><button type="button" onClick={() => void changePassword()} disabled={savingPassword || !newPassword || !confirmPassword} className="mt-3 h-10 w-full rounded-md bg-cyan-700 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-40">{savingPassword ? 'Salvando...' : 'Alterar senha'}</button></section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><Icon name="settings" /></span><h2 className="mt-3 text-base font-black text-slate-950">Sessão administrativa</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">A senha permanece somente na memória desta página. Ao sair ou fechar a aba, será necessário informar novamente.</p><dl className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200 text-xs"><div className="flex justify-between gap-3 p-3"><dt className="font-bold text-slate-500">Acesso</dt><dd className="font-black text-emerald-700">Autorizado</dd></div><div className="flex justify-between gap-3 p-3"><dt className="font-bold text-slate-500">Persistência local</dt><dd className="font-black text-slate-700">Desativada</dd></div></dl><button type="button" onClick={logout} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 text-xs font-black uppercase text-red-700 hover:bg-red-50"><Icon name="logout" />Encerrar sessão</button></section>
          </div>}
        </>}
      </div>

      {liberarPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setLiberarPerfil(null)}>
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-base font-black text-slate-950">Liberar acesso</h3>
            <p className="mt-1 text-xs text-slate-500">Cortesia para <strong>{liberarPerfil.nome}</strong>. Escolha acesso ilimitado ou uma duração definida.</p>

            <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-1">
              <button type="button" onClick={() => setLiberarTipo('indeterminado')} className={`rounded px-3 py-1.5 text-xs font-black uppercase transition ${liberarTipo === 'indeterminado' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-white'}`}>Ilimitado</button>
              <button type="button" onClick={() => setLiberarTipo('periodo')} className={`rounded px-3 py-1.5 text-xs font-black uppercase transition ${liberarTipo === 'periodo' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-white'}`}>Por período</button>
            </div>

            {liberarTipo === 'periodo' && (
              <div className="mt-3 flex gap-2">
                <input type="number" min={1} value={liberarValor} onChange={(event) => setLiberarValor(event.target.value)} className="h-10 w-24 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700" />
                <select value={liberarUnidade} onChange={(event) => setLiberarUnidade(event.target.value as 'dias' | 'semanas' | 'meses')} className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-cyan-700"><option value="dias">Dias</option><option value="semanas">Semanas</option><option value="meses">Meses</option></select>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setLiberarPerfil(null)} className="h-10 flex-1 rounded-md border border-slate-300 text-xs font-black uppercase text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={() => void confirmarLiberar()} className="h-10 flex-1 rounded-md bg-emerald-600 text-xs font-black uppercase text-white hover:bg-emerald-700">Liberar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
