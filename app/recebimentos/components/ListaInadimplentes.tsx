'use client';

import { useMemo } from 'react';
import styles from '../recebimentos.module.css';
import type { Empresa, Recebimento, Subempresa } from './types';
import { diasEmAtraso, formatarData, formatarMoeda, limitesDoMes, rotuloSituacao } from './helpers';

type Props = {
  chaveMes: string;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
};

export default function ListaInadimplentes({ chaveMes, empresas, subempresas, recebimentos }: Props) {
  // Referência = fim do mês selecionado no platô (dias de atraso contados até lá).
  const refData = useMemo(() => new Date(limitesDoMes(chaveMes).fim + 'T23:59:59'), [chaveMes]);

  const inadimplentes = useMemo(() => {
    const fim = limitesDoMes(chaveMes).fim;
    return recebimentos
      .filter((r) => {
        if (r.situacao === 'baixado') return false;
        // Vencidas até o fim do mês selecionado.
        const vencido = r.vencimento <= fim && new Date(r.vencimento + 'T00:00:00') < refData;
        return vencido && (r.situacao === 'em_atraso' || r.valorRecebido == null || r.situacao === 'devolvido_para_correcao');
      })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [recebimentos, chaveMes, refData]);

  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—';
  const nomeSub = (id: string) => subempresas.find((s) => s.id === id)?.nome ?? '—';

  return (
    <div>
      <h3 className={styles.sectionTitle}>Inadimplentes</h3>
      <p className={styles.muted} style={{ marginBottom: 12 }}>Cobranças vencidas ainda não baixadas.</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Empresa</th><th>Subempresa</th><th>Vencimento</th><th>Valor esperado</th><th>Dias em atraso</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {inadimplentes.length === 0 ? (
              <tr><td colSpan={6} className={styles.muted} style={{ padding: 16 }}>Nenhuma cobrança em atraso.</td></tr>
            ) : inadimplentes.map((r) => {
              const rot = rotuloSituacao(r.situacao);
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{nomeEmpresa(r.empresaId)}</td>
                  <td>{nomeSub(r.subempresaId)}</td>
                  <td>{formatarData(r.vencimento)}</td>
                  <td>{formatarMoeda(r.valorCombinado)}</td>
                  <td style={{ fontWeight: 700, color: '#b91c1c' }}>{diasEmAtraso(r.vencimento, refData)} dia(s)</td>
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
