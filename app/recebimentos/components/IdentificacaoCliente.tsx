import styles from '../recebimentos.module.css';
import type { Empresa, Recebimento, Subempresa } from './types';

type Props = {
  recebimento: Pick<Recebimento, 'empresaId' | 'subempresaId'>;
  empresas: Empresa[];
  subempresas: Subempresa[];
};

/**
 * Cliente direto: a empresa é o próprio cliente.
 * Local agrupado: a subempresa é o cliente; o local permanece apenas como
 * contexto, para nunca substituir a identificação da cobrança.
 */
export default function IdentificacaoCliente({ recebimento, empresas, subempresas }: Props) {
  const empresa = empresas.find((item) => item.id === recebimento.empresaId);
  const subempresa = recebimento.subempresaId
    ? subempresas.find((item) => item.id === recebimento.subempresaId)
    : null;
  const cliente = subempresa?.nome ?? empresa?.nome ?? '—';

  return (
    <span className={styles.clienteIdentificacao}>
      <strong className={styles.clientePrincipal}>{cliente}</strong>
      {subempresa && empresa && <small className={styles.clienteLocal}>Local: {empresa.nome}</small>}
    </span>
  );
}
