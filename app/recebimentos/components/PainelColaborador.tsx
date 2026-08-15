'use client';

import { useMemo, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, FormaPagamentoRecebimento, Recebimento, Subempresa } from './types';
import { COR_PRIMARIA, aguardandoConferencia, formatarDataHora, formatarMoeda, mesmoDia, rotuloFormaPagamento, rotuloSituacao } from './helpers';
import FormularioRecebimento, { type ResumoRecebimento } from './FormularioRecebimento';

type Props = {
  colaborador: Colaborador;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  onRegistrar: (empresaId: string, subempresaId: string | null, valorRecebido: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null) => Promise<void> | void;
  // Baixa individual de uma parcela em atraso já existente.
  onReceberCobranca: (recebimentoId: string, valorRecebido: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null, dataPagamento?: string | null) => Promise<void> | void;
};

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function mesAtual() {
  const agora = new Date();
  return { ano: agora.getFullYear(), mes: agora.getMonth() };
}

export default function PainelColaborador({ colaborador, empresas, subempresas, recebimentos, onRegistrar, onReceberCobranca }: Props) {
  const [formAberto, setFormAberto] = useState(false);
  const [correcoesAbertas, setCorrecoesAbertas] = useState(false);
  const [correcaoSelecionada, setCorrecaoSelecionada] = useState<Recebimento | null>(null);
  const [comprovante, setComprovante] = useState<ResumoRecebimento | null>(null);
  const [mesRef, setMesRef] = useState(mesAtual);
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
  // Diferente de "Recebido hoje", este saldo não tem recorte de data: permanece
  // acumulado enquanto qualquer lançamento do colaborador aguardar conferência.
  const aguardando = useMemo(() => meus.filter((r) => aguardandoConferencia(r.situacao)), [meus]);
  const totalAguardando = useMemo(
    () => aguardando.reduce((s, r) => s + (r.valorRecebido ?? 0), 0),
    [aguardando],
  );
  const devolvidos = useMemo(
    () => meus.filter((r) => r.situacao === 'devolvido_para_correcao'),
    [meus],
  );
  // Uma devolução permanece no ambiente próprio de correção para não duplicar
  // a informação no histórico. Ao ser reenviada, volta ao histórico com o
  // novo status de conferência.
  const historico = useMemo(
    () => meus.filter((r) => r.situacao !== 'devolvido_para_correcao'),
    [meus],
  );

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—';
  const nomeSub = (id: string | null) => id ? subempresas.find((s) => s.id === id)?.nome ?? '—' : 'Cliente direto';

  async function handleConfirmar(empresaId: string, subempresaId: string | null, valor: number, obs: string, formaPagamento: FormaPagamentoRecebimento, arquivo: File | null, resumo: ResumoRecebimento) {
    await onRegistrar(empresaId, subempresaId, valor, obs, formaPagamento, arquivo);
    setFormAberto(false);
    setCorrecaoSelecionada(null);
    setComprovante(resumo);
  }

  async function handleReceberCobranca(recebimentoId: string, valor: number, obs: string, formaPagamento: FormaPagamentoRecebimento, arquivo: File | null, resumo: ResumoRecebimento, dataPagamento?: string | null) {
    await onReceberCobranca(recebimentoId, valor, obs, formaPagamento, arquivo, dataPagamento);
    setFormAberto(false);
    setCorrecaoSelecionada(null);
    setComprovante(resumo);
  }

  function abrirFormulario() {
    setCorrecaoSelecionada(null);
    setMesRef(mesAtual());
    setFormAberto(true);
  }

  function abrirCorrecao(recebimento: Recebimento) {
    setFormAberto(false);
    setCorrecoesAbertas(false);
    setCorrecaoSelecionada(recebimento);
  }

  function motivoDevolucao(observacao: string | null) {
    const marcador = 'Devolvido:';
    const indice = observacao?.lastIndexOf(marcador) ?? -1;
    const motivo = indice >= 0 ? observacao?.slice(indice + marcador.length).trim() : observacao?.trim();
    return motivo || 'Motivo não informado.';
  }

  function competencia(vencimento: string) {
    const [ano, mes] = vencimento.split('-');
    return `${MESES_CURTOS[Number(mes) - 1] ?? '—'}/${ano.slice(-2)}`;
  }

  function rotuloBaixado(recebimento: Recebimento) {
    const referencia = recebimento.baixadoEm ?? recebimento.recebidoEm;
    if (!referencia) return 'Baixado';
    return `Baixado · ${competencia(referencia.slice(0, 10))}`;
  }

  function mudarMes(delta: number) {
    setMesRef((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  }

  const chaveMes = `${mesRef.ano}-${String(mesRef.mes + 1).padStart(2, '0')}`;
  const seletorMes = (
    <div className={`${styles.mesSeletor} ${styles.mesSeletorColaborador}`}>
      <button type="button" className={styles.mesSeletorBtn} onClick={() => mudarMes(-1)} aria-label="Mês anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} width="14" height="14">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <span className={styles.mesSeletorDiv} aria-hidden="true" />
      <span className={styles.mesSeletorLabel}>
        {MESES_CURTOS[mesRef.mes]} <b>{mesRef.ano}</b>
      </span>
      <span className={styles.mesSeletorDiv} aria-hidden="true" />
      <button type="button" className={styles.mesSeletorBtn} onClick={() => mudarMes(1)} aria-label="Próximo mês">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} width="14" height="14">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className={styles.mobileWrap}>
      <div className={styles.heroCard}>
        <div className={styles.heroTopo}>
          <div className={styles.heroNome}>Olá, {colaborador.nome}</div>
          <time className={styles.heroData}>
            {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </time>
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
          onClick={abrirFormulario}
        >
          + Registrar recebimentos
        </button>
        {devolvidos.length > 0 && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCorrecaoPwa}`}
            onClick={() => { setFormAberto(false); setCorrecaoSelecionada(null); setCorrecoesAbertas((atual) => !atual); }}
          >
            <span>Corrigir devoluções</span>
            <span className={styles.btnCorrecaoContador}>{devolvidos.length}</span>
          </button>
        )}
      </div>

      {correcoesAbertas && devolvidos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <AvantaCard
            title="Correções pendentes"
            headerRight={<span className={styles.correcaoPill}>{devolvidos.length} pendente(s)</span>}
            hideDragHandle
            hideMenu
            style={avantaShell.cardStyle}
            bodyStyle={avantaShell.bodyStyle}
          >
            <p className={styles.correcaoIntroducao}>Revise o motivo informado pelo gestor e corrija o lançamento original.</p>
            <div className={styles.correcoesLista}>
              {devolvidos.map((r) => (
                <button key={r.id} type="button" className={styles.correcaoItem} onClick={() => abrirCorrecao(r)}>
                  <span className={styles.correcaoItemTopo}>
                    <span>
                      <strong>{nomeEmpresa(r.empresaId)}</strong>
                      <small>{nomeSub(r.subempresaId)} · Competência {competencia(r.vencimento)}</small>
                    </span>
                    <span className={styles.correcaoAcao}>Corrigir</span>
                  </span>
                  <span className={styles.correcaoItemValores}>Declarado: {formatarMoeda(r.valorRecebido ?? 0)} · {rotuloFormaPagamento(r.formaPagamento)}</span>
                  <span className={styles.correcaoMotivo}><b>Motivo do gestor:</b> {motivoDevolucao(r.observacao)}</span>
                </button>
              ))}
            </div>
          </AvantaCard>
        </div>
      )}

      {formAberto && (
        <div style={{ marginTop: 16 }}>
          <AvantaCard
            title="Registrar recebimentos"
            headerRight={seletorMes}
            hideDragHandle
            hideMenu
            style={{ ...avantaShell.cardStyle, ['--plato-w' as string]: '30%' }}
            bodyStyle={avantaShell.bodyStyle}
          >
            <FormularioRecebimento
              empresas={empresas}
              subempresas={subempresas}
              recebimentos={recebimentos}
              chaveMes={chaveMes}
              onConfirmar={handleConfirmar}
              onReceberCobranca={handleReceberCobranca}
              onCancelar={() => setFormAberto(false)}
            />
          </AvantaCard>
        </div>
      )}

      {correcaoSelecionada && (
        <div style={{ marginTop: 16 }}>
          <AvantaCard
            title="Corrigir lançamento"
            hideDragHandle
            hideMenu
            style={avantaShell.cardStyle}
            bodyStyle={avantaShell.bodyStyle}
          >
            <FormularioRecebimento
              key={correcaoSelecionada.id}
              empresas={empresas}
              subempresas={subempresas}
              recebimentos={recebimentos}
              chaveMes={chaveMes}
              cobrancaCorrecao={correcaoSelecionada}
              onConfirmar={handleConfirmar}
              onReceberCobranca={handleReceberCobranca}
              onCancelar={() => setCorrecaoSelecionada(null)}
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
          {historico.length === 0 ? (
            <p className={styles.muted}>Nenhum recebimento registrado ainda.</p>
          ) : (
            historico.map((r) => {
              const rot = rotuloSituacao(r.situacao);
              const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
              const textoSituacao = r.situacao === 'baixado' ? rotuloBaixado(r) : rot.texto;
              return (
                <div key={r.id} className={styles.histCard}>
                  <div className={styles.histTop}>
                    <div>
                      <div className={styles.histEmpresa}>{nomeEmpresa(r.empresaId)}</div>
                      <div className={`${styles.histSub} ${styles.histSubDestaque}`}>{nomeSub(r.subempresaId)}</div>
                    </div>
                    <span className={styles.badge} style={{ background: rot.fundo, color: rot.cor }}>{textoSituacao}</span>
                  </div>
                  <div className={styles.histValores}>
                    <span>Contratado: <b>{formatarMoeda(r.valorCombinado)}</b></span>
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
              <div className={styles.readonlyRow}><span>Cliente</span><span>{comprovante.subempresaNome}</span></div>
              <div className={styles.readonlyRow}><span>Combinado</span><span>{formatarMoeda(comprovante.valorCombinado)}</span></div>
              <div className={styles.readonlyRow}><span>Recebido</span><span>{formatarMoeda(comprovante.valorRecebido)}</span></div>
              <div className={styles.readonlyRow}><span>Forma de pagamento</span><span>{rotuloFormaPagamento(comprovante.formaPagamento)}</span></div>
              <div className={styles.readonlyRow}><span>Comprovante</span><span>{comprovante.temComprovante ? 'Anexado' : 'Não anexado'}</span></div>
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
