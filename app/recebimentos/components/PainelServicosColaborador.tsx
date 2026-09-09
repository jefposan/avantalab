'use client';

import { useMemo, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { AvaliacaoServico, Colaborador, Empresa, Servico, Subempresa } from './types';
import { COR_PRIMARIA, formatarData, formatarDataHora } from './helpers';
import FormularioServico from './FormularioServico';

type Props = { colaborador: Colaborador; empresas: Empresa[]; subempresas: Subempresa[]; servicos: Servico[]; onRegistrar: (empresaId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacao: string) => Promise<void> | void; };

export default function PainelServicosColaborador({ colaborador, empresas, subempresas, servicos, onRegistrar }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const avantaShell = criarAvantaShellPreset({ corPrimaria: COR_PRIMARIA, darkMode: false });
  const meus = useMemo(() => servicos.filter((item) => item.colaboradorId === colaborador.id), [colaborador.id, servicos]);
  const pendentes = useMemo(() => servicos.filter((item) => item.situacao === 'pendente' || item.situacao === 'atrasado'), [servicos]);
  const nomeCliente = (item: Servico) => item.subempresaId ? subempresas.find((sub) => sub.id === item.subempresaId)?.nome ?? '—' : empresas.find((empresa) => empresa.id === item.empresaId)?.nome ?? '—';
  return <div className={styles.mobileWrap}>
    <div className={`${styles.heroCard} ${styles.heroServicos}`}><div className={styles.heroTopo}><div className={styles.heroNome}>Olá, {colaborador.nome}</div><span className={styles.heroData}>Registro de serviços</span></div><div className={styles.heroStatGrid}><div className={styles.heroStat}><div className={styles.heroStatLabel}>Pendentes</div><div className={styles.heroStatValue}>{pendentes.length}</div></div><div className={styles.heroStat}><div className={styles.heroStatLabel}>Realizados</div><div className={styles.heroStatValue}>{meus.filter((item) => item.situacao === 'realizado').length}</div></div><div className={styles.heroStat}><div className={styles.heroStatLabel}>Atrasados</div><div className={styles.heroStatValue}>{pendentes.filter((item) => item.situacao === 'atrasado').length}</div></div></div><button type="button" className={`${styles.btn} ${styles.btnServicoPwa}`} onClick={() => { setSucesso(false); setFormAberto(true); }}>+ Registrar novo serviço</button></div>
    {formAberto && <div className={styles.servicoCardPwa}><AvantaCard title="Registrar serviços" hideDragHandle hideMenu style={avantaShell.cardStyle} bodyStyle={avantaShell.bodyStyle}><FormularioServico empresas={empresas} subempresas={subempresas} onCancelar={() => setFormAberto(false)} onConfirmar={async (...dados) => { await onRegistrar(...dados); setFormAberto(false); setSucesso(true); }} /></AvantaCard></div>}
    {sucesso && <div className={styles.sucessoServico} role="status"><b>Serviço registrado.</b> A avaliação do cliente já está disponível para a gestão.</div>}
    <div className={styles.servicoCardPwa}><AvantaCard title="Meus serviços realizados" hideDragHandle hideMenu style={avantaShell.cardStyle} bodyStyle={avantaShell.bodyStyle}>{meus.filter((item) => item.situacao === 'realizado').length === 0 ? <p className={styles.muted}>Nenhum serviço registrado ainda.</p> : meus.filter((item) => item.situacao === 'realizado').map((item) => <div key={item.id} className={styles.histCard}><strong>{nomeCliente(item)}</strong><span>{formatarData(item.dataProgramada)} · {formatarDataHora(item.realizadoEm)}</span><span>Avaliação: {item.avaliacao === 'bom' ? 'Bom' : 'Regular'}</span></div>)}</AvantaCard></div>
  </div>;
}
