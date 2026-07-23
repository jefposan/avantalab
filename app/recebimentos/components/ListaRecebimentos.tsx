'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Colaborador, Empresa, Recebimento, SituacaoRecebimento, Subempresa } from './types';
import { formatarData, formatarDataHora, formatarMoeda, limitesDoMes, rotuloSituacao } from './helpers';

type Props = {
  chaveMes: string;
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
};

const SITUACOES: SituacaoRecebimento[] = [
  'aguardando_conferencia', 'baixado', 'recebido_a_menor', 'recebido_a_maior', 'em_atraso', 'devolvido_para_correcao',
];

export default function ListaRecebimentos({ chaveMes, empresas, subempresas, colaboradores, recebimentos }: Props) {
  const [fEmpresa, setFEmpresa] = useState('');
  const [fSub, setFSub] = useState('');
  const [fColab, setFColab] = useState('');
  const [fSit, setFSit] = useState('');
  // Intervalo de datas (por vencimento). Segue o mês do platô por padrão e
  // volta a acompanhá-lo sempre que o mês é trocado.
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  useEffect(() => {
    const { inicio, fim } = limitesDoMes(chaveMes);
    setDataInicial(inicio);
    setDataFinal(fim);
  }, [chaveMes]);

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—';
  const nomeSub = (id: string | null) => id ? subempresas.find((s) => s.id === id)?.nome ?? '—' : 'Cliente direto';
  const nomeColab = (id: string | null) => (id ? colaboradores.find((c) => c.id === id)?.nome ?? '—' : '—');

  const filtrados = useMemo(() => {
    return recebimentos.filter((r) => {
      // Previsões alimentam os totais dos meses futuros, mas sua composição
      // não é exposta na listagem detalhada de recebimentos.
      if (r.situacao === 'previsto') return false;
      if (fEmpresa && r.empresaId !== fEmpresa) return false;
      if (fSub && r.subempresaId !== fSub) return false;
      if (fColab && r.colaboradorId !== fColab) return false;
      if (fSit && r.situacao !== fSit) return false;
      if (dataInicial && r.vencimento < dataInicial) return false;
      if (dataFinal && r.vencimento > dataFinal) return false;
      return true;
    });
  }, [recebimentos, fEmpresa, fSub, fColab, fSit, dataInicial, dataFinal]);

  const subsFiltro = fEmpresa ? subempresas.filter((s) => s.empresaId === fEmpresa) : subempresas;

  return (
    <div>
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
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empresa/local</th><th>Cliente</th><th>Vencimento</th><th>Combinado</th><th>Recebido</th>
              <th>Diferença</th><th>Recebido em</th><th>Recebido por</th><th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} className={styles.muted} style={{ padding: 16 }}>Nenhum recebimento para os filtros.</td></tr>
            ) : filtrados.map((r) => {
              const rot = rotuloSituacao(r.situacao);
              const dif = (r.valorRecebido ?? 0) - r.valorCombinado;
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{nomeEmpresa(r.empresaId)}</td>
                  <td>{nomeSub(r.subempresaId)}</td>
                  <td>{formatarData(r.vencimento)}</td>
                  <td>{formatarMoeda(r.valorCombinado)}</td>
                  <td>{r.valorRecebido == null ? '—' : formatarMoeda(r.valorRecebido)}</td>
                  <td style={{ color: r.valorRecebido == null ? '#94a3b8' : dif === 0 ? '#166534' : dif < 0 ? '#b45309' : '#1e40af' }}>
                    {r.valorRecebido == null ? '—' : formatarMoeda(dif)}
                  </td>
                  <td style={{ fontSize: 12 }}>{formatarDataHora(r.recebidoEm)}</td>
                  <td>{nomeColab(r.colaboradorId)}</td>
                  <td><span className={styles.badge} style={{ background: rot.fundo, color: rot.cor }}>{rot.texto}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
