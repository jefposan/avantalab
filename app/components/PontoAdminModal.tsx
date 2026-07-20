'use client';
import React, { useState, useEffect, useRef } from 'react';
import DraggableModalCard from './DraggableModalCard';

export type FuncionarioPonto = {
  id: string;
  user_id: string;
  nome: string;
  login: string;
  cpf: string | null;
  cargo: string;
  ativo: boolean;
  hora_entrada: string | null;
  hora_saida: string | null;
  dias_trabalho: number[] | null;
};

export function formatarCpf(v: string | null | undefined) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  // Não é CPF (ex.: funcionário antigo com login de texto): mostra o valor original.
  if (d.length !== 11) return String(v || '');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function cpfValido(cpf: string) {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export const DIAS_SEMANA: Array<[number, string]> = [[0, 'Dom'], [1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb']];
const TODOS_FUNCIONARIOS = '__todos__';
export type AbaPontoAdmin = 'lista' | 'novo' | 'local' | 'calendario' | 'relatorios' | 'auditoria' | 'conformidade' | 'tratamentos';

export type EventoAuditoriaPonto = {
  id: string;
  funcionario_user_id: string | null;
  ator_user_id: string | null;
  evento: string;
  origem: string;
  motivo: string | null;
  dados: Record<string, unknown> | null;
  ocorrido_em: string;
};

export type EstadoAssinaturaPonto = {
  modo: 'homologacao' | 'producao';
  certificadoConfigurado: boolean;
  senhaConfigurada: boolean;
  emissaoLegalPermitida: boolean;
  situacao: 'nao_configurado' | 'homologacao' | 'certificado_invalido' | 'certificado_vencido' | 'aguardando_validacao';
  validadeCertificado?: string;
  mensagem: string;
};

export type DocumentoRepP = {
  id: string;
  tipo: 'afd' | 'manual' | 'espelho' | 'aej';
  periodo_inicio: string;
  periodo_fim: string;
  arquivo_nome: string;
  sha256: string;
  modo: 'homologacao' | 'producao';
  gerado_em: string;
};

export type TratamentoItemPonto = {
  id: string;
  funcionario_user_id: string;
  data_referencia?: string;
  data_inicio?: string;
  data_fim?: string;
  tipo: string;
  motivo: string;
  comprovante_path: string | null;
  situacao: 'pendente' | 'aprovado' | 'recusado' | 'cancelado';
  solicitado_em: string;
  decisao?: { motivo: string | null; decidido_em: string } | null;
};

export type DadosTratamentosPonto = {
  ajustes: TratamentoItemPonto[];
  abonos: TratamentoItemPonto[];
  regras: Array<{ id: string; nome: string; vigencia_inicio: string; vigencia_fim: string | null; acordo_referencia: string; prazo_compensacao_dias: number; limite_minutos: number | null; ativo: boolean }>;
  lancamentos: Array<{ id: string; funcionario_user_id: string; data_referencia: string; minutos: number; natureza: string; motivo: string }>;
  saldoPorFuncionario: Record<string, number>;
};

export type PontoDiaNaoUtil = {
  id: string;
  empresa_id?: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  descricao: string | null;
  recorrente_anual: boolean;
  criado_em?: string;
};

export type RegistroPonto = {
  tipo: string;
  registrado_em: string;
  dia: string;
  distancia_m: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type PontoConfig = {
  latitude: number | null;
  longitude: number | null;
  raio_m: number;
} | null;

interface PontoAdminModalProps {
  aberto: boolean;
  abaInicial?: AbaPontoAdmin;
  relatorioInicial?: { funcionarioUserId: string; data: string } | null;
  onFechar: () => void;
  funcionarios: FuncionarioPonto[];
  carregando: boolean;
  onCriar: (dados: { nome: string; cpf: string; senha: string; cargo: string; horaEntrada?: string; horaSaida?: string; diasTrabalho?: number[] }) => Promise<{ erro: boolean; mensagem?: string }>;
  onAtualizar: (funcionarioUserId: string, dados: { nome: string; cargo: string; cpf?: string; horaEntrada?: string; horaSaida?: string; ativo: boolean; diasTrabalho?: number[] }) => Promise<{ erro: boolean; mensagem?: string }>;
  onRedefinirSenha: (funcionarioUserId: string, novaSenha: string) => Promise<{ erro: boolean; mensagem?: string }>;
  config: PontoConfig;
  onSalvarConfig: (dados: { latitude: number; longitude: number; raio_m: number }) => Promise<{ erro: boolean; mensagem?: string }>;
  onCarregarRegistros: (funcionarioUserId: string, dataInicioISO: string) => Promise<RegistroPonto[]>;
  onCarregarAuditoria: () => Promise<EventoAuditoriaPonto[]>;
  onCarregarAssinatura: () => Promise<EstadoAssinaturaPonto | null>;
  onBaixarAfd: (inicio: string, fim: string) => Promise<{ erro: boolean; mensagem?: string }>;
  onCarregarDocumentosRepP: () => Promise<DocumentoRepP[]>;
  onBaixarDocumentoRepP: (documento: DocumentoRepP) => Promise<{ erro: boolean; mensagem?: string }>;
  onPrepararManualRepP: () => Promise<{ erro: boolean; mensagem?: string }>;
  onGerarEspelhoPonto: (funcionarioId: string, inicio: string, fim: string) => Promise<{ erro: boolean; mensagem?: string }>;
  onRegistrarTratamento: (dados: { acao: 'ajuste' | 'abono'; funcionarioId: string; data: string; dataFim?: string; tipo: string; motivo: string; minutosAbonados?: number; horario?: string; tipoMarcacao?: 'entrada' | 'saida'; anexo?: File | null }) => Promise<{ erro: boolean; mensagem?: string }>;
  onLancarBancoHoras: (dados: { funcionarioId: string; data: string; minutos: number; natureza: string; motivo: string }) => Promise<{ erro: boolean; mensagem?: string }>;
  onCadastrarBancoRegra: (dados: { nome: string; vigenciaInicio: string; acordoReferencia: string; prazoCompensacaoDias: number; limiteMinutos?: number }) => Promise<{ erro: boolean; mensagem?: string }>;
  onCarregarTratamentos: () => Promise<DadosTratamentosPonto>;
  onDecidirTratamento: (tipo: 'ajuste' | 'abono', id: string, decisao: 'aprovado' | 'recusado' | 'cancelado', motivo: string) => Promise<{ erro: boolean; mensagem?: string }>;
  onBaixarComprovanteTratamento: (tipo: 'ajuste' | 'abono', item: TratamentoItemPonto) => Promise<{ erro: boolean; mensagem?: string }>;
  onGerarAej: (inicio: string, fim: string) => Promise<{ erro: boolean; mensagem?: string }>;
  diasNaoUteis: PontoDiaNaoUtil[];
  diasNaoUteisCarregando: boolean;
  onCriarDiaNaoUtil: (dados: { dataInicio: string; dataFim: string; tipo: string; descricao: string; recorrenteAnual: boolean }) => Promise<{ erro: boolean; mensagem?: string }>;
  onExcluirDiaNaoUtil: (id: string) => Promise<{ erro: boolean; mensagem?: string }>;
  darkMode: boolean;
}

export default function PontoAdminModal({
  aberto,
  abaInicial = 'lista',
  relatorioInicial = null,
  onFechar,
  funcionarios,
  carregando,
  onCriar,
  onAtualizar,
  onRedefinirSenha,
  config,
  onSalvarConfig,
  onCarregarRegistros,
  onCarregarAuditoria,
  onCarregarAssinatura,
  onBaixarAfd,
  onCarregarDocumentosRepP,
  onBaixarDocumentoRepP,
  onPrepararManualRepP,
  onGerarEspelhoPonto,
  onRegistrarTratamento,
  onLancarBancoHoras,
  onCadastrarBancoRegra,
  onCarregarTratamentos,
  onDecidirTratamento,
  onBaixarComprovanteTratamento,
  onGerarAej,
  diasNaoUteis,
  diasNaoUteisCarregando,
  onCriarDiaNaoUtil,
  onExcluirDiaNaoUtil,
  darkMode,
}: PontoAdminModalProps) {
  // Cor padrão do sistema (marca AvantaLab) — não usa a cor do usuário (corSistema).
  const corSistema = '#003E73';
  const [aba, setAba] = useState<AbaPontoAdmin>(abaInicial);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [cargo, setCargo] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  const [diasNovo, setDiasNovo] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const listaScrollRef = useRef<HTMLDivElement | null>(null);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [capturando, setCapturando] = useState(false);
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [msgLocal, setMsgLocal] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const hojeISO = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  };
  const [diaNaoUtilInicio, setDiaNaoUtilInicio] = useState(hojeISO);
  const [diaNaoUtilFim, setDiaNaoUtilFim] = useState(hojeISO);
  const [diaNaoUtilTipo, setDiaNaoUtilTipo] = useState('empresa_fechada');
  const [diaNaoUtilDescricao, setDiaNaoUtilDescricao] = useState('');
  const [diaNaoUtilRecorrente, setDiaNaoUtilRecorrente] = useState(false);
  const [salvandoDiaNaoUtil, setSalvandoDiaNaoUtil] = useState(false);
  const [excluindoDiaNaoUtilId, setExcluindoDiaNaoUtilId] = useState<string | null>(null);
  const [msgCalendario, setMsgCalendario] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editEntrada, setEditEntrada] = useState('');
  const [editSaida, setEditSaida] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editDias, setEditDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [msgEdit, setMsgEdit] = useState<string | null>(null);
  const [editCpf, setEditCpf] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [verEditSenha, setVerEditSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const cardEditRef = useRef<HTMLDivElement | null>(null);

  const dataRelatorioInicial = relatorioInicial?.data || '';
  const dataRelatorioInicialObj = dataRelatorioInicial ? new Date(`${dataRelatorioInicial}T12:00:00`) : new Date();
  const [relFuncId, setRelFuncId] = useState(relatorioInicial?.funcionarioUserId || TODOS_FUNCIONARIOS);
  const [relAno, setRelAno] = useState<number>(dataRelatorioInicialObj.getFullYear());
  const [relMesIdx, setRelMesIdx] = useState<number>(dataRelatorioInicialObj.getMonth());
  const [relDataInicio, setRelDataInicio] = useState<string>(() => {
    if (dataRelatorioInicial) return dataRelatorioInicial;
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [relDataFim, setRelDataFim] = useState<string>(() => {
    if (dataRelatorioInicial) return dataRelatorioInicial;
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [relRegistros, setRelRegistros] = useState<RegistroPonto[]>([]);
  const [relRegistrosTodos, setRelRegistrosTodos] = useState<Record<string, RegistroPonto[]>>({});
  const [relCarregando, setRelCarregando] = useState(false);
  const [auditoria, setAuditoria] = useState<EventoAuditoriaPonto[]>([]);
  const [auditoriaCarregando, setAuditoriaCarregando] = useState(false);
  const [afdInicio, setAfdInicio] = useState(() => new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [afdFim, setAfdFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [baixandoAfd, setBaixandoAfd] = useState(false);
  const [msgConformidade, setMsgConformidade] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [documentosRepP, setDocumentosRepP] = useState<DocumentoRepP[]>([]);
  const [documentosRepPCarregando, setDocumentosRepPCarregando] = useState(false);
  const [baixandoDocumentoId, setBaixandoDocumentoId] = useState<string | null>(null);
  const [preparandoManual, setPreparandoManual] = useState(false);
  const [gerandoEspelho, setGerandoEspelho] = useState(false);
  const [gerandoAej, setGerandoAej] = useState(false);
  const [tratamentoFuncionario, setTratamentoFuncionario] = useState('');
  const [tratamentoTipo, setTratamentoTipo] = useState<'ajuste' | 'abono'>('ajuste');
  const [tratamentoData, setTratamentoData] = useState(hojeISO);
  const [tratamentoDataFim, setTratamentoDataFim] = useState(hojeISO);
  const [tratamentoMotivo, setTratamentoMotivo] = useState('');
  const [tratamentoHorario, setTratamentoHorario] = useState('');
  const [tratamentoMarcacao, setTratamentoMarcacao] = useState<'entrada' | 'saida'>('entrada');
  const [tratamentoMinutos, setTratamentoMinutos] = useState('');
  const [tratamentoAnexo, setTratamentoAnexo] = useState<File | null>(null);
  const [salvandoTratamento, setSalvandoTratamento] = useState(false);
  const [msgTratamento, setMsgTratamento] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [bancoMinutos, setBancoMinutos] = useState(''); const [bancoMotivo, setBancoMotivo] = useState('');
  const [regraNome, setRegraNome] = useState(''); const [regraAcordo, setRegraAcordo] = useState(''); const [regraPrazo, setRegraPrazo] = useState('180'); const [regraLimite, setRegraLimite] = useState('');
  const [tratamentos, setTratamentos] = useState<DadosTratamentosPonto>({ ajustes: [], abonos: [], regras: [], lancamentos: [], saldoPorFuncionario: {} });
  const [tratamentosCarregando, setTratamentosCarregando] = useState(false);
  const [decidindoId, setDecidindoId] = useState<string | null>(null);
  const [motivosRecusa, setMotivosRecusa] = useState<Record<string, string>>({});
  const [assinatura, setAssinatura] = useState<EstadoAssinaturaPonto | null>(null);
  const relatorioInicialCarregadoRef = useRef(false);

  const TOLERANCIA_MIN = 10;
  const MESES_REL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const aplicarMes = (ano: number, mesIdx: number) => {
    const mm = String(mesIdx + 1).padStart(2, '0');
    const ultimoDia = new Date(ano, mesIdx + 1, 0).getDate();
    setRelDataInicio(`${ano}-${mm}-01`);
    setRelDataFim(`${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`);
  };

  useEffect(() => {
    if (config) {
      setLat(config.latitude != null ? String(config.latitude) : '');
      setLng(config.longitude != null ? String(config.longitude) : '');
      setRaio(String(config.raio_m || 100));
    }
  }, [config]);

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const itemBorda = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const inputCls = `h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  const labelCls = `grid gap-1 text-[11px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`;
  const linkPonto = (typeof window !== 'undefined' ? window.location.origin : '') + '/ponto';
  const copiarLinkPonto = () => {
    try { navigator.clipboard.writeText(linkPonto); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2500); } catch { /* ignore */ }
  };

  const enviar = async () => {
    setMsg(null);
    if (!nome.trim()) { setMsg({ tipo: 'erro', texto: 'Informe o nome do funcionário.' }); return; }
    if (!cpfValido(cpf)) { setMsg({ tipo: 'erro', texto: 'Informe um CPF válido (o login será o CPF).' }); return; }
    if (senha.length < 8) { setMsg({ tipo: 'erro', texto: 'A senha deve ter pelo menos 8 caracteres.' }); return; }
    setEnviando(true);
    const r = await onCriar({ nome: nome.trim(), cpf: cpf.replace(/\D/g, ''), senha, cargo: cargo.trim(), horaEntrada: horaEntrada || undefined, horaSaida: horaSaida || undefined, diasTrabalho: diasNovo });
    setEnviando(false);
    if (r.erro) {
      setMsg({ tipo: 'erro', texto: r.mensagem || 'Não foi possível cadastrar.' });
    } else {
      setMsg({ tipo: 'ok', texto: 'Funcionário cadastrado!' });
      setNome(''); setCpf(''); setSenha(''); setVerSenha(false); setCargo(''); setHoraEntrada(''); setHoraSaida(''); setDiasNovo([]);
      setAba('lista');
    }
  };

  const toggleDia = (dias: number[], setDias: (v: number[]) => void, n: number) => {
    setDias(dias.includes(n) ? dias.filter((d) => d !== n) : [...dias, n].sort((a, b) => a - b));
  };

  const renderSeletorDias = (dias: number[], setDias: (v: number[]) => void) => (
    <div className="flex gap-1">
      {DIAS_SEMANA.map(([n, lbl]) => {
        const ativo = dias.includes(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggleDia(dias, setDias, n)}
            className="flex-1 rounded-md py-1.5 text-[10px] font-black uppercase transition"
            style={ativo ? { backgroundColor: corSistema, color: '#fff' } : { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#94a3b8' : '#64748b' }}
          >{lbl}</button>
        );
      })}
    </div>
  );

  const temEscalaFixa = (dias: number[] | null | undefined): dias is number[] => Array.isArray(dias) && dias.length > 0;

  const resumoDias = (dias: number[] | null) => {
    if (!temEscalaFixa(dias)) return 'Escala variável';
    if (dias.length === 7) return 'Todos os dias';
    return DIAS_SEMANA.filter(([n]) => dias.includes(n)).map(([, l]) => l).join(', ');
  };

  const abrirEdicao = (f: FuncionarioPonto) => {
    setEditId(f.id);
    setEditNome(f.nome || '');
    setEditCargo(f.cargo || '');
    setEditCpf(f.cpf ? f.cpf : '');
    setEditEntrada(f.hora_entrada ? f.hora_entrada.slice(0, 5) : '');
    setEditSaida(f.hora_saida ? f.hora_saida.slice(0, 5) : '');
    setEditAtivo(f.ativo);
    setEditDias(Array.isArray(f.dias_trabalho) ? f.dias_trabalho : []);
    setEditSenha(''); setVerEditSenha(false); setMsgSenha(null);
    setMsgEdit(null);
    // rola o card em edição para o topo do painel (nome logo abaixo do header)
    setTimeout(() => { if (cardEditRef.current) cardEditRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  };

  const cpfEditDigitos = editCpf.replace(/\D/g, '');
  const cpfEditInvalido = cpfEditDigitos.length === 11 && !cpfValido(editCpf);
  const cpfNovoInvalido = cpf.replace(/\D/g, '').length === 11 && !cpfValido(cpf);

  const salvarEdicao = async (userId: string) => {
    setMsgEdit(null);
    if (cpfEditDigitos.length > 0 && !cpfValido(editCpf)) { setMsgEdit('CPF inválido. Corrija para salvar.'); return; }
    setSalvandoEdit(true);
    const r = await onAtualizar(userId, {
      nome: editNome.trim(), cargo: editCargo.trim(),
      cpf: cpfEditDigitos.length === 11 ? cpfEditDigitos : undefined,
      horaEntrada: editEntrada || undefined, horaSaida: editSaida || undefined,
      ativo: editAtivo, diasTrabalho: editDias,
    });
    setSalvandoEdit(false);
    if (r.erro) setMsgEdit(r.mensagem || 'Não foi possível salvar.');
    else setEditId(null);
  };

  const salvarSenha = async (userId: string) => {
    setMsgSenha(null);
    if (editSenha.length < 8) { setMsgSenha({ tipo: 'erro', texto: 'A senha deve ter pelo menos 8 caracteres.' }); return; }
    setSalvandoSenha(true);
    const r = await onRedefinirSenha(userId, editSenha);
    setSalvandoSenha(false);
    if (r.erro) setMsgSenha({ tipo: 'erro', texto: r.mensagem || 'Não foi possível alterar a senha.' });
    else { setMsgSenha({ tipo: 'ok', texto: 'Senha alterada!' }); setEditSenha(''); }
  };

  const horaBrasilia = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false });
  const minutosDoDia = (hhmm: string) => { const [h, m] = hhmm.slice(0, 5).split(':').map(Number); return h * 60 + m; };

  const carregarRelatorio = async (funcId: string) => {
    if (!funcId) { setRelRegistros([]); setRelRegistrosTodos({}); return; }
    setRelCarregando(true);
    if (funcId === TODOS_FUNCIONARIOS) {
      const resultados = await Promise.all(
        funcionarios.map(async (funcionario) => {
          const regs = await onCarregarRegistros(funcionario.user_id, relDataInicio);
          return [funcionario.user_id, regs.filter((r) => r.dia >= relDataInicio && r.dia <= relDataFim)] as const;
        })
      );
      setRelRegistros([]);
      setRelRegistrosTodos(Object.fromEntries(resultados));
      setRelCarregando(false);
      return;
    }
    const regs = await onCarregarRegistros(funcId, relDataInicio);
    setRelRegistros(regs.filter((r) => r.dia >= relDataInicio && r.dia <= relDataFim));
    setRelRegistrosTodos({});
    setRelCarregando(false);
  };

  const carregarTratamentos = async () => {
    setTratamentosCarregando(true);
    try { setTratamentos(await onCarregarTratamentos()); }
    finally { setTratamentosCarregando(false); }
  };

  useEffect(() => {
    if (!aberto || aba !== 'relatorios' || !relatorioInicial || relatorioInicialCarregadoRef.current) return;
    if (!funcionarios.some((funcionario) => funcionario.user_id === relatorioInicial.funcionarioUserId)) return;
    relatorioInicialCarregadoRef.current = true;
    setRelCarregando(true);
    onCarregarRegistros(relatorioInicial.funcionarioUserId, relatorioInicial.data)
      .then((registros) => {
        setRelRegistros(registros.filter((registro) => registro.dia === relatorioInicial.data));
        setRelRegistrosTodos({});
      })
      .finally(() => setRelCarregando(false));
  }, [aberto, aba, funcionarios, onCarregarRegistros, relatorioInicial]);

  if (!aberto) return null;

  type DiaRel = { dia: string; entrada?: string; saidaAlmoco?: string; entradaAlmoco?: string; saida?: string; distancia: number | null; statusEntrada: 'pontual' | 'atraso' | 'adiantado' | 'sem' };
  const funcSel = funcionarios.find((f) => f.user_id === relFuncId) || null;
  const diaNaoUtilNaData = (iso: string) => {
    const md = iso.slice(5);
    return diasNaoUteis.some((item) => {
      if (!item.recorrente_anual) return iso >= item.data_inicio && iso <= item.data_fim;
      const inicio = item.data_inicio.slice(5);
      const fim = item.data_fim.slice(5);
      return inicio <= fim ? md >= inicio && md <= fim : md >= inicio || md <= fim;
    });
  };
  const montarDiasRel = (funcionario: FuncionarioPonto | null, registros: RegistroPonto[]): DiaRel[] => {
    const mapa: Record<string, RegistroPonto[]> = {};
    registros.forEach((r) => { (mapa[r.dia] = mapa[r.dia] || []).push(r); });
    return Object.keys(mapa).sort().reverse().map((dia) => {
      const regs = mapa[dia];
      const entradaReg = regs.find((r) => r.tipo === 'entrada');
      const saidaAlmocoReg = regs.find((r) => r.tipo === 'saida_refeicao');
      const entradaAlmocoReg = regs.find((r) => r.tipo === 'retorno_refeicao');
      const saidaReg = [...regs].reverse().find((r) => r.tipo === 'saida');
      const distancia = entradaReg?.distancia_m ?? regs[0]?.distancia_m ?? null;
      let statusEntrada: DiaRel['statusEntrada'] = 'sem';
      if (entradaReg && funcionario?.hora_entrada && temEscalaFixa(funcionario.dias_trabalho)) {
        const diff = minutosDoDia(horaBrasilia(entradaReg.registrado_em)) - minutosDoDia(funcionario.hora_entrada);
        statusEntrada = diff > TOLERANCIA_MIN ? 'atraso' : diff < -TOLERANCIA_MIN ? 'adiantado' : 'pontual';
      }
      return {
        dia,
        entrada: entradaReg ? horaBrasilia(entradaReg.registrado_em) : undefined,
        saidaAlmoco: saidaAlmocoReg ? horaBrasilia(saidaAlmocoReg.registrado_em) : undefined,
        entradaAlmoco: entradaAlmocoReg ? horaBrasilia(entradaAlmocoReg.registrado_em) : undefined,
        saida: saidaReg ? horaBrasilia(saidaReg.registrado_em) : undefined,
        distancia,
        statusEntrada,
      };
    });
  };
  const diasRel = montarDiasRel(funcSel, relRegistros);
  const totalComHorario = diasRel.filter((d) => d.statusEntrada !== 'sem').length;
  const pontuais = diasRel.filter((d) => d.statusEntrada === 'pontual').length;
  const atrasos = diasRel.filter((d) => d.statusEntrada === 'atraso').length;
  const pctPontual = totalComHorario ? Math.round((pontuais / totalComHorario) * 100) : 0;

  // Faltas: dias de trabalho (Dom–Sáb selecionados) sem registro de entrada,
  // contados a partir do primeiro registro do funcionário até ontem.
  const diasTrabSet = new Set(funcSel?.dias_trabalho ?? []);
  const diasComEntrada = new Set(relRegistros.filter((r) => r.tipo === 'entrada').map((r) => r.dia));
  const faltas = (() => {
    if (!relFuncId || diasTrabSet.size === 0 || relRegistros.length === 0) return 0;
    const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(relDataInicio + 'T00:00:00');
    const primeiroDia = relRegistros.reduce((min, r) => (r.dia < min ? r.dia : min), relRegistros[0].dia);
    let count = 0;
    for (const d = new Date(inicio); d < hoje; d.setDate(d.getDate() + 1)) {
      const iso = isoLocal(d);
      if (iso < primeiroDia) continue;
      if (diasTrabSet.has(d.getDay()) && !diasComEntrada.has(iso) && !diaNaoUtilNaData(iso)) count++;
    }
    return count;
  })();

  const calcularFaltas = (funcionario: FuncionarioPonto, registros: RegistroPonto[]) => {
    const diasTrabalho = new Set(funcionario.dias_trabalho ?? []);
    if (diasTrabalho.size === 0 || registros.length === 0) return 0;
    const entradas = new Set(registros.filter((r) => r.tipo === 'entrada').map((r) => r.dia));
    const primeiroDia = registros.reduce((min, r) => (r.dia < min ? r.dia : min), registros[0].dia);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let total = 0;
    for (const data = new Date(relDataInicio + 'T00:00:00'); data < hoje; data.setDate(data.getDate() + 1)) {
      const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
      if (iso >= primeiroDia && iso <= relDataFim && diasTrabalho.has(data.getDay()) && !entradas.has(iso) && !diaNaoUtilNaData(iso)) total++;
    }
    return total;
  };

  const relatorioTodos = funcionarios.map((funcionario) => {
    const registros = relRegistrosTodos[funcionario.user_id] || [];
    const dias = montarDiasRel(funcionario, registros);
    const avaliados = dias.filter((d) => d.statusEntrada !== 'sem');
    const pontuaisFuncionario = avaliados.filter((d) => d.statusEntrada === 'pontual').length;
    const atrasosFuncionario = avaliados.filter((d) => d.statusEntrada === 'atraso').length;
    return {
      funcionario,
      dias,
      pontuais: pontuaisFuncionario,
      atrasos: atrasosFuncionario,
      percentual: avaliados.length ? Math.round((pontuaisFuncionario / avaliados.length) * 100) : null,
      faltas: calcularFaltas(funcionario, registros),
    };
  });
  const modoTodos = relFuncId === TODOS_FUNCIONARIOS;
  const totalDiasTodos = relatorioTodos.reduce((total, item) => total + item.dias.length, 0);

  const rotuloStatus = (s: DiaRel['statusEntrada']) => s === 'pontual' ? 'Pontual' : s === 'atraso' ? 'Atraso' : s === 'adiantado' ? 'Adiantado' : '-';
  const rotuloPeriodo = `${relDataInicio.slice(8, 10)}/${relDataInicio.slice(5, 7)}/${relDataInicio.slice(0, 4)} a ${relDataFim.slice(8, 10)}/${relDataFim.slice(5, 7)}/${relDataFim.slice(0, 4)}`;
  const slugNome = (t: string) => (t || 'funcionario').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const dataBr = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
  const resumoPontualidade = funcSel?.hora_entrada && temEscalaFixa(funcSel.dias_trabalho) ? `${pctPontual}% (${pontuais} pontuais, ${atrasos} atrasos de ${totalComHorario} dias)` : 'Não avaliada';
  const horarioPrevisto = funcSel?.hora_entrada ? `${funcSel.hora_entrada.slice(0, 5)} às ${funcSel.hora_saida ? funcSel.hora_saida.slice(0, 5) : '-'}` : 'Não definido';

  const gerarRelatorioXlsx = async () => {
    const XLSX = await import('xlsx');
    if (modoTodos) {
      const linhas = relatorioTodos.flatMap((item) => item.dias.length
        ? item.dias.map((d) => [item.funcionario.nome, formatarCpf(item.funcionario.cpf || item.funcionario.login), item.funcionario.cargo || '-', dataBr(d.dia), d.entrada || '--:--', d.saida || '--:--', d.distancia != null ? Math.round(d.distancia) : '', rotuloStatus(d.statusEntrada)])
        : [[item.funcionario.nome, formatarCpf(item.funcionario.cpf || item.funcionario.login), item.funcionario.cargo || '-', 'Sem registros', '', '', '', '']]);
      const ws = XLSX.utils.aoa_to_sheet([
        ['Relatório de Ponto - Todos os funcionários'],
        ['Período', rotuloPeriodo],
        [],
        ['Funcionário', 'CPF', 'Cargo', 'Data', 'Entrada', 'Saída', 'Distância (m)', 'Status'],
        ...linhas,
      ]);
      ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Todos');
      XLSX.writeFile(wb, `ponto_todos_${relDataInicio}_${relDataFim}.xlsx`);
      return;
    }
    if (!funcSel) return;
    const cabecalho = [
      ['Relatório de Ponto'],
      ['Funcionário', funcSel.nome],
      ['CPF', formatarCpf(funcSel.cpf || funcSel.login)],
      ['Cargo', funcSel.cargo || '-'],
      ['Período', rotuloPeriodo],
      ['Horário previsto', horarioPrevisto],
      ['Dias de trabalho', resumoDias(funcSel.dias_trabalho)],
      ['Pontualidade na entrada', resumoPontualidade],
      ['Faltas no período', String(faltas)],
      [],
      ['Data', 'Entrada', 'Saída', 'Distância (m)', 'Status'],
    ];
    const linhas = diasRel.map((d) => [dataBr(d.dia), d.entrada || '--:--', d.saida || '--:--', d.distancia != null ? Math.round(d.distancia) : '', rotuloStatus(d.statusEntrada)]);
    const ws = XLSX.utils.aoa_to_sheet([...cabecalho, ...linhas]);
    ws['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ponto');
    XLSX.writeFile(wb, `ponto_${slugNome(funcSel.nome)}_${relDataInicio}_${relDataFim}.xlsx`);
  };

  const gerarRelatorioPdf = () => {
    const esc = (t: string) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
    const corStatus = (s: DiaRel['statusEntrada']) => s === 'pontual' ? '#047857' : s === 'atraso' ? '#b91c1c' : s === 'adiantado' ? '#b45309' : '#64748b';
    if (modoTodos) {
      const secoes = relatorioTodos.map((item) => {
        const linhasFuncionario = item.dias.map((d) => `<tr><td>${dataBr(d.dia)}</td><td>${d.entrada || '--:--'}</td><td>${d.saida || '--:--'}</td><td>${d.distancia != null ? Math.round(d.distancia) + ' m' : '-'}</td><td style="color:${corStatus(d.statusEntrada)};font-weight:700">${rotuloStatus(d.statusEntrada)}</td></tr>`).join('');
        return `<section><h2>${esc(item.funcionario.nome)}</h2><p class="meta">${esc(item.funcionario.cargo || '-')} · CPF ${esc(formatarCpf(item.funcionario.cpf || item.funcionario.login))} · Faltas: ${item.faltas} · Pontualidade: ${item.percentual == null ? 'Não avaliada' : item.percentual + '%'}</p>${item.dias.length ? `<table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Distância</th><th>Status</th></tr></thead><tbody>${linhasFuncionario}</tbody></table>` : '<p class="vazio">Sem registros no período.</p>'}</section>`;
      }).join('');
      const htmlTodos = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Ponto - Todos os funcionários</title><style>*{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box}body{margin:24px;color:#0f172a}h1{font-size:20px;margin:0 0 2px}h2{font-size:15px;margin:20px 0 3px}.sub,.meta{color:#64748b;font-size:11px;margin:0 0 8px}section{break-inside:avoid}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f1f5f9;text-transform:uppercase;font-size:9px}.vazio{padding:10px;background:#f8fafc;color:#64748b;font-size:11px}.rod{margin-top:18px;color:#94a3b8;font-size:10px}</style></head><body><h1>Relatório de Ponto - Todos os funcionários</h1><p class="sub">${esc(rotuloPeriodo)}</p>${secoes}<p class="rod">Gerado pelo AvantaLab em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p><script>window.onload=function(){window.print();}</script></body></html>`;
      const janela = window.open('', '_blank');
      if (!janela) return;
      janela.document.open(); janela.document.write(htmlTodos); janela.document.close();
      return;
    }
    if (!funcSel) return;
    const linhas = diasRel.map((d) => `<tr><td>${dataBr(d.dia)}</td><td>${d.entrada || '--:--'}</td><td>${d.saida || '--:--'}</td><td>${d.distancia != null ? Math.round(d.distancia) + ' m' : '-'}</td><td style="color:${corStatus(d.statusEntrada)};font-weight:700">${rotuloStatus(d.statusEntrada)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Ponto - ${esc(funcSel.nome)}</title><style>
      *{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;box-sizing:border-box}body{margin:24px;color:#0f172a}
      h1{font-size:18px;margin:0 0 2px}.sub{color:#64748b;font-size:12px;margin:0 0 14px}
      .meta{font-size:12px;margin:2px 0}.meta b{display:inline-block;min-width:150px}
      table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
      th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left}th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
      .rod{margin-top:18px;color:#94a3b8;font-size:10px}
    </style></head><body>
      <h1>Relatório de Ponto</h1><p class="sub">${esc(rotuloPeriodo)}</p>
      <p class="meta"><b>Funcionário:</b> ${esc(funcSel.nome)}</p>
      <p class="meta"><b>CPF:</b> ${esc(formatarCpf(funcSel.cpf || funcSel.login))}</p>
      <p class="meta"><b>Cargo:</b> ${esc(funcSel.cargo || '-')}</p>
      <p class="meta"><b>Horário previsto:</b> ${esc(horarioPrevisto)}</p>
      <p class="meta"><b>Dias de trabalho:</b> ${esc(resumoDias(funcSel.dias_trabalho))}</p>
      <p class="meta"><b>Pontualidade na entrada:</b> ${esc(resumoPontualidade)}</p>
      <p class="meta"><b>Faltas no período:</b> ${faltas}</p>
      <table><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Distância</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table>
      <p class="rod">Gerado pelo AvantaLab em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Tolerância de pontualidade: ${TOLERANCIA_MIN} min.</p>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const capturarLocal = () => {
    setMsgLocal(null);
    if (!navigator.geolocation) { setMsgLocal({ tipo: 'erro', texto: 'Geolocalização indisponível neste navegador.' }); return; }
    setCapturando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)); setCapturando(false); setMsgLocal({ tipo: 'ok', texto: 'Localização capturada.' }); },
      () => { setCapturando(false); setMsgLocal({ tipo: 'erro', texto: 'Não foi possível obter a localização. Permita o acesso ou digite manualmente.' }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const salvarLocal = async () => {
    setMsgLocal(null);
    const la = parseFloat(lat), lo = parseFloat(lng), ra = parseInt(raio, 10);
    const raioNormalizado = isNaN(ra) || ra <= 0 ? 100 : Math.min(10000, ra);
    if (isNaN(la) || isNaN(lo)) { setMsgLocal({ tipo: 'erro', texto: 'Latitude/longitude inválidas.' }); return; }
    setSalvandoLocal(true);
    const r = await onSalvarConfig({ latitude: la, longitude: lo, raio_m: raioNormalizado });
    setSalvandoLocal(false);
    setRaio(String(raioNormalizado));
    setMsgLocal(r.erro ? { tipo: 'erro', texto: r.mensagem || 'Não foi possível salvar.' } : { tipo: 'ok', texto: 'Local da empresa salvo!' });
  };

  const salvarDiaNaoUtil = async () => {
    setMsgCalendario(null);
    if (!diaNaoUtilInicio || !diaNaoUtilFim) {
      setMsgCalendario({ tipo: 'erro', texto: 'Informe a data inicial e final.' });
      return;
    }
    if (diaNaoUtilFim < diaNaoUtilInicio) {
      setMsgCalendario({ tipo: 'erro', texto: 'A data final não pode ser anterior à inicial.' });
      return;
    }
    setSalvandoDiaNaoUtil(true);
    const r = await onCriarDiaNaoUtil({
      dataInicio: diaNaoUtilInicio,
      dataFim: diaNaoUtilFim,
      tipo: diaNaoUtilTipo,
      descricao: diaNaoUtilDescricao.trim(),
      recorrenteAnual: diaNaoUtilRecorrente,
    });
    setSalvandoDiaNaoUtil(false);
    if (r.erro) {
      setMsgCalendario({ tipo: 'erro', texto: r.mensagem || 'Não foi possível salvar.' });
      return;
    }
    setMsgCalendario({ tipo: 'ok', texto: 'Dia não útil salvo.' });
    const hoje = hojeISO();
    setDiaNaoUtilInicio(hoje);
    setDiaNaoUtilFim(hoje);
    setDiaNaoUtilTipo('empresa_fechada');
    setDiaNaoUtilDescricao('');
    setDiaNaoUtilRecorrente(false);
  };

  const excluirDiaNaoUtil = async (id: string) => {
    setMsgCalendario(null);
    setExcluindoDiaNaoUtilId(id);
    const r = await onExcluirDiaNaoUtil(id);
    setExcluindoDiaNaoUtilId(null);
    setMsgCalendario(r.erro
      ? { tipo: 'erro', texto: r.mensagem || 'Não foi possível excluir.' }
      : { tipo: 'ok', texto: 'Dia removido do calendário.' });
  };

  const rotuloTipoDiaNaoUtil = (tipo: string) => ({
    feriado: 'Feriado',
    empresa_fechada: 'Empresa fechada',
    recesso: 'Recesso',
    folga_coletiva: 'Folga coletiva',
    outro: 'Outro',
  }[tipo] || 'Dia não útil');

  const dataCurta = (iso: string) => {
    if (!iso) return '--/--';
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  };

  const carregarAuditoria = async () => {
    setAuditoriaCarregando(true);
    const [eventos, estadoAssinatura] = await Promise.all([onCarregarAuditoria(), onCarregarAssinatura()]);
    setAuditoria(eventos);
    setAssinatura(estadoAssinatura);
    setAuditoriaCarregando(false);
  };
  const carregarDocumentosRepP = async () => {
    setDocumentosRepPCarregando(true);
    setDocumentosRepP(await onCarregarDocumentosRepP());
    setDocumentosRepPCarregando(false);
  };
  const baixarAfd = async () => {
    setMsgConformidade(null);
    if (!afdInicio || !afdFim || afdFim < afdInicio) { setMsgConformidade({ tipo: 'erro', texto: 'Informe um período válido.' }); return; }
    setBaixandoAfd(true);
    const resultado = await onBaixarAfd(afdInicio, afdFim);
    setBaixandoAfd(false);
    if (!resultado.erro) void carregarDocumentosRepP();
    setMsgConformidade(resultado.erro ? { tipo: 'erro', texto: resultado.mensagem || 'Não foi possível gerar o AFD.' } : { tipo: 'ok', texto: 'Novo AFD gerado, baixado e preservado no histórico.' });
  };
  const baixarDocumentoRepP = async (documento: DocumentoRepP) => {
    setMsgConformidade(null);
    setBaixandoDocumentoId(documento.id);
    const resultado = await onBaixarDocumentoRepP(documento);
    setBaixandoDocumentoId(null);
    setMsgConformidade(resultado.erro ? { tipo: 'erro', texto: resultado.mensagem || 'Não foi possível baixar o documento.' } : { tipo: 'ok', texto: 'Documento baixado.' });
  };
  const prepararManualRepP = async () => {
    setMsgConformidade(null);
    setPreparandoManual(true);
    const resultado = await onPrepararManualRepP();
    setPreparandoManual(false);
    if (!resultado.erro) void carregarDocumentosRepP();
    setMsgConformidade(resultado.erro ? { tipo: 'erro', texto: resultado.mensagem || 'Não foi possível preparar o manual.' } : { tipo: 'ok', texto: 'Manual REP-P disponível em Documentos gerados.' });
  };
  const gerarEspelhoPonto = async () => { if (!funcSel) { setMsgConformidade({ tipo: 'erro', texto: 'Selecione um funcionário na aba Relatórios antes de gerar o Espelho.' }); return; } setGerandoEspelho(true); const resultado = await onGerarEspelhoPonto(funcSel.user_id, afdInicio, afdFim); setGerandoEspelho(false); if (!resultado.erro) void carregarDocumentosRepP(); setMsgConformidade(resultado.erro ? { tipo: 'erro', texto: resultado.mensagem || 'Não foi possível gerar o Espelho.' } : { tipo: 'ok', texto: 'Espelho gerado, baixado e preservado no histórico.' }); };
  const registrarTratamento = async () => {
    if (!tratamentoFuncionario || !tratamentoMotivo.trim() || (tratamentoTipo === 'ajuste' && !tratamentoHorario) || (tratamentoTipo === 'abono' && (!tratamentoMinutos || !tratamentoAnexo))) { setMsgTratamento({ tipo: 'erro', texto: tratamentoTipo === 'abono' ? 'Para abono, informe os minutos e anexe o comprovante.' : 'Informe funcionário, motivo e os dados obrigatórios.' }); return; }
    setSalvandoTratamento(true);
    const r = await onRegistrarTratamento({ acao: tratamentoTipo, funcionarioId: tratamentoFuncionario, data: tratamentoData, dataFim: tratamentoTipo === 'abono' ? tratamentoDataFim : undefined, tipo: tratamentoTipo === 'ajuste' ? 'inclusao' : 'abono_justificado', motivo: tratamentoMotivo.trim(), minutosAbonados: Number(tratamentoMinutos || 0), horario: tratamentoHorario, tipoMarcacao: tratamentoMarcacao, anexo: tratamentoAnexo });
    setSalvandoTratamento(false);
    setMsgTratamento({ tipo: r.erro ? 'erro' : 'ok', texto: r.erro ? r.mensagem || 'Não foi possível salvar.' : 'Solicitação registrada para aprovação.' });
    if (!r.erro) { setTratamentoMotivo(''); setTratamentoAnexo(null); setTratamentoHorario(''); void carregarTratamentos(); }
  };
  const cadastrarRegraBanco = async () => {
    const r = await onCadastrarBancoRegra({ nome: regraNome, vigenciaInicio: tratamentoData, acordoReferencia: regraAcordo, prazoCompensacaoDias: Number(regraPrazo), limiteMinutos: regraLimite ? Number(regraLimite) : undefined });
    setMsgTratamento({ tipo: r.erro ? 'erro' : 'ok', texto: r.erro ? r.mensagem || 'Não foi possível cadastrar a regra.' : 'Regra de banco de horas cadastrada.' });
    if (!r.erro) { setRegraNome(''); setRegraAcordo(''); setRegraPrazo('180'); setRegraLimite(''); void carregarTratamentos(); }
  };
  const lancarBancoHoras = async () => {
    const minutos = Number(bancoMinutos);
    const r = await onLancarBancoHoras({ funcionarioId: tratamentoFuncionario, data: tratamentoData, minutos, natureza: minutos >= 0 ? 'credito' : 'debito', motivo: bancoMotivo });
    setMsgTratamento({ tipo: r.erro ? 'erro' : 'ok', texto: r.erro ? r.mensagem || 'Não foi possível lançar.' : 'Lançamento de banco de horas registrado.' });
    if (!r.erro) { setBancoMinutos(''); setBancoMotivo(''); void carregarTratamentos(); }
  };
  const decidirTratamento = async (tipo: 'ajuste' | 'abono', item: TratamentoItemPonto, decisao: 'aprovado' | 'recusado' | 'cancelado') => {
    const motivo = motivosRecusa[item.id]?.trim() || '';
    if ((decisao === 'recusado' || decisao === 'cancelado') && !motivo) { setMsgTratamento({ tipo: 'erro', texto: 'Informe o motivo antes de concluir esta decisão.' }); return; }
    setDecidindoId(item.id); const r = await onDecidirTratamento(tipo, item.id, decisao, motivo); setDecidindoId(null);
    setMsgTratamento({ tipo: r.erro ? 'erro' : 'ok', texto: r.erro ? r.mensagem || 'Não foi possível registrar a decisão.' : decisao === 'aprovado' ? 'Tratamento aprovado.' : decisao === 'cancelado' ? 'Tratamento cancelado com trilha preservada.' : 'Tratamento recusado.' });
    if (!r.erro) void carregarTratamentos();
  };
  const gerarAej = async () => { setGerandoAej(true); const r = await onGerarAej(afdInicio, afdFim); setGerandoAej(false); if (!r.erro) void carregarDocumentosRepP(); setMsgConformidade({ tipo: r.erro ? 'erro' : 'ok', texto: r.erro ? r.mensagem || 'Não foi possível gerar o AEJ.' : 'AEJ de homologação gerado e preservado. A validade legal continua condicionada ao INPI e ao A1 ICP-Brasil.' }); };
  const formatarSaldo = (minutos: number) => `${minutos < 0 ? '-' : '+'}${String(Math.floor(Math.abs(minutos) / 60)).padStart(2, '0')}:${String(Math.abs(minutos) % 60).padStart(2, '0')}`;
  const abas: Array<[AbaPontoAdmin, string]> = [['lista', 'Funcionários'], ['novo', 'Novo'], ['local', 'Local'], ['calendario', 'Calendário'], ['relatorios', 'Relatórios'], ['tratamentos', 'Tratamentos'], ['auditoria', 'Auditoria'], ['conformidade', 'Conformidade']];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />

      <DraggableModalCard className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:max-h-[88vh] sm:max-w-4xl ${card}`}>
        <div
          data-modal-drag-handle
          className="flex shrink-0 cursor-grab items-start justify-between gap-3 px-5 py-4 text-white select-none active:cursor-grabbing"
          style={{ background: 'linear-gradient(135deg, #020617, #003E73)', cursor: 'grab' }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.65)' }}>Controle de Ponto</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white">Administração</h2>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
        </div>

        <div className={`relative z-10 flex max-w-full shrink-0 gap-2 overflow-x-auto border-b px-3 pt-3 sm:px-4 ${darkMode ? 'bg-slate-900' : 'bg-white'} ${itemBorda}`}>
          {abas.map(([a, label]) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAba(a);
                setMsg(null);
                if (a === 'tratamentos') void carregarTratamentos();
                setMsgLocal(null);
                setMsgCalendario(null);
                if (a === 'auditoria') void carregarAuditoria();
                if (a === 'conformidade') void carregarDocumentosRepP();
                if (listaScrollRef.current) listaScrollRef.current.scrollTop = 0;
              }}
              className="rounded-t-lg px-2.5 py-2 text-[11px] font-black uppercase tracking-wide"
              style={aba === a ? { color: corSistema, borderBottom: `2px solid ${corSistema}` } : { color: darkMode ? '#94a3b8' : '#64748b' }}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={listaScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {aba === 'lista' && (
            <div className="grid gap-3">
              <div className={`flex items-start justify-between gap-3 rounded-xl border p-2.5 ${itemBorda}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Link de acesso dos funcionários</p>
                  <p className="truncate text-sm font-bold" style={{ color: corSistema }}>{linkPonto}</p>
                  <p className={`text-[10px] ${textMuted}`}>Entram com CPF e senha · mesmo link p/ todas as empresas.</p>
                </div>
                <button type="button" onClick={copiarLinkPonto} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ backgroundColor: corSistema }}>{linkCopiado ? 'Copiado!' : 'Copiar'}</button>
              </div>
              {carregando ? (
                <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p>
              ) : funcionarios.length === 0 ? (
                <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Nenhum funcionário cadastrado. Use a aba "Novo".</p>
              ) : (
              <div className="grid gap-2">
                {funcionarios.map((f) => (
                  <div
                    key={f.id}
                    ref={editId === f.id ? cardEditRef : undefined}
                    className={`rounded-xl border p-3 ${itemBorda}`}
                    style={editId === f.id ? { borderColor: corSistema, borderWidth: 2 } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${darkMode ? 'bg-slate-700 text-slate-100' : 'bg-cyan-50 text-cyan-700'}`}>{(f.nome || '?').charAt(0).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{f.nome}</p>
                        <p className={`truncate text-xs ${textMuted}`}>{formatarCpf(f.cpf || f.login)}{f.cargo ? ' · ' + f.cargo : ''}{f.hora_entrada ? ' · ' + f.hora_entrada.slice(0, 5) + (f.hora_saida ? '–' + f.hora_saida.slice(0, 5) : '') : ''}</p>
                        <p className={`truncate text-[10px] ${textMuted}`}>{resumoDias(f.dias_trabalho)}</p>
                      </div>
                      {!f.ativo && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>Inativo</span>}
                      <button type="button" onClick={() => (editId === f.id ? setEditId(null) : abrirEdicao(f))} className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-wide" style={{ color: corSistema }}>{editId === f.id ? 'Fechar' : 'Editar'}</button>
                    </div>

                    {editId === f.id && (
                      <div className={`mt-3 grid gap-2 border-t pt-3 ${itemBorda}`}>
                        <label className={labelCls}>Nome
                          <input className={inputCls} value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Nome do funcionário" />
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className={labelCls}>CPF (login)
                            <input className={inputCls + (cpfEditInvalido ? ' border-red-500' : '')} value={formatarCpf(editCpf)} onChange={(e) => setEditCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" />
                          </label>
                          <label className={labelCls}>Cargo
                            <input className={inputCls} value={editCargo} onChange={(e) => setEditCargo(e.target.value)} placeholder="ex: Vendedor" />
                          </label>
                        </div>
                        {cpfEditInvalido
                          ? <span className="-mt-1 text-[11px] font-bold text-red-600">CPF inválido — confira os dígitos.</span>
                          : (!editCpf && <span className={`-mt-1 text-[10px] ${textMuted}`}>Defina um CPF para este funcionário passar a logar por CPF.</span>)}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className={labelCls}>Entrada
                            <input className={inputCls} type="time" value={editEntrada} onChange={(e) => setEditEntrada(e.target.value)} />
                          </label>
                          <label className={labelCls}>Saída
                            <input className={inputCls} type="time" value={editSaida} onChange={(e) => setEditSaida(e.target.value)} />
                          </label>
                        </div>
                        <div className="grid gap-1">
                          <span className={`text-[11px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Dias de trabalho</span>
                          {renderSeletorDias(editDias, setEditDias)}
                          {!temEscalaFixa(editDias) && <span className={`text-[10px] ${textMuted}`}>Sem dias marcados: escala variável, sem cálculo automático de faltas ou atrasos.</span>}
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold">
                          <input type="checkbox" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} className="h-4 w-4" />
                          Funcionário ativo
                        </label>
                        {!editAtivo && <p className={`text-[11px] font-semibold ${textMuted}`}>Ao salvar, o acesso e novas marcações serão bloqueados. O histórico será preservado.</p>}
                        <button type="button" onClick={() => salvarEdicao(f.user_id)} disabled={salvandoEdit} className="mt-1 h-10 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corSistema }}>{salvandoEdit ? 'Salvando...' : 'Salvar alterações'}</button>
                        {msgEdit && <p className="text-xs font-bold text-red-600">{msgEdit}</p>}

                        <div className={`mt-1 grid gap-2 border-t pt-3 ${itemBorda}`}>
                          <span className={`text-[11px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Alterar senha</span>
                          <div className="relative">
                            <input className={inputCls + ' pr-10'} type={verEditSenha ? 'text' : 'password'} value={editSenha} onChange={(e) => setEditSenha(e.target.value)} placeholder="Nova senha (mín. 8)" />
                            <button type="button" onClick={() => setVerEditSenha(!verEditSenha)} aria-label={verEditSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {verEditSenha ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21" /></svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              )}
                            </button>
                          </div>
                          <button type="button" onClick={() => salvarSenha(f.user_id)} disabled={salvandoSenha} className={`h-9 rounded-xl border text-xs font-black uppercase tracking-wide transition disabled:opacity-60 ${darkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>{salvandoSenha ? 'Salvando...' : 'Salvar nova senha'}</button>
                          {msgSenha && <p className={`text-xs font-bold ${msgSenha.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msgSenha.texto}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {aba === 'novo' && (
            <div className="grid gap-3">
              <label className={labelCls}>Nome
                <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do funcionário" />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={labelCls}>CPF (login)
                  <input className={inputCls + (cpfNovoInvalido ? ' border-red-500' : '')} value={formatarCpf(cpf)} onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" />
                  {cpfNovoInvalido && <span className="text-[11px] font-bold text-red-600">CPF inválido.</span>}
                </label>
                <label className={labelCls}>Cargo
                  <input className={inputCls} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="ex: Vendedor" />
                </label>
              </div>
              <label className={labelCls}>Senha (mín. 8)
                <div className="relative">
                  <input className={inputCls + ' pr-10'} type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha de acesso" />
                  <button type="button" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {verSenha ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={labelCls}>Entrada prevista
                  <input className={inputCls} type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} />
                </label>
                <label className={labelCls}>Saída prevista
                  <input className={inputCls} type="time" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} />
                </label>
              </div>
              <div className="grid gap-1">
                <span className={`text-[11px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Dias de trabalho</span>
                {renderSeletorDias(diasNovo, setDiasNovo)}
                {!temEscalaFixa(diasNovo) && <span className={`text-[10px] ${textMuted}`}>Sem dias marcados: escala variável, sem cálculo automático de faltas ou atrasos.</span>}
              </div>
              <button type="button" onClick={enviar} disabled={enviando} className="mt-1 h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corSistema }}>{enviando ? 'Cadastrando...' : 'Cadastrar funcionário'}</button>
              {msg && <p className={`text-xs font-bold ${msg.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.texto}</p>}
            </div>
          )}

          {aba === 'local' && (
            <div className="grid gap-3">
              <p className={`text-xs ${textMuted}`}>Defina a localização da empresa. O funcionário só consegue bater o ponto dentro do raio definido.</p>
              <button type="button" onClick={capturarLocal} disabled={capturando} className="h-10 rounded-xl border px-3 text-xs font-black uppercase tracking-wide transition disabled:opacity-60" style={{ borderColor: corSistema, color: corSistema }}>{capturando ? 'Capturando...' : 'Usar minha localização atual'}</button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={labelCls}>Latitude
                  <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-23.5..." />
                </label>
                <label className={labelCls}>Longitude
                  <input className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-46.6..." />
                </label>
              </div>
              <label className={labelCls}>Raio permitido (metros)
                <input className={inputCls} type="number" min="1" max="10000" value={raio} onChange={(e) => setRaio(e.target.value)} placeholder="100" />
              </label>
              <button type="button" onClick={salvarLocal} disabled={salvandoLocal} className="mt-1 h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corSistema }}>{salvandoLocal ? 'Salvando...' : 'Salvar local da empresa'}</button>
              {msgLocal && <p className={`text-xs font-bold ${msgLocal.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msgLocal.texto}</p>}
              <p className={`text-[11px] ${textMuted}`}>Dica: para pegar as coordenadas exatas, abra o Google Maps no local, toque/clique com o botão direito e copie a latitude/longitude.</p>
            </div>
          )}

          {aba === 'calendario' && (
            <div className="grid gap-3">
              <div className={`rounded-xl border p-3 ${itemBorda}`}>
                <p className={`text-[10px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Dias sem expediente</p>
                <p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Datas cadastradas aqui não entram como falta para os funcionários.</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={labelCls}>Data inicial
                  <input className={inputCls} type="date" value={diaNaoUtilInicio} onChange={(e) => {
                    setDiaNaoUtilInicio(e.target.value);
                    if (!diaNaoUtilFim || diaNaoUtilFim < e.target.value) setDiaNaoUtilFim(e.target.value);
                  }} />
                </label>
                <label className={labelCls}>Data final
                  <input className={inputCls} type="date" value={diaNaoUtilFim} onChange={(e) => setDiaNaoUtilFim(e.target.value)} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label className={labelCls}>Tipo
                  <select className={inputCls} value={diaNaoUtilTipo} onChange={(e) => setDiaNaoUtilTipo(e.target.value)}>
                    <option value="empresa_fechada">Empresa fechada</option>
                    <option value="feriado">Feriado</option>
                    <option value="recesso">Recesso</option>
                    <option value="folga_coletiva">Folga coletiva</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label className={labelCls}>Descrição
                  <input className={inputCls} value={diaNaoUtilDescricao} onChange={(e) => setDiaNaoUtilDescricao(e.target.value)} placeholder="Ex: Feriado municipal" />
                </label>
              </div>

              <label className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${itemBorda}`}>
                <input type="checkbox" checked={diaNaoUtilRecorrente} onChange={(e) => setDiaNaoUtilRecorrente(e.target.checked)} className="h-4 w-4" />
                Repetir todo ano nesta data
              </label>

              <button type="button" onClick={salvarDiaNaoUtil} disabled={salvandoDiaNaoUtil} className="h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: corSistema }}>
                {salvandoDiaNaoUtil ? 'Salvando...' : 'Salvar dia não útil'}
              </button>
              {msgCalendario && <p className={`text-xs font-bold ${msgCalendario.tipo === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msgCalendario.texto}</p>}

              <div className="mt-1 grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-black uppercase tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Calendário cadastrado</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{diasNaoUteis.length}</span>
                </div>
                {diasNaoUteisCarregando ? (
                  <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p>
                ) : diasNaoUteis.length === 0 ? (
                  <p className={`rounded-xl border p-4 text-center text-sm font-semibold ${itemBorda} ${textMuted}`}>Nenhum dia não útil cadastrado.</p>
                ) : (
                  diasNaoUteis.map((item) => (
                    <div key={item.id} className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${itemBorda}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-black">
                          {dataCurta(item.data_inicio)}{item.data_fim !== item.data_inicio ? ` até ${dataCurta(item.data_fim)}` : ''}
                        </p>
                        <p className={`mt-0.5 truncate text-xs font-bold ${textMuted}`}>
                          {rotuloTipoDiaNaoUtil(item.tipo)}{item.descricao ? ` · ${item.descricao}` : ''}
                        </p>
                        {item.recorrente_anual && <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-cyan-600">Repete todo ano</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => excluirDiaNaoUtil(item.id)}
                        disabled={excluindoDiaNaoUtilId === item.id}
                        className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition disabled:opacity-60 ${darkMode ? 'border-red-500/40 text-red-300 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                      >
                        {excluindoDiaNaoUtilId === item.id ? 'Removendo...' : 'Remover'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {aba === 'relatorios' && (
            <div className="grid gap-3">
              {/* Funcionário */}
              <select
                className={inputCls}
                value={relFuncId}
                onChange={(e) => setRelFuncId(e.target.value)}
              >
                <option value={TODOS_FUNCIONARIOS}>Todos os funcionários</option>
                {funcionarios.map((f) => <option key={f.user_id} value={f.user_id}>{f.nome}</option>)}
              </select>
              {funcSel && <p className={`-mt-1 text-[11px] font-bold ${textMuted}`}>CPF: {formatarCpf(funcSel.cpf || funcSel.login)}</p>}

              {/* Ano + Mês — estilo pill como no mobile */}
              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                {/* Ano pill */}
                <div className={`relative flex h-11 items-center gap-1.5 overflow-hidden rounded-2xl border px-2.5 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ color: corSistema }}><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="2"/><path d="M3.5 9h17M8 3v3M16 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <div className="leading-none">
                    <p className="text-sm font-black">{relAno}</p>
                    <p className="mt-0.5 text-[8px] font-black uppercase tracking-wide" style={{ color: corSistema }}>Ano</p>
                  </div>
                  <select
                    aria-label="Selecionar ano"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    style={{ fontSize: 16 }}
                    value={relAno}
                    onChange={(e) => {
                      const ano = Number(e.target.value);
                      setRelAno(ano);
                      aplicarMes(ano, relMesIdx);
                    }}
                  >
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Mês pill */}
                <div className={`flex h-11 items-center justify-between gap-1 rounded-2xl border px-1 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() => {
                      let mes = relMesIdx - 1, ano = relAno;
                      if (mes < 0) { mes = 11; ano = relAno - 1; setRelAno(ano); }
                      setRelMesIdx(mes);
                      aplicarMes(ano, mes);
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-black leading-none transition ${darkMode ? 'text-slate-300 hover:bg-slate-700 active:bg-slate-600' : 'text-slate-600 hover:bg-slate-200 active:bg-slate-300'}`}
                  >‹</button>
                  <span className="flex-1 truncate text-center text-sm font-black tracking-wide">{MESES_REL[relMesIdx]}</span>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() => {
                      let mes = relMesIdx + 1, ano = relAno;
                      if (mes > 11) { mes = 0; ano = relAno + 1; setRelAno(ano); }
                      setRelMesIdx(mes);
                      aplicarMes(ano, mes);
                    }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-black leading-none transition ${darkMode ? 'text-slate-300 hover:bg-slate-700 active:bg-slate-600' : 'text-slate-600 hover:bg-slate-200 active:bg-slate-300'}`}
                  >›</button>
                </div>
              </div>

              {/* Período personalizado */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={labelCls}>
                  De
                  <input className={inputCls} type="date" value={relDataInicio} onChange={(e) => setRelDataInicio(e.target.value)} />
                </label>
                <label className={labelCls}>
                  Até
                  <input className={inputCls} type="date" value={relDataFim} onChange={(e) => setRelDataFim(e.target.value)} />
                </label>
              </div>

              {/* Buscar */}
              <button
                type="button"
                onClick={() => carregarRelatorio(relFuncId)}
                disabled={!relFuncId || relCarregando}
                className="h-11 rounded-xl text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-40"
                style={{ backgroundColor: corSistema }}
              >
                {relCarregando ? 'Buscando...' : 'Buscar registros'}
              </button>

              {!relFuncId ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Selecione um funcionário para ver os registros.</p>
              ) : relCarregando ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p>
              ) : modoTodos && totalDiasTodos === 0 ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Nenhum funcionário possui registro no período.</p>
              ) : !modoTodos && diasRel.length === 0 ? (
                <p className={`py-6 text-center text-sm font-semibold ${textMuted}`}>Nenhum registro no período.</p>
              ) : (
                <>
                  {modoTodos ? (
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={gerarRelatorioXlsx} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-500">Excel</button>
                        <button type="button" onClick={gerarRelatorioPdf} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-rose-500">PDF</button>
                      </div>
                      {relatorioTodos.map((item) => (
                        <div key={item.funcionario.user_id} className={`rounded-xl border p-3 ${itemBorda}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">{item.funcionario.nome}</p>
                              <p className={`truncate text-[10px] ${textMuted}`}>{item.funcionario.cargo || 'Sem cargo'} · {item.dias.length} dia{item.dias.length === 1 ? '' : 's'} com registro</p>
                            </div>
                            <span className="shrink-0 text-xs font-black" style={{ color: item.percentual == null ? '#64748b' : corSistema }}>
                              {item.percentual == null ? '--' : `${item.percentual}%`}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                            <div className={`rounded-lg p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><p className="text-[9px] font-black uppercase text-emerald-600">Pontuais</p><p className="text-sm font-black">{item.pontuais}</p></div>
                            <div className={`rounded-lg p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><p className="text-[9px] font-black uppercase text-red-600">Atrasos</p><p className="text-sm font-black">{item.atrasos}</p></div>
                            <div className={`rounded-lg p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><p className="text-[9px] font-black uppercase text-amber-600">Faltas</p><p className="text-sm font-black">{item.faltas}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : funcSel?.hora_entrada && temEscalaFixa(funcSel.dias_trabalho) ? (
                    <div className={`grid gap-2 rounded-xl border p-3 ${itemBorda}`}>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span>Pontualidade na entrada</span>
                        <span style={{ color: corSistema }}>{pctPontual}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: darkMode ? '#334155' : '#e2e8f0' }}>
                        <div className="h-full rounded-full" style={{ width: pctPontual + '%', backgroundColor: '#10b981' }} />
                      </div>
                      <div className="flex gap-3 text-[11px] font-bold">
                        <span className="text-emerald-600">{pontuais} pontual{pontuais === 1 ? '' : 'is'}</span>
                        <span className="text-red-600">{atrasos} atraso{atrasos === 1 ? '' : 's'}</span>
                        <span className={textMuted}>de {totalComHorario} dia{totalComHorario === 1 ? '' : 's'}</span>
                      </div>
                      <p className={`text-[10px] ${textMuted}`}>Horário previsto: {funcSel.hora_entrada.slice(0, 5)} às {funcSel.hora_saida ? funcSel.hora_saida.slice(0, 5) : '—'} (tolerância {TOLERANCIA_MIN} min)</p>
                    </div>
                  ) : !temEscalaFixa(funcSel?.dias_trabalho) ? (
                    <p className={`rounded-xl border p-3 text-[11px] ${itemBorda} ${textMuted}`}>Escala variável — pontualidade, atrasos e faltas não são avaliados automaticamente.</p>
                  ) : (
                    <p className={`rounded-xl border p-3 text-[11px] ${itemBorda} ${textMuted}`}>Sem horário previsto cadastrado — a pontualidade não pode ser avaliada. Edite na lista de funcionários.</p>
                  )}

                  {!modoTodos && diasTrabSet.size > 0 && (
                    <div className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${itemBorda}`}>
                      <span className="text-xs font-black">Faltas no período</span>
                      <span className="text-sm font-black" style={{ color: faltas > 0 ? '#dc2626' : '#059669' }}>{faltas}</span>
                    </div>
                  )}

                  {!modoTodos && <div className="flex gap-2">
                    <button type="button" onClick={gerarRelatorioXlsx} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Excel
                    </button>
                    <button type="button" onClick={gerarRelatorioPdf} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-rose-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      PDF
                    </button>
                  </div>}

                  {!modoTodos && <div className="grid gap-1.5">
                    {diasRel.map((d) => (
                      <div key={d.dia} className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs ${itemBorda}`}>
                        <div className="w-14 shrink-0 font-black">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:grid-cols-4">
                            <span><strong className="block text-[8px] uppercase text-slate-400">Entrada</strong>{d.entrada || '--:--'}</span>
                            <span><strong className="block text-[8px] uppercase text-slate-400">Saída almoço</strong>{d.saidaAlmoco || '--:--'}</span>
                            <span><strong className="block text-[8px] uppercase text-slate-400">Retorno almoço</strong>{d.entradaAlmoco || '--:--'}</span>
                            <span><strong className="block text-[8px] uppercase text-slate-400">Saída</strong>{d.saida || '--:--'}</span>
                          </div>
                          {d.distancia != null && <p className={`text-[10px] ${textMuted}`}>{Math.round(d.distancia)}m da empresa</p>}
                        </div>
                        {d.statusEntrada !== 'sem' && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                            style={d.statusEntrada === 'pontual' ? { backgroundColor: '#d1fae5', color: '#047857' } : d.statusEntrada === 'atraso' ? { backgroundColor: '#fee2e2', color: '#b91c1c' } : { backgroundColor: '#fef3c7', color: '#b45309' }}>
                            {d.statusEntrada === 'pontual' ? 'Pontual' : d.statusEntrada === 'atraso' ? 'Atraso' : 'Adiant.'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>}
                </>
              )}
            </div>
          )}

          {aba === 'tratamentos' && (
            <div className="grid gap-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-black">Tratamentos de jornada</p><p className={`mt-1 text-xs ${textMuted}`}>A marcação original permanece imutável; solicitações e decisões formam uma trilha separada.</p></div>
                <button type="button" onClick={() => void carregarTratamentos()} disabled={tratamentosCarregando} className="min-h-11 shrink-0 rounded-lg px-3 text-[10px] font-black uppercase disabled:opacity-40" style={{ color: corSistema }}>{tratamentosCarregando ? 'Carregando...' : 'Atualizar'}</button>
              </div>

              <label className={labelCls}>Funcionário
                <select value={tratamentoFuncionario} onChange={(event) => setTratamentoFuncionario(event.target.value)} className={inputCls}><option value="">Selecione o funcionário</option>{funcionarios.filter((item) => item.ativo).map((item) => <option key={item.user_id} value={item.user_id}>{item.nome}</option>)}</select>
              </label>
              {tratamentoFuncionario && <p className={`rounded-xl border p-3 text-xs font-black ${itemBorda}`}>Saldo atual do banco: <span style={{ color: corSistema }}>{formatarSaldo(tratamentos.saldoPorFuncionario[tratamentoFuncionario] || 0)}</span></p>}

              <section className={`rounded-xl border p-4 ${itemBorda}`}>
                <p className="text-xs font-black">Nova solicitação</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className={labelCls}>Tipo<select value={tratamentoTipo} onChange={(event) => setTratamentoTipo(event.target.value as 'ajuste' | 'abono')} className={inputCls}><option value="ajuste">Inclusão de marcação</option><option value="abono">Abono justificado</option></select></label>
                  <label className={labelCls}>Data inicial<input type="date" value={tratamentoData} onChange={(event) => { setTratamentoData(event.target.value); if (tratamentoDataFim < event.target.value) setTratamentoDataFim(event.target.value); }} className={inputCls} /></label>
                  {tratamentoTipo === 'ajuste' ? <><label className={labelCls}>Horário<input type="time" value={tratamentoHorario} onChange={(event) => setTratamentoHorario(event.target.value)} className={inputCls} /></label><label className={labelCls}>Marcação<select value={tratamentoMarcacao} onChange={(event) => setTratamentoMarcacao(event.target.value as 'entrada' | 'saida')} className={inputCls}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label></> : <><label className={labelCls}>Data final<input type="date" min={tratamentoData} value={tratamentoDataFim} onChange={(event) => setTratamentoDataFim(event.target.value)} className={inputCls} /></label><label className={labelCls}>Minutos abonados<input type="number" min="1" value={tratamentoMinutos} onChange={(event) => setTratamentoMinutos(event.target.value)} className={inputCls} required /></label></>}
                </div>
                <label className={`${labelCls} mt-3`}>Motivo e justificativa<textarea value={tratamentoMotivo} onChange={(event) => setTratamentoMotivo(event.target.value)} className={`${inputCls} min-h-24 py-3 normal-case`} maxLength={500} /></label>
                <label className={`${labelCls} mt-3`}>Comprovante {tratamentoTipo === 'abono' ? '(obrigatório)' : '(opcional)'} — PDF, JPG ou PNG; até 5 MB<input key={tratamentoAnexo?.name || 'sem-anexo'} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setTratamentoAnexo(event.target.files?.[0] || null)} className={`min-h-12 w-full rounded-lg border p-2 text-xs normal-case ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`} /></label>
                <button type="button" onClick={() => void registrarTratamento()} disabled={salvandoTratamento || !tratamentoFuncionario || !tratamentoMotivo.trim()} className="mt-3 min-h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-40" style={{ backgroundColor: corSistema }}>{salvandoTratamento ? 'Enviando...' : 'Registrar para aprovação'}</button>
              </section>

              {msgTratamento && <p role="status" aria-live="polite" className={`rounded-lg px-3 py-2 text-xs font-bold ${msgTratamento.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msgTratamento.texto}</p>}

              <section className={`rounded-xl border p-4 ${itemBorda}`}>
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-black">Solicitações e decisões</p><span className={`text-[10px] ${textMuted}`}>{tratamentos.ajustes.length + tratamentos.abonos.length} registro(s)</span></div>
                <div className="mt-3 grid gap-3">
                  {tratamentosCarregando ? <p className={`py-6 text-center text-xs ${textMuted}`}>Carregando tratamentos...</p> : tratamentos.ajustes.length + tratamentos.abonos.length === 0 ? <p className={`rounded-lg border border-dashed p-4 text-center text-xs ${itemBorda} ${textMuted}`}>Nenhuma solicitação registrada.</p> : [...tratamentos.ajustes.map((item) => ({ item, tipo: 'ajuste' as const })), ...tratamentos.abonos.map((item) => ({ item, tipo: 'abono' as const }))].sort((a, b) => b.item.solicitado_em.localeCompare(a.item.solicitado_em)).map(({ item, tipo }) => {
                    const funcionario = funcionarios.find((registro) => registro.user_id === item.funcionario_user_id);
                    const situacao = item.situacao === 'aprovado' ? 'Aprovado' : item.situacao === 'recusado' ? 'Recusado' : item.situacao === 'cancelado' ? 'Cancelado' : 'Pendente';
                    return <article key={`${tipo}-${item.id}`} className={`rounded-xl border p-3 ${itemBorda}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black">{tipo === 'abono' ? 'Abono' : 'Ajuste'} · {funcionario?.nome || 'Funcionário'}</p><p className={`mt-1 text-[10px] ${textMuted}`}>{dataCurta(item.data_referencia || item.data_inicio || '')}{item.data_fim && item.data_fim !== item.data_inicio ? ` a ${dataCurta(item.data_fim)}` : ''} · {item.motivo}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.situacao === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : item.situacao === 'recusado' || item.situacao === 'cancelado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{situacao}</span></div>{item.comprovante_path && <button type="button" onClick={() => void onBaixarComprovanteTratamento(tipo, item)} className="mt-2 min-h-11 rounded-lg px-2 text-[10px] font-black uppercase" style={{ color: corSistema }}>Baixar comprovante</button>}{item.situacao === 'pendente' && <div className="mt-3 grid gap-2"><label className={labelCls}>Motivo da recusa ou cancelamento<input value={motivosRecusa[item.id] || ''} onChange={(event) => setMotivosRecusa((atual) => ({ ...atual, [item.id]: event.target.value }))} placeholder="Obrigatório para recusar ou cancelar" className={inputCls} maxLength={500} /></label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void decidirTratamento(tipo, item, 'recusado')} disabled={decidindoId === item.id} className="min-h-11 rounded-xl border border-red-300 text-xs font-black uppercase text-red-700 disabled:opacity-40">Recusar</button><button type="button" onClick={() => void decidirTratamento(tipo, item, 'aprovado')} disabled={decidindoId === item.id} className="min-h-11 rounded-xl text-xs font-black uppercase text-white disabled:opacity-40" style={{ backgroundColor: corSistema }}>Aprovar</button></div></div>}{item.situacao === 'aprovado' && <button type="button" onClick={() => void decidirTratamento(tipo, item, 'cancelado')} disabled={decidindoId === item.id} className="mt-3 min-h-11 rounded-xl border border-amber-300 px-3 text-[10px] font-black uppercase text-amber-800 disabled:opacity-40">Cancelar aprovação</button>}{item.decisao?.motivo && <p className={`mt-2 text-[10px] ${textMuted}`}>Decisão: {item.decisao.motivo}</p>}</article>;
                  })}
                </div>
              </section>

              <section className={`rounded-xl border p-4 ${itemBorda}`}>
                <p className="text-xs font-black">Banco de horas</p><p className={`mt-1 text-[11px] ${textMuted}`}>Créditos são positivos; débitos e compensações são negativos e entram no AEJ.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={labelCls}>Nome da regra<input value={regraNome} onChange={(event) => setRegraNome(event.target.value)} placeholder="Ex.: Acordo anual 2026" className={inputCls} /></label><label className={labelCls}>Instrumento / referência<input value={regraAcordo} onChange={(event) => setRegraAcordo(event.target.value)} placeholder="ACT, CCT ou acordo individual" className={inputCls} /></label><label className={labelCls}>Prazo de compensação (dias)<input type="number" min="1" max="365" value={regraPrazo} onChange={(event) => setRegraPrazo(event.target.value)} className={inputCls} /></label><label className={labelCls}>Limite de saldo (min; opcional)<input type="number" min="1" value={regraLimite} onChange={(event) => setRegraLimite(event.target.value)} className={inputCls} /></label></div>
                <button type="button" onClick={() => void cadastrarRegraBanco()} disabled={!regraNome.trim() || !regraAcordo.trim() || !regraPrazo} className="mt-3 min-h-11 w-full rounded-xl border text-xs font-black uppercase disabled:opacity-40" style={{ borderColor: corSistema, color: corSistema }}>Cadastrar regra com vigência na data selecionada</button>
                <p className={`mt-3 text-[10px] ${textMuted}`}>{tratamentos.regras.length ? `Regra vigente mais recente: ${tratamentos.regras[0].nome}.` : 'Nenhuma regra cadastrada; lançamentos permanecem bloqueados.'}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={labelCls}>Minutos (+ crédito / − débito)<input type="number" value={bancoMinutos} onChange={(event) => setBancoMinutos(event.target.value)} className={inputCls} /></label><label className={labelCls}>Motivo<input value={bancoMotivo} onChange={(event) => setBancoMotivo(event.target.value)} className={inputCls} maxLength={500} /></label></div>
                <button type="button" onClick={() => void lancarBancoHoras()} disabled={!tratamentoFuncionario || !bancoMinutos || !bancoMotivo.trim() || !tratamentos.regras.length} className="mt-3 min-h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-40" style={{ backgroundColor: corSistema }}>Lançar banco de horas</button>
                {tratamentoFuncionario && <div className="mt-3 grid gap-2">{tratamentos.lancamentos.filter((item) => item.funcionario_user_id === tratamentoFuncionario).slice(0, 5).map((item) => <div key={item.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] ${itemBorda}`}><span>{dataCurta(item.data_referencia)} · {item.motivo}</span><b className={item.minutos >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatarSaldo(item.minutos)}</b></div>)}</div>}
              </section>
            </div>
          )}
          {aba === 'auditoria' && (
            <div className="grid gap-2">
              <div className={`flex items-center justify-between rounded-xl border p-3 ${itemBorda}`}>
                <div><p className="text-sm font-black">Trilha de auditoria</p><p className={`text-[11px] ${textMuted}`}>Eventos imutáveis do Controle de Ponto.</p></div>
                <button type="button" onClick={() => void carregarAuditoria()} className="rounded-lg px-2 py-1 text-[10px] font-black uppercase" style={{ color: corSistema }}>Atualizar</button>
              </div>
              {assinatura && <div className={`rounded-xl border p-3 ${itemBorda}`}><p className="text-xs font-black">Assinatura legal: {assinatura.situacao === 'homologacao' ? 'Homologação' : assinatura.situacao === 'aguardando_validacao' ? 'Aguardando validação' : assinatura.situacao === 'certificado_vencido' ? 'Certificado vencido' : assinatura.situacao === 'certificado_invalido' ? 'Certificado inválido' : 'Não configurada'}</p><p className={`mt-1 text-[11px] ${textMuted}`}>{assinatura.mensagem}{assinatura.validadeCertificado ? ` Validade encerrada em ${new Date(assinatura.validadeCertificado).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.` : ''}</p></div>}
              {auditoriaCarregando ? <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Carregando...</p> : auditoria.length === 0 ? <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Nenhum evento registrado ainda.</p> : auditoria.map((item) => {
                const funcionario = funcionarios.find((f) => f.user_id === item.funcionario_user_id);
                const ator = funcionarios.find((f) => f.user_id === item.ator_user_id);
                const nomeAtor = typeof item.dados?.ator_nome === 'string' ? item.dados.ator_nome : ator?.nome;
                const titulo: Record<string, string> = { marcacao_registrada: 'Marcação registrada', funcionario_inativado: 'Funcionário inativado', funcionario_reativado: 'Funcionário reativado', funcionario_cadastrado: 'Funcionário cadastrado' };
                return <div key={item.id} className={`rounded-xl border p-3 ${itemBorda}`}><p className="text-xs font-black">{titulo[item.evento] || item.evento}</p><p className={`mt-1 text-[11px] ${textMuted}`}>{funcionario?.nome || 'Funcionário'} · {new Date(item.ocorrido_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p><p className={`text-[10px] ${textMuted}`}>Origem: {item.origem}{nomeAtor ? ` · Responsável: ${nomeAtor}` : ''}{item.motivo ? ` · ${item.motivo}` : ''}</p></div>;
              })}
            </div>
          )}
          {aba === 'conformidade' && (
            <div className="space-y-4 p-1">
              <div><p className="text-sm font-black">Conformidade REP-P</p><p className={`text-[11px] ${textMuted}`}>Documentos e evidências disponíveis para esta empresa.</p></div>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">Documentos gerados</p><p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Cada emissão fica preservada. Gerar novamente nunca substitui um documento anterior.</p></div><button type="button" onClick={() => void carregarDocumentosRepP()} disabled={documentosRepPCarregando} className="min-h-11 shrink-0 rounded-lg px-3 text-[10px] font-black uppercase" style={{ color: corSistema }} aria-label="Atualizar documentos gerados">Atualizar</button></div>
                <div className="mt-3 space-y-2">
                  {documentosRepPCarregando ? <p className={`py-4 text-center text-xs font-semibold ${textMuted}`}>Carregando documentos...</p> : documentosRepP.length === 0 ? <p className={`rounded-lg border border-dashed p-3 text-xs ${textMuted}`}>Nenhum documento REP-P foi gerado para esta empresa.</p> : documentosRepP.map((documento) => <div key={documento.id} className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${itemBorda}`}><div className="min-w-0"><p className="text-xs font-black">{documento.tipo === 'manual' ? 'Manual do sistema REP-P' : documento.tipo === 'espelho' ? `Espelho de Ponto · ${dataCurta(documento.periodo_inicio)} a ${dataCurta(documento.periodo_fim)}` : documento.tipo === 'aej' ? `AEJ · ${dataCurta(documento.periodo_inicio)} a ${dataCurta(documento.periodo_fim)}` : `AFD · ${dataCurta(documento.periodo_inicio)} a ${dataCurta(documento.periodo_fim)}`}</p><p className={`mt-1 truncate text-[10px] ${textMuted}`}>{new Date(documento.gerado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {documento.arquivo_nome}</p></div><button type="button" onClick={() => void baixarDocumentoRepP(documento)} disabled={baixandoDocumentoId === documento.id} className="min-h-11 rounded-lg px-3 text-[10px] font-black uppercase text-white disabled:opacity-40" style={{ backgroundColor: corSistema }}>{baixandoDocumentoId === documento.id ? 'Baixando...' : 'Baixar'}</button></div>)}
                </div>
              </section>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}><p className="text-sm font-black">Manual do sistema REP-P</p><p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Manual operacional versionado. Ele informa expressamente o estágio de homologação enquanto o INPI e o certificado de produção estiverem pendentes.</p><button type="button" onClick={() => void prepararManualRepP()} disabled={preparandoManual} className="mt-3 min-h-11 w-full rounded-lg border px-3 text-xs font-black uppercase disabled:opacity-40" style={{ borderColor: corSistema, color: corSistema }}>{preparandoManual ? 'Preparando...' : 'Disponibilizar manual'}</button></section>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}><p className="text-sm font-black">Espelho de Ponto Eletrônico</p><p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Selecione um funcionário na aba Relatórios e informe o período acima para gerar o Espelho assinado.</p><button type="button" onClick={() => void gerarEspelhoPonto()} disabled={gerandoEspelho || !funcSel} className="mt-3 min-h-11 w-full rounded-lg border px-3 text-xs font-black uppercase disabled:opacity-40" style={{ borderColor: corSistema, color: corSistema }}>{gerandoEspelho ? 'Gerando...' : 'Gerar Espelho'}</button></section>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm font-black">Gerar novo AFD</p><p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Inclui as marcações imutáveis do período e a assinatura destacada .p7s. Em homologação, o arquivo não possui validade legal.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-wide">Data inicial<input type="date" value={afdInicio} onChange={(event) => setAfdInicio(event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`} /></label><label className="text-[10px] font-black uppercase tracking-wide">Data final<input type="date" value={afdFim} onChange={(event) => setAfdFim(event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm ${darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'}`} /></label></div><button type="button" onClick={() => void baixarAfd()} disabled={baixandoAfd} className="mt-3 min-h-11 w-full rounded-lg bg-cyan-700 px-3 text-xs font-black uppercase text-white hover:bg-cyan-800 disabled:opacity-40">{baixandoAfd ? 'Gerando...' : 'Gerar novo AFD'}</button></section>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}><p className="text-sm font-black">Arquivo Eletrônico de Jornada (AEJ)</p><p className={`mt-1 text-xs leading-relaxed ${textMuted}`}>Gera o leiaute v001 em ISO-8859-1 com marcações, ajustes aprovados, horários contratuais e banco de horas, acompanhado da assinatura destacada .p7s.</p><button type="button" onClick={() => void gerarAej()} disabled={gerandoAej || !afdInicio || !afdFim || afdFim < afdInicio} className="mt-3 min-h-11 w-full rounded-lg border px-3 text-xs font-black uppercase disabled:opacity-40" style={{ borderColor: corSistema, color: corSistema }}>{gerandoAej ? 'Gerando...' : 'Gerar AEJ do período'}</button>{msgConformidade && <p role="status" aria-live="polite" className={`mt-2 text-xs font-bold ${msgConformidade.tipo === 'erro' ? 'text-red-600' : 'text-emerald-700'}`}>{msgConformidade.texto}</p>}</section>
              <section className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}><p className="text-sm font-black">Demais documentos</p><ul className={`mt-2 space-y-2 text-xs ${textMuted}`}><li><b className="text-amber-700">Pendente:</b> Atestado Técnico e Termo de Responsabilidade.</li><li><b className="text-amber-700">Dependência externa:</b> certificado de registro do software no INPI e certificado ICP-Brasil válido em produção.</li></ul></section>
            </div>
          )}
        </div>
      </DraggableModalCard>
    </div>
  );
}
