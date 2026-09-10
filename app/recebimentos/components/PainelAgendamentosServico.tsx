'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { Empresa, Servico, Subempresa, TipoServico } from './types';
import { dataLocalIso, formatarData } from './helpers';
import FormularioAgendamentoServico from './FormularioAgendamentoServico';
import type { AbrirConfirmacaoFn } from '@/app/hooks/useUI';

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  servicos: Servico[];
  onAgendar: (empresaId: string, subempresaId: string | null, data: string, tipo: Exclude<TipoServico, 'rotina'>) => Promise<void> | void;
  onEditar: (id: string, empresaId: string, subempresaId: string | null, data: string, tipo: Exclude<TipoServico, 'rotina'>) => Promise<void> | void;
  onCancelar: (id: string) => Promise<void> | void;
  onConcluir: (id: string) => Promise<void> | void;
  onConfirmacao?: AbrirConfirmacaoFn;
};

const rotuloTipo = (tipo: TipoServico) => ({ interna: 'Interna', revisao: 'Revisão', extra: 'Extra', rotina: 'Rotina' })[tipo];

export default function PainelAgendamentosServico({ empresas, subempresas, servicos, onAgendar, onEditar, onCancelar, onConcluir, onConfirmacao }: Props) {
  const [aberto, setAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState<Servico | null>(null);
  const botaoNovo = useRef<HTMLButtonElement | null>(null);
  const botaoFechar = useRef<HTMLButtonElement | null>(null);
  const lista = useMemo(() => servicos
    .filter((item) => item.tipoServico !== 'rotina' && (item.situacao === 'pendente' || item.situacao === 'atrasado'))
    .sort((a, b) => a.dataProgramada.localeCompare(b.dataProgramada) || a.tipoServico.localeCompare(b.tipoServico)), [servicos]);
  const nomeEmpresa = (id: string) => empresas.find((item) => item.id === id)?.nome ?? '—';
  const nomeLocal = (item: Servico) => item.subempresaId ? subempresas.find((sub) => sub.id === item.subempresaId)?.nome ?? '—' : nomeEmpresa(item.empresaId);

  useEffect(() => {
    if (!aberto) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botaoFechar.current?.focus();
    function tecla(evento: KeyboardEvent) { if (evento.key === 'Escape') setAberto(false); }
    document.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', tecla); };
  }, [aberto]);

  function fechar() { setAberto(false); setAgendamentoEditando(null); window.requestAnimationFrame(() => botaoNovo.current?.focus()); }
  function abrirNovo() { setAgendamentoEditando(null); setAberto(true); }
  function abrirEdicao(item: Servico) { setAgendamentoEditando(item); setAberto(true); }
  function confirmarAcao(titulo: string, mensagem: string, textoConfirmar: string, variante: 'destrutiva' | 'primaria', acao: () => Promise<void> | void) {
    if (onConfirmacao) {
      onConfirmacao({ titulo, mensagem, textoConfirmar, variante, acao });
      return;
    }
    void acao();
  }
  const modal = aberto && typeof document !== 'undefined' ? createPortal(
    <div className={styles.modalAgendamentoOverlay} role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) fechar(); }}>
      <section className={styles.modalAgendamento} role="dialog" aria-modal="true" aria-labelledby="agendamento-titulo">
        <header><div><h2 id="agendamento-titulo">{agendamentoEditando ? 'Editar agendamento' : 'Novo agendamento'}</h2><p>{agendamentoEditando ? 'Atualize local, data ou tipo do atendimento manual.' : 'Crie um atendimento Interna, Revisão ou Extra.'}</p></div><button ref={botaoFechar} type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={fechar}>Fechar</button></header>
        <FormularioAgendamentoServico key={agendamentoEditando?.id ?? 'novo'} empresas={empresas} subempresas={subempresas} agendamentoInicial={agendamentoEditando ?? undefined} rotuloConfirmar={agendamentoEditando ? 'Salvar alterações' : 'Agendar serviço'} rotuloSalvando={agendamentoEditando ? 'Salvando…' : 'Agendando…'} onCancelar={fechar} onConfirmar={async (...dados) => { if (agendamentoEditando) await onEditar(agendamentoEditando.id, ...dados); else await onAgendar(...dados); fechar(); }} />
      </section>
    </div>, document.body) : null;

  return <section className={styles.servicosPainel} aria-label="Agendamentos de serviços">
    <div className={styles.servicosTitulo}><div><h3>Agendamentos</h3><p className={styles.agendamentosAjuda}>Serviços manuais aguardando execução.</p></div><div className={styles.servicosTituloAcoes}><span className={styles.servicosContagem}>{lista.length}</span><button ref={botaoNovo} type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={abrirNovo}>+ Novo agendamento</button></div></div>
    {lista.length === 0 ? <p className={styles.muted}>Não há agendamentos manuais pendentes.</p> : <div className={styles.servicosLista}>{lista.map((item) => <article className={styles.servicoItem} key={item.id}><div><strong>{nomeLocal(item)}</strong><span>{nomeEmpresa(item.empresaId)} · {formatarData(item.dataProgramada)}</span></div><div className={styles.agendamentoItemMeta}><span className={`${styles.tipoServicoBadge} ${styles[`tipoServico${item.tipoServico[0].toUpperCase()}${item.tipoServico.slice(1)}`]}`}>{rotuloTipo(item.tipoServico)}</span><span className={item.situacao === 'atrasado' ? styles.servicoAtrasado : styles.servicoSituacao}>{item.situacao === 'atrasado' ? 'Atrasado' : 'Pendente'}</span></div><div className={styles.agendamentoItemAcoes}><button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => abrirEdicao(item)}>Editar</button><button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={item.dataProgramada > dataLocalIso()} title={item.dataProgramada > dataLocalIso() ? 'O serviço só pode ser concluído a partir da data agendada.' : undefined} onClick={() => confirmarAcao('Concluir serviço agendado?', `O serviço em ${nomeLocal(item)} será registrado como concluído pela Gestão, sem assinatura ou avaliação do cliente.`, 'Concluir serviço', 'primaria', () => onConcluir(item.id))}>Concluir</button><button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => confirmarAcao('Cancelar agendamento?', `O agendamento de ${nomeLocal(item)} em ${formatarData(item.dataProgramada)} será removido. Serviços realizados e recebimentos não serão alterados.`, 'Cancelar agendamento', 'destrutiva', () => onCancelar(item.id))}>Cancelar</button></div></article>)}</div>}
    {modal}
  </section>;
}
