'use client';

import { useMemo, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Recebimento, Subempresa } from './types';
import { COR_PRIMARIA } from './dadosDemo';
import { aguardandoConferencia, formatarDataHora, formatarMoeda, mesmoDia, rotuloSituacao } from './helpers';
import FormularioRecebimento, { type ResumoRecebimento } from './FormularioRecebimento';

type Props = {
  colaborador: Colaborador;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  onRegistrar: (subempresaId: string, valorRecebido: number, observacao: string) => Promise<void> | void;
  // Baixa individual de uma parcela em atraso já existente.
  onReceberCobranca: (recebimentoId: string, valorRecebido: number, observacao: string) => Promise<void> | void;
};

export default function PainelColaborador({ colaborador, empresas, subempresas, recebimentos, onRegistrar, onReceberCobranca }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [comprovante, setComprovante] = useState<ResumoRecebimento | null>(null);
  const avantaShell = criarAvantaShellPreset({ corPrimaria: COR_PRIMARIA, darkMode: false });

  const hoje = useMemo(() => new Date(), []);

  // Somente registros do próprio colaborador.
  const meus = useMemo(
    () => recebimentos.filter((r) => r.colaboradorId === colaborador.id),
    [recebimentos, colaborador.id],
  );

  const totalDia = useMemo(
    () => meus.filter((r) => mesmoDia(r.recebidoEm, hoje)).reduce((s, r) => s + (r.valorRecebido ?? 0), 0),
    [meus, hoje],
  );
  const aguardando = useMemo(() => meus.filter((r) => aguardandoConferencia(r.situacao)), [meus]);
  const totalAguardando = aguardando.reduce((s, r) => s + (r.valorRecebido ?? 0), 0);

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—';
  const nomeSub = (id: string) => subempresas.find((s) => s.id === id)?.nome ?? '—';

  async function handleConfirmar(subempresaId: string, valor: number, obs: string, resumo: ResumoRecebimento) {
    await onRegistrar(subempresaId, valor, obs);
    setFormAberto(false);
    setComprovante(resumo);
  }

  async function handleReceberCobranca(recebimentoId: string, valor: number, obs: string, resumo: ResumoRecebimento) {
    await onReceberCobranca(recebimentoId, valor, obs);
    setFormAberto(false);
    setComprovante(resumo);
  }

  return (
    <div className={styles.mobileWrap}>
      <div className={styles.heroCard}>
        <div className={styles.heroNome}>Olá, {colaborador.nome}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </div>
        <div className={styles.heroStatGrid}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>Recebido hoje</div>
            <div className={styles.heroStatValue}>{formatarMoeda(totalDia)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>Aguardando</div>
            <div className={styles.heroStatValue}>{formatarMoeda(totalAguardando)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>Pendentes</div>
            <div className={styles.heroStatValue}>{aguardando.length}</div>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.btn}`}
          style={{ background: '#fff', color: COR_PRIMARIA, width: '100%', marginTop: 14 }}
          onClick={() => setFormAberto(true)}
        >
          + Registrar recebimento
        </button>
      </div>

      {formAberto && (
        <div style={{ marginTop: 16 }}>
          <AvantaCard
            title="Registrar recebimento"
            hideDragHandle
            hideMenu
            style={avantaShell.cardStyle}
            bodyStyle={avantaShell.bodyStyle}
          >
            <FormularioRecebimento
              empresas={empresas}
              subempresas={subempresas}
              recebimentos={recebimentos}
              onConfirmar={handleConfirmar}
              onReceberCobranca={handleReceberCobranca}
              onCancelar={() => setFormAberto(false)}
            />
          </AvantaCard>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <AvantaCard
          title="Meu histórico"
          hideDragHandle
          hideMenu
          style={avantaShell.cardStyle}
          bodyStyle={avantaShell.bodyStyle}
        >
          {meus.length === 0 ? (
            <p className={styles.muted}>Nenhum recebimento registrado ainda.</p>
          ) : (
            meus.map((r) => {
              const rot = rotuloSituacao(r.situacao);
              const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
              return (
                <div key={r.id} className={styles.histCard}>
                  <div className={styles.histTop}>
                    <div>
                      <div className={styles.histEmpresa}>{nomeEmpresa(r.empresaId)}</div>
                      <div className={styles.histSub}>{nomeSub(r.subempresaId)}</div>
                    </div>
                    <span className={styles.badge} style={{ background: rot.fundo, color: rot.cor }}>{rot.texto}</span>
                  </div>
                  <div className={styles.histValores}>
                    <span>Combinado: <b>{formatarMoeda(r.valorCombinado)}</b></span>
                    <span>Recebido: <b>{formatarMoeda(r.valorRecebido ?? 0)}</b></span>
                  </div>
                  <div style={{ fontSize: 12, color: dif === 0 ? '#166534' : dif < 0 ? '#b45309' : '#1e40af', marginTop: 4 }}>
                    Diferença: {formatarMoeda(dif)}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{formatarDataHora(r.recebidoEm)}</div>
                </div>
              );
            })
          )}
        </AvantaCard>
      </div>

      {comprovante && (
        <div className={styles.overlay} onClick={() => setComprovante(null)}>
          <div className={styles.comprovante} onClick={(e) => e.stopPropagation()}>
            <div className={styles.comprovanteCheck}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: 17 }}>Recebimento registrado</h3>
            <p className={styles.muted} style={{ marginTop: 4 }}>Aguardando conferência do gestor.</p>
            <div className={styles.readonlyBox} style={{ marginTop: 14, textAlign: 'left' }}>
              <div className={styles.readonlyRow}><span>Empresa</span><span>{comprovante.empresaNome}</span></div>
              <div className={styles.readonlyRow}><span>Subempresa</span><span>{comprovante.subempresaNome}</span></div>
              <div className={styles.readonlyRow}><span>Combinado</span><span>{formatarMoeda(comprovante.valorCombinado)}</span></div>
              <div className={styles.readonlyRow}><span>Recebido</span><span>{formatarMoeda(comprovante.valorRecebido)}</span></div>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => setComprovante(null)}
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
