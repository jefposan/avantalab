'use client';

import { useEffect, useMemo, useState } from 'react';
import AvantaCard, { criarAvantaShellPreset } from '@/app/components/AvantaCard';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Perfil, Recebimento, Subempresa } from './types';
import { COR_PRIMARIA } from './dadosDemo';
import { aguardandoConferencia, formatarMoeda } from './helpers';
import ListaEmpresas from './ListaEmpresas';
import ListaColaboradores from './ListaColaboradores';
import ListaRecebimentos from './ListaRecebimentos';
import PainelConferencia from './PainelConferencia';
import ListaInadimplentes from './ListaInadimplentes';
import GraficoResultados from './GraficoResultados';
import type { IntegracaoFinanceiraRecebimentos } from '../data/repo';

type Aba = 'visao' | 'empresas' | 'colaboradores' | 'recebimentos' | 'conferencia' | 'inadimplentes' | 'resultados';

type Props = {
  perfil: Perfil;
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
  onEditarSubempresa: (id: string, dados: Pick<Subempresa, 'nome' | 'endereco' | 'responsavel' | 'valorCombinado' | 'diaVencimento'>) => void;
  onExcluirSubempresa: (id: string) => void;
  onAlternarSubempresa: (id: string) => void;
  onAdicionarColaborador: (dados: Omit<Colaborador, 'id'>) => void;
  onEditarColaborador: (id: string, dados: Omit<Colaborador, 'id' | 'ativo'>) => void;
  onExcluirColaborador: (id: string) => void;
  onAlternarColaborador: (id: string) => void;
  onObterIntegracaoFinanceira: (ano: number, mes: number) => Promise<IntegracaoFinanceiraRecebimentos>;
  onIntegrarFinanceiro: (ano: number, mes: number, nomeEntrada: string, tituloEtiqueta: string) => Promise<IntegracaoFinanceiraRecebimentos>;
};

const ABAS: Array<[Aba, string]> = [
  ['visao', 'Visão geral'],
  ['empresas', 'Empresas'],
  ['colaboradores', 'Colaboradores'],
  ['recebimentos', 'Recebimentos'],
  ['conferencia', 'Conferência'],
  ['inadimplentes', 'Inadimplentes'],
  ['resultados', 'Resultados'],
];

const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function PainelAdministrativo(props: Props) {
  const { perfil, podeConfirmar, empresas, subempresas, colaboradores, recebimentos } = props;
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
  const avantaShell = criarAvantaShellPreset({ corPrimaria: COR_PRIMARIA, darkMode: false });

  const pendentesQtd = useMemo(() => recebimentos.filter((r) => aguardandoConferencia(r.situacao)).length, [recebimentos]);

  function mudarMes(delta: number) {
    setMesRef((atual) => {
      const data = new Date(atual.ano, atual.mes + delta, 1);
      return { ano: data.getFullYear(), mes: data.getMonth() };
    });
  }

  const chaveMes = `${mesRef.ano}-${String(mesRef.mes + 1).padStart(2, '0')}`;

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
      // Em atraso acumula tudo que venceu até o fim do mês selecionado.
      if (r.situacao === 'em_atraso' && r.vencimento.slice(0, 7) <= chaveMes) atraso += r.valorCombinado;
    }
    return { previstoMes, recebidoCampo, aguardando, baixado, atraso, pendentesMes };
  }, [recebimentos, chaveMes]);

  useEffect(() => {
    let ativo = true;
    setIntegracaoCarregando(true);
    setIntegracaoMensagem('');
    setIntegracaoErro('');
    props.onObterIntegracaoFinanceira(mesRef.ano, mesRef.mes + 1)
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
  }, [mesRef.ano, mesRef.mes, props.onObterIntegracaoFinanceira]);

  async function adicionarAoFinanceiro() {
    const nome = nomeEntrada.trim();
    const etiqueta = tituloEtiqueta.trim();
    setIntegracaoErro('');
    setIntegracaoMensagem('');
    if (!nome) return setIntegracaoErro('Informe o nome da entrada.');
    if (!etiqueta) return setIntegracaoErro('Informe o título da etiqueta.');
    if (resumo.baixado <= 0) return setIntegracaoErro('Não há valor baixado neste mês para adicionar.');
    setIntegracaoSalvando(true);
    try {
      const dados = await props.onIntegrarFinanceiro(mesRef.ano, mesRef.mes + 1, nome, etiqueta);
      setIntegracao(dados);
      setNomeEntrada(dados.nomeEntrada);
      setTituloEtiqueta(dados.tituloEtiqueta);
      setIntegracaoMensagem(`${formatarMoeda(dados.valorSincronizado)} adicionado aos recebimentos do Financeiro.`);
    } catch (error) {
      setIntegracaoErro(error instanceof Error ? error.message : 'Não foi possível adicionar o valor ao Financeiro.');
    } finally {
      setIntegracaoSalvando(false);
    }
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

  return (
    <div>
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
            {label}{a === 'conferencia' && pendentesQtd > 0 ? ` (${pendentesQtd})` : ''}
          </button>
        ))}
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
        headerRight={seletorMes}
        hideDragHandle
        hideMenu
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
            chaveMes={chaveMes}
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
            <div className={styles.cardsGrid}>
              <div className={`${styles.statCard} ${styles.statAzul}`}><div className={styles.statLabel}>Total previsto no mês</div><div className={styles.statValue}>{formatarMoeda(resumo.previstoMes)}</div></div>
              <div className={`${styles.statCard} ${styles.statCiano}`}><div className={styles.statLabel}>Recebido em campo</div><div className={styles.statValue}>{formatarMoeda(resumo.recebidoCampo)}</div></div>
              <div className={`${styles.statCard} ${styles.statArdosia}`}><div className={styles.statLabel}>Aguardando conferência</div><div className={styles.statValue}>{formatarMoeda(resumo.aguardando)}</div><div className={styles.statSub}>{resumo.pendentesMes} registro(s)</div></div>
              <div className={`${styles.statCard} ${styles.statIndigo}`}><div className={styles.statLabel}>Em atraso</div><div className={styles.statValue}>{formatarMoeda(resumo.atraso)}</div></div>
              <div className={`${styles.statCard} ${styles.statTeal} ${styles.integracaoCard}`}>
                <div className={styles.integracaoResumo}>
                  <div>
                    <div className={styles.statLabel}>Baixado</div>
                    <div className={styles.statValue}>{formatarMoeda(resumo.baixado)}</div>
                  </div>
                  {integracao?.integrado && (
                    <span className={styles.integracaoStatus}>Adicionado: {formatarMoeda(integracao.valorSincronizado)}</span>
                  )}
                </div>
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
                <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.integracaoBotao}`} onClick={() => void adicionarAoFinanceiro()} disabled={integracaoCarregando || integracaoSalvando || resumo.baixado <= 0}>
                  {integracaoSalvando ? 'Adicionando…' : integracao?.integrado ? 'Atualizar nos recebimentos' : 'Adicionar aos recebimentos'}
                </button>
                {integracaoCarregando && <div className={styles.integracaoAjuda} role="status">Carregando integração…</div>}
                {integracaoMensagem && <div className={styles.integracaoSucesso} role="status">{integracaoMensagem}</div>}
                {integracaoErro && <div className={styles.integracaoErro} role="alert">{integracaoErro}</div>}
              </div>
            </div>
          </div>
        )}

        {aba === 'recebimentos' && (
          <ListaRecebimentos chaveMes={chaveMes} empresas={empresas} subempresas={subempresas} colaboradores={colaboradores} recebimentos={recebimentos} />
        )}

        {aba === 'inadimplentes' && (
          <ListaInadimplentes chaveMes={chaveMes} empresas={empresas} subempresas={subempresas} recebimentos={recebimentos} />
        )}

        {aba === 'resultados' && <GraficoResultados chaveMes={chaveMes} recebimentos={recebimentos} />}
        </div>
        )}
      </AvantaCard>
    </div>
  );
}
