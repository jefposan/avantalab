import CarregamentoDadosModulo from './CarregamentoDadosModulo';

type TransicaoNavegacaoInternaProps = {
  destino: string;
  empresa?: { nome: string; corPrimaria: string; temaEscuro?: boolean; logoUrl?: string } | null;
};

/** Estrutura local usada enquanto uma rota interna confirma seus dados. */
export default function TransicaoNavegacaoInterna({ destino, empresa }: TransicaoNavegacaoInternaProps) {
  return <main className="min-h-screen" aria-busy="true">
    <CarregamentoDadosModulo ativo titulo={`Preparando ${destino}`} mensagem="Carregando os dados do módulo…" corPrimaria={empresa?.corPrimaria} temaEscuro={empresa?.temaEscuro} />
  </main>;
}
