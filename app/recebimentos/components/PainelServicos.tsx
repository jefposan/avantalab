'use client';

import { useMemo } from 'react';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Servico, Subempresa } from './types';
import { formatarData, formatarDataHora } from './helpers';

export type FiltroServico = 'realizados' | 'pendentes_servico' | 'atrasados_servico' | 'avisos_servico';

type Props = {
  filtro: FiltroServico;
  servicos: Servico[];
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  onConcluirAviso: (id: string) => void;
};

export default function PainelServicos({ filtro, servicos, empresas, subempresas, colaboradores, onConcluirAviso }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const lista = useMemo(() => servicos.filter((servico) => {
    if (filtro === 'realizados') return servico.situacao === 'realizado';
    if (filtro === 'pendentes_servico') return servico.situacao === 'pendente' && servico.dataProgramada >= hoje;
    if (filtro === 'atrasados_servico') return servico.situacao === 'atrasado' || (servico.situacao === 'pendente' && servico.dataProgramada < hoje);
    return servico.avaliacao === 'regular' && !servico.avisoConcluidoEm;
  }).sort((a, b) => b.dataProgramada.localeCompare(a.dataProgramada)), [filtro, hoje, servicos]);

  const titulo: Record<FiltroServico, string> = {
    realizados: 'Serviços realizados', pendentes_servico: 'Serviços pendentes', atrasados_servico: 'Serviços atrasados', avisos_servico: 'Avisos de atendimento',
  };
  const vazio: Record<FiltroServico, string> = {
    realizados: 'Nenhum serviço realizado ainda.', pendentes_servico: 'Não há serviços pendentes nesta semana.', atrasados_servico: 'Não há serviços em atraso.', avisos_servico: 'Não há avaliações regulares aguardando tratamento.',
  };
  const nomeEmpresa = (id: string) => empresas.find((item) => item.id === id)?.nome ?? '—';
  const nomeCliente = (servico: Servico) => servico.subempresaId ? subempresas.find((item) => item.id === servico.subempresaId)?.nome ?? '—' : nomeEmpresa(servico.empresaId);
  const nomeColaborador = (id: string | null) => id ? colaboradores.find((item) => item.id === id)?.nome ?? '—' : '—';

  return <section className={styles.servicosPainel} aria-label={titulo[filtro]}>
    <div className={styles.servicosTitulo}><h3>{titulo[filtro]}</h3><span>{lista.length}</span></div>
    {lista.length === 0 ? <p className={styles.muted}>{vazio[filtro]}</p> : <div className={styles.servicosLista}>
      {lista.map((servico) => <article className={`${styles.servicoItem} ${filtro === 'avisos_servico' ? styles.servicoAviso : ''}`} key={servico.id}>
        <div>
          <strong>{nomeCliente(servico)}</strong>
          <span>{nomeEmpresa(servico.empresaId)} · Programado: {formatarData(servico.dataProgramada)}</span>
          {servico.situacao === 'realizado' && <span>Realizado por {nomeColaborador(servico.colaboradorId)} em {formatarDataHora(servico.realizadoEm)}</span>}
          {filtro === 'avisos_servico' && <p>{servico.observacaoCliente || 'O cliente avaliou o atendimento como regular, sem observação.'}</p>}
        </div>
        {filtro === 'avisos_servico' ? <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => onConcluirAviso(servico.id)}>Concluir tratamento</button> : <span className={styles.servicoSituacao}>{servico.situacao === 'realizado' ? 'Realizado' : servico.situacao === 'atrasado' ? 'Atrasado' : 'Pendente'}</span>}
      </article>)}
    </div>}
  </section>;
}
