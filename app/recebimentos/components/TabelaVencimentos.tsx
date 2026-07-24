import { useMemo, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Empresa, FormaPagamentoRecebimento, Recebimento, Subempresa } from './types';
import { diferencaDiasIso, diasEmAtraso, formatarData, formatarMoeda } from './helpers';

type Props = {
  titulo: string;
  descricao: string;
  vazio: string;
  variante: 'inadimplente' | 'proximo';
  hojeIso: string;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  podeBaixar?: boolean;
  onBaixar?: (id: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void> | void;
};

const FORMAS_PAGAMENTO: Array<[FormaPagamentoRecebimento, string]> = [
  ['dinheiro', 'Dinheiro'],
  ['pix', 'Pix'],
  ['cartao_credito', 'Cartão de crédito'],
  ['cartao_debito', 'Cartão de débito'],
  ['boleto', 'Boleto'],
];

export default function TabelaVencimentos({
  titulo,
  descricao,
  vazio,
  variante,
  hojeIso,
  empresas,
  subempresas,
  recebimentos,
  podeBaixar = false,
  onBaixar,
}: Props) {
  const hoje = new Date(`${hojeIso}T00:00:00`);
  const [busca, setBusca] = useState('');
  const [baixaPendente, setBaixaPendente] = useState<Recebimento | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoRecebimento>('dinheiro');
  const [baixando, setBaixando] = useState(false);
  const [erroBaixa, setErroBaixa] = useState('');
  const nomeEmpresa = (id: string) => empresas.find((empresa) => empresa.id === id)?.nome ?? '—';
  const nomeSubempresa = (id: string | null) => id ? subempresas.find((subempresa) => subempresa.id === id)?.nome ?? '—' : 'Cliente direto';
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const recebimentosFiltrados = useMemo(
    () => !termo ? recebimentos : recebimentos.filter((recebimento) =>
      `${nomeEmpresa(recebimento.empresaId)} ${nomeSubempresa(recebimento.subempresaId)}`.toLocaleLowerCase('pt-BR').includes(termo),
    ),
    [recebimentos, termo, empresas, subempresas],
  );

  function abrirBaixa(recebimento: Recebimento) {
    setBaixaPendente(recebimento);
    setFormaPagamento('dinheiro');
    setErroBaixa('');
  }

  async function confirmarBaixa() {
    if (!baixaPendente || !onBaixar) return;
    setBaixando(true);
    setErroBaixa('');
    try {
      await onBaixar(baixaPendente.id, formaPagamento);
      setBaixaPendente(null);
    } catch (error) {
      setErroBaixa(error instanceof Error ? error.message : 'Não foi possível baixar o pagamento.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <div>
        <div className={styles.listaTopo}>
          <div>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>{titulo}</h3>
            <p className={styles.muted} style={{ margin: '4px 0 0' }}>{descricao}</p>
          </div>
          <div className={styles.buscaFixa} role="search">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" />
            </svg>
            <input className={styles.buscaFixaInput} placeholder="Pesquisar empresa ou cliente…" value={busca} onChange={(event) => setBusca(event.target.value)} aria-label="Pesquisar empresa ou cliente" />
            {busca && <button type="button" className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar pesquisa">×</button>}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.tabelaVencimentos}`}>
            <colgroup>
              <col className={styles.tabelaVencimentosEmpresa} />
              <col className={styles.tabelaVencimentosSubempresa} />
              <col className={styles.tabelaVencimentosData} />
              <col className={styles.tabelaVencimentosValor} />
              <col className={styles.tabelaVencimentosPrazo} />
              {podeBaixar && <col className={styles.tabelaVencimentosAcao} />}
            </colgroup>
            <thead>
              <tr>
                <th>Empresa/local</th>
                <th>Cliente</th>
                <th>Vencimento</th>
                <th>Valor esperado</th>
                <th>{variante === 'inadimplente' ? 'Dias em atraso' : 'Prazo'}</th>
                {podeBaixar && <th>Pagamento</th>}
              </tr>
            </thead>
            <tbody>
              {recebimentosFiltrados.length === 0 ? (
                <tr><td colSpan={podeBaixar ? 6 : 5} className={styles.muted} style={{ padding: 16 }}>{busca ? 'Nenhum resultado encontrado.' : vazio}</td></tr>
              ) : recebimentosFiltrados.map((recebimento) => {
                const dias = variante === 'inadimplente'
                  ? diasEmAtraso(recebimento.vencimento, hoje)
                  : diferencaDiasIso(hojeIso, recebimento.vencimento);
                const indicador = variante === 'inadimplente'
                  ? `${dias} dia(s)`
                  : dias === 0 ? 'Vence hoje' : `Em ${dias} dia(s)`;
                return (
                  <tr key={recebimento.id}>
                    <td style={{ fontWeight: 700 }}>{nomeEmpresa(recebimento.empresaId)}</td>
                    <td>{nomeSubempresa(recebimento.subempresaId)}</td>
                    <td>{formatarData(recebimento.vencimento)}</td>
                    <td>{formatarMoeda(recebimento.valorCombinado)}</td>
                    <td className={variante === 'inadimplente' ? styles.prazoInadimplente : styles.prazoProximo}>{indicador}</td>
                    {podeBaixar && <td><button type="button" className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`} onClick={() => abrirBaixa(recebimento)}>Baixar</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {baixaPendente && (
        <div className={styles.overlay} role="presentation" onClick={() => !baixando && setBaixaPendente(null)}>
          <div className={styles.comprovante} role="dialog" aria-modal="true" aria-labelledby="baixa-direta-titulo" onClick={(event) => event.stopPropagation()}>
            <h3 id="baixa-direta-titulo" style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>Confirmar baixa</h3>
            <p className={styles.muted} style={{ margin: '6px 0 14px' }}>{nomeEmpresa(baixaPendente.empresaId)} · {nomeSubempresa(baixaPendente.subempresaId)}</p>
            <div className={styles.readonlyBox} style={{ textAlign: 'left', marginBottom: 12 }}>
              <div className={styles.readonlyRow}><span>Valor</span><span>{formatarMoeda(baixaPendente.valorCombinado)}</span></div>
              <div className={styles.readonlyRow}><span>Vencimento</span><span>{formatarData(baixaPendente.vencimento)}</span></div>
            </div>
            <label className={styles.label} htmlFor="recebimentos-forma-pagamento">Forma de pagamento</label>
            <select id="recebimentos-forma-pagamento" className={styles.select} value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value as FormaPagamentoRecebimento)} disabled={baixando}>
              {FORMAS_PAGAMENTO.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
            {erroBaixa && <div className={styles.aviso} role="alert" style={{ marginTop: 12 }}>{erroBaixa}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} style={{ flex: 1 }} onClick={() => setBaixaPendente(null)} disabled={baixando}>Cancelar</button>
              <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} style={{ flex: 1 }} onClick={() => void confirmarBaixa()} disabled={baixando}>{baixando ? 'Baixando…' : 'Confirmar baixa'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
