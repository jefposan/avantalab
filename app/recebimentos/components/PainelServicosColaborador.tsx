'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { AvaliacaoServico, Colaborador, Empresa, Servico, Subempresa, TipoServico } from './types';
import { COR_PRIMARIA, formatarData, formatarDataHora } from './helpers';
import FormularioServico from './FormularioServico';
import FormularioAgendamentoServico from './FormularioAgendamentoServico';
import type { PreparacaoRegistroServicoVoz } from '../voice/types';

export type ResultadoRegistroServico = 'confirmado' | 'pendente_sincronizacao';

type Props = { colaborador: Colaborador; empresas: Empresa[]; subempresas: Subempresa[]; servicos: Servico[]; podeRegistrar: boolean; podeAgendar: boolean; registroInicial?: PreparacaoRegistroServicoVoz | null; onRegistroInicialConsumido?: () => void; onServicoSalvoOffline?: () => void; onRegistrar: (empresaId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacao: string, servicoId?: string) => Promise<ResultadoRegistroServico> | ResultadoRegistroServico; onAgendar: (empresaId: string, subempresaId: string | null, data: string, tipo: Exclude<TipoServico, 'rotina'>) => Promise<void> | void; };

export default function PainelServicosColaborador({ colaborador, empresas, subempresas, servicos, podeRegistrar, podeAgendar, registroInicial, onRegistroInicialConsumido, onServicoSalvoOffline, onRegistrar, onAgendar }: Props) {
  const [formAberto, setFormAberto] = useState(podeRegistrar);
  const [sucesso, setSucesso] = useState(false);
  const continuarRef = useRef<HTMLButtonElement | null>(null);
  const [acaoAtiva, setAcaoAtiva] = useState<'registrar' | 'realizados' | 'agendar' | null>(podeRegistrar ? 'registrar' : podeAgendar ? 'agendar' : 'realizados');
  const [registroPreparado, setRegistroPreparado] = useState<PreparacaoRegistroServicoVoz | null>(registroInicial ?? null);
  const avantaShell = criarAvantaShellPreset({ corPrimaria: COR_PRIMARIA, darkMode: false });
  const meus = useMemo(() => servicos.filter((item) => item.colaboradorId === colaborador.id), [colaborador.id, servicos]);
  const meusRealizados = useMemo(() => meus.filter((item) => item.situacao === 'realizado'), [meus]);
  const pendentes = useMemo(() => servicos.filter((item) => item.situacao === 'pendente' || item.situacao === 'atrasado'), [servicos]);
  const nomeCliente = (item: Servico) => item.subempresaId ? subempresas.find((sub) => sub.id === item.subempresaId)?.nome ?? '—' : empresas.find((empresa) => empresa.id === item.empresaId)?.nome ?? '—';

  useEffect(() => {
    if (!sucesso) return;
    const quadro = window.requestAnimationFrame(() => continuarRef.current?.focus());
    const manterFoco = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') { setSucesso(false); return; }
      if (evento.key === 'Tab') { evento.preventDefault(); continuarRef.current?.focus(); }
    };
    window.addEventListener('keydown', manterFoco);
    return () => { window.cancelAnimationFrame(quadro); window.removeEventListener('keydown', manterFoco); };
  }, [sucesso]);
  useEffect(() => {
    if (!registroInicial) return;
    setRegistroPreparado(registroInicial);
    setAcaoAtiva('registrar');
    setSucesso(false);
    setFormAberto(true);
    onRegistroInicialConsumido?.();
  }, [registroInicial?.requestId]);
  function selecionarRegistro() {
    setRegistroPreparado(null);
    setAcaoAtiva('registrar');
    setSucesso(false);
    setFormAberto(true);
  }

  function selecionarRealizados() {
    setRegistroPreparado(null);
    setAcaoAtiva('realizados');
    setSucesso(false);
    setFormAberto(false);
  }
  function selecionarAgendamento() {
    setRegistroPreparado(null);
    setAcaoAtiva('agendar');
    setSucesso(false);
    setFormAberto(false);
  }

  return <div className={styles.mobileWrap}>
    <div className={`${styles.heroCard} ${styles.heroServicos}`}><div className={styles.heroTopo}><div className={styles.heroNome}>Olá, {colaborador.nome}</div><span className={styles.heroData}>Registro de serviços</span></div><div className={styles.heroStatGrid}><div className={styles.heroStat}><div className={styles.heroStatLabel}>Pendentes</div><div className={styles.heroStatValue}>{pendentes.length}</div></div><div className={styles.heroStat}><div className={styles.heroStatLabel}>Realizados</div><div className={styles.heroStatValue}>{meusRealizados.length}</div></div><div className={styles.heroStat}><div className={styles.heroStatLabel}>Atrasados</div><div className={styles.heroStatValue}>{pendentes.filter((item) => item.situacao === 'atrasado').length}</div></div></div><div className={styles.acoesServicoPwa}>{podeRegistrar && <button type="button" className={`${styles.btn} ${styles.btnServicoPwa}`} data-ativa={acaoAtiva === 'registrar'} aria-expanded={acaoAtiva === 'registrar'} aria-controls="servico-registro" onClick={selecionarRegistro}>+ Registrar novo serviço</button>}<div className={styles.acoesServicoPwaSecundarias}><button type="button" className={`${styles.btn} ${styles.btnServicoPwaSecundario}`} data-ativa={acaoAtiva === 'realizados'} aria-expanded={acaoAtiva === 'realizados'} aria-controls="servicos-realizados" onClick={selecionarRealizados}>Serviços realizados</button>{podeAgendar && <button type="button" className={`${styles.btn} ${styles.btnServicoPwaSecundario}`} data-ativa={acaoAtiva === 'agendar'} aria-expanded={acaoAtiva === 'agendar'} aria-controls="servico-agendamento" onClick={selecionarAgendamento}>Agendar serviço</button>}</div></div></div>
    {acaoAtiva === 'registrar' && formAberto && <div id="servico-registro" className={styles.servicoCardPwa}><AvantaCard title="Registrar serviços" hideDragHandle hideMenu style={avantaShell.cardStyle} bodyStyle={avantaShell.bodyStyle}><FormularioServico empresas={empresas} subempresas={subempresas} servicos={servicos} selecaoInicial={registroPreparado} onCancelar={() => { setRegistroPreparado(null); setFormAberto(false); setAcaoAtiva(null); }} onConfirmar={async (...dados) => { const resultado = await onRegistrar(...dados); setRegistroPreparado(null); setFormAberto(false); setAcaoAtiva(null); if (resultado === 'pendente_sincronizacao') { onServicoSalvoOffline?.(); return; } setSucesso(true); }} /></AvantaCard></div>}
    {sucesso && <div className={styles.sucessoServicoOverlay} role="presentation"><div className={styles.sucessoServico} role="dialog" aria-modal="true" aria-labelledby="operacao-concluida-titulo"><AvantaCard className={styles.sucessoServicoCard} title={<span id="operacao-concluida-titulo">Operação concluída</span>} titleClassName={styles.sucessoServicoTitulo} hideTitleAccent centerTitle hideDragHandle hideMenu style={{ ...avantaShell.cardStyle, ['--plato-w' as string]: '0%', ['--avanta-title-left' as string]: '30px', ['--avanta-tras-bg' as string]: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', ['--avanta-tras-overlay' as string]: 'none', ['--avanta-front-bg' as string]: '#fbfffc', ['--avanta-body-bg' as string]: '#fbfffc', ['--avanta-title-color' as string]: '#166534' }} bodyStyle={{ ...avantaShell.bodyStyle, background: '#fbfffc' }}><p>O serviço foi atualizado e já está disponível para a gestão.</p><button ref={continuarRef} type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setSucesso(false)}>Continuar</button></AvantaCard></div></div>}
    {acaoAtiva === 'realizados' && <div id="servicos-realizados" className={styles.servicoCardPwa}><AvantaCard title="Meus serviços realizados" hideDragHandle hideMenu style={avantaShell.cardStyle} bodyStyle={avantaShell.bodyStyle}>{meusRealizados.length === 0 ? <p className={styles.muted}>Nenhum serviço registrado ainda.</p> : meusRealizados.map((item) => <div key={item.id} className={styles.histCard}><strong>{nomeCliente(item)}</strong><span>{formatarData(item.dataProgramada)} · {formatarDataHora(item.realizadoEm)}</span><span>Avaliação: {item.avaliacao === 'bom' ? 'Bom' : 'Regular'}</span></div>)}</AvantaCard></div>}
    {acaoAtiva === 'agendar' && <div id="servico-agendamento" className={styles.servicoCardPwa}><AvantaCard title="Agendar serviço" hideDragHandle hideMenu style={avantaShell.cardStyle} bodyStyle={avantaShell.bodyStyle}><FormularioAgendamentoServico empresas={empresas} subempresas={subempresas} onCancelar={() => setAcaoAtiva(null)} onConfirmar={async (...dados) => { await onAgendar(...dados); setAcaoAtiva(null); setSucesso(true); }} /></AvantaCard></div>}
  </div>;
}
