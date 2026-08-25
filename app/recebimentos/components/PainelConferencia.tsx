'use client';

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import { FORMAS_PAGAMENTO_RECEBIMENTO, type Colaborador, type Empresa, type FormaPagamentoRecebimento, type Recebimento, type Subempresa } from './types';
import { aguardandoConferencia, formatarDataHora, formatarMoeda, rotuloFormaPagamento, rotuloSituacao } from './helpers';
import type { ComprovanteRecebimento } from '../data/repo';
import BotaoComprovante from './BotaoComprovante';
import FiltroCompetencia from './FiltroCompetencia';
import IdentificacaoCliente from './IdentificacaoCliente';

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function rotuloCompetencia(vencimento: string): string {
  const [ano, mes] = vencimento.split('-');
  const indiceMes = Number(mes) - 1;
  const mesCurto = MESES_CURTOS[indiceMes] ?? '—';
  return `Competência · ${mesCurto}/${ano?.slice(-2) ?? '—'}`;
}

type Props = {
  podeConfirmar: boolean;
  darkMode: boolean;
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  onConfirmarBaixa: (id: string, formaPagamento?: FormaPagamentoRecebimento) => void;
  onObterComprovante: (id: string) => Promise<ComprovanteRecebimento>;
  onDevolver: (id: string, motivo: string) => void;
  onDivergencia: (id: string, motivo: string) => void;
  onEstornar: (id: string, motivo: string) => void;
  portalBusca?: HTMLElement | null;
};

export default function PainelConferencia({
  podeConfirmar, darkMode, empresas, subempresas, colaboradores, recebimentos,
  onConfirmarBaixa, onObterComprovante, onDevolver, onDivergencia, onEstornar, portalBusca,
}: Props) {
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [formasPagamento, setFormasPagamento] = useState<Record<string, FormaPagamentoRecebimento | ''>>({});
  const [busca, setBusca] = useState('');
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  });
  const [todosMeses, setTodosMeses] = useState(false);
  // Ação pendente por recebimento: revela o campo de motivo + botão Confirmar.
  // A ação só é efetivada ao confirmar.
  const [acaoMotivo, setAcaoMotivo] = useState<Record<string, 'devolver' | 'divergencia' | 'estornar' | null>>({});

  const chaveMes = `${mesReferencia.ano}-${String(mesReferencia.mes + 1).padStart(2, '0')}`;
  function mudarMes(delta: number) {
    setMesReferencia((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
    setTodosMeses(false);
  }

  // A fila inicia na competência atual. A opção Todos remove esse recorte;
  // as setas mantêm o filtro no mês de vencimento selecionado.
  const pendentes = useMemo(
    () => recebimentos.filter((r) =>
      aguardandoConferencia(r.situacao) && (todosMeses || r.vencimento.slice(0, 7) === chaveMes),
    ),
    [recebimentos, todosMeses, chaveMes],
  );

  const nomeEmpresa = useCallback((id: string) => empresas.find((e) => e.id === id)?.nome ?? '—', [empresas]);
  const nomeSub = useCallback((id: string | null) => id ? subempresas.find((s) => s.id === id)?.nome ?? '—' : 'Cliente direto', [subempresas]);
  const nomeColab = useCallback((id: string | null) => (id ? colaboradores.find((c) => c.id === id)?.nome ?? '—' : '—'), [colaboradores]);
  const termoBusca = busca.trim().toLocaleLowerCase('pt-BR');
  const pendentesFiltrados = useMemo(
    () => !termoBusca ? pendentes : pendentes.filter((r) =>
      `${nomeEmpresa(r.empresaId)} ${nomeSub(r.subempresaId)} ${nomeColab(r.colaboradorId)}`.toLocaleLowerCase('pt-BR').includes(termoBusca),
    ),
    [pendentes, termoBusca, nomeEmpresa, nomeSub, nomeColab],
  );

  const campoBusca = (
    <div className={styles.buscaFixa} role="search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" />
      </svg>
      <input className={styles.buscaFixaInput} placeholder="Pesquisar empresa ou cliente…" value={busca} onChange={(event) => setBusca(event.target.value)} aria-label="Pesquisar empresa, cliente ou colaborador" />
      {busca && <button type="button" className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar pesquisa">×</button>}
    </div>
  );

  return (
    <div className={`${styles.listaShell} ${styles.conferenciaLista}`}>
      {portalBusca && createPortal(campoBusca, portalBusca)}
      {/* Topo estático (fixo): título + aviso de permissão. */}
      <div>
        <div className={styles.conferenciaTopo}>
          <h3 className={styles.sectionTitle}>Conferência de recebimentos</h3>
          <FiltroCompetencia referencia={mesReferencia} todos={todosMeses} onMudarMes={mudarMes} onMostrarTodos={() => setTodosMeses(true)} />
        </div>
        {portalBusca === undefined && <div className={styles.conferenciaBuscaLocal}>{campoBusca}</div>}
        {!podeConfirmar && (
          <div className={styles.aviso} style={{ marginBottom: 14 }}>
            A confirmação de baixa é restrita a Gestor e Administrador.
          </div>
        )}
      </div>

      {/* Apenas a lista rola. */}
      <div className={styles.listaRolavel}>
      {pendentesFiltrados.length === 0 ? (
        <p className={styles.muted}>{busca ? 'Nenhum recebimento encontrado.' : 'Nenhum recebimento aguardando conferência.'}</p>
      ) : (
        pendentesFiltrados.map((r) => {
          const rot = rotuloSituacao(r.situacao);
          const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
          const formaPagamento = r.formaPagamento ?? formasPagamento[r.id] ?? '';
          return (
            <div key={r.id} className={`${styles.subItem} ${styles.conferenciaItem}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div className={styles.conferenciaIdentificacao}>
                    <IdentificacaoCliente recebimento={r} empresas={empresas} subempresas={subempresas} />
                    <span className={styles.competenciaPill}>{rotuloCompetencia(r.vencimento)}</span>
                  </div>
                  <div className={styles.subMeta}>Colaborador: {nomeColab(r.colaboradorId)} · {formatarDataHora(r.recebidoEm)}</div>
                </div>
                <span className={styles.badge} style={{ background: rot.fundo, color: rot.cor, height: 'fit-content' }}>{rot.texto}</span>
              </div>

              <div className={`${styles.readonlyBox} ${styles.conferenciaResumo}`}>
                <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem}`}><span>Valor contratado</span><span>{formatarMoeda(r.valorCombinado)}</span></div>
                <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem}`}><span>Valor declarado</span><span>{formatarMoeda(r.valorRecebido ?? 0)}</span></div>
                <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem}`}>
                  <span>Diferença</span>
                  <span style={{ color: dif === 0 ? '#166534' : dif < 0 ? '#b45309' : '#1e40af' }}>{formatarMoeda(dif)}</span>
                </div>
                <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem}`}>
                  <span>Forma de pagamento</span>
                  {r.formaPagamento ? (
                    <span>{rotuloFormaPagamento(r.formaPagamento)}</span>
                  ) : (
                    <select
                      className={`${styles.select} ${styles.selectFormaConferencia}`}
                      value={formaPagamento}
                      onChange={(event) => setFormasPagamento((atual) => ({
                        ...atual,
                        [r.id]: event.target.value as FormaPagamentoRecebimento | '',
                      }))}
                      aria-label="Forma de pagamento deste recebimento"
                    >
                      <option value="" disabled>Selecione…</option>
                      {FORMAS_PAGAMENTO_RECEBIMENTO.map(([valor, rotulo]) => (
                        <option key={valor} value={valor}>{rotulo}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem}`}>
                  <span>Comprovante</span>
                  <span>{r.temComprovante ? <BotaoComprovante lancamentoId={r.id} onObter={onObterComprovante} darkMode={darkMode} /> : 'Não anexado'}</span>
                </div>
                {r.observacao && <div className={`${styles.readonlyRow} ${styles.conferenciaResumoItem} ${styles.conferenciaObservacao}`}><span>Observação</span><span>{r.observacao}</span></div>}
              </div>

              {podeConfirmar && (() => {
                const acao = acaoMotivo[r.id] ?? null;
                const rotuloAcao = acao === 'devolver'
                  ? 'Devolver para correção'
                  : acao === 'estornar'
                    ? 'Estornar / reabrir'
                    : 'Registrar divergência';
                // Estornar exige motivo; devolver/divergência são opcionais.
                const motivoObrigatorio = acao === 'estornar';
                const motivoVazio = !(motivos[r.id] ?? '').trim();

                function abrirMotivo(tipo: 'devolver' | 'divergencia' | 'estornar') {
                  setAcaoMotivo((p) => ({ ...p, [r.id]: p[r.id] === tipo ? null : tipo }));
                }
                function confirmarAcao() {
                  const motivo = motivos[r.id] ?? '';
                  if (motivoObrigatorio && !motivo.trim()) return;
                  if (acao === 'devolver') onDevolver(r.id, motivo);
                  else if (acao === 'divergencia') onDivergencia(r.id, motivo);
                  else if (acao === 'estornar') onEstornar(r.id, motivo);
                  setAcaoMotivo((p) => ({ ...p, [r.id]: null }));
                  setMotivos((p) => ({ ...p, [r.id]: '' }));
                }

                return (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => abrirMotivo('devolver')}>Devolver para correção</button>
                      <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => abrirMotivo('divergencia')}>Registrar divergência</button>
                      {/* Estornar/reabrir ao lado direito de Registrar divergência. */}
                      <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => abrirMotivo('estornar')}>Estornar / Reabrir</button>
                      {/* Confirmar baixa fica à direita. */}
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`}
                        style={{ marginLeft: 'auto' }}
                        disabled={!formaPagamento}
                        onClick={() => onConfirmarBaixa(r.id, formaPagamento || undefined)}
                      >
                        Confirmar baixa
                      </button>
                    </div>

                    {acao && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          className={`${styles.input} ${styles.inputSm}`}
                          style={{ flex: 1, minWidth: 200 }}
                          placeholder={`Motivo${motivoObrigatorio ? ' (obrigatório)' : ''} — ${rotuloAcao.toLowerCase()}`}
                          value={motivos[r.id] ?? ''}
                          onChange={(e) => setMotivos((p) => ({ ...p, [r.id]: e.target.value }))}
                          autoFocus
                        />
                        <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setAcaoMotivo((p) => ({ ...p, [r.id]: null }))}>Cancelar</button>
                        <button
                          type="button"
                          className={`${styles.btn} ${acao === 'divergencia' || acao === 'estornar' ? styles.btnDanger : styles.btnPrimary} ${styles.btnSm}`}
                          disabled={motivoObrigatorio && motivoVazio}
                          onClick={confirmarAcao}
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })
      )}
      </div>
    </div>
  );
}
