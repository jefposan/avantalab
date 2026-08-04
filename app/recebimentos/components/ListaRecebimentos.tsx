'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Recebimento, SituacaoRecebimento, Subempresa } from './types';
import { formatarMoeda, limitesDoMes, rotuloFormaPagamento, rotuloSituacao } from './helpers';
import type { ComprovanteRecebimento } from '../data/repo';
import BotaoComprovante from './BotaoComprovante';

type Props = {
  chaveMes: string;
  todosMeses?: boolean;
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  darkMode: boolean;
  podeEstornar: boolean;
  onEstornar: (id: string, motivo: string) => Promise<void>;
  onObterComprovante: (id: string) => Promise<ComprovanteRecebimento>;
  portalBusca?: HTMLElement | null;
  seletorMes?: ReactNode;
};

const SITUACOES: SituacaoRecebimento[] = [
  'aguardando_conferencia', 'baixado', 'recebido_a_menor', 'recebido_a_maior', 'em_atraso', 'devolvido_para_correcao',
];

function formatarDataCurta(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano.slice(-2)}`;
}

function formatarDataHoraCurta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ListaRecebimentos({ chaveMes, todosMeses = false, empresas, subempresas, colaboradores, recebimentos, darkMode, podeEstornar, onEstornar, onObterComprovante, portalBusca, seletorMes }: Props) {
  const [fEmpresa, setFEmpresa] = useState('');
  const [fSub, setFSub] = useState('');
  const [fColab, setFColab] = useState('');
  const [fSit, setFSit] = useState('');
  const [busca, setBusca] = useState('');
  // Intervalo de datas (por vencimento). Segue o mês do platô por padrão e
  // volta a acompanhá-lo sempre que o mês é trocado.
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [estornoPendente, setEstornoPendente] = useState<Recebimento | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [estornando, setEstornando] = useState(false);
  const [erroEstorno, setErroEstorno] = useState('');

  useEffect(() => {
    if (todosMeses) {
      setDataInicial('');
      setDataFinal('');
      return;
    }
    const { inicio, fim } = limitesDoMes(chaveMes);
    setDataInicial(inicio);
    setDataFinal(fim);
  }, [chaveMes, todosMeses]);

  const nomeEmpresa = useCallback((id: string) => empresas.find((e) => e.id === id)?.nome ?? '—', [empresas]);
  const nomeSub = useCallback((id: string | null) => id ? subempresas.find((s) => s.id === id)?.nome ?? '—' : 'Cliente direto', [subempresas]);
  const nomeColab = useCallback((id: string | null) => (id ? colaboradores.find((c) => c.id === id)?.nome ?? '—' : '—'), [colaboradores]);
  const termoBusca = busca.trim().toLocaleLowerCase('pt-BR');

  const filtrados = useMemo(() => {
    return recebimentos.filter((r) => {
      // Previsões alimentam os totais dos meses futuros, mas sua composição
      // não é exposta na listagem detalhada de recebimentos.
      if (r.situacao === 'previsto') return false;
      if (termoBusca && !`${nomeEmpresa(r.empresaId)} ${nomeSub(r.subempresaId)} ${nomeColab(r.colaboradorId)}`.toLocaleLowerCase('pt-BR').includes(termoBusca)) return false;
      if (fEmpresa && r.empresaId !== fEmpresa) return false;
      if (fSub && r.subempresaId !== fSub) return false;
      if (fColab && r.colaboradorId !== fColab) return false;
      if (fSit && r.situacao !== fSit) return false;
      if (dataInicial && r.vencimento < dataInicial) return false;
      if (dataFinal && r.vencimento > dataFinal) return false;
      return true;
    });
  }, [recebimentos, termoBusca, nomeEmpresa, nomeSub, nomeColab, fEmpresa, fSub, fColab, fSit, dataInicial, dataFinal]);

  const subsFiltro = fEmpresa ? subempresas.filter((s) => s.empresaId === fEmpresa) : subempresas;
  const campoBusca = (
    <div className={styles.buscaFixa} role="search">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" />
      </svg>
      <input className={styles.buscaFixaInput} placeholder="Pesquisar empresa ou cliente…" value={busca} onChange={(event) => setBusca(event.target.value)} aria-label="Pesquisar empresa, cliente ou colaborador" />
      {busca && <button type="button" className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar pesquisa">×</button>}
    </div>
  );

  function abrirEstorno(recebimento: Recebimento) {
    setEstornoPendente(recebimento);
    setMotivoEstorno('');
    setErroEstorno('');
  }

  async function confirmarEstorno() {
    if (!estornoPendente) return;
    if (!motivoEstorno.trim()) {
      setErroEstorno('Informe o motivo do estorno.');
      return;
    }
    setEstornando(true);
    setErroEstorno('');
    try {
      await onEstornar(estornoPendente.id, motivoEstorno.trim());
      setEstornoPendente(null);
    } catch (error) {
      setErroEstorno(error instanceof Error ? error.message : 'Não foi possível estornar o recebimento.');
    } finally {
      setEstornando(false);
    }
  }

  return (
    <>
    <div className={styles.listaRecebimentos}>
      {portalBusca && createPortal(campoBusca, portalBusca)}
      {portalBusca === undefined && <div className={styles.recebimentosBuscaLocal}>{campoBusca}</div>}
      <div className={styles.filtersRow}>
        <div className={styles.recebimentosPeriodo} aria-label="Período dos recebimentos">
          <span className={styles.recebimentosPeriodoTitulo}>Selecione o período</span>
          <div className={styles.recebimentosDatas}>
          <label className={styles.filtroData}>
            <span>De</span>
            <input
              type="date"
              className={`${styles.filterSelect} ${styles.inputData}`}
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ignora */ } }}
            />
          </label>
          <label className={styles.filtroData}>
            <span>Até</span>
            <input
              type="date"
              className={`${styles.filterSelect} ${styles.inputData}`}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* ignora */ } }}
            />
          </label>
          </div>
        </div>
        <select className={styles.filterSelect} value={fEmpresa} onChange={(e) => { setFEmpresa(e.target.value); setFSub(''); }}>
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select className={styles.filterSelect} value={fSub} onChange={(e) => setFSub(e.target.value)}>
          <option value="">Todos os clientes</option>
          {subsFiltro.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <select className={styles.filterSelect} value={fColab} onChange={(e) => setFColab(e.target.value)}>
          <option value="">Todos os colaboradores</option>
          {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className={`${styles.filterSelect} ${styles.filtroSituacao}`} value={fSit} onChange={(e) => setFSit(e.target.value)}>
          <option value="">Todas as situações</option>
          {SITUACOES.map((s) => <option key={s} value={s}>{rotuloSituacao(s).texto}</option>)}
        </select>
        {seletorMes && <div className={styles.recebimentosMesInline}>{seletorMes}</div>}
      </div>

      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.tabelaRecebimentos} ${podeEstornar ? styles.tabelaRecebimentosComAcao : ''}`}>
          <thead>
            <tr>
              <th>Empresa/local</th><th>Vencimento</th><th>Valor</th><th>Recebido</th>
              <th>Diferença</th><th>Recebido em</th><th>Recebido por</th><th>Pagamento</th><th>Situação</th><th>Comprovante</th>{podeEstornar && <th>Ação</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr className={styles.tabelaLinhaVazia}><td colSpan={podeEstornar ? 11 : 10} className={styles.muted} style={{ padding: 16 }}>Nenhum recebimento para os filtros.</td></tr>
            ) : filtrados.map((r) => {
              const rot = rotuloSituacao(r.situacao);
              const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
              const recebimentoPodeSerEstornado = r.valorRecebido != null && r.recebidoEm != null;
              return (
                <tr key={r.id}>
                  <td data-label="Empresa/local" style={{ fontWeight: 700 }}>{nomeEmpresa(r.empresaId)}</td>
                  <td data-label="Vencimento">{formatarDataCurta(r.vencimento)}</td>
                  <td data-label="Valor">{formatarMoeda(r.valorCombinado)}</td>
                  <td data-label="Recebido">{r.valorRecebido == null ? '—' : formatarMoeda(r.valorRecebido)}</td>
                  <td data-label="Diferença" style={{ color: r.valorRecebido == null ? '#94a3b8' : dif === 0 ? '#166534' : dif < 0 ? '#b45309' : '#1e40af' }}>
                    {r.valorRecebido == null ? '—' : formatarMoeda(dif)}
                  </td>
                  <td data-label="Recebido em" style={{ fontSize: 12 }}>{formatarDataHoraCurta(r.recebidoEm)}</td>
                  <td data-label="Recebido por">{nomeColab(r.colaboradorId)}</td>
                  <td data-label="Pagamento">{rotuloFormaPagamento(r.formaPagamento)}</td>
                  <td data-label="Situação"><span className={styles.badge} style={{ background: rot.fundo, color: rot.cor }}>{rot.texto}</span></td>
                  <td data-label="Comprovante">{r.temComprovante ? <BotaoComprovante lancamentoId={r.id} onObter={onObterComprovante} compacto darkMode={darkMode} /> : '—'}</td>
                  {podeEstornar && <td data-label="Ação">{recebimentoPodeSerEstornado && <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => abrirEstorno(r)}>Estornar</button>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    {estornoPendente && (
      <div className={styles.overlay} role="presentation" onClick={() => !estornando && setEstornoPendente(null)}>
        <div className={styles.comprovante} role="dialog" aria-modal="true" aria-labelledby="estorno-titulo" onClick={(event) => event.stopPropagation()}>
          <h3 id="estorno-titulo" style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>Estornar recebimento?</h3>
          <p className={styles.muted} style={{ margin: '6px 0 14px' }}>O recebimento será desfeito e a cobrança voltará para a situação aberta correspondente.</p>
          <div className={styles.readonlyBox} style={{ textAlign: 'left', marginBottom: 12 }}>
            <div className={styles.readonlyRow}><span>Cliente</span><span>{nomeSub(estornoPendente.subempresaId)}</span></div>
            <div className={styles.readonlyRow}><span>Valor</span><span>{formatarMoeda(estornoPendente.valorRecebido ?? estornoPendente.valorCombinado)}</span></div>
          </div>
          <label className={styles.label} htmlFor="recebimentos-motivo-estorno">Motivo do estorno</label>
          <textarea id="recebimentos-motivo-estorno" className={styles.input} rows={3} value={motivoEstorno} onChange={(event) => setMotivoEstorno(event.target.value)} placeholder="Explique por que a baixa deve ser desfeita" disabled={estornando} autoFocus />
          {erroEstorno && <div className={styles.aviso} role="alert" style={{ marginTop: 12 }}>{erroEstorno}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ flex: 1 }} onClick={() => setEstornoPendente(null)} disabled={estornando}>Cancelar</button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} style={{ flex: 1 }} onClick={() => void confirmarEstorno()} disabled={estornando}>{estornando ? 'Estornando…' : 'Confirmar estorno'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
