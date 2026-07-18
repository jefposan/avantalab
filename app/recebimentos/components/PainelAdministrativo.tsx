'use client';

import { useEffect, useMemo, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Perfil, Recebimento, Subempresa } from './types';
import { aguardandoConferencia, cobrancasNosProximosDias, dataLocalIso, formatarMoeda } from './helpers';
import ListaEmpresas from './ListaEmpresas';
import ListaColaboradores from './ListaColaboradores';
import ListaRecebimentos from './ListaRecebimentos';
import PainelConferencia from './PainelConferencia';
import ListaInadimplentes from './ListaInadimplentes';
import ListaProximosVencimentos from './ListaProximosVencimentos';
import GraficoResultados from './GraficoResultados';
import type { IntegracaoFinanceiraRecebimentos } from '../data/repo';
import type { AbrirAvisoFn, AbrirConfirmacaoFn } from '@/app/hooks/useUI';

type Aba = 'visao' | 'empresas' | 'colaboradores' | 'recebimentos' | 'conferencia' | 'proximo' | 'inadimplentes' | 'resultados';

type Props = {
  perfil: Perfil;
  darkMode: boolean;
  corPrimaria: string;
  salvando: boolean;
  onAviso?: AbrirAvisoFn;
  onConfirmacao?: AbrirConfirmacaoFn;
  podeConfirmar: boolean;
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  mostrarLinkColaboradores?: boolean;
  onConfirmarBaixa: (id: string) => void;
  onDevolver: (id: string, motivo: string) => void;
  onDivergencia: (id: string, motivo: string) => void;
  onEstornar: (id: string, motivo: string) => void;
  onAdicionarEmpresa: (dados: Omit<Empresa, 'id'>) => void;
  onEditarEmpresa: (id: string, dados: Omit<Empresa, 'id' | 'ativo'>) => void;
  onExcluirEmpresa: (id: string) => void;
  onAlternarEmpresa: (id: string) => void;
  onAdicionarSubempresa: (dados: Omit<Subempresa, 'id'>) => void;
  onEditarSubempresa: (id: string, dados: Pick<Subempresa, 'nome' | 'endereco' | 'cep' | 'logradouro' | 'bairro' | 'cidade' | 'estado' | 'numero' | 'complemento' | 'responsavel' | 'valorCombinado' | 'frequenciaRecebimento' | 'configuracaoRecorrencia'>) => void;
  onExcluirSubempresa: (id: string) => void;
  onAlternarSubempresa: (id: string) => void;
  onAdicionarColaborador: (dados: Omit<Colaborador, 'id'>) => void;
  onEditarColaborador: (id: string, dados: Omit<Colaborador, 'id' | 'ativo'>) => void;
  onExcluirColaborador: (id: string) => void;
  onAlternarColaborador: (id: string) => void;
  onObterIntegracaoFinanceira: (ano: number, mes: number) => Promise<IntegracaoFinanceiraRecebimentos>;
  onAtualizarTitulosFinanceiro: (ano: number, mes: number, nomeEntrada: string, tituloEtiqueta: string) => Promise<IntegracaoFinanceiraRecebimentos>;
  onDefinirIntegracaoFinanceira: (ano: number, mes: number, ativa: boolean) => Promise<IntegracaoFinanceiraRecebimentos>;
};

const ABAS: Array<[Aba, string]> = [
  ['visao', 'Visão geral'],
  ['empresas', 'Empresas'],
  ['colaboradores', 'Colaboradores'],
  ['recebimentos', 'Recebimentos'],
  ['conferencia', 'Conferência'],
  ['proximo', 'Próximo a vencer'],
  ['inadimplentes', 'Inadimplentes'],
  ['resultados', 'Resultados'],
];

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function PainelAdministrativo(props: Props) {
  const {
    perfil, darkMode, salvando, podeConfirmar, empresas, subempresas, colaboradores, recebimentos,
    onObterIntegracaoFinanceira, onAtualizarTitulosFinanceiro, onDefinirIntegracaoFinanceira,
  } = props;
  const [aba, setAba] = useState<Aba>('visao');
  // Mês de referência da Visão geral (navegado pelo seletor no platô do card).
  const [mesRef, setMesRef] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  });
  const [nomeEntrada, setNomeEntrada] = useState('Recebimentos em campo');
  const [tituloEtiqueta, setTituloEtiqueta] = useState('Recebimentos');
  const [integracao, setIntegracao] = useState<IntegracaoFinanceiraRecebimentos | null>(null);
  const [integracaoCarregando, setIntegracaoCarregando] = useState(false);
  const [integracaoSalvando, setIntegracaoSalvando] = useState(false);
  const [integracaoMensagem, setIntegracaoMensagem] = useState('');
  const [integracaoErro, setIntegracaoErro] = useState('');
  const avantaShell = criarAvantaShellPreset({ corPrimaria: props.corPrimaria, darkMode });
  const hojeIso = useMemo(() => dataLocalIso(), []);

  const pendentesQtd = useMemo(() => recebimentos.filter((r) => aguardandoConferencia(r.situacao)).length, [recebimentos]);
  const inadimplentesQtd = useMemo(
    () => recebimentos.filter((r) => r.situacao === 'em_atraso' && r.valorRecebido == null && r.vencimento < hojeIso).length,
    [recebimentos, hojeIso],
  );
  const proximosQtd = useMemo(
    () => cobrancasNosProximosDias(recebimentos, hojeIso, 30).length,
    [recebimentos, hojeIso],
  );

  function mudarMes(delta: number) {
    setMesRef((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  }

  const chaveMes = `${mesRef.ano}-${String(mesRef.mes + 1).padStart(2, '0')}`;
  const mesFuturo = chaveMes > hojeIso.slice(0, 7);

  const resumo = useMemo(() => {
    let previstoMes = 0, recebidoCampo = 0, aguardando = 0, baixado = 0, atraso = 0, pendentesMes = 0;
    for (const r of recebimentos) {
      if (r.vencimento.slice(0, 7) === chaveMes) previstoMes += r.valorCombinado;
      if (r.recebidoEm && r.recebidoEm.slice(0, 7) === chaveMes) recebidoCampo += r.valorRecebido ?? 0;
      if (aguardandoConferencia(r.situacao) && r.recebidoEm && r.recebidoEm.slice(0, 7) === chaveMes) {
        aguardando += r.valorRecebido ?? 0;
        pendentesMes += 1;
      }
      if (r.situacao === 'baixado' && (r.baixadoEm ?? r.recebidoEm ?? '').slice(0, 7) === chaveMes) baixado += r.valorRecebido ?? 0;
      if (r.situacao === 'em_atraso' && r.vencimento < hojeIso && r.vencimento.slice(0, 7) <= chaveMes) atraso += r.valorCombinado;
    }
    return { previstoMes, recebidoCampo, aguardando, baixado, atraso, pendentesMes };
  }, [recebimentos, chaveMes, hojeIso]);

  useEffect(() => {
    let ativo = true;
    setIntegracaoCarregando(true);
    setIntegracaoMensagem('');
    setIntegracaoErro('');
    onObterIntegracaoFinanceira(mesRef.ano, mesRef.mes + 1)
      .then((dados) => {
        if (!ativo) return;
        setIntegracao(dados);
        setNomeEntrada(dados.nomeEntrada);
        setTituloEtiqueta(dados.tituloEtiqueta);
      })
      .catch((error) => {
        if (!ativo) return;
        setIntegracaoErro(error instanceof Error ? error.message : 'Não foi possível carregar a integração financeira.');
      })
      .finally(() => { if (ativo) setIntegracaoCarregando(false); });
    return () => { ativo = false; };
  }, [mesRef.ano, mesRef.mes, onObterIntegracaoFinanceira]);

  async function atualizarTitulos() {
    const nome = nomeEntrada.trim();
    const etiqueta = tituloEtiqueta.trim();
    setIntegracaoErro('');
    setIntegracaoMensagem('');
    if (!nome) return setIntegracaoErro('Informe o nome da entrada.');
    if (!etiqueta) return setIntegracaoErro('Informe o título da etiqueta.');
    setIntegracaoSalvando(true);
    try {
      const dados = await onAtualizarTitulosFinanceiro(mesRef.ano, mesRef.mes + 1, nome, etiqueta);
      setIntegracao(dados);
      setNomeEntrada(dados.nomeEntrada);
      setTituloEtiqueta(dados.tituloEtiqueta);
      setIntegracaoMensagem('Títulos atualizados em todos os meses integrados.');
    } catch (error) {
      setIntegracaoErro(error instanceof Error ? error.message : 'Não foi possível atualizar os títulos.');
    } finally {
      setIntegracaoSalvando(false);
    }
  }

  async function definirIntegracao(ativa: boolean) {
    setIntegracaoErro('');
    setIntegracaoMensagem('');
    setIntegracaoSalvando(true);
    try {
      const dados = await onDefinirIntegracaoFinanceira(mesRef.ano, mesRef.mes + 1, ativa);
      setIntegracao(dados);
      setIntegracaoMensagem(ativa
        ? 'Sincronização automática com Receitas ativada.'
        : 'Lançamentos do módulo retirados das Receitas.');
    } catch (error) {
      setIntegracaoErro(error instanceof Error ? error.message : 'Não foi possível alterar a integração.');
    } finally {
      setIntegracaoSalvando(false);
    }
  }

  function alternarIntegracao() {
    const ativar = !integracao?.integrado;
    if (ativar) {
      void definirIntegracao(true);
      return;
    }
    const executar = () => definirIntegracao(false);
    if (!props.onConfirmacao) {
      void executar();
      return;
    }
    props.onConfirmacao({
      titulo: 'Retirar das receitas?',
      mensagem: 'Todos os lançamentos automáticos deste módulo serão retirados das Receitas. Os recebimentos e seus históricos serão preservados.',
      textoConfirmar: 'Retirar das receitas',
      acao: executar,
    });
  }

  // Seletor de mês no padrão da página de lançamentos: bloco único com setas,
  // centralizado no platô do AvantaCard.
  const seletorMes = (
    <div className={styles.mesSeletor} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
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
  const abaUsaCompetencia = aba === 'visao' || aba === 'recebimentos' || aba === 'resultados';

  return (
    <div className={styles.painelAdministrativo}>
      <div className={styles.tabs} role="tablist">
        {ABAS.map(([a, label]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            className={`${styles.tab} ${aba === a ? styles.tabAtiva : ''}`}
            onClick={() => setAba(a)}
          >
            {label}{a === 'conferencia' && pendentesQtd > 0 ? ` (${pendentesQtd})` : ''}{a === 'proximo' && proximosQtd > 0 ? ` (${proximosQtd})` : ''}{a === 'inadimplentes' && inadimplentesQtd > 0 ? ` (${inadimplentesQtd})` : ''}
          </button>
        ))}
        {salvando && <span className={styles.tabsStatus} role="status">Salvando alterações…</span>}
      </div>

      <AvantaCard
        title={
          <>
            ADMINISTRAÇÃO{' '}
            <span className={styles.tituloPerfil}>
              · {perfil === 'administrador' ? 'Administrador' : 'Gestor'}
            </span>
          </>
        }
        headerRight={abaUsaCompetencia ? seletorMes : undefined}
        hideDragHandle
        hideMenu
        className={styles.painelCardFixo}
        bodyClassName={styles.painelCardCorpo}
        style={avantaShell.cardStyle}
        bodyStyle={avantaShell.bodyStyle}
      >
        {/* Empresas gerencia o próprio scroll: o topo (título + busca + nova
            empresa) fica FORA do container rolável e não sofre o elástico. */}
        {aba === 'empresas' && (
          <ListaEmpresas
            empresas={empresas}
            subempresas={subempresas}
            onAdicionarEmpresa={props.onAdicionarEmpresa}
            onEditarEmpresa={props.onEditarEmpresa}
            onExcluirEmpresa={props.onExcluirEmpresa}
            onAlternarEmpresa={props.onAlternarEmpresa}
            onAviso={props.onAviso}
            onAdicionarSubempresa={props.onAdicionarSubempresa}
            onEditarSubempresa={props.onEditarSubempresa}
            onExcluirSubempresa={props.onExcluirSubempresa}
            onAlternarSubempresa={props.onAlternarSubempresa}
          />
        )}

        {/* Colaboradores também gerencia o próprio scroll (topo estático). */}
        {aba === 'colaboradores' && (
          <ListaColaboradores
            colaboradores={colaboradores}
            recebimentos={recebimentos}
            mostrarLinkAcesso={props.mostrarLinkColaboradores}
            onAdicionar={props.onAdicionarColaborador}
            onEditar={props.onEditarColaborador}
            onExcluir={props.onExcluirColaborador}
            onAlternar={props.onAlternarColaborador}
          />
        )}

        {/* Conferência gerencia o próprio scroll: título fixo no topo. */}
        {aba === 'conferencia' && (
          <PainelConferencia
            podeConfirmar={podeConfirmar}
            empresas={empresas}
            subempresas={subempresas}
            colaboradores={colaboradores}
            recebimentos={recebimentos}
            onConfirmarBaixa={props.onConfirmarBaixa}
            onDevolver={props.onDevolver}
            onDivergencia={props.onDivergencia}
            onEstornar={props.onEstornar}
          />
        )}

        {/* Demais abas: somente este corpo rola; header do card e abas fixos. */}
        {aba !== 'empresas' && aba !== 'colaboradores' && aba !== 'conferencia' && (
        <div className={styles.corpoRolavel}>
        {aba === 'visao' && (
          <div>
            <h3 className={styles.sectionTitle}>Visão geral</h3>
            <div className={`${styles.cardsGrid} ${mesFuturo ? styles.cardsGridSomentePrevisto : ''}`}>
              <div className={`${styles.statCard} ${styles.statAzul}`}><div className={styles.statLabel}>Total previsto no mês</div><div className={styles.statValue}>{formatarMoeda(resumo.previstoMes)}</div></div>
              {!mesFuturo && (
                <>
                  <div className={`${styles.statCard} ${styles.statCiano}`}><div className={styles.statLabel}>Recebido em campo</div><div className={styles.statValue}>{formatarMoeda(resumo.recebidoCampo)}</div></div>
                  <div className={`${styles.statCard} ${styles.statArdosia}`}><div className={styles.statLabel}>Aguardando conferência</div><div className={styles.statValue}>{formatarMoeda(resumo.aguardando)}</div><div className={styles.statSub}>{resumo.pendentesMes} registro(s)</div></div>
                  <div className={`${styles.statCard} ${styles.statIndigo}`}><div className={styles.statLabel}>Em atraso</div><div className={styles.statValue}>{formatarMoeda(resumo.atraso)}</div></div>
                  <div className={`${styles.statCard} ${styles.statTeal} ${styles.integracaoCard}`}>
                    <div className={styles.integracaoResumo}>
                      <div>
                        <div className={styles.statLabel}>Total recebido e confirmado</div>
                        <div className={styles.statValue}>{formatarMoeda(resumo.baixado)}</div>
                      </div>
                    </div>
                    <div className={styles.integracaoAcoes}>
                      <div className={styles.integracaoCampos}>
                        <label className={styles.integracaoCampo} htmlFor="recebimentos-nome-entrada">
                          <span>Nome da entrada</span>
                          <input id="recebimentos-nome-entrada" className={styles.input} value={nomeEntrada} onChange={(event) => setNomeEntrada(event.target.value)} maxLength={120} placeholder="Ex.: Recebimentos em campo" disabled={integracaoCarregando || integracaoSalvando} />
                        </label>
                        <label className={styles.integracaoCampo} htmlFor="recebimentos-titulo-etiqueta">
                          <span>Título da etiqueta</span>
                          <input id="recebimentos-titulo-etiqueta" className={styles.input} value={tituloEtiqueta} onChange={(event) => setTituloEtiqueta(event.target.value)} maxLength={40} placeholder="Recebimentos" disabled={integracaoCarregando || integracaoSalvando} />
                        </label>
                      </div>
                      <div className={styles.integracaoBotoes}>
                        <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.integracaoBotao}`} onClick={() => void atualizarTitulos()} disabled={integracaoCarregando || integracaoSalvando}>
                          {integracaoSalvando ? 'Processando…' : 'Atualizar títulos'}
                        </button>
                        <button type="button" className={`${styles.btn} ${integracao?.integrado ? styles.integracaoBotaoPerigo : styles.btnPrimary} ${styles.integracaoBotao}`} onClick={alternarIntegracao} disabled={integracaoCarregando || integracaoSalvando}>
                          {integracao?.integrado ? 'Retirar das receitas' : 'Adicionar às receitas'}
                        </button>
                      </div>
                    </div>
                    <div className={styles.integracaoFeedback} aria-live="polite" aria-atomic="true">
                      {integracaoCarregando ? (
                        <div className={styles.integracaoAjuda} role="status">Carregando valores…</div>
                      ) : integracaoErro ? (
                        <div className={styles.integracaoErro} role="alert">{integracaoErro}</div>
                      ) : integracaoMensagem ? (
                        <div className={styles.integracaoSucesso} role="status">{integracaoMensagem}</div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {aba === 'recebimentos' && (
          <ListaRecebimentos chaveMes={chaveMes} empresas={empresas} subempresas={subempresas} colaboradores={colaboradores} recebimentos={recebimentos} />
        )}

        {aba === 'inadimplentes' && (
          <ListaInadimplentes empresas={empresas} subempresas={subempresas} recebimentos={recebimentos} />
        )}

        {aba === 'proximo' && (
          <ListaProximosVencimentos empresas={empresas} subempresas={subempresas} recebimentos={recebimentos} />
        )}

        {aba === 'resultados' && <GraficoResultados chaveMes={chaveMes} recebimentos={recebimentos} />}
        </div>
        )}
      </AvantaCard>
    </div>
  );
}
