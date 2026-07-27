import styles from './consultas.module.css';

type StatusCadastralBadgeProps = {
  situacao: string | null;
};

export default function StatusCadastralBadge({
  situacao,
}: StatusCadastralBadgeProps) {
  const normalizada = situacao?.toLocaleLowerCase('pt-BR') ?? '';
  const classe =
    normalizada === 'ativa'
      ? styles.badgeAtivo
      : normalizada.includes('baix')
        ? styles.badgeInativo
        : styles.badgeNeutro;

  return (
    <span className={`${styles.statusBadge} ${classe}`}>
      {situacao || 'Situação não informada'}
    </span>
  );
}
