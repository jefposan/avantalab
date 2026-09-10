'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { ComprovanteRecebimento } from '../data/repo';
import type { Colaborador, Empresa, Servico, Subempresa } from './types';
import { dataLocalIso, diferencaDiasIso, formatarData, formatarDataHora } from './helpers';
import FiltroCompetencia from './FiltroCompetencia';
import BotaoComprovante from './BotaoComprovante';

export type FiltroServico = 'realizados' | 'pendentes_servico' | 'atrasados_servico' | 'avisos_servico';

const rotuloTipoServico = (tipo: Servico['tipoServico']) => ({ rotina: 'Rotina', interna: 'Interna', revisao: 'Revisão', extra: 'Extra' })[tipo];

type Props = {
  filtro: FiltroServico;
  servicos: Servico[];
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  onConcluirAviso: (id: string) => void;
  onReabrirAviso: (id: string) => void;
  onObterAssinatura: (id: string) => Promise<ComprovanteRecebimento>;
  portalBusca?: HTMLElement | null;
  darkMode?: boolean;
};

function referenciaDoMes(iso: string | null) {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return { ano: data.getFullYear(), mes: data.getMonth() };
}

export default function PainelServicos({ filtro, servicos, empresas, subempresas, colaboradores, onConcluirAviso, onReabrirAviso, onObterAssinatura, portalBusca, darkMode = false }: Props) {
  const hoje = dataLocalIso();
  const [mesRealizados, setMesRealizados] = useState(() => {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() };
  });
  const [todosAvisos, setTodosAvisos] = useState(false);
  const [mesAvisos, setMesAvisos] = useState(() => {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() };
  });
  const [situacaoAvisos, setSituacaoAvisos] = useState<'pendentes' | 'concluidos' | 'todos'>('pendentes');
  const [buscaAvisos, setBuscaAvisos] = useState('');
  const [avisosExpandidos, setAvisosExpandidos] = useState<Set<string>>(() => new Set());
  const nomeEmpresa = (id: string) => empresas.find((item) => item.id === id)?.nome ?? '—';
  const nomeCliente = (servico: Servico) => servico.subempresaId ? subempresas.find((item) => item.id === servico.subempresaId)?.nome ?? '—' : nomeEmpresa(servico.empresaId);
  const nomeColaborador = (id: string | null) => id ? colaboradores.find((item) => item.id === id)?.nome ?? '—' : '—';
  const lista = useMemo(() => servicos.filter((servico) => {
    if (filtro === 'realizados') {
      const referencia = referenciaDoMes(servico.realizadoEm);
      return servico.situacao === 'realizado' && referencia?.ano === mesRealizados.ano && referencia.mes === mesRealizados.mes;
    }
    if (filtro === 'pendentes_servico') return servico.situacao === 'pendente'
      && servico.dataProgramada >= hoje
      && diferencaDiasIso(hoje, servico.dataProgramada) <= 10;
    if (filtro === 'atrasados_servico') return servico.situacao === 'atrasado' || (servico.situacao === 'pendente' && servico.dataProgramada < hoje);
    const referencia = referenciaDoMes(servico.realizadoEm);
    if (servico.avaliacao !== 'regular' || (!todosAvisos && (referencia?.ano !== mesAvisos.ano || referencia.mes !== mesAvisos.mes))) return false;
    if (situacaoAvisos === 'pendentes' && servico.avisoConcluidoEm) return false;
    if (situacaoAvisos === 'concluidos' && !servico.avisoConcluidoEm) return false;
    const busca = buscaAvisos.trim().toLocaleLowerCase('pt-BR');
    if (!busca) return true;
    return [nomeEmpresa(servico.empresaId), nomeCliente(servico), servico.clienteNome, servico.observacaoCliente]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca);
  }).sort((a, b) => {
    if (filtro === 'realizados') return (b.realizadoEm ?? '').localeCompare(a.realizadoEm ?? '');
    if (filtro === 'avisos_servico') {
      if (Boolean(a.avisoConcluidoEm) !== Boolean(b.avisoConcluidoEm)) return a.avisoConcluidoEm ? 1 : -1;
      return (b.realizadoEm ?? '').localeCompare(a.realizadoEm ?? '');
    }
    return filtro === 'atrasados_servico' ? a.dataProgramada.localeCompare(b.dataProgramada) : a.dataProgramada.localeCompare(b.dataProgramada);
  }), [buscaAvisos, filtro, hoje, mesAvisos, mesRealizados, servicos, situacaoAvisos, todosAvisos]);

  const titulo: Record<FiltroServico, string> = {
    realizados: 'Serviços realizados', pendentes_servico: 'Serviços pendentes · próximos 10 dias', atrasados_servico: 'Serviços atrasados', avisos_servico: 'Avisos de atendimento',
  };
  const vazio: Record<FiltroServico, string> = {
    realizados: 'Nenhum serviço realizado neste mês.', pendentes_servico: 'Não há serviços programados para os próximos 10 dias.', atrasados_servico: 'Não há serviços em atraso.', avisos_servico: 'Nenhuma avaliação regular encontrada com estes filtros.',
  };
  const mudarMesRealizados = (delta: number) => setMesRealizados((atual) => {
    const data = new Date(atual.ano, atual.mes + delta, 1);
    return { ano: data.getFullYear(), mes: data.getMonth() };
  });
  const mudarMesAvisos = (delta: number) => setMesAvisos((atual) => {
    const data = new Date(atual.ano, atual.mes + delta, 1);
    return { ano: data.getFullYear(), mes: data.getMonth() };
  });
  const avisosPendentesNoMes = useMemo(() => servicos.filter((servico) => {
    const referencia = referenciaDoMes(servico.realizadoEm);
    return servico.avaliacao === 'regular' && !servico.avisoConcluidoEm && (todosAvisos || (referencia?.ano === mesAvisos.ano && referencia.mes === mesAvisos.mes));
  }).length, [mesAvisos, servicos, todosAvisos]);
  const alternarObservacao = (servicoId: string) => setAvisosExpandidos((atuais) => {
    const proximos = new Set(atuais);
    if (proximos.has(servicoId)) proximos.delete(servicoId);
    else proximos.add(servicoId);
    return proximos;
  });
  const campoBuscaAvisos = (
    <div className={styles.buscaFixa} role="search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" />
      </svg>
      <input className={styles.buscaFixaInput} type="search" value={buscaAvisos} onChange={(event) => setBuscaAvisos(event.target.value)} placeholder="Pesquisar empresa ou cliente…" aria-label="Pesquisar empresa, cliente ou observação" />
      {buscaAvisos && <button type="button" className={styles.buscaLimpar} onClick={() => setBuscaAvisos('')} aria-label="Limpar pesquisa">×</button>}
    </div>
  );

  return <section className={styles.servicosPainel} aria-label={titulo[filtro]}>
    {filtro === 'avisos_servico' && portalBusca && createPortal(campoBuscaAvisos, portalBusca)}
    <div className={styles.servicosTitulo}>
      <h3>{titulo[filtro]}</h3>
      <div className={styles.servicosTituloAcoes}>
        {filtro === 'avisos_servico' && <label className={styles.filtroAvisoCampo}>
          <span>Exibir avisos</span>
          <select className={styles.select} value={situacaoAvisos} onChange={(event) => setSituacaoAvisos(event.target.value as typeof situacaoAvisos)}>
            <option value="pendentes">Pendentes</option>
            <option value="concluidos">Concluídos</option>
            <option value="todos">Todos</option>
          </select>
        </label>}
        {filtro === 'realizados' && <FiltroCompetencia referencia={mesRealizados} todos={false} onMudarMes={mudarMesRealizados} onMostrarTodos={() => undefined} mostrarTodos={false} />}
        {filtro === 'avisos_servico' && <FiltroCompetencia referencia={mesAvisos} todos={todosAvisos} onMudarMes={(delta) => { mudarMesAvisos(delta); setTodosAvisos(false); }} onMostrarTodos={() => setTodosAvisos(true)} />}
        <span className={styles.servicosContagem} aria-label={filtro === 'avisos_servico' ? `${avisosPendentesNoMes} avisos pendentes` : undefined}>{filtro === 'avisos_servico' ? avisosPendentesNoMes : lista.length}</span>
      </div>
    </div>
    {filtro === 'avisos_servico' && portalBusca === undefined && <div className={styles.conferenciaBuscaLocal}>{campoBuscaAvisos}</div>}
    {lista.length === 0 ? <p className={styles.muted}>{vazio[filtro]}</p> : <div className={styles.servicosLista}>
      {lista.map((servico) => {
        const possuiAssinatura = Boolean(servico.assinaturaArquivoPath || servico.assinatura);
        const observacao = servico.observacaoCliente || 'Nenhuma observação foi enviada pelo cliente.';
        const observacaoLonga = observacao.length > 280;
        const observacaoExpandida = avisosExpandidos.has(servico.id);
        return <article className={`${styles.servicoItem} ${filtro === 'avisos_servico' ? styles.servicoAviso : ''} ${filtro === 'realizados' ? styles.servicoRealizado : ''}`} key={servico.id}>
          {filtro === 'realizados' ? <>
            <div className={styles.servicoRealizadoDados}>
              <div><small>Empresa</small><strong>{nomeEmpresa(servico.empresaId)}</strong></div>
              <div><small>Local / vínculo</small><span>{nomeCliente(servico)}</span></div>
              <div><small>Realizado em</small><span>{formatarDataHora(servico.realizadoEm)}</span></div>
              <div><small>Registrado por</small><span>{servico.colaboradorId ? nomeColaborador(servico.colaboradorId) : 'Gestão'}</span></div>
              <div><small>Assinatura</small>{possuiAssinatura ? <BotaoComprovante lancamentoId={servico.id} onObter={onObterAssinatura} compacto darkMode={darkMode} titulo="Assinatura do serviço" rotulo="Visualizar assinatura" descricaoImagem={`Assinatura de ${servico.clienteNome || 'quem recebeu o atendimento'}`} /> : <span>{servico.clienteNome ? 'Não disponível' : 'Dispensada pela gestão'}</span>}<em>{servico.clienteNome ? `Assinada por ${servico.clienteNome}` : ''}</em></div>
              <div><small>Avaliação</small>{servico.avaliacao ? <span className={`${styles.avaliacaoSelo} ${servico.avaliacao === 'regular' ? styles.avaliacaoSeloRegular : styles.avaliacaoSeloBom}`}>{servico.avaliacao === 'regular' ? 'Regular' : 'Bom'}</span> : <span>Não registrada</span>}</div>
              {servico.tipoServico !== 'rotina' && <div><small>Tipo</small><span className={`${styles.tipoServicoBadge} ${styles[`tipoServico${servico.tipoServico[0].toUpperCase()}${servico.tipoServico.slice(1)}`]}`}>{rotuloTipoServico(servico.tipoServico)}</span></div>}
            </div>
            {servico.observacaoCliente && <p className={styles.servicoObservacao}>Observação do cliente: {servico.observacaoCliente}</p>}
          </> : filtro === 'avisos_servico' ? <>
            <div className={styles.avisoServicoDados}>
              <div><small>Empresa</small><strong>{nomeEmpresa(servico.empresaId)}</strong><span>{nomeCliente(servico)}</span></div>
              <div><small>Avaliado por</small><strong>{servico.clienteNome || 'Não informado'}</strong></div>
              <div><small>Realizado em</small><span>{formatarDataHora(servico.realizadoEm)}</span></div>
              <div><small>Avaliação</small><span className={`${styles.avaliacaoSelo} ${styles.avaliacaoSeloRegular}`}>Regular</span></div>
              <div><small>Tratamento</small><span className={`${styles.avisoSituacao} ${servico.avisoConcluidoEm ? styles.avisoSituacaoConcluido : styles.avisoSituacaoPendente}`}>{servico.avisoConcluidoEm ? 'Concluído' : 'Pendente'}</span></div>
            </div>
            <div className={styles.avisoObservacao}>
              <small>Observação</small>
              <p>{observacaoLonga && !observacaoExpandida ? `${observacao.slice(0, 280)}…` : observacao}</p>
              {observacaoLonga && <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => alternarObservacao(servico.id)} aria-expanded={observacaoExpandida}>{observacaoExpandida ? 'Mostrar menos' : 'Ler observação completa'}</button>}
            </div>
            <div className={styles.acoesAviso}>
              {servico.avisoConcluidoEm
                ? <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onReabrirAviso(servico.id)}>Reabrir como pendente</button>
                : <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => onConcluirAviso(servico.id)}>Marcar como concluído</button>}
            </div>
          </> : <>
            <div>
              <strong>{nomeCliente(servico)}</strong>
              <span>{nomeEmpresa(servico.empresaId)} · Programado: {formatarData(servico.dataProgramada)}</span>
              {servico.tipoServico !== 'rotina' && <span className={`${styles.tipoServicoBadge} ${styles[`tipoServico${servico.tipoServico[0].toUpperCase()}${servico.tipoServico.slice(1)}`]}`}>{rotuloTipoServico(servico.tipoServico)}</span>}
              {servico.situacao === 'realizado' && <span>Realizado por {nomeColaborador(servico.colaboradorId)} em {formatarDataHora(servico.realizadoEm)}</span>}
            </div>
            <span className={styles.servicoSituacao}>{servico.situacao === 'realizado' ? 'Realizado' : servico.situacao === 'atrasado' ? 'Atrasado' : 'Pendente'}</span>
          </>}
        </article>;
      })}
    </div>}
  </section>;
}
