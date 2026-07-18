import styles from '../recebimentos.module.css';
import type { Empresa, Recebimento, Subempresa } from './types';
import { diferencaDiasIso, diasEmAtraso, formatarData, formatarMoeda, rotuloSituacao } from './helpers';

type Props = {
  titulo: string;
  descricao: string;
  vazio: string;
  variante: 'inadimplente' | 'proximo';
  hojeIso: string;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
};

export default function TabelaVencimentos({
  titulo,
  descricao,
  vazio,
  variante,
  hojeIso,
  empresas,
  subempresas,
  recebimentos,
}: Props) {
  const hoje = new Date(`${hojeIso}T00:00:00`);
  const nomeEmpresa = (id: string) => empresas.find((empresa) => empresa.id === id)?.nome ?? '—';
  const nomeSubempresa = (id: string) => subempresas.find((subempresa) => subempresa.id === id)?.nome ?? '—';

  return (
    <div>
      <h3 className={styles.sectionTitle}>{titulo}</h3>
      <p className={styles.muted} style={{ marginBottom: 12 }}>{descricao}</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Subempresa</th>
              <th>Vencimento</th>
              <th>Valor esperado</th>
              <th>{variante === 'inadimplente' ? 'Dias em atraso' : 'Prazo'}</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {recebimentos.length === 0 ? (
              <tr><td colSpan={6} className={styles.muted} style={{ padding: 16 }}>{vazio}</td></tr>
            ) : recebimentos.map((recebimento) => {
              const dias = variante === 'inadimplente'
                ? diasEmAtraso(recebimento.vencimento, hoje)
                : diferencaDiasIso(hojeIso, recebimento.vencimento);
              const rotulo = variante === 'inadimplente'
                ? rotuloSituacao(recebimento.situacao)
                : { texto: 'Próximo a vencer', fundo: '#dbeafe', cor: '#1e40af' };
              const indicador = variante === 'inadimplente'
                ? `${dias} dia(s)`
                : dias === 0 ? 'Vence hoje' : `Em ${dias} dia(s)`;
              return (
                <tr key={recebimento.id}>
                  <td style={{ fontWeight: 700 }}>{nomeEmpresa(recebimento.empresaId)}</td>
                  <td>{nomeSubempresa(recebimento.subempresaId)}</td>
                  <td>{formatarData(recebimento.vencimento)}</td>
                  <td>{formatarMoeda(recebimento.valorCombinado)}</td>
                  <td style={{ fontWeight: 700, color: rotulo.cor }}>{indicador}</td>
                  <td><span className={styles.badge} style={{ background: rotulo.fundo, color: rotulo.cor }}>{rotulo.texto}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
