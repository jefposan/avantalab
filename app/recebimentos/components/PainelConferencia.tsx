'use client';

import { useMemo, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Recebimento, Subempresa } from './types';
import { aguardandoConferencia, formatarDataHora, formatarMoeda, rotuloSituacao } from './helpers';

type Props = {
  podeConfirmar: boolean;
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  onConfirmarBaixa: (id: string) => void;
  onDevolver: (id: string, motivo: string) => void;
  onDivergencia: (id: string, motivo: string) => void;
  onEstornar: (id: string, motivo: string) => void;
};

export default function PainelConferencia({
  podeConfirmar, empresas, subempresas, colaboradores, recebimentos,
  onConfirmarBaixa, onDevolver, onDivergencia, onEstornar,
}: Props) {
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  // Ação pendente por recebimento: revela o campo de motivo + botão Confirmar.
  // A ação só é efetivada ao confirmar.
  const [acaoMotivo, setAcaoMotivo] = useState<Record<string, 'devolver' | 'divergencia' | 'estornar' | null>>({});

  // A conferência é uma fila operacional única, sem recorte por competência.
  const pendentes = useMemo(
    () => recebimentos.filter((r) => aguardandoConferencia(r.situacao)),
    [recebimentos],
  );

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—';
  const nomeSub = (id: string) => subempresas.find((s) => s.id === id)?.nome ?? '—';
  const nomeColab = (id: string | null) => (id ? colaboradores.find((c) => c.id === id)?.nome ?? '—' : '—');

  return (
    <div className={styles.listaShell}>
      {/* Topo estático (fixo): título + aviso de permissão. */}
      <div>
        <h3 className={styles.sectionTitle} style={{ marginBottom: podeConfirmar ? 12 : 0 }}>Conferência de recebimentos</h3>
        {!podeConfirmar && (
          <div className={styles.aviso} style={{ marginBottom: 14 }}>
            A confirmação de baixa é restrita a Gestor e Administrador.
          </div>
        )}
      </div>

      {/* Apenas a lista rola. */}
      <div className={styles.listaRolavel}>
      {pendentes.length === 0 ? (
        <p className={styles.muted}>Nenhum recebimento aguardando conferência.</p>
      ) : (
        pendentes.map((r) => {
          const rot = rotuloSituacao(r.situacao);
          const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
          return (
            <div key={r.id} className={styles.subItem} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div className={styles.subNome}>{nomeEmpresa(r.empresaId)} · {nomeSub(r.subempresaId)}</div>
                  <div className={styles.subMeta}>Colaborador: {nomeColab(r.colaboradorId)} · {formatarDataHora(r.recebidoEm)}</div>
                </div>
                <span className={styles.badge} style={{ background: rot.fundo, color: rot.cor, height: 'fit-content' }}>{rot.texto}</span>
              </div>

              <div className={styles.readonlyBox} style={{ marginTop: 10 }}>
                <div className={styles.readonlyRow}><span>Valor combinado</span><span>{formatarMoeda(r.valorCombinado)}</span></div>
                <div className={styles.readonlyRow}><span>Valor declarado</span><span>{formatarMoeda(r.valorRecebido ?? 0)}</span></div>
                <div className={styles.readonlyRow}>
                  <span>Diferença</span>
                  <span style={{ color: dif === 0 ? '#166534' : dif < 0 ? '#b45309' : '#1e40af' }}>{formatarMoeda(dif)}</span>
                </div>
                {r.observacao && <div className={styles.readonlyRow}><span>Observação</span><span>{r.observacao}</span></div>}
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
                      <button type="button" className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => onConfirmarBaixa(r.id)}>Confirmar baixa</button>
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
